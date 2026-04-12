import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, bigint, decimal, uniqueIndex, index } from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  ghlCompanyId: varchar("ghlCompanyId", { length: 128 }),
  ghlUserId: varchar("ghlUserId", { length: 128 }),
  ghlLocationId: varchar("ghlLocationId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Platform Integrations ───────────────────────────────────────────────────
export const integrations = mysqlTable("integrations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["ghl", "dripify", "linkedin", "smsit"]).notNull(),
  label: varchar("label", { length: 128 }),
  credentials: text("credentials"), // encrypted JSON
  status: mysqlEnum("status", ["connected", "disconnected", "error"]).default("disconnected").notNull(),
  lastCheckedAt: timestamp("lastCheckedAt"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = typeof integrations.$inferInsert;

// ─── Contacts ────────────────────────────────────────────────────────────────
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  ghlContactId: varchar("ghlContactId", { length: 128 }),
  firstName: varchar("firstName", { length: 128 }),
  lastName: varchar("lastName", { length: 128 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 8 }),
  postalCode: varchar("postalCode", { length: 16 }),
  companyName: varchar("companyName", { length: 256 }),
  segment: mysqlEnum("segment", [
    "residential", "commercial", "agricultural", "cpa_tax",
    "estate_attorney", "hr_benefits", "insurance", "nonprofit", "other"
  ]).default("other"),
  tier: mysqlEnum("tier", ["gold", "silver", "bronze", "unscored"]).default("unscored"),
  propensityScore: decimal("propensityScore", { precision: 5, scale: 2 }),
  tags: json("tags"), // string[]
  productOpportunities: text("productOpportunities"),
  specialistRoute: varchar("specialistRoute", { length: 128 }),
  premiumFinancing: varchar("premiumFinancing", { length: 8 }),
  campaign: varchar("campaign", { length: 256 }),
  region: varchar("region", { length: 16 }),
  enrichedAt: timestamp("enrichedAt"),
  enrichmentConfidence: decimal("enrichmentConfidence", { precision: 5, scale: 2 }),
  enrichmentSource: varchar("enrichmentSource", { length: 64 }),
  syncStatus: mysqlEnum("syncStatus", ["synced", "pending", "error", "local_only"]).default("local_only"),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_contacts_userId").on(table.userId),
  index("idx_contacts_email").on(table.email),
  index("idx_contacts_segment").on(table.segment),
  index("idx_contacts_tier").on(table.tier),
]);

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// ─── Bulk Imports ────────────────────────────────────────────────────────────
export const bulkImports = mysqlTable("bulk_imports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 512 }).notNull(),
  fileUrl: text("fileUrl"),
  totalRows: int("totalRows").default(0),
  processedRows: int("processedRows").default(0),
  createdCount: int("createdCount").default(0),
  updatedCount: int("updatedCount").default(0),
  failedCount: int("failedCount").default(0),
  skippedCount: int("skippedCount").default(0),
  status: mysqlEnum("status", ["pending", "running", "paused", "completed", "failed"]).default("pending").notNull(),
  resumeFromRow: int("resumeFromRow").default(0),
  errorLog: json("errorLog"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BulkImport = typeof bulkImports.$inferSelect;
export type InsertBulkImport = typeof bulkImports.$inferInsert;

// ─── Campaigns ───────────────────────────────────────────────────────────────
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  channel: mysqlEnum("channel", ["email", "sms", "linkedin", "multi"]).notNull(),
  status: mysqlEnum("status", ["draft", "scheduled", "running", "paused", "completed", "failed"]).default("draft").notNull(),
  templateId: int("templateId"),
  audienceFilter: json("audienceFilter"), // filter criteria
  audienceCount: int("audienceCount").default(0),
  scheduledAt: timestamp("scheduledAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  metrics: json("metrics"), // { sent, delivered, opened, clicked, replied, bounced, unsubscribed }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// ─── Campaign Templates ─────────────────────────────────────────────────────
export const campaignTemplates = mysqlTable("campaign_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  channel: mysqlEnum("channel", ["email", "sms", "linkedin"]).notNull(),
  subject: varchar("subject", { length: 512 }),
  body: text("body"),
  variables: json("variables"), // string[] of merge fields
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CampaignTemplate = typeof campaignTemplates.$inferSelect;
export type InsertCampaignTemplate = typeof campaignTemplates.$inferInsert;

// ─── Sync Queue ──────────────────────────────────────────────────────────────
export const syncQueue = mysqlTable("sync_queue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  direction: mysqlEnum("direction", ["push", "pull"]).notNull(),
  platform: mysqlEnum("platform", ["ghl", "dripify", "linkedin", "smsit"]).notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(), // contact, campaign, etc.
  entityId: int("entityId"),
  payload: json("payload"),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "dlq"]).default("pending").notNull(),
  attempts: int("attempts").default(0),
  maxAttempts: int("maxAttempts").default(3),
  lastError: text("lastError"),
  nextRetryAt: timestamp("nextRetryAt"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_sync_status").on(table.status),
  index("idx_sync_platform").on(table.platform),
]);

export type SyncQueueItem = typeof syncQueue.$inferSelect;
export type InsertSyncQueueItem = typeof syncQueue.$inferInsert;

// ─── Activity Log ────────────────────────────────────────────────────────────
export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  type: mysqlEnum("type", [
    "sync", "import", "export", "campaign", "enrichment",
    "integration", "webhook", "backup", "auth", "system"
  ]).notNull(),
  action: varchar("action", { length: 128 }).notNull(),
  description: text("description"),
  metadata: json("metadata"),
  severity: mysqlEnum("severity", ["info", "warning", "error", "success"]).default("info").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_activity_type").on(table.type),
  index("idx_activity_userId").on(table.userId),
]);

export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type InsertActivityLogEntry = typeof activityLog.$inferInsert;

// ─── Backups ─────────────────────────────────────────────────────────────────
export const backups = mysqlTable("backups", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["contacts", "campaigns", "full"]).notNull(),
  format: mysqlEnum("format", ["csv", "json"]).notNull(),
  fileUrl: text("fileUrl"),
  fileKey: varchar("fileKey", { length: 512 }),
  recordCount: int("recordCount").default(0),
  fileSize: bigint("fileSize", { mode: "number" }).default(0),
  status: mysqlEnum("status", ["pending", "generating", "ready", "expired"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Backup = typeof backups.$inferSelect;
export type InsertBackup = typeof backups.$inferInsert;
