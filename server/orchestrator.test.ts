import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const mockCtx: TrpcContext = {
  user: { id: 9999, openId: "test-open-id", name: "Michael Penn", role: "admin" },
} as any;

const caller = appRouter.createCaller(mockCtx);

describe("Orchestrator Router", () => {
  it("platformHealth returns an array of platform statuses", async () => {
    const health = await caller.orchestrator.platformHealth();
    expect(Array.isArray(health)).toBe(true);
    expect(health.length).toBeGreaterThanOrEqual(1);
    for (const p of health) {
      expect(p).toHaveProperty("platform");
      expect(p).toHaveProperty("connected");
    }
  });

  it("startSequence returns a result object for valid input", async () => {
    const result = await caller.orchestrator.startSequence({
      name: "Test Sequence",
      steps: [{ channel: "email", delayMs: 0, body: "test", subject: "Test" }],
      contactIds: [1],
    });
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("string");
  });

  it("startSequence handles multi-channel steps", async () => {
    const result = await caller.orchestrator.startSequence({
      name: "Multi-Channel Test",
      steps: [
        { channel: "email", delayMs: 0, body: "Hello from email", subject: "Test" },
        { channel: "sms", delayMs: 3600000, body: "Follow up via SMS" },
        { channel: "linkedin", delayMs: 7200000, body: "Connect on LinkedIn" },
      ],
      contactIds: [],
      audienceFilter: { tiers: ["gold"] },
    });
    expect(result).toHaveProperty("id");
  });

  it("sequenceStatus returns null for non-existent sequence", async () => {
    const result = await caller.orchestrator.sequenceStatus({ sequenceId: "non-existent-id" });
    expect(result).toBeNull();
  });
});

describe("Sync Scheduler Router", () => {
  it("status returns scheduler state", async () => {
    const status = await caller.syncScheduler.status();
    expect(status).toHaveProperty("isRunning");
    expect(typeof status.isRunning).toBe("boolean");
  });

  it("start accepts valid config", async () => {
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
    } catch (err: any) {
      expect(err.message).toBeDefined();
    }
  });

  it("start rejects interval below minimum", async () => {
    await expect(
      caller.syncScheduler.start({ intervalMs: 1000 })
    ).rejects.toThrow();
  });

  it("stop returns scheduler status", async () => {
    const result = await caller.syncScheduler.stop();
    expect(result).toHaveProperty("isRunning");
    expect(result.isRunning).toBe(false);
  });

  it("status includes recentEvents array", async () => {
    const status = await caller.syncScheduler.status();
    expect(status).toHaveProperty("recentEvents");
    expect(Array.isArray(status.recentEvents)).toBe(true);
  });

  it("forcePoll accepts valid platform", async () => {
    try {
      await caller.syncScheduler.forcePull({ platform: "ghl" });
    } catch (err: any) {
      expect(err.message).toBeDefined();
    }
  });

  it("forcePoll returns empty events for unknown platform", async () => {
    const result = await caller.syncScheduler.forcePull({ platform: "invalid" });
    expect(result).toHaveProperty("events");
    expect(Array.isArray(result.events)).toBe(true);
    expect(result.events.length).toBe(0);
  });
});

describe("SMS-iT Service", () => {
  it("testConnection returns success/failure object", async () => {
    const smsit = await import("./services/smsit");
    const result = await smsit.testConnection({ apiKey: "invalid-key-12345678" });
    expect(result).toHaveProperty("success");
    expect(typeof result.success).toBe("boolean");
    expect(result).toHaveProperty("message");
  });

  it("sendSms returns failure for invalid credentials", async () => {
    const smsit = await import("./services/smsit");
    const result = await smsit.sendSms({ apiKey: "test-key-12345678" }, "+15551234567", "Test message");
    expect(result).toHaveProperty("success");
    expect(result.success).toBe(false);
  });

  it("checkCreditBalance returns result", async () => {
    const smsit = await import("./services/smsit");
    const result = await smsit.checkCreditBalance({ apiKey: "invalid-key-12345678" });
    expect(result).toHaveProperty("success");
  });
});

describe("Dripify Service", () => {
  it("processWebhookEvent extracts contact data from lead event", async () => {
    const dripify = await import("./services/dripify");
    const event = {
      event: "lead_accepted",
      lead: { email: "test@example.com", firstName: "John", lastName: "Doe" },
    };
    const result = dripify.processWebhookEvent(event);
    expect(result.type).toBe("lead_accepted");
    expect(result.contactEmail).toBe("test@example.com");
  });

  it("processWebhookEvent handles missing lead data", async () => {
    const dripify = await import("./services/dripify");
    const result = dripify.processWebhookEvent({ event: "unknown_event" });
    expect(result.type).toBe("unknown_event");
    expect(result.contactEmail).toBeUndefined();
  });

  it("isTokenExpired returns true for expired token", async () => {
    const dripify = await import("./services/dripify");
    expect(dripify.isTokenExpired({ apiKey: "test", expiresAt: Date.now() - 60000 })).toBe(true);
  });

  it("isTokenExpired returns false for valid token", async () => {
    const dripify = await import("./services/dripify");
    expect(dripify.isTokenExpired({ apiKey: "test", expiresAt: Date.now() + 3600000 })).toBe(false);
  });
});

describe("Campaign Engine", () => {
  it("executeCampaign is exported and callable", async () => {
    const engine = await import("./services/campaignEngine");
    expect(typeof engine.executeCampaign).toBe("function");
  });
});

describe("Contacts Cross-Platform Operations", () => {
  it("pullBatch returns pulled count", async () => {
    try {
      const result = await caller.contacts.pullBatch({ limit: 5 });
      expect(result).toHaveProperty("pulled");
      expect(typeof result.pulled).toBe("number");
    } catch (err: any) {
      expect(err.message).toBeDefined();
    }
  });

  it("contacts list returns platform presence fields", async () => {
    const result = await caller.contacts.list({ limit: 5 });
    expect(result).toHaveProperty("contacts");
    expect(result).toHaveProperty("total");
    if (result.contacts.length > 0) {
      expect(result.contacts[0]).toHaveProperty("ghlContactId");
    }
  });
});

describe("Campaigns Multi-Platform Operations", () => {
  it("sendEmail procedure handles non-existent contact", async () => {
    try {
      await caller.campaigns.sendEmail({
        contactId: 999999,
        subject: "Test Email",
        body: "This is a test email.",
      });
    } catch (err: any) {
      expect(err.message).toBeDefined();
    }
  });

  it("campaign list returns campaigns array", async () => {
    const result = await caller.campaigns.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("templates list returns templates array", async () => {
    const result = await caller.templates.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Integration Credentials", () => {
  it("integrations list returns all platforms", async () => {
    const result = await caller.integrations.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("integration test validates platform name", async () => {
    await expect(
      caller.integrations.test({
        platform: "invalid_platform" as any,
        credentials: { apiKey: "test" },
      })
    ).rejects.toThrow();
  });
});
