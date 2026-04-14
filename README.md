# Stewardly Command Center

A unified omnichannel marketing command center that orchestrates campaigns, contacts, and data across 13 channels and 5+ platforms — Email, SMS, LinkedIn, Social Media (Facebook, Instagram, Twitter/X, TikTok), Inbound/Outbound Calls, Direct Mail, Webforms, Chat/Webchat, and Events/Webinars — all in one responsive, theme-switchable application.

## Features

### Dashboard
- 4 KPI cards: Total Contacts, Active Campaigns, Sync Queue, Connected Platforms
- **Omnichannel Overview** — 13-channel grid showing per-channel interaction counts with live data
- **AI Quick Insights** — System health score, top 3 prioritized recommendations with actionable links, auto-refreshes every 5 minutes
- Contact segment breakdown with distribution percentages
- Recent activity feed with severity indicators and click-to-navigate
- Live platform health monitoring (GHL, SMS-iT, Dripify)
- Quick action buttons: New Contact, New Campaign, Bulk Import, Force Sync
- Stat cards navigate to relevant entity pages on click

### Contacts
- Searchable, filterable contact table with pagination (desktop)
- Touch-friendly card layout on mobile (<768px)
- Full CRUD with segment and tier assignment
- **Unified contact detail** — 3-tab dialog: Info (fields/classification/tags), Timeline (cross-channel interaction history), Channels (platform connections + channel reach summary)
- Cross-channel interaction timeline with 25 interaction types, direction indicators, and sentiment analysis
- **Log Interaction** — record interactions from any of 13 channels with per-channel type selector (email→sent/opened/clicked, call→made/missed, LinkedIn→connection/profile view), direction, subject, and notes
- Platform sync indicators (GHL, SMS-iT, LinkedIn) + 13-channel reach summary
- **Export All** — server-side CSV export respecting current search/segment/tier filters, downloads all matching contacts (not just current page)
- Form validation: required fields, email format, phone format

### Campaign Studio
- **Campaigns tab** — Create, launch (now or scheduled), and track campaigns across all 13 channels: Email, SMS, LinkedIn, Facebook, Instagram, Twitter/X, TikTok, Inbound/Outbound Calls, Direct Mail, Webforms, Chat, Events
- **Campaign detail view** — Click any campaign to see full metrics: sent, failed, opened, open/click/reply rates, delivery progress bar with success/failure breakdown
- **Audience selector** — Launch dialog with All / By Segment (9 segments) / By Tier (Gold/Silver/Bronze/Unscored) targeting; live contact count preview
- **Channel-specific forms** — Contextual field labels: Subject for email, Caption for social, Call Script for calls, Mail Content for direct mail, Event Description for events
- **Sequences tab** — Multi-step, multi-channel outreach automation across any combination of channels with configurable delays
- **Flow Builder tab** — Visual cross-channel flow builder with step reordering, per-channel message composition, delay configuration
- **Templates tab** — Reusable message templates for any channel (subject/caption fields for email and social)
- Platform health indicators showing 5 provider connection statuses (GHL, SMS-iT, Dripify, Direct Mail, Voice)
- All dialogs have explicit Cancel buttons

### Bulk Import
- CSV file upload with column mapping
- Real-time import progress tracking
- Worker count configuration (parallel workers)
- Checkpoint-based resume capability
- GHL credential validation before sync
- JWT input masked for security
- **Paginated import history** — 10 items per page with page controls and total count header

### Sync Engine
- Hybrid sync scheduler: polling + webhooks + event-driven
- Start/stop/force-pull controls per platform
- Queue visualization with status filtering
- Dead Letter Queue (DLQ) with retry functionality
- Platform-specific sync status and error tracking

### Integrations
- GoHighLevel: API Key or JWT Token auth with connection testing
- Dripify: API Key or Session Cookie auth with campaign listing
- LinkedIn: Access Token or Session Cookie auth
- SMS-iT: API Key with credit balance checking
- Per-platform credential management with show/hide toggle
- **Quick Setup Guides** — SMS-iT (5-step) and Dripify (4-step) guided credential wizards with per-field hints
- **Reset button** — Clear stale error status to "Not Connected" without losing configuration

### Analytics
- Unified campaign metrics: sent, open rate, click rate, conversions, cost per lead, bounce rate
- Per-channel breakdown across all 13 channels — clickable rows navigate to Campaign Studio
- Conversion funnel visualization (Sent → Delivered → Opened → Clicked → Conversions)
- Contact tier distribution with clickable cards navigating to Contacts

