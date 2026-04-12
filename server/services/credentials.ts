/**
 * Credential Helper
 * 
 * Reads platform credentials from the integrations DB table
 * and converts them to the typed credential objects used by each service.
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
    locationId: creds["Location ID"] || "",
  };

  // API Key auth (public API)
  if (creds["API Key"]) {
    result.apiKey = creds["API Key"];
  }

  // JWT auth (internal API — failover)
  if (creds["JWT Token"] || creds["jwt"]) {
    result.jwt = creds["JWT Token"] || creds["jwt"];
  }

  // Optional fields
  if (creds["Company ID"]) result.companyId = creds["Company ID"];
  if (creds["Refresh Token"]) result.refreshToken = creds["Refresh Token"];
  if (creds["Auth Token"]) result.authToken = creds["Auth Token"];

  if (!result.locationId && !result.apiKey && !result.jwt) return null;
  return result;
}

/**
 * Get SMS-iT credentials for a user from the DB.
 */
export async function getSmsitCredentials(userId: number): Promise<SmsitCredentials | null> {
  const creds = await db.getIntegrationCredentials(userId, "smsit");
  if (!creds) return null;

  // Support both API Key and Session Token as failover
  const apiKey = creds["API Key"] || creds["Session Token"];
  if (!apiKey) return null;

  return {
    apiKey,
    senderId: creds["Sender ID"] || undefined,
  };
}

/**
 * Get Dripify credentials for a user from the DB.
 */
export async function getDripifyCredentials(userId: number): Promise<DripifyCredentials | null> {
  const creds = await db.getIntegrationCredentials(userId, "dripify");
  if (!creds) return null;

  // Support both API Key and Session Cookie as failover
  const apiKey = creds["API Key"] || creds["Session Cookie"];
  if (!apiKey) return null;

  return {
    apiKey,
    webhookUrl: creds["Webhook URL"] || undefined,
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
  
  creds["JWT Token"] = jwt;
  if (additionalTokens?.refreshToken) creds["Refresh Token"] = additionalTokens.refreshToken;
  if (additionalTokens?.authToken) creds["Auth Token"] = additionalTokens.authToken;

  await db.upsertIntegration({
    userId,
    platform: "ghl",
    credentials: JSON.stringify(creds),
    label: "GoHighLevel",
    status: "connected",
    lastCheckedAt: new Date(),
  } as any);
}
