import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

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

  // ─── Contacts ────────────────────────────────────────────────────────
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
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createContact({ ...input, userId: ctx.user.id, tags: input.tags ? JSON.stringify(input.tags) : null } as any);
        await db.logActivity({ userId: ctx.user.id, type: "sync", action: "contact_created", description: `Created contact ${input.firstName || ""} ${input.lastName || ""}`.trim(), severity: "success" });
        return { id };
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
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateContact(id, ctx.user.id, { ...data, tags: data.tags ? JSON.stringify(data.tags) : undefined } as any);
        await db.logActivity({ userId: ctx.user.id, type: "sync", action: "contact_updated", description: `Updated contact #${id}`, severity: "info" });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteContact(input.id, ctx.user.id);
        await db.logActivity({ userId: ctx.user.id, type: "sync", action: "contact_deleted", description: `Deleted contact #${input.id}`, severity: "warning" });
        return { success: true };
      }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getContactStats(ctx.user.id);
    }),
  }),

  // ─── Bulk Import ─────────────────────────────────────────────────────
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
        await db.logActivity({ userId: ctx.user.id, type: "import", action: "import_created", description: `Started import of ${input.fileName} (${input.totalRows} rows)`, severity: "info" });
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
  }),

  // ─── Campaigns ───────────────────────────────────────────────────────
  campaigns: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getCampaigns(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        channel: z.enum(["email", "sms", "linkedin", "multi"]),
        templateId: z.number().optional(),
        audienceFilter: z.any().optional(),
        scheduledAt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createCampaign({
          ...input,
          userId: ctx.user.id,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        } as any);
        await db.logActivity({ userId: ctx.user.id, type: "campaign", action: "campaign_created", description: `Created campaign "${input.name}" (${input.channel})`, severity: "success" });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        status: z.string().optional(),
        metrics: z.any().optional(),
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
        channel: z.enum(["email", "sms", "linkedin"]),
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
      await db.logActivity({ userId: ctx.user.id, type: "sync", action: "dlq_retry_all", description: "Retried all DLQ items", severity: "info" });
      return { success: true };
    }),
  }),

  // ─── Integrations ───────────────────────────────────────────────────
  integrations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getIntegrations(ctx.user.id);
    }),
    upsert: protectedProcedure
      .input(z.object({
        platform: z.enum(["ghl", "dripify", "linkedin", "smsit"]),
        label: z.string().optional(),
        credentials: z.string().optional(),
        status: z.enum(["connected", "disconnected", "error"]).optional(),
        metadata: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertIntegration({ ...input, userId: ctx.user.id } as any);
        await db.logActivity({ userId: ctx.user.id, type: "integration", action: "integration_updated", description: `Updated ${input.platform} integration`, severity: "info" });
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

  // ─── Backups ─────────────────────────────────────────────────────────
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
        // Create backup record
        const id = await db.createBackup({ ...input, userId: ctx.user.id, status: "generating" } as any);
        // In a real implementation, this would trigger async backup generation
        // For now, mark as ready with a placeholder
        await db.logActivity({ userId: ctx.user.id, type: "backup", action: "backup_created", description: `Created ${input.format.toUpperCase()} backup of ${input.type}`, severity: "success" });
        return { id };
      }),
  }),
});

export type AppRouter = typeof appRouter;
