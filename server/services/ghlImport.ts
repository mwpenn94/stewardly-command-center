/**
 * GHL Import Service
 * 
 * Pulls contacts from GoHighLevel into the local database.
 * Handles pagination, field mapping (standard + custom), and progress tracking.
 * Designed to run as a background job triggered from the UI.
 */

import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  contacts, InsertContact,
  contactCustomFields, InsertContactCustomField,
  customFieldDefinitions, InsertCustomFieldDefinition,
  ghlImportJobs,
} from "../../drizzle/schema";
import * as ghlService from "./ghl";
import type { GhlCredentials } from "./ghl";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ImportProgress {
  jobId: number;
  status: "running" | "paused" | "completed" | "failed";
  totalContacts: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  rate: number; // contacts per minute
  eta: number; // minutes remaining
  lastGhlContactId: string | null;
  errors: Array<{ ghlId: string; error: string; ts: string }>;
}

// In-memory state for active import jobs
const activeJobs = new Map<number, {
  isRunning: boolean;
  isPaused: boolean;
  shouldStop: boolean;
  progress: ImportProgress;
  startTime: number;
}>();

// ─── Field Mapping ──────────────────────────────────────────────────────────

/**
 * Map a GHL contact object to our local contacts table insert format.
 */
function mapGhlContactToLocal(ghlContact: any, userId: number): InsertContact {
  // Parse tags
  let tags: string | null = null;
  if (ghlContact.tags && Array.isArray(ghlContact.tags)) {
    tags = JSON.stringify(ghlContact.tags);
  }

  // Extract WB custom fields from GHL customFields array
  const customFieldMap = new Map<string, string>();
  if (ghlContact.customFields && Array.isArray(ghlContact.customFields)) {
    for (const cf of ghlContact.customFields) {
      const id = cf.id || cf.key;
      const val = cf.value ?? cf.field_value ?? "";
      if (id && val !== "") customFieldMap.set(id, String(val));
    }
  }

  // Known WB custom field IDs
  const WB_FIELD_IDS: Record<string, string> = {
    "1bikOAO0auPgfS4iXuXB": "propensityScore",
    "AfmrK3jsgsRptUiRG1GJ": "originalScore",
    "MJr07PvqdDl2zJXikFKS": "tier",
    "UpAWHk7zPxNCLj2zW6zJ": "region",
    "YE5FowxSJneHhDtvoCJS": "premiumFinancing",
    "eVRHJlmgpZQUcF2OojdW": "campaign",
    "jY2Oa5ZqdiAxsJkNd0Wm": "productOpportunities",
    "qDsvKP1PpqvUSkQW2D2n": "specialistRoute",
    "xrTjJIKHkhWby96I3eAz": "segment",
  };

  // Map WB fields
  let segment: any = "other";
  let tier: any = "unscored";
  let propensityScore: string | null = null;
  let originalScore: string | null = null;
  let region: string | null = null;
  let premiumFinancing: string | null = null;
  let campaign: string | null = null;
  let productOpportunities: string | null = null;
  let specialistRoute: string | null = null;

  for (const [ghlId, localField] of Object.entries(WB_FIELD_IDS)) {
    const val = customFieldMap.get(ghlId);
    if (!val) continue;
    switch (localField) {
      case "segment": {
        const s = val.toLowerCase().trim();
        const validSegments = ["residential", "commercial", "agricultural", "cpa_tax", "estate_attorney", "hr_benefits", "insurance", "nonprofit"];
        segment = validSegments.includes(s) ? s : "other";
        break;
      }
      case "tier": {
        const t = val.toLowerCase().trim();
        const validTiers = ["gold", "silver", "bronze", "archive"];
        tier = validTiers.includes(t) ? t : "unscored";
        break;
      }
      case "propensityScore": propensityScore = val; break;
      case "originalScore": originalScore = val; break;
      case "region": region = val; break;
      case "premiumFinancing": premiumFinancing = val; break;
      case "campaign": campaign = val; break;
      case "productOpportunities": productOpportunities = val; break;
      case "specialistRoute": specialistRoute = val; break;
    }
  }

  // Parse dates
  let ghlDateAdded: Date | null = null;
  let ghlDateUpdated: Date | null = null;
  try {
    if (ghlContact.dateAdded) ghlDateAdded = new Date(ghlContact.dateAdded);
    if (ghlContact.dateUpdated) ghlDateUpdated = new Date(ghlContact.dateUpdated);
  } catch { /* ignore invalid dates */ }

  return {
    userId,
    ghlContactId: ghlContact.id,
    firstName: ghlContact.firstName || null,
    lastName: ghlContact.lastName || null,
    firstNameRaw: ghlContact.firstNameRaw || null,
    lastNameRaw: ghlContact.lastNameRaw || null,
    contactName: ghlContact.contactName || null,
    companyName: ghlContact.companyName || null,
    email: ghlContact.email || null,
    additionalEmails: ghlContact.additionalEmails || null,
    phone: ghlContact.phone || null,
    address: ghlContact.address1 || null,
    city: ghlContact.city || null,
    state: ghlContact.state || null,
    postalCode: ghlContact.postalCode || null,
    country: ghlContact.country || null,
    website: ghlContact.website || null,
    source: ghlContact.source || null,
    contactType: ghlContact.type || null,
    dateOfBirth: ghlContact.dateOfBirth || null,
    timezone: ghlContact.timezone || null,
    dnd: ghlContact.dnd || false,
    dndSettings: ghlContact.dndSettings || null,
    assignedTo: ghlContact.assignedTo || null,
    profilePhoto: ghlContact.profilePhoto || null,
    facebookLeadId: ghlContact.facebookLeadId || null,
    linkedInLeadId: ghlContact.linkedInLeadId || null,
    segment,
    tier,
    propensityScore,
    originalScore,
    tags,
    productOpportunities,
    specialistRoute,
    premiumFinancing,
    campaign,
    region,
    syncStatus: "synced",
    lastSyncedAt: new Date(),
    ghlDateAdded,
    ghlDateUpdated,
  } as InsertContact;
}

