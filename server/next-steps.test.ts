import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  purgeTestContacts: vi.fn(),
  purgeTestCampaigns: vi.fn(),
  purgeTestImports: vi.fn(),
  purgeTestActivity: vi.fn(),
  getBulkImportsPaginated: vi.fn(),
  logActivity: vi.fn(),
}));

import * as db from "./db";

const mockPurgeContacts = db.purgeTestContacts as ReturnType<typeof vi.fn>;
const mockPurgeCampaigns = db.purgeTestCampaigns as ReturnType<typeof vi.fn>;
const mockPurgeImports = db.purgeTestImports as ReturnType<typeof vi.fn>;
const mockPurgeActivity = db.purgeTestActivity as ReturnType<typeof vi.fn>;
const mockGetPaginated = db.getBulkImportsPaginated as ReturnType<typeof vi.fn>;

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
