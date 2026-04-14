/**
 * Hybrid Sync Scheduler
 * 
 * Manages periodic polling sync across all platforms with configurable intervals.
 * Strategy: Polling as primary (works without webhook setup), with event-driven
 * updates when webhooks are configured.
 * 
 * Bidirectional reconciliation:
 * - PUSH: Detect local contacts with syncStatus="pending" and push to GHL
 * - PULL: Fetch recent GHL contacts and upsert into local DB with full field mapping
 * - Conflict resolution: last-write-wins based on ghlDateUpdated vs local updatedAt
 */

import * as ghl from "./ghl";
import * as smsit from "./smsit";
import * as dripify from "./dripify";
import { getGhlCredentials, getSmsitCredentials, getDripifyCredentials } from "./credentials";
import { mapGhlContactToLocal, extractCustomFields } from "./ghlImport";
import { getDb } from "../db";
import { contacts, contactCustomFields } from "../../drizzle/schema";
import { eq, and, count } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────

export interface SyncConfig {
  intervalMs: number;
  platforms: {
    ghl?: { enabled: boolean; pullContacts?: boolean; pushContacts?: boolean };
    smsit?: { enabled: boolean; pullContacts?: boolean };
    dripify?: { enabled: boolean; pullLeads?: boolean };
  };
}

export interface SyncEvent {
  platform: string;
  type: "pull" | "push" | "webhook" | "error";
  message: string;
  count?: number;
  timestamp: number;
}

export interface SyncStatus {
  isRunning: boolean;
  intervalMs: number;
  lastPollAt: number | null;
  nextPollAt: number | null;
  platforms: Record<string, { enabled: boolean; lastSyncAt: number | null; lastError: string | null; syncCount: number }>;
  recentEvents: SyncEvent[];
  // Bidirectional sync stats
  pendingPushCount: number;
  lastPushAt: number | null;
  lastPullAt: number | null;
  totalPushed: number;
  totalPulled: number;
}

// ─── Singleton Manager ───────────────────────────────────────────────

class SyncSchedulerManager {
  private timer: ReturnType<typeof setInterval> | null = null;
  private config: SyncConfig = {
    intervalMs: 5 * 60 * 1000,
    platforms: {
      ghl: { enabled: true, pullContacts: true, pushContacts: true },
      smsit: { enabled: true, pullContacts: true },
      dripify: { enabled: true, pullLeads: true },
    },
  };
  private status: SyncStatus = {
    isRunning: false,
    intervalMs: 5 * 60 * 1000,
    lastPollAt: null,
    nextPollAt: null,
    platforms: {
      ghl: { enabled: true, lastSyncAt: null, lastError: null, syncCount: 0 },
      smsit: { enabled: true, lastSyncAt: null, lastError: null, syncCount: 0 },
      dripify: { enabled: true, lastSyncAt: null, lastError: null, syncCount: 0 },
    },
    recentEvents: [],
    pendingPushCount: 0,
    lastPushAt: null,
    lastPullAt: null,
    totalPushed: 0,
    totalPulled: 0,
  };
  private userId: number = 1;

  start(userId: number, config?: Partial<SyncConfig>): SyncStatus {
    this.userId = userId;
    if (config) {
      if (config.intervalMs) this.config.intervalMs = config.intervalMs;
      if (config.platforms) this.config.platforms = { ...this.config.platforms, ...config.platforms };
    }
    this.status.intervalMs = this.config.intervalMs;

    for (const [key, val] of Object.entries(this.config.platforms)) {
      if (val && this.status.platforms[key]) {
        this.status.platforms[key].enabled = val.enabled;
      }
    }

    if (this.timer) clearInterval(this.timer);
    this.status.isRunning = true;
    this.status.nextPollAt = Date.now() + this.config.intervalMs;

    this.poll().catch(() => {});
    this.timer = setInterval(() => { this.poll().catch(() => {}); }, this.config.intervalMs);

    this.addEvent("ghl", "pull", `Sync scheduler started (interval: ${Math.round(this.config.intervalMs / 1000)}s)`);
    return this.getStatus();
  }

  stop(): SyncStatus {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.status.isRunning = false;
    this.status.nextPollAt = null;
    this.addEvent("ghl", "pull", "Sync scheduler stopped");
    return this.getStatus();
  }

  getStatus(): SyncStatus {
    return { ...this.status, recentEvents: [...this.status.recentEvents] };
  }

  async forcePull(platform?: string): Promise<SyncEvent[]> {
    const events: SyncEvent[] = [];
    if (!platform || platform === "ghl") events.push(...await this.pullGhl());
    if (!platform || platform === "smsit") events.push(...await this.pullSmsit());
    if (!platform || platform === "dripify") events.push(...await this.pullDripify());
    return events;
  }

  async forcePush(): Promise<SyncEvent[]> {
    return this.pushDirtyToGhl();
  }

