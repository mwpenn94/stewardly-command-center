import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as ghlService from "./services/ghl";
import * as smsitService from "./services/smsit";
import * as dripifyService from "./services/dripify";
import * as campaignEngine from "./services/campaignEngine";
import * as credentialHelper from "./services/credentials";
import { syncWorker } from "./services/syncWorker";
import { storagePut } from "./storage";
import * as orchestrator from "./services/orchestrator";
import { syncScheduler } from "./services/syncScheduler";
import * as aiEngine from "./services/aiEngine";
import * as ghlImport from "./services/ghlImport";

const PLATFORMS_LABELS: Record<string, string> = {
  ghl: "GoHighLevel",
  dripify: "Dripify",
  linkedin: "LinkedIn",
  smsit: "SMS-iT",
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Dashboard ───────────────────────────────────────────────────────
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getDashboardStats(ctx.user.id);
    }),
    contactStats: protectedProcedure.query(async ({ ctx }) => {
      return db.getContactStats(ctx.user.id);
    }),
  }),

  // ─── Contacts (Real GHL CRUD) ───────────────────────────────────────
  contacts: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        segment: z.string().optional(),
        tier: z.string().optional(),
        limit: z.number().min(1).max(200).optional(),
        offset: z.number().min(0).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return db.getContacts(ctx.user.id, input || {});
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getContactById(input.id, ctx.user.id);
      }),
    create: protectedProcedure
      .input(z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        companyName: z.string().optional(),
        country: z.string().optional(),
        website: z.string().optional(),
        source: z.string().optional(),
        contactType: z.string().optional(),
        dateOfBirth: z.string().optional(),
        timezone: z.string().optional(),
        dnd: z.boolean().optional(),
        assignedTo: z.string().optional(),
        segment: z.string().optional(),
        tier: z.string().optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
        customFields: z.array(z.object({ ghlFieldId: z.string(), value: z.string() })).optional(),
        syncToGhl: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { syncToGhl, customFields: inputCustomFields, ...contactData } = input;

        // Create in local DB first
        const id = await db.createContact({
          ...contactData,
          userId: ctx.user.id,
          tags: contactData.tags ? JSON.stringify(contactData.tags) : null,
          syncStatus: "local_only",
        } as any);

        // Save custom fields to contact_custom_fields table
        if (inputCustomFields && inputCustomFields.length > 0 && id) {
          for (const cf of inputCustomFields) {
            try {
              await db.upsertContactCustomField({
                contactId: id,
                ghlFieldId: cf.ghlFieldId,
                fieldName: cf.ghlFieldId,
                value: cf.value,
              } as any);
            } catch { /* ignore individual custom field errors */ }
          }
        }

        // If syncToGhl is true, push to GHL with ALL fields
        let ghlContactId: string | undefined;
        if (syncToGhl !== false) {
          const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
          if (ghlCreds && (ghlCreds.apiKey || ghlCreds.jwt)) {
            try {
              const payload = ghlService.buildPushPayloadFromLocal(contactData, inputCustomFields);
              payload.locationId = ghlCreds.locationId;
              const result = await ghlService.upsertContact(ghlCreds, payload);
              if (result.contactId) {
                ghlContactId = result.contactId;
                await db.markContactSynced(id!, ctx.user.id, result.contactId);
              }
            } catch (err: any) {
              console.error("[Contacts] GHL sync failed:", err.message);
              await db.updateContact(id!, ctx.user.id, { syncStatus: "error" } as any);
            }
          }
        }

        await db.logActivity({
          userId: ctx.user.id,
          type: "sync",
          action: "contact_created",
          description: `Created contact ${contactData.firstName || ""} ${contactData.lastName || ""}`.trim() +
            (ghlContactId ? ` (synced to GHL: ${ghlContactId})` : ""),
          severity: "success",
        });
        return { id, ghlContactId };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        companyName: z.string().optional(),
        country: z.string().optional(),
        website: z.string().optional(),
        source: z.string().optional(),
        contactType: z.string().optional(),
        dateOfBirth: z.string().optional(),
        timezone: z.string().optional(),
        dnd: z.boolean().optional(),
        assignedTo: z.string().optional(),
        segment: z.string().optional(),
        tier: z.string().optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
        customFields: z.array(z.object({ ghlFieldId: z.string(), value: z.string() })).optional(),
        syncToGhl: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, syncToGhl, customFields: inputCustomFields, ...data } = input;

        // Update local DB
        await db.updateContact(id, ctx.user.id, {
          ...data,
          tags: data.tags ? JSON.stringify(data.tags) : undefined,
        } as any);

        // Update custom fields in contact_custom_fields table
        if (inputCustomFields && inputCustomFields.length > 0) {
          for (const cf of inputCustomFields) {
            try {
              await db.upsertContactCustomField({
                contactId: id,
                ghlFieldId: cf.ghlFieldId,
                fieldName: cf.ghlFieldId,
                value: cf.value,
              } as any);
            } catch { /* ignore individual custom field errors */ }
          }
        }

        // Sync to GHL if requested and contact has a GHL ID
        if (syncToGhl !== false) {
          const contact = await db.getContactById(id, ctx.user.id);
          if (contact?.ghlContactId) {
            const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
            if (ghlCreds && (ghlCreds.apiKey || ghlCreds.jwt)) {
              try {
                // Fetch all custom fields for this contact to include in push
                const allCustomFields = await db.getContactCustomFields(id);
                const cfPayload = allCustomFields.map(cf => ({
                  ghlFieldId: cf.ghlFieldId,
                  value: cf.value || "",
                }));
                const payload = ghlService.buildPushPayloadFromLocal(
                  { ...contact, ...data },
                  cfPayload,
                );
                const result = await ghlService.updateContact(ghlCreds, contact.ghlContactId, payload);
                if (result.success) {
                  await db.markContactSynced(id, ctx.user.id);
                }
              } catch (err: any) {
                console.error("[Contacts] GHL update failed:", err.message);
              }
            }
          }
        }

        await db.logActivity({
          userId: ctx.user.id,
          type: "sync",
          action: "contact_updated",
          description: `Updated contact #${id}`,
          severity: "info",
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Also delete from GHL if synced
        const contact = await db.getContactById(input.id, ctx.user.id);
        if (contact?.ghlContactId) {
          const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
          if (ghlCreds && (ghlCreds.apiKey || ghlCreds.jwt)) {
            try {
              await ghlService.deleteContact(ghlCreds, contact.ghlContactId);
            } catch (err: any) {
              console.error("[Contacts] GHL delete failed:", err.message);
            }
          }
        }

        await db.deleteContact(input.id, ctx.user.id);
        await db.logActivity({
          userId: ctx.user.id,
          type: "sync",
          action: "contact_deleted",
          description: `Deleted contact #${input.id}` + (contact?.ghlContactId ? ` (GHL: ${contact.ghlContactId})` : ""),
          severity: "warning",
        });
        return { success: true };
      }),
    bulkDelete: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        let ghlDeletedCount = 0;
        // Attempt GHL deletes for synced contacts
        const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
        for (const id of input.ids) {
          const contact = await db.getContactById(id, ctx.user.id);
          if (contact?.ghlContactId && ghlCreds && (ghlCreds.apiKey || ghlCreds.jwt)) {
            try {
              await ghlService.deleteContact(ghlCreds, contact.ghlContactId);
              ghlDeletedCount++;
            } catch (err: any) {
              console.error(`[Contacts] GHL bulk delete failed for #${id}:`, err.message);
            }
          }
        }
        // Delete from local DB
        const dbInstance = await (await import("./db")).getDb();
        if (dbInstance) {
          const { contacts } = await import("../drizzle/schema");
          const { inArray, and, eq } = await import("drizzle-orm");
          await dbInstance.delete(contacts).where(
            and(eq(contacts.userId, ctx.user.id), inArray(contacts.id, input.ids))
          );
        }
        await db.logActivity({
          userId: ctx.user.id,
          type: "sync",
          action: "contacts_bulk_deleted",
          description: `Bulk deleted ${input.ids.length} contacts (${ghlDeletedCount} from GHL)`,
          severity: "warning",
        });
        return { deleted: input.ids.length, ghlDeleted: ghlDeletedCount };
      }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getContactStats(ctx.user.id);
    }),
    campaigns: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getCampaignsForContact(ctx.user.id, input.contactId);
      }),
    dataCompleteness: protectedProcedure.query(async ({ ctx }) => {
      return db.getDataCompletenessStats(ctx.user.id);
    }),
    // Get a single contact with all custom fields
    getWithCustomFields: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getContactWithCustomFields(input.id, ctx.user.id);
      }),
    // Search GHL contacts directly (pull from GHL)
    searchGhl: protectedProcedure
      .input(z.object({ query: z.string(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
        if (!ghlCreds) return { contacts: [], error: "GHL not configured" };
        const result = await ghlService.searchContacts(ghlCreds, input.query, input.limit || 20);
        return result;
      }),
    // Pull a batch of contacts from GHL (polling-based bidirectional sync)
    pullBatch: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional(), startAfterId: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
        if (!ghlCreds) throw new Error("GHL not configured");
        const result = await ghlService.listContacts(ghlCreds, { limit: input.limit || 20, startAfterId: input.startAfterId });
        if (!result.success) throw new Error(result.error || "Failed to list GHL contacts");

        let synced = 0;
        let skipped = 0;
        for (const c of result.contacts || []) {
          try {
            // Check if contact already exists locally
            const existingResult = await db.getContacts(ctx.user.id, { search: c.email || c.id, limit: 1 });
            if (existingResult.contacts.length > 0) {
              skipped++;
              continue;
            }
            await db.createContact({
              userId: ctx.user.id,
              ghlContactId: c.id,
              firstName: c.firstName || "",
              lastName: c.lastName || "",
              email: c.email || "",
              phone: c.phone || "",
              address: c.address1 || "",
              city: c.city || "",
              state: c.state || "",
              postalCode: c.postalCode || "",
              companyName: c.companyName || "",
              tags: c.tags ? JSON.stringify(c.tags) : null,
              syncStatus: "synced",
              lastSyncedAt: new Date(),
            } as any);
            synced++;
          } catch (err) {
            skipped++;
          }
        }

        await db.logActivity({
          userId: ctx.user.id,
          type: "sync",
          action: "pull_batch",
          description: `Pulled ${synced} contacts from GHL (${skipped} skipped)`,
          severity: "info",
        });

        return { synced, skipped, total: result.total, hasMore: (result.contacts?.length || 0) >= (input.limit || 20) };
      }),
    // Pull a single contact from GHL into local DB (full field mapping)
    pullFromGhl: protectedProcedure
      .input(z.object({ ghlContactId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
        if (!ghlCreds) throw new Error("GHL not configured");
        const result = await ghlService.getContact(ghlCreds, input.ghlContactId);
        if (!result.success || !result.contact) throw new Error(result.error || "Contact not found in GHL");

        const ghlContact = result.contact;
        const localData = ghlImport.mapGhlContactToLocal(ghlContact, ctx.user.id);

        // Check if contact already exists locally by ghlContactId
        const existing = await db.getContactByGhlId(ctx.user.id, input.ghlContactId);
        let localId: number;

        if (existing) {
          // Update existing
          const { userId: _u, ...updateData } = localData;
          await db.updateContact(existing.id, ctx.user.id, updateData as any);
          localId = existing.id;
        } else {
          // Insert new
          localId = (await db.createContact(localData))!;
        }

        // Upsert custom fields
        const customFields = ghlImport.extractCustomFields(ghlContact, localId);
        for (const cf of customFields) {
          try {
            await db.upsertContactCustomField(cf);
          } catch { /* ignore individual custom field errors */ }
        }

        return { id: localId, contact: ghlContact, action: existing ? "updated" : "created" };
      }),
    // Push a single local contact to GHL (full field push)
    pushToGhl: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const contact = await db.getContactById(input.id, ctx.user.id);
        if (!contact) throw new Error("Contact not found");
        const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
        if (!ghlCreds || (!ghlCreds.apiKey && !ghlCreds.jwt)) throw new Error("GHL not configured");

        // Fetch custom fields for this contact
        const customFields = await db.getContactCustomFields(input.id);
        const cfPayload = customFields.map(cf => ({ ghlFieldId: cf.ghlFieldId, value: cf.value || "" }));
        const payload = ghlService.buildPushPayloadFromLocal(contact, cfPayload);
        payload.locationId = ghlCreds.locationId;

        let result;
        if (contact.ghlContactId) {
          // Update existing GHL contact
          result = await ghlService.updateContact(ghlCreds, contact.ghlContactId, payload);
        } else {
          // Create new GHL contact
          result = await ghlService.upsertContact(ghlCreds, payload);
        }

        if (result.success || result.contactId) {
          await db.markContactSynced(input.id, ctx.user.id, result.contactId || contact.ghlContactId || undefined);
          return { success: true, ghlContactId: result.contactId || contact.ghlContactId, action: contact.ghlContactId ? "updated" : "created" };
        }
        throw new Error("GHL push failed");
      }),
    // Refresh a local contact from GHL (pull latest data)
    refreshFromGhl: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const contact = await db.getContactById(input.id, ctx.user.id);
        if (!contact?.ghlContactId) throw new Error("Contact has no GHL ID");
        const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
        if (!ghlCreds) throw new Error("GHL not configured");

        const result = await ghlService.getContact(ghlCreds, contact.ghlContactId);
        if (!result.success || !result.contact) throw new Error(result.error || "Contact not found in GHL");

        const ghlContact = result.contact;
        const localData = ghlImport.mapGhlContactToLocal(ghlContact, ctx.user.id);
        const { userId: _u, ...updateData } = localData;
        await db.updateContact(input.id, ctx.user.id, updateData as any);

        // Upsert custom fields
        const customFields = ghlImport.extractCustomFields(ghlContact, input.id);
        for (const cf of customFields) {
          try {
            await db.upsertContactCustomField(cf);
          } catch { /* ignore */ }
        }

        return { success: true, contact: ghlContact };
      }),
    // Get dirty (pending sync) contacts count
    pendingCount: protectedProcedure.query(async ({ ctx }) => {
      const dirty = await db.getDirtyContacts(ctx.user.id, 1);
      const dbInstance = await db.getDb();
      if (!dbInstance) return { count: 0 };
      const { contacts: contactsTable } = await import("../drizzle/schema");
      const { count, eq, and } = await import("drizzle-orm");
      const result = await dbInstance.select({ count: count() }).from(contactsTable)
        .where(and(eq(contactsTable.userId, ctx.user.id), eq(contactsTable.syncStatus, "pending" as any)));
      return { count: result[0]?.count || 0 };
    }),
    // Push all dirty contacts to GHL in batch
    pushDirtyBatch: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(200).optional() }))
      .mutation(async ({ ctx, input }) => {
        const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
        if (!ghlCreds || (!ghlCreds.apiKey && !ghlCreds.jwt)) throw new Error("GHL not configured");

        const dirtyContacts = await db.getDirtyContacts(ctx.user.id, input.limit || 50);
        let pushed = 0, failed = 0;

        for (const contact of dirtyContacts) {
          try {
            const customFields = await db.getContactCustomFields(contact.id);
            const cfPayload = customFields.map(cf => ({ ghlFieldId: cf.ghlFieldId, value: cf.value || "" }));
            const payload = ghlService.buildPushPayloadFromLocal(contact, cfPayload);
            payload.locationId = ghlCreds.locationId;

            let result;
            if (contact.ghlContactId) {
              result = await ghlService.updateContact(ghlCreds, contact.ghlContactId, payload);
            } else {
              result = await ghlService.upsertContact(ghlCreds, payload);
            }
            if (result.success || result.contactId) {
              await db.markContactSynced(contact.id, ctx.user.id, result.contactId || contact.ghlContactId || undefined);
              pushed++;
            } else {
              failed++;
            }
          } catch {
            failed++;
          }
        }

        await db.logActivity({
          userId: ctx.user.id,
          type: "sync",
          action: "push_dirty_batch",
          description: `Pushed ${pushed} dirty contacts to GHL (${failed} failed)`,
          severity: pushed > 0 ? "success" : "warning",
        });

        return { pushed, failed, remaining: Math.max(0, dirtyContacts.length - pushed - failed) };
      }),
    // Bulk push selected contacts to GHL
    bulkPushToGhl: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
        if (!ghlCreds || (!ghlCreds.apiKey && !ghlCreds.jwt)) throw new Error("GHL not configured");

        let pushed = 0, failed = 0;
        for (const id of input.ids) {
          try {
            const contact = await db.getContactById(id, ctx.user.id);
            if (!contact) { failed++; continue; }
            const customFields = await db.getContactCustomFields(id);
            const cfPayload = customFields.map(cf => ({ ghlFieldId: cf.ghlFieldId, value: cf.value || "" }));
            const payload = ghlService.buildPushPayloadFromLocal(contact, cfPayload);
            payload.locationId = ghlCreds.locationId;

            let result;
            if (contact.ghlContactId) {
              result = await ghlService.updateContact(ghlCreds, contact.ghlContactId, payload);
            } else {
              result = await ghlService.upsertContact(ghlCreds, payload);
            }
            if (result.success || result.contactId) {
              await db.markContactSynced(id, ctx.user.id, result.contactId || contact.ghlContactId || undefined);
              pushed++;
            } else { failed++; }
          } catch { failed++; }
        }
        await db.logActivity({
          userId: ctx.user.id, type: "sync", action: "bulk_push_ghl",
          description: `Bulk pushed ${pushed} contacts to GHL (${failed} failed)`,
          severity: pushed > 0 ? "success" : "warning",
        });
        return { pushed, failed };
      }),
    // Push a single contact to SMS-iT
    pushToSmsit: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const contact = await db.getContactById(input.id, ctx.user.id);
        if (!contact) throw new Error("Contact not found");
        if (!contact.phone) throw new Error("Contact has no phone number (required for SMS-iT)");
        const smsitCreds = await credentialHelper.getSmsitCredentials(ctx.user.id);
        if (!smsitCreds) throw new Error("SMS-iT not configured");

        const payload = smsitService.buildPushPayloadFromLocal(contact);
        const result = await smsitService.createContact(smsitCreds, payload);
        if (result.success) {
          await db.logActivity({
            userId: ctx.user.id, type: "sync", action: "push_to_smsit",
            description: `Pushed contact ${contact.firstName} ${contact.lastName} to SMS-iT`,
            severity: "success",
          });
          return { success: true, smsitContactId: result.contactId };
        }
        throw new Error(result.error || "SMS-iT push failed");
      }),
    // Pull contacts from SMS-iT
    pullFromSmsit: protectedProcedure
      .input(z.object({ page: z.number().optional(), perPage: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const smsitCreds = await credentialHelper.getSmsitCredentials(ctx.user.id);
        if (!smsitCreds) throw new Error("SMS-iT not configured");

        const result = await smsitService.listContacts(smsitCreds, { page: input.page, perPage: input.perPage });
        if (!result.success || !result.contacts) throw new Error(result.error || "Failed to pull SMS-iT contacts");

        let imported = 0, skipped = 0;
        for (const smsitContact of result.contacts) {
          try {
            const phone = smsitContact.phone || smsitContact.receiver;
            if (!phone) { skipped++; continue; }
            // Check if contact already exists by phone
            const existing = await db.getContacts(ctx.user.id, { search: phone, limit: 1 });
            if (existing.contacts.length > 0) { skipped++; continue; }
            await db.createContact({
              userId: ctx.user.id,
              firstName: smsitContact.first_name || smsitContact.firstName || "",
              lastName: smsitContact.last_name || smsitContact.lastName || "",
              email: smsitContact.email || "",
              phone,
              source: "smsit",
              syncStatus: "synced",
            });
            imported++;
          } catch { skipped++; }
        }
        await db.logActivity({
          userId: ctx.user.id, type: "sync", action: "pull_from_smsit",
          description: `Pulled ${imported} contacts from SMS-iT (${skipped} skipped)`,
          severity: "success",
        });
        return { imported, skipped, total: result.total };
      }),
    // Push a single contact to Dripify (add as lead to a campaign)
    pushToDripify: protectedProcedure
      .input(z.object({ id: z.number(), campaignId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const contact = await db.getContactById(input.id, ctx.user.id);
        if (!contact) throw new Error("Contact not found");
        const dripifyCreds = await credentialHelper.getDripifyCredentials(ctx.user.id);
        if (!dripifyCreds) throw new Error("Dripify not configured");

        const payload = dripifyService.buildPushPayloadFromLocal(contact);
        const result = await dripifyService.addLeadToCampaign(dripifyCreds, input.campaignId, payload);
        if (result.success) {
          await db.logActivity({
            userId: ctx.user.id, type: "sync", action: "push_to_dripify",
            description: `Pushed contact ${contact.firstName} ${contact.lastName} to Dripify campaign ${input.campaignId}`,
            severity: "success",
          });
          return { success: true, leadId: result.leadId };
        }
        throw new Error(result.error || "Dripify push failed");
      }),
    // Pull leads from a Dripify campaign
    pullFromDripify: protectedProcedure
      .input(z.object({ campaignId: z.string(), page: z.number().optional(), limit: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const dripifyCreds = await credentialHelper.getDripifyCredentials(ctx.user.id);
        if (!dripifyCreds) throw new Error("Dripify not configured");

        const result = await dripifyService.getCampaignLeads(dripifyCreds, input.campaignId, { page: input.page, limit: input.limit });
        if (!result.success || !result.leads) throw new Error(result.error || "Failed to pull Dripify leads");

        let imported = 0, skipped = 0;
        for (const lead of result.leads) {
          try {
            const email = lead.email;
            if (!email) { skipped++; continue; }
            const existing = await db.getContacts(ctx.user.id, { search: email, limit: 1 });
            if (existing.contacts.length > 0) { skipped++; continue; }
            await db.createContact({
              userId: ctx.user.id,
              firstName: lead.firstName || lead.first_name || "",
              lastName: lead.lastName || lead.last_name || "",
              email,
              source: "dripify",
              syncStatus: "synced",
            });
            imported++;
          } catch { skipped++; }
        }
        await db.logActivity({
          userId: ctx.user.id, type: "sync", action: "pull_from_dripify",
          description: `Pulled ${imported} leads from Dripify campaign (${skipped} skipped)`,
          severity: "success",
        });
        return { imported, skipped, total: result.total };
      }),
  }),

  // ─── GHL Import (Pull contacts FROM GHL into local DB) ─────────────
  ghlImport: router({
    // Start a new import job
    start: protectedProcedure
      .input(z.object({
        resumeJobId: z.number().optional(),
      }).optional())
      .mutation(async ({ ctx, input }) => {
        const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
        if (!ghlCreds || (!ghlCreds.apiKey && !ghlCreds.jwt)) {
          throw new Error("GHL credentials not configured. Set up GoHighLevel integration first.");
        }

        const dbInstance = await db.getDb();
        if (!dbInstance) throw new Error("Database not available");

        let jobId: number;
        let resumeFromId: string | null = null;

        if (input?.resumeJobId) {
          // Resume existing job
          const existingJob = await db.getGhlImportJob(input.resumeJobId);
          if (!existingJob) throw new Error("Import job not found");
          jobId = existingJob.id;
          resumeFromId = existingJob.lastGhlContactId;
        } else {
          // Create new job
          jobId = await db.createGhlImportJob({ userId: ctx.user.id }) as number;
        }

        // Sync custom field definitions first
        const fieldMapping = {
          "1bikOAO0auPgfS4iXuXB": { name: "WB Propensity Score", type: "NUMERICAL", fieldKey: "contact.wta_propensity_score" },
          "AfmrK3jsgsRptUiRG1GJ": { name: "WB Original Score", type: "NUMERICAL", fieldKey: "contact.wta_original_score" },
          "MJr07PvqdDl2zJXikFKS": { name: "WB Tier", type: "TEXT", fieldKey: "contact.wta_tier" },
          "UpAWHk7zPxNCLj2zW6zJ": { name: "WB Region", type: "TEXT", fieldKey: "contact.years_in_business" },
          "YE5FowxSJneHhDtvoCJS": { name: "WB Premium Financing", type: "TEXT", fieldKey: "contact.employee_range" },
          "eVRHJlmgpZQUcF2OojdW": { name: "WB Campaign", type: "TEXT", fieldKey: "contact.import_batch" },
          "jY2Oa5ZqdiAxsJkNd0Wm": { name: "WB Product Opportunities", type: "TEXT", fieldKey: "contact.naics_code" },
          "qDsvKP1PpqvUSkQW2D2n": { name: "WB Specialist Route", type: "TEXT", fieldKey: "contact.sic_code" },
          "xrTjJIKHkhWby96I3eAz": { name: "WB Segment", type: "TEXT", fieldKey: "contact.data_source" },
          "0qhZxQPHkBWuHBfxXbqJ": { name: "Engagement Score", type: "NUMERICAL", fieldKey: "contact.engagement_score" },
          "2gqT7BHQCHSVxLqcbLyp": { name: "Sequence Status", type: "SINGLE_OPTIONS", fieldKey: "contact.sequence_status" },
          "3Jx2xWPFhHuKXQFNqhKW": { name: "Preferred Contact Method", type: "SINGLE_OPTIONS", fieldKey: "contact.preferred_contact_method" },
          "4LCXqUaLLcWBTnVZDIXm": { name: "Industry", type: "TEXT", fieldKey: "contact.industry" },
          "4UOmWGjYcnHnrVpXXFGK": { name: "Sequence Start Date", type: "DATE", fieldKey: "contact.sequence_start_date" },
          "5FMuYcjnMVDLqXvBKJqU": { name: "Carrier Recommended", type: "TEXT", fieldKey: "contact.carrier_recommended" },
          "6iVWxJNTdUCLUjkiVnVa": { name: "Annual Revenue", type: "NUMERICAL", fieldKey: "contact.annual_revenue" },
          "8PbNZzTJMZvIqTJFjHKS": { name: "Prospect Tier", type: "SINGLE_OPTIONS", fieldKey: "contact.prospect_tier" },
          "KrxlPxU6kyNEmrsRIWVL": { name: "Last Synced", type: "DATE", fieldKey: "contact.last_synced" },
          "LbBku9NFbqUOEpAPAqO7": { name: "Carrier Current", type: "TEXT", fieldKey: "contact.carrier_current" },
          "MXxsqYuh5Wr0RLsNot0b": { name: "Last Contacted By", type: "TEXT", fieldKey: "contact.last_contacted_by" },
          "NVMWspG1dMe6IlIb8mE7": { name: "Sequence Cooldown Until", type: "DATE", fieldKey: "contact.sequence_cooldown_until" },
          "QwMNo02qkUJ2Y2f4vlEm": { name: "Last Engagement Date", type: "DATE", fieldKey: "contact.last_engagement_date" },
          "SHAa6uRa4XD4N92YVfvK": { name: "Workable Candidate ID", type: "TEXT", fieldKey: "contact.workable_candidate_id" },
          "TGV90VsTLsbIsu6GxM1S": { name: "Dripify Campaign ID", type: "TEXT", fieldKey: "contact.dripify_campaign_id" },
          "TQXBqS8iS0jt7JncLpaz": { name: "Contact Status", type: "SINGLE_OPTIONS", fieldKey: "contact.contact_status" },
          "UAo9fy1h4d8RIxm9SIxo": { name: "UTM Source", type: "TEXT", fieldKey: "contact.utm_source" },
          "UQCVsghKND8CxKt3s553": { name: "Stage Changed By", type: "TEXT", fieldKey: "contact.stage_changed_by" },
          "USxGp2z2ZI1e1dVd22FO": { name: "Sequence End Date", type: "DATE", fieldKey: "contact.sequence_end_date" },
          "WCW1ergwWGuxeRArhSGN": { name: "Event Date", type: "DATE", fieldKey: "contact.event_date" },
          "WxoVpAYV7wpyhwI4L7fb": { name: "Contact Type", type: "SINGLE_OPTIONS", fieldKey: "contact.contact_type" },
          "XjI82fNxEMXN5I8DnKOe": { name: "Tier", type: "SINGLE_OPTIONS", fieldKey: "contact.tier" },
          "YGvAJDiGw4wQA2UQw3El": { name: "Owning User", type: "TEXT", fieldKey: "contact.owning_user" },
          "Yg3WmEi7DI447b8NSWB3": { name: "Pipeline Score", type: "NUMERICAL", fieldKey: "contact.pipeline_score" },
          "YpbKiMgfrKoMhtHzmFKc": { name: "LinkedIn Profile URL", type: "TEXT", fieldKey: "contact.linkedin_profile_url" },
          "fA3xknUCWKvL1x0jSyKc": { name: "Years Experience", type: "NUMERICAL", fieldKey: "contact.years_experience" },
          "fXjqanfPiKAiRgCDLXGx": { name: "Event Location", type: "TEXT", fieldKey: "contact.event_location" },
          "jagHTl5378wbeMAySyTq": { name: "Cross-Reference ID", type: "TEXT", fieldKey: "contact.crossreference_id" },
          "mmyrnHHeQuTMX12x5jUn": { name: "Dripify Synced", type: "CHECKBOX", fieldKey: "contact.dripify_synced" },
          "nYbnBk0yB6wBxV3WcL9y": { name: "Lead Source", type: "SINGLE_OPTIONS", fieldKey: "contact.lead_source" },
          "oEAvsZR3rLCcwjwGDz8C": { name: "UTM Campaign", type: "TEXT", fieldKey: "contact.utm_campaign" },
          "rdiLaQb8FoYqED48cQvP": { name: "Licenses", type: "TEXT", fieldKey: "contact.licenses" },
          "rguElwOH4CWpStikSK8M": { name: "Stage Changed Date", type: "DATE", fieldKey: "contact.stage_changed_date" },
          "s4Qa9BxGcBKltJk2iGVe": { name: "Lead Score", type: "NUMERICAL", fieldKey: "contact.lead_score" },
          "sisbfvgjd6aEZO30uyCI": { name: "Source Instance", type: "TEXT", fieldKey: "contact.source_instance" },
          "tIaZIfMStU3allIagOpU": { name: "Designations", type: "TEXT", fieldKey: "contact.designations" },
          "taQ0qOVoVxztncrO9F4A": { name: "Last Touch Channel", type: "TEXT", fieldKey: "contact.last_touch_channel" },
          "utfioaBn6YWIvuy3eMum": { name: "Last Sync Timestamp", type: "DATE", fieldKey: "contact.last_sync_timestamp" },
          "xXe4d9fxDTiaPUrQzX1Z": { name: "Strengths", type: "LARGE_TEXT", fieldKey: "contact.strengths" },
          "yKtHOkkuuDJdEMOdrwJY": { name: "Cross-Instance Sync Status", type: "TEXT", fieldKey: "contact.crossinstance_sync_status" },
          "ym2bDMtDIzyD18QvqIrQ": { name: "Workable Stage", type: "TEXT", fieldKey: "contact.workable_stage" },
        };
        await ghlImport.syncCustomFieldDefinitions(dbInstance, fieldMapping);

        // Start import in background (non-blocking)
        ghlImport.startImport(dbInstance, ctx.user.id, ghlCreds, jobId, resumeFromId).catch((err) => {
          console.error("[GHL Import] Fatal error:", err);
        });

        await db.logActivity({
          userId: ctx.user.id,
          type: "import",
          action: "ghl_import_started",
          description: `Started GHL contact import job #${jobId}` + (resumeFromId ? ` (resuming from ${resumeFromId})` : ""),
          severity: "info",
        });

        return { jobId };
      }),

    // Get import progress (live from memory or from DB)
    progress: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Try in-memory first (active job)
        const liveProgress = ghlImport.getImportProgress(input.jobId);
        if (liveProgress) return liveProgress;

        // Fall back to DB
        const job = await db.getGhlImportJob(input.jobId);
        if (!job) return null;
        return {
          jobId: job.id,
          status: job.status,
          totalContacts: job.totalContacts || 0,
          importedCount: job.importedCount || 0,
          updatedCount: job.updatedCount || 0,
          skippedCount: job.skippedCount || 0,
          failedCount: job.failedCount || 0,
          rate: 0,
          eta: 0,
          lastGhlContactId: job.lastGhlContactId,
          errors: job.errorLog ? JSON.parse(job.errorLog as string) : [],
        };
      }),

    // List all import jobs
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getGhlImportJobs(ctx.user.id);
    }),

    // Pause import
    pause: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ input }) => {
        return { success: ghlImport.pauseImport(input.jobId) };
      }),

    // Resume import
    resume: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // If job is not in memory, restart it from DB checkpoint
        if (!ghlImport.isImportRunning(input.jobId)) {
          const job = await db.getGhlImportJob(input.jobId);
          if (!job) throw new Error("Import job not found");
          const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
          if (!ghlCreds) throw new Error("GHL not configured");
          const dbInstance = await db.getDb();
          if (!dbInstance) throw new Error("Database not available");
          ghlImport.startImport(dbInstance, ctx.user.id, ghlCreds, job.id, job.lastGhlContactId).catch(console.error);
          return { success: true, restarted: true };
        }
        return { success: ghlImport.resumeImport(input.jobId), restarted: false };
      }),

    // Stop import
    stop: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ input }) => {
        return { success: ghlImport.stopImport(input.jobId) };
      }),
  }),

  // ─── Custom Field Definitions ──────────────────────────────────────
  customFields: router({
    definitions: protectedProcedure.query(async () => {
      return db.getCustomFieldDefinitions();
    }),
    byCategory: protectedProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ input }) => {
        return db.getCustomFieldDefinitionsByCategory(input.category);
      }),
  }),

  // ─── Bulk Import (Real GHL Push) ────────────────────────────────────
  imports: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getBulkImports(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        totalRows: z.number(),
        fileUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createBulkImport({ ...input, userId: ctx.user.id });
        await db.logActivity({
          userId: ctx.user.id,
          type: "import",
          action: "import_created",
          description: `Started import of ${input.fileName} (${input.totalRows} rows)`,
          severity: "info",
        });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        processedRows: z.number().optional(),
        createdCount: z.number().optional(),
        updatedCount: z.number().optional(),
        failedCount: z.number().optional(),
        skippedCount: z.number().optional(),
        status: z.string().optional(),
        resumeFromRow: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateBulkImport(id, data as any);
        return { success: true };
      }),
    // Start a real bulk import sync job
    startSync: protectedProcedure
      .input(z.object({
        importId: z.number(),
        rows: z.array(z.record(z.string(), z.string())),
        workerCount: z.number().min(1).max(10).optional(),
        resumeFromRow: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
        if (!ghlCreds || (!ghlCreds.apiKey && !ghlCreds.jwt)) {
          throw new Error("GHL credentials not configured. Set up GoHighLevel integration first.");
        }

        // Update import status
        await db.updateBulkImport(input.importId, {
          status: "running",
          startedAt: new Date(),
        } as any);

        await db.logActivity({
          userId: ctx.user.id,
          type: "import",
          action: "import_sync_started",
          description: `Started GHL sync for import #${input.importId}: ${input.rows.length} rows, ${input.workerCount || 4} workers`,
          severity: "info",
        });

        // Set up progress callback to update DB
        syncWorker.setProgressCallback(async (state) => {
          try {
            await db.updateBulkImport(input.importId, {
              processedRows: state.processed,
              createdCount: state.created,
              updatedCount: state.updated,
              failedCount: state.failed,
              skippedCount: state.skipped,
              resumeFromRow: state.currentRow,
              status: state.status === "completed" ? "completed" :
                      state.status === "token_expired" ? "paused" :
                      state.status === "paused" ? "paused" :
                      state.status === "failed" ? "failed" : "running",
            } as any);
          } catch (err) {
            console.error("[Import] Failed to update progress:", err);
          }
        });

        // Start the sync worker (non-blocking — runs in background)
        syncWorker.start(
          input.importId,
          input.rows as Record<string, string>[],
          ghlCreds,
          { workerCount: input.workerCount || 4, delayPerCall: 50, maxRetries: 3, batchSize: 200 },
          input.resumeFromRow || 0
        ).catch((err) => {
          console.error("[Import] Sync worker error:", err);
        });

        return { success: true, jobId: input.importId };
      }),
    // Send a direct email via GHL Conversations API
    sendEmail: protectedProcedure
      .input(z.object({
        contactId: z.string(),
        subject: z.string(),
        html: z.string(),
        message: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
        if (!ghlCreds) throw new Error("GHL not configured");
        const result = await ghlService.sendEmail(ghlCreds, {
          contactId: input.contactId,
          subject: input.subject,
          html: input.html,
          message: input.message,
        });
        if (result.success) {
          await db.logActivity({
            userId: ctx.user.id,
            type: "campaign",
            action: "email_sent",
            description: `Email sent to GHL contact ${input.contactId}: ${input.subject}`,
            severity: "info",
          });
        }
        return result;
      }),
    // Get live sync progress
    syncProgress: protectedProcedure.query(async () => {
      return syncWorker.getState();
    }),
    // Pause sync
    pauseSync: protectedProcedure.mutation(async () => {
      return syncWorker.pause();
    }),
    // Resume sync
    resumeSync: protectedProcedure.mutation(async ({ ctx }) => {
      const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
      if (ghlCreds) syncWorker.updateCredentials(ghlCreds);
      await syncWorker.resume();
      return { success: true };
    }),
    // Cancel sync
    cancelSync: protectedProcedure.mutation(async () => {
      return syncWorker.cancel();
    }),
    // Update token for sync worker
    updateToken: protectedProcedure
      .input(z.object({ jwt: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const remaining = ghlService.getJwtRemainingMinutes(input.jwt);
        if (remaining < 1) {
          throw new Error("Token is expired or has less than 1 minute remaining");
        }

        const locationId = ghlService.extractLocationFromJwt(input.jwt) || "";
        const companyId = ghlService.extractCompanyFromJwt(input.jwt) || "";

        // Save to DB
        await credentialHelper.updateGhlJwt(ctx.user.id, input.jwt);

        // Update sync worker
        syncWorker.updateCredentials({
          jwt: input.jwt,
          locationId,
          companyId,
        });

        await db.logActivity({
          userId: ctx.user.id,
          type: "integration",
          action: "ghl_token_updated",
          description: `GHL JWT token updated (${remaining.toFixed(0)} minutes remaining)`,
          severity: "success",
        });

        return { success: true, remainingMinutes: remaining, locationId, companyId };
      }),
  }),

  // ─── Campaigns (Real Platform Execution) ────────────────────────────
  campaigns: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getCampaigns(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        channel: z.enum([
          "email", "sms", "linkedin", "multi",
          "social_facebook", "social_instagram", "social_twitter", "social_tiktok",
          "call_inbound", "call_outbound", "direct_mail",
          "webform", "chat", "event",
        ]),
        templateId: z.number().optional(),
        audienceFilter: z.object({
          segment: z.string().optional(),
          tier: z.string().optional(),
          search: z.string().optional(),
        }).optional(),
        scheduledAt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createCampaign({
          ...input,
          userId: ctx.user.id,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        } as any);
        await db.logActivity({
          userId: ctx.user.id,
          type: "campaign",
          action: "campaign_created",
          description: `Created campaign "${input.name}" (${input.channel})`,
          severity: "success",
        });
        return { id };
      }),
    // Launch a campaign — actually sends via the correct platform
    launch: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        body: z.string().min(1, "Message body is required"),
        subject: z.string().optional(),
        contactIds: z.array(z.number()).optional(),
        audienceFilter: z.object({
          segment: z.string().optional(),
          tier: z.string().optional(),
          search: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get campaign
        const campaignList = await db.getCampaigns(ctx.user.id);
        const campaign = campaignList.find((c: any) => c.id === input.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Get contacts
        let contacts: any[] = [];
        if (input.contactIds && input.contactIds.length > 0) {
          const result = await db.getContacts(ctx.user.id, { limit: 200 });
          contacts = result.contacts.filter((c: any) => input.contactIds!.includes(c.id));
        } else {
          const result = await db.getContacts(ctx.user.id, { limit: 200, ...input.audienceFilter });
          contacts = result.contacts;
        }

        if (contacts.length === 0) {
          throw new Error("No contacts match the audience criteria");
        }

        // Get platform credentials
        const allCreds = await credentialHelper.getAllCredentials(ctx.user.id);

        // Update campaign status
        await db.updateCampaign(input.campaignId, ctx.user.id, {
          status: "running",
          audienceCount: contacts.length,
          startedAt: new Date(),
        } as any);

        await db.logActivity({
          userId: ctx.user.id,
          type: "campaign",
          action: "campaign_launched",
          description: `Launched campaign "${campaign.name}" to ${contacts.length} contacts via ${campaign.channel}`,
          severity: "info",
        });

        // Execute campaign
        const result = await campaignEngine.executeCampaign({
          channel: campaign.channel as any,
          subject: input.subject,
          body: input.body,
          campaignName: campaign.name,
          contacts: contacts.map((c: any) => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            ghlContactId: c.ghlContactId,
          })),
          ghlCreds: allCreds.ghl || undefined,
          smsitCreds: allCreds.smsit || undefined,
          dripifyCreds: allCreds.dripify || undefined,
        });

        // Update campaign with results
        const finalStatus = result.success ? "completed" : result.sent > 0 ? "completed" : "failed";
        await db.updateCampaign(input.campaignId, ctx.user.id, {
          status: finalStatus,
          completedAt: new Date(),
          metrics: JSON.stringify({
            sent: result.sent,
            failed: result.failed,
            total: contacts.length,
            errors: result.errors.slice(0, 50),
          }),
        } as any);

        await db.logActivity({
          userId: ctx.user.id,
          type: "campaign",
          action: "campaign_completed",
          description: `Campaign "${campaign.name}" completed: ${result.sent} sent, ${result.failed} failed`,
          severity: result.success ? "success" : "warning",
        });

        return {
          success: result.success,
          sent: result.sent,
          failed: result.failed,
          errors: result.errors.slice(0, 20),
        };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        status: z.string().optional(),
        metrics: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateCampaign(id, ctx.user.id, data as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCampaign(input.id, ctx.user.id);
        return { success: true };
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const campaign = await db.getCampaignById(input.id, ctx.user.id);
        if (!campaign) throw new Error("Campaign not found");
        // Get interaction stats for this campaign
        const interactionStats = await db.getCampaignInteractionStats(ctx.user.id, input.id);
        return { ...campaign, interactionStats };
      }),
  }),

  // ─── Templates ───────────────────────────────────────────────────────
  templates: router({
    list: protectedProcedure
      .input(z.object({ channel: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getTemplates(ctx.user.id, input?.channel);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        channel: z.enum(["email", "sms", "linkedin", "social_facebook", "social_instagram", "social_twitter", "social_tiktok", "call_inbound", "call_outbound", "direct_mail", "webform", "chat", "event"]),
        subject: z.string().optional(),
        body: z.string().optional(),
        variables: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createTemplate({ ...input, userId: ctx.user.id } as any);
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        subject: z.string().optional(),
        body: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateTemplate(id, ctx.user.id, data as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteTemplate(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Sync Engine ─────────────────────────────────────────────────────
  sync: router({
    queue: protectedProcedure
      .input(z.object({ status: z.string().optional(), platform: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getSyncQueue(ctx.user.id, input);
      }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getSyncStats(ctx.user.id);
    }),
    retry: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.retrySyncItem(input.id);
        return { success: true };
      }),
    retryAllDlq: protectedProcedure.mutation(async ({ ctx }) => {
      await db.retryAllDlq(ctx.user.id);
      await db.logActivity({
        userId: ctx.user.id,
        type: "sync",
        action: "dlq_retry_all",
        description: "Retried all DLQ items",
        severity: "info",
      });
      return { success: true };
    }),
    // Get live worker status
    workerStatus: protectedProcedure.query(async () => {
      return syncWorker.getState();
    }),
  }),

  // ─── Integrations ───────────────────────────────────────────────────
  integrations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getIntegrations(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ platform: z.string() }))
      .query(async ({ ctx, input }) => {
        return db.getIntegrationByPlatform(ctx.user.id, input.platform);
      }),
    credentials: protectedProcedure
      .input(z.object({ platform: z.string() }))
      .query(async ({ ctx, input }) => {
        return db.getIntegrationCredentials(ctx.user.id, input.platform);
      }),
    upsert: protectedProcedure
      .input(z.object({
        platform: z.enum(["ghl", "dripify", "linkedin", "smsit"]),
        label: z.string().optional(),
        credentials: z.string().optional(),
        status: z.enum(["connected", "disconnected", "error"]).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertIntegration({ ...input, userId: ctx.user.id } as any);
        await db.logActivity({
          userId: ctx.user.id,
          type: "integration",
          action: "integration_updated",
          description: `Updated ${input.platform} integration`,
          severity: "info",
        });
        return { success: true };
      }),
    testConnection: protectedProcedure
      .input(z.object({
        platform: z.enum(["ghl", "dripify", "linkedin", "smsit"]),
        credentials: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        let creds: Record<string, string>;
        try {
          creds = JSON.parse(input.credentials);
        } catch {
          return { success: false, message: "Invalid credentials format" };
        }

        let result = { success: false, message: "Unknown platform" };

        try {
          if (input.platform === "ghl") {
            // Support both API Key and JWT Token auth
            const ghlCreds: ghlService.GhlCredentials = {
              locationId: creds["Location ID"] || "",
            };
            if (creds["API Key"]) ghlCreds.apiKey = creds["API Key"];
            if (creds["JWT Token"]) ghlCreds.jwt = creds["JWT Token"];

            if (!ghlCreds.apiKey && !ghlCreds.jwt) {
              result = { success: false, message: "API Key or JWT Token is required" };
            } else if (!ghlCreds.locationId && !ghlCreds.jwt) {
              result = { success: false, message: "Location ID is required (or use JWT Token which contains it)" };
            } else {
              // If JWT provided, extract locationId from it
              if (ghlCreds.jwt && !ghlCreds.locationId) {
                ghlCreds.locationId = ghlService.extractLocationFromJwt(ghlCreds.jwt) || "";
              }
              result = await ghlService.testConnection(ghlCreds);

              // Auto-seed: promote user to admin on first successful GHL connection
              if (result.success) {
                const existingGhl = await db.getIntegrationByPlatform(ctx.user.id, "ghl");
                if (!existingGhl || existingGhl.status !== "connected") {
                  await db.updateUserGhlIds(ctx.user.id, {
                    ghlLocationId: ghlCreds.locationId,
                    ghlCompanyId: creds["Company ID"] || ghlService.extractCompanyFromJwt(ghlCreds.jwt || "") || null,
                  });
                }
              }
            }
          } else if (input.platform === "smsit") {
            const apiKey = creds["API Key"];
            const sessionToken = creds["Session Token"];
            if (!apiKey && !sessionToken) {
              result = { success: false, message: "API Key or Session Token is required" };
            } else {
              result = await smsitService.testConnection({ apiKey: apiKey || sessionToken || "" });
            }
          } else if (input.platform === "dripify") {
            const apiKey = creds["API Key"];
            const sessionCookie = creds["Session Cookie"];
            if (!apiKey && !sessionCookie) {
              result = { success: false, message: "API Key or Session Cookie is required" };
            } else {
              result = await dripifyService.testConnection({ apiKey: apiKey || sessionCookie || "", sessionCookie: creds["Session Cookie"] || undefined, email: creds["Email"] || undefined });
            }
          } else if (input.platform === "linkedin") {
            const token = creds["Access Token"];
            const sessionCookie = creds["Session Cookie"];
            if (!token && !sessionCookie) {
              result = { success: false, message: "Access Token or Session Cookie (li_at) is required" };
            } else if (sessionCookie) {
              result = { success: true, message: "LinkedIn session cookie stored. Live verification occurs on first API call." };
            } else {
              result = { success: true, message: "LinkedIn token validated. Live verification occurs on first API call." };
            }
          }
        } catch (err: any) {
          result = { success: false, message: `Connection failed: ${err.message}` };
        }

        // Persist test outcome
        const newStatus = result.success ? "connected" : "error";
        await db.upsertIntegration({
          platform: input.platform,
          userId: ctx.user.id,
          credentials: input.credentials,
          label: PLATFORMS_LABELS[input.platform] || input.platform,
          status: newStatus,
          lastCheckedAt: new Date(),
        } as any);
        await db.logActivity({
          userId: ctx.user.id,
          type: "integration",
          action: `${input.platform}_test_${result.success ? "success" : "failed"}`,
          description: result.message,
          severity: result.success ? "success" : "error",
        });

        return result;
      }),
    disconnect: protectedProcedure
      .input(z.object({ platform: z.enum(["ghl", "dripify", "linkedin", "smsit"]) }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertIntegration({
          platform: input.platform,
          userId: ctx.user.id,
          credentials: "",
          status: "disconnected",
        } as any);
        await db.logActivity({
          userId: ctx.user.id,
          type: "integration",
          action: "integration_disconnected",
          description: `Disconnected ${input.platform}`,
          severity: "warning",
        });
        return { success: true };
      }),
  }),

  // ─── Activity Feed ───────────────────────────────────────────────────
  activity: router({
    list: protectedProcedure
      .input(z.object({ type: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getActivityLog(ctx.user.id, input);
      }),
  }),

  // ─── Backups (Real File Generation) ─────────────────────────────────
  backups: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getBackups(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        type: z.enum(["contacts", "campaigns", "full"]),
        format: z.enum(["csv", "json"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createBackup({
          ...input,
          userId: ctx.user.id,
          status: "generating",
        } as any);

        // Actually generate the backup
        try {
          let data: any[] = [];
          let recordCount = 0;

          if (input.type === "contacts" || input.type === "full") {
            const result = await db.getContacts(ctx.user.id, { limit: 10000 });
            data = result.contacts;
            recordCount = result.total;
          }
          if (input.type === "campaigns" || input.type === "full") {
            const campaigns = await db.getCampaigns(ctx.user.id);
            if (input.type === "full") {
              data = [...data, ...campaigns.map((c: any) => ({ ...c, _type: "campaign" }))];
            } else {
              data = campaigns;
            }
            recordCount += campaigns.length;
          }

          let content: string;
          let contentType: string;
          let ext: string;

          if (input.format === "json") {
            content = JSON.stringify(data, null, 2);
            contentType = "application/json";
            ext = "json";
          } else {
            // CSV
            if (data.length === 0) {
              content = "";
            } else {
              const headers = Object.keys(data[0]);
              const rows = data.map((row: any) =>
                headers.map((h) => {
                  const val = row[h];
                  const str = val === null || val === undefined ? "" : String(val);
                  return str.includes(",") || str.includes('"') || str.includes("\n")
                    ? `"${str.replace(/"/g, '""')}"`
                    : str;
                }).join(",")
              );
              content = [headers.join(","), ...rows].join("\n");
            }
            contentType = "text/csv";
            ext = "csv";
          }

          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const fileKey = `backups/${ctx.user.id}/${input.type}-${timestamp}.${ext}`;

          const { url } = await storagePut(fileKey, Buffer.from(content, "utf-8"), contentType);

          await db.updateBackup(id!, {
            status: "ready",
            fileUrl: url,
            fileKey,
            recordCount,
            fileSize: Buffer.byteLength(content, "utf-8"),
          } as any);

          await db.logActivity({
            userId: ctx.user.id,
            type: "backup",
            action: "backup_created",
            description: `Created ${input.format.toUpperCase()} backup of ${input.type} (${recordCount} records)`,
            severity: "success",
          });

          return { id, url };
        } catch (err: any) {
          console.error("[Backup] Generation failed:", err);
          await db.updateBackup(id!, { status: "expired" } as any);
          await db.logActivity({
            userId: ctx.user.id,
            type: "backup",
            action: "backup_failed",
            description: `Backup generation failed: ${err.message}`,
            severity: "error",
          });
          return { id, error: err.message };
        }
      }),
  }),

  // ─── Dripify Webhook Ingestion ──────────────────────────────────────
  webhooks: router({
    dripify: publicProcedure
      .input(z.any())
      .mutation(async ({ input }) => {
        const event = dripifyService.processWebhookEvent(input);
        console.log("[Webhook] Dripify event:", event.type, event.contactEmail);
        return { received: true, type: event.type };
      }),
  }),

  // ─── Orchestrator (Multi-Platform Sequences) ────────────────────────
  orchestrator: router({
    platformHealth: protectedProcedure.query(async ({ ctx }) => {
      return orchestrator.getPlatformHealth(ctx.user.id);
    }),

    startSequence: protectedProcedure
      .input(z.object({
        name: z.string(),
        steps: z.array(z.object({
          channel: z.enum([
            "email", "sms", "linkedin",
            "social_facebook", "social_instagram", "social_twitter", "social_tiktok",
            "call_inbound", "call_outbound", "direct_mail",
            "webform", "chat", "event"
          ]),
          subject: z.string().optional(),
          body: z.string(),
          delayMs: z.number().min(0),
          templateId: z.string().optional(),
        })),
        contactIds: z.array(z.number()),
        audienceFilter: z.object({
          tags: z.array(z.string()).optional(),
          tiers: z.array(z.string()).optional(),
          platforms: z.array(z.string()).optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const contacts = await db.getContactsByIds(input.contactIds);
        return orchestrator.startSequence(ctx.user.id, input, contacts);
      }),

    sequenceStatus: protectedProcedure
      .input(z.object({ sequenceId: z.string() }))
      .query(({ input }) => orchestrator.getSequenceStatus(input.sequenceId)),

    listSequences: protectedProcedure.query(() => orchestrator.listSequences()),

    cancelSequence: protectedProcedure
      .input(z.object({ sequenceId: z.string() }))
      .mutation(({ input }) => ({ cancelled: orchestrator.cancelSequence(input.sequenceId) })),

    pauseSequence: protectedProcedure
      .input(z.object({ sequenceId: z.string() }))
      .mutation(({ input }) => ({ paused: orchestrator.pauseSequence(input.sequenceId) })),

    resumeSequence: protectedProcedure
      .input(z.object({ sequenceId: z.string() }))
      .mutation(({ input }) => ({ resumed: orchestrator.resumeSequence(input.sequenceId) })),
  }),

  // ─── Sync Scheduler ─────────────────────────────────────────────────
  syncScheduler: router({
    status: protectedProcedure.query(() => syncScheduler.getStatus()),

    start: protectedProcedure
      .input(z.object({
        intervalMs: z.number().min(10000).optional(),
        platforms: z.object({
          ghl: z.object({ enabled: z.boolean(), pullContacts: z.boolean().optional(), pushContacts: z.boolean().optional() }).optional(),
          smsit: z.object({ enabled: z.boolean(), pullContacts: z.boolean().optional() }).optional(),
          dripify: z.object({ enabled: z.boolean(), pullLeads: z.boolean().optional() }).optional(),
        }).optional(),
      }).optional())
      .mutation(({ ctx, input }) => syncScheduler.start(ctx.user.id, input || undefined)),

    stop: protectedProcedure.mutation(() => syncScheduler.stop()),

    forcePull: protectedProcedure
      .input(z.object({ platform: z.string().optional() }).optional())
      .mutation(async ({ input }) => {
        const events = await syncScheduler.forcePull(input?.platform);
        return { events };
      }),

    forcePush: protectedProcedure
      .mutation(async () => {
        const events = await syncScheduler.forcePush();
        return { events };
      }),

    webhook: publicProcedure
      .input(z.object({ platform: z.string(), payload: z.any() }))
      .mutation(({ input }) => syncScheduler.processWebhook(input.platform, input.payload)),
  }),

  // ─── Contact Interactions (Unified Cross-Channel Timeline) ──────────
  interactions: router({
    list: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        channel: z.string().optional(),
        limit: z.number().min(1).max(200).optional(),
        offset: z.number().min(0).optional(),
      }))
      .query(async ({ ctx, input }) => {
        return db.getContactInteractions(ctx.user.id, input.contactId, input);
      }),

    create: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        channel: z.enum([
          "email", "sms", "linkedin",
          "social_facebook", "social_instagram", "social_twitter", "social_tiktok",
          "call_inbound", "call_outbound", "direct_mail",
          "webform", "chat", "event"
        ]),
        direction: z.enum(["inbound", "outbound"]),
        type: z.enum([
          "message_sent", "message_received", "message_opened", "message_clicked",
          "call_made", "call_received", "call_missed", "voicemail_left",
          "form_submitted", "page_visited", "chat_started", "chat_message",
          "event_registered", "event_attended", "event_missed",
          "connection_sent", "connection_accepted", "profile_viewed",
          "mail_sent", "mail_delivered", "mail_returned",
          "post_published", "post_engaged", "dm_sent", "dm_received"
        ]),
        subject: z.string().optional(),
        body: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        campaignId: z.number().optional(),
        platform: z.string().max(100).optional(),
        externalId: z.string().max(500).optional(),
        sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createInteraction({ ...input, userId: ctx.user.id });
        return { id };
      }),

    stats: protectedProcedure
      .input(z.object({ contactId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getInteractionStats(ctx.user.id, input?.contactId);
      }),

    byCampaign: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        channel: z.string().optional(),
        limit: z.number().min(1).max(200).optional(),
        offset: z.number().min(0).optional(),
      }))
      .query(async ({ ctx, input }) => {
        return db.getInteractionsByCampaign(ctx.user.id, input.campaignId, input);
      }),

    crossChannelMetrics: protectedProcedure.query(async ({ ctx }) => {
      return db.getCrossChannelMetrics(ctx.user.id);
    }),
  }),

  // ─── Channel Configuration ─────────────────────────────────────────
  channels: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getChannelConfigs(ctx.user.id);
    }),

    upsert: protectedProcedure
      .input(z.object({
        channel: z.enum([
          "email", "sms", "linkedin",
          "social_facebook", "social_instagram", "social_twitter", "social_tiktok",
          "call_inbound", "call_outbound", "direct_mail",
          "webform", "chat", "event"
        ]),
        enabled: z.boolean(),
        provider: z.string().optional(),
        config: z.record(z.string(), z.unknown()).optional(),
        dailyLimit: z.number().int().min(0).max(1000000).optional(),
        monthlyBudget: z.string().max(20).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertChannelConfig({ ...input, userId: ctx.user.id });
        await db.logActivity({
          userId: ctx.user.id,
          type: "system",
          action: "channel_config_updated",
          description: `Updated ${input.channel} channel: ${input.enabled ? "enabled" : "disabled"}${input.provider ? ` via ${input.provider}` : ""}`,
          severity: "info",
        });
        return { success: true };
      }),

    get: protectedProcedure
      .input(z.object({ channel: z.string() }))
      .query(async ({ ctx, input }) => {
        return db.getChannelConfig(ctx.user.id, input.channel);
      }),
  }),

  // ─── AI / Agentic Continuous Improvement Engine ─────────────────────
  ai: router({
    insights: protectedProcedure.query(async ({ ctx }) => {
      return aiEngine.generateInsightsReport(ctx.user.id);
    }),

    healthScore: protectedProcedure.query(async ({ ctx }) => {
      const report = await aiEngine.generateInsightsReport(ctx.user.id);
      return report.healthScore;
    }),

    recommendations: protectedProcedure.query(async ({ ctx }) => {
      const report = await aiEngine.generateInsightsReport(ctx.user.id);
      return report.recommendations;
    }),

    predictions: protectedProcedure.query(async ({ ctx }) => {
      const report = await aiEngine.generateInsightsReport(ctx.user.id);
      return report.predictions;
    }),

    leadScore: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ ctx, input }) => {
        const contact = await db.getContactById(input.contactId, ctx.user.id);
        if (!contact) return null;
        return aiEngine.computeLeadScore(contact);
      }),

    bulkLeadScore: protectedProcedure.mutation(async ({ ctx }) => {
      const { contacts } = await db.getContacts(ctx.user.id, { limit: 200 });
      let updated = 0;
      for (const contact of contacts) {
        const { score, tier } = aiEngine.computeLeadScore(contact);
        if (contact.tier !== tier || contact.propensityScore !== String(score)) {
          await db.updateContact(contact.id, ctx.user.id, {
            propensityScore: String(score),
            tier,
          });
          updated++;
        }
      }
      await db.logActivity({
        userId: ctx.user.id,
        type: "enrichment",
        action: "bulk_lead_score",
        description: `AI engine scored ${updated} contacts out of ${contacts.length}`,
        severity: "success",
      });
      return { scored: updated, total: contacts.length };
    }),
  }),
});

export type AppRouter = typeof appRouter;
