/**
 * Live E2E Tests — Orchestrator & Sync Scheduler
 *
 * Tests the unified campaign orchestrator and hybrid sync scheduler
 * using real credentials from the database. These tests verify:
 * - Platform health checks across GHL, SMS-iT, and Dripify
 * - Sequence lifecycle (start → status → pause → resume → cancel)
 * - Sync scheduler start/stop/forcePull with real API calls
 * - Webhook processing
 *
 * Prerequisites:
 * - All platform credentials seeded in the integrations table
 * - GHL token in /home/ubuntu/master_db/ghl_token.json
 *
 * Run: pnpm test server/live-orchestrator-sync.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as orchestrator from "./services/orchestrator";
import { syncScheduler } from "./services/syncScheduler";
import { getAllCredentials } from "./services/credentials";
import * as ghl from "./services/ghl";
import * as fs from "fs";

const TOKEN_FILE = "/home/ubuntu/master_db/ghl_token.json";
const LOCATION_ID = "yUVrjyvzf0txCiJXuYGn";

// ─── Orchestrator: Platform Health ──────────────────────────────────────────

describe("Live E2E: Orchestrator Platform Health", () => {
  it("should check health of all platforms", async () => {
    const health = await orchestrator.getPlatformHealth(1);
    console.log("[Orchestrator] Platform health:");
    for (const h of health) {
      console.log(`  ${h.platform}: connected=${h.connected}, details=${h.details?.slice(0, 100)}`);
      if (h.credits) console.log(`    credits: ${JSON.stringify(h.credits)}`);
    }

    expect(health.length).toBeGreaterThanOrEqual(2);

    // GHL should be connected
    const ghlHealth = health.find((h) => h.platform === "ghl");
    expect(ghlHealth).toBeTruthy();
    expect(ghlHealth!.connected).toBe(true);
    expect(ghlHealth!.lastChecked).toBeGreaterThan(0);

    // SMS-iT should be connected (or at least have credentials validated)
    const smsitHealth = health.find((h) => h.platform === "smsit");
    expect(smsitHealth).toBeTruthy();
    expect(smsitHealth!.connected).toBe(true);

    // Dripify should be connected
    const dripifyHealth = health.find((h) => h.platform === "dripify");
    expect(dripifyHealth).toBeTruthy();
    expect(dripifyHealth!.connected).toBe(true);
  });
});

// ─── Orchestrator: Sequence Lifecycle ───────────────────────────────────────

describe("Live E2E: Orchestrator Sequence Lifecycle", () => {
  let sequenceId: string;

  it("should start a multi-step sequence", async () => {
    // Use a test contact that we'll create and clean up
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
    const ghlCreds: ghl.GhlCredentials = {
      jwt: tokenData.jwt,
      locationId: LOCATION_ID,
      companyId: tokenData.companyId || "fWFR9fqCCCFPDALyseAW",
      apiKey: tokenData.apiKey,
    };

    // Create a test contact for the sequence
    const createResult = await ghl.createContact(ghlCreds, {
      locationId: LOCATION_ID,
      firstName: "OrchestratorTest",
      lastName: "Stewardly",
      email: `orch-test-${Date.now()}@test-stewardly.com`,
      phone: "+15205550196",
      tags: ["orchestrator-test", "auto-cleanup"],
    });

    let testContactGhlId: string;
    if (createResult.success) {
      testContactGhlId = createResult.contactId!;
    } else if (createResult.contactId) {
      testContactGhlId = createResult.contactId;
    } else {
      console.log("[Orchestrator] Could not create test contact, using placeholder");
      testContactGhlId = "placeholder-no-send";
    }

    const config: orchestrator.SequenceConfig = {
      name: `Live E2E Test Sequence - ${Date.now()}`,
      steps: [
        {
          channel: "email",
          subject: "Orchestrator Test Step 1",
          body: "<p>This is step 1 of the orchestrator test sequence.</p>",
          delayMs: 0,
        },
        {
          channel: "sms",
          body: "Orchestrator test step 2 - SMS channel verification",
          delayMs: 100,
        },
      ],
      contactIds: [1],
    };

    const contacts = [
      {
        id: 1,
        email: "mwpenn94@gmail.com",
        phone: "+15205550196",
        firstName: "Michael",
        lastName: "Penn",
        ghlContactId: testContactGhlId,
      },
    ];

    const execution = await orchestrator.startSequence(1, config, contacts);
    sequenceId = execution.id;

    console.log(`[Orchestrator] Started sequence: ${sequenceId}`);
    console.log(`  Name: ${execution.name}`);
    console.log(`  Status: ${execution.status}`);
    console.log(`  Total steps: ${execution.totalSteps}`);
    console.log(`  Contact count: ${execution.contactCount}`);

    expect(execution.id).toBeTruthy();
    expect(execution.status).toBe("running");
    expect(execution.totalSteps).toBe(2);
    expect(execution.contactCount).toBe(1);

    // Clean up the test contact
    if (testContactGhlId && testContactGhlId !== "placeholder-no-send") {
      await ghl.deleteContact(ghlCreds, testContactGhlId);
      console.log(`[Orchestrator] Cleaned up test contact: ${testContactGhlId}`);
    }
  });

  it("should get sequence status", async () => {
    expect(sequenceId).toBeTruthy();

    // Wait a moment for the sequence to progress
    await new Promise((r) => setTimeout(r, 500));

    const status = orchestrator.getSequenceStatus(sequenceId);
    console.log(`[Orchestrator] Sequence status: ${JSON.stringify(status?.status)}`);
    console.log(`  Current step: ${status?.currentStep}`);
    console.log(`  Step results: ${status?.stepResults.length}`);

    expect(status).toBeTruthy();
    expect(["running", "completed", "failed"]).toContain(status!.status);
  });

  it("should list all sequences", () => {
    const sequences = orchestrator.listSequences();
    console.log(`[Orchestrator] Total sequences: ${sequences.length}`);

    expect(sequences.length).toBeGreaterThan(0);
    const found = sequences.find((s) => s.id === sequenceId);
    expect(found).toBeTruthy();
  });

  it("should start and then pause a sequence", async () => {
    const config: orchestrator.SequenceConfig = {
      name: `Pause Test Sequence - ${Date.now()}`,
      steps: [
        { channel: "email", body: "Step 1", delayMs: 5000 },
        { channel: "email", body: "Step 2", delayMs: 5000 },
        { channel: "email", body: "Step 3", delayMs: 5000 },
      ],
      contactIds: [1],
    };

    const contacts = [
      { id: 1, email: "test@test.com", phone: null, firstName: "Test", lastName: "User", ghlContactId: null },
    ];

    const execution = await orchestrator.startSequence(1, config, contacts);
    console.log(`[Orchestrator] Started pause-test sequence: ${execution.id}`);

    // Pause it
    const paused = orchestrator.pauseSequence(execution.id);
    expect(paused).toBe(true);

    const status = orchestrator.getSequenceStatus(execution.id);
    expect(status!.status).toBe("paused");
    console.log(`[Orchestrator] Paused sequence: ${status!.status}`);

    // Resume it
    const resumed = orchestrator.resumeSequence(execution.id);
    expect(resumed).toBe(true);

    const statusAfterResume = orchestrator.getSequenceStatus(execution.id);
    expect(statusAfterResume!.status).toBe("running");
    console.log(`[Orchestrator] Resumed sequence: ${statusAfterResume!.status}`);

    // Cancel it
    const cancelled = orchestrator.cancelSequence(execution.id);
    expect(cancelled).toBe(true);

    const statusAfterCancel = orchestrator.getSequenceStatus(execution.id);
    expect(statusAfterCancel!.status).toBe("cancelled");
    console.log(`[Orchestrator] Cancelled sequence: ${statusAfterCancel!.status}`);
  });

  it("should wait for the original sequence to complete and check results", async () => {
    expect(sequenceId).toBeTruthy();

    // Wait for the sequence to finish (it has short delays)
    await new Promise((r) => setTimeout(r, 2000));

    const status = orchestrator.getSequenceStatus(sequenceId);
    console.log(`[Orchestrator] Final status: ${status?.status}`);
    console.log(`  Step results: ${JSON.stringify(status?.stepResults.map((r) => ({
      step: r.stepIndex,
      channel: r.channel,
      sent: r.sent,
      failed: r.failed,
      errors: r.errors.length,
    })))}`);

    expect(status).toBeTruthy();
    // The sequence should have completed or failed (not still running after 2s)
    expect(["completed", "failed"]).toContain(status!.status);
    expect(status!.stepResults.length).toBeGreaterThan(0);
  });
});

// ─── Sync Scheduler ─────────────────────────────────────────────────────────

describe("Live E2E: Sync Scheduler", () => {
  afterAll(() => {
    // Make sure we stop the scheduler after tests
    syncScheduler.stop();
  });

  it("should start the sync scheduler", () => {
    const status = syncScheduler.start(1, {
      intervalMs: 60000, // 1 minute interval for testing
      platforms: {
        ghl: { enabled: true, pullContacts: true },
        smsit: { enabled: true, pullContacts: true },
        dripify: { enabled: true, pullLeads: true },
      },
    });

    console.log(`[SyncScheduler] Started: isRunning=${status.isRunning}`);
    console.log(`  Interval: ${status.intervalMs}ms`);
    console.log(`  Platforms: ${Object.entries(status.platforms).map(([k, v]) => `${k}=${v.enabled}`).join(", ")}`);

    expect(status.isRunning).toBe(true);
    expect(status.intervalMs).toBe(60000);
  });

  it("should get sync scheduler status", () => {
    const status = syncScheduler.getStatus();
    console.log(`[SyncScheduler] Status: isRunning=${status.isRunning}`);
    console.log(`  Last poll: ${status.lastPollAt ? new Date(status.lastPollAt).toISOString() : "never"}`);
    console.log(`  Next poll: ${status.nextPollAt ? new Date(status.nextPollAt).toISOString() : "N/A"}`);
    console.log(`  Recent events: ${status.recentEvents.length}`);

    expect(status.isRunning).toBe(true);
    expect(status.platforms.ghl).toBeDefined();
    expect(status.platforms.smsit).toBeDefined();
    expect(status.platforms.dripify).toBeDefined();
  });

  it("should force pull from GHL", async () => {
    const events = await syncScheduler.forcePull("ghl");
    console.log(`[SyncScheduler] Force pull GHL: ${events.length} events`);
    for (const e of events) {
      console.log(`  ${e.platform} ${e.type}: ${e.message} (count: ${e.count || 0})`);
    }

    // Should have at least one event (pull or error)
    const status = syncScheduler.getStatus();
    expect(status.recentEvents.length).toBeGreaterThan(0);

    // Check that GHL platform was synced
    const ghlStatus = status.platforms.ghl;
    if (events.some((e) => e.type === "pull")) {
      expect(ghlStatus.syncCount).toBeGreaterThan(0);
      expect(ghlStatus.lastSyncAt).toBeGreaterThan(0);
    }
  });

  it("should force pull from SMS-iT", async () => {
    const events = await syncScheduler.forcePull("smsit");
    console.log(`[SyncScheduler] Force pull SMS-iT: ${events.length} events`);
    for (const e of events) {
      console.log(`  ${e.platform} ${e.type}: ${e.message}`);
    }

    const status = syncScheduler.getStatus();
    expect(status.recentEvents.length).toBeGreaterThan(0);
  });

  it("should force pull from Dripify", async () => {
    const events = await syncScheduler.forcePull("dripify");
    console.log(`[SyncScheduler] Force pull Dripify: ${events.length} events`);
    for (const e of events) {
      console.log(`  ${e.platform} ${e.type}: ${e.message}`);
    }

    const status = syncScheduler.getStatus();
    expect(status.recentEvents.length).toBeGreaterThan(0);
  });

  it("should force pull from all platforms at once", async () => {
    const events = await syncScheduler.forcePull();
    console.log(`[SyncScheduler] Force pull ALL: ${events.length} events`);
    for (const e of events) {
      console.log(`  ${e.platform} ${e.type}: ${e.message}`);
    }

    // Should have events from multiple platforms
    const platforms = new Set(events.map((e) => e.platform));
    console.log(`[SyncScheduler] Platforms pulled: ${Array.from(platforms).join(", ")}`);
    expect(platforms.size).toBeGreaterThanOrEqual(1);
  });

  it("should process a webhook event", () => {
    const event = syncScheduler.processWebhook("dripify", {
      event: "connection_accepted",
      lead: { email: "webhook-test@example.com" },
      campaignId: "test-campaign",
    });

    console.log(`[SyncScheduler] Webhook: ${event.type} - ${event.message}`);
    expect(event.type).toBe("webhook");
    expect(event.platform).toBe("dripify");

    // Verify it was added to recent events
    const status = syncScheduler.getStatus();
    const webhookEvents = status.recentEvents.filter((e) => e.type === "webhook");
    expect(webhookEvents.length).toBeGreaterThan(0);
  });

  it("should stop the sync scheduler", () => {
    const status = syncScheduler.stop();
    console.log(`[SyncScheduler] Stopped: isRunning=${status.isRunning}`);

    expect(status.isRunning).toBe(false);
    expect(status.nextPollAt).toBeNull();
  });

  it("should verify sync counts after full cycle", () => {
    const status = syncScheduler.getStatus();
    console.log("[SyncScheduler] Final sync counts:");
    for (const [platform, info] of Object.entries(status.platforms)) {
      console.log(`  ${platform}: syncCount=${info.syncCount}, lastError=${info.lastError || "none"}`);
    }
    console.log(`  Total recent events: ${status.recentEvents.length}`);

    // At least one platform should have synced successfully
    const totalSyncs = Object.values(status.platforms).reduce((sum, p) => sum + p.syncCount, 0);
    expect(totalSyncs).toBeGreaterThan(0);
  });
});

// ─── Combined: Orchestrator + Sync Integration ──────────────────────────────

describe("Live E2E: Orchestrator + Sync Integration", () => {
  it("should verify credentials are available for all orchestrator channels", async () => {
    const all = await getAllCredentials(1);

    // Email channel requires GHL
    expect(all.ghl).toBeTruthy();
    console.log(`[Integration] Email channel (GHL): ready`);

    // SMS channel requires SMS-iT
    expect(all.smsit).toBeTruthy();
    console.log(`[Integration] SMS channel (SMS-iT): ready`);

    // LinkedIn channel requires Dripify
    expect(all.dripify).toBeTruthy();
    console.log(`[Integration] LinkedIn channel (Dripify): ready`);
  });

  it("should run a quick health check + sync cycle", async () => {
    // Health check
    const health = await orchestrator.getPlatformHealth(1);
    const connectedPlatforms = health.filter((h) => h.connected);
    console.log(`[Integration] ${connectedPlatforms.length}/${health.length} platforms connected`);
    expect(connectedPlatforms.length).toBeGreaterThanOrEqual(2);

    // Quick sync
    const syncStatus = syncScheduler.start(1, { intervalMs: 300000 });
    const events = await syncScheduler.forcePull();
    syncScheduler.stop();

    console.log(`[Integration] Sync pulled ${events.length} events from ${new Set(events.map((e) => e.platform)).size} platforms`);
    expect(events.length).toBeGreaterThan(0);
  });
});
