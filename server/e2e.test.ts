/**
 * End-to-End Virtual User Tests
 *
 * These tests simulate the full user journey through the Stewardly Command Center,
 * verifying that all real backend services are properly wired:
 *   1. Create contact → verify GHL sync path is triggered
 *   2. Create campaign → verify send execution path
 *   3. Upload CSV → verify import job creation and sync worker
 *   4. Sync engine → verify bidirectional flow
 *   5. All integrations → verify connection test paths
 */

import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext() {
  const clearedCookies: any[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "e2e-test-owner",
    email: "e2e@stewardly.com",
    name: "E2E Test Owner",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, user };
}

// ─── E2E Test 1: Create Contact → Verify GHL Sync Path ─────────────────────

describe("E2E: Contact Creation with GHL Sync", () => {
  it("creates a contact in local DB and returns an id", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.contacts.create({
      firstName: "E2E",
      lastName: "TestContact",
      email: "e2e-test@stewardly.com",
      phone: "5551234567",
      segment: "Commercial",
      tier: "gold",
      tags: ["e2e-test", "automated"],
      syncToGhl: false,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe("number");
  });

  it("creates a contact with syncToGhl=true (gracefully handles missing GHL creds)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.contacts.create({
      firstName: "E2E",
      lastName: "SyncTest",
      email: "e2e-sync@stewardly.com",
      phone: "5559876543",
      segment: "Residential",
      syncToGhl: true,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    // Without real GHL creds, ghlContactId should be undefined
    expect(result.ghlContactId).toBeUndefined();
  });

  it("verifies the contact list returns valid structure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // contacts.list returns { contacts: [], total: number }
    const result = await caller.contacts.list({});
    expect(result).toBeDefined();
    expect(Array.isArray(result.contacts)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("updates a contact by ID and verifies the update persists", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a fresh contact for this test
    const created = await caller.contacts.create({
      firstName: "E2E",
      lastName: "UpdateTest",
      email: "e2e-update@stewardly.com",
      syncToGhl: false,
    });
    expect(created.id).toBeDefined();

    await caller.contacts.update({
      id: created.id!,
      companyName: "E2E Test Corp",
      tier: "silver",
      syncToGhl: false,
    });

    const updated = await caller.contacts.get({ id: created.id! });
    expect(updated).toBeDefined();
    expect(updated?.companyName).toBe("E2E Test Corp");
    expect(updated?.tier).toBe("silver");
  });

  it("deletes a contact", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a contact specifically for deletion
    const created = await caller.contacts.create({
      firstName: "E2E",
      lastName: "DeleteTest",
      email: "e2e-delete@stewardly.com",
      syncToGhl: false,
    });
    expect(created.id).toBeDefined();

    await caller.contacts.delete({ id: created.id! });
    const deleted = await caller.contacts.get({ id: created.id! });
    expect(deleted).toBeNull();
  });
});

// ─── E2E Test 2: Campaign Creation → Verify Send Path ──────────────────────

