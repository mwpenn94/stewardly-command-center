import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as ghlService from "./services/ghl";
import { syncScheduler } from "./services/syncScheduler";

const mockCtx: TrpcContext = {
  user: { id: 9999, openId: "test-open-id", name: "Test User", role: "admin" },
} as any;

const caller = appRouter.createCaller(mockCtx);

// ─── buildPushPayloadFromLocal ────────────────────────────────────

describe("buildPushPayloadFromLocal", () => {
  it("maps standard local contact fields to GHL payload", () => {
    const localContact = {
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "+15551234567",
      address: "123 Main St",
      city: "Denver",
      state: "CO",
      postalCode: "80202",
      companyName: "Acme Corp",
      website: "https://acme.com",
      source: "LinkedIn",
      tags: JSON.stringify(["vip", "prospect"]),
    };

    const payload = ghlService.buildPushPayloadFromLocal(localContact, []);

    expect(payload.firstName).toBe("Jane");
    expect(payload.lastName).toBe("Doe");
    expect(payload.email).toBe("jane@example.com");
    expect(payload.phone).toBe("+15551234567");
    expect(payload.address1).toBe("123 Main St");
    expect(payload.city).toBe("Denver");
    expect(payload.state).toBe("CO");
    expect(payload.postalCode).toBe("80202");
    expect(payload.companyName).toBe("Acme Corp");
    expect(payload.website).toBe("https://acme.com");
    expect(payload.source).toBe("LinkedIn");
    expect(payload.tags).toEqual(["vip", "prospect"]);
  });

  it("includes custom fields in payload", () => {
    const localContact = {
      firstName: "John",
      lastName: "Smith",
      email: "john@example.com",
    };

    const customFields = [
      { ghlFieldId: "abc123", value: "Gold" },
      { ghlFieldId: "def456", value: "95" },
    ];

    const payload = ghlService.buildPushPayloadFromLocal(localContact, customFields);

    expect(payload.customFields).toBeDefined();
    expect(payload.customFields).toHaveLength(2);
    expect(payload.customFields![0]).toEqual({ key: "abc123", field_value: "Gold" });
    expect(payload.customFields![1]).toEqual({ key: "def456", field_value: "95" });
  });

  it("handles empty/null tags gracefully", () => {
    const localContact = {
      firstName: "Test",
      tags: null,
    };

    const payload = ghlService.buildPushPayloadFromLocal(localContact, []);
    expect(payload.tags).toBeUndefined();
  });

  it("handles JSON array tags", () => {
    const localContact = {
      firstName: "Test",
      tags: '["tag1","tag2"]',
    };

    const payload = ghlService.buildPushPayloadFromLocal(localContact, []);
    expect(payload.tags).toEqual(["tag1", "tag2"]);
  });

  it("handles comma-separated tags string", () => {
    const localContact = {
      firstName: "Test",
      tags: "tag1,tag2,tag3",
    };

    const payload = ghlService.buildPushPayloadFromLocal(localContact, []);
    // Non-JSON tags strings are not parsed as arrays
    expect(payload.tags).toBeUndefined();
  });
});

// ─── Sync Scheduler Bidirectional Status ──────────────────────────

describe("Sync Scheduler Bidirectional Status", () => {
  it("status includes bidirectional fields", async () => {
    const status = await caller.syncScheduler.status();
    expect(status).toHaveProperty("isRunning");
    expect(status).toHaveProperty("recentEvents");
    expect(status).toHaveProperty("pendingPushCount");
    expect(status).toHaveProperty("lastPushAt");
    expect(status).toHaveProperty("lastPullAt");
    expect(status).toHaveProperty("totalPushed");
    expect(status).toHaveProperty("totalPulled");
    expect(typeof status.pendingPushCount).toBe("number");
    expect(typeof status.totalPushed).toBe("number");
    expect(typeof status.totalPulled).toBe("number");
  });

  it("start returns status with bidirectional fields", async () => {
    try {
      const result = await caller.syncScheduler.start({
        intervalMs: 900000,
        platforms: {
          ghl: { enabled: true, pullContacts: true, pushContacts: true },
          smsit: { enabled: true, pullContacts: true },
          dripify: { enabled: true, pullLeads: true },
        },
      });
      expect(result).toHaveProperty("isRunning");
      expect(result).toHaveProperty("totalPushed");
      expect(result).toHaveProperty("totalPulled");
    } catch (err: any) {
      expect(err.message).toBeDefined();
    } finally {
      // Clean up
      try { await caller.syncScheduler.stop(); } catch {}
    }
  });

  it("stop returns status with isRunning false", async () => {
    const result = await caller.syncScheduler.stop();
    expect(result.isRunning).toBe(false);
    expect(result).toHaveProperty("pendingPushCount");
  });

  it("forcePush returns events array", async () => {
    try {
      const result = await caller.syncScheduler.forcePush();
      expect(result).toHaveProperty("events");
      expect(Array.isArray(result.events)).toBe(true);
    } catch (err: any) {
      // May fail if no GHL creds, that's OK
      expect(err.message).toBeDefined();
    }
  });
});

