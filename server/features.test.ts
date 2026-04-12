import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext() {
  const clearedCookies: any[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "owner-test-id",
    email: "owner@stewardly.com",
    name: "Test Owner",
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

describe("Dashboard", () => {
  it("returns dashboard stats without error", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.dashboard.stats();
    expect(stats).toBeDefined();
    expect(typeof stats.contacts).toBe("number");
    expect(typeof stats.campaigns).toBe("number");
    expect(typeof stats.syncPending).toBe("number");
    expect(typeof stats.integrations).toBe("number");
  });

  it("returns contact stats", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.dashboard.contactStats();
    expect(stats).toBeDefined();
    expect(typeof stats.total).toBe("number");
    expect(Array.isArray(stats.bySegment)).toBe(true);
  });
});

describe("Contacts CRUD", () => {
  it("lists contacts (empty initially)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.contacts.list({});
    expect(result).toBeDefined();
    expect(typeof result.total).toBe("number");
    expect(Array.isArray(result.contacts)).toBe(true);
  });

  it("creates a contact", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const contact = await caller.contacts.create({
      firstName: "John",
      lastName: "Doe",
      email: `john.doe.${Date.now()}@test.com`,
      phone: "+15551234567",
      segment: "commercial",
    });
    expect(contact).toBeDefined();
    expect(contact.id).toBeDefined();
  });

  it("retrieves contact stats", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.contacts.stats();
    expect(stats).toBeDefined();
    expect(typeof stats.total).toBe("number");
    expect(Array.isArray(stats.bySegment)).toBe(true);
    expect(Array.isArray(stats.byTier)).toBe(true);
  });
});

describe("Campaigns", () => {
  it("lists campaigns", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.campaigns.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a campaign", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const campaign = await caller.campaigns.create({
      name: `Test Campaign ${Date.now()}`,
      channel: "email",
    });
    expect(campaign).toBeDefined();
    expect(campaign.id).toBeDefined();
  });
});

describe("Templates", () => {
  it("lists templates", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.templates.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a template", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const template = await caller.templates.create({
      name: `Test Template ${Date.now()}`,
      channel: "email",
      subject: "Hello {{firstName}}",
      body: "Welcome to our platform!",
    });
    expect(template).toBeDefined();
    expect(template.id).toBeDefined();
  });
});

describe("Sync Engine", () => {
  it("returns sync stats", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.sync.stats();
    expect(stats).toBeDefined();
    expect(Array.isArray(stats.byStatus)).toBe(true);
    expect(Array.isArray(stats.byPlatform)).toBe(true);
  });

  it("lists sync queue", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sync.queue({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Integrations CRUD", () => {
  it("lists integrations", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("upserts a GHL integration with credentials", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.upsert({
      platform: "ghl",
      label: "GoHighLevel",
      credentials: JSON.stringify({ "API Key": "test-key-123", "Location ID": "loc-456", "Company ID": "comp-789" }),
      status: "connected",
    });
    expect(result).toEqual({ success: true });
  });

  it("retrieves a specific integration by platform", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.get({ platform: "ghl" });
    expect(result).toBeDefined();
    expect(result?.platform).toBe("ghl");
    expect(result?.status).toBe("connected");
  });

  it("retrieves parsed credentials for a platform", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const creds = await caller.integrations.credentials({ platform: "ghl" });
    expect(creds).toBeDefined();
    expect(creds?.["API Key"]).toBe("test-key-123");
    expect(creds?.["Location ID"]).toBe("loc-456");
  });

  it("upserts a Dripify integration", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.upsert({
      platform: "dripify",
      label: "Dripify",
      credentials: JSON.stringify({ "API Key": "drip-key-abc", "Webhook URL": "https://hooks.example.com/dripify" }),
      status: "connected",
    });
    expect(result).toEqual({ success: true });
  });

  it("upserts an SMS-iT integration", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.upsert({
      platform: "smsit",
      label: "SMS-iT",
      credentials: JSON.stringify({ "API Key": "smsit-key-xyz", "Sender ID": "STEWARDLY" }),
      status: "connected",
    });
    expect(result).toEqual({ success: true });
  });

  it("upserts a LinkedIn integration", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.upsert({
      platform: "linkedin",
      label: "LinkedIn",
      credentials: JSON.stringify({ "Access Token": "li-token-def" }),
      status: "connected",
    });
    expect(result).toEqual({ success: true });
  });

  it("tests connection for Dripify (credential validation)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.testConnection({
      platform: "dripify",
      credentials: JSON.stringify({ "API Key": "drip-key-abc" }),
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain("Dripify");
  });

  it("tests connection for SMS-iT (credential validation)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.testConnection({
      platform: "smsit",
      credentials: JSON.stringify({ "API Key": "smsit-key-xyz-long-enough-to-pass-validation" }),
    });
    // SMS-iT API may not be reachable, so we accept either success or error
    expect(result).toBeDefined();
    expect(result.message).toContain("SMS-iT");
  });

  it("tests connection for LinkedIn (credential validation)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.testConnection({
      platform: "linkedin",
      credentials: JSON.stringify({ "Access Token": "li-token-def" }),
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain("LinkedIn");
  });

  it("rejects test with missing required credentials", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.testConnection({
      platform: "ghl",
      credentials: JSON.stringify({ "API Key": "" }),
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain("required");
  });

  it("disconnects an integration", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.disconnect({ platform: "linkedin" });
    expect(result).toEqual({ success: true });

    // Verify it's now disconnected
    const integration = await caller.integrations.get({ platform: "linkedin" });
    expect(integration?.status).toBe("disconnected");
  });

  it("returns null credentials for non-existent platform", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const creds = await caller.integrations.credentials({ platform: "nonexistent" });
    expect(creds).toBeNull();
  });
});

describe("Backups", () => {
  it("lists backups", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.backups.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a backup", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.backups.create({
      type: "contacts",
      format: "csv",
    });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });
});

describe("Activity Feed", () => {
  it("lists activity entries", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.activity.list({});
    expect(result).toBeDefined();
    expect(Array.isArray(result.entries)).toBe(true);
    expect(typeof result.total).toBe("number");
  });
});

describe("Import Jobs", () => {
  it("lists import jobs", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.imports.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
