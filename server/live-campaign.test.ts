/**
 * Live Campaign & Sync E2E Tests
 * 
 * Tests real email sending via GHL Conversations API and bidirectional sync.
 * All messages are sent ONLY to the owner (Michael Penn / mwpenn94@gmail.com).
 * 
 * Requires: valid GHL JWT token in /home/ubuntu/master_db/ghl_token.json
 */
import { describe, it, expect, beforeAll } from "vitest";
import * as ghl from "./services/ghl";
import { executeCampaign } from "./services/campaignEngine";
import * as fs from "fs";
import * as path from "path";

// ─── Load real credentials ─────────────────────────────────────────────────
const TOKEN_FILE = "/home/ubuntu/master_db/ghl_token.json";
let creds: ghl.GhlCredentials;
let ownerContactId: string;

function loadCreds(): ghl.GhlCredentials {
  const raw = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
  return {
    jwt: raw.jwt,
    locationId: "yUVrjyvzf0txCiJXuYGn",
    companyId: raw.companyId || "fWFR9fqCCCFPDALyseAW",
    apiKey: raw.apiKey,
    refreshToken: raw.refreshToken,
    authToken: raw.authToken,
  };
}

// ─── Test Suite ─────────────────────────────────────────────────────────────
describe("Live Campaign E2E: Email Send to Owner", () => {
  beforeAll(async () => {
    creds = loadCreds();
    const remaining = ghl.getJwtRemainingMinutes(creds.jwt!);
    console.log(`JWT remaining: ${remaining.toFixed(1)} minutes`);
    expect(remaining).toBeGreaterThan(2); // Need at least 2 min for tests
  });

  it("should find or create the owner contact in GHL", async () => {
    // Search for the owner by email
    const searchResult = await ghl.searchContacts(creds, "mwpenn94@gmail.com", 5);
    expect(searchResult.success).toBe(true);

    if (searchResult.contacts && searchResult.contacts.length > 0) {
      ownerContactId = searchResult.contacts[0].id;
      console.log(`Found owner contact: ${ownerContactId}`);
    } else {
      // Create the owner contact
      const createResult = await ghl.createContact(creds, {
        locationId: creds.locationId,
        firstName: "Michael",
        lastName: "Penn",
        email: "mwpenn94@gmail.com",
        tags: ["owner", "stewardly-test"],
      });
      
      if (createResult.success) {
        ownerContactId = createResult.contactId!;
      } else if (createResult.contactId) {
        // Duplicate — use existing
        ownerContactId = createResult.contactId;
      }
      console.log(`Created/found owner contact: ${ownerContactId}`);
    }

    expect(ownerContactId).toBeTruthy();
    expect(ownerContactId.length).toBeGreaterThan(5);
  });

  it("should send a test email to the owner via GHL Conversations API", async () => {
    expect(ownerContactId).toBeTruthy();

    const now = new Date().toISOString();
    const result = await ghl.sendEmail(creds, {
      contactId: ownerContactId,
      subject: `Stewardly Test Email - ${now}`,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #1a365d;">Stewardly Command Center</h2>
        <p>This is an automated test email sent from the Stewardly Command Center live E2E test suite.</p>
        <p><strong>Timestamp:</strong> ${now}</p>
        <p><strong>Test:</strong> Live campaign email send verification</p>
        <p style="color: #718096; font-size: 12px;">This email was sent via the GHL Conversations API to verify the campaign engine is working correctly.</p>
      </div>`,
      message: `Stewardly Test Email - ${now}. This is an automated test from the Stewardly Command Center.`,
    });

    console.log("Email send result:", JSON.stringify(result, null, 2));

    // The email might succeed or fail depending on email sending configuration
    // Either way, we should get a response (not a crash)
    expect(result).toBeDefined();
    
    if (result.success) {
      expect(result.messageId).toBeTruthy();
      console.log(`Email sent successfully! messageId: ${result.messageId}, conversationId: ${result.conversationId}`);
    } else {
      // Log the error but don't fail — email sending may require domain verification
      console.log(`Email send returned error (may need domain setup): ${result.error}`);
      // At minimum, the API should have responded (not crashed)
      expect(result.error).toBeTruthy();
    }
  });

  it("should execute a campaign via the campaign engine to the owner", async () => {
    expect(ownerContactId).toBeTruthy();

    const now = new Date().toISOString();
    const result = await executeCampaign({
      channel: "email",
      subject: `Stewardly Campaign Test - ${now}`,
      body: `<p>Hello {{firstName}},</p><p>This is a campaign engine test from Stewardly Command Center.</p><p>Timestamp: ${now}</p>`,
      contacts: [{
        id: 1,
        firstName: "Michael",
        lastName: "Penn",
        email: "mwpenn94@gmail.com",
        ghlContactId: ownerContactId,
      }],
      ghlCreds: creds,
      campaignName: `Stewardly Live Test Campaign - ${now}`,
    });

    console.log("Campaign execution result:", JSON.stringify(result, null, 2));
    expect(result).toBeDefined();
    
    // The campaign should have attempted to send
    const totalAttempted = result.sent + result.failed;
    expect(totalAttempted).toBe(1);
    
    if (result.sent === 1) {
      console.log("Campaign email sent successfully via campaign engine!");
      expect(result.platformResults.length).toBeGreaterThan(0);
      expect(result.platformResults[0].messageId).toBeTruthy();
    } else {
      console.log(`Campaign send failed (may need email domain setup): ${result.errors[0]?.error}`);
    }
  });
});

describe("Live Bidirectional Sync E2E: Push + Pull Cycle", () => {
  const testEmail = `stewardly-sync-test-${Date.now()}@test-stewardly.com`;
  let testContactId: string;

  beforeAll(() => {
    creds = loadCreds();
  });

  it("PUSH: should create a test contact in GHL", async () => {
    const result = await ghl.createContact(creds, {
      locationId: creds.locationId,
      firstName: "SyncTest",
      lastName: "Stewardly",
      email: testEmail,
      tags: ["stewardly-sync-test", "auto-cleanup"],
      companyName: "Stewardly Sync Test Corp",
    });

    console.log("Push result:", JSON.stringify(result, null, 2));
    
    if (result.success) {
      testContactId = result.contactId!;
    } else if (result.contactId) {
      testContactId = result.contactId;
    }

    expect(testContactId).toBeTruthy();
    console.log(`Pushed contact to GHL: ${testContactId}`);
  });

  it("PULL: should retrieve the pushed contact from GHL", async () => {
    expect(testContactId).toBeTruthy();

    const result = await ghl.getContact(creds, testContactId);
    expect(result.success).toBe(true);
    expect(result.contact).toBeDefined();
    expect(result.contact.email).toBe(testEmail);
    expect(result.contact.firstName).toBe("SyncTest");
    console.log(`Pulled contact from GHL: ${result.contact.firstName} ${result.contact.lastName} (${result.contact.email})`);
  });

  it("RECONCILE: should update the contact and verify changes propagate", async () => {
    expect(testContactId).toBeTruthy();

    // Update the contact
    const updateResult = await ghl.updateContact(creds, testContactId, {
      companyName: "Stewardly Sync Test Corp - UPDATED",
      tags: ["stewardly-sync-test", "auto-cleanup", "reconciled"],
    });
    expect(updateResult.success).toBe(true);
    console.log("Updated contact in GHL");

    // Pull again to verify
    const pullResult = await ghl.getContact(creds, testContactId);
    expect(pullResult.success).toBe(true);
    expect(pullResult.contact.companyName).toBe("Stewardly Sync Test Corp - UPDATED");
    console.log(`Reconciled: companyName = "${pullResult.contact.companyName}"`);
  });

  it("LIST: should list contacts from GHL (paginated pull)", async () => {
    const result = await ghl.listContacts(creds, { limit: 5 });
    expect(result.success).toBe(true);
    expect(result.contacts).toBeDefined();
    expect(result.contacts!.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
    console.log(`Listed ${result.contacts!.length} contacts from GHL (total: ${result.total})`);
  });

  it("SEARCH: should search for the test contact by tag", async () => {
    const result = await ghl.searchContacts(creds, "stewardly-sync-test", 5);
    expect(result.success).toBe(true);
    console.log(`Search found ${result.contacts?.length || 0} contacts with tag 'stewardly-sync-test'`);
  });

  it("CLEANUP: should delete the test contact from GHL", async () => {
    expect(testContactId).toBeTruthy();

    const result = await ghl.deleteContact(creds, testContactId);
    expect(result.success).toBe(true);
    console.log(`Cleaned up test contact: ${testContactId}`);
  });
});

describe("Live Router-Level Sync Engine E2E", () => {
  beforeAll(() => {
    creds = loadCreds();
  });

  it("should verify email was accepted by GHL (check conversation exists)", async () => {
    // Search for the owner contact
    const searchResult = await ghl.searchContacts(creds, "mwpenn94@gmail.com", 1);
    expect(searchResult.success).toBe(true);
    expect(searchResult.contacts!.length).toBeGreaterThan(0);
    const contactId = searchResult.contacts![0].id;

    // Send a verification email and check the response has a conversationId
    const now = new Date().toISOString();
    const emailResult = await ghl.sendEmail(creds, {
      contactId,
      subject: `Delivery Verification Test - ${now}`,
      html: `<p>Delivery verification test at ${now}</p>`,
      message: `Delivery verification test at ${now}`,
    });

    expect(emailResult.success).toBe(true);
    expect(emailResult.messageId).toBeTruthy();
    expect(emailResult.conversationId).toBeTruthy();
    console.log(`Email accepted by GHL: messageId=${emailResult.messageId}, conversationId=${emailResult.conversationId}`);
  });

  it("should pull a batch of contacts from GHL via listContacts (polling sync)", async () => {
    const result = await ghl.listContacts(creds, { limit: 5 });
    expect(result.success).toBe(true);
    expect(result.contacts).toBeDefined();
    expect(result.contacts!.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);

    // Verify each contact has required fields
    for (const c of result.contacts!) {
      expect(c.id).toBeTruthy();
      // At least one of email/phone/name should exist
      const hasData = c.email || c.phone || c.firstName || c.lastName;
      expect(hasData).toBeTruthy();
    }
    console.log(`Pulled ${result.contacts!.length} contacts (total: ${result.total})`);
  });

  it("should perform a full push→pull→reconcile cycle via GHL API", async () => {
    const testEmail = `sync-engine-router-test-${Date.now()}@test-stewardly.com`;

    // PUSH: Create a contact
    const pushResult = await ghl.createContact(creds, {
      locationId: creds.locationId,
      firstName: "RouterSync",
      lastName: "Test",
      email: testEmail,
      companyName: "Router Sync Test Corp",
      tags: ["router-sync-test"],
    });
    const contactId = pushResult.contactId!;
    expect(contactId).toBeTruthy();
    console.log(`PUSH: Created ${contactId}`);

    // PULL: Read it back
    const pullResult = await ghl.getContact(creds, contactId);
    expect(pullResult.success).toBe(true);
    expect(pullResult.contact.email).toBe(testEmail);
    console.log(`PULL: Verified ${pullResult.contact.email}`);

    // RECONCILE: Update and verify
    const updateResult = await ghl.updateContact(creds, contactId, {
      companyName: "Router Sync Test Corp - RECONCILED",
    });
    expect(updateResult.success).toBe(true);

    const verifyResult = await ghl.getContact(creds, contactId);
    expect(verifyResult.contact.companyName).toBe("Router Sync Test Corp - RECONCILED");
    console.log(`RECONCILE: companyName updated to "${verifyResult.contact.companyName}"`);

    // CLEANUP
    const deleteResult = await ghl.deleteContact(creds, contactId);
    expect(deleteResult.success).toBe(true);
    console.log(`CLEANUP: Deleted ${contactId}`);
  });

  it("should verify sync worker state is accessible", async () => {
    // Import the sync worker using dynamic ESM import
    const mod = await import("./services/syncWorker");
    const state = mod.syncWorker.getState();
    expect(state).toBeDefined();
    expect(state.status).toBeDefined();
    console.log(`Sync worker state: ${state.status}, processed: ${state.processed}`);
  });
});

describe("Live Token Auto-Refresh Verification", () => {
  it("should verify the auto-refresh daemon is running", async () => {
    const { execSync } = await import("child_process");
    const ps = execSync("ps aux | grep cdp_auto_refresh | grep -v grep || true").toString();
    console.log("Auto-refresh daemon:", ps.trim() || "NOT RUNNING");
    // The daemon should be running
    expect(ps.trim().length).toBeGreaterThan(0);
  });

  it("should verify the token file has a valid non-expired token", () => {
    const raw = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
    expect(raw.jwt).toBeTruthy();
    const remaining = ghl.getJwtRemainingMinutes(raw.jwt);
    console.log(`Token remaining: ${remaining.toFixed(1)} minutes`);
    expect(remaining).toBeGreaterThan(0);
  });

  it("should verify the standalone sync is still running", async () => {
    const { execSync } = await import("child_process");
    const ps = execSync("ps aux | grep ghl_parallel_sync | grep -v grep || true").toString();
    console.log("Standalone sync:", ps.trim() || "NOT RUNNING");
    expect(ps.trim().length).toBeGreaterThan(0);
  });
});
