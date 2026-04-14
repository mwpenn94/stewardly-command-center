import { eq, and, like, desc, asc, sql, inArray, or, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, contacts, InsertContact, Contact,
  integrations, InsertIntegration, Integration,
  bulkImports, InsertBulkImport, BulkImport,
  campaigns, InsertCampaign, Campaign,
  campaignTemplates, InsertCampaignTemplate, CampaignTemplate,
  syncQueue, InsertSyncQueueItem, SyncQueueItem,
  activityLog, InsertActivityLogEntry,
  backups, InsertBackup, Backup,
  contactInteractions, InsertContactInteraction, ContactInteraction,
  channelConfigs, InsertChannelConfig, ChannelConfig,
  contactCustomFields, InsertContactCustomField, ContactCustomField,
  customFieldDefinitions, CustomFieldDefinition,
  ghlImportJobs, InsertGhlImportJob, GhlImportJob,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserGhlIds(userId: number, data: { ghlLocationId?: string | null; ghlCompanyId?: string | null }) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ ...data, role: "admin" }).where(eq(users.id, userId));
}

// ─── Contacts ────────────────────────────────────────────────────────────────
export async function getContacts(userId: number, opts: {
  search?: string; segment?: string; tier?: string; limit?: number; offset?: number;
}) {
  const db = await getDb();
  if (!db) return { contacts: [], total: 0 };
  const conditions = [eq(contacts.userId, userId)];
  if (opts.segment && opts.segment !== "all") conditions.push(eq(contacts.segment, opts.segment as any));
  if (opts.tier && opts.tier !== "all") conditions.push(eq(contacts.tier, opts.tier as any));
  if (opts.search) {
    conditions.push(or(
      like(contacts.firstName, `%${opts.search}%`),
      like(contacts.lastName, `%${opts.search}%`),
      like(contacts.email, `%${opts.search}%`),
      like(contacts.phone, `%${opts.search}%`),
      like(contacts.companyName, `%${opts.search}%`),
    )!);
  }
  const where = and(...conditions);
  const [rows, totalResult] = await Promise.all([
    db.select().from(contacts).where(where).orderBy(desc(contacts.updatedAt)).limit(opts.limit || 50).offset(opts.offset || 0),
    db.select({ count: count() }).from(contacts).where(where),
  ]);
  return { contacts: rows, total: totalResult[0]?.count || 0 };
}

export async function getContactById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId))).limit(1);
  return result[0] || null;
}

export async function createContact(data: InsertContact) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(contacts).values(data);
  return result[0].insertId;
}

export async function updateContact(id: number, userId: number, data: Partial<InsertContact>) {
  const db = await getDb();
  if (!db) return;
  await db.update(contacts).set(data).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
}

export async function deleteContact(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
}

export async function getContactStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, enriched: 0, bySegment: [], byTier: [], bySyncStatus: [] };
  const [total, enriched, bySegment, byTier, bySyncStatus] = await Promise.all([
    db.select({ count: count() }).from(contacts).where(eq(contacts.userId, userId)),
    db.select({ count: count() }).from(contacts).where(and(eq(contacts.userId, userId), sql`${contacts.enrichedAt} IS NOT NULL`)),
    db.select({ segment: contacts.segment, count: count() }).from(contacts).where(eq(contacts.userId, userId)).groupBy(contacts.segment),
    db.select({ tier: contacts.tier, count: count() }).from(contacts).where(eq(contacts.userId, userId)).groupBy(contacts.tier),
    db.select({ syncStatus: contacts.syncStatus, count: count() }).from(contacts).where(eq(contacts.userId, userId)).groupBy(contacts.syncStatus),
  ]);
  return { total: total[0]?.count || 0, enriched: enriched[0]?.count || 0, bySegment, byTier, bySyncStatus };
}