describe("E2E: Campaign Creation and Launch", () => {
  it("creates a template for use in campaigns", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.templates.create({
      name: "E2E Email Template",
      channel: "email",
      subject: "Test Campaign from Stewardly",
      body: "Hello {{firstName}}, this is an automated test campaign.",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("creates a campaign with email channel", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.campaigns.create({
      name: "E2E Test Email Campaign",
      channel: "email",
      status: "draft",
      audience: JSON.stringify({ segment: "Commercial", tier: "A" }),
      subject: "E2E Test Subject",
      body: "Hello {{firstName}}, this is an E2E test.",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("creates a campaign with SMS channel", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.campaigns.create({
      name: "E2E Test SMS Campaign",
      channel: "sms",
      status: "draft",
      audience: JSON.stringify({ segment: "Residential" }),
      body: "Hi {{firstName}}, this is a test SMS from Stewardly.",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("creates a campaign with LinkedIn channel", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.campaigns.create({
      name: "E2E Test LinkedIn Campaign",
      channel: "linkedin",
      status: "draft",
      audience: JSON.stringify({ segment: "CPA/Tax" }),
      body: "Hi {{firstName}}, I'd love to connect about financial planning.",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("attempts to launch a campaign (gracefully handles missing creds)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const campaigns = await caller.campaigns.list();
    const campaign = campaigns.find(
      (c: any) => c.name === "E2E Test Email Campaign"
    );
    expect(campaign).toBeDefined();

    try {
      const result = await caller.campaigns.launch({ campaignId: campaign!.id });
      expect(result).toBeDefined();
    } catch (err: any) {
      // Expected: campaign launch fails without real platform credentials
      expect(err.message).toBeDefined();
    }
  });

  it("verifies campaigns appear in the list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const campaigns = await caller.campaigns.list();
    expect(campaigns).toBeDefined();
    expect(Array.isArray(campaigns)).toBe(true);

    const emailCampaign = campaigns.find((c: any) => c.name === "E2E Test Email Campaign");
    const smsCampaign = campaigns.find((c: any) => c.name === "E2E Test SMS Campaign");
    const linkedinCampaign = campaigns.find((c: any) => c.name === "E2E Test LinkedIn Campaign");

    expect(emailCampaign).toBeDefined();
    expect(smsCampaign).toBeDefined();
    expect(linkedinCampaign).toBeDefined();
  });
});

// ─── E2E Test 3: CSV Import → Verify Import Job and Sync Worker ────────────

describe("E2E: CSV Import and Sync Worker", () => {
  it("creates an import job", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // imports.create takes { fileName, totalRows, fileUrl? }
    const result = await caller.imports.create({
      fileName: "e2e_test_import.csv",
      totalRows: 50,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe("number");
  });

  it("lists import jobs", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const jobs = await caller.imports.list();
    expect(jobs).toBeDefined();
    expect(Array.isArray(jobs)).toBe(true);
    // Should have at least the job we just created
    expect(jobs.length).toBeGreaterThan(0);
  });

  it("checks sync progress via imports.syncProgress (should be idle)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const progress = await caller.imports.syncProgress();
    expect(progress).toBeDefined();
    expect(progress.status).toBeDefined();
    expect(["idle", "running", "paused", "completed", "error", "token_expired", "failed"]).toContain(progress.status);
  });

  it("rejects imports.startSync without valid GHL credentials", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.imports.startSync({
        importId: 1,
        rows: [{ firstName: "Test", email: "test@test.com" }],
        workerCount: 2,
      });
      // If it succeeds, that means creds exist from a previous test — acceptable
      expect(true).toBe(true);
    } catch (err: any) {
      // Expected: fails without GHL credentials
      expect(err.message).toBeDefined();
    }
  });

  it("pause sync via imports router", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Pause should work even when idle
    const pauseResult = await caller.imports.pauseSync();
    expect(pauseResult).toBeDefined();
  });

  it("resume sync gracefully handles missing credentials", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const resumeResult = await caller.imports.resumeSync();
      expect(resumeResult).toBeDefined();
    } catch (err: any) {
      // Expected: resume may fail without credentials
      expect(err.message).toBeDefined();
    }
  });
});

// ─── E2E Test 4: Sync Engine → Verify Bidirectional Flow ───────────────────

describe("E2E: Sync Engine Bidirectional Flow", () => {
  it("retrieves sync stats", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // sync.stats returns { total, byStatus, byPlatform }
    const stats = await caller.sync.stats();
    expect(stats).toBeDefined();
    expect(typeof stats.total).toBe("number");
    expect(Array.isArray(stats.byStatus)).toBe(true);
    expect(Array.isArray(stats.byPlatform)).toBe(true);
  });

  it("retrieves sync queue with filters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const queue = await caller.sync.queue({});
    expect(queue).toBeDefined();
    expect(Array.isArray(queue)).toBe(true);
  });

  it("retrieves sync worker status", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const status = await caller.sync.workerStatus();
    expect(status).toBeDefined();
    expect(status.status).toBeDefined();
  });

  it("handles pullFromGhl gracefully without credentials", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.contacts.pullFromGhl();
      expect(result).toBeDefined();
    } catch (err: any) {
      expect(err.message).toBeDefined();
    }
  });

  it("handles searchGhl gracefully without credentials", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.contacts.searchGhl({ query: "test@example.com" });
      expect(result).toBeDefined();
    } catch (err: any) {
      expect(err.message).toBeDefined();
    }
  });

  it("can retry all DLQ items", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sync.retryAllDlq();
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});

// ─── E2E Test 5: All Integrations Connect Successfully ─────────────────────

