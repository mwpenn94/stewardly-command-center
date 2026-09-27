/**
 * Campaign Scheduler
 *
 * Background service that checks for scheduled campaigns whose
 * scheduled time has arrived and fires them automatically.
 * Runs on a configurable interval (default: every 60 seconds).
 */

import * as db from "../db";
import { executeCampaign } from "./campaignEngine";
import { getAllCredentials } from "./credentials";

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

async function processScheduledCampaigns() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const scheduled = await db.getScheduledCampaignsDue();
    const now = Date.now();

    for (const campaign of scheduled) {
      let metrics: any = null;
      try {
        metrics = campaign.metrics
          ? typeof campaign.metrics === "string"
            ? JSON.parse(campaign.metrics)
            : campaign.metrics
          : null;
      } catch {
        continue;
      }

      if (!metrics?.scheduledAt) continue;

      const scheduledTime = new Date(metrics.scheduledAt).getTime();
      if (scheduledTime > now) continue;

      // Time has arrived — launch the campaign
      try {
        const userId = campaign.userId;
        const allCreds = await getAllCredentials(userId);

        // Get contacts based on stored audience
        let contacts: any[] = [];
        if (metrics.contactIds && metrics.contactIds.length > 0) {
          const result = await db.getContacts(userId, { limit: 200 });
          contacts = result.contacts.filter((c: any) => metrics.contactIds.includes(c.id));
        } else {
          const result = await db.getContacts(userId, { limit: 200, ...metrics.audienceFilter });
          contacts = result.contacts;
        }

        if (contacts.length === 0) {
          await db.updateCampaign(campaign.id, userId, {
            status: "failed",
          } as any);
          await db.logActivity({
            userId,
            type: "campaign",
            action: "campaign_schedule_failed",
            description: `Scheduled campaign "${campaign.name}" failed: no matching contacts`,
            severity: "error",
          });
          continue;
        }

        // Update status to running
        await db.updateCampaign(campaign.id, userId, {
          status: "running",
          startedAt: new Date(),
        } as any);

        await db.logActivity({
          userId,
          type: "campaign",
          action: "campaign_auto_launched",
          description: `Auto-launched scheduled campaign "${campaign.name}" to ${contacts.length} contacts`,
          severity: "success",
        });

        // Execute the campaign
        const result = await executeCampaign({
          channel: campaign.channel as any,
          body: metrics.body || "",
          subject: metrics.subject,
          contacts,
          ghlCreds: allCreds.ghl || undefined,
          smsitCreds: allCreds.smsit || undefined,
          dripifyCreds: allCreds.dripify || undefined,
          campaignName: campaign.name,
        });

        // Update with results
        await db.updateCampaign(campaign.id, userId, {
          status: result.errors.length === 0 ? "completed" : "completed",
          metrics: JSON.stringify({
            ...metrics,
            sent: result.sent,
            failed: result.failed,
            errors: result.errors.slice(0, 10),
            completedAt: new Date().toISOString(),
          }),
        } as any);

        await db.logActivity({
          userId,
          type: "campaign",
          action: "campaign_completed",
          description: `Scheduled campaign "${campaign.name}" completed: ${result.sent} sent, ${result.failed} failed`,
          severity: result.failed > 0 ? "warning" : "success",
        });
      } catch (err: any) {
        await db.updateCampaign(campaign.id, campaign.userId, {
          status: "failed",
        } as any);
        await db.logActivity({
          userId: campaign.userId,
          type: "campaign",
          action: "campaign_schedule_error",
          description: `Scheduled campaign "${campaign.name}" error: ${err.message}`,
          severity: "error",
        });
      }
    }
  } catch {
    // Silently handle DB connection errors — retry on next tick
  } finally {
    isProcessing = false;
  }
}

export function startCampaignScheduler(intervalMs = 60_000) {
  if (schedulerInterval) return;
  console.log(`Campaign scheduler started (checking every ${intervalMs / 1000}s)`);
  schedulerInterval = setInterval(processScheduledCampaigns, intervalMs);
  processScheduledCampaigns();
}

export function stopCampaignScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

export function isSchedulerRunning() {
  return schedulerInterval !== null;
}