export async function getDataCompletenessStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, fields: [] };
  const totalResult = await db.select({ count: count() }).from(contacts).where(eq(contacts.userId, userId));
  const total = totalResult[0]?.count || 0;
  if (total === 0) return { total: 0, fields: [] };

  const [hasEmail, hasPhone, hasAddress, hasCompany, hasGhl, hasTier, hasSegment, hasCity] = await Promise.all([
    db.select({ count: count() }).from(contacts).where(and(eq(contacts.userId, userId), sql`${contacts.email} IS NOT NULL AND ${contacts.email} != ''`)),
    db.select({ count: count() }).from(contacts).where(and(eq(contacts.userId, userId), sql`${contacts.phone} IS NOT NULL AND ${contacts.phone} != ''`)),
    db.select({ count: count() }).from(contacts).where(and(eq(contacts.userId, userId), sql`${contacts.address} IS NOT NULL AND ${contacts.address} != ''`)),
    db.select({ count: count() }).from(contacts).where(and(eq(contacts.userId, userId), sql`${contacts.companyName} IS NOT NULL AND ${contacts.companyName} != ''`)),
    db.select({ count: count() }).from(contacts).where(and(eq(contacts.userId, userId), sql`${contacts.ghlContactId} IS NOT NULL AND ${contacts.ghlContactId} != ''`)),
    db.select({ count: count() }).from(contacts).where(and(eq(contacts.userId, userId), sql`${contacts.tier} IS NOT NULL AND ${contacts.tier} != '' AND ${contacts.tier} != 'unscored'`)),
    db.select({ count: count() }).from(contacts).where(and(eq(contacts.userId, userId), sql`${contacts.segment} IS NOT NULL AND ${contacts.segment} != '' AND ${contacts.segment} != 'other'`)),
    db.select({ count: count() }).from(contacts).where(and(eq(contacts.userId, userId), sql`${contacts.city} IS NOT NULL AND ${contacts.city} != ''`)),
  ]);

  return {
    total,
    fields: [
      { field: "Email", count: hasEmail[0]?.count || 0 },
      { field: "Phone", count: hasPhone[0]?.count || 0 },
      { field: "Address", count: hasAddress[0]?.count || 0 },
      { field: "City", count: hasCity[0]?.count || 0 },
      { field: "Company", count: hasCompany[0]?.count || 0 },
      { field: "GHL Synced", count: hasGhl[0]?.count || 0 },
      { field: "Tier Scored", count: hasTier[0]?.count || 0 },
      { field: "Segmented", count: hasSegment[0]?.count || 0 },
    ],
  };
}

// ─── Contact Sync Helpers ───────────────────────────────────────────────────
export async function getContactByGhlId(userId: number, ghlContactId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(contacts)
    .where(and(eq(contacts.userId, userId), eq(contacts.ghlContactId, ghlContactId)))
    .limit(1);
  return result[0] || null;
}

export async function getDirtyContacts(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contacts)
    .where(and(eq(contacts.userId, userId), eq(contacts.syncStatus, "pending" as any)))
    .orderBy(asc(contacts.updatedAt))
    .limit(limit);
}

export async function markContactSynced(id: number, userId: number, ghlContactId?: string) {
  const db = await getDb();
  if (!db) return;
  const data: Record<string, any> = {
    syncStatus: "synced",
    lastSyncedAt: new Date(),
  };
  if (ghlContactId) data.ghlContactId = ghlContactId;
  await db.update(contacts).set(data).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
}

export async function markContactDirty(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(contacts).set({ syncStatus: "pending" as any }).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
}

// ─── Integrations ────────────────────────────────────────────────────────────
export async function getIntegrations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(integrations).where(eq(integrations.userId, userId)).orderBy(asc(integrations.platform));
}

export async function getIntegrationByPlatform(userId: number, platform: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(integrations).where(and(eq(integrations.userId, userId), eq(integrations.platform, platform as any))).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getIntegrationCredentials(userId: number, platform: string): Promise<Record<string, string> | null> {
  const integration = await getIntegrationByPlatform(userId, platform);
  if (!integration?.credentials) return null;
  try { return JSON.parse(integration.credentials); } catch { return null; }
}

export async function upsertIntegration(data: InsertIntegration) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(integrations).where(and(eq(integrations.userId, data.userId), eq(integrations.platform, data.platform))).limit(1);
  if (existing.length > 0) {
    await db.update(integrations).set({ ...data, updatedAt: new Date() }).where(eq(integrations.id, existing[0].id));
  } else {
    await db.insert(integrations).values(data);
  }
}

export async function updateIntegrationStatus(
  userId: number,
  platform: string,
  status: "connected" | "disconnected" | "error",
  lastCheckedAt?: Date
) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(integrations).where(
    and(eq(integrations.userId, userId), eq(integrations.platform, platform as any))
  ).limit(1);
  if (existing.length > 0) {
    await db.update(integrations).set({
      status,
      lastCheckedAt: lastCheckedAt || new Date(),
      updatedAt: new Date(),
    }).where(eq(integrations.id, existing[0].id));
  }
}

