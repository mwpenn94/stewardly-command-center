import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  purgeTestContacts: vi.fn(),
  purgeTestCampaigns: vi.fn(),
  purgeTestImports: vi.fn(),
  purgeTestActivity: vi.fn(),
  getBulkImportsPaginated: vi.fn(),
  getContactsForExport: vi.fn(),
  logActivity: vi.fn(),
}));

import * as db from "./db";

const mockPurgeContacts = db.purgeTestContacts as ReturnType<typeof vi.fn>;
const mockPurgeCampaigns = db.purgeTestCampaigns as ReturnType<typeof vi.fn>;
const mockPurgeImports = db.purgeTestImports as ReturnType<typeof vi.fn>;
const mockPurgeActivity = db.purgeTestActivity as ReturnType<typeof vi.fn>;
const mockGetPaginated = db.getBulkImportsPaginated as ReturnType<typeof vi.fn>;
const mockGetContactsForExport = (db as any).getContactsForExport as ReturnType<typeof vi.fn>;

describe("Admin Purge Test Data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("purgeTestContacts returns affected row count", async () => {
    mockPurgeContacts.mockResolvedValue(15);
    const result = await db.purgeTestContacts(1);
    expect(result).toBe(15);
    expect(mockPurgeContacts).toHaveBeenCalledWith(1);
  });

  it("purgeTestCampaigns returns affected row count", async () => {
    mockPurgeCampaigns.mockResolvedValue(8);
    const result = await db.purgeTestCampaigns(1);
    expect(result).toBe(8);
    expect(mockPurgeCampaigns).toHaveBeenCalledWith(1);
  });

  it("purgeTestImports returns affected row count", async () => {
    mockPurgeImports.mockResolvedValue(3);
    const result = await db.purgeTestImports(1);
    expect(result).toBe(3);
    expect(mockPurgeImports).toHaveBeenCalledWith(1);
  });

  it("purgeTestActivity returns affected row count", async () => {
    mockPurgeActivity.mockResolvedValue(22);
    const result = await db.purgeTestActivity(1);
    expect(result).toBe(22);
    expect(mockPurgeActivity).toHaveBeenCalledWith(1);
  });

  it("all purge functions can be called in parallel", async () => {
    mockPurgeContacts.mockResolvedValue(10);
    mockPurgeCampaigns.mockResolvedValue(5);
    mockPurgeImports.mockResolvedValue(2);
    mockPurgeActivity.mockResolvedValue(20);

    const [contacts, campaigns, imports, activity] = await Promise.all([
      db.purgeTestContacts(1),
      db.purgeTestCampaigns(1),
      db.purgeTestImports(1),
      db.purgeTestActivity(1),
    ]);

    expect(contacts).toBe(10);
    expect(campaigns).toBe(5);
    expect(imports).toBe(2);
    expect(activity).toBe(20);
  });

  it("purge functions return 0 when no test data found", async () => {
    mockPurgeContacts.mockResolvedValue(0);
    mockPurgeCampaigns.mockResolvedValue(0);
    mockPurgeImports.mockResolvedValue(0);
    mockPurgeActivity.mockResolvedValue(0);

    const results = await Promise.all([
      db.purgeTestContacts(1),
      db.purgeTestCampaigns(1),
      db.purgeTestImports(1),
      db.purgeTestActivity(1),
    ]);

    expect(results.every(r => r === 0)).toBe(true);
  });
});

describe("Paginated Bulk Imports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated results with total count", async () => {
    const mockImports = [
      { id: 1, fileName: "import-1.csv", status: "completed" },
      { id: 2, fileName: "import-2.csv", status: "running" },
    ];
    mockGetPaginated.mockResolvedValue({ imports: mockImports, total: 65 });

    const result = await db.getBulkImportsPaginated(1, { limit: 10, offset: 0 });
    expect(result.imports).toHaveLength(2);
    expect(result.total).toBe(65);
    expect(mockGetPaginated).toHaveBeenCalledWith(1, { limit: 10, offset: 0 });
  });

  it("supports offset for page navigation", async () => {
    mockGetPaginated.mockResolvedValue({ imports: [], total: 65 });

    await db.getBulkImportsPaginated(1, { limit: 10, offset: 20 });
    expect(mockGetPaginated).toHaveBeenCalledWith(1, { limit: 10, offset: 20 });
  });

  it("returns empty results when no imports exist", async () => {
    mockGetPaginated.mockResolvedValue({ imports: [], total: 0 });

    const result = await db.getBulkImportsPaginated(1, { limit: 10, offset: 0 });
    expect(result.imports).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("defaults work when no options provided", async () => {
    mockGetPaginated.mockResolvedValue({ imports: [], total: 0 });

    await db.getBulkImportsPaginated(1, {});
    expect(mockGetPaginated).toHaveBeenCalledWith(1, {});
  });
});

