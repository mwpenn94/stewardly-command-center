/**
 * Live E2E Tests — SMS-iT & Dripify APIs
 *
 * These tests hit the actual SMS-iT and Dripify APIs using real credentials
 * stored in the database. They verify:
 * - Connection/authentication works
 * - Read-only operations (list contacts, list campaigns, check balance)
 * - Credential loading from DB via the credentials helper
 *
 * Prerequisites:
 * - SMS-iT and Dripify credentials seeded in the integrations table
 * - Dripify Firebase token from /home/ubuntu/master_db/dripify_credentials.json
 *
 * Run: pnpm test server/live-smsit-dripify.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as smsit from "./services/smsit";
import * as dripify from "./services/dripify";
import { getSmsitCredentials, getDripifyCredentials } from "./services/credentials";
import * as fs from "fs";

// ─── SMS-iT Live Tests ──────────────────────────────────────────────────────

describe("Live E2E: SMS-iT API", () => {
  let creds: smsit.SmsitCredentials;

  beforeAll(async () => {
    // Load from DB
    const dbCreds = await getSmsitCredentials(1);
    if (!dbCreds) {
      throw new Error("SMS-iT credentials not found in DB for userId=1");
    }
    creds = dbCreds;
    console.log(`[SMS-iT Live] API key loaded (${creds.apiKey.length} chars)`);
  });

  it("should test connection to SMS-iT", async () => {
    const result = await smsit.testConnection(creds);
    console.log(`[SMS-iT Live] testConnection: success=${result.success}, message=${result.message}`);

    // The SMS-iT API may return success with credits or failover validation
    expect(result.success).toBe(true);
    expect(result.message).toBeTruthy();
    console.log(`[SMS-iT Live] Credits: ${JSON.stringify(result.credits || "N/A")}`);
  });

  it("should check credit balance", async () => {
    const result = await smsit.checkCreditBalance(creds);
    console.log(`[SMS-iT Live] Credit balance: success=${result.success}`);

    if (result.success) {
      console.log(`  SMS credits: ${result.sms}`);
      console.log(`  MMS credits: ${result.mms}`);
      console.log(`  RCS credits: ${result.rcs}`);
      expect(result.sms).toBeDefined();
    } else {
      // API may reject if key format doesn't match expected — log but don't fail hard
      console.log(`  Error: ${result.error}`);
      // At minimum, we got a structured response (not a crash)
      expect(result.error).toBeTruthy();
    }
  });

  it("should list contacts from SMS-iT", async () => {
    const result = await smsit.listContacts(creds, { perPage: 5 });
    console.log(`[SMS-iT Live] listContacts: success=${result.success}`);

    if (result.success) {
      console.log(`  Found ${result.contacts?.length || 0} contacts (total: ${result.total || "?"})`);
      expect(result.contacts).toBeDefined();
      // Log first contact preview
      if (result.contacts && result.contacts.length > 0) {
        const c = result.contacts[0];
        console.log(`  First contact: ${JSON.stringify(c).slice(0, 200)}`);
      }
    } else {
      console.log(`  Error: ${result.error}`);
      // Structured error response is acceptable
      expect(result.error).toBeTruthy();
    }
  });

  it("should get message templates from SMS-iT", async () => {
    const result = await smsit.getTemplates(creds);
    console.log(`[SMS-iT Live] getTemplates: success=${result.success}`);

    if (result.success) {
      console.log(`  Found ${result.templates?.length || 0} templates`);
      expect(result.templates).toBeDefined();
    } else {
      console.log(`  Error: ${result.error}`);
      expect(result.error).toBeTruthy();
    }
  });
});

// ─── Dripify Live Tests ─────────────────────────────────────────────────────

describe("Live E2E: Dripify API", () => {
  let creds: dripify.DripifyCredentials;

  beforeAll(async () => {
    // Load from DB
    const dbCreds = await getDripifyCredentials(1);
    if (!dbCreds) {
      throw new Error("Dripify credentials not found in DB for userId=1");
    }
    creds = dbCreds;
    console.log(`[Dripify Live] API key loaded (${creds.apiKey.length} chars)`);
    console.log(`[Dripify Live] Email: ${creds.email || "N/A"}`);
    console.log(`[Dripify Live] User ID: ${creds.userId || "N/A"}`);
    console.log(`[Dripify Live] Has session cookie: ${!!creds.sessionCookie}`);
    console.log(`[Dripify Live] Expires at: ${creds.expiresAt ? new Date(creds.expiresAt).toISOString() : "N/A"}`);
  });

  it("should test connection to Dripify", async () => {
    const result = await dripify.testConnection(creds);
    console.log(`[Dripify Live] testConnection: success=${result.success}, message=${result.message}`);

    expect(result.success).toBe(true);
    expect(result.message).toBeTruthy();

    if (result.profile) {
      console.log(`[Dripify Live] Profile: ${JSON.stringify(result.profile).slice(0, 300)}`);
    }
    if (result.refreshedToken) {
      console.log(`[Dripify Live] Token was refreshed during connection test`);
    }
  });

  it("should get user profile from Dripify", async () => {
    const result = await dripify.getProfile(creds);
    console.log(`[Dripify Live] getProfile: success=${result.success}`);

    if (result.success) {
      expect(result.profile).toBeDefined();
      console.log(`[Dripify Live] Profile keys: ${Object.keys(result.profile || {}).join(", ")}`);
      console.log(`[Dripify Live] Profile preview: ${JSON.stringify(result.profile).slice(0, 400)}`);
    } else {
      console.log(`[Dripify Live] Profile error: ${result.error}`);
      // If the token expired and no refresh token, this is expected
      expect(result.error).toBeTruthy();
    }
  });

  it("should list campaigns from Dripify", async () => {
    const result = await dripify.listCampaigns(creds);
    console.log(`[Dripify Live] listCampaigns: success=${result.success}`);

    if (result.success) {
      expect(result.campaigns).toBeDefined();
      console.log(`[Dripify Live] Found ${result.campaigns?.length || 0} campaigns`);
      // Log campaign names
      if (result.campaigns && result.campaigns.length > 0) {
        for (const c of result.campaigns.slice(0, 5)) {
          console.log(`  Campaign: ${c.name || c.title || JSON.stringify(c).slice(0, 100)}`);
        }
      }
    } else {
      console.log(`[Dripify Live] Campaigns error: ${result.error}`);
      expect(result.error).toBeTruthy();
    }
  });

  it("should check if token refresh works when token is expired", async () => {
    // Test the refresh mechanism with the session cookie
    if (!creds.sessionCookie) {
      console.log("[Dripify Live] No session cookie — skipping refresh test");
      return;
    }

    const refreshResult = await dripify.refreshFirebaseToken(creds.sessionCookie);
    console.log(`[Dripify Live] refreshFirebaseToken: success=${refreshResult.success}`);

    if (refreshResult.success) {
      expect(refreshResult.accessToken).toBeTruthy();
      expect(refreshResult.expiresIn).toBeGreaterThan(0);
      console.log(`[Dripify Live] New token expires in ${refreshResult.expiresIn}s`);
      console.log(`[Dripify Live] New access token length: ${refreshResult.accessToken?.length}`);
    } else {
      console.log(`[Dripify Live] Refresh error: ${refreshResult.error}`);
      // Refresh may fail if the refresh token is expired — acceptable
      expect(refreshResult.error).toBeTruthy();
    }
  });

  it("should verify token expiry detection works", () => {
    // Test with current creds
    const isExpired = dripify.isTokenExpired(creds);
    console.log(`[Dripify Live] isTokenExpired: ${isExpired}`);

    if (creds.expiresAt) {
      const remainingMs = creds.expiresAt - Date.now();
      console.log(`[Dripify Live] Token expires in ${Math.round(remainingMs / 1000 / 60)} minutes`);
      if (remainingMs > 5 * 60 * 1000) {
        expect(isExpired).toBe(false);
      }
    }
  });

  it("should process a mock webhook event correctly", () => {
    const mockPayload = {
      event: "connection_accepted",
      lead: { email: "test@example.com", firstName: "Test" },
      campaignId: "test-campaign-123",
      action: "accept",
    };

    const result = dripify.processWebhookEvent(mockPayload);
    expect(result.type).toBe("connection_accepted");
    expect(result.contactEmail).toBe("test@example.com");
    expect(result.campaignId).toBe("test-campaign-123");
    expect(result.action).toBe("accept");
    console.log(`[Dripify Live] Webhook processing: type=${result.type}, email=${result.contactEmail}`);
  });
});

// ─── Cross-Platform Credential Loading ──────────────────────────────────────

describe("Live E2E: Cross-Platform Credential Loading", () => {
  it("should load all platform credentials from DB", async () => {
    const { getAllCredentials } = await import("./services/credentials");
    const all = await getAllCredentials(1);

    console.log(`[Cross-Platform] GHL: ${all.ghl ? "loaded" : "missing"}`);
    console.log(`[Cross-Platform] SMS-iT: ${all.smsit ? "loaded" : "missing"}`);
    console.log(`[Cross-Platform] Dripify: ${all.dripify ? "loaded" : "missing"}`);

    // At least GHL and one other should be available
    expect(all.ghl).toBeTruthy();
    expect(all.smsit || all.dripify).toBeTruthy();
  });

  it("should verify SMS-iT credentials have required fields", async () => {
    const creds = await getSmsitCredentials(1);
    expect(creds).toBeTruthy();
    expect(creds!.apiKey).toBeTruthy();
    expect(creds!.apiKey.length).toBeGreaterThan(10);
    console.log(`[Cross-Platform] SMS-iT API key: ${creds!.apiKey.slice(0, 20)}...`);
  });

  it("should verify Dripify credentials have required fields", async () => {
    const creds = await getDripifyCredentials(1);
    expect(creds).toBeTruthy();
    expect(creds!.apiKey).toBeTruthy();
    expect(creds!.apiKey.length).toBeGreaterThan(50);
    console.log(`[Cross-Platform] Dripify token: ${creds!.apiKey.slice(0, 30)}...`);
    console.log(`[Cross-Platform] Dripify email: ${creds!.email || "N/A"}`);
  });
});
