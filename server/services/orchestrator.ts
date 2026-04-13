/**
 * Unified Campaign Orchestrator
 * 
 * Coordinates multi-platform marketing sequences across GHL (email),
 * SMS-iT (SMS/MMS), and Dripify (LinkedIn). Supports:
 * - Multi-step sequences with delays between steps
 * - Audience segmentation by tags, tier, and platform presence
 * - Cross-platform contact resolution
 * - Execution tracking with per-step status
 */

import * as ghl from "./ghl";
import * as smsit from "./smsit";
import * as dripify from "./dripify";
import { getGhlCredentials, getSmsitCredentials, getDripifyCredentials } from "./credentials";
import * as db from "../db";

// ─── Types ───────────────────────────────────────────────────────────

export interface SequenceStep {
  channel: "email" | "sms" | "linkedin";
  subject?: string;
  body: string;
  delayMs: number;
  templateId?: string;
}

export interface SequenceConfig {
  name: string;
  steps: SequenceStep[];
  contactIds: number[];
  audienceFilter?: {
    tags?: string[];
    tiers?: string[];
    platforms?: string[];
  };
}

export interface StepResult {
  stepIndex: number;
  channel: string;
  sent: number;
  failed: number;
  errors: string[];
  startedAt: number;
  completedAt: number;
}

export interface SequenceExecution {
  id: string;
  name: string;
  status: "running" | "paused" | "completed" | "failed" | "cancelled";
  totalSteps: number;
  currentStep: number;
  stepResults: StepResult[];
  startedAt: number;
  updatedAt: number;
  contactCount: number;
}

export interface PlatformHealth {
  platform: string;
  connected: boolean;
  lastChecked: number;
  details?: string;
  credits?: any;
}

// ─── In-memory state ─────────────────────────────────────────────────

const activeSequences = new Map<string, SequenceExecution>();
let sequenceCounter = 0;

// ─── Platform Health ─────────────────────────────────────────────────

export async function getPlatformHealth(userId: number): Promise<PlatformHealth[]> {
  const results: PlatformHealth[] = [];

  // GHL
  try {
    const creds = await getGhlCredentials(userId);
    if (creds) {
      const test = await ghl.testConnection(creds);
      results.push({
        platform: "ghl",
        connected: test.success,
        lastChecked: Date.now(),
        details: test.message,
      });
    } else {
      results.push({ platform: "ghl", connected: false, lastChecked: Date.now(), details: "No credentials configured" });
    }
  } catch (e: any) {
    results.push({ platform: "ghl", connected: false, lastChecked: Date.now(), details: e.message });
  }

  // SMS-iT
  try {
    const creds = await getSmsitCredentials(userId);
    if (creds) {
      const test = await smsit.testConnection(creds);
      results.push({
        platform: "smsit",
        connected: test.success,
        lastChecked: Date.now(),
        details: test.message,
        credits: (test as any).credits,
      });
    } else {
      results.push({ platform: "smsit", connected: false, lastChecked: Date.now(), details: "No credentials configured" });
    }
  } catch (e: any) {
    results.push({ platform: "smsit", connected: false, lastChecked: Date.now(), details: e.message });
  }

  // Dripify
  try {
    const creds = await getDripifyCredentials(userId);
    if (creds) {
      const test = await dripify.testConnection(creds);
      results.push({
        platform: "dripify",
        connected: test.success,
        lastChecked: Date.now(),
        details: test.message,
      });
    } else {
      results.push({ platform: "dripify", connected: false, lastChecked: Date.now(), details: "No credentials configured" });
    }
  } catch (e: any) {
    results.push({ platform: "dripify", connected: false, lastChecked: Date.now(), details: e.message });
  }

  // Update DB status based on live health check results
  for (const r of results) {
    try {
      await db.updateIntegrationStatus(
        userId,
        r.platform as any,
        r.connected ? "connected" : "error",
        new Date(r.lastChecked)
      );
    } catch {
      // Non-critical: don't fail health check if DB update fails
    }
  }

  return results;
}

// ─── Sequence Execution ──────────────────────────────────────────────

export async function startSequence(
  userId: number,
  config: SequenceConfig,
  contacts: Array<{ id: number; email?: string | null; phone?: string | null; firstName?: string | null; lastName?: string | null; ghlContactId?: string | null }>
): Promise<SequenceExecution> {
  const id = `seq_${++sequenceCounter}_${Date.now()}`;
  const execution: SequenceExecution = {
    id,
    name: config.name,
    status: "running",
    totalSteps: config.steps.length,
    currentStep: 0,
    stepResults: [],
    startedAt: Date.now(),
    updatedAt: Date.now(),
    contactCount: contacts.length,
  };
  activeSequences.set(id, execution);

  executeSteps(userId, id, config.steps, contacts).catch((err) => {
    const exec = activeSequences.get(id);
    if (exec) { exec.status = "failed"; exec.updatedAt = Date.now(); }
  });

  return execution;
}

