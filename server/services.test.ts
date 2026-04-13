import { describe, expect, it, vi, beforeEach } from "vitest";
import * as ghl from "./services/ghl";
import * as campaignEngine from "./services/campaignEngine";
import * as dripify from "./services/dripify";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── GHL JWT Utilities ─────────────────────────────────────────────────────
describe("GHL JWT Utilities", () => {
  // Create a valid JWT with known payload
  function makeJwt(payload: Record<string, any>): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${header}.${body}.fake-signature`;
  }

  it("decodes a valid JWT payload", () => {
    const jwt = makeJwt({ sub: "user123", locationId: "loc-abc", exp: 9999999999 });
    const decoded = ghl.decodeJwt(jwt);
    expect(decoded.sub).toBe("user123");
    expect(decoded.locationId).toBe("loc-abc");
    expect(decoded.exp).toBe(9999999999);
  });

  it("returns empty object for malformed JWT", () => {
    expect(ghl.decodeJwt("not-a-jwt")).toEqual({});
    expect(ghl.decodeJwt("")).toEqual({});
    expect(ghl.decodeJwt("a.b")).toEqual({});
  });

  it("extracts expiry from JWT", () => {
    const jwt = makeJwt({ exp: 1700000000 });
    expect(ghl.getJwtExpiry(jwt)).toBe(1700000000);
  });

  it("returns 0 expiry for JWT without exp", () => {
    const jwt = makeJwt({ sub: "test" });
    expect(ghl.getJwtExpiry(jwt)).toBe(0);
  });

  it("calculates remaining minutes correctly for future token", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600; // 60 minutes from now
    const jwt = makeJwt({ exp: futureExp });
    const remaining = ghl.getJwtRemainingMinutes(jwt);
    expect(remaining).toBeGreaterThan(55);
    expect(remaining).toBeLessThanOrEqual(60);
  });

  it("returns 0 remaining minutes for expired token", () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600; // 60 minutes ago
    const jwt = makeJwt({ exp: pastExp });
    expect(ghl.getJwtRemainingMinutes(jwt)).toBe(0);
  });

  it("extracts locationId from JWT", () => {
    const jwt = makeJwt({ locationId: "loc-xyz" });
    expect(ghl.extractLocationFromJwt(jwt)).toBe("loc-xyz");
  });

  it("extracts location_id (underscore variant) from JWT", () => {
    const jwt = makeJwt({ location_id: "loc-alt" });
    expect(ghl.extractLocationFromJwt(jwt)).toBe("loc-alt");
  });

  it("returns null when no locationId in JWT", () => {
    const jwt = makeJwt({ sub: "test" });
    expect(ghl.extractLocationFromJwt(jwt)).toBeNull();
  });

  it("extracts companyId from JWT", () => {
    const jwt = makeJwt({ companyId: "comp-123" });
    expect(ghl.extractCompanyFromJwt(jwt)).toBe("comp-123");
  });

  it("extracts company_id (underscore variant) from JWT", () => {
    const jwt = makeJwt({ company_id: "comp-alt" });
    expect(ghl.extractCompanyFromJwt(jwt)).toBe("comp-alt");
  });

  it("returns null when no companyId in JWT", () => {
    const jwt = makeJwt({ sub: "test" });
    expect(ghl.extractCompanyFromJwt(jwt)).toBeNull();
  });
});

// ─── GHL Phone Formatting ──────────────────────────────────────────────────
describe("GHL Phone Formatting", () => {
  it("formats 10-digit US phone number", () => {
    expect(ghl.formatPhone("5551234567")).toBe("+15551234567");
  });

  it("formats 11-digit US phone number starting with 1", () => {
    expect(ghl.formatPhone("15551234567")).toBe("+15551234567");
  });

  it("preserves phone numbers already starting with +", () => {
    expect(ghl.formatPhone("+15551234567")).toBe("+15551234567");
    expect(ghl.formatPhone("+447911123456")).toBe("+447911123456");
  });

  it("strips dashes, parens, and spaces", () => {
    expect(ghl.formatPhone("(555) 123-4567")).toBe("+15551234567");
    expect(ghl.formatPhone("555-123-4567")).toBe("+15551234567");
    expect(ghl.formatPhone("555 123 4567")).toBe("+15551234567");
  });

  it("returns empty string for empty input", () => {
    expect(ghl.formatPhone("")).toBe("");
    expect(ghl.formatPhone("   ")).toBe("");
  });

  it("returns cleaned number for non-standard lengths", () => {
    expect(ghl.formatPhone("12345")).toBe("12345");
  });
});

// ─── GHL buildPayloadFromCsvRow ────────────────────────────────────────────
describe("GHL buildPayloadFromCsvRow", () => {
  it("builds a complete payload from a CSV row", () => {
    const row = {
      firstName: "John",
      lastName: "Doe",
      email: "JOHN@EXAMPLE.COM",
      phone: "(555) 123-4567",
      address1: "123 Main St",
      city: "Anytown",
      state: "CA",
      postalCode: "90210",
      companyName: "Acme Corp",
      tags: "gold,commercial",
    };
    const payload = ghl.buildPayloadFromCsvRow(row, "loc-123");
    expect(payload.locationId).toBe("loc-123");
    expect(payload.firstName).toBe("John");
    expect(payload.lastName).toBe("Doe");
    expect(payload.email).toBe("john@example.com"); // lowercased
    expect(payload.phone).toBe("+15551234567"); // formatted
    expect(payload.address1).toBe("123 Main St");
    expect(payload.city).toBe("Anytown");
    expect(payload.state).toBe("CA");
    expect(payload.postalCode).toBe("90210");
    expect(payload.companyName).toBe("Acme Corp");
    expect(payload.tags).toEqual(["gold", "commercial"]);
  });

  it("handles empty CSV row gracefully", () => {
    const row: Record<string, string> = {};
    const payload = ghl.buildPayloadFromCsvRow(row, "loc-456");
    expect(payload.locationId).toBe("loc-456");
    expect(payload.tags).toEqual([]);
    // Empty strings should be stripped
    expect(payload.firstName).toBeUndefined();
  });

  it("includes custom fields when present", () => {
    const row = {
      firstName: "Jane",
      email: "jane@test.com",
      wb_propensity_score: "85",
      wb_tier: "gold",
      wb_segment: "commercial",
    };
    const payload = ghl.buildPayloadFromCsvRow(row, "loc-789");
    expect(payload.customFields).toBeDefined();
    expect(payload.customFields!.length).toBe(3);
    expect(payload.customFields!.find(f => f.key === "wb_propensity_score")?.field_value).toBe("85");
    expect(payload.customFields!.find(f => f.key === "wb_tier")?.field_value).toBe("gold");
  });

  it("omits custom fields when all empty", () => {
    const row = { firstName: "Bob", email: "bob@test.com" };
    const payload = ghl.buildPayloadFromCsvRow(row, "loc-000");
    expect(payload.customFields).toBeUndefined();
  });

  it("trims whitespace from all fields", () => {
    const row = {
      firstName: "  Alice  ",
      lastName: "  Smith  ",
      email: "  ALICE@TEST.COM  ",
      tags: "  tag1 , tag2 , tag3  ",
    };
    const payload = ghl.buildPayloadFromCsvRow(row, "loc-trim");
    expect(payload.firstName).toBe("Alice");
    expect(payload.lastName).toBe("Smith");
    expect(payload.email).toBe("alice@test.com");
    expect(payload.tags).toEqual(["tag1", "tag2", "tag3"]);
  });
});

// ─── Campaign Engine - Template Interpolation ──────────────────────────────
describe("Campaign Engine", () => {
  it("exports executeCampaign function", () => {
    expect(typeof campaignEngine.executeCampaign).toBe("function");
  });

  // Test the module types exist
  it("accepts a valid CampaignConfig", () => {
    const config: campaignEngine.CampaignConfig = {
      channel: "email",
      subject: "Test Subject",
      body: "Hello {{firstName}}!",
      campaignName: "Test Campaign",
      contacts: [
        { id: 1, firstName: "John", lastName: "Doe", email: "john@test.com", phone: "+15551234567" },
      ],
      ghlCreds: { locationId: "loc-123", apiKey: "key-123" },
    };
    expect(config.channel).toBe("email");
    expect(config.contacts.length).toBe(1);
  });

  it("rejects campaign with no contacts", async () => {
    const config: campaignEngine.CampaignConfig = {
      channel: "email",
      subject: "Test",
      body: "Hello!",
      campaignName: "Empty Campaign",
      contacts: [],
    };
    // Should handle gracefully (0 sent, 0 failed)
    const result = await campaignEngine.executeCampaign(config);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("fails email campaign without GHL credentials", async () => {
    const config: campaignEngine.CampaignConfig = {
      channel: "email",
      subject: "Test",
      body: "Hello {{firstName}}!",
      campaignName: "No Creds Campaign",
      contacts: [
        { id: 1, firstName: "John", email: "john@test.com" },
      ],
      // No ghlCreds provided
    };
    const result = await campaignEngine.executeCampaign(config);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("fails SMS campaign without SMS-iT credentials", async () => {
    const config: campaignEngine.CampaignConfig = {
      channel: "sms",
      body: "Hello {{firstName}}!",
      campaignName: "No SMS Creds",
      contacts: [
        { id: 1, firstName: "Jane", phone: "+15559876543" },
      ],
      // No smsitCreds provided
    };
    const result = await campaignEngine.executeCampaign(config);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("fails LinkedIn campaign without Dripify credentials", async () => {
    const config: campaignEngine.CampaignConfig = {
      channel: "linkedin",
      body: "Hello {{firstName}}!",
      campaignName: "No Dripify Creds",
      contacts: [
        { id: 1, firstName: "Bob", email: "bob@test.com" },
      ],
      // No dripifyCreds provided
    };
    const result = await campaignEngine.executeCampaign(config);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ─── Dripify Webhook Processing ────────────────────────────────────────────
describe("Dripify Webhook Processing", () => {
  it("processes a webhook event", () => {
    const event = dripify.processWebhookEvent({
      type: "connection_accepted",
      lead: { email: "test@example.com" },
      campaign_id: "camp-123",
      action: "connect",
    });
    expect(event.type).toBe("connection_accepted");
    expect(event.contactEmail).toBe("test@example.com");
    expect(event.campaignId).toBe("camp-123");
    expect(event.action).toBe("connect");
  });

  it("handles missing fields gracefully", () => {
    const event = dripify.processWebhookEvent({});
    expect(event.type).toBe("unknown");
    expect(event.contactEmail).toBeUndefined();
    expect(event.campaignId).toBeUndefined();
  });
});

// ─── Integration Tests via tRPC Caller ─────────────────────────────────────

describe("Router Integration - Imports", () => {

  function createAuthContext() {
    const user = {
      id: 9999,
      openId: "owner-test-id",
      email: "owner@stewardly.com",
      name: "Test Owner",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const ctx = {
      user,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    return { ctx, user };
  }

  it("creates an import job", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.imports.create({
      fileName: "test-import.csv",
      totalRows: 100,
    });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("returns sync progress (idle when no sync running)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const progress = await caller.imports.syncProgress();
    expect(progress).toBeDefined();
    expect(progress.status).toBeDefined();
    expect(typeof progress.processed).toBe("number");
    expect(typeof progress.total).toBe("number");
  });

  it("rejects startSync without GHL credentials", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First disconnect GHL to ensure no credentials
    try {
      await caller.integrations.disconnect({ platform: "ghl" });
    } catch {}

    try {
      await caller.imports.startSync({
        importId: 1,
        rows: [{ firstName: "Test", email: "test@test.com" }],
        workerCount: 1,
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toContain("GHL credentials");
    }
  });

  it("handles token update with expired token", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create an expired JWT
    const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ exp: 1000000000 })).toString("base64url"); // way in the past
    const expiredJwt = `${header}.${body}.fake`;

    try {
      await caller.imports.updateToken({ jwt: expiredJwt });
      expect(true).toBe(false); // Should not reach here
    } catch (err: any) {
      expect(err.message).toContain("expired");
    }
  });
});

describe("Router Integration - Campaign Launch", () => {

  function createAuthContext() {
    return {
      ctx: {
        user: {
          id: 9999,
          openId: "owner-test-id",
          email: "owner@stewardly.com",
          name: "Test Owner",
          loginMethod: "manus",
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        },
        req: { protocol: "https", headers: {} } as any,
        res: { clearCookie: () => {} } as any,
      },
    };
  }

  it("rejects launch for non-existent campaign", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.campaigns.launch({
        campaignId: 99999,
        body: "Hello!",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toContain("not found");
    }
  });
});