### Contact Enrichment
- People Data Labs waterfall pipeline (UI ready)
- Confidence scoring and segment tagging
- Propensity scoring with tier assignment (Gold/Silver/Bronze)
- Segment distribution visualization

### Backups
- One-click backup creation (contacts, campaigns, full)
- CSV and JSON export formats
- Backup history with download capability
- Status badges using schema values (ready/expired)

### Activity Feed
- Chronological audit log of all system events
- Clickable entries navigate to source page (sync→Sync Engine, campaign→Campaigns, etc.)
- Type filtering: sync, import, campaign, webhook, enrichment, backup, system
- Severity filtering: info, success, warning, error

### Settings
- Dark/light theme toggle with localStorage persistence
- Notification preferences (email, push, sync alerts, campaign alerts)
- Timezone and date format configuration
- Quick access to platform integrations
- **Danger Zone** — Admin purge test data: removes E2E test contacts, campaigns, imports, and activity with confirmation dialog and result counts

### Notification Center
- Bell icon in desktop header and mobile top bar
- Shows 10 most recent activities with severity badges
- Click-to-navigate to source pages
- Auto-refreshes every 30 seconds
- Alert badge count for warnings/errors

### AI Insights (Continuous Improvement Engine)
- System health score with 5-category breakdown (Contacts, Campaigns, Sync, Integrations, Data Quality)
- Prioritized recommendations with actionable CTAs and progress metrics
- Predictive analytics: trend-based forecasting for contact growth, campaign engagement, sync reliability, data quality
- Campaign performance analysis by channel (open rate, click rate, conversion)
- Contact segment analysis with tier distribution
- One-click bulk lead scoring: auto-assigns Gold/Silver/Bronze tiers based on data completeness and engagement
- **Cross-channel pattern analysis** — 5 patterns with data-driven conversion lift metrics, confidence scores computed from actual campaign + interaction volume
- **Channel synergy scoring** — 6 channel pairs with data-driven synergy scores (computed from real channel activity) and recommendations
- Automation summary tracking completed/pending actions
- Auto-refreshes every 2 minutes

### Channel Management
- 13 channels organized by category: Messaging, Social, Voice, Physical, Inbound, Events
- Per-channel enable/disable toggle with provider selection
- Multiple providers per channel: GHL, SMS-iT, Dripify, Twilio, Lob, Buffer, Zoom, and more
- Daily send limits and monthly budget caps per channel
- Channel status monitoring (active, inactive, error)

### GHL Import
- Dedicated GoHighLevel contact import with JWT authentication
- Batch import with progress tracking
- Field mapping from GHL contact schema to local schema