// ─── Bulk Imports ──────────────────────────────────────────────────────────────────────────────
export async function getBulkImports(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bulkImports).where(eq(bulkImports.userId, userId)).orderBy(desc(bulkImports.createdAt));
}

export async function createBulkImport(data: InsertBulkImport) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(bulkImports).values(data);
  return result[0].insertId;
}

export async function updateBulkImport(id: number, data: Partial<InsertBulkImport>) {
  const db = await getDb();
  if (!db) return;
  await db.update(bulkImports).set(data).where(eq(bulkImports.id, id));
}

// ─── Campaigns ───────────────────────────────────────────────────────────────
export async function getCampaigns(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.createdAt));
}

export async function createCampaign(data: InsertCampaign) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(campaigns).values(data);
  return result[0].insertId;
}

export async function updateCampaign(id: number, userId: number, data: Partial<InsertCampaign>) {
  const db = await getDb();
  if (!db) return;
  await db.update(campaigns).set(data).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
}

export async function deleteCampaign(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
}

export async function getCampaignById(id: number, userId: number): Promise<Campaign | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId))).limit(1);
  return rows[0] || null;
}

export async function getInteractionsByCampaign(userId: number, campaignId: number, opts?: {
  channel?: string; limit?: number; offset?: number;
}) {
  const db = await getDb();
  if (!db) return { interactions: [], total: 0 };
  const conditions = [eq(contactInteractions.userId, userId), eq(contactInteractions.campaignId, campaignId)];
  if (opts?.channel && opts.channel !== "all") conditions.push(eq(contactInteractions.channel, opts.channel as any));
  const where = and(...conditions);
  const [rows, totalResult] = await Promise.all([
    db.select().from(contactInteractions).where(where).orderBy(desc(contactInteractions.createdAt)).limit(opts?.limit || 50).offset(opts?.offset || 0),
    db.select({ count: count() }).from(contactInteractions).where(where),
  ]);
  return { interactions: rows, total: totalResult[0]?.count || 0 };
}

export async function getCampaignInteractionStats(userId: number, campaignId: number) {
  const db = await getDb();
  if (!db) return { total: 0, byChannel: [], byType: [], byDirection: [] };
  const where = and(eq(contactInteractions.userId, userId), eq(contactInteractions.campaignId, campaignId));
  const [total, byChannel, byType, byDirection] = await Promise.all([
    db.select({ count: count() }).from(contactInteractions).where(where),
    db.select({ channel: contactInteractions.channel, count: count() }).from(contactInteractions).where(where).groupBy(contactInteractions.channel),
    db.select({ type: contactInteractions.type, count: count() }).from(contactInteractions).where(where).groupBy(contactInteractions.type),
    db.select({ direction: contactInteractions.direction, count: count() }).from(contactInteractions).where(where).groupBy(contactInteractions.direction),
  ]);
  return { total: total[0]?.count || 0, byChannel, byType, byDirection };
}

export async function getCampaignsForContact(userId: number, contactId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get distinct campaign IDs from contact interactions, then fetch those campaigns
  const interactionCampaigns = await db
    .selectDistinct({ campaignId: contactInteractions.campaignId })
    .from(contactInteractions)
    .where(and(
      eq(contactInteractions.userId, userId),
      eq(contactInteractions.contactId, contactId),
      sql`${contactInteractions.campaignId} IS NOT NULL`
    ));
  const campaignIds = interactionCampaigns.map(r => r.campaignId).filter((id): id is number => id != null);
  if (campaignIds.length === 0) return [];
  return db.select().from(campaigns).where(and(eq(campaigns.userId, userId), inArray(campaigns.id, campaignIds))).orderBy(desc(campaigns.createdAt));
}

// ─── Campaign Templates ─────────────────────────────────────────────────────
export async function getTemplates(userId: number, channel?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(campaignTemplates.userId, userId)];
  if (channel && channel !== "all") conditions.push(eq(campaignTemplates.channel, channel as any));
  return db.select().from(campaignTemplates).where(and(...conditions)).orderBy(desc(campaignTemplates.createdAt));
}

export async function createTemplate(data: InsertCampaignTemplate) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(campaignTemplates).values(data);
  return result[0].insertId;
}

