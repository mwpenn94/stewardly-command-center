# Stewardly Command Center

A comprehensive property management platform providing unified dashboard, tenant management, maintenance tracking, CRM, marketing campaigns, and data pipeline integration — all in one responsive, mobile-first application.

## Features

- **Dashboard** — Real-time portfolio overview with key metrics (occupancy, revenue, maintenance, balances)
- **Properties** — Property portfolio management with search, filtering by type, and card-based views
- **Tenants** — Tenant directory with lease tracking, payment status, and quick contact actions
- **Maintenance** — Request tracking with priority levels, status workflow, and assignment management
- **CRM** — Lead/contact pipeline with tagging, source tracking, and conversion stages
- **Marketing** — Campaign management across email, social, SMS, print, and digital ads with budget tracking
- **Data Pipelines** — Integration hub for third-party data sources (Zillow, QuickBooks, Mailchimp, etc.)
- **Settings** — Notifications, security, integrations, appearance, and general preferences

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| State | Zustand |
| Server State | TanStack React Query |
| Icons | Lucide React |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type check
npx tsc --noEmit

# Production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
  components/
    layout/         # AppLayout, Sidebar, Header
    ui/             # Reusable UI components (MetricCard, DataTable, StatusBadge, PageHeader)
  pages/            # Route pages (Dashboard, Properties, Tenants, Maintenance, CRM, Marketing, Pipelines, Settings)
  store/            # Zustand store
  types/            # TypeScript interfaces
  data/             # Mock data
  hooks/            # Custom hooks (future)
  lib/              # Utilities (future)
docs/
  PARITY.md         # Feature parity tracking and gap matrix
  ARCHITECTURE.md   # System architecture documentation
  CHANGELOG.md      # Version changelog
```

## Responsive Design

All views are mobile-first with breakpoints:
- **Mobile** (<640px): Single column, collapsible sidebar via hamburger, touch-friendly targets
- **Tablet** (640px–1024px): Two-column grids, expanded data tables
- **Desktop** (>1024px): Full sidebar, multi-column layouts, all table columns visible

## License

Proprietary — Stewardly Inc.
