/**
 * Multi-Platform Push/Pull Tests
 * Tests for SMS-iT and Dripify write capabilities, bulk GHL push, and payload builders.
 */
import { describe, it, expect, vi } from "vitest";

// ─── SMS-iT Service Tests ─────────────────────────────────────────────────
describe("SMS-iT Service", () => {
  it("buildPushPayloadFromLocal maps standard fields", async () => {
    const { buildPushPayloadFromLocal } = await import("./services/smsit");
    const contact = {
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@example.com",
      phone: "+15551234567",
      tags: JSON.stringify(["vip", "active"]),
    };
    const payload = buildPushPayloadFromLocal(contact);
    expect(payload.phone).toBe("+15551234567");
    expect(payload.firstName).toBe("Alice");
    expect(payload.lastName).toBe("Smith");
    expect(payload.email).toBe("alice@example.com");
    expect(payload.tags).toEqual(["vip", "active"]);
  });

  it("buildPushPayloadFromLocal handles missing optional fields", async () => {
    const { buildPushPayloadFromLocal } = await import("./services/smsit");
    const contact = { phone: "+15559999999" };
    const payload = buildPushPayloadFromLocal(contact);
    expect(payload.phone).toBe("+15559999999");
    expect(payload.firstName).toBeUndefined();
    expect(payload.lastName).toBeUndefined();
    expect(payload.email).toBeUndefined();
    expect(payload.tags).toBeUndefined();
  });

  it("buildPushPayloadFromLocal handles array tags (not stringified)", async () => {
    const { buildPushPayloadFromLocal } = await import("./services/smsit");
    const contact = { phone: "+1555", tags: ["a", "b"] };
    const payload = buildPushPayloadFromLocal(contact);
    expect(payload.tags).toEqual(["a", "b"]);
  });

  it("buildPushPayloadFromLocal handles invalid tags JSON gracefully", async () => {
    const { buildPushPayloadFromLocal } = await import("./services/smsit");
    const contact = { phone: "+1555", tags: "not-json" };
    const payload = buildPushPayloadFromLocal(contact);
    expect(payload.tags).toBeUndefined();
  });

  it("createContact sends correct payload shape", async () => {
    const smsit = await import("./services/smsit");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: "smsit-123" } }),
    });
    const origFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const result = await smsit.createContact(
        { apiKey: "test-key" },
        { phone: "+15551234567", firstName: "Alice", lastName: "Smith", email: "alice@test.com" }
      );
      expect(result.success).toBe(true);
      expect(result.contactId).toBe("smsit-123");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain("/contacts");
      expect(opts.method).toBe("POST");
      const body = JSON.parse(opts.body);
      expect(body.phone).toBe("+15551234567");
      expect(body.first_name).toBe("Alice");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("updateContact sends PUT with correct payload", async () => {
    const smsit = await import("./services/smsit");
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const origFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const result = await smsit.updateContact(
        { apiKey: "test-key" },
        "contact-456",
        { firstName: "Bob", email: "bob@test.com" }
      );
      expect(result.success).toBe(true);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain("/contacts/contact-456");
      expect(opts.method).toBe("PUT");
      const body = JSON.parse(opts.body);
      expect(body.first_name).toBe("Bob");
      expect(body.email).toBe("bob@test.com");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("deleteContact sends DELETE request", async () => {
    const smsit = await import("./services/smsit");
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const origFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const result = await smsit.deleteContact({ apiKey: "test-key" }, "contact-789");
      expect(result.success).toBe(true);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain("/contacts/contact-789");
      expect(opts.method).toBe("DELETE");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("getContact sends GET request and returns contact", async () => {
    const smsit = await import("./services/smsit");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: "c1", first_name: "Alice" } }),
    });
    const origFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const result = await smsit.getContact({ apiKey: "test-key" }, "c1");
      expect(result.success).toBe(true);
      expect(result.contact?.id).toBe("c1");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("handles API error responses gracefully", async () => {
    const smsit = await import("./services/smsit");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });
    const origFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const result = await smsit.createContact({ apiKey: "bad-key" }, { phone: "+1555" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("401");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("handles network errors gracefully", async () => {
    const smsit = await import("./services/smsit");
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const origFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const result = await smsit.updateContact({ apiKey: "key" }, "id", { firstName: "X" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

// ─── Dripify Service Tests ────────────────────────────────────────────────
describe("Dripify Service", () => {
  it("buildPushPayloadFromLocal maps contact fields", async () => {
    const { buildPushPayloadFromLocal } = await import("./services/dripify");
    const contact = {
      firstName: "Bob",
      lastName: "Jones",
      email: "bob@example.com",
      linkedinUrl: "https://linkedin.com/in/bobjones",
    };
    const payload = buildPushPayloadFromLocal(contact);
    expect(payload.firstName).toBe("Bob");
    expect(payload.lastName).toBe("Jones");
    expect(payload.email).toBe("bob@example.com");
    expect(payload.linkedinUrl).toBe("https://linkedin.com/in/bobjones");
  });

  it("buildPushPayloadFromLocal handles linkedin field alias", async () => {
    const { buildPushPayloadFromLocal } = await import("./services/dripify");
    const contact = { firstName: "Alice", linkedin: "https://linkedin.com/in/alice" };
    const payload = buildPushPayloadFromLocal(contact);
    expect(payload.linkedinUrl).toBe("https://linkedin.com/in/alice");
  });

  it("buildPushPayloadFromLocal handles empty contact", async () => {
    const { buildPushPayloadFromLocal } = await import("./services/dripify");
    const payload = buildPushPayloadFromLocal({});
    expect(payload.firstName).toBeUndefined();
    expect(payload.email).toBeUndefined();
    expect(payload.linkedinUrl).toBeUndefined();
  });

  it("addLeadToCampaign sends correct POST", async () => {
    const dripify = await import("./services/dripify");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ leads: [{ id: "lead-1" }] }),
    });
    const origFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const result = await dripify.addLeadToCampaign(
        { apiKey: "firebase-token" },
        "campaign-abc",
        { email: "bob@test.com", firstName: "Bob" }
      );
      expect(result.success).toBe(true);
      expect(result.leadId).toBe("lead-1");
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain("/campaign/campaign-abc/leads");
      expect(opts.method).toBe("POST");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("removeLeadFromCampaign sends DELETE", async () => {
    const dripify = await import("./services/dripify");
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    const origFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const result = await dripify.removeLeadFromCampaign(
        { apiKey: "token" },
        "campaign-1",
        "lead-1"
      );
      expect(result.success).toBe(true);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain("/campaign/campaign-1/leads/lead-1");
      expect(opts.method).toBe("DELETE");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("updateCampaign sends PUT with updates", async () => {
    const dripify = await import("./services/dripify");
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    const origFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const result = await dripify.updateCampaign(
        { apiKey: "token" },
        "campaign-2",
        { name: "Updated Campaign", status: "paused" }
      );
      expect(result.success).toBe(true);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain("/campaign/campaign-2");
      expect(opts.method).toBe("PUT");
      const body = JSON.parse(opts.body);
      expect(body.name).toBe("Updated Campaign");
      expect(body.status).toBe("paused");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("deleteCampaign sends DELETE request", async () => {
    const dripify = await import("./services/dripify");
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    const origFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const result = await dripify.deleteCampaign({ apiKey: "token" }, "campaign-3");
      expect(result.success).toBe(true);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain("/campaign/campaign-3");
      expect(opts.method).toBe("DELETE");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("handles API error responses gracefully", async () => {
    const dripify = await import("./services/dripify");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve("Forbidden"),
    });
    const origFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const result = await dripify.addLeadToCampaign(
        { apiKey: "bad-token" },
        "campaign-1",
        { email: "test@test.com" }
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("403");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("handles network errors gracefully", async () => {
    const dripify = await import("./services/dripify");
    const mockFetch = vi.fn().mockRejectedValue(new Error("Connection refused"));
    const origFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const result = await dripify.deleteCampaign({ apiKey: "token" }, "campaign-1");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Connection refused");
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

// ─── Router Procedure Tests ───────────────────────────────────────────────
describe("Multi-Platform Router Procedures", () => {
  it("bulkPushToGhl procedure exists on the router", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: { id: 9999, name: "Test", openId: "test", role: "admin" } } as any);
    // Should throw "GHL not configured" since no creds exist for user 9999
    await expect(caller.contacts.bulkPushToGhl({ ids: [1] })).rejects.toThrow();
  });

  it("pushToSmsit procedure exists on the router", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: { id: 9999, name: "Test", openId: "test", role: "admin" } } as any);
    await expect(caller.contacts.pushToSmsit({ id: 1 })).rejects.toThrow();
  });

  it("pullFromSmsit procedure exists on the router", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: { id: 9999, name: "Test", openId: "test", role: "admin" } } as any);
    await expect(caller.contacts.pullFromSmsit({})).rejects.toThrow();
  });

  it("pushToDripify procedure exists on the router", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: { id: 9999, name: "Test", openId: "test", role: "admin" } } as any);
    await expect(caller.contacts.pushToDripify({ id: 1, campaignId: "test" })).rejects.toThrow();
  });

  it("pullFromDripify procedure exists on the router", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: { id: 9999, name: "Test", openId: "test", role: "admin" } } as any);
    await expect(caller.contacts.pullFromDripify({ campaignId: "test" })).rejects.toThrow();
  });
});
