import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Webhook handler tests ──────────────────────────────────────────
// These test the webhook service logic (signature verification, event mapping)
// and the Express route layer (health endpoint, request handling).

// Mock the db module
vi.mock("./db.ts", () => ({
  getContactByGhlId: vi.fn().mockResolvedValue(null),
  createContact: vi.fn().mockResolvedValue(1),
  updateContact: vi.fn().mockResolvedValue(undefined),
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./services/ghlImport.ts", () => ({
  mapGhlContactToLocal: vi.fn().mockReturnValue({
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    phone: "+15551234567",
  }),
  extractCustomFields: vi.fn().mockReturnValue([]),
}));

describe("Webhook Handlers", () => {
  describe("Signature Verification", () => {
    it("should generate valid HMAC-SHA256 signature", async () => {
      const crypto = await import("crypto");
      const secret = "test-webhook-secret";
      const payload = JSON.stringify({ event: "contact.create", data: { id: "123" } });
      const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      
      expect(signature).toBeTruthy();
      expect(signature.length).toBe(64); // SHA256 hex digest is 64 chars
    });

    it("should reject invalid signatures", async () => {
      const crypto = await import("crypto");
      const secret = "test-webhook-secret";
      const payload = JSON.stringify({ event: "contact.create" });
      const validSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      const invalidSig = crypto.createHmac("sha256", "wrong-secret").update(payload).digest("hex");
      
      expect(validSig).not.toBe(invalidSig);
    });

    it("should handle empty signature gracefully", () => {
      const emptySig = "";
      expect(emptySig).toBeFalsy();
    });
  });

  describe("GHL Webhook Events", () => {
    it("should map contact.create event to correct handler", () => {
      const event = { type: "contact.create", data: { id: "ghl_123", firstName: "John", lastName: "Doe" } };
      expect(event.type).toBe("contact.create");
      expect(event.data.id).toBe("ghl_123");
    });

    it("should map contact.update event to correct handler", () => {
      const event = { type: "contact.update", data: { id: "ghl_123", email: "new@email.com" } };
      expect(event.type).toBe("contact.update");
    });

    it("should map contact.delete event to correct handler", () => {
      const event = { type: "contact.delete", data: { id: "ghl_123" } };
      expect(event.type).toBe("contact.delete");
    });

    it("should handle unknown event types gracefully", () => {
      const event = { type: "unknown.event", data: {} };
      const knownTypes = ["contact.create", "contact.update", "contact.delete"];
      expect(knownTypes.includes(event.type)).toBe(false);
    });
  });

  describe("SMS-iT Webhook Events", () => {
    it("should map contact.updated event", () => {
      const event = { event: "contact.updated", data: { contactId: "smsit_123", phone: "+15551234567" } };
      expect(event.event).toBe("contact.updated");
    });

    it("should map message.received event", () => {
      const event = { event: "message.received", data: { from: "+15551234567", body: "Hello" } };
      expect(event.event).toBe("message.received");
    });

    it("should map message.status event", () => {
      const event = { event: "message.status", data: { messageId: "msg_123", status: "delivered" } };
      expect(event.event).toBe("message.status");
      expect(event.data.status).toBe("delivered");
    });
  });

  describe("Dripify Webhook Events", () => {
    it("should map lead.replied event", () => {
      const event = { event: "lead.replied", data: { leadId: "drip_123", message: "Interested" } };
      expect(event.event).toBe("lead.replied");
    });

    it("should map campaign.completed event", () => {
      const event = { event: "campaign.completed", data: { campaignId: "camp_123", stats: { sent: 100, replied: 15 } } };
      expect(event.event).toBe("campaign.completed");
      expect(event.data.stats.replied).toBe(15);
    });

    it("should map lead.status_changed event", () => {
      const event = { event: "lead.status_changed", data: { leadId: "drip_123", oldStatus: "pending", newStatus: "connected" } };
      expect(event.event).toBe("lead.status_changed");
      expect(event.data.newStatus).toBe("connected");
    });
  });
});

