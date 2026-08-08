# Stewardly Command Center — Comprehensive Design & Build Documentation

**Project**: Stewardly Command Center
**Domain**: stewardcc-a4cm9uy3.manus.space
**Stack**: React 19 + Tailwind CSS 4 + Express 4 + tRPC 11 + Drizzle ORM + MySQL (TiDB)
**Author**: Manus AI, in collaboration with Michael Penn
**Last Updated**: April 13, 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Schema Design](#3-database-schema-design)
4. [Backend Services Layer](#4-backend-services-layer)
5. [Frontend Application](#5-frontend-application)
6. [Platform Integrations](#6-platform-integrations)
7. [Data Pipeline & Contact Sync](#7-data-pipeline--contact-sync)
8. [Testing Strategy](#8-testing-strategy)
9. [Standalone Infrastructure](#9-standalone-infrastructure)
10. [Design Decisions & Rationale](#10-design-decisions--rationale)
11. [Known Issues & Remaining Work](#11-known-issues--remaining-work)
12. [Appendix: File Inventory](#12-appendix-file-inventory)

---

## 1. Executive Summary

The Stewardly Command Center is a full-stack marketing operations platform built to unify contact management, multi-platform campaign orchestration, and data synchronization across GoHighLevel (GHL), SMS-iT, and Dripify. The system serves as a centralized command hub for Stewardly's business operations, enabling bulk contact import, cross-platform sync, campaign management, and real-time analytics.

The platform was designed and built across multiple intensive sessions, progressing from initial scaffolding through database schema design, service layer implementation, multi-platform API integration, a comprehensive test suite (205 tests across 10 files), a data deduplication pipeline processing 668,883 source records into 561,806 unique contacts, and a standalone parallel sync engine capable of uploading contacts to GHL at 500–600 records per minute.

### Key Metrics

| Metric | Value |
|---|---|
| Total Lines of Code (server + client) | ~8,160 |
| Database Tables | 8 |
| tRPC Procedures | 55+ |
| Backend Services | 8 modules |
| Frontend Pages | 12 |
| Test Cases | 205 (144 unit + 61 live E2E) |
| Test Files | 10 |
| Dependencies | 67 production + 23 dev |
| Contacts Deduplicated | 561,806 unique from 668,883 source rows |
| GHL Contacts Synced | ~275,000 (main sync active at 200/min) |  
| Google Drive Contacts Added | 948 new + 354 updated (2,096 processed) |

---

## 2. Architecture Overview

The application follows a layered architecture with clear separation of concerns. The frontend communicates with the backend exclusively through tRPC, which provides end-to-end type safety from database queries through to React hooks.

### System Layers

```
┌─────────────────────────────────────────────────────┐
│  Frontend (React 19 + Tailwind 4 + shadcn/ui)       │
│  └─ tRPC hooks (useQuery / useMutation)             │
├─────────────────────────────────────────────────────┤
│  API Layer (tRPC Router — server/routers.ts)         │
│  └─ 55+ procedures (public + protected)             │
├─────────────────────────────────────────────────────┤
│  Service Layer (server/services/*.ts)                │
│  └─ GHL, SMS-iT, Dripify, Orchestrator,            │
│     SyncScheduler, SyncWorker, CampaignEngine,      │
│     Credentials                                      │
├─────────────────────────────────────────────────────┤
│  Data Layer (Drizzle ORM → MySQL/TiDB)              │
│  └─ 8 tables, 2 migrations, server/db.ts helpers    │
├─────────────────────────────────────────────────────┤
│  External APIs                                       │
│  └─ GHL v2 API, SMS-iT API, Dripify/Firebase API   │
└─────────────────────────────────────────────────────┘
```

### Design Theme

The UI uses an elegant dark theme with a deep navy background and warm gold accent palette. The design system is built on OKLCH color space for perceptual uniformity, with Plus Jakarta Sans as the primary typeface and Instrument Serif for display headings. All color tokens are defined as CSS custom properties in `client/src/index.css`, enabling global consistency.

| Token | OKLCH Value | Purpose |
|---|---|---|
| `--background` | `oklch(0.13 0.012 260)` | Deep navy base |
| `--primary` | `oklch(0.78 0.12 85)` | Warm gold accent |
| `--card` | `oklch(0.16 0.014 260)` | Elevated surface |
| `--destructive` | `oklch(0.65 0.2 25)` | Error/danger states |
| `--muted-foreground` | `oklch(0.60 0.02 260)` | Secondary text |

---

## 3. Database Schema Design

The database consists of 8 tables managed through Drizzle ORM with MySQL (TiDB) as the backing store. Schema changes follow a migration-first workflow: edit `drizzle/schema.ts`, generate SQL with `pnpm drizzle-kit generate`, then apply via `webdev_execute_sql`.

### Table Overview

| Table | Purpose | Key Fields |
|---|---|---|
| `users` | Authentication and role management | `id`, `openId`, `name`, `role` (admin/user) |
| `integrations` | Platform connection state and credentials | `userId`, `platform` (ghl/dripify/linkedin/smsit), `status`, `credentials` (JSON) |
| `contacts` | Unified contact records across all platforms | `email`, `phone`, `segment`, `tier`, `ghlContactId`, `dripifyProfileUrl`, `syncStatus` |
| `bulk_imports` | CSV/JSON import job tracking | `fileName`, `totalRows`, `processedRows`, `status`, `errorLog` |
| `campaigns` | Multi-channel campaign definitions | `channel` (email/sms/linkedin/multi), `status`, `audienceFilter`, `scheduledAt` |
| `campaign_templates` | Reusable message templates | `channel`, `subject`, `body`, `variables` |
| `sync_queue` | Bidirectional sync job queue with DLQ | `direction` (push/pull), `platform`, `status`, `retryCount`, `payload` |
| `activity_log` | Audit trail for all system events | `type`, `action`, `description`, `severity`, `metadata` |
| `backups` | Contact/campaign export management | `type`, `format`, `fileUrl`, `fileKey`, `recordCount`, `status` |

### Contact Segments

The `contacts` table supports the following segment enumeration, reflecting Stewardly's diverse prospect and client categories:

- `residential` — Residential property owners (534,138 records)
- `commercial` — Commercial property entities (27,077 records across Cochise, Mohave, Pima, Santa Cruz, and unknown counties)
- `agricultural` — Agricultural property owners (361 records)
- `cpa-tax` — CPA and tax professionals
- `estate-attorney` — Estate planning attorneys
- `hr-benefits` — HR and benefits professionals
- `insurance-agency` — Insurance agency contacts
- `nonprofit` — Nonprofit organizations
- `recruiting-professional` — Inbound candidates and outbound prospects (pending import)
- `strategic-partner-coi` — Strategic partners and centers of influence (pending import)
- `coi-event` — COIs sourced through events (pending import)

### Contact Scoring

Each contact carries a `tier` field (gold, silver, bronze, unscored) and an `overallScore` decimal field, supporting prioritization for campaign targeting and outreach sequencing.

---

## 4. Backend Services Layer

The backend is organized into 8 service modules under `server/services/`, each encapsulating a specific domain. All services are consumed by tRPC procedures in `server/routers.ts` and tested through both unit and live E2E tests.

### 4.1 GHL Service (`ghl.ts` — 600 lines)

The GoHighLevel integration is the largest service module, providing full CRUD operations against the GHL v2 API. It handles JWT-based authentication with automatic token refresh, contact upsert with field mapping, and batch operations.

**Key functions**: `testConnection`, `getContacts`, `upsertContact`, `searchContacts`, `getContactById`, `deleteContact`, `updateToken`, `pullContactBatch`

**Authentication**: Uses a JWT (`authToken`) extracted from the GHL web application's localStorage via Chrome DevTools Protocol (CDP). The token has a 60-minute TTL and is refreshed automatically by a standalone daemon.

**Field mapping**: Transforms Stewardly's unified contact schema into GHL's custom field format, mapping `segment`, `tier`, `overallScore`, `county`, and `propertyType` to GHL custom fields.

### 4.2 SMS-iT Service (`smsit.ts` — 181 lines)

Integrates with the SMS-iT API for SMS campaign delivery and contact management. Uses API key authentication with a minimum key length of 20 characters.

**Key functions**: `testConnection`, `checkCreditBalance`, `listContacts`, `getTemplates`, `sendSms`

### 4.3 Dripify Service (`dripify.ts` — 215 lines)

Integrates with Dripify's LinkedIn automation platform via Firebase authentication. Includes a failover mechanism for token validation that checks token length (>50 chars) and format before making live API calls.

**Key functions**: `testConnection`, `getProfile`, `listCampaigns`, `getCampaignLeads`, `refreshFirebaseToken`, `isTokenExpired`, `processWebhookEvent`

**Token management**: Dripify uses Firebase ID tokens that expire every 60 minutes. A standalone daemon (`dripify_refresh_daemon.py`) uses the Firebase token refresh API (`securetoken.googleapis.com`) to maintain a valid token.

### 4.4 Credentials Service (`credentials.ts` — 124 lines)

Centralizes credential loading from the database. Maps between the DB's JSON credential format and the typed credential objects expected by each platform service. Handles two credential key formats that evolved during development:

- **Legacy format**: `{ api_key, jwt, authToken, refreshToken }` (underscore-separated)
- **Current format**: `{ apiKey, jwt, authToken, refreshToken }` (camelCase)

The service normalizes both formats transparently, ensuring backward compatibility.

### 4.5 Orchestrator (`orchestrator.ts` — 310 lines)

The orchestrator coordinates multi-platform operations through a sequence-based execution model. It manages platform health checks, multi-step sequences (e.g., "pull from GHL → enrich → push to Dripify"), and provides pause/resume/cancel lifecycle management.

**Key functions**: `getPlatformHealth`, `startSequence`, `getSequenceStatus`, `listSequences`, `pauseSequence`, `resumeSequence`, `cancelSequence`

**Health checks**: The orchestrator calls each platform's `testConnection` function and updates the integration status in the database, keeping the dashboard's "Connected Platforms" counter accurate.

### 4.6 Sync Scheduler (`syncScheduler.ts` — 205 lines)

Manages periodic synchronization between Stewardly and external platforms. Supports configurable intervals, force-pull operations for individual platforms or all platforms simultaneously, and webhook event processing.

**Key functions**: `start`, `stop`, `getStatus`, `forcePull`, `processWebhook`

### 4.7 Sync Worker (`syncWorker.ts` — 465 lines)

The sync worker processes individual sync queue items, handling retries with exponential backoff, dead-letter queue (DLQ) management, and batch processing. It supports both push (Stewardly → external) and pull (external → Stewardly) directions.

### 4.8 Campaign Engine (`campaignEngine.ts` — 266 lines)

Manages campaign lifecycle from creation through execution. Supports multi-channel campaigns (email, SMS, LinkedIn, multi-channel), audience filtering based on contact segments and tiers, template variable interpolation, and scheduled execution.

---

## 5. Frontend Application

The frontend is a single-page application built with React 19, using wouter for routing and shadcn/ui for the component library. The application uses a persistent sidebar dashboard layout (`DashboardLayout.tsx`) appropriate for an internal operations tool.

### 5.1 Page Inventory

| Page | Route | Purpose | Lines |
|---|---|---|---|
| Home | `/` | Dashboard overview with KPI cards, segment breakdown, platform health, recent activity | 193 |
| Contacts | `/contacts` | Contact list with search, filter, pagination, and CRUD | 301 |
| Bulk Import | `/import` | CSV upload, column mapping, import progress tracking | 553 |
| Campaigns | `/campaigns` | Campaign creation, template management, execution monitoring | 486 |
| Sync Engine | `/sync` | Sync queue visualization, worker status, DLQ management | 236 |
| Integrations | `/integrations` | Platform connection management, credential entry, health testing | 384 |
| Enrichment | `/enrichment` | Contact data enrichment workflows | 138 |
| Analytics | `/analytics` | Campaign performance metrics and funnel visualization | 293 |
| Backups | `/backups` | Contact/campaign export and backup management | 151 |
| Activity Feed | `/activity` | Chronological audit log of all system events | 121 |
| Component Showcase | (internal) | Design system reference with all UI components | 1,437 |
| Not Found | `/404` | 404 error page | 52 |

### 5.2 Dashboard (Home.tsx)

The dashboard displays four KPI cards at the top: Total Contacts, Active Campaigns, Sync Queue, and Connected Platforms. The Connected Platforms card is wired to the live `platformHealth` tRPC query, which calls each platform's `testConnection` function and returns the count of healthy platforms. The dashboard also shows a Contact Segments breakdown (residential, commercial, other) and a Recent Activity feed.

**Implementation detail**: The Connected Platforms counter uses a two-tier approach. The initial render uses the fast DB-based count (integrations with non-empty credentials), while the live health check runs asynchronously and updates the count when results arrive. This prevents the counter from showing 0 during the 3–5 second health check delay.

### 5.3 Navigation Structure

The sidebar navigation provides access to all 10 primary pages, organized by function:

- **Overview** — Dashboard home
- **Contacts** — Contact management
- **Bulk Import** — Data ingestion
- **Campaigns** — Outreach management
- **Sync Engine** — Platform synchronization
- **Integrations** — Platform connections
- **Enrichment** — Data enhancement
- **Analytics** — Performance metrics
- **Backups** — Data export
- **Activity** — Audit log

---

## 6. Platform Integrations

### 6.1 GoHighLevel (GHL)

GHL serves as the primary CRM and campaign execution platform. The integration supports bidirectional contact sync, with Stewardly acting as the master data source and GHL as the execution layer.

**Authentication method**: Internal JWT extracted from GHL web application via CDP. The JWT is stored in `/home/ubuntu/master_db/ghl_token.json` and refreshed by a standalone Python daemon that navigates the browser to trigger GHL's internal token refresh mechanism.

**API endpoints**: The integration uses `backend.leadconnectorhq.com` for contact upsert operations, with `Version: 2021-07-28` header required for v2 API compatibility.

**Rate limits**: GHL enforces approximately 100 requests per minute. The parallel sync script uses a sliding window rate limiter to stay within this limit while maximizing throughput.

### 6.2 SMS-iT

SMS-iT provides SMS campaign delivery and credit management. The integration uses a simple API key authentication model.

**Authentication method**: API key stored in the integrations table. The key must be at least 20 characters long.

**Capabilities**: Connection testing, credit balance checking, contact listing, template retrieval, and SMS sending.

### 6.3 Dripify

Dripify provides LinkedIn automation for outreach campaigns. The integration uses Firebase authentication, requiring periodic token refresh.

**Authentication method**: Firebase ID token with a 60-minute TTL. The refresh token is used to obtain new ID tokens via the Firebase `securetoken.googleapis.com` endpoint.

**Capabilities**: Profile retrieval, campaign listing, campaign lead extraction, webhook event processing, and token lifecycle management.

---

## 7. Data Pipeline & Contact Sync

### 7.1 Source Data

The contact data originates from multiple CSV files organized by property type and geography:

| Source Category | Files | Records |
|---|---|---|
| Residential (batches 01–26) | 26 files | 645,721 |
| Commercial (Cochise, Mohave, Pima, Santa Cruz, Unknown) | 5 files | 22,801 |
| Agricultural | 1 file | 361 |
| CPA/Tax | 1 file | varies |
| Estate Attorney | 1 file | varies |
| HR/Benefits | 1 file | varies |
| Insurance Agency | 1 file | varies |
| Nonprofit | 1 file | varies |
| **Total source files** | **37 ghl_full + 7 WB_ source** | **668,883 + 545,762** |

### 7.2 Deduplication Pipeline

The deduplication pipeline (`/home/ubuntu/master_db/dedup_pipeline.py`) processes all source files through a multi-stage merge:

1. **Stage 1**: Combine all 37 `ghl_full_*.csv` files (pre-formatted for GHL) into a single dataset, deduplicating by email address. Result: 668,883 → 500,581 unique records.

2. **Stage 2**: Process 7 `WB_*.csv` source files (raw format with additional fields like county and property type). Transform each into GHL-ready format and merge with Stage 1 results, adding any records not already present by email.

3. **Stage 3**: Merge segment tags. A single contact may appear in multiple source files (e.g., both residential and commercial). The pipeline concatenates segment tags rather than overwriting them.

**Final output**: `WTA_Correct_Master.csv` — 561,806 unique records (197 MB), with 13 columns in GHL-ready format:

```
firstName, lastName, email, phone, address1, city, state, postalCode,
country, tags, source, companyName, customField.*
```

### 7.3 Standalone Parallel Sync

The standalone sync script (`/home/ubuntu/master_db/ghl_parallel_sync.js`) uploads contacts to GHL via the upsert API. Key design features:

- **Checkpoint-based resumption**: Progress is saved to `sync_checkpoint.json` after every batch, enabling restart from the exact row where processing stopped.
- **Sliding window rate limiter**: Maintains a rolling window of request timestamps to enforce the 100 req/min GHL rate limit without artificial delays.
- **Token auto-reload**: Reads the token file before each batch, picking up refreshed tokens from the daemon.
- **Error handling**: Logs errors per-row with full context, skips rows missing both email and phone, and continues processing.
- **Statistics tracking**: Maintains running counts of new, updated, skipped, and errored records in `sync_stats.json`.

**Performance**: The earlier Python version with 10 parallel workers achieved 500–600 records/min. The current Node.js version operates at ~85–100/min due to sequential processing (to be re-optimized with parallel workers).

### 7.4 Sync Progress

As of the latest session, 270,219 contacts have been successfully synced to GHL from previous sessions. The current sync run started from row 270,000 (skipping already-synced contacts) with approximately 291,806 remaining.

---

## 8. Testing Strategy

The test suite comprises 205 test cases across 10 files, organized into three tiers: unit tests, integration tests, and live end-to-end tests.

### 8.1 Test File Inventory

| File | Tests | Type | Description |
|---|---|---|---|
| `auth.logout.test.ts` | 1 | Unit | Reference sample test for auth logout |
| `credentials.test.ts` | 17 | Unit | Credential loading, format normalization, fallback handling |
| `e2e.test.ts` | 33 | Integration | Full user journey: auth → contacts → campaigns → sync → integrations |
| `features.test.ts` | 31 | Integration | Feature-level tests: CRUD, bulk import, campaign engine, enrichment |
| `orchestrator.test.ts` | 26 | Unit | Orchestrator sequences, health checks, lifecycle management |
| `services.test.ts` | 36 | Unit | Service-level tests: GHL, SMS-iT, Dripify, sync worker |
| `live-e2e.test.ts` | 15 | Live E2E | Real API calls to GHL with live credentials |
| `live-campaign.test.ts` | 16 | Live E2E | Campaign creation and execution with real platforms |
| `live-smsit-dripify.test.ts` | 13 | Live E2E | Real API calls to SMS-iT and Dripify |
| `live-orchestrator-sync.test.ts` | 17 | Live E2E | Real orchestrator sequences and sync scheduler operations |

### 8.2 Test Isolation

A critical design decision was isolating non-live tests from production data. All non-live test files use `userId: 9999` in their `createAuthContext()` helper, ensuring that test operations (especially `testConnection` and `disconnect` mutations) never overwrite real credentials stored under `userId: 1`.

This isolation was implemented after discovering that the test suite's `disconnect` and `testConnection` calls were resetting real GHL/SMS-iT/Dripify credentials to empty objects, causing the dashboard to show "Connected Platforms: 0" after every test run.

### 8.3 Running Tests

```bash
# Run all non-live tests (144 tests)
pnpm vitest run --exclude='**/live-*.test.ts'

# Run specific live test suites (requires real credentials in DB)
pnpm vitest run server/live-smsit-dripify.test.ts
pnpm vitest run server/live-orchestrator-sync.test.ts

# Run all tests including live (205 tests)
pnpm vitest run
```

---

## 9. Standalone Infrastructure

Several standalone scripts run outside the web application to support long-running operations that cannot be interrupted by server restarts or deployments.

### 9.1 GHL Token Auto-Refresh Daemon

**File**: `/home/ubuntu/master_db/ghl_auto_refresh_v3.py`

This Python daemon monitors the GHL JWT token's remaining TTL and triggers a refresh when it drops below 15 minutes. The refresh mechanism uses Chrome DevTools Protocol (CDP) to:

1. Connect to the running Chromium instance via WebSocket
2. Navigate the GHL browser tab to a different page (e.g., contacts → dashboard)
3. Wait for GHL's internal token refresh to complete
4. Extract the refreshed token from localStorage
5. Save it to `ghl_token.json`

This approach was necessary because GHL's server-side token refresh endpoints are protected by Cloudflare and return 403 when called from the sandbox IP.

### 9.2 Dripify Token Auto-Refresh Daemon

**File**: `/home/ubuntu/master_db/dripify_refresh_daemon.py`

This daemon refreshes the Dripify Firebase ID token using the standard Firebase token refresh API (`securetoken.googleapis.com/v1/token`). It runs on a 45-minute cycle, refreshing the token before its 60-minute expiry.

### 9.3 GHL Parallel Sync Script

**File**: `/home/ubuntu/master_db/ghl_parallel_sync.js`

The main contact sync engine. Reads the deduped master CSV row by row, transforms each row into a GHL contact payload, and calls the upsert API. Features checkpoint-based resumption, rate limiting, and comprehensive error logging.

### 9.4 Deduplication Pipeline

**File**: `/home/ubuntu/master_db/dedup_pipeline.py`

A Python script that processes all source CSV files, deduplicates by email, merges segment tags, and produces the final master CSV. Handles both `ghl_full_*.csv` (pre-formatted) and `WB_*.csv` (raw source) file formats.

---

## 10. Design Decisions & Rationale

### 10.1 tRPC Over REST

The decision to use tRPC instead of traditional REST endpoints was driven by the need for end-to-end type safety. With 55+ procedures and complex data shapes (contacts with 20+ fields, campaigns with nested templates), tRPC eliminates an entire class of serialization bugs and provides autocomplete in the frontend.

### 10.2 JWT Extraction via CDP

GHL does not provide a standard OAuth2 flow for server-to-server authentication in the way needed for bulk operations. The CDP-based token extraction was chosen because:

- GHL's official API keys have different rate limits and capabilities than the internal JWT
- The internal JWT provides access to the same endpoints the web application uses
- CDP extraction is reliable as long as the browser session is maintained

### 10.3 Credential Format Normalization

During development, the credential storage format evolved from underscore-separated keys (`api_key`) to camelCase (`apiKey`). Rather than migrating all existing data, the credentials service was designed to normalize both formats transparently, ensuring backward compatibility without a database migration.

### 10.4 Dashboard Counter Two-Tier Approach

The "Connected Platforms" counter uses a two-tier display strategy:

- **Tier 1 (fast)**: Count integrations with non-empty credentials from the database (instant, <10ms)
- **Tier 2 (accurate)**: Run live health checks against each platform's API (3–5 seconds)

This prevents the dashboard from showing 0 during the health check delay, which was confusing to users.

### 10.5 Test Isolation with userId 9999

Non-live tests use `userId: 9999` to prevent test operations from affecting production data. This was a critical fix after discovering that the test suite's `testConnection` and `disconnect` mutations were overwriting real credentials for `userId: 1`.

### 10.6 Sync Skip-Ahead Strategy

When resuming the sync after 270,219 contacts were already in GHL, the checkpoint was manually advanced to row 270,000 to avoid re-upserting contacts that were already synced. This saved approximately 55 hours of redundant API calls at the 85/min rate.

---

## 11. Known Issues & Remaining Work

### 11.1 Active Issues

**Cloudflare IP Block**: The sandbox IP is currently blocked by Cloudflare for all GHL API endpoints (both `backend.leadconnectorhq.com` and `services.leadconnectorhq.com`). This block was triggered by the volume of API calls during the sync session. The block is expected to lift within 1–4 hours. Failover workarounds under development include session cycling, request throttling with jitter, and User-Agent rotation.

### 11.2 Pending Work

| Item | Status | Notes |
|---|---|---|
| Optimize sync to 500–600/min with parallel workers | Pending | Requires Cloudflare unblock first |
| Complete GHL contact sync (291K remaining) | In Progress | Blocked by Cloudflare |
| Import recruiting professionals from Google Drive | Pending | 12 .docx files in Drive folder |
| Import strategic partners/COIs from Google Sheets | Pending | 1 spreadsheet |
| Import COIs by events from Google Sheets | Pending | 1 spreadsheet |
| Process and tag new segments | Pending | Recruiting-Professional, Strategic-Partner-COI, COI-Event |
| Deduplicate new segments against master CSV | Pending | — |

### 11.3 Placeholder UI Elements

Several UI pages contain structural placeholders for features that are not yet fully implemented. Clicking these elements shows a "Feature coming soon" toast notification:

- **Enrichment page**: Data enrichment workflow triggers
- **Analytics page**: Some chart drill-down interactions
- **Backups page**: Scheduled backup configuration

---

## 12. Appendix: File Inventory

### 12.1 Server Files

| File | Lines | Purpose |
|---|---|---|
| `server/routers.ts` | 1,076 | All tRPC procedures (55+ endpoints) |
| `server/db.ts` | 373 | Database query helpers |
| `server/services/ghl.ts` | 600 | GoHighLevel API integration |
| `server/services/syncWorker.ts` | 465 | Sync queue processing engine |
| `server/services/orchestrator.ts` | 310 | Multi-platform sequence orchestration |
| `server/services/campaignEngine.ts` | 266 | Campaign lifecycle management |
| `server/services/syncScheduler.ts` | 205 | Periodic sync scheduling |
| `server/services/dripify.ts` | 215 | Dripify/LinkedIn automation integration |
| `server/services/smsit.ts` | 181 | SMS-iT API integration |
| `server/services/credentials.ts` | 124 | Credential loading and normalization |
| `drizzle/schema.ts` | ~250 | Database schema (8 tables) |

### 12.2 Client Files

| File | Lines | Purpose |
|---|---|---|
| `client/src/pages/ComponentShowcase.tsx` | 1,437 | Design system reference |
| `client/src/pages/BulkImport.tsx` | 553 | CSV import with column mapping |
| `client/src/pages/Campaigns.tsx` | 486 | Campaign management UI |
| `client/src/pages/Integrations.tsx` | 384 | Platform connection management |
| `client/src/pages/Contacts.tsx` | 301 | Contact list and CRUD |
| `client/src/pages/Analytics.tsx` | 293 | Performance metrics dashboard |
| `client/src/pages/SyncEngine.tsx` | 236 | Sync queue visualization |
| `client/src/pages/Home.tsx` | 193 | Dashboard overview |
| `client/src/pages/Backups.tsx` | 151 | Export management |
| `client/src/pages/Enrichment.tsx` | 138 | Data enrichment workflows |
| `client/src/pages/ActivityFeed.tsx` | 121 | Audit log viewer |
| `client/src/App.tsx` | ~50 | Routing and layout |
| `client/src/index.css` | ~120 | Theme tokens and global styles |

### 12.3 Test Files

| File | Tests | Purpose |
|---|---|---|
| `server/services.test.ts` | 36 | Service-level unit tests |
| `server/e2e.test.ts` | 33 | Full user journey integration tests |
| `server/features.test.ts` | 31 | Feature-level integration tests |
| `server/orchestrator.test.ts` | 26 | Orchestrator unit tests |
| `server/credentials.test.ts` | 17 | Credential normalization tests |
| `server/live-orchestrator-sync.test.ts` | 17 | Live orchestrator + sync scheduler E2E |
| `server/live-campaign.test.ts` | 16 | Live campaign execution E2E |
| `server/live-e2e.test.ts` | 15 | Live GHL API E2E |
| `server/live-smsit-dripify.test.ts` | 13 | Live SMS-iT + Dripify E2E |
| `server/auth.logout.test.ts` | 1 | Auth logout reference test |

### 12.4 Standalone Scripts

| File | Language | Purpose |
|---|---|---|
| `ghl_parallel_sync.js` | Node.js | Contact sync engine with checkpoint resumption |
| `ghl_sync_curl_imp.py` | Python | Cloudflare-bypass sync via curl-impersonate (active) |
| `ghl_refresh_curl_imp.py` | Python | Token refresh via curl-impersonate (active) |
| `sync_gdrive_contacts.py` | Python | Google Drive contacts sync to GHL |
| `process_gdrive_final.py` | Python | Google Drive XLSX/DOCX data extraction pipeline |
| `sync_watchdog_v2.sh` | Bash | Auto-restart watchdog for curl-impersonate sync |
| `ghl_auto_refresh_v3.py` | Python | GHL JWT token refresh via CDP (legacy) |
| `dripify_refresh_daemon.py` | Python | Dripify Firebase token refresh |
| `dedup_pipeline.py` | Python | CSV deduplication and master file builder |
| `cdp_token_extractor.py` | Python | Initial GHL token extraction from browser |
| `cdp_auto_refresh.py` | Python | Legacy CDP auto-refresh (superseded) |

---

### 12.5 Google Drive Data Processing

| Source | Records | Sheets Processed |
|---|---|---|
| Strategic Partners/COIs | 1,214 | CPAs & Tax Advisors (329), Estate & Trust Attorneys (177), Nonprofits & Foundations (204), HR & Benefits Consultants (74), Agricultural Clients (302), Referring Agencies (128) |
| COI Events | 1,099 | Master Event Schedule (645), Opportunity Organizations (158), Recruiting Pipeline (126), Organizations Directory (170) |
| Recruiting Professionals | 0 | 12 DOCX files were pipeline summaries, not individual contact lists |
| **Total (deduped)** | **2,157** | Cross-deduped against master CSV: 61 already existed, 2,096 new |
| **Synced to GHL** | **1,302** | 948 created + 354 updated; 485 rejected (no email/phone) |

### 12.6 Cloudflare Bypass Solution

The GHL API endpoints (`backend.leadconnectorhq.com`, `rest.gohighlevel.com`) are protected by Cloudflare, which blocked the sandbox's datacenter IP (HTTP 403). The solution uses **curl-impersonate** compiled with Chrome 116's TLS fingerprint, which makes requests indistinguishable from a real Chrome browser. This bypasses Cloudflare's TLS fingerprinting detection without requiring a proxy, VPN, or any user interaction.

| Component | File | Purpose |
|---|---|---|
| Sync Engine | `ghl_sync_curl_imp.py` | 6 parallel workers, curl-impersonate subprocess calls |
| Token Refresh | `ghl_refresh_curl_imp.py` | Refreshes JWT every 45 min via `/auth/refresh` endpoint |
| Watchdog | `sync_watchdog_v2.sh` | Auto-restarts sync if process dies or stalls >10 min |

---

*This document is maintained in the project codebase at `DOCUMENTATION.md` and should be updated as new features are implemented or architectural decisions change.*