async function executeSteps(
  userId: number,
  sequenceId: string,
  steps: SequenceStep[],
  contacts: Array<{ id: number; email?: string | null; phone?: string | null; firstName?: string | null; lastName?: string | null; ghlContactId?: string | null }>
) {
  for (let i = 0; i < steps.length; i++) {
    const exec = activeSequences.get(sequenceId);
    if (!exec || exec.status === "cancelled" || exec.status === "paused") return;

    const step = steps[i];
    exec.currentStep = i;
    exec.updatedAt = Date.now();

    if (step.delayMs > 0) {
      await new Promise((r) => setTimeout(r, Math.min(step.delayMs, 5000)));
    }

    const execAfterDelay = activeSequences.get(sequenceId);
    if (!execAfterDelay || execAfterDelay.status !== "running") return;

    const stepResult: StepResult = {
      stepIndex: i, channel: step.channel, sent: 0, failed: 0, errors: [],
      startedAt: Date.now(), completedAt: 0,
    };

    try {
      if (step.channel === "email") {
        const ghlCreds = await getGhlCredentials(userId);
        if (!ghlCreds) {
          stepResult.errors.push("GHL credentials not configured");
          stepResult.failed = contacts.length;
        } else {
          for (const contact of contacts) {
            if (!contact.ghlContactId || !contact.email) {
              stepResult.failed++;
              stepResult.errors.push(`Contact ${contact.id}: missing GHL ID or email`);
              continue;
            }
            try {
              const result = await ghl.sendEmail(ghlCreds, {
                contactId: contact.ghlContactId,
                subject: step.subject || "Message from Stewardly",
                html: step.body,
                emailTo: contact.email,
              });
              if (result.success) stepResult.sent++;
              else { stepResult.failed++; stepResult.errors.push(result.error || "Email send failed"); }
            } catch (e: any) { stepResult.failed++; stepResult.errors.push(e.message); }
          }
        }
      } else if (step.channel === "sms") {
        const smsitCreds = await getSmsitCredentials(userId);
        if (!smsitCreds) {
          stepResult.errors.push("SMS-iT credentials not configured");
          stepResult.failed = contacts.length;
        } else {
          for (const contact of contacts) {
            if (!contact.phone) { stepResult.failed++; continue; }
            const result = await smsit.sendSms(smsitCreds, contact.phone, step.body);
            if (result.success) stepResult.sent++;
            else { stepResult.failed++; stepResult.errors.push(result.error || "SMS send failed"); }
          }
        }
      } else if (step.channel === "linkedin") {
        const dripifyCreds = await getDripifyCredentials(userId);
        if (!dripifyCreds) {
          stepResult.errors.push("Dripify credentials not configured");
          stepResult.failed = contacts.length;
        } else {
          const leads = contacts
            .filter((c) => c.email || c.firstName)
            .map((c) => ({ email: c.email || undefined, firstName: c.firstName || undefined, lastName: c.lastName || undefined }));
          if (leads.length > 0) {
            const result = await dripify.createCampaign(dripifyCreds, {
              name: `${exec.name} - Step ${i + 1}`,
              message: step.body,
              leads,
            });
            if (result.success) stepResult.sent = leads.length;
            else { stepResult.failed = leads.length; stepResult.errors.push(result.error || "LinkedIn campaign failed"); }
          }
        }
      }
    } catch (err: any) {
      stepResult.errors.push(`Step execution error: ${err.message}`);
      stepResult.failed = contacts.length;
    }

    stepResult.completedAt = Date.now();
    exec.stepResults.push(stepResult);
    exec.updatedAt = Date.now();
  }

  const finalExec = activeSequences.get(sequenceId);
  if (finalExec && finalExec.status === "running") {
    finalExec.status = "completed";
    finalExec.updatedAt = Date.now();
  }
}

// ─── Sequence Management ─────────────────────────────────────────────

export function getSequenceStatus(sequenceId: string): SequenceExecution | null {
  return activeSequences.get(sequenceId) || null;
}

export function listSequences(): SequenceExecution[] {
  return Array.from(activeSequences.values()).sort((a, b) => b.startedAt - a.startedAt);
}

export function cancelSequence(sequenceId: string): boolean {
  const exec = activeSequences.get(sequenceId);
  if (!exec || exec.status !== "running") return false;
  exec.status = "cancelled"; exec.updatedAt = Date.now();
  return true;
}

export function pauseSequence(sequenceId: string): boolean {
  const exec = activeSequences.get(sequenceId);
  if (!exec || exec.status !== "running") return false;
  exec.status = "paused"; exec.updatedAt = Date.now();
  return true;
}

export function resumeSequence(sequenceId: string): boolean {
  const exec = activeSequences.get(sequenceId);
  if (!exec || exec.status !== "paused") return false;
  exec.status = "running"; exec.updatedAt = Date.now();
  return true;
}