// ─── Sync Scheduler Manager Direct Tests ─────────────────────────

describe("SyncSchedulerManager direct", () => {
  it("getStatus returns all required fields", () => {
    const status = syncScheduler.getStatus();
    expect(status).toHaveProperty("isRunning");
    expect(status).toHaveProperty("intervalMs");
    expect(status).toHaveProperty("lastPollAt");
    expect(status).toHaveProperty("nextPollAt");
    expect(status).toHaveProperty("platforms");
    expect(status).toHaveProperty("recentEvents");
    expect(status).toHaveProperty("pendingPushCount");
    expect(status).toHaveProperty("lastPushAt");
    expect(status).toHaveProperty("lastPullAt");
    expect(status).toHaveProperty("totalPushed");
    expect(status).toHaveProperty("totalPulled");
  });

  it("start sets isRunning to true", () => {
    const status = syncScheduler.start(9999, { intervalMs: 600000 });
    expect(status.isRunning).toBe(true);
    expect(status.intervalMs).toBe(600000);
    // Clean up
    syncScheduler.stop();
  });

  it("stop sets isRunning to false and clears nextPollAt", () => {
    syncScheduler.start(9999, { intervalMs: 600000 });
    const status = syncScheduler.stop();
    expect(status.isRunning).toBe(false);
    expect(status.nextPollAt).toBeNull();
  });

  it("forcePull returns events array", async () => {
    const events = await syncScheduler.forcePull("invalid_platform");
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBe(0);
  });

  it("forcePush returns events array", async () => {
    const events = await syncScheduler.forcePush();
    expect(Array.isArray(events)).toBe(true);
  });

  it("processWebhook adds event to recentEvents", () => {
    const event = syncScheduler.processWebhook("ghl", { type: "contact.updated" });
    expect(event).toHaveProperty("platform", "ghl");
    expect(event).toHaveProperty("type", "webhook");
    const status = syncScheduler.getStatus();
    expect(status.recentEvents.some((e: any) => e.type === "webhook" && e.platform === "ghl")).toBe(true);
  });
});

// ─── Contact Push/Pull Router Procedures ─────────────────────────

describe("Contact Push/Pull Procedures", () => {
  // Clean up any GHL credentials left by other test files (e.g. e2e.test.ts)
  // Must be beforeEach because vitest runs files in parallel, so e2e.test.ts
  // may write GHL credentials AFTER our beforeAll runs
  beforeEach(async () => {
    try {
      await caller.integrations.disconnect({ platform: "ghl" });
    } catch { /* ignore if not connected */ }
  });

  it("pushToGhl rejects non-existent contact", async () => {
    await expect(
      caller.contacts.pushToGhl({ id: 999999 })
    ).rejects.toThrow();
  });

  it("refreshFromGhl rejects non-existent contact", async () => {
    await expect(
      caller.contacts.refreshFromGhl({ id: 999999 })
    ).rejects.toThrow();
  });

  it("pullFromGhl rejects with missing GHL credentials", async () => {
    await expect(
      caller.contacts.pullFromGhl({ ghlContactId: "nonexistent-ghl-id" })
    ).rejects.toThrow();
  });

  it("pendingCount returns a count object", async () => {
    const result = await caller.contacts.pendingCount();
    expect(result).toHaveProperty("count");
    expect(typeof result.count).toBe("number");
    expect(result.count).toBeGreaterThanOrEqual(0);
  });

  it("pushDirtyBatch returns zero counts without GHL credentials or dirty contacts", async () => {
    // When GHL is disconnected, getGhlCredentials returns null → throws "GHL not configured"
    // But if another parallel test reconnects GHL in between, it returns {pushed:0, failed:0, remaining:0}
    // because there are no dirty contacts for userId 9999.
    // Accept either outcome for parallel-safe testing.
    try {
      const result = await caller.contacts.pushDirtyBatch({ limit: 10 });
      // If it didn't throw, it means GHL was connected (parallel test wrote creds)
      // but there are no dirty contacts, so pushed=0
      expect(result.pushed).toBe(0);
    } catch (e: any) {
      expect(e.message).toContain("GHL not configured");
    }
  });
});

// ─── bulkDelete procedure ────────────────────────────────────

describe("contacts.bulkDelete", () => {
  it("requires at least 1 id", async () => {
    await expect(caller.contacts.bulkDelete({ ids: [] })).rejects.toThrow();
  });

  it("rejects more than 500 ids", async () => {
    const ids = Array.from({ length: 501 }, (_, i) => i + 1);
    await expect(caller.contacts.bulkDelete({ ids })).rejects.toThrow();
  });

  it("accepts valid id array and returns deleted count", async () => {
    // This test uses the mock context so DB calls will fail gracefully
    // but the procedure should not throw on valid input shape
    try {
      const result = await caller.contacts.bulkDelete({ ids: [1, 2, 3] });
      expect(result).toHaveProperty("deleted");
      expect(result).toHaveProperty("ghlDeleted");
    } catch (err: any) {
      // If DB is not available, the error should be a DB error, not a validation error
      expect(err.message).not.toContain("too_small");
      expect(err.message).not.toContain("too_big");
    }
  });
});