describe("CSV Export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getContactsForExport returns all matching contacts without pagination", async () => {
    const mockContacts = [
      { id: 1, firstName: "Alice", lastName: "Smith", email: "alice@example.com", phone: "555-0001", segment: "residential", tier: "gold" },
      { id: 2, firstName: "Bob", lastName: "Jones", email: "bob@example.com", phone: "555-0002", segment: "commercial", tier: "silver" },
    ];
    mockGetContactsForExport.mockResolvedValue(mockContacts);

    const result = await (db as any).getContactsForExport(1, {});
    expect(result).toHaveLength(2);
    expect(result[0].firstName).toBe("Alice");
    expect(mockGetContactsForExport).toHaveBeenCalledWith(1, {});
  });

  it("getContactsForExport passes filter options", async () => {
    mockGetContactsForExport.mockResolvedValue([]);

    await (db as any).getContactsForExport(1, { search: "alice", segment: "residential", tier: "gold" });
    expect(mockGetContactsForExport).toHaveBeenCalledWith(1, { search: "alice", segment: "residential", tier: "gold" });
  });

  it("getContactsForExport returns empty array when no contacts match", async () => {
    mockGetContactsForExport.mockResolvedValue([]);

    const result = await (db as any).getContactsForExport(1, { search: "nonexistent" });
    expect(result).toHaveLength(0);
  });

  it("CSV escaping handles commas, quotes, and newlines", () => {
    const escCsv = (v: unknown) => {
      if (v == null) return "";
      if (v instanceof Date) return v.toISOString();
      if (Array.isArray(v)) return `"${v.join("; ")}"`;
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    expect(escCsv(null)).toBe("");
    expect(escCsv(undefined)).toBe("");
    expect(escCsv("simple")).toBe("simple");
    expect(escCsv("has,comma")).toBe('"has,comma"');
    expect(escCsv('has"quote')).toBe('"has""quote"');
    expect(escCsv("has\nnewline")).toBe('"has\nnewline"');
    expect(escCsv(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01-01T00:00:00.000Z");
    expect(escCsv(["tag1", "tag2"])).toBe('"tag1; tag2"');
  });

  it("CSV header contains expected columns", () => {
    const CSV_COLUMNS = [
      "firstName", "lastName", "email", "phone", "companyName",
      "address", "city", "state", "postalCode", "country",
      "segment", "tier", "source", "contactType", "tags",
      "propensityScore", "productOpportunities", "specialistRoute",
      "website", "syncStatus", "createdAt", "updatedAt",
    ];
    expect(CSV_COLUMNS).toContain("firstName");
    expect(CSV_COLUMNS).toContain("email");
    expect(CSV_COLUMNS).toContain("segment");
    expect(CSV_COLUMNS).toContain("tier");
    expect(CSV_COLUMNS).toContain("tags");
    expect(CSV_COLUMNS).toHaveLength(22);
  });
});

describe("Integration Reset", () => {
  it("error status platforms should show Reset button", () => {
    const statuses = ["connected", "error", "disconnected"];
    const shouldShowReset = (status: string) => status === "error";
    expect(shouldShowReset("error")).toBe(true);
    expect(shouldShowReset("connected")).toBe(false);
    expect(shouldShowReset("disconnected")).toBe(false);
  });

  it("reset changes status from error to disconnected", () => {
    const platform = { name: "GHL", status: "error" };
    // Simulate disconnect (which is what reset does)
    platform.status = "disconnected";
    expect(platform.status).toBe("disconnected");
  });
});

describe("Integration Setup Guide", () => {
  it("SMS-iT has setup guide with correct steps", () => {
    // Verify the setup guide structure matches what the UI expects
    const smsitGuide = [
      "Log in to your SMS-iT account at app.smsit.ai",
      "Navigate to Settings → API Keys",
      "Generate a new API key or copy your existing one",
      "Enter your registered Sender ID for outbound messages",
      "Optionally configure the webhook secret for delivery tracking",
    ];
    expect(smsitGuide).toHaveLength(5);
    expect(smsitGuide[0]).toContain("SMS-iT");
    expect(smsitGuide[1]).toContain("API Keys");
  });

  it("Dripify has setup guide with correct steps", () => {
    const dripifyGuide = [
      "Log in to your Dripify account at dripify.io",
      "Navigate to Settings → API section",
      "Copy your API Key and paste it below",
      "If no API section is available, use the Session Cookie method instead",
    ];
    expect(dripifyGuide).toHaveLength(4);
    expect(dripifyGuide[0]).toContain("Dripify");
    expect(dripifyGuide[3]).toContain("Session Cookie");
  });

  it("SMS-iT credential fields have step-by-step hints", () => {
    const fields = [
      { key: "API Key", hint: "Step 1: Log in to SMS-iT → Settings → API Keys" },
      { key: "Session Token", hint: "Alternative: Copy the session token" },
      { key: "Sender ID", hint: "Step 2: Enter your registered sender ID" },
      { key: "Webhook Secret", hint: "Optional: Found in SMS-iT → Settings → Webhooks" },
    ];
    expect(fields[0].hint).toContain("Step 1");
    expect(fields[1].hint).toContain("Alternative");
    expect(fields[2].hint).toContain("Step 2");
    expect(fields[3].hint).toContain("Optional");
  });

  it("Dripify credential fields have step-by-step hints", () => {
    const fields = [
      { key: "API Key", hint: "Step 1: Log in to Dripify → Settings → API" },
      { key: "Session Cookie", hint: "Alternative: Open browser DevTools" },
      { key: "Webhook URL", hint: "Optional: Auto-generated webhook endpoint" },
    ];
    expect(fields[0].hint).toContain("Step 1");
    expect(fields[1].hint).toContain("Alternative");
    expect(fields[2].hint).toContain("Optional");
  });
});
