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
  // Standard name fields
  firstName: varchar("firstName", { length: 128 }),
  lastName: varchar("lastName", { length: 128 }),
  firstNameRaw: varchar("firstNameRaw", { length: 128 }),
  lastNameRaw: varchar("lastNameRaw", { length: 128 }),
  contactName: varchar("contactName", { length: 256 }),
  companyName: varchar("companyName", { length: 256 }),
  // Contact info
  email: varchar("email", { length: 320 }),
  additionalEmails: json("additionalEmails"), // string[]
  phone: varchar("phone", { length: 32 }),
  // Address
  address: text("address"), // address1
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 64 }),
  postalCode: varchar("postalCode", { length: 16 }),
  country: varchar("country", { length: 8 }),
  // GHL standard fields
  website: varchar("website", { length: 512 }),
  source: varchar("source", { length: 128 }),
  contactType: varchar("contactType", { length: 64 }), // lead, customer, etc.
  dateOfBirth: varchar("dateOfBirth", { length: 32 }),
  timezone: varchar("timezone", { length: 64 }),
  dnd: boolean("dnd").default(false),
  dndSettings: json("dndSettings"),
  assignedTo: varchar("assignedTo", { length: 128 }),
  profilePhoto: text("profilePhoto"),
  facebookLeadId: varchar("facebookLeadId", { length: 128 }),
  linkedInLeadId: varchar("linkedInLeadId", { length: 128 }),
  // WB fields (from CSV sync)
  segment: mysqlEnum("segment", [
    "residential", "commercial", "agricultural", "cpa_tax",
    "estate_attorney", "hr_benefits", "insurance", "nonprofit", "other"
  ]).default("other"),
  tier: mysqlEnum("tier", ["gold", "silver", "bronze", "archive", "unscored"]).default("unscored"),
  propensityScore: decimal("propensityScore", { precision: 5, scale: 2 }),
  originalScore: decimal("originalScore", { precision: 5, scale: 2 }),
  tags: json("tags"), // string[]
  productOpportunities: text("productOpportunities"),
  specialistRoute: varchar("specialistRoute", { length: 128 }),
  premiumFinancing: varchar("premiumFinancing", { length: 8 }),
  campaign: varchar("campaign", { length: 256 }),
  region: varchar("region", { length: 16 }),
  // Enrichment
  enrichedAt: timestamp("enrichedAt"),
  enrichmentConfidence: decimal("enrichmentConfidence", { precision: 5, scale: 2 }),
  enrichmentSource: varchar("enrichmentSource", { length: 64 }),
  // Sync
  syncStatus: mysqlEnum("syncStatus", ["synced", "pending", "error", "local_only"]).default("local_only"),
  lastSyncedAt: timestamp("lastSyncedAt"),
  ghlDateAdded: timestamp("ghlDateAdded"),
  ghlDateUpdated: timestamp("ghlDateUpdated"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_contacts_userId").on(table.userId),
  index("idx_contacts_email").on(table.email),
  index("idx_contacts_phone").on(table.phone),
  index("idx_contacts_segment").on(table.segment),
  index("idx_contacts_tier").on(table.tier),
  index("idx_contacts_ghlContactId").on(table.ghlContactId),
  index("idx_contacts_syncStatus").on(table.syncStatus),
]);

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// ─── Contact Custom Fields (flexible key-value for all GHL custom fields) ───
export const contactCustomFields = mysqlTable("contact_custom_fields", {
  id: int("id").autoincrement().primaryKey(),
  contactId: int("contactId").notNull(),
  ghlFieldId: varchar("ghlFieldId", { length: 128 }).notNull(),
  fieldName: varchar("fieldName", { length: 256 }).notNull(),
  fieldKey: varchar("fieldKey", { length: 256 }),
  fieldType: varchar("fieldType", { length: 32 }), // TEXT, NUMERICAL, DATE, SINGLE_OPTIONS, CHECKBOX, LARGE_TEXT
  value: text("value"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_ccf_contactId").on(table.contactId),
  index("idx_ccf_ghlFieldId").on(table.ghlFieldId),
  uniqueIndex("idx_ccf_contact_field").on(table.contactId, table.ghlFieldId),
]);

export type ContactCustomField = typeof contactCustomFields.$inferSelect;
export type InsertContactCustomField = typeof contactCustomFields.$inferInsert;

// ─── Custom Field Definitions (registry of all known GHL custom fields) ─────
export const customFieldDefinitions = mysqlTable("custom_field_definitions", {
  id: int("id").autoincrement().primaryKey(),
  ghlFieldId: varchar("ghlFieldId", { length: 128 }).notNull().unique(),
  fieldName: varchar("fieldName", { length: 256 }).notNull(),
  fieldKey: varchar("fieldKey", { length: 256 }),
  fieldType: varchar("fieldType", { length: 32 }).notNull(),
  options: json("options"), // for SINGLE_OPTIONS type
  category: varchar("category", { length: 64 }), // wb_data, crm, pipeline, sequence, etc.
  displayOrder: int("displayOrder").default(0),
  isVisible: boolean("isVisible").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;
export type InsertCustomFieldDefinition = typeof customFieldDefinitions.$inferInsert;

// ─── GHL Import Jobs ────────────────────────────────────────────────────────
export const ghlImportJobs = mysqlTable("ghl_import_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pending", "running", "paused", "completed", "failed"]).default("pending").notNull(),
  totalContacts: int("totalContacts").default(0),
  importedCount: int("importedCount").default(0),
  updatedCount: int("updatedCount").default(0),
  skippedCount: int("skippedCount").default(0),
  failedCount: int("failedCount").default(0),
  lastGhlContactId: varchar("lastGhlContactId", { length: 128 }), // cursor for pagination
  errorLog: json("errorLog"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GhlImportJob = typeof ghlImportJobs.$inferSelect;
export type InsertGhlImportJob = typeof ghlImportJobs.$inferInsert;

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
  channel: mysqlEnum("channel", [
    "email", "sms", "linkedin", "multi",
    "social_facebook", "social_instagram", "social_twitter", "social_tiktok",
    "call_inbound", "call_outbound", "direct_mail",
    "webform", "chat", "event"
  ]).notNull(),
  status: mysqlEnum("status", ["draft", "scheduled", "running", "paused", "completed", "failed"]).default("draft").notNull(),
  templateId: int("templateId"),
  audienceFilter: json("audienceFilter"),
  audienceCount: int("audienceCount").default(0),
  scheduledAt: timestamp("scheduledAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  metrics: json("metrics"),
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
  channel: mysqlEnum("channel", [
    "email", "sms", "linkedin",
    "social_facebook", "social_instagram", "social_twitter", "social_tiktok",
    "call_inbound", "call_outbound", "direct_mail",
    "webform", "chat", "event"
  ]).notNull(),
  subject: varchar("subject", { length: 512 }),
  body: text("body"),
  variables: json("variables"),
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
  entityType: varchar("entityType", { length: 64 }).notNull(),
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

// ─── Contact Interactions (Unified Cross-Channel Timeline) ──────────────────
export const contactInteractions = mysqlTable("contact_interactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contactId: int("contactId").notNull(),
  channel: mysqlEnum("channel", [
    "email", "sms", "linkedin",
    "social_facebook", "social_instagram", "social_twitter", "social_tiktok",
    "call_inbound", "call_outbound", "direct_mail",
    "webform", "chat", "event"
  ]).notNull(),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  type: mysqlEnum("type", [
    "message_sent", "message_received", "message_opened", "message_clicked",
    "call_made", "call_received", "call_missed", "voicemail_left",
    "form_submitted", "page_visited", "chat_started", "chat_message",
    "event_registered", "event_attended", "event_missed",
    "connection_sent", "connection_accepted", "profile_viewed",
    "mail_sent", "mail_delivered", "mail_returned",
    "post_published", "post_engaged", "dm_sent", "dm_received"
  ]).notNull(),
  subject: varchar("subject", { length: 512 }),
  body: text("body"),
  metadata: json("metadata"),
  campaignId: int("campaignId"),
  platform: varchar("platform", { length: 64 }),
  externalId: varchar("externalId", { length: 256 }),
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_interactions_contactId").on(table.contactId),
  index("idx_interactions_channel").on(table.channel),
  index("idx_interactions_userId").on(table.userId),
  index("idx_interactions_campaignId").on(table.campaignId),
]);

export type ContactInteraction = typeof contactInteractions.$inferSelect;
export type InsertContactInteraction = typeof contactInteractions.$inferInsert;

// ─── Channel Configurations ─────────────────────────────────────────────────
export const channelConfigs = mysqlTable("channel_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  channel: mysqlEnum("channel", [
    "email", "sms", "linkedin",
    "social_facebook", "social_instagram", "social_twitter", "social_tiktok",
    "call_inbound", "call_outbound", "direct_mail",
    "webform", "chat", "event"
  ]).notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  provider: varchar("provider", { length: 128 }),
  config: json("config"),
  dailyLimit: int("dailyLimit"),
  monthlyBudget: decimal("monthlyBudget", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["active", "inactive", "error"]).default("inactive").notNull(),
  lastActivityAt: timestamp("lastActivityAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("idx_channel_user_channel").on(table.userId, table.channel),
]);

export type ChannelConfig = typeof channelConfigs.$inferSelect;
export type InsertChannelConfig = typeof channelConfigs.$inferInsert;
