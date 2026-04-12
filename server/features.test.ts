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

describe("Integrations", () => {
  it("lists integrations", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("upserts an integration", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.integrations.upsert({
      platform: "ghl",
      label: "GoHighLevel",
      credentials: JSON.stringify({ "API Key": "test-key" }),
      status: "connected",
    });
    expect(result).toBeDefined();
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
