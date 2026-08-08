/**
 * Hybrid Sync Scheduler
 * 
 * Manages periodic polling sync across all platforms with configurable intervals.
 * Strategy: Polling as primary (works without webhook setup), with event-driven
 * updates when webhooks are configured.
 */

import * as ghl from "./ghl";
import * as smsit from "./smsit";
import * as dripify from "./dripify";
import { getGhlCredentials, getSmsitCredentials, getDripifyCredentials } from "./credentials";

// ─── Types ───────────────────────────────────────────────────────────

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

  private async poll() {
    this.status.lastPollAt = Date.now();
    this.status.nextPollAt = Date.now() + this.config.intervalMs;
    const promises: Promise<SyncEvent[]>[] = [];
    if (this.config.platforms.ghl?.enabled) promises.push(this.pullGhl());
    if (this.config.platforms.smsit?.enabled) promises.push(this.pullSmsit());
    if (this.config.platforms.dripify?.enabled) promises.push(this.pullDripify());
    await Promise.allSettled(promises);
  }

  private async pullGhl(): Promise<SyncEvent[]> {
    const events: SyncEvent[] = [];
    try {
      const creds = await getGhlCredentials(this.userId);
      if (!creds) { this.addEvent("ghl", "error", "No GHL credentials"); return events; }
      const result = await ghl.listContacts(creds, { limit: 100 });
      if (result.contacts) {
        const msg = `Pulled ${result.contacts.length} contacts from GHL (total: ${result.total || "?"})`;
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