export async function updateTemplate(id: number, userId: number, data: Partial<InsertCampaignTemplate>) {
  const db = await getDb();
  if (!db) return;
  await db.update(campaignTemplates).set(data).where(and(eq(campaignTemplates.id, id), eq(campaignTemplates.userId, userId)));
}

export async function deleteTemplate(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(campaignTemplates).where(and(eq(campaignTemplates.id, id), eq(campaignTemplates.userId, userId)));
}

// ─── Sync Queue ──────────────────────────────────────────────────────────────
export async function getSyncQueue(userId: number, opts?: { status?: string; platform?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(syncQueue.userId, userId)];
  if (opts?.status && opts.status !== "all") conditions.push(eq(syncQueue.status, opts.status as any));
  if (opts?.platform && opts.platform !== "all") conditions.push(eq(syncQueue.platform, opts.platform as any));
  return db.select().from(syncQueue).where(and(...conditions)).orderBy(desc(syncQueue.createdAt)).limit(opts?.limit || 100);
}

export async function getSyncStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, byStatus: [], byPlatform: [] };
  const [total, byStatus, byPlatform] = await Promise.all([
    db.select({ count: count() }).from(syncQueue).where(eq(syncQueue.userId, userId)),
    db.select({ status: syncQueue.status, count: count() }).from(syncQueue).where(eq(syncQueue.userId, userId)).groupBy(syncQueue.status),
    db.select({ platform: syncQueue.platform, count: count() }).from(syncQueue).where(eq(syncQueue.userId, userId)).groupBy(syncQueue.platform),
  ]);
  return { total: total[0]?.count || 0, byStatus, byPlatform };
}

export async function retrySyncItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(syncQueue).set({ status: "pending", attempts: 0, lastError: null, nextRetryAt: null }).where(eq(syncQueue.id, id));
}

export async function retryAllDlq(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(syncQueue).set({ status: "pending", attempts: 0, lastError: null, nextRetryAt: null }).where(and(eq(syncQueue.userId, userId), eq(syncQueue.status, "dlq")));
}

// ─── Activity Log ────────────────────────────────────────────────────────────
export async function getActivityLog(userId: number, opts?: { type?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { entries: [], total: 0 };
  const conditions = [eq(activityLog.userId, userId)];
  if (opts?.type && opts.type !== "all") conditions.push(eq(activityLog.type, opts.type as any));
  const where = and(...conditions);
  const [entries, totalResult] = await Promise.all([
    db.select().from(activityLog).where(where).orderBy(desc(activityLog.createdAt)).limit(opts?.limit || 50).offset(opts?.offset || 0),
    db.select({ count: count() }).from(activityLog).where(where),
  ]);
  return { entries, total: totalResult[0]?.count || 0 };
}

export async function logActivity(data: InsertActivityLogEntry) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLog).values(data);
}

// ─── Backups ─────────────────────────────────────────────────────────────────
export async function getBackups(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(backups).where(eq(backups.userId, userId)).orderBy(desc(backups.createdAt));
}

export async function createBackup(data: InsertBackup) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(backups).values(data);
  return result[0].insertId;
}

export async function updateBackup(id: number, data: Partial<InsertBackup>) {
  const db = await getDb();
  if (!db) return;
  await db.update(backups).set(data).where(eq(backups.id, id));
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) return { contacts: 0, campaigns: 0, syncPending: 0, integrations: 0, recentActivity: [], campaignsByStatus: [] };
  const [contactCount, campaignCount, syncPending, integrationCount, recentActivity, campaignsByStatus] = await Promise.all([
    db.select({ count: count() }).from(contacts).where(eq(contacts.userId, userId)),
    db.select({ count: count() }).from(campaigns).where(eq(campaigns.userId, userId)),
    db.select({ count: count() }).from(syncQueue).where(and(eq(syncQueue.userId, userId), inArray(syncQueue.status, ["pending", "processing"]))),
    db.select({ count: count() }).from(integrations).where(
      and(
        eq(integrations.userId, userId),
        sql`${integrations.credentials} IS NOT NULL AND ${integrations.credentials} != '' AND ${integrations.credentials} != '{}'`,
        sql`${integrations.status} != 'disconnected'`
      )
    ),
    db.select().from(activityLog).where(eq(activityLog.userId, userId)).orderBy(desc(activityLog.createdAt)).limit(10),
    db.select({ status: campaigns.status, count: count() }).from(campaigns).where(eq(campaigns.userId, userId)).groupBy(campaigns.status),
  ]);
  return {
    contacts: contactCount[0]?.count || 0,
    campaigns: campaignCount[0]?.count || 0,
    syncPending: syncPending[0]?.count || 0,
    integrations: integrationCount[0]?.count || 0,
    recentActivity,
    campaignsByStatus,
  };
}