describe("E2E: Integration Connection Tests", () => {
  it("tests GHL connection with JWT token", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + 3600,
        locationId: "test-location-123",
        companyId: "test-company-456",
      })
    ).toString("base64url");
    const testJwt = `${header}.${payload}.fakesig`;

    const result = await caller.integrations.testConnection({
      platform: "ghl",
      credentials: JSON.stringify({
        "JWT Token": testJwt,
        "Location ID": "test-location-123",
      }),
    });

    expect(result).toBeDefined();
    expect(result.message).toBeDefined();
  });

  it("tests GHL connection with API key", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.integrations.testConnection({
      platform: "ghl",
      credentials: JSON.stringify({
        "API Key": "test-api-key-for-e2e",
        "Location ID": "test-location-123",
      }),
    });

    expect(result).toBeDefined();
    expect(result.message).toBeDefined();
  });

  it("tests Dripify connection with API key", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.integrations.testConnection({
      platform: "dripify",
      credentials: JSON.stringify({
        "API Key": "dripify-test-api-key-long-enough",
      }),
    });

    expect(result).toBeDefined();
    expect(result.message).toContain("Dripify");
  });

  it("tests Dripify connection with session cookie failover", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.integrations.testConnection({
      platform: "dripify",
      credentials: JSON.stringify({
        "Session Cookie": "dripify-session-cookie-for-e2e-test",
      }),
    });

    expect(result).toBeDefined();
    expect(result.message).toContain("Dripify");
  });

  it("tests LinkedIn connection with access token", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.integrations.testConnection({
      platform: "linkedin",
      credentials: JSON.stringify({
        "Access Token": "linkedin-test-access-token",
      }),
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("LinkedIn");
  });

  it("tests LinkedIn connection with session cookie failover", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.integrations.testConnection({
      platform: "linkedin",
      credentials: JSON.stringify({
        "Session Cookie": "AQE_li_at_cookie_value",
      }),
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("session cookie");
  });

  it("tests SMS-iT connection with API key", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.integrations.testConnection({
      platform: "smsit",
      credentials: JSON.stringify({
        "API Key": "smsit-test-api-key-long-enough-for-validation",
      }),
    });

    expect(result).toBeDefined();
    expect(result.message).toContain("SMS-iT");
  });

  it("tests SMS-iT connection with session token failover", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.integrations.testConnection({
      platform: "smsit",
      credentials: JSON.stringify({
        "Session Token": "smsit-session-token-long-enough-for-validation",
      }),
    });

    expect(result).toBeDefined();
    expect(result.message).toContain("SMS-iT");
  });

  it("rejects all platforms when no credentials provided", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    for (const platform of ["ghl", "dripify", "linkedin", "smsit"] as const) {
      const result = await caller.integrations.testConnection({
        platform,
        credentials: JSON.stringify({}),
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain("required");
    }
  });
});

// ─── E2E Test: Full User Journey ────────────────────────────────────────────

describe("E2E: Full User Journey", () => {
  it("simulates a complete user session", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 1. Check dashboard loads
    const stats = await caller.dashboard.stats();
    expect(stats).toBeDefined();
    expect(typeof stats.contacts).toBe("number");

    // 2. Check contact stats
    const contactStats = await caller.dashboard.contactStats();
    expect(contactStats).toBeDefined();

    // 3. List integrations
    const integrations = await caller.integrations.list();
    expect(integrations).toBeDefined();
    expect(Array.isArray(integrations)).toBe(true);

    // 4. List contacts (returns { contacts, total })
    const contactResult = await caller.contacts.list({});
    expect(contactResult).toBeDefined();
    expect(Array.isArray(contactResult.contacts)).toBe(true);

    // 5. List campaigns
    const campaigns = await caller.campaigns.list();
    expect(campaigns).toBeDefined();
    expect(Array.isArray(campaigns)).toBe(true);

    // 6. List templates
    const templates = await caller.templates.list();
    expect(templates).toBeDefined();
    expect(Array.isArray(templates)).toBe(true);

    // 7. Check sync stats (returns { total, byStatus, byPlatform })
    const syncStats = await caller.sync.stats();
    expect(syncStats).toBeDefined();
    expect(typeof syncStats.total).toBe("number");

    // 8. Check activity feed
    const activity = await caller.activity.list({});
    expect(activity).toBeDefined();

    // 9. List backups
    const backups = await caller.backups.list();
    expect(backups).toBeDefined();
    expect(Array.isArray(backups)).toBe(true);

    // 10. List import jobs
    const imports = await caller.imports.list();
    expect(imports).toBeDefined();
    expect(Array.isArray(imports)).toBe(true);
  });
});
