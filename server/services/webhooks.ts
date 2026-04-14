import crypto from "crypto";
import * as db from "../db";
import { mapGhlContactToLocal, extractCustomFields } from "./ghlImport";
import type { InsertContact } from "../../drizzle/schema";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WebhookEvent {
  platform: "ghl" | "smsit" | "dripify";
  eventType: string;
  payload: Record<string, unknown>;
  signature?: string;
  timestamp: number;
}

export interface WebhookResult {
  accepted: boolean;
  action?: string;
  contactId?: number;
  error?: string;
}

// ─── Signature Verification ──────────────────────────────────────────────────

export function verifyGhlSignature(
  body: string,
  signature: string | undefined,
  secret: string | undefined
): boolean {
  if (!secret || !signature) return true; // Skip if no secret configured
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

export function verifySmsitSignature(
  body: string,
  signature: string | undefined,
  secret: string | undefined
): boolean {
  if (!secret || !signature) return true;
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

export function verifyDripifySignature(
  body: string,
  signature: string | undefined,
  secret: string | undefined
): boolean {
  if (!secret || !signature) return true;
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// ─── GHL Webhook Handler ─────────────────────────────────────────────────────

export async function handleGhlWebhook(
  userId: number,
  eventType: string,
  payload: Record<string, unknown>
): Promise<WebhookResult> {
  try {
    switch (eventType) {
      case "contact.create":
      case "ContactCreate": {
        const ghlContactId = (payload.id || payload.contactId) as string;
        if (!ghlContactId) return { accepted: false, error: "Missing contact ID" };

        // Check if contact already exists
        const existing = await db.getContactByGhlId(userId, ghlContactId);
        if (existing) {
          return { accepted: true, action: "skipped_duplicate", contactId: existing.id };
        }

        // Map GHL fields to local format
        const mapped = mapGhlContactToLocal(payload as any, userId);
        const customFieldsData = extractCustomFields(payload as any, 0); // contactId set after insert

        const contactId = await db.createContact({
          ...mapped,
          ghlContactId,
          syncStatus: "synced",
          lastSyncedAt: new Date(),
        });

        // Save custom fields
        if (customFieldsData.length > 0 && contactId) {
          for (const cf of customFieldsData) {
            await db.upsertContactCustomField({
              ...cf,
              contactId,
            });
          }
        }

        await db.logActivity({
          userId,
          type: "webhook",
          action: "ghl_contact_created",
          description: `New contact created via GHL webhook: ${mapped.firstName || ""} ${mapped.lastName || ""}`.trim(),
          severity: "info",
          metadata: JSON.stringify({ platform: "ghl", ghlContactId, contactId }),
        });

        return { accepted: true, action: "created", contactId: contactId ?? undefined };
      }

      case "contact.update":
      case "ContactUpdate": {
        const ghlContactId = (payload.id || payload.contactId) as string;
        if (!ghlContactId) return { accepted: false, error: "Missing contact ID" };

        const existing = await db.getContactByGhlId(userId, ghlContactId);
        if (!existing) {
          // Contact doesn't exist locally — create it
          return handleGhlWebhook(userId as number, "contact.create", payload);
        }

        const mapped = mapGhlContactToLocal(payload as any, userId);
        const customFieldsData = extractCustomFields(payload as any, existing.id);

        // Extract only updatable fields (remove userId which is not an update field)
        const { userId: _uid, ...updateFields } = mapped;
        await db.updateContact(existing.id, userId, {
          ...updateFields,
          syncStatus: "synced",
          lastSyncedAt: new Date(),
        });

        if (customFieldsData.length > 0) {
          for (const cf of customFieldsData) {
            await db.upsertContactCustomField(cf);
          }
        }

        await db.logActivity({
          userId,
          type: "webhook",
          action: "ghl_contact_updated",
          description: `Contact updated via GHL webhook: ${mapped.firstName || existing.firstName || ""} ${mapped.lastName || existing.lastName || ""}`.trim(),
          severity: "info",
          metadata: JSON.stringify({ platform: "ghl", ghlContactId, contactId: existing.id }),
        });

        return { accepted: true, action: "updated", contactId: existing.id };
      }

      case "contact.delete":
      case "ContactDelete": {
        const ghlContactId = (payload.id || payload.contactId) as string;
        if (!ghlContactId) return { accepted: false, error: "Missing contact ID" };

        const existingDel = await db.getContactByGhlId(userId, ghlContactId);
        if (!existingDel) {
          return { accepted: true, action: "skipped_not_found" };
        }

        await db.deleteContact(existingDel.id, userId);

        await db.logActivity({
          userId,
          type: "webhook",
          action: "ghl_contact_deleted",
          description: `Contact deleted via GHL webhook: ${existingDel.firstName || ""} ${existingDel.lastName || ""}`.trim(),
          severity: "warning",
          metadata: JSON.stringify({ platform: "ghl", ghlContactId, contactId: existingDel.id }),
        });

        return { accepted: true, action: "deleted", contactId: existingDel.id };
      }

      default:
        // Log unhandled event types
        await db.logActivity({
          userId,
          type: "webhook",
          action: "ghl_event_received",
          description: `Unhandled GHL webhook event: ${eventType}`,
          severity: "info",
          metadata: JSON.stringify({ platform: "ghl", eventType }),
        });
        return { accepted: true, action: "logged" };
    }
  } catch (err: any) {
    await db.logActivity({
      userId,
      type: "webhook",
      action: "ghl_webhook_error",
      description: `GHL webhook error: ${err.message}`,
      severity: "error",
      metadata: JSON.stringify({ platform: "ghl", eventType, error: err.message }),
    });
    return { accepted: false, error: err.message };
  }
}

// ─── SMS-iT Webhook Handler ──────────────────────────────────────────────────

export async function handleSmsitWebhook(
  userId: number,
  eventType: string,
  payload: Record<string, unknown>
): Promise<WebhookResult> {
  try {
    switch (eventType) {
      case "contact.updated":
      case "contact_updated": {
        const smsitContactId = (payload.id || payload.contact_id) as string;
        if (!smsitContactId) return { accepted: false, error: "Missing contact ID" };

        // Try to find by phone number since SMS-iT is phone-centric
        const phone = (payload.phone || payload.phone_number) as string;
        let existing: any = null;

        if (phone) {
          const result = await db.getContacts(userId, { search: phone, limit: 1 });
          existing = result.contacts[0] || null;
        }

        if (existing) {
          const updates: Record<string, any> = {};
          if (payload.first_name) updates.firstName = payload.first_name;
          if (payload.last_name) updates.lastName = payload.last_name;
          if (payload.email) updates.email = payload.email;
          if (payload.phone || payload.phone_number) updates.phone = payload.phone || payload.phone_number;

          await db.updateContact(existing.id, userId, {
            ...updates,
            syncStatus: "synced",
            lastSyncedAt: new Date(),
          });

          await db.logActivity({
            userId,
            type: "webhook",
            action: "smsit_contact_updated",
            description: `Contact updated via SMS-iT webhook: ${existing.firstName || ""} ${existing.lastName || ""}`.trim(),
            severity: "info",
            metadata: JSON.stringify({ platform: "smsit", smsitContactId, contactId: existing.id }),
          });

          return { accepted: true, action: "updated", contactId: existing.id };
        }

        return { accepted: true, action: "skipped_not_found" };
      }

      case "message.received":
      case "message_received": {
        const phone = (payload.from || payload.phone || payload.sender) as string;
        const messageBody = (payload.body || payload.message || payload.text) as string;

        await db.logActivity({
          userId,
          type: "webhook",
          action: "smsit_message_received",
          description: `Inbound SMS from ${phone || "unknown"}: ${(messageBody || "").slice(0, 100)}`,
          severity: "info",
          metadata: JSON.stringify({ platform: "smsit", phone, messagePreview: (messageBody || "").slice(0, 200) }),
        });

        // Log as contact interaction if we can find the contact
        if (phone) {
          const result = await db.getContacts(userId, { search: phone, limit: 1 });
          const contact = result.contacts[0];
          if (contact) {
            await db.createInteraction({
              contactId: contact.id,
              userId,
              channel: "sms",
              type: "message_received",
              direction: "inbound",
              body: (messageBody || "").slice(0, 500),
              metadata: JSON.stringify({ platform: "smsit", from: phone }),
              platform: "smsit",
            });
            return { accepted: true, action: "interaction_logged", contactId: contact.id };
          }
        }

        return { accepted: true, action: "logged" };
      }

      case "message.status":
      case "message_status": {
        const status = (payload.status || payload.delivery_status) as string;
        const messageId = (payload.message_id || payload.id) as string;

        await db.logActivity({
          userId,
          type: "webhook",
          action: "smsit_message_status",
          description: `SMS delivery status: ${status} for message ${messageId || "unknown"}`,
          severity: status === "failed" ? "warning" : "info",
          metadata: JSON.stringify({ platform: "smsit", status, messageId }),
        });

        return { accepted: true, action: "status_logged" };
      }

      default:
        await db.logActivity({
          userId,
          type: "webhook",
          action: "smsit_event_received",
          description: `Unhandled SMS-iT webhook event: ${eventType}`,
          severity: "info",
          metadata: JSON.stringify({ platform: "smsit", eventType }),
        });
        return { accepted: true, action: "logged" };
    }
  } catch (err: any) {
    await db.logActivity({
      userId,
      type: "webhook",
      action: "smsit_webhook_error",
      description: `SMS-iT webhook error: ${err.message}`,
      severity: "error",
      metadata: JSON.stringify({ platform: "smsit", eventType, error: err.message }),
    });
    return { accepted: false, error: err.message };
  }
}

// ─── Dripify Webhook Handler ─────────────────────────────────────────────────

export async function handleDripifyWebhook(
  userId: number,
  eventType: string,
  payload: Record<string, unknown>
): Promise<WebhookResult> {
  try {
    switch (eventType) {
      case "lead.replied":
      case "lead_replied": {
        const linkedinUrl = (payload.linkedin_url || payload.profileUrl || payload.lead_url) as string;
        const message = (payload.message || payload.reply || payload.text) as string;

        // Try to find contact by LinkedIn URL or name
        let existing: any = null;
        if (linkedinUrl) {
          const result = await db.getContacts(userId, { search: linkedinUrl, limit: 1 });
          existing = result.contacts[0] || null;
        }

        if (existing) {
          await db.createInteraction({
            contactId: existing.id,
            userId,
            channel: "linkedin",
            type: "message_received",
            direction: "inbound",
            body: (message || "").slice(0, 500),
            metadata: JSON.stringify({ platform: "dripify", linkedinUrl }),
            platform: "dripify",
          });

          await db.logActivity({
            userId,
            type: "webhook",
            action: "dripify_lead_replied",
            description: `LinkedIn reply from ${existing.firstName || ""} ${existing.lastName || ""}: ${(message || "").slice(0, 80)}`.trim(),
            severity: "info",
            metadata: JSON.stringify({ platform: "dripify", contactId: existing.id, linkedinUrl }),
          });

          return { accepted: true, action: "interaction_logged", contactId: existing.id };
        }

        await db.logActivity({
          userId,
          type: "webhook",
          action: "dripify_lead_replied",
          description: `LinkedIn reply from ${linkedinUrl || "unknown"}: ${(message || "").slice(0, 80)}`,
          severity: "info",
          metadata: JSON.stringify({ platform: "dripify", linkedinUrl }),
        });

        return { accepted: true, action: "logged" };
      }

      case "campaign.completed":
      case "campaign_completed": {
        const campaignName = (payload.campaign_name || payload.name) as string;
        const stats = payload.stats as Record<string, unknown> | undefined;

        await db.logActivity({
          userId,
          type: "webhook",
          action: "dripify_campaign_completed",
          description: `Dripify campaign completed: ${campaignName || "unknown"}${stats ? ` (${JSON.stringify(stats)})` : ""}`,
          severity: "success",
          metadata: JSON.stringify({ platform: "dripify", campaignName, stats }),
        });

        return { accepted: true, action: "logged" };
      }

      case "lead.status_changed":
      case "lead_status_changed": {
        const linkedinUrl = (payload.linkedin_url || payload.profileUrl) as string;
        const newStatus = (payload.status || payload.new_status) as string;
        const oldStatus = (payload.old_status || payload.previous_status) as string;

        await db.logActivity({
          userId,
          type: "webhook",
          action: "dripify_lead_status",
          description: `Dripify lead status: ${oldStatus || "?"} → ${newStatus || "?"} for ${linkedinUrl || "unknown"}`,
          severity: "info",
          metadata: JSON.stringify({ platform: "dripify", linkedinUrl, oldStatus, newStatus }),
        });

        return { accepted: true, action: "status_logged" };
      }

      default:
        await db.logActivity({
          userId,
          type: "webhook",
          action: "dripify_event_received",
          description: `Unhandled Dripify webhook event: ${eventType}`,
          severity: "info",
          metadata: JSON.stringify({ platform: "dripify", eventType }),
        });
        return { accepted: true, action: "logged" };
    }
  } catch (err: any) {
    await db.logActivity({
      userId,
      type: "webhook",
      action: "dripify_webhook_error",
      description: `Dripify webhook error: ${err.message}`,
      severity: "error",
      metadata: JSON.stringify({ platform: "dripify", eventType, error: err.message }),
    });
    return { accepted: false, error: err.message };
  }
}