// ─── Batch Contact Retrieval ─────────────────────────────────────────────────
export async function getContactsByIds(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return [];
  return db.select().from(contacts).where(inArray(contacts.id, ids));
}

// ─── Contact Interactions (Unified Timeline) ────────────────────────────────
export async function getContactInteractions(userId: number, contactId: number, opts?: {
  channel?: string; limit?: number; offset?: number;
}) {
  const db = await getDb();
  if (!db) return { interactions: [], total: 0 };
  const conditions = [eq(contactInteractions.userId, userId), eq(contactInteractions.contactId, contactId)];
  if (opts?.channel && opts.channel !== "all") conditions.push(eq(contactInteractions.channel, opts.channel as any));
  const where = and(...conditions);
  const [rows, totalResult] = await Promise.all([
    db.select().from(contactInteractions).where(where).orderBy(desc(contactInteractions.createdAt)).limit(opts?.limit || 50).offset(opts?.offset || 0),
    db.select({ count: count() }).from(contactInteractions).where(where),
  ]);
  return { interactions: rows, total: totalResult[0]?.count || 0 };
}

export async function createInteraction(data: InsertContactInteraction) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(contactInteractions).values(data);
  return result[0].insertId;
}

export async function getInteractionStats(userId: number, contactId?: number) {
  const db = await getDb();
  if (!db) return { total: 0, byChannel: [], byType: [], byDirection: [] };
  const conditions = [eq(contactInteractions.userId, userId)];
  if (contactId) conditions.push(eq(contactInteractions.contactId, contactId));
  const where = and(...conditions);
  const [total, byChannel, byDirection] = await Promise.all([
    db.select({ count: count() }).from(contactInteractions).where(where),
    db.select({ channel: contactInteractions.channel, count: count() }).from(contactInteractions).where(where).groupBy(contactInteractions.channel),
    db.select({ direction: contactInteractions.direction, count: count() }).from(contactInteractions).where(where).groupBy(contactInteractions.direction),
  ]);
  return { total: total[0]?.count || 0, byChannel, byDirection };
}

export async function getCrossChannelMetrics(userId: number) {
  const db = await getDb();
  if (!db) return { totalInteractions: 0, byChannel: [], recentInteractions: [], campaignPerformance: [] };
  const [totalInteractions, byChannel, recentInteractions] = await Promise.all([
    db.select({ count: count() }).from(contactInteractions).where(eq(contactInteractions.userId, userId)),
    db.select({ channel: contactInteractions.channel, count: count() }).from(contactInteractions).where(eq(contactInteractions.userId, userId)).groupBy(contactInteractions.channel),
    db.select().from(contactInteractions).where(eq(contactInteractions.userId, userId)).orderBy(desc(contactInteractions.createdAt)).limit(20),
  ]);
  return {
    totalInteractions: totalInteractions[0]?.count || 0,
    byChannel,
    recentInteractions,
    campaignPerformance: [],
  };
}

// ─── Channel Configs ────────────────────────────────────────────────────────
export async function getChannelConfigs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(channelConfigs).where(eq(channelConfigs.userId, userId)).orderBy(asc(channelConfigs.channel));
}

export async function upsertChannelConfig(data: InsertChannelConfig) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(channelConfigs)
    .where(and(eq(channelConfigs.userId, data.userId), eq(channelConfigs.channel, data.channel)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(channelConfigs).set({ ...data, updatedAt: new Date() }).where(eq(channelConfigs.id, existing[0].id));
  } else {
    await db.insert(channelConfigs).values(data);
  }
}

export async function getChannelConfig(userId: number, channel: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(channelConfigs)
    .where(and(eq(channelConfigs.userId, userId), eq(channelConfigs.channel, channel as any)))
    .limit(1);
  return result[0] || null;
}

// ─── GHL Import Jobs ────────────────────────────────────────────────────────
export async function createGhlImportJob(data: InsertGhlImportJob) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(ghlImportJobs).values(data);
  return result[0].insertId;
}

export async function getGhlImportJobs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ghlImportJobs).where(eq(ghlImportJobs.userId, userId)).orderBy(desc(ghlImportJobs.createdAt));
}

