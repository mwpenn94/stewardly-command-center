import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as ghlService from "./services/ghl";
import * as smsitService from "./services/smsit";
import * as dripifyService from "./services/dripify";
import * as campaignEngine from "./services/campaignEngine";
import * as credentialHelper from "./services/credentials";
import { syncWorker } from "./services/syncWorker";
import { storagePut } from "./storage";
import * as orchestrator from "./services/orchestrator";
import { syncScheduler } from "./services/syncScheduler";
import * as aiEngine from "./services/aiEngine";

const PLATFORMS_LABELS: Record<string, string> = {
  ghl: "GoHighLevel",
  dripify: "Dripify",
  linkedin: "LinkedIn",
  smsit: "SMS-iT",
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Dashboard ───────────────────────────────────────────────────────
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getDashboardStats(ctx.user.id);
    }),
    contactStats: protectedProcedure.query(async ({ ctx }) => {
      return db.getContactStats(ctx.user.id);
    }),
  }),

  // ─── Contacts (Real GHL CRUD) ───────────────────────────────────────
  contacts: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        segment: z.string().optional(),
        tier: z.string().optional(),
        limit: z.number().min(1).max(200).optional(),
        offset: z.number().min(0).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return db.getContacts(ctx.user.id, input || {});
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getContactById(input.id, ctx.user.id);
      }),
    create: protectedProcedure
      .input(z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        companyName: z.string().optional(),
        segment: z.string().optional(),
        tier: z.string().optional(),
        tags: z.array(z.string()).optional(),
        syncToGhl: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { syncToGhl, ...contactData } = input;

        // Create in local DB first
        const id = await db.createContact({
          ...contactData,
          userId: ctx.user.id,
          tags: contactData.tags ? JSON.stringify(contactData.tags) : null,
          syncStatus: "local_only",
        } as any);

        // If syncToGhl is true, also push to GHL
        let ghlContactId: string | undefined;
        if (syncToGhl !== false) {
          const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
          if (ghlCreds && (ghlCreds.apiKey || ghlCreds.jwt)) {
            try {
              const payload: ghlService.GhlContactPayload = {
                locationId: ghlCreds.locationId,
                firstName: contactData.firstName,
                lastName: contactData.lastName,
                email: contactData.email,
                phone: contactData.phone ? ghlService.formatPhone(contactData.phone) : undefined,
                address1: contactData.address,
                city: contactData.city,
                state: contactData.state,
                postalCode: contactData.postalCode,
                companyName: contactData.companyName,
                tags: contactData.tags,
              };
              const result = await ghlService.upsertContact(ghlCreds, payload);
              if (result.success && result.contactId) {
                ghlContactId = result.contactId;
                await db.updateContact(id!, ctx.user.id, {
                  ghlContactId: result.contactId,
                  syncStatus: "synced",
                  lastSyncedAt: new Date(),
                } as any);
              } else if (result.contactId) {
                // Duplicate — still link the GHL ID
                ghlContactId = result.contactId;
                await db.updateContact(id!, ctx.user.id, {
                  ghlContactId: result.contactId,
                  syncStatus: "synced",
                  lastSyncedAt: new Date(),
                } as any);
              }
            } catch (err: any) {
              console.error("[Contacts] GHL sync failed:", err.message);
              await db.updateContact(id!, ctx.user.id, { syncStatus: "error" } as any);
            }
          }
        }

        await db.logActivity({
          userId: ctx.user.id,
          type: "sync",
          action: "contact_created",
          description: `Created contact ${contactData.firstName || ""} ${contactData.lastName || ""}`.trim() +
            (ghlContactId ? ` (synced to GHL: ${ghlContactId})` : ""),
          severity: "success",
        });
        return { id, ghlContactId };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        companyName: z.string().optional(),
        segment: z.string().optional(),
        tier: z.string().optional(),
        tags: z.array(z.string()).optional(),
        syncToGhl: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, syncToGhl, ...data } = input;

        // Update local DB
        await db.updateContact(id, ctx.user.id, {
          ...data,
          tags: data.tags ? JSON.stringify(data.tags) : undefined,
        } as any);

        // Sync to GHL if requested and contact has a GHL ID
        if (syncToGhl !== false) {
          const contact = await db.getContactById(id, ctx.user.id);
          if (contact?.ghlContactId) {
            const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
            if (ghlCreds && (ghlCreds.apiKey || ghlCreds.jwt)) {
              try {
                const payload: ghlService.GhlContactPayload = {
                  firstName: data.firstName,
                  lastName: data.lastName,
                  email: data.email,
                  phone: data.phone ? ghlService.formatPhone(data.phone) : undefined,
                  address1: data.address,
                  city: data.city,
                  state: data.state,
                  postalCode: data.postalCode,
                  companyName: data.companyName,
                  tags: data.tags,
                };
                const result = await ghlService.updateContact(ghlCreds, contact.ghlContactId, payload);
                if (result.success) {
                  await db.updateContact(id, ctx.user.id, {
                    syncStatus: "synced",
                    lastSyncedAt: new Date(),
                  } as any);
                }
              } catch (err: any) {
                console.error("[Contacts] GHL update failed:", err.message);
              }
            }
          }
        }

        await db.logActivity({
          userId: ctx.user.id,
          type: "sync",
          action: "contact_updated",
          description: `Updated contact #${id}`,
          severity: "info",
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Also delete from GHL if synced
        const contact = await db.getContactById(input.id, ctx.user.id);
        if (contact?.ghlContactId) {
          const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
          if (ghlCreds && (ghlCreds.apiKey || ghlCreds.jwt)) {
            try {
              await ghlService.deleteContact(ghlCreds, contact.ghlContactId);
            } catch (err: any) {
              console.error("[Contacts] GHL delete failed:", err.message);
            }
          }
        }

        await db.deleteContact(input.id, ctx.user.id);
        await db.logActivity({
          userId: ctx.user.id,
          type: "sync",
          action: "contact_deleted",
          description: `Deleted contact #${input.id}` + (contact?.ghlContactId ? ` (GHL: ${contact.ghlContactId})` : ""),
          severity: "warning",
        });
        return { success: true };
      }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getContactStats(ctx.user.id);
    }),
    // Search GHL contacts directly (pull from GHL)
    searchGhl: protectedProcedure
      .input(z.object({ query: z.string(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
        if (!ghlCreds) return { contacts: [], error: "GHL not configured" };
        const result = await ghlService.searchContacts(ghlCreds, input.query, input.limit || 20);
        return result;
      }),
    // Pull a batch of contacts from GHL (polling-based bidirectional sync)
    pullBatch: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional(), startAfterId: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
        if (!ghlCreds) throw new Error("GHL not configured");
        const result = await ghlService.listContacts(ghlCreds, { limit: input.limit || 20, startAfterId: input.startAfterId });
        if (!result.success) throw new Error(result.error || "Failed to list GHL contacts");

        let synced = 0;
        let skipped = 0;
        for (const c of result.contacts || []) {
          try {
            // Check if contact already exists locally
            const existingResult = await db.getContacts(ctx.user.id, { search: c.email || c.id, limit: 1 });
            if (existingResult.contacts.length > 0) {
              skipped++;
              continue;
            }
            await db.createContact({
              userId: ctx.user.id,
              ghlContactId: c.id,
              firstName: c.firstName || "",
              lastName: c.lastName || "",
              email: c.email || "",
              phone: c.phone || "",
              address: c.address1 || "",
              city: c.city || "",
              state: c.state || "",
              postalCode: c.postalCode || "",
              companyName: c.companyName || "",
              tags: c.tags ? JSON.stringify(c.tags) : null,
              syncStatus: "synced",
              lastSyncedAt: new Date(),
            } as any);
            synced++;
          } catch (err) {
            skipped++;
          }
        }

        await db.logActivity({
          userId: ctx.user.id,
          type: "sync",
          action: "pull_batch",
          description: `Pulled ${synced} contacts from GHL (${skipped} skipped)`,
          severity: "info",
        });

        return { synced, skipped, total: result.total, hasMore: (result.contacts?.length || 0) >= (input.limit || 20) };
      }),
    // Pull a single contact from GHL into local DB
    pullFromGhl: protectedProcedure
      .input(z.object({ ghlContactId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
        if (!ghlCreds) throw new Error("GHL not configured");
        const result = await ghlService.getContact(ghlCreds, input.ghlContactId);
        if (!result.success || !result.contact) throw new Error(result.error || "Contact not found in GHL");

        const c = result.contact;
        const id = await db.createContact({
          userId: ctx.user.id,
          ghlContactId: input.ghlContactId,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          address: c.address1,
          city: c.city,
          state: c.state,
          postalCode: c.postalCode,
          companyName: c.companyName,
          tags: c.tags ? JSON.stringify(c.tags) : null,
          syncStatus: "synced",
          lastSyncedAt: new Date(),
        } as any);

        return { id, contact: c };
      }),
  }),

  // ─── Bulk Import (Real GHL Push) ────────────────────────────────────
  imports: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getBulkImports(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        totalRows: z.number(),
        fileUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createBulkImport({ ...input, userId: ctx.user.id });
        await db.logActivity({
          userId: ctx.user.id,
          type: "import",
          action: "import_created",
          description: `Started import of ${input.fileName} (${input.totalRows} rows)`,
          severity: "info",
        });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        processedRows: z.number().optional(),
        createdCount: z.number().optional(),
        updatedCount: z.number().optional(),
        failedCount: z.number().optional(),
        skippedCount: z.number().optional(),
        status: z.string().optional(),
        resumeFromRow: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateBulkImport(id, data as any);
        return { success: true };
      }),
    // Start a real bulk import sync job
    startSync: protectedProcedure
      .input(z.object({
        importId: z.number(),
        rows: z.array(z.record(z.string(), z.string())),
        workerCount: z.number().min(1).max(10).optional(),
        resumeFromRow: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
        if (!ghlCreds || (!ghlCreds.apiKey && !ghlCreds.jwt)) {
          throw new Error("GHL credentials not configured. Set up GoHighLevel integration first.");
        }

        // Update import status
        await db.updateBulkImport(input.importId, {
          status: "running",
          startedAt: new Date(),
        } as any);

        await db.logActivity({
          userId: ctx.user.id,
          type: "import",
          action: "import_sync_started",
          description: `Started GHL sync for import #${input.importId}: ${input.rows.length} rows, ${input.workerCount || 4} workers`,
          severity: "info",
        });

        // Set up progress callback to update DB
        syncWorker.setProgressCallback(async (state) => {
          try {
            await db.updateBulkImport(input.importId, {
              processedRows: state.processed,
              createdCount: state.created,
              updatedCount: state.updated,
              failedCount: state.failed,
              skippedCount: state.skipped,
              resumeFromRow: state.currentRow,
              status: state.status === "completed" ? "completed" :
                      state.status === "token_expired" ? "paused" :
                      state.status === "paused" ? "paused" :
                      state.status === "failed" ? "failed" : "running",
            } as any);
          } catch (err) {
            console.error("[Import] Failed to update progress:", err);
          }
        });

        // Start the sync worker (non-blocking — runs in background)
        syncWorker.start(
          input.importId,
          input.rows as Record<string, string>[],
          ghlCreds,
          { workerCount: input.workerCount || 4, delayPerCall: 50, maxRetries: 3, batchSize: 200 },
          input.resumeFromRow || 0
        ).catch((err) => {
          console.error("[Import] Sync worker error:", err);
        });

        return { success: true, jobId: input.importId };
      }),
    // Send a direct email via GHL Conversations API
    sendEmail: protectedProcedure
      .input(z.object({
        contactId: z.string(),
        subject: z.string(),
        html: z.string(),
        message: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
        if (!ghlCreds) throw new Error("GHL not configured");
        const result = await ghlService.sendEmail(ghlCreds, {
          contactId: input.contactId,
          subject: input.subject,
          html: input.html,
          message: input.message,
        });
        if (result.success) {
          await db.logActivity({
            userId: ctx.user.id,
            type: "campaign",
            action: "email_sent",
            description: `Email sent to GHL contact ${input.contactId}: ${input.subject}`,
            severity: "info",
          });
        }
        return result;
      }),
    // Get live sync progress
    syncProgress: protectedProcedure.query(async () => {
      return syncWorker.getState();
    }),
    // Pause sync
    pauseSync: protectedProcedure.mutation(async () => {
      return syncWorker.pause();
    }),
    // Resume sync
    resumeSync: protectedProcedure.mutation(async ({ ctx }) => {
      const ghlCreds = await credentialHelper.getGhlCredentials(ctx.user.id);
      if (ghlCreds) syncWorker.updateCredentials(ghlCreds);
      await syncWorker.resume();
      return { success: true };
    }),
    // Cancel sync
    cancelSync: protectedProcedure.mutation(async () => {
      return syncWorker.cancel();
    }),
    // Update token for sync worker
    updateToken: protectedProcedure
      .input(z.object({ jwt: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const remaining = ghlService.getJwtRemainingMinutes(input.jwt);
        if (remaining < 1) {
          throw new Error("Token is expired or has less than 1 minute remaining");
        }

        const locationId = ghlService.extractLocationFromJwt(input.jwt) || "";
        const companyId = ghlService.extractCompanyFromJwt(input.jwt) || "";

        // Save to DB
        await credentialHelper.updateGhlJwt(ctx.user.id, input.jwt);

        // Update sync worker
        syncWorker.updateCredentials({
          jwt: input.jwt,
          locationId,
          companyId,
        });

        await db.logActivity({
          userId: ctx.user.id,
          type: "integration",
          action: "ghl_token_updated",
          description: `GHL JWT token updated (${remaining.toFixed(0)} minutes remaining)`,
          severity: "success",
        });

        return { success: true, remainingMinutes: remaining, locationId, companyId };
      }),
  }),

  // ─── Campaigns (Real Platform Execution) ────────────────────────────
  campaigns: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getCampaigns(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        channel: z.enum([
          "email", "sms", "linkedin", "multi",
          "social_facebook", "social_instagram", "social_twitter", "social_tiktok",
          "call_inbound", "call_outbound", "direct_mail",
          "webform", "chat", "event",
        ]),
        templateId: z.number().optional(),
        audienceFilter: z.object({
          segment: z.string().optional(),
          tier: z.string().optional(),
          search: z.string().optional(),
        }).optional(),
        scheduledAt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createCampaign({
          ...input,
          userId: ctx.user.id,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        } as any);
        await db.logActivity({
          userId: ctx.user.id,
          type: "campaign",
          action: "campaign_created",
          description: `Created campaign "${input.name}" (${input.channel})`,
          severity: "success",
        });
        return { id };
      }),
    // Launch a campaign — actually sends via the correct platform
    launch: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        body: z.string().min(1, "Message body is required"),
        subject: z.string().optional(),
        contactIds: z.array(z.number()).optional(),
        audienceFilter: z.object({
          segment: z.string().optional(),
          tier: z.string().optional(),
          search: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get campaign
        const campaignList = await db.getCampaigns(ctx.user.id);
        const campaign = campaignList.find((c: any) => c.id === input.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Get contacts
        let contacts: any[] = [];
        if (input.contactIds && input.contactIds.length > 0) {
          const result = await db.getContacts(ctx.user.id, { limit: 200 });
          contacts = result.contacts.filter((c: any) => input.contactIds!.includes(c.id));
        } else {
          const result = await db.getContacts(ctx.user.id, { limit: 200, ...input.audienceFilter });
          contacts = result.contacts;
        }

        if (contacts.length === 0) {
          throw new Error("No contacts match the audience criteria");
        }

        // Get platform credentials
        const allCreds = await credentialHelper.getAllCredentials(ctx.user.id);

        // Update campaign status
        await db.updateCampaign(input.campaignId, ctx.user.id, {
          status: "running",
          audienceCount: contacts.length,
          startedAt: new Date(),
        } as any);

        await db.logActivity({
          userId: ctx.user.id,
          type: "campaign",
          action: "campaign_launched",
          description: `Launched campaign "${campaign.name}" to ${contacts.length} contacts via ${campaign.channel}`,
          severity: "info",
        });

        // Execute campaign
        const result = await campaignEngine.executeCampaign({
          channel: campaign.channel as any,
          subject: input.subject,
          body: input.body,
          campaignName: campaign.name,
          contacts: contacts.map((c: any) => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            ghlContactId: c.ghlContactId,
          })),
          ghlCreds: allCreds.ghl || undefined,
          smsitCreds: allCreds.smsit || undefined,
          dripifyCreds: allCreds.dripify || undefined,
        });

        // Update campaign with results
        const finalStatus = result.success ? "completed" : result.sent > 0 ? "completed" : "failed";
        await db.updateCampaign(input.campaignId, ctx.user.id, {
          status: finalStatus,
          completedAt: new Date(),
          metrics: JSON.stringify({
            sent: result.sent,
            failed: result.failed,
            total: contacts.length,
            errors: result.errors.slice(0, 50),
          }),
        } as any);

        await db.logActivity({
          userId: ctx.user.id,
          type: "campaign",
          action: "campaign_completed",
          description: `Campaign "${campaign.name}" completed: ${result.sent} sent, ${result.failed} failed`,
          severity: result.success ? "success" : "warning",
        });

        return {
          success: result.success,
          sent: result.sent,
          failed: result.failed,
          errors: result.errors.slice(0, 20),
        };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        status: z.string().optional(),
        metrics: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateCampaign(id, ctx.user.id, data as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCampaign(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Templates ───────────────────────────────────────────────────────
  templates: router({
    list: protectedProcedure
      .input(z.object({ channel: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getTemplates(ctx.user.id, input?.channel);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        channel: z.enum(["email", "sms", "linkedin", "social_facebook", "social_instagram", "social_twitter", "social_tiktok", "call_inbound", "call_outbound", "direct_mail", "webform", "chat", "event"]),
        subject: z.string().optional(),
        body: z.string().optional(),
        variables: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createTemplate({ ...input, userId: ctx.user.id } as any);
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        subject: z.string().optional(),
        body: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateTemplate(id, ctx.user.id, data as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteTemplate(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Sync Engine ─────────────────────────────────────────────────────
  sync: router({
    queue: protectedProcedure
      .input(z.object({ status: z.string().optional(), platform: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getSyncQueue(ctx.user.id, input);
      }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getSyncStats(ctx.user.id);
    }),
    retry: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.retrySyncItem(input.id);
        return { success: true };
      }),
    retryAllDlq: protectedProcedure.mutation(async ({ ctx }) => {
      await db.retryAllDlq(ctx.user.id);
      await db.logActivity({
        userId: ctx.user.id,
        type: "sync",
        action: "dlq_retry_all",
        description: "Retried all DLQ items",
        severity: "info",
      });
      return { success: true };
    }),
    // Get live worker status
    workerStatus: protectedProcedure.query(async () => {
      return syncWorker.getState();
    }),
  }),

  // ─── Integrations ───────────────────────────────────────────────────
  integrations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getIntegrations(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ platform: z.string() }))
      .query(async ({ ctx, input }) => {
        return db.getIntegrationByPlatform(ctx.user.id, input.platform);
      }),
    credentials: protectedProcedure
      .input(z.object({ platform: z.string() }))
      .query(async ({ ctx, input }) => {
        return db.getIntegrationCredentials(ctx.user.id, input.platform);
      }),
    upsert: protectedProcedure
      .input(z.object({
        platform: z.enum(["ghl", "dripify", "linkedin", "smsit"]),
        label: z.string().optional(),
        credentials: z.string().optional(),
        status: z.enum(["connected", "disconnected", "error"]).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertIntegration({ ...input, userId: ctx.user.id } as any);
        await db.logActivity({
          userId: ctx.user.id,
          type: "integration",
          action: "integration_updated",
          description: `Updated ${input.platform} integration`,
          severity: "info",
        });
        return { success: true };
      }),
    testConnection: protectedProcedure
      .input(z.object({
        platform: z.enum(["ghl", "dripify", "linkedin", "smsit"]),
        credentials: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        let creds: Record<string, string>;
        try {
          creds = JSON.parse(input.credentials);
        } catch {
          return { success: false, message: "Invalid credentials format" };
        }

        let result = { success: false, message: "Unknown platform" };

        try {
          if (input.platform === "ghl") {
            // Support both API Key and JWT Token auth
            const ghlCreds: ghlService.GhlCredentials = {
              locationId: creds["Location ID"] || "",
            };
            if (creds["API Key"]) ghlCreds.apiKey = creds["API Key"];
            if (creds["JWT Token"]) ghlCreds.jwt = creds["JWT Token"];

            if (!ghlCreds.apiKey && !ghlCreds.jwt) {
              result = { success: false, message: "API Key or JWT Token is required" };
            } else if (!ghlCreds.locationId && !ghlCreds.jwt) {
              result = { success: false, message: "Location ID is required (or use JWT Token which contains it)" };
            } else {
              // If JWT provided, extract locationId from it
              if (ghlCreds.jwt && !ghlCreds.locationId) {
                ghlCreds.locationId = ghlService.extractLocationFromJwt(ghlCreds.jwt) || "";
              }
              result = await ghlService.testConnection(ghlCreds);

              // Auto-seed: promote user to admin on first successful GHL connection
              if (result.success) {
                const existingGhl = await db.getIntegrationByPlatform(ctx.user.id, "ghl");
                if (!existingGhl || existingGhl.status !== "connected") {
                  await db.updateUserGhlIds(ctx.user.id, {
                    ghlLocationId: ghlCreds.locationId,
                    ghlCompanyId: creds["Company ID"] || ghlService.extractCompanyFromJwt(ghlCreds.jwt || "") || null,
                  });
                }
              }
            }
          } else if (input.platform === "smsit") {
            const apiKey = creds["API Key"];
            const sessionToken = creds["Session Token"];
            if (!apiKey && !sessionToken) {
              result = { success: false, message: "API Key or Session Token is required" };
            } else {
              result = await smsitService.testConnection({ apiKey: apiKey || sessionToken || "" });
            }
          } else if (input.platform === "dripify") {
            const apiKey = creds["API Key"];
            const sessionCookie = creds["Session Cookie"];
            if (!apiKey && !sessionCookie) {
              result = { success: false, message: "API Key or Session Cookie is required" };
            } else {
              result = await dripifyService.testConnection({ apiKey: apiKey || sessionCookie || "", sessionCookie: creds["Session Cookie"] || undefined, email: creds["Email"] || undefined });
            }
          } else if (input.platform === "linkedin") {
            const token = creds["Access Token"];
            const sessionCookie = creds["Session Cookie"];
            if (!token && !sessionCookie) {
              result = { success: false, message: "Access Token or Session Cookie (li_at) is required" };
            } else if (sessionCookie) {
              result = { success: true, message: "LinkedIn session cookie stored. Live verification occurs on first API call." };
            } else {
              result = { success: true, message: "LinkedIn token validated. Live verification occurs on first API call." };
            }
          }
        } catch (err: any) {
          result = { success: false, message: `Connection failed: ${err.message}` };
        }

        // Persist test outcome
        const newStatus = result.success ? "connected" : "error";
        await db.upsertIntegration({
          platform: input.platform,
          userId: ctx.user.id,
          credentials: input.credentials,
          label: PLATFORMS_LABELS[input.platform] || input.platform,
          status: newStatus,
          lastCheckedAt: new Date(),
        } as any);
        await db.logActivity({
          userId: ctx.user.id,
          type: "integration",
          action: `${input.platform}_test_${result.success ? "success" : "failed"}`,
          description: result.message,
          severity: result.success ? "success" : "error",
        });

        return result;
      }),
    disconnect: protectedProcedure
      .input(z.object({ platform: z.enum(["ghl", "dripify", "linkedin", "smsit"]) }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertIntegration({
          platform: input.platform,
          userId: ctx.user.id,
          credentials: "",
          status: "disconnected",
        } as any);
        await db.logActivity({
          userId: ctx.user.id,
          type: "integration",
          action: "integration_disconnected",
          description: `Disconnected ${input.platform}`,
          severity: "warning",
        });
        return { success: true };
      }),
  }),

  // ─── Activity Feed ───────────────────────────────────────────────────
  activity: router({
    list: protectedProcedure
      .input(z.object({ type: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getActivityLog(ctx.user.id, input);
      }),
  }),

  // ─── Backups (Real File Generation) ─────────────────────────────────
  backups: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getBackups(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        type: z.enum(["contacts", "campaigns", "full"]),
        format: z.enum(["csv", "json"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createBackup({
          ...input,
          userId: ctx.user.id,
          status: "generating",
        } as any);

        // Actually generate the backup
        try {
          let data: any[] = [];
          let recordCount = 0;

          if (input.type === "contacts" || input.type === "full") {
            const result = await db.getContacts(ctx.user.id, { limit: 10000 });
            data = result.contacts;
            recordCount = result.total;
          }
          if (input.type === "campaigns" || input.type === "full") {
            const campaigns = await db.getCampaigns(ctx.user.id);
            if (input.type === "full") {
              data = [...data, ...campaigns.map((c: any) => ({ ...c, _type: "campaign" }))];
            } else {
              data = campaigns;
            }
            recordCount += campaigns.length;
          }

          let content: string;
          let contentType: string;
          let ext: string;

          if (input.format === "json") {
            content = JSON.stringify(data, null, 2);
            contentType = "application/json";
            ext = "json";
          } else {
            // CSV
            if (data.length === 0) {
              content = "";
            } else {
              const headers = Object.keys(data[0]);
              const rows = data.map((row: any) =>
                headers.map((h) => {
                  const val = row[h];
                  const str = val === null || val === undefined ? "" : String(val);
                  return str.includes(",") || str.includes('"') || str.includes("\n")
                    ? `"${str.replace(/"/g, '""')}"`
                    : str;
                }).join(",")
              );
              content = [headers.join(","), ...rows].join("\n");
            }
            contentType = "text/csv";
            ext = "csv";
          }

          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const fileKey = `backups/${ctx.user.id}/${input.type}-${timestamp}.${ext}`;

          const { url } = await storagePut(fileKey, Buffer.from(content, "utf-8"), contentType);

          await db.updateBackup(id!, {
            status: "ready",
            fileUrl: url,
            fileKey,
            recordCount,
            fileSize: Buffer.byteLength(content, "utf-8"),
          } as any);

          await db.logActivity({
            userId: ctx.user.id,
            type: "backup",
            action: "backup_created",
            description: `Created ${input.format.toUpperCase()} backup of ${input.type} (${recordCount} records)`,
            severity: "success",
          });

          return { id, url };
        } catch (err: any) {
          console.error("[Backup] Generation failed:", err);
          await db.updateBackup(id!, { status: "expired" } as any);
          await db.logActivity({
            userId: ctx.user.id,
            type: "backup",
            action: "backup_failed",
            description: `Backup generation failed: ${err.message}`,
            severity: "error",
          });
          return { id, error: err.message };
        }
      }),
  }),

  // ─── Dripify Webhook Ingestion ──────────────────────────────────────
  webhooks: router({
    dripify: publicProcedure
      .input(z.any())
      .mutation(async ({ input }) => {
        const event = dripifyService.processWebhookEvent(input);
        console.log("[Webhook] Dripify event:", event.type, event.contactEmail);
        return { received: true, type: event.type };
      }),
  }),

  // ─── Orchestrator (Multi-Platform Sequences) ────────────────────────
  orchestrator: router({
    platformHealth: protectedProcedure.query(async ({ ctx }) => {
      return orchestrator.getPlatformHealth(ctx.user.id);
    }),

    startSequence: protectedProcedure
      .input(z.object({
        name: z.string(),
        steps: z.array(z.object({
          channel: z.enum([
            "email", "sms", "linkedin",
            "social_facebook", "social_instagram", "social_twitter", "social_tiktok",
            "call_inbound", "call_outbound", "direct_mail",
            "webform", "chat", "event"
          ]),
          subject: z.string().optional(),
          body: z.string(),
          delayMs: z.number().min(0),
          templateId: z.string().optional(),
        })),
        contactIds: z.array(z.number()),
        audienceFilter: z.object({
          tags: z.array(z.string()).optional(),
          tiers: z.array(z.string()).optional(),
          platforms: z.array(z.string()).optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const contacts = await db.getContactsByIds(input.contactIds);
        return orchestrator.startSequence(ctx.user.id, input, contacts);
      }),

    sequenceStatus: protectedProcedure
      .input(z.object({ sequenceId: z.string() }))
      .query(({ input }) => orchestrator.getSequenceStatus(input.sequenceId)),

    listSequences: protectedProcedure.query(() => orchestrator.listSequences()),

    cancelSequence: protectedProcedure
      .input(z.object({ sequenceId: z.string() }))
      .mutation(({ input }) => ({ cancelled: orchestrator.cancelSequence(input.sequenceId) })),

    pauseSequence: protectedProcedure
      .input(z.object({ sequenceId: z.string() }))
      .mutation(({ input }) => ({ paused: orchestrator.pauseSequence(input.sequenceId) })),

    resumeSequence: protectedProcedure
      .input(z.object({ sequenceId: z.string() }))
      .mutation(({ input }) => ({ resumed: orchestrator.resumeSequence(input.sequenceId) })),
  }),

  // ─── Sync Scheduler ─────────────────────────────────────────────────
  syncScheduler: router({
    status: protectedProcedure.query(() => syncScheduler.getStatus()),

    start: protectedProcedure
      .input(z.object({
        intervalMs: z.number().min(10000).optional(),
        platforms: z.object({
          ghl: z.object({ enabled: z.boolean(), pullContacts: z.boolean().optional(), pushContacts: z.boolean().optional() }).optional(),
          smsit: z.object({ enabled: z.boolean(), pullContacts: z.boolean().optional() }).optional(),
          dripify: z.object({ enabled: z.boolean(), pullLeads: z.boolean().optional() }).optional(),
        }).optional(),
      }).optional())
      .mutation(({ ctx, input }) => syncScheduler.start(ctx.user.id, input || undefined)),

    stop: protectedProcedure.mutation(() => syncScheduler.stop()),

    forcePull: protectedProcedure
      .input(z.object({ platform: z.string().optional() }).optional())
      .mutation(async ({ input }) => {
        const events = await syncScheduler.forcePull(input?.platform);
        return { events };
      }),

    webhook: publicProcedure
      .input(z.object({ platform: z.string(), payload: z.any() }))
      .mutation(({ input }) => syncScheduler.processWebhook(input.platform, input.payload)),
  }),

  // ─── Contact Interactions (Unified Cross-Channel Timeline) ──────────
  interactions: router({
    list: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        channel: z.string().optional(),
        limit: z.number().min(1).max(200).optional(),
        offset: z.number().min(0).optional(),
      }))
      .query(async ({ ctx, input }) => {
        return db.getContactInteractions(ctx.user.id, input.contactId, input);
      }),

    create: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        channel: z.enum([
          "email", "sms", "linkedin",
          "social_facebook", "social_instagram", "social_twitter", "social_tiktok",
          "call_inbound", "call_outbound", "direct_mail",
          "webform", "chat", "event"
        ]),
        direction: z.enum(["inbound", "outbound"]),
        type: z.enum([
          "message_sent", "message_received", "message_opened", "message_clicked",
          "call_made", "call_received", "call_missed", "voicemail_left",
          "form_submitted", "page_visited", "chat_started", "chat_message",
          "event_registered", "event_attended", "event_missed",
          "connection_sent", "connection_accepted", "profile_viewed",
          "mail_sent", "mail_delivered", "mail_returned",
          "post_published", "post_engaged", "dm_sent", "dm_received"
        ]),
        subject: z.string().optional(),
        body: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        campaignId: z.number().optional(),
        platform: z.string().max(100).optional(),
        externalId: z.string().max(500).optional(),
        sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createInteraction({ ...input, userId: ctx.user.id });
        return { id };
      }),

    stats: protectedProcedure
      .input(z.object({ contactId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getInteractionStats(ctx.user.id, input?.contactId);
      }),

    crossChannelMetrics: protectedProcedure.query(async ({ ctx }) => {
      return db.getCrossChannelMetrics(ctx.user.id);
    }),
  }),

  // ─── Channel Configuration ─────────────────────────────────────────
  channels: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getChannelConfigs(ctx.user.id);
    }),

    upsert: protectedProcedure
      .input(z.object({
        channel: z.enum([
          "email", "sms", "linkedin",
          "social_facebook", "social_instagram", "social_twitter", "social_tiktok",
          "call_inbound", "call_outbound", "direct_mail",
          "webform", "chat", "event"
        ]),
        enabled: z.boolean(),
        provider: z.string().optional(),
        config: z.record(z.string(), z.unknown()).optional(),
        dailyLimit: z.number().int().min(0).max(1000000).optional(),
        monthlyBudget: z.string().max(20).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertChannelConfig({ ...input, userId: ctx.user.id });
        await db.logActivity({
          userId: ctx.user.id,
          type: "system",
          action: "channel_config_updated",
          description: `Updated ${input.channel} channel: ${input.enabled ? "enabled" : "disabled"}${input.provider ? ` via ${input.provider}` : ""}`,
          severity: "info",
        });
        return { success: true };
      }),

    get: protectedProcedure
      .input(z.object({ channel: z.string() }))
      .query(async ({ ctx, input }) => {
        return db.getChannelConfig(ctx.user.id, input.channel);
      }),
  }),

  // ─── AI / Agentic Continuous Improvement Engine ─────────────────────
  ai: router({
    insights: protectedProcedure.query(async ({ ctx }) => {
      return aiEngine.generateInsightsReport(ctx.user.id);
    }),

    healthScore: protectedProcedure.query(async ({ ctx }) => {
      const report = await aiEngine.generateInsightsReport(ctx.user.id);
      return report.healthScore;
    }),

    recommendations: protectedProcedure.query(async ({ ctx }) => {
      const report = await aiEngine.generateInsightsReport(ctx.user.id);
      return report.recommendations;
    }),

    predictions: protectedProcedure.query(async ({ ctx }) => {
      const report = await aiEngine.generateInsightsReport(ctx.user.id);
      return report.predictions;
    }),

    leadScore: protectedProcedure
      .input(z.object({ contactId: z.number() }))
      .query(async ({ ctx, input }) => {
        const contact = await db.getContactById(input.contactId, ctx.user.id);
        if (!contact) return null;
        return aiEngine.computeLeadScore(contact);
      }),

    bulkLeadScore: protectedProcedure.mutation(async ({ ctx }) => {
      const { contacts } = await db.getContacts(ctx.user.id, { limit: 200 });
      let updated = 0;
      for (const contact of contacts) {
        const { score, tier } = aiEngine.computeLeadScore(contact);
        if (contact.tier !== tier || contact.propensityScore !== String(score)) {
          await db.updateContact(contact.id, ctx.user.id, {
            propensityScore: String(score),
            tier,
          });
          updated++;
        }
      }
      await db.logActivity({
        userId: ctx.user.id,
        type: "enrichment",
        action: "bulk_lead_score",
        description: `AI engine scored ${updated} contacts out of ${contacts.length}`,
        severity: "success",
      });
      return { scored: updated, total: contacts.length };
    }),
  }),
});

export type AppRouter = typeof appRouter;