/**
 * Extract all custom fields from a GHL contact for the contact_custom_fields table.
 */
function extractCustomFields(ghlContact: any, contactId: number): InsertContactCustomField[] {
  if (!ghlContact.customFields || !Array.isArray(ghlContact.customFields)) return [];

  const fields: InsertContactCustomField[] = [];
  for (const cf of ghlContact.customFields) {
    const ghlFieldId = cf.id || cf.key;
    const value = cf.value ?? cf.field_value ?? "";
    if (!ghlFieldId || value === "" || value === null || value === undefined) continue;

    fields.push({
      contactId,
      ghlFieldId,
      fieldName: cf.name || ghlFieldId,
      fieldKey: cf.fieldKey || null,
      fieldType: cf.dataType || null,
      value: String(value),
    });
  }
  return fields;
}

// ─── Import Engine ──────────────────────────────────────────────────────────

/**
 * Start a GHL import job. Paginates through all contacts and inserts/updates them.
 */
export async function startImport(
  db: ReturnType<typeof drizzle>,
  userId: number,
  creds: GhlCredentials,
  jobId: number,
  resumeFromId?: string | null,
): Promise<void> {
  // Initialize job state
  const jobState = {
    isRunning: true,
    isPaused: false,
    shouldStop: false,
    progress: {
      jobId,
      status: "running" as "running" | "paused" | "completed" | "failed",
      totalContacts: 0,
      importedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      rate: 0,
      eta: 0,
      lastGhlContactId: resumeFromId || null,
      errors: [] as Array<{ ghlId: string; error: string; ts: string }>,
    },
    startTime: Date.now(),
  };
  activeJobs.set(jobId, jobState);

  // Update DB status
  await db.update(ghlImportJobs).set({
    status: "running",
    startedAt: new Date(),
  }).where(eq(ghlImportJobs.id, jobId));

  let cursor = resumeFromId || undefined;
  let pageCount = 0;
  const PAGE_SIZE = 100;
  const BATCH_DELAY_MS = 200; // Small delay between pages to avoid rate limits

  try {
    while (jobState.isRunning && !jobState.shouldStop) {
      // Check for pause
      while (jobState.isPaused && !jobState.shouldStop) {
        await sleep(1000);
      }
      if (jobState.shouldStop) break;

      // Fetch a page of contacts from GHL
      const result = await ghlService.listContacts(creds, {
        limit: PAGE_SIZE,
        startAfterId: cursor,
      });

      if (!result.success) {
        // Token expired — try refresh
        if (result.error?.includes("401") || result.error?.includes("auth_expired")) {
          const refreshResult = await ghlService.refreshToken(creds);
          if (refreshResult.success && refreshResult.newCreds) {
            if (refreshResult.newCreds.jwt) creds.jwt = refreshResult.newCreds.jwt;
            if (refreshResult.newCreds.refreshToken) creds.refreshToken = refreshResult.newCreds.refreshToken;
            if (refreshResult.newCreds.authToken) creds.authToken = refreshResult.newCreds.authToken;
            continue; // Retry with new token
          }
          // Refresh failed — stop
          jobState.progress.status = "failed";
          jobState.progress.errors.push({
            ghlId: "auth",
            error: "Token expired and refresh failed",
            ts: new Date().toISOString(),
          });
          break;
        }

        // Rate limited — wait and retry
        if (result.error?.includes("429")) {
          await sleep(10000);
          continue;
        }

        // Other error — log and stop
        jobState.progress.errors.push({
          ghlId: "api",
          error: result.error || "Unknown API error",
          ts: new Date().toISOString(),
        });
        jobState.progress.status = "failed";
        break;
      }

      // Update total on first page
      if (pageCount === 0 && result.total) {
        jobState.progress.totalContacts = result.total;
        await db.update(ghlImportJobs).set({ totalContacts: result.total }).where(eq(ghlImportJobs.id, jobId));
      }

      const contactsList = result.contacts || [];
      if (contactsList.length === 0) {
        // No more contacts — done
        jobState.progress.status = "completed";
        break;
      }

      // Process each contact
      for (const ghlContact of contactsList) {
        if (jobState.shouldStop) break;

        try {
          const localData = mapGhlContactToLocal(ghlContact, userId);

          // Check if contact already exists by ghlContactId
          const existing = await db.select({ id: contacts.id })
            .from(contacts)
            .where(and(eq(contacts.userId, userId), eq(contacts.ghlContactId, ghlContact.id)))
            .limit(1);

          let localContactId: number;

          if (existing.length > 0) {
            // Update existing contact
            localContactId = existing[0].id;
            const { userId: _u, ...updateData } = localData;
            await db.update(contacts)
              .set(updateData)
              .where(eq(contacts.id, localContactId));
            jobState.progress.updatedCount++;
          } else {
            // Insert new contact
            const insertResult = await db.insert(contacts).values(localData);
            localContactId = insertResult[0].insertId;
            jobState.progress.importedCount++;
          }

          // Upsert custom fields
          const customFields = extractCustomFields(ghlContact, localContactId);
          for (const cf of customFields) {
            try {
              await db.insert(contactCustomFields).values(cf)
                .onDuplicateKeyUpdate({
                  set: {
                    value: cf.value,
                    fieldName: cf.fieldName,
                    fieldKey: cf.fieldKey,
                    fieldType: cf.fieldType,
                    updatedAt: new Date(),
                  },
                });
            } catch {
              // Ignore individual custom field errors
            }
          }

        } catch (err: any) {
          jobState.progress.failedCount++;
          if (jobState.progress.errors.length < 100) {
            jobState.progress.errors.push({
              ghlId: ghlContact.id || "unknown",
              error: err.message?.slice(0, 200) || "Unknown error",
              ts: new Date().toISOString(),
            });
          }
        }

        // Update cursor
        cursor = ghlContact.id;
        jobState.progress.lastGhlContactId = ghlContact.id;
      }

      pageCount++;

      // Calculate rate and ETA
      const elapsed = (Date.now() - jobState.startTime) / 60000; // minutes
      const processed = jobState.progress.importedCount + jobState.progress.updatedCount + jobState.progress.skippedCount + jobState.progress.failedCount;
      jobState.progress.rate = elapsed > 0 ? Math.round(processed / elapsed) : 0;
      const remaining = jobState.progress.totalContacts - processed;
      jobState.progress.eta = jobState.progress.rate > 0 ? Math.round(remaining / jobState.progress.rate) : 0;

      // Periodic DB checkpoint (every 10 pages = ~1000 contacts)
      if (pageCount % 10 === 0) {
        await db.update(ghlImportJobs).set({
          importedCount: jobState.progress.importedCount,
          updatedCount: jobState.progress.updatedCount,
          skippedCount: jobState.progress.skippedCount,
          failedCount: jobState.progress.failedCount,
          lastGhlContactId: cursor,
          errorLog: jobState.progress.errors.length > 0 ? JSON.stringify(jobState.progress.errors.slice(-50)) : null,
        }).where(eq(ghlImportJobs.id, jobId));
      }

      // Small delay between pages
      await sleep(BATCH_DELAY_MS);
    }

    // Final DB update
    const finalStatus: "running" | "paused" | "completed" | "failed" = jobState.progress.status === "running" ? "completed" : jobState.progress.status;
    await db.update(ghlImportJobs).set({
      status: finalStatus,
      importedCount: jobState.progress.importedCount,
      updatedCount: jobState.progress.updatedCount,
      skippedCount: jobState.progress.skippedCount,
      failedCount: jobState.progress.failedCount,
      lastGhlContactId: cursor || null,
      completedAt: finalStatus === "completed" ? new Date() : null,
      errorLog: jobState.progress.errors.length > 0 ? JSON.stringify(jobState.progress.errors.slice(-50)) : null,
    }).where(eq(ghlImportJobs.id, jobId));

  } catch (err: any) {
    // Unexpected error
    await db.update(ghlImportJobs).set({
      status: "failed" as const,
      importedCount: jobState.progress.importedCount,
      updatedCount: jobState.progress.updatedCount,
      failedCount: jobState.progress.failedCount,
      lastGhlContactId: cursor || null,
      errorLog: JSON.stringify([...jobState.progress.errors, { ghlId: "fatal", error: err.message, ts: new Date().toISOString() }]),
    }).where(eq(ghlImportJobs.id, jobId));
  } finally {
    jobState.isRunning = false;
    activeJobs.delete(jobId);
  }
}