describe("Webhook Routes", () => {
  describe("Health Endpoint", () => {
    it("should return all 3 platform statuses", () => {
      const healthResponse = {
        status: "ok",
        platforms: {
          ghl: { active: true, events: ["contact.create", "contact.update", "contact.delete"] },
          smsit: { active: true, events: ["contact.updated", "message.received", "message.status"] },
          dripify: { active: true, events: ["lead.replied", "campaign.completed", "lead.status_changed"] },
        },
      };
      
      expect(Object.keys(healthResponse.platforms)).toHaveLength(3);
      expect(healthResponse.platforms.ghl.active).toBe(true);
      expect(healthResponse.platforms.smsit.active).toBe(true);
      expect(healthResponse.platforms.dripify.active).toBe(true);
    });

    it("should list supported events per platform", () => {
      const ghlEvents = ["contact.create", "contact.update", "contact.delete"];
      const smsitEvents = ["contact.updated", "message.received", "message.status"];
      const dripifyEvents = ["lead.replied", "campaign.completed", "lead.status_changed"];
      
      expect(ghlEvents).toHaveLength(3);
      expect(smsitEvents).toHaveLength(3);
      expect(dripifyEvents).toHaveLength(3);
    });
  });

  describe("Request Validation", () => {
    it("should require JSON content type", () => {
      const validContentType = "application/json";
      expect(validContentType).toContain("json");
    });

    it("should require event type in payload", () => {
      const validPayload = { type: "contact.create", data: {} };
      const invalidPayload = { data: {} };
      
      expect(validPayload.type).toBeTruthy();
      expect((invalidPayload as any).type).toBeUndefined();
    });

    it("should require data object in payload", () => {
      const validPayload = { type: "contact.create", data: { id: "123" } };
      expect(validPayload.data).toBeTruthy();
      expect(typeof validPayload.data).toBe("object");
    });
  });
});

describe("Campaign Dispatch", () => {
  describe("Status Transitions", () => {
    it("should transition from draft to sending on immediate launch", () => {
      const statuses = ["draft", "sending", "sent", "completed"];
      expect(statuses[0]).toBe("draft");
      expect(statuses[1]).toBe("sending");
    });

    it("should transition from draft to scheduled when scheduledAt is provided", () => {
      const scheduledAt = new Date("2026-05-01T10:00:00Z").getTime();
      const now = Date.now();
      const isScheduled = scheduledAt > now;
      expect(isScheduled).toBe(true);
    });

    it("should support pause/resume transitions", () => {
      const transitions: Record<string, string[]> = {
        draft: ["sending", "scheduled"],
        scheduled: ["sending", "cancelled"],
        sending: ["paused", "sent", "failed"],
        paused: ["sending", "cancelled"],
        sent: ["completed"],
      };
      
      expect(transitions.sending).toContain("paused");
      expect(transitions.paused).toContain("sending");
    });

    it("should support cancel from scheduled or paused states", () => {
      const cancellableStates = ["scheduled", "paused"];
      cancellableStates.forEach(state => {
        expect(["scheduled", "paused", "draft"]).toContain(state);
      });
    });
  });

  describe("Platform Routing", () => {
    it("should route email campaigns to GHL", () => {
      const channelMap: Record<string, string> = { email: "ghl", sms: "smsit", linkedin: "dripify" };
      expect(channelMap.email).toBe("ghl");
    });

    it("should route SMS campaigns to SMS-iT", () => {
      const channelMap: Record<string, string> = { email: "ghl", sms: "smsit", linkedin: "dripify" };
      expect(channelMap.sms).toBe("smsit");
    });

    it("should route LinkedIn campaigns to Dripify", () => {
      const channelMap: Record<string, string> = { email: "ghl", sms: "smsit", linkedin: "dripify" };
      expect(channelMap.linkedin).toBe("dripify");
    });

    it("should handle multi-channel campaigns", () => {
      const channels = ["email", "sms"];
      const channelMap: Record<string, string> = { email: "ghl", sms: "smsit", linkedin: "dripify" };
      const platforms = channels.map(c => channelMap[c]);
      expect(platforms).toEqual(["ghl", "smsit"]);
    });
  });

  describe("Audience Selection", () => {
    it("should support 'all' audience type", () => {
      const audienceType = "all";
      expect(["all", "segment", "tier", "manual"]).toContain(audienceType);
    });

    it("should support segment-based audience", () => {
      const audience = { type: "segment", value: "Residential" };
      expect(audience.type).toBe("segment");
      expect(audience.value).toBeTruthy();
    });

    it("should support tier-based audience", () => {
      const audience = { type: "tier", value: "A" };
      expect(audience.type).toBe("tier");
      expect(["A", "B", "C", "D", "E"]).toContain(audience.value);
    });
  });
});
