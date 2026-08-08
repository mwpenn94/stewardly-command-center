import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getIntegrationCredentials: vi.fn(),
  upsertIntegration: vi.fn(),
}));

import * as db from "./db";
import {
  getGhlCredentials,
  getSmsitCredentials,
  getDripifyCredentials,
  getAllCredentials,
  updateGhlJwt,
} from "./services/credentials";

const mockGetCreds = db.getIntegrationCredentials as ReturnType<typeof vi.fn>;
const mockUpsert = (db as any).upsertIntegration as ReturnType<typeof vi.fn>;

describe("Credentials Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GHL Credentials ─────────────────────────────────────────────────
  describe("getGhlCredentials", () => {
    it("returns null when no credentials found", async () => {
      mockGetCreds.mockResolvedValue(null);
      const result = await getGhlCredentials(1);
      expect(result).toBeNull();
      expect(mockGetCreds).toHaveBeenCalledWith(1, "ghl");
    });

    it("maps camelCase DB keys (jwt, authToken, apiKey, locationId)", async () => {
      mockGetCreds.mockResolvedValue({
        jwt: "test-jwt-token",
        authToken: "test-auth-token",
        apiKey: "test-api-key",
        refreshToken: "test-refresh",
        locationId: "loc-123",
      });
      const result = await getGhlCredentials(1);
      expect(result).toEqual({
        locationId: "loc-123",
        apiKey: "test-api-key",
        jwt: "test-jwt-token",
        refreshToken: "test-refresh",
        authToken: "test-auth-token",
      });
    });

    it("maps legacy human-readable DB keys (Location ID, API Key, JWT Token)", async () => {
      mockGetCreds.mockResolvedValue({
        "JWT Token": "legacy-jwt",
        "API Key": "legacy-api-key",
        "Location ID": "legacy-loc",
        "Refresh Token": "legacy-refresh",
        "Auth Token": "legacy-auth",
        "Company ID": "legacy-company",
      });
      const result = await getGhlCredentials(1);
      expect(result).toEqual({
        locationId: "legacy-loc",
        apiKey: "legacy-api-key",
        jwt: "legacy-jwt",
        refreshToken: "legacy-refresh",
        authToken: "legacy-auth",
        companyId: "legacy-company",
      });
    });

    it("prefers camelCase keys over legacy keys when both present", async () => {
      mockGetCreds.mockResolvedValue({
        jwt: "new-jwt",
        "JWT Token": "old-jwt",
        locationId: "new-loc",
        "Location ID": "old-loc",
      });
      const result = await getGhlCredentials(1);
      expect(result?.jwt).toBe("new-jwt");
      expect(result?.locationId).toBe("new-loc");
    });

    it("returns null when no locationId, apiKey, or jwt present", async () => {
      mockGetCreds.mockResolvedValue({
        someOtherField: "value",
      });
      const result = await getGhlCredentials(1);
      expect(result).toBeNull();
    });
  });

  // ─── SMS-iT Credentials ──────────────────────────────────────────────
  describe("getSmsitCredentials", () => {
    it("returns null when no credentials found", async () => {
      mockGetCreds.mockResolvedValue(null);
      const result = await getSmsitCredentials(1);
      expect(result).toBeNull();
    });

    it("maps apiToken key (current DB format)", async () => {
      mockGetCreds.mockResolvedValue({
        apiToken: "SMSIT_c37e4060fbae94e99644e8a7c2b7c2f0",
      });
      const result = await getSmsitCredentials(1);
      expect(result).toEqual({
        apiKey: "SMSIT_c37e4060fbae94e99644e8a7c2b7c2f0",
        sessionToken: undefined,
      });
    });

    it("maps legacy API Key format", async () => {
      mockGetCreds.mockResolvedValue({
        "API Key": "legacy-smsit-key",
        "Session Token": "legacy-session",
      });
      const result = await getSmsitCredentials(1);
      expect(result).toEqual({
        apiKey: "legacy-smsit-key",
        sessionToken: "legacy-session",
      });
    });

    it("returns null when no apiToken or API Key present", async () => {
      mockGetCreds.mockResolvedValue({
        unrelatedField: "value",
      });
      const result = await getSmsitCredentials(1);
      expect(result).toBeNull();
    });
  });

  // ─── Dripify Credentials ─────────────────────────────────────────────
  describe("getDripifyCredentials", () => {
    it("returns null when no credentials found", async () => {
      mockGetCreds.mockResolvedValue(null);
      const result = await getDripifyCredentials(1);
      expect(result).toBeNull();
    });

    it("maps Firebase token format (apiToken, refreshToken, email, expirationTime)", async () => {
      mockGetCreds.mockResolvedValue({
        apiToken: "firebase-access-token",
        refreshToken: "firebase-refresh",
        email: "user@example.com",
        apiKey: "firebase-api-key",
        expirationTime: 1776050000000,
      });
      const result = await getDripifyCredentials(1);
      expect(result).toEqual({
        apiKey: "firebase-access-token",
        userId: undefined,
        email: "user@example.com",
        sessionCookie: undefined,
        expiresAt: 1776050000000,
      });
    });

    it("maps legacy Session Cookie format", async () => {
      mockGetCreds.mockResolvedValue({
        "Session Cookie": "legacy-cookie",
        "User ID": "user-123",
        "Email": "legacy@example.com",
        "Expires At": "1776050000000",
      });
      const result = await getDripifyCredentials(1);
      expect(result).toEqual({
        apiKey: "legacy-cookie",
        userId: "user-123",
        email: "legacy@example.com",
        sessionCookie: "legacy-cookie",
        expiresAt: 1776050000000,
      });
    });

    it("returns null when no apiToken, API Key, or Session Cookie present", async () => {
      mockGetCreds.mockResolvedValue({
        unrelatedField: "value",
      });
      const result = await getDripifyCredentials(1);
      expect(result).toBeNull();
    });
  });

  // ─── getAllCredentials ────────────────────────────────────────────────
  describe("getAllCredentials", () => {
    it("returns all platform credentials in parallel", async () => {
      mockGetCreds
        .mockResolvedValueOnce({ jwt: "ghl-jwt", locationId: "loc-1" })
        .mockResolvedValueOnce({ apiToken: "smsit-token" })
        .mockResolvedValueOnce({ apiToken: "dripify-token" });

      const result = await getAllCredentials(1);
      expect(result.ghl).not.toBeNull();
      expect(result.ghl?.jwt).toBe("ghl-jwt");
      expect(result.smsit).not.toBeNull();
      expect(result.smsit?.apiKey).toBe("smsit-token");
      expect(result.dripify).not.toBeNull();
      expect(result.dripify?.apiKey).toBe("dripify-token");
    });

    it("returns nulls when no credentials exist", async () => {
      mockGetCreds.mockResolvedValue(null);
      const result = await getAllCredentials(1);
      expect(result).toEqual({ ghl: null, smsit: null, dripify: null });
    });
  });

  // ─── updateGhlJwt ────────────────────────────────────────────────────
  describe("updateGhlJwt", () => {
    it("updates JWT token in existing credentials", async () => {
      mockGetCreds.mockResolvedValue({
        jwt: "old-jwt",
        locationId: "loc-1",
        apiKey: "existing-key",
      });
      mockUpsert.mockResolvedValue(undefined);

      await updateGhlJwt(1, "new-jwt", {
        refreshToken: "new-refresh",
        authToken: "new-auth",
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          platform: "ghl",
          status: "connected",
        })
      );

      const savedCreds = JSON.parse(mockUpsert.mock.calls[0][0].credentials);
      expect(savedCreds.jwt).toBe("new-jwt");
      expect(savedCreds.refreshToken).toBe("new-refresh");
      expect(savedCreds.authToken).toBe("new-auth");
      expect(savedCreds.locationId).toBe("loc-1");
    });

    it("creates new credentials when none exist", async () => {
      mockGetCreds.mockResolvedValue(null);
      mockUpsert.mockResolvedValue(undefined);

      await updateGhlJwt(1, "fresh-jwt");

      expect(mockUpsert).toHaveBeenCalled();
      const savedCreds = JSON.parse(mockUpsert.mock.calls[0][0].credentials);
      expect(savedCreds.jwt).toBe("fresh-jwt");
    });
  });
});
