# Stewardly Command Center

A full-stack marketing operations platform that unifies contact management, multi-platform campaign orchestration, and data synchronization across GoHighLevel (GHL), SMS-iT, and Dripify — all in one responsive, dark-themed application.

## Features

### Dashboard
- 4 KPI cards: Total Contacts, Active Campaigns, Sync Queue, Connected Platforms
- Contact segment breakdown with distribution percentages
- Recent activity feed with severity indicators
- Live platform health monitoring (GHL, SMS-iT, Dripify)

### Contacts
- Searchable, filterable contact table with pagination
- Full CRUD with segment and tier assignment
- Platform sync indicators (GHL, SMS, LinkedIn)
- GHL sync toggle on create/edit

### Campaign Studio
- **Campaigns tab** — Create, launch, and track campaigns across Email (GHL), SMS (SMS-iT), and LinkedIn (Dripify)
- **Sequences tab** — Multi-step, multi-platform outreach automation with delays and step progress
- **Templates tab** — Reusable message templates per channel
- Platform health indicators showing connection status

### Bulk Import
- CSV file upload with column mapping
- Real-time import progress tracking
- Worker count configuration (parallel workers)
- Checkpoint-based resume capability
- GHL credential validation before sync

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

### Analytics
- Unified campaign metrics: sent, open rate, click rate, conversions, cost per lead
- Per-channel breakdown (Email, SMS, LinkedIn)
- Conversion funnel visualization
- Contact tier distribution

### Contact Enrichment
- People Data Labs waterfall pipeline (ready)
- Confidence scoring and segment tagging
- Propensity scoring with tier assignment (Gold/Silver/Bronze)
- Segment distribution visualization

### Backups
- One-click backup creation (contacts, campaigns, full)
- CSV and JSON export formats
- Backup history with download and restore

### Activity Feed
- Chronological audit log of all system events
- Type filtering: sync, import, campaign, webhook, enrichment, backup, system
- Severity filtering: info, success, warning, error

### Settings
- Dark/light theme toggle with localStorage persistence
- Notification preferences (email, push, sync alerts, campaign alerts)
- Timezone and date format configuration
- Quick access to platform integrations

### Platform Features
- Dark theme with warm gold accent palette (OKLCH color space)
- Plus Jakarta Sans + Instrument Serif typography
- Mobile-first responsive layout with sidebar overlay on mobile
- 44px minimum touch targets on mobile
- Skeleton loading states
- Toast notifications on all operations
- Error boundary with recovery UI
- 404 catch-all route

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Routing | Wouter |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix) |
| Server State | TanStack React Query + tRPC 11 |
| Backend | Express 4 + tRPC |
| Database | Drizzle ORM + MySQL (TiDB) |
| Icons | Lucide React |
| Animations | Framer Motion |
| Build | Vite 7 |

## Getting Started

```bash
pnpm install      # Install dependencies
pnpm run dev      # Start dev server
pnpm run build    # Production build
pnpm run check    # TypeScript check
pnpm run test     # Run tests
```

## Project Structure

```
client/src/
  components/
    ui/               # shadcn/ui components (50+ Radix-based)
    DashboardLayout   # Sidebar + header + mobile drawer
    ErrorBoundary     # App-level error catching
  pages/              # Home, Contacts, BulkImport, Campaigns, SyncEngine,
                      # Integrations, Enrichment, Analytics, Backups,
                      # ActivityFeed, Settings, NotFound
  contexts/           # ThemeContext
  hooks/              # useMobile
  lib/                # tRPC client setup

server/
  _core/              # Express server + tRPC adapter
  routers.ts          # 55+ tRPC procedures
  db.ts               # Database query helpers
  services/           # GHL, SMS-iT, Dripify, Orchestrator,
                      # SyncScheduler, SyncWorker, CampaignEngine,
                      # Credentials

drizzle/
  schema.ts           # 8 database tables
  migrations/         # SQL migrations

docs/
  PARITY.md           # Feature parity tracking and gap matrix
  ARCHITECTURE.md     # System architecture documentation
  CHANGELOG.md        # Version changelog
```

## Responsive Design

Mobile-first with breakpoints:
- **Mobile** (<768px): Single column, sidebar overlay, 44px touch targets, reduced padding
- **Tablet** (768px-1024px): Two-column grids, inline filters
- **Desktop** (>1024px): Collapsible resizable sidebar, multi-column layouts, full data views

## Testing

```bash
# Non-live tests (144 tests)
pnpm vitest run --exclude='**/live-*.test.ts'

# All tests including live E2E (205 tests, requires real credentials)
pnpm vitest run
```

## License

Proprietary — Stewardly Inc.
