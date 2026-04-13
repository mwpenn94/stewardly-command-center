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
│  └─ 65 procedures (public + protected)              │
├─────────────────────────────────────────────────────┤
│  Service Layer (server/services/*.ts)                │
│  └─ GHL, SMS-iT, Dripify, Orchestrator,            │
│     SyncScheduler, SyncWorker, CampaignEngine,      │
│     Credentials, AIEngine                            │
├─────────────────────────────────────────────────────┤
│  Data Layer (Drizzle ORM → MySQL/TiDB)              │
│  └─ 9 tables, schema-driven migrations              │
├─────────────────────────────────────────────────────┤
│  External APIs                                       │
│  └─ GHL v2 API, SMS-iT API, Dripify/Firebase API   │
└─────────────────────────────────────────────────────┘
```

## Routing

Wouter lightweight client-side routing with a single layout wrapping all pages. Home is eagerly loaded; all other routes use `React.lazy()` + `Suspense` for code splitting.

| Path | Page | Description |
|------|------|-------------|
| `/` | Home | Dashboard: KPIs, segment breakdown, activity feed, platform health, quick actions |
| `/contacts` | Contacts | Contact CRUD with search, filter, pagination, detail modal, mobile cards |
| `/import` | BulkImport | CSV upload, column mapping, sync progress tracking |
| `/campaigns` | Campaigns | Campaign Studio: campaigns, sequences, templates |
| `/sync` | SyncEngine | Sync scheduler, queue visualization, DLQ management |
| `/integrations` | Integrations | Platform credential management and connection testing |
| `/enrichment` | Enrichment | Contact enrichment pipeline with segment distribution |
| `/analytics` | Analytics | Campaign metrics, funnel viz, tier distribution |
| `/backups` | Backups | Data export and backup management |
| `/activity` | ActivityFeed | System audit log with filtering |
| `/settings` | Settings | Theme, notifications, timezone, integrations links |
| `/ai-insights` | AIInsights | AI engine: health scores, recommendations, predictions, lead scoring |
| `/404` | NotFound | 404 page (also used as catch-all) |

## State Management

- **tRPC + React Query** — Primary state layer for all server data: contacts, campaigns, sync queue, platform health, activity log, backups
- **ThemeContext** — Light/dark theme toggle with localStorage persistence
- **useAuth()** — Auth state from tRPC `auth.me` query
- **Component-local state** — Filters, form inputs, modals, view toggles

## Styling Architecture

Tailwind CSS v4 with OKLCH color system supporting dark and light themes:

| Token | Dark Value | Light Value | Purpose |
|-------|-----------|-------------|---------|
| `--background` | `oklch(0.13 0.012 260)` | `oklch(0.97 0.005 260)` | Base surface |
| `--primary` | `oklch(0.78 0.12 85)` | `oklch(0.55 0.15 85)` | Gold accent |
| `--card` | `oklch(0.16 0.014 260)` | `oklch(0.98 0.004 260)` | Elevated surface |
| `--destructive` | `oklch(0.65 0.2 25)` | `oklch(0.55 0.22 25)` | Error/danger states |

Typography: Plus Jakarta Sans (body) + Instrument Serif (headings)

Components: shadcn/ui (53 Radix-based primitives) with consistent design tokens

Mobile-first breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)

## Database Schema (9 tables)

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
| `ghl.ts` | 600 | GoHighLevel API: CRUD, JWT auth, batch ops |
| `syncWorker.ts` | 465 | Sync queue processing with retry + DLQ |
| `orchestrator.ts` | 310 | Multi-platform sequence coordination |
| `campaignEngine.ts` | 266 | Campaign lifecycle: create → execute → track |
| `dripify.ts` | 215 | Dripify/Firebase: campaigns, leads, tokens |
| `syncScheduler.ts` | 205 | Periodic cross-platform sync scheduling |
| `smsit.ts` | 181 | SMS-iT: send, balance, contacts, templates |
| `credentials.ts` | 124 | DB credential loading + format normalization |
| `aiEngine.ts` | 584 | AI/agentic engine: health scores, predictions, recommendations, lead scoring |

## Custom Components

| Component | Lines | Purpose |
|-----------|-------|---------|
| `DashboardLayout.tsx` | 322 | Responsive sidebar + header + mobile drawer |
| `AIChatBox.tsx` | 335 | AI chat interface component |
| `GlobalSearch.tsx` | 160 | Cmd+K search overlay across entities |
| `Map.tsx` | 155 | Google Maps integration |
| `NotificationCenter.tsx` | 130 | Bell icon popover with recent activities |
| `ManusDialog.tsx` | 89 | Dialog wrapper component |
| `KeyboardShortcuts.tsx` | 67 | ? shortcut help dialog |
| `ErrorBoundary.tsx` | 62 | App-level React error boundary with recovery |
| `DashboardLayoutSkeleton.tsx` | 46 | Skeleton loader for layout |
| `QueryError.tsx` | 25 | Reusable query error state with retry |

## Code Splitting & Performance

- **Lazy routes**: All pages except Home are loaded via `React.lazy()` + `Suspense` with a spinner fallback
- **Vendor chunks**: Manual chunk splitting separates React, Radix UI, and TanStack Query into cacheable bundles
- **Bundle sizes** (production build):
  - Main: ~357KB (gzipped: ~104KB)
  - vendor-radix: ~114KB (gzipped: ~36KB)
  - vendor-query: ~82KB (gzipped: ~23KB)
  - vendor-react: ~12KB (gzipped: ~4KB)
  - Individual page chunks: 3–34KB each

## Error Handling

- **ErrorBoundary** — Wraps the entire app; catches React render errors with a recovery UI
- **QueryError** — Reusable component for tRPC query failures; shows error message + retry button
- **Form validation** — Contact forms validate required fields, email format, phone format with inline error display
- **Toast notifications** — Sonner toasts for all CRUD success/error feedback
- **Graceful degradation** — Dashboard health check section degrades gracefully when API is unreachable
- **Coming-soon UX** — Features not yet wired use disabled buttons with tooltips rather than misleading actions

## Accessibility

- **Skip-to-content** — Visible on Tab key, jumps past sidebar navigation
- **Focus-visible ring** — Global `:focus-visible` styling on all interactive elements
- **ARIA roles** — `role="button"` on stat cards, proper dialog roles
- **Keyboard navigation** — `?` help dialog, `G`+letter shortcuts, `Cmd+K` search, `Esc` close
- **Touch targets** — 44px minimum on all mobile-facing interactive elements

## Testing Architecture

10 test files across 3 tiers:

1. **Unit tests** — Service functions, credential normalization, orchestrator logic
2. **Integration tests** — Full CRUD user journeys through tRPC procedures
3. **Live E2E tests** — Real API calls to GHL, SMS-iT, Dripify with live credentials

Test isolation: non-live tests use `userId: 9999` to avoid overwriting production credentials.

## Security

- Auth via cookie-based session with tRPC protected procedures
- Credentials stored in DB JSON, masked in UI (`type=password` for JWT inputs)
- Test isolation prevents credential corruption (`userId: 9999`)
- Role-based access: admin (owner) vs user (member)

## AI/Agentic Continuous Improvement Engine

The AI engine (`server/services/aiEngine.ts`) provides three analytical layers:

1. **Retrospective** — Historical trend analysis from activity logs, campaign metrics, and sync history
2. **Real-time** — Live health scores computed from current system state across 5 categories (contacts, campaigns, sync, integrations, data quality)
3. **Predictive** — Trend-based forecasting for contact growth, campaign engagement, sync reliability, and data completeness

Key capabilities:
- **Health scoring** — 0-100 scores per category with overall weighted composite
- **Recommendations** — Prioritized (critical/high/medium/low) with actionable CTAs and progress metrics
- **Lead scoring** — Data-completeness + engagement-based algorithm that auto-assigns Gold/Silver/Bronze tiers
- **Segment analysis** — Contact distribution, tier breakdown, and engagement metrics per segment
- **Campaign performance** — Per-channel metrics (open rate, click rate, conversion) with trend direction

## Future Architecture (Planned)

1. **Real-time WebSocket** — Live sync status and notification streaming
2. **LLM Integration** — Natural language queries for contact and campaign insights
3. **OAuth2 Flows** — Standard auth for GHL and LinkedIn (currently uses JWT/cookie extraction)