export async function getGhlImportJob(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(ghlImportJobs).where(eq(ghlImportJobs.id, id)).limit(1);
  return result[0] || null;
}

export async function updateGhlImportJob(id: number, data: Partial<InsertGhlImportJob>) {
  const db = await getDb();
  if (!db) return;
  await db.update(ghlImportJobs).set(data).where(eq(ghlImportJobs.id, id));
}

// ─── Contact Custom Fields ──────────────────────────────────────────────────
export async function getContactCustomFields(contactId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contactCustomFields).where(eq(contactCustomFields.contactId, contactId));
}

export async function upsertContactCustomField(data: InsertContactCustomField) {
  const db = await getDb();
  if (!db) return;
  await db.insert(contactCustomFields).values(data).onDuplicateKeyUpdate({
    set: {
      value: data.value,
      fieldName: data.fieldName,
      fieldKey: data.fieldKey,
      fieldType: data.fieldType,
      updatedAt: new Date(),
    },
  });
}

export async function deleteContactCustomField(contactId: number, ghlFieldId: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(contactCustomFields).where(
    and(eq(contactCustomFields.contactId, contactId), eq(contactCustomFields.ghlFieldId, ghlFieldId))
  );
}

// ─── Custom Field Definitions ───────────────────────────────────────────────
export async function getCustomFieldDefinitions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customFieldDefinitions).orderBy(asc(customFieldDefinitions.displayOrder));
}

export async function getCustomFieldDefinitionsByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customFieldDefinitions)
    .where(eq(customFieldDefinitions.category, category))
    .orderBy(asc(customFieldDefinitions.displayOrder));
}

// ─── Contact with Custom Fields (joined query) ─────────────────────────────
// ─── Admin: Purge Test Data ─────────────────────────────────────────────────
export async function purgeTestContacts(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  // Delete contacts matching e2e/test patterns
  const result = await db.delete(contacts).where(
    and(
      eq(contacts.userId, userId),
      or(
        like(contacts.email, 'e2e-%'),
        like(contacts.email, 'john.doe.%@test.com'),
        like(contacts.email, '%@e2e-test.com'),
        like(contacts.firstName, 'E2E Test%'),
        like(contacts.firstName, 'Test Contact%'),
      )!
    )
  );
  return (result as any)[0]?.affectedRows ?? 0;
}

export async function purgeTestCampaigns(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.delete(campaigns).where(
    and(
      eq(campaigns.userId, userId),
      or(
        like(campaigns.name, 'E2E Test%'),
        like(campaigns.name, 'Test Campaign%'),
        like(campaigns.name, 'e2e_%'),
      )!
    )
  );
  return (result as any)[0]?.affectedRows ?? 0;
}

export async function purgeTestImports(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.delete(bulkImports).where(
    and(
      eq(bulkImports.userId, userId),
      or(
        like(bulkImports.fileName, 'test-import%'),
        like(bulkImports.fileName, 'e2e_test_import%'),
        like(bulkImports.fileName, 'E2E%'),
      )!
    )
  );
  return (result as any)[0]?.affectedRows ?? 0;
}

export async function purgeTestActivity(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.delete(activityLog).where(
    and(
      eq(activityLog.userId, userId),
      or(
        like(activityLog.description, '%E2E Test%'),
        like(activityLog.description, '%e2e-%'),
        like(activityLog.description, '%john.doe.%@test.com%'),
        like(activityLog.description, '%Test Campaign%'),
      )!
    )
  );
  return (result as any)[0]?.affectedRows ?? 0;
}

// ─── Paginated Bulk Imports ─────────────────────────────────────────────────
export async function getBulkImportsPaginated(userId: number, opts: { limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { imports: [], total: 0 };
  const where = eq(bulkImports.userId, userId);
  const [rows, totalResult] = await Promise.all([
    db.select().from(bulkImports).where(where).orderBy(desc(bulkImports.createdAt)).limit(opts.limit || 10).offset(opts.offset || 0),
    db.select({ count: count() }).from(bulkImports).where(where),
  ]);
  return { imports: rows, total: totalResult[0]?.count || 0 };
}

export async function getContactWithCustomFields(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const contact = await db.select().from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
    .limit(1);
  if (!contact[0]) return null;

  const customFields = await db.select().from(contactCustomFields)
    .where(eq(contactCustomFields.contactId, id));

  return { ...contact[0], customFields };
}
