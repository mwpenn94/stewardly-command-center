/**
 * Credential Helper
 * 
 * Reads platform credentials from the integrations DB table
 * and converts them to the typed credential objects used by each service.
 * 
 * DB credential JSON keys:
 *   GHL:     { jwt, authToken, apiKey, refreshToken, locationId }
 *   SMS-iT:  { apiToken }
 *   Dripify: { apiToken, refreshToken, email, apiKey, expirationTime }
 */

import * as db from "../db";
import type { GhlCredentials } from "./ghl";
import type { SmsitCredentials } from "./smsit";
import type { DripifyCredentials } from "./dripify";

/**
 * Get GHL credentials for a user from the DB.
 * Supports both API key and JWT token auth methods.
 */
export async function getGhlCredentials(userId: number): Promise<GhlCredentials | null> {
  const creds = await db.getIntegrationCredentials(userId, "ghl");
  if (!creds) return null;

  const result: GhlCredentials = {
    locationId: creds.locationId || creds["Location ID"] || "",
  };

  // API Key auth
  if (creds.apiKey || creds["API Key"]) {
    result.apiKey = creds.apiKey || creds["API Key"];
  }

  // JWT auth
  if (creds.jwt || creds["JWT Token"]) {
    result.jwt = creds.jwt || creds["JWT Token"];
  }

  // Optional fields
  if (creds.companyId || creds["Company ID"]) result.companyId = creds.companyId || creds["Company ID"];
  if (creds.refreshToken || creds["Refresh Token"]) result.refreshToken = creds.refreshToken || creds["Refresh Token"];
  if (creds.authToken || creds["Auth Token"]) result.authToken = creds.authToken || creds["Auth Token"];

  if (!result.locationId && !result.apiKey && !result.jwt) return null;
  return result;
}

/**
 * Get SMS-iT credentials for a user from the DB.
 */
export async function getSmsitCredentials(userId: number): Promise<SmsitCredentials | null> {
  const creds = await db.getIntegrationCredentials(userId, "smsit");
  if (!creds) return null;

  // Support multiple key names
  const apiKey = creds.apiToken || creds["API Key"] || creds["Session Token"] || creds.apiKey;
  if (!apiKey) return null;

  return {
    apiKey,
    sessionToken: creds["Session Token"] || creds.sessionToken || undefined,
  };
}

/**
 * Get Dripify credentials for a user from the DB.
 */
export async function getDripifyCredentials(userId: number): Promise<DripifyCredentials | null> {
  const creds = await db.getIntegrationCredentials(userId, "dripify");
  if (!creds) return null;

  // Support multiple key names — Dripify uses Firebase tokens
  const apiKey = creds.apiToken || creds["API Key"] || creds["Session Cookie"] || creds.apiKey;
  if (!apiKey) return null;

  return {
    apiKey,
    userId: creds["User ID"] || creds.uid || undefined,
    email: creds["Email"] || creds.email || undefined,
    sessionCookie: creds["Session Cookie"] || creds.sessionCookie || undefined,
    expiresAt: creds["Expires At"] || creds.expirationTime ? Number(creds["Expires At"] || creds.expirationTime) : undefined,
  };
}

/**
 * Get all platform credentials for a user.
 */
export async function getAllCredentials(userId: number): Promise<{
  ghl: GhlCredentials | null;
  smsit: SmsitCredentials | null;
  dripify: DripifyCredentials | null;
}> {
  const [ghl, smsit, dripify] = await Promise.all([
    getGhlCredentials(userId),
    getSmsitCredentials(userId),
    getDripifyCredentials(userId),
  ]);
  return { ghl, smsit, dripify };
}

/**
 * Update GHL JWT token in the DB (for token refresh/paste).
 */
export async function updateGhlJwt(userId: number, jwt: string, additionalTokens?: {
  refreshToken?: string;
  authToken?: string;
}): Promise<void> {
  const existing = await db.getIntegrationCredentials(userId, "ghl");
  const creds = existing || {};
  
  creds.jwt = jwt;
  if (additionalTokens?.refreshToken) creds.refreshToken = additionalTokens.refreshToken;
  if (additionalTokens?.authToken) creds.authToken = additionalTokens.authToken;

  await db.upsertIntegration({
    userId,
    platform: "ghl",
    credentials: JSON.stringify(creds),
    label: "GoHighLevel",
    status: "connected",
    lastCheckedAt: new Date(),
  } as any);
}
