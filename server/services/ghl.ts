/**
 * GoHighLevel API Service
 * 
 * Real HTTP client for GHL internal API (backend.leadconnectorhq.com).
 * Supports both public API (services.leadconnectorhq.com) and internal API.
 * Handles token management, contact CRUD, duplicate detection, and rate limiting.
 */

import { Agent, fetch as undiciFetch } from "undici";

// ─── Configuration ──────────────────────────────────────────────────────────
const GHL_INTERNAL_BASE = "https://backend.leadconnectorhq.com";
const GHL_PUBLIC_BASE = "https://services.leadconnectorhq.com";

// SSL-bypassing agent for internal API (sandbox SSL issue)
const insecureAgent = new Agent({
  connect: { rejectUnauthorized: false },
});

// ─── Types ──────────────────────────────────────────────────────────────────
export interface GhlCredentials {
  apiKey?: string;       // Public API key (v2)
  jwt?: string;          // Internal API JWT token (from browser localStorage)
  locationId: string;
  companyId?: string;
  refreshToken?: string;
  authToken?: string;
}

export interface GhlContactPayload {
  locationId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  companyName?: string;
  tags?: string[];
  customFields?: Array<{ key: string; field_value: string }>;
}

export interface GhlApiResult {
  success: boolean;
  action?: "created" | "updated" | "skipped" | "deleted";
  contactId?: string;
  error?: string;
  statusCode?: number;
}

export interface GhlSyncProgress {
  processed: number;
  created: number;
  updated: number;
  failed: number;
  skipped: number;
  total: number;
  rate: number;      // contacts per minute
  eta: number;       // minutes remaining
  tokenMinutes: number;
  isRunning: boolean;
  isPaused: boolean;
  lastRow: number;
  startTime: string;
  errors: Array<{ row: number; error: string; email?: string; ts: string }>;
}

// ─── JWT Utilities ──────────────────────────────────────────────────────────
export function decodeJwt(jwt: string): Record<string, any> {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return {};
    const payload = parts[1] + "=".repeat(4 - (parts[1].length % 4));
    return JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
  } catch {
    return {};
  }
}

export function getJwtExpiry(jwt: string): number {
  const decoded = decodeJwt(jwt);
  return decoded.exp || 0;
}

export function getJwtRemainingMinutes(jwt: string): number {
  const exp = getJwtExpiry(jwt);
  if (!exp) return 0;
  return Math.max(0, (exp - Math.floor(Date.now() / 1000)) / 60);
}

export function extractLocationFromJwt(jwt: string): string | null {
  const decoded = decodeJwt(jwt);
  return decoded.locationId || decoded.location_id || null;
}

export function extractCompanyFromJwt(jwt: string): string | null {
  const decoded = decodeJwt(jwt);
  return decoded.companyId || decoded.company_id || null;
}

// ─── Phone Formatting ───────────────────────────────────────────────────────
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[-() \s]/g, "").trim();
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;
  return cleaned;
}

// ─── Headers ────────────────────────────────────────────────────────────────
function getInternalHeaders(jwt: string): Record<string, string> {
  return {
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
    Source: "WEB_USER",
    Channel: "APP",
    Version: "2021-07-28",
  };
}

function getPublicHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Version: "2021-07-28",
  };
}

// ─── Low-level fetch wrapper ────────────────────────────────────────────────
async function ghlFetch(
  url: string,
  options: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    timeout?: number;
  }
): Promise<{ status: number; data: any; text: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 20000);

  try {
    const res = await undiciFetch(url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
      dispatcher: insecureAgent,
    });
    clearTimeout(timeoutId);
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { status: res.status, data, text };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return { status: 0, data: { error: "timeout" }, text: "Request timed out" };
    }
    return { status: 0, data: { error: err.message }, text: err.message };
  }
}

// ─── Contact CRUD ───────────────────────────────────────────────────────────

/**
 * Create a contact in GHL. Returns the contactId on success.
 * On duplicate (400), extracts contactId from meta for update.
 */
