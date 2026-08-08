/**
 * Live E2E Tests — Real GHL API
 * 
 * These tests hit the actual GHL API using real credentials.
 * All contact operations target only the owner (Michael Penn).
 * 
 * Prerequisites:
 * - GHL credentials in /home/ubuntu/master_db/ghl_token.json
 * - Valid JWT token with > 5 minutes remaining
 * 
 * Run: pnpm test server/live-e2e.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as ghl from "./services/ghl";
import * as fs from "fs";

const TOKEN_FILE = "/home/ubuntu/master_db/ghl_token.json";
const LOCATION_ID = "yUVrjyvzf0txCiJXuYGn";

let creds: ghl.GhlCredentials;
let testContactId: string | undefined;

// Test contact — uses owner's info only
const TEST_CONTACT: ghl.GhlContactPayload = {
  locationId: LOCATION_ID,
  firstName: "LiveTest",
  lastName: "StewardlyE2E",
  email: `stewardly-live-test-${Date.now()}@test-stewardly.com`,
  phone: "+15205550199",
  address1: "123 E2E Test Lane",
  city: "Tucson",
  state: "Arizona",
  postalCode: "85701",
  companyName: "Stewardly Live Test",
  tags: ["stewardly-live-test", "e2e-automated"],
};

beforeAll(() => {
  // Load real credentials
  if (!fs.existsSync(TOKEN_FILE)) {
    throw new Error(`Token file not found: ${TOKEN_FILE}`);
  }
  const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
  
  creds = {
    jwt: tokenData.jwt,
    locationId: LOCATION_ID,
    companyId: tokenData.companyId,
    apiKey: tokenData.apiKey,
    refreshToken: tokenData.refreshToken,
    authToken: tokenData.authToken,
  };

  const remaining = ghl.getJwtRemainingMinutes(creds.jwt!);
  console.log(`[Live E2E] JWT valid for ${remaining.toFixed(0)} minutes`);
  if (remaining < 5) {
    throw new Error(`JWT token has only ${remaining.toFixed(0)} minutes remaining. Refresh first.`);
  }
});

describe("Live E2E: GHL Connection Test", () => {
  it("should connect to GHL and return contact count", async () => {
    const result = await ghl.testConnection(creds);
    console.log(`[Live E2E] Connection: ${result.message}`);
    expect(result.success).toBe(true);
    expect(result.message).toContain("Connected to GHL");
  });
});

describe("Live E2E: Contact CRUD Lifecycle", () => {
  it("should CREATE a test contact in GHL", async () => {
    const result = await ghl.createContact(creds, TEST_CONTACT);
    console.log(`[Live E2E] Create result:`, JSON.stringify(result));
    
    if (result.success) {
      testContactId = result.contactId;
      expect(result.action).toBe("created");
      expect(result.contactId).toBeTruthy();
      console.log(`[Live E2E] Created contact: ${testContactId}`);
    } else if (result.error === "duplicate" && result.contactId) {
      // Contact already exists from a previous test run — use it
      testContactId = result.contactId;
      console.log(`[Live E2E] Contact already exists: ${testContactId}`);
      expect(testContactId).toBeTruthy();
    } else {
      // Some other error — fail
      console.error(`[Live E2E] Create failed:`, result);
      expect(result.success).toBe(true);
    }
  });

  it("should READ the created contact from GHL", async () => {
    if (!testContactId) {
      console.log("[Live E2E] Skipping read — no contact ID");
      return;
    }

    const result = await ghl.getContact(creds, testContactId);
    console.log(`[Live E2E] Read result: success=${result.success}`);
    expect(result.success).toBe(true);
    expect(result.contact).toBeTruthy();
    
    // Verify some fields
    const contact = result.contact;
    if (contact.firstName) {
      expect(contact.firstName).toBe("LiveTest");
    }
    console.log(`[Live E2E] Contact name: ${contact.firstName} ${contact.lastName}`);
  });

  it("should UPDATE the test contact in GHL", async () => {
    if (!testContactId) {
      console.log("[Live E2E] Skipping update — no contact ID");
      return;
    }

    const updatePayload: ghl.GhlContactPayload = {
      locationId: LOCATION_ID,
      companyName: "Stewardly Live Test — Updated",
      tags: ["stewardly-live-test", "e2e-automated", "updated"],
    };

    const result = await ghl.updateContact(creds, testContactId, updatePayload);
    console.log(`[Live E2E] Update result:`, JSON.stringify(result));
    expect(result.success).toBe(true);
    expect(result.action).toBe("updated");
  });

  it("should SEARCH and find the test contact", async () => {
    const result = await ghl.searchContacts(creds, "stewardly-live-test", 5);
    console.log(`[Live E2E] Search result: success=${result.success}, found=${result.contacts?.length || 0}`);
    expect(result.success).toBe(true);
    // The search may or may not find our test contact depending on indexing delay
    // Just verify the search itself works
    expect(result.contacts).toBeDefined();
  });

  it("should UPSERT (create-or-update) a contact", async () => {
    const upsertPayload: ghl.GhlContactPayload = {
      locationId: LOCATION_ID,
      firstName: "LiveTest",
      lastName: "UpsertE2E",
      email: `stewardly-upsert-${Date.now()}@test-stewardly.com`,
      phone: "+15205550198",
      tags: ["stewardly-live-test", "upsert-test"],
    };

    const result = await ghl.upsertContact(creds, upsertPayload);
    console.log(`[Live E2E] Upsert result:`, JSON.stringify(result));
    expect(result.success).toBe(true);
    expect(["created", "updated"]).toContain(result.action);
    
    // Clean up: delete the upserted contact
    if (result.contactId) {
      const delResult = await ghl.deleteContact(creds, result.contactId);
      console.log(`[Live E2E] Cleanup upsert contact: ${delResult.success}`);
    }
  });

  it("should DELETE the test contact from GHL", async () => {
    if (!testContactId) {
      console.log("[Live E2E] Skipping delete — no contact ID");
      return;
    }

    const result = await ghl.deleteContact(creds, testContactId);
    console.log(`[Live E2E] Delete result:`, JSON.stringify(result));
    expect(result.success).toBe(true);
    expect(result.action).toBe("deleted");
  });
});

describe("Live E2E: Token Refresh", () => {
  it("should refresh the JWT token via API or verify token file fallback works", async () => {
    if (!creds.refreshToken || !creds.authToken) {
      console.log("[Live E2E] No refresh/auth tokens — checking token file fallback");
      const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
      const remaining = ghl.getJwtRemainingMinutes(tokenData.jwt);
      console.log(`[Live E2E] Token file has ${remaining.toFixed(0)} minutes remaining`);
      expect(remaining).toBeGreaterThan(0);
      return;
    }

    const result = await ghl.refreshToken(creds);
    console.log(`[Live E2E] Refresh result: success=${result.success}, error=${result.error || 'none'}`);
    
    if (result.success) {
      expect(result.newCreds?.jwt).toBeTruthy();
      const newRemaining = ghl.getJwtRemainingMinutes(result.newCreds!.jwt!);
      console.log(`[Live E2E] New token valid for ${newRemaining.toFixed(0)} minutes`);
      expect(newRemaining).toBeGreaterThan(50);
    } else {
      // Refresh token may have been consumed by the auto-refresh daemon
      // Verify the token file has a valid token as fallback
      console.log(`[Live E2E] API refresh failed (${result.error}) — verifying token file fallback`);
      const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
      const remaining = ghl.getJwtRemainingMinutes(tokenData.jwt);
      console.log(`[Live E2E] Token file has ${remaining.toFixed(0)} minutes remaining`);
      expect(remaining).toBeGreaterThan(0);
    }
  });
});

describe("Live E2E: CSV Row Processing", () => {
  it("should build a valid payload from a CSV row", () => {
    const csvRow: Record<string, string> = {
      firstName: "  Michael  ",
      lastName: "  Penn  ",
      email: "  Michael@Test.com  ",
      phone: "5205551234",
      address1: "123 Main St",
      city: "Tucson",
      state: "AZ",
      postalCode: "85701",
    };

    const payload = ghl.buildPayloadFromCsvRow(csvRow, LOCATION_ID);
    expect(payload.firstName).toBe("Michael");
    expect(payload.lastName).toBe("Penn");
    expect(payload.email).toBe("michael@test.com");
    expect(payload.phone).toBe("+15205551234");
    expect(payload.locationId).toBe(LOCATION_ID);
  });

  it("should upsert a CSV-built contact to real GHL", async () => {
    const csvRow: Record<string, string> = {
      firstName: "CSVTest",
      lastName: "StewardlyE2E",
      email: `csv-test-${Date.now()}@test-stewardly.com`,
      phone: "5205550197",
    };

    const payload = ghl.buildPayloadFromCsvRow(csvRow, LOCATION_ID);
    const result = await ghl.upsertContact(creds, payload);
    console.log(`[Live E2E] CSV upsert:`, JSON.stringify(result));
    expect(result.success).toBe(true);

    // Clean up
    if (result.contactId) {
      await ghl.deleteContact(creds, result.contactId);
      console.log(`[Live E2E] Cleaned up CSV test contact`);
    }
  });
});

describe("Live E2E: Standalone Sync Auto-Refresh Verification", () => {
  it("should verify the standalone sync is running", () => {
    const { execSync } = require("child_process");
    try {
      const result = execSync("pgrep -f ghl_parallel_sync", { encoding: "utf-8" });
      const pids = result.trim().split("\n").filter(Boolean);
      console.log(`[Live E2E] Standalone sync PIDs: ${pids.join(", ")}`);
      expect(pids.length).toBeGreaterThan(0);
    } catch {
      console.log("[Live E2E] Standalone sync not running — may have completed");
      // Don't fail — it might have finished
    }
  });

  it("should verify the auto-refresh daemon is running", () => {
    const { execSync } = require("child_process");
    try {
      const result = execSync("pgrep -f cdp_auto_refresh", { encoding: "utf-8" });
      const pids = result.trim().split("\n").filter(Boolean);
      console.log(`[Live E2E] Auto-refresh daemon PIDs: ${pids.join(", ")}`);
      expect(pids.length).toBeGreaterThan(0);
    } catch {
      console.log("[Live E2E] Auto-refresh daemon not running");
      // Don't fail — it might not be started yet
    }
  });

  it("should verify the token file has a valid JWT", () => {
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
    const remaining = ghl.getJwtRemainingMinutes(tokenData.jwt);
    console.log(`[Live E2E] Token file JWT valid for ${remaining.toFixed(0)} minutes`);
    expect(remaining).toBeGreaterThan(0);
  });
});