### Platform Features
- Dark/light theme with warm gold accent palette (OKLCH color space)
- Plus Jakarta Sans + Instrument Serif typography
- Mobile-first responsive layout with sidebar overlay on mobile
- 44px minimum touch targets on mobile
- Keyboard shortcuts: `?` help dialog, `G`+letter navigation, `Cmd+K` search
- Global search across contacts, campaigns, and templates with tier/status badges
- Code-split routes via React.lazy + Suspense
- Skeleton loading states on tables, cards, lists
- Toast notifications on all operations (Sonner)
- Error boundary with recovery UI
- Skip-to-content link and focus-visible ring for accessibility
- 404 catch-all route

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5.9 |
| Routing | Wouter |
| Styling | Tailwind CSS 4 + shadcn/ui (53 Radix components) |
| Server State | TanStack React Query + tRPC 11 |
| Backend | Express 4 + tRPC (100 procedures across 12 routers) |
| Database | Drizzle ORM + MySQL (TiDB) — 14 tables |
| Icons | Lucide React |
| Animations | Framer Motion |
| Build | Vite 7 |
| Testing | Vitest (15 test files, 256 non-live tests passing) |

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 10+
- MySQL-compatible database (TiDB or MySQL 8+)

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=mysql://user:password@host:port/database
SESSION_SECRET=your-session-secret
```

### Installation

```bash
pnpm install       # Install dependencies
pnpm run dev       # Start dev server (Express + Vite)
pnpm run build     # Production build
pnpm run check     # TypeScript type check
pnpm run test      # Run all tests
```

### Database Setup

```bash
pnpm run db:push   # Generate and apply migrations
```

## Project Structure

```
client/src/
  App.tsx                 # Route definitions with lazy loading
  index.css               # OKLCH theme tokens (dark + light)
  components/
    ui/                   # shadcn/ui components (53 Radix-based)
    DashboardLayout.tsx   # Sidebar + header + mobile drawer (325 lines)
    ErrorBoundary.tsx     # App-level error catching
    GlobalSearch.tsx      # Cmd+K search overlay (216 lines)
    KeyboardShortcuts.tsx # Shortcut help dialog
    NotificationCenter.tsx # Bell icon + activity popover (130 lines)
    ManusDialog.tsx       # Dialog wrapper with accessibility
    QueryError.tsx        # Reusable error state with retry
    AIChatBox.tsx         # Chat interface with streaming (335 lines)
    Map.tsx               # Google Maps integration (155 lines)
  pages/                  # 16 page files (Home eager, 14 lazy-loaded, 1 internal showcase)
    Home.tsx              # Dashboard (414 lines)
    Contacts.tsx          # Contact CRUD + export + interactions (1,227 lines)
    BulkImport.tsx        # CSV import + paginated history (681 lines)
    Campaigns.tsx         # Campaign Studio + Flow Builder + Detail (1,252 lines)
    SyncEngine.tsx        # Sync queue (492 lines)
    Integrations.tsx      # Platform connections + setup guides (481 lines)
    Enrichment.tsx        # Data enrichment + completeness (197 lines)
    Analytics.tsx         # Metrics dashboard (372 lines)
    Backups.tsx           # Export + data mirror (254 lines)
    ActivityFeed.tsx      # Audit log (138 lines)
    Settings.tsx          # Preferences + Danger Zone (364 lines)
    AIInsights.tsx        # AI continuous improvement engine (607 lines)
    Channels.tsx          # Channel management (296 lines)
    GhlImport.tsx         # GHL-specific import (404 lines)
    ComponentShowcase.tsx # Internal component showcase (1,437 lines)
    NotFound.tsx          # 404 page (46 lines)
  contexts/
    ThemeContext.tsx       # Light/dark theme with localStorage
  hooks/
    useMobile.tsx         # Responsive breakpoint hook

server/
  _core/                  # Express server + tRPC adapter
  routers.ts              # 100 tRPC procedures across 12 routers (1,882 lines)
  db.ts                   # Database query helpers (768 lines)
  services/
    ghl.ts                # GoHighLevel API (725 lines)
    smsit.ts              # SMS-iT API (260 lines)
    dripify.ts            # Dripify/LinkedIn API (304 lines)
    orchestrator.ts       # Multi-platform coordination (310 lines)
    syncScheduler.ts      # Periodic sync scheduling (401 lines)
    syncWorker.ts         # Sync queue processing (465 lines)
    campaignEngine.ts     # Campaign lifecycle, 13-channel routing (405 lines)
    credentials.ts        # Credential normalization (124 lines)
    aiEngine.ts           # AI/agentic engine: health, predictions, scoring (750 lines)
    ghlImport.ts          # GHL contact import service (508 lines)
    webhooks.ts           # Webhook processing (469 lines)

drizzle/
  schema.ts               # 14 database tables (369 lines)
  migrations/             # SQL migrations (6 migration files)

docs/
  PARITY.md               # Feature parity tracking and gap matrix
  ARCHITECTURE.md         # System architecture documentation
  CHANGELOG.md            # Version changelog
  PLATFORM_INTEGRATIONS.md # Platform integration documentation
  CURRENT_BEST.md         # Current best practices and known issues
```

## Responsive Design

Mobile-first with breakpoints:
- **Mobile** (<768px): Single column, sidebar overlay (Sheet), 44px touch targets, card layouts for contacts
- **Tablet** (768px-1024px): Two-column grids, inline filters
- **Desktop** (>1024px): Collapsible resizable sidebar, multi-column layouts, full data tables

## Testing

```bash
# Non-live tests (safe, no external API calls)
pnpm vitest run --exclude='**/live-*.test.ts'

# All tests including live E2E (requires real platform credentials)
pnpm vitest run
```

15 test files (4,500 lines) across 3 tiers:
- **Unit tests** (5 files) — Service functions, credential normalization, orchestrator logic, webhook processing
- **Integration tests** (6 files) — Full CRUD journeys through tRPC procedures, bidirectional sync, GHL import, admin features
- **Live E2E tests** (4 files) — Real API calls to GHL, SMS-iT, Dripify (requires credentials, skipped without them)

Test isolation: non-live tests use `userId: 9999` to avoid overwriting production credentials. Test interference between parallel files is handled via `beforeEach` cleanup hooks.

## License

Proprietary — Stewardly Inc.