export async function createContact(
  creds: GhlCredentials,
  payload: GhlContactPayload
): Promise<GhlApiResult> {
  const useInternal = !!creds.jwt;
  const baseUrl = useInternal ? GHL_INTERNAL_BASE : GHL_PUBLIC_BASE;
  const headers = useInternal ? getInternalHeaders(creds.jwt!) : getPublicHeaders(creds.apiKey!);

  const body = { ...payload, locationId: creds.locationId };

  const res = await ghlFetch(`${baseUrl}/contacts/`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (res.status === 200 || res.status === 201) {
    const contactId = res.data?.contact?.id || res.data?.id;
    return { success: true, action: "created", contactId };
  }

  if (res.status === 400 || res.status === 422) {
    const rawMsg = res.data?.message || "";
    const msg = (Array.isArray(rawMsg) ? rawMsg.join(" ") : String(rawMsg)).toLowerCase();

    if (msg.includes("duplicate") || msg.includes("already exists")) {
      const contactId = res.data?.meta?.contactId;
      if (contactId) {
        return { success: false, action: "skipped", contactId, error: "duplicate", statusCode: res.status };
      }
    }
    return { success: false, error: `${res.status}: ${msg.slice(0, 200)}`, statusCode: res.status };
  }

  if (res.status === 401) {
    return { success: false, error: "auth_expired", statusCode: 401 };
  }

  if (res.status === 429) {
    return { success: false, error: "rate_limited", statusCode: 429 };
  }

  return { success: false, error: `${res.status}: ${res.text.slice(0, 200)}`, statusCode: res.status };
}

/**
 * Update a contact in GHL by contactId.
 */
export async function updateContact(
  creds: GhlCredentials,
  contactId: string,
  payload: GhlContactPayload
): Promise<GhlApiResult> {
  const useInternal = !!creds.jwt;
  const baseUrl = useInternal ? GHL_INTERNAL_BASE : GHL_PUBLIC_BASE;
  const headers = useInternal ? getInternalHeaders(creds.jwt!) : getPublicHeaders(creds.apiKey!);

  // Do NOT include locationId in PUT body for internal API
  const { locationId, ...updateBody } = payload;

  const res = await ghlFetch(`${baseUrl}/contacts/${contactId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(updateBody),
  });

  if (res.status === 200 || res.status === 201) {
    return { success: true, action: "updated", contactId };
  }

  if (res.status === 401) {
    return { success: false, error: "auth_expired", statusCode: 401 };
  }

  return { success: false, error: `update_${res.status}: ${res.text.slice(0, 200)}`, statusCode: res.status };
}

/**
 * Delete a contact from GHL.
 */
export async function deleteContact(
  creds: GhlCredentials,
  contactId: string
): Promise<GhlApiResult> {
  const useInternal = !!creds.jwt;
  const baseUrl = useInternal ? GHL_INTERNAL_BASE : GHL_PUBLIC_BASE;
  const headers = useInternal ? getInternalHeaders(creds.jwt!) : getPublicHeaders(creds.apiKey!);

  const res = await ghlFetch(`${baseUrl}/contacts/${contactId}`, {
    method: "DELETE",
    headers,
  });

  if (res.status === 200 || res.status === 201 || res.status === 204) {
    return { success: true, action: "deleted", contactId };
  }

  return { success: false, error: `delete_${res.status}: ${res.text.slice(0, 200)}`, statusCode: res.status };
}

/**
 * Get a single contact from GHL by ID.
 */
export async function getContact(
  creds: GhlCredentials,
  contactId: string
): Promise<{ success: boolean; contact?: any; error?: string }> {
  const useInternal = !!creds.jwt;
  const baseUrl = useInternal ? GHL_INTERNAL_BASE : GHL_PUBLIC_BASE;
  const headers = useInternal ? getInternalHeaders(creds.jwt!) : getPublicHeaders(creds.apiKey!);

  const res = await ghlFetch(`${baseUrl}/contacts/${contactId}`, {
    method: "GET",
    headers,
  });

  if (res.status === 200) {
    return { success: true, contact: res.data?.contact || res.data };
  }

  return { success: false, error: `${res.status}: ${res.text.slice(0, 200)}` };
}

/**
 * Search contacts in GHL.
 */
export async function searchContacts(
  creds: GhlCredentials,
  query: string,
  limit = 20
): Promise<{ success: boolean; contacts?: any[]; total?: number; error?: string }> {
  const useInternal = !!creds.jwt;
  const baseUrl = useInternal ? GHL_INTERNAL_BASE : GHL_PUBLIC_BASE;
  const headers = useInternal ? getInternalHeaders(creds.jwt!) : getPublicHeaders(creds.apiKey!);

  const url = `${baseUrl}/contacts/?locationId=${creds.locationId}&limit=${limit}&query=${encodeURIComponent(query)}`;

  const res = await ghlFetch(url, { method: "GET", headers });

  if (res.status === 200) {
    return {
      success: true,
      contacts: res.data?.contacts || [],
      total: res.data?.meta?.total || res.data?.total || 0,
    };
  }

  return { success: false, error: `${res.status}: ${res.text.slice(0, 200)}` };
}

/**
 * Create or update a contact — the smart upsert used by the sync engine.
 * POST first; if duplicate, extract contactId and PUT update.
 */
export async function upsertContact(
  creds: GhlCredentials,
  payload: GhlContactPayload,
  maxRetries = 3
): Promise<GhlApiResult> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const createResult = await createContact(creds, payload);

    if (createResult.success) {
      return createResult; // Created successfully
    }

    if (createResult.error === "auth_expired") {
      return createResult; // Caller must handle token refresh
    }

    if (createResult.error === "rate_limited") {
      await sleep((attempt + 1) * 8000);
      continue;
    }

    // Duplicate — try to update
    if (createResult.error === "duplicate" && createResult.contactId) {
      const updateResult = await updateContact(creds, createResult.contactId, payload);
      if (updateResult.success) return updateResult;
      if (updateResult.error === "auth_expired") return updateResult;
      // Update failed — retry
      if (attempt < maxRetries - 1) {
        await sleep(500);
        continue;
      }
      return updateResult;
    }

    // Other error — retry with backoff
    if (attempt < maxRetries - 1) {
      await sleep((attempt + 1) * 1000);
      continue;
    }

    return createResult;
  }

  return { success: false, error: "max_retries_exceeded" };
}

/**
 * Test GHL connection with given credentials.
 */
export async function testConnection(creds: GhlCredentials): Promise<{ success: boolean; message: string }> {
  try {
    if (creds.jwt) {
      const remaining = getJwtRemainingMinutes(creds.jwt);
      if (remaining < 1) {
        return { success: false, message: `JWT token expired (${remaining.toFixed(0)} minutes remaining)` };
      }
    }

    const result = await searchContacts(creds, "", 1);
    if (result.success) {
      return { success: true, message: `Connected to GHL. ${result.total || 0} contacts in location.` };
    }
    return { success: false, message: result.error || "Connection failed" };
  } catch (err: any) {
    return { success: false, message: `Connection error: ${err.message}` };
  }
}

// ─── Token Refresh ──────────────────────────────────────────────────────────
export async function refreshToken(creds: GhlCredentials): Promise<{
  success: boolean;
  newCreds?: Partial<GhlCredentials>;
  error?: string;
}> {
  if (!creds.refreshToken || !creds.authToken) {
    return { success: false, error: "No refresh token available" };
  }

  const res = await ghlFetch(`${GHL_INTERNAL_BASE}/auth/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken: creds.refreshToken }),
  });

  if (res.status === 200 || res.status === 201) {
    const newCreds: Partial<GhlCredentials> = {};
    if (res.data.jwt) newCreds.jwt = res.data.jwt;
    if (res.data.refreshToken) newCreds.refreshToken = res.data.refreshToken;
    if (res.data.authToken) newCreds.authToken = res.data.authToken;
    return { success: true, newCreds };
  }

  return { success: false, error: `Refresh failed: ${res.status}` };
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build a GHL contact payload from a CSV row (matching the standalone sync script format).
 */
