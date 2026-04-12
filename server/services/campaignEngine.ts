/**
 * Campaign Execution Engine
 * 
 * Routes campaign sends to the correct platform:
 * - Email → GHL
 * - SMS → SMS-iT (exclusively)
 * - LinkedIn → Dripify (exclusively)
 * - Multi → routes each contact to appropriate channel
 */

import * as ghl from "./ghl";
import * as smsit from "./smsit";
import * as dripify from "./dripify";

export interface CampaignContact {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  ghlContactId?: string;
  linkedinUrl?: string;
}

export interface CampaignConfig {
  channel: "email" | "sms" | "linkedin" | "multi";
  subject?: string;
  body: string;
  contacts: CampaignContact[];
  ghlCreds?: ghl.GhlCredentials;
  smsitCreds?: smsit.SmsitCredentials;
  dripifyCreds?: dripify.DripifyCredentials;
  campaignName: string;
}

export interface CampaignExecutionResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: Array<{ contactId: number; error: string }>;
  platformResults: any[];
}

/**
 * Execute a campaign — routes to the correct platform based on channel.
 */
export async function executeCampaign(config: CampaignConfig): Promise<CampaignExecutionResult> {
  const result: CampaignExecutionResult = {
    success: false,
    sent: 0,
    failed: 0,
    errors: [],
    platformResults: [],
  };

  switch (config.channel) {
    case "email":
      return executeEmailCampaign(config, result);
    case "sms":
      return executeSmsCampaign(config, result);
    case "linkedin":
      return executeLinkedInCampaign(config, result);
    case "multi":
      return executeMultiChannelCampaign(config, result);
    default:
      result.errors.push({ contactId: 0, error: `Unknown channel: ${config.channel}` });
      return result;
  }
}

/**
 * Email campaign via GHL.
 * Uses GHL's internal email sending capabilities.
 */
async function executeEmailCampaign(
  config: CampaignConfig,
  result: CampaignExecutionResult
): Promise<CampaignExecutionResult> {
  if (!config.ghlCreds) {
    result.errors.push({ contactId: 0, error: "GHL credentials not configured. Set up GoHighLevel integration first." });
    return result;
  }

  for (const contact of config.contacts) {
    if (!contact.email) {
      result.failed++;
      result.errors.push({ contactId: contact.id, error: "No email address" });
      continue;
    }

    try {
      if (!contact.ghlContactId) {
        result.failed++;
        result.errors.push({ contactId: contact.id, error: "No GHL contact ID — contact must be synced to GHL first" });
        continue;
      }

      const interpolatedBody = interpolateTemplate(config.body, contact);
      const emailResult = await ghl.sendEmail(config.ghlCreds!, {
        contactId: contact.ghlContactId,
        subject: config.subject || config.campaignName,
        html: interpolatedBody,
        message: interpolatedBody.replace(/<[^>]*>/g, ""), // strip HTML for plain text
        emailTo: contact.email,
      });

      if (emailResult.success) {
        result.sent++;
        result.platformResults.push({
          contactId: contact.id,
          status: "sent",
          platform: "ghl",
          messageId: emailResult.messageId,
          conversationId: emailResult.conversationId,
        });
      } else {
        result.failed++;
        result.errors.push({ contactId: contact.id, error: emailResult.error || "GHL email send failed" });
      }
    } catch (err: any) {
      result.failed++;
      result.errors.push({ contactId: contact.id, error: `Email error: ${err.message}` });
    }

    // Rate limit
    await sleep(100);
  }

  result.success = result.failed === 0;
  return result;
}

/**
 * SMS campaign via SMS-iT (exclusive SMS channel).
 */