// ─── Job Control ────────────────────────────────────────────────────────────

export function getImportProgress(jobId: number): ImportProgress | null {
  const job = activeJobs.get(jobId);
  return job ? { ...job.progress } : null;
}

export function pauseImport(jobId: number): boolean {
  const job = activeJobs.get(jobId);
  if (!job) return false;
  job.isPaused = true;
  job.progress.status = "paused";
  return true;
}

export function resumeImport(jobId: number): boolean {
  const job = activeJobs.get(jobId);
  if (!job) return false;
  job.isPaused = false;
  job.progress.status = "running";
  return true;
}

export function stopImport(jobId: number): boolean {
  const job = activeJobs.get(jobId);
  if (!job) return false;
  job.shouldStop = true;
  return true;
}

export function isImportRunning(jobId: number): boolean {
  return activeJobs.has(jobId);
}

// ─── Custom Field Definitions Sync ──────────────────────────────────────────

/**
 * Sync custom field definitions from GHL into the local registry.
 * Called once at import start to populate the custom_field_definitions table.
 */
export async function syncCustomFieldDefinitions(
  db: ReturnType<typeof drizzle>,
  fieldMapping: Record<string, { name: string; type: string; fieldKey: string; options?: any }>,
): Promise<number> {
  let synced = 0;
  for (const [ghlFieldId, def] of Object.entries(fieldMapping)) {
    try {
      // Determine category
      let category = "crm";
      const name = def.name.toLowerCase();
      if (name.startsWith("wb ")) category = "wb_data";
      else if (name.includes("sequence")) category = "sequence";
      else if (name.includes("pipeline") || name.includes("stage")) category = "pipeline";
      else if (name.includes("dripify")) category = "dripify";
      else if (name.includes("utm") || name.includes("source")) category = "marketing";

      await db.insert(customFieldDefinitions).values({
        ghlFieldId,
        fieldName: def.name,
        fieldKey: def.fieldKey || null,
        fieldType: def.type,
        options: def.options || null,
        category,
        displayOrder: synced,
        isVisible: true,
      }).onDuplicateKeyUpdate({
        set: {
          fieldName: def.name,
          fieldKey: def.fieldKey || null,
          fieldType: def.type,
          options: def.options || null,
          category,
          updatedAt: new Date(),
        },
      });
      synced++;
    } catch {
      // Ignore individual errors
    }
  }
  return synced;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