export function buildPayloadFromCsvRow(row: Record<string, string>, locationId: string): GhlContactPayload {
  const payload: GhlContactPayload = {
    locationId,
    firstName: (row.firstName || "").trim(),
    lastName: (row.lastName || "").trim(),
    email: (row.email || "").trim().toLowerCase(),
    phone: formatPhone(row.phone || ""),
    address1: (row.address1 || "").trim(),
    city: (row.city || "").trim(),
    state: (row.state || "").trim(),
    postalCode: (row.postalCode || "").trim(),
    companyName: (row.companyName || "").trim(),
    tags: (row.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean),
  };

  const customFields: Array<{ key: string; field_value: string }> = [];
  const customFieldKeys = [
    "wb_propensity_score", "wb_tier", "wb_segment", "wb_product_opportunities",
    "wb_campaign", "wb_specialist_route", "wb_premium_financing",
    "wb_original_score", "wb_region",
  ];
  for (const field of customFieldKeys) {
    const val = (row[field] || "").trim();
    if (val) customFields.push({ key: field, field_value: val });
  }
  if (customFields.length > 0) payload.customFields = customFields;

  // Remove empty values (except tags which can be empty array)
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k === "tags" || v) cleaned[k] = v;
  }
  return cleaned as GhlContactPayload;
}
