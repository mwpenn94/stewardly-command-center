import { Router, Request, Response } from "express";
import {
  handleGhlWebhook,
  handleSmsitWebhook,
  handleDripifyWebhook,
  verifyGhlSignature,
  verifySmsitSignature,
  verifyDripifySignature,
} from "./services/webhooks";
import * as db from "./db";

const router = Router();

// ─── Middleware: raw body capture for signature verification ──────────────────
// Express json() already parsed body, but we need raw for HMAC.
// We store rawBody on the request via a custom property.
declare global {
  namespace Express {
    interface Request {
      rawBody?: string;
    }
  }
}

// ─── Helper: resolve owner user ID ──────────────────────────────────────────
// Webhooks are not authenticated via session, so we resolve the owner user.
async function getOwnerUserId(): Promise<number | null> {
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (!ownerOpenId) return null;
  const user = await db.getUserByOpenId(ownerOpenId);
  return user?.id ?? null;
}

// ─── Helper: get webhook secret from integration credentials ─────────────────
async function getWebhookSecret(
  userId: number,
  platform: string
): Promise<string | undefined> {
  const integrations = await db.getIntegrations(userId);
  const integration = integrations.find(
    (i: any) => i.platform === platform && i.status === "connected"
  );
  if (!integration?.credentials) return undefined;
  const creds =
    typeof integration.credentials === "string"
      ? JSON.parse(integration.credentials)
      : integration.credentials;
  return creds.webhookSecret || creds.webhook_secret || undefined;
}

// ─── GHL Webhook Endpoint ────────────────────────────────────────────────────
router.post("/api/webhooks/ghl", async (req: Request, res: Response) => {
  try {
    const userId = await getOwnerUserId();
    if (!userId) {
      res.status(500).json({ error: "Owner not configured" });
      return;
    }

    // Verify signature if secret is configured
    const secret = await getWebhookSecret(userId, "ghl");
    const signature = (req.headers["x-ghl-signature"] ||
      req.headers["x-highlevel-signature"]) as string | undefined;
    if (secret && !verifyGhlSignature(JSON.stringify(req.body), signature, secret)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const eventType =
      (req.headers["x-ghl-event"] as string) ||
      (req.body.event as string) ||
      (req.body.type as string) ||
      "unknown";

    const result = await handleGhlWebhook(userId, eventType, req.body);
    res.status(result.accepted ? 200 : 400).json(result);
  } catch (err: any) {
    console.error("[Webhook] GHL error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── SMS-iT Webhook Endpoint ─────────────────────────────────────────────────
router.post("/api/webhooks/smsit", async (req: Request, res: Response) => {
  try {
    const userId = await getOwnerUserId();
    if (!userId) {
      res.status(500).json({ error: "Owner not configured" });
      return;
    }

    const secret = await getWebhookSecret(userId, "smsit");
    const signature = (req.headers["x-smsit-signature"] ||
      req.headers["x-webhook-signature"]) as string | undefined;
    if (secret && !verifySmsitSignature(JSON.stringify(req.body), signature, secret)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const eventType =
      (req.headers["x-smsit-event"] as string) ||
      (req.body.event as string) ||
      (req.body.type as string) ||
      "unknown";

    const result = await handleSmsitWebhook(userId, eventType, req.body);
    res.status(result.accepted ? 200 : 400).json(result);
  } catch (err: any) {
    console.error("[Webhook] SMS-iT error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Dripify Webhook Endpoint ────────────────────────────────────────────────
router.post("/api/webhooks/dripify", async (req: Request, res: Response) => {
  try {
    const userId = await getOwnerUserId();
    if (!userId) {
      res.status(500).json({ error: "Owner not configured" });
      return;
    }

    const secret = await getWebhookSecret(userId, "dripify");
    const signature = (req.headers["x-dripify-signature"] ||
      req.headers["x-webhook-signature"]) as string | undefined;
    if (secret && !verifyDripifySignature(JSON.stringify(req.body), signature, secret)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const eventType =
      (req.headers["x-dripify-event"] as string) ||
      (req.body.event as string) ||
      (req.body.type as string) ||
      "unknown";

    const result = await handleDripifyWebhook(userId, eventType, req.body);
    res.status(result.accepted ? 200 : 400).json(result);
  } catch (err: any) {
    console.error("[Webhook] Dripify error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check endpoint for webhook testing ───────────────────────────────
router.get("/api/webhooks/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    endpoints: [
      { platform: "ghl", url: "/api/webhooks/ghl", methods: ["POST"] },
      { platform: "smsit", url: "/api/webhooks/smsit", methods: ["POST"] },
      { platform: "dripify", url: "/api/webhooks/dripify", methods: ["POST"] },
    ],
    timestamp: Date.now(),
  });
});

export { router as webhookRouter };