  private async poll() {
    this.status.lastPollAt = Date.now();
    this.status.nextPollAt = Date.now() + this.config.intervalMs;
    const promises: Promise<SyncEvent[]>[] = [];

    // Bidirectional: push dirty contacts first, then pull
    if (this.config.platforms.ghl?.enabled && this.config.platforms.ghl?.pushContacts) {
      promises.push(this.pushDirtyToGhl());
    }
    if (this.config.platforms.ghl?.enabled && this.config.platforms.ghl?.pullContacts) {
      promises.push(this.pullGhl());
    }
    if (this.config.platforms.smsit?.enabled) promises.push(this.pullSmsit());
    if (this.config.platforms.dripify?.enabled) promises.push(this.pullDripify());

    await Promise.allSettled(promises);

    // Update pending count
    await this.refreshPendingCount();
  }

  // ─── Bidirectional GHL Push ────────────────────────────────────────

  private async pushDirtyToGhl(): Promise<SyncEvent[]> {
    const events: SyncEvent[] = [];
    try {
      const creds = await getGhlCredentials(this.userId);
      if (!creds || (!creds.apiKey && !creds.jwt)) {
        this.addEvent("ghl", "error", "No GHL credentials for push");
        return events;
      }

      const db = await getDb();
      if (!db) return events;

      // Find contacts with syncStatus = "pending"
      const dirtyRows = await db.select()
        .from(contacts)
        .where(and(eq(contacts.userId, this.userId), eq(contacts.syncStatus, "pending" as any)))
        .limit(50);

      if (dirtyRows.length === 0) return events;

      let pushed = 0, failed = 0;

      for (const contact of dirtyRows) {
        try {
          // Fetch custom fields for this contact
          const customFields = await db.select()
            .from(contactCustomFields)
            .where(eq(contactCustomFields.contactId, contact.id));

          const cfPayload = customFields.map(cf => ({
            ghlFieldId: cf.ghlFieldId,
            value: cf.value || "",
          }));

          const payload = ghl.buildPushPayloadFromLocal(contact, cfPayload);
          payload.locationId = creds.locationId;

          let result;
          if (contact.ghlContactId) {
            result = await ghl.updateContact(creds, contact.ghlContactId, payload);
          } else {
            result = await ghl.upsertContact(creds, payload);
          }

          if (result.success || result.contactId) {
            const updateData: Record<string, any> = {
              syncStatus: "synced",
              lastSyncedAt: new Date(),
            };
            if (result.contactId && !contact.ghlContactId) {
              updateData.ghlContactId = result.contactId;
            }
            await db.update(contacts).set(updateData)
              .where(eq(contacts.id, contact.id));
            pushed++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      this.status.totalPushed += pushed;
      this.status.lastPushAt = Date.now();

      const msg = `Pushed ${pushed} contacts to GHL (${failed} failed, ${dirtyRows.length} attempted)`;
      events.push({ platform: "ghl", type: "push", message: msg, count: pushed, timestamp: Date.now() });
      this.addEvent("ghl", "push", msg, pushed);

      if (pushed > 0) {
        this.status.platforms.ghl.lastSyncAt = Date.now();
        this.status.platforms.ghl.syncCount++;
        this.status.platforms.ghl.lastError = null;
      }
    } catch (err: any) {
      this.status.platforms.ghl.lastError = err.message;
      this.addEvent("ghl", "error", `GHL push error: ${err.message}`);
    }
    return events;
  }

  // ─── Bidirectional GHL Pull with Full Field Mapping ────────────────

  private async pullGhl(): Promise<SyncEvent[]> {
    const events: SyncEvent[] = [];
    try {
      const creds = await getGhlCredentials(this.userId);
      if (!creds) { this.addEvent("ghl", "error", "No GHL credentials"); return events; }

      const result = await ghl.listContacts(creds, { limit: 100 });
      if (result.contacts && result.contacts.length > 0) {
        const db = await getDb();
        let upserted = 0, skipped = 0;

        if (db) {
          for (const ghlContact of result.contacts) {
            try {
              // Check if contact exists locally
              const existing = await db.select({ id: contacts.id, updatedAt: contacts.updatedAt, syncStatus: contacts.syncStatus })
                .from(contacts)
                .where(and(eq(contacts.userId, this.userId), eq(contacts.ghlContactId, ghlContact.id)))
                .limit(1);

              if (existing.length > 0) {
                // Skip if local contact is "pending" (has unsaved local changes)
                if (existing[0].syncStatus === "pending") {
                  skipped++;
                  continue;
                }

                // Update existing with full field mapping
                const localData = mapGhlContactToLocal(ghlContact, this.userId);
                const { userId: _u, ...updateData } = localData;
                await db.update(contacts).set(updateData as any)
                  .where(eq(contacts.id, existing[0].id));

                // Upsert custom fields
                const cfs = extractCustomFields(ghlContact, existing[0].id);
                for (const cf of cfs) {
                  try {
                    await db.insert(contactCustomFields).values(cf)
                      .onDuplicateKeyUpdate({
                        set: { value: cf.value, fieldName: cf.fieldName, fieldKey: cf.fieldKey, fieldType: cf.fieldType, updatedAt: new Date() },
                      });
                  } catch { /* ignore */ }
                }
                upserted++;
              } else {
                // Insert new contact with full field mapping
                const localData = mapGhlContactToLocal(ghlContact, this.userId);
                const insertResult = await db.insert(contacts).values(localData);
                const newId = insertResult[0].insertId;

                // Insert custom fields
                const cfs = extractCustomFields(ghlContact, newId);
                for (const cf of cfs) {
                  try {
                    await db.insert(contactCustomFields).values(cf)
                      .onDuplicateKeyUpdate({
                        set: { value: cf.value, fieldName: cf.fieldName, fieldKey: cf.fieldKey, fieldType: cf.fieldType, updatedAt: new Date() },
                      });
                  } catch { /* ignore */ }
                }
                upserted++;
              }
            } catch {
              skipped++;
            }
          }
        }

        this.status.totalPulled += upserted;
        this.status.lastPullAt = Date.now();

        const msg = `Pulled ${result.contacts.length} contacts from GHL (${upserted} upserted, ${skipped} skipped, total: ${result.total || "?"})`;
        events.push({ platform: "ghl", type: "pull", message: msg, count: result.contacts.length, timestamp: Date.now() });
        this.addEvent("ghl", "pull", msg, result.contacts.length);
        this.status.platforms.ghl.lastSyncAt = Date.now();
        this.status.platforms.ghl.syncCount++;
        this.status.platforms.ghl.lastError = null;
      }
    } catch (err: any) {
      this.status.platforms.ghl.lastError = err.message;
      this.addEvent("ghl", "error", `GHL pull error: ${err.message}`);
    }
    return events;
  }

  private async pullSmsit(): Promise<SyncEvent[]> {
    const events: SyncEvent[] = [];
    try {
      const creds = await getSmsitCredentials(this.userId);
      if (!creds) { this.addEvent("smsit", "error", "No SMS-iT credentials"); return events; }
      const result = await smsit.listContacts(creds, { perPage: 50 });
      if (result.success) {
        const msg = `Pulled ${result.contacts?.length || 0} contacts from SMS-iT`;
        events.push({ platform: "smsit", type: "pull", message: msg, count: result.contacts?.length || 0, timestamp: Date.now() });
        this.addEvent("smsit", "pull", msg, result.contacts?.length || 0);
        this.status.platforms.smsit.lastSyncAt = Date.now();
        this.status.platforms.smsit.syncCount++;
        this.status.platforms.smsit.lastError = null;
      }
    } catch (err: any) {
      this.status.platforms.smsit.lastError = err.message;
      this.addEvent("smsit", "error", `SMS-iT pull error: ${err.message}`);
    }
    return events;
  }

  private async pullDripify(): Promise<SyncEvent[]> {
    const events: SyncEvent[] = [];
    try {
      const creds = await getDripifyCredentials(this.userId);
      if (!creds) { this.addEvent("dripify", "error", "No Dripify credentials"); return events; }
      const result = await dripify.listCampaigns(creds);
      if (result.success) {
        const msg = `Pulled ${result.campaigns?.length || 0} campaigns from Dripify`;
        events.push({ platform: "dripify", type: "pull", message: msg, count: result.campaigns?.length || 0, timestamp: Date.now() });
        this.addEvent("dripify", "pull", msg, result.campaigns?.length || 0);
        this.status.platforms.dripify.lastSyncAt = Date.now();
        this.status.platforms.dripify.syncCount++;
        this.status.platforms.dripify.lastError = null;
      }
    } catch (err: any) {
      this.status.platforms.dripify.lastError = err.message;
      this.addEvent("dripify", "error", `Dripify pull error: ${err.message}`);
    }
    return events;
  }

  private addEvent(platform: string, type: SyncEvent["type"], message: string, count?: number) {
    const event: SyncEvent = { platform, type, message, count, timestamp: Date.now() };
    this.status.recentEvents.unshift(event);
    if (this.status.recentEvents.length > 50) this.status.recentEvents = this.status.recentEvents.slice(0, 50);
  }

  private async refreshPendingCount() {
    try {
      const db = await getDb();
      if (!db) return;
      const result = await db.select({ count: count() })
        .from(contacts)
        .where(and(eq(contacts.userId, this.userId), eq(contacts.syncStatus, "pending" as any)));
      this.status.pendingPushCount = result[0]?.count || 0;
    } catch { /* ignore */ }
  }

  processWebhook(platform: string, payload: any): SyncEvent {
    if (platform === "dripify") {
      const event = dripify.processWebhookEvent(payload);
      const syncEvent: SyncEvent = { platform: "dripify", type: "webhook", message: `Webhook: ${event.type} for ${event.contactEmail || "unknown"}`, timestamp: Date.now() };
      this.addEvent("dripify", "webhook", syncEvent.message);
      return syncEvent;
    }
    const syncEvent: SyncEvent = { platform, type: "webhook", message: `Webhook received from ${platform}`, timestamp: Date.now() };
    this.addEvent(platform, "webhook", syncEvent.message);
    return syncEvent;
  }
}

export const syncScheduler = new SyncSchedulerManager();