async function executeSmsCampaign(
  config: CampaignConfig,
  result: CampaignExecutionResult
): Promise<CampaignExecutionResult> {
  if (!config.smsitCreds) {
    result.errors.push({ contactId: 0, error: "SMS-iT credentials not configured. Set up SMS-iT integration first." });
    return result;
  }

  const messages = config.contacts
    .filter((c) => c.phone)
    .map((c) => ({
      to: ghl.formatPhone(c.phone!),
      body: interpolateTemplate(config.body, c),
    }));

  if (messages.length === 0) {
    result.errors.push({ contactId: 0, error: "No contacts with phone numbers" });
    return result;
  }

  const smsResult = await smsit.sendBulkSms(config.smsitCreds, messages);
  result.sent = smsResult.sent;
  result.failed = smsResult.failed;
  result.success = smsResult.success;

  smsResult.results.forEach((r, i) => {
    if (!r.success) {
      const contact = config.contacts.filter((c) => c.phone)[i];
      result.errors.push({ contactId: contact?.id || 0, error: r.error || "SMS send failed" });
    }
  });

  return result;
}

/**
 * LinkedIn campaign via Dripify (exclusive LinkedIn channel).
 */
async function executeLinkedInCampaign(
  config: CampaignConfig,
  result: CampaignExecutionResult
): Promise<CampaignExecutionResult> {
  if (!config.dripifyCreds) {
    result.errors.push({ contactId: 0, error: "Dripify credentials not configured. Set up Dripify integration first." });
    return result;
  }

  const leads = config.contacts.map((c) => ({
    linkedinUrl: c.linkedinUrl,
    email: c.email,
    firstName: c.firstName,
    lastName: c.lastName,
  }));

  const dripifyResult = await dripify.createCampaign(config.dripifyCreds, {
    name: config.campaignName,
    message: interpolateTemplate(config.body, {} as CampaignContact),
    leads,
  });

  if (dripifyResult.success) {
    result.sent = config.contacts.length;
    result.success = true;
    result.platformResults.push({ campaignId: dripifyResult.campaignId, platform: "dripify" });
  } else {
    result.failed = config.contacts.length;
    result.errors.push({ contactId: 0, error: dripifyResult.error || "Dripify campaign creation failed" });
  }

  return result;
}

/**
 * Multi-channel campaign — routes each contact to the best available channel.
 */
async function executeMultiChannelCampaign(
  config: CampaignConfig,
  result: CampaignExecutionResult
): Promise<CampaignExecutionResult> {
  // Route: email contacts → GHL, phone-only contacts → SMS-iT, linkedin contacts → Dripify
  const emailContacts = config.contacts.filter((c) => c.email && config.ghlCreds);
  const smsContacts = config.contacts.filter((c) => c.phone && !c.email && config.smsitCreds);
  const linkedinContacts = config.contacts.filter((c) => c.linkedinUrl && config.dripifyCreds);

  if (emailContacts.length > 0 && config.ghlCreds) {
    const emailResult = await executeEmailCampaign({ ...config, contacts: emailContacts }, {
      success: false, sent: 0, failed: 0, errors: [], platformResults: [],
    });
    result.sent += emailResult.sent;
    result.failed += emailResult.failed;
    result.errors.push(...emailResult.errors);
  }

  if (smsContacts.length > 0 && config.smsitCreds) {
    const smsResult = await executeSmsCampaign({ ...config, contacts: smsContacts }, {
      success: false, sent: 0, failed: 0, errors: [], platformResults: [],
    });
    result.sent += smsResult.sent;
    result.failed += smsResult.failed;
    result.errors.push(...smsResult.errors);
  }

  if (linkedinContacts.length > 0 && config.dripifyCreds) {
    const linkedinResult = await executeLinkedInCampaign({ ...config, contacts: linkedinContacts }, {
      success: false, sent: 0, failed: 0, errors: [], platformResults: [],
    });
    result.sent += linkedinResult.sent;
    result.failed += linkedinResult.failed;
    result.errors.push(...linkedinResult.errors);
  }

  result.success = result.failed === 0 && result.sent > 0;
  return result;
}

/**
 * Interpolate template variables like {{firstName}}, {{lastName}}, etc.
 */
function interpolateTemplate(template: string, contact: CampaignContact): string {
  return template
    .replace(/\{\{firstName\}\}/g, contact.firstName || "")
    .replace(/\{\{lastName\}\}/g, contact.lastName || "")
    .replace(/\{\{email\}\}/g, contact.email || "")
    .replace(/\{\{phone\}\}/g, contact.phone || "")
    .replace(/\{\{fullName\}\}/g, `${contact.firstName || ""} ${contact.lastName || ""}`.trim());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
