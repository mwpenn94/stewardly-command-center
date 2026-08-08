# Stewardly Command Center — Architecture

## Overview

Stewardly Command Center is a full-stack marketing operations platform built with React 19 and Express, designed to unify contact management, multi-platform campaign orchestration, and data synchronization. The architecture prioritizes:

1. **End-to-end type safety** — tRPC from database to UI with zero serialization gaps
2. **Mobile-first responsive design** — Every component works on 320px screens up to 4K
3. **Multi-platform integration** — GoHighLevel, SMS-iT, Dripify/LinkedIn unified under one API
4. **Modular service layer** — Each external platform gets its own service module
5. **Real-time sync** — Hybrid polling + webhook + event-driven synchronization

## System Layers

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
│  └─ 8 tables, schema-driven migrations              │
├─────────────────────────────────────────────────────┤
│  External APIs                                       │
│  └─ GHL v2 API, SMS-iT API, Dripify/Firebase API   │
└─────────────────────────────────────────────────────┘
```

## Routing

Wouter lightweight client-side routing with a single layout wrapping all pages:

| Path | Page | Description |
|------|------|-------------|
| `/` | Home | Dashboard: KPIs, segment breakdown, activity feed, platform health |
| `/contacts` | Contacts | Contact CRUD with search, filter, pagination |
| `/import` | BulkImport | CSV upload, column mapping, sync progress tracking |
| `/campaigns` | Campaigns | Campaign Studio: campaigns, sequences, templates |
| `/sync` | SyncEngine | Sync scheduler, queue visualization, DLQ management |
| `/integrations` | Integrations | Platform credential management and connection testing |
| `/enrichment` | Enrichment | Contact enrichment pipeline with segment distribution |
| `/analytics` | Analytics | Campaign metrics, funnel viz, tier distribution |
| `/backups` | Backups | Data export and backup management |
| `/activity` | ActivityFeed | System audit log with filtering |
| `/settings` | Settings | Theme, notifications, timezone, integrations links |
| `*` | NotFound | 404 page |

## State Management

- **tRPC + React Query** — Primary state layer for all server data: contacts, campaigns, sync queue, platform health, activity log, backups
- **ThemeContext** — Light/dark theme toggle with localStorage persistence
- **useAuth()** — Auth state from tRPC `auth.me` query
- **Component-local state** — Filters, form inputs, modals, view toggles

## Styling Architecture

Tailwind CSS v4 with OKLCH color system:

| Token | Value | Purpose |
|-------|-------|---------|
| `--background` | `oklch(0.13 0.012 260)` | Deep navy base |
| `--primary` | `oklch(0.78 0.12 85)` | Warm gold accent |
| `--card` | `oklch(0.16 0.014 260)` | Elevated surface |
| `--destructive` | `oklch(0.65 0.2 25)` | Error/danger states |

Typography: Plus Jakarta Sans (body) + Instrument Serif (headings)

Components: shadcn/ui (50+ Radix-based primitives) with consistent design tokens

Mobile-first breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)

## Database Schema (8 tables)

| Table | Purpose |
|-------|---------|
| `users` | Auth and role management (admin/user) |
| `integrations` | Platform credentials and connection state |
| `contacts` | Unified contacts with segment, tier, platform IDs |
| `bulk_imports` | CSV/JSON import job tracking |
| `campaigns` | Multi-channel campaign definitions |
| `campaign_templates` | Reusable message templates per channel |
| `sync_queue` | Bidirectional sync jobs with DLQ |
| `activity_log` | Audit trail for all system events |
| `backups` | Contact/campaign export tracking |

## Service Modules

| Service | Lines | Purpose |
|---------|-------|---------|
| `ghl.ts` | ~600 | GoHighLevel API: CRUD, JWT auth, batch ops |
| `syncWorker.ts` | ~465 | Sync queue processing with retry + DLQ |
| `orchestrator.ts` | ~310 | Multi-platform sequence coordination |
| `campaignEngine.ts` | ~266 | Campaign lifecycle: create → execute → track |
| `syncScheduler.ts` | ~205 | Periodic cross-platform sync scheduling |
| `dripify.ts` | ~215 | Dripify/Firebase: campaigns, leads, tokens |
| `smsit.ts` | ~181 | SMS-iT: send, balance, contacts, templates |
| `credentials.ts` | ~124 | DB credential loading + format normalization |

## Testing Architecture

205 tests across 10 files in 3 tiers:

1. **Unit tests** (80+) — Service functions, credential normalization, orchestrator logic
2. **Integration tests** (60+) — Full CRUD user journeys through tRPC procedures
3. **Live E2E tests** (60+) — Real API calls to GHL, SMS-iT, Dripify with live credentials

Test isolation: non-live tests use `userId: 9999` to avoid overwriting production credentials.

## Security

- Auth via cookie-based session with tRPC protected procedures
- Credentials stored encrypted in DB, masked in UI
- Test isolation prevents credential corruption
- Role-based access: admin (owner) vs user (member)

## Future Architecture (Planned)

1. **Real-time WebSocket** — Live sync status and notification streaming
2. **AI/LLM Engine** — Natural language queries, predictive analytics, churn prediction
3. **Continuous Improvement Engine** — Self-monitoring quality metrics, automated regression detection
4. **OAuth2 Flows** — Standard auth for GHL and LinkedIn (currently uses JWT/cookie extraction)
