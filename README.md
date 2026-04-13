# Stewardly Command Center

A comprehensive property management platform with unified dashboard, CRM, marketing automation, maintenance tracking, and data pipeline integration — all in one responsive, mobile-first application with dark mode, AI insights, and zero-dependency charts.

## Features

### Dashboard
- 8 key metric cards with clickthrough navigation
- Revenue bar chart, occupancy donut charts, 6-month trend sparkline (zero-dep SVG)
- AI Insights panel with data-driven recommendations
- Activity feed and property overview with clickable items

### Properties
- Card grid with type/search filtering
- Full CRUD with modal forms (create, edit, delete)
- Detail view showing related tenants and open maintenance requests

### Tenants
- Data table with status filtering and search
- Full CRUD with modal forms and detail view
- Lease tracking, payment status, outstanding balance display

### Maintenance
- Priority-colored request cards (low/medium/high/urgent)
- Status workflow (open → in progress → completed)
- Full CRUD with property/tenant selectors

### CRM
- **Table view** with contact info, tags, source, status columns
- **Kanban board** with drag-and-drop between pipeline stages
- Contact detail modal with activity timeline
- Full CRUD with tag management

### Marketing
- **Campaigns tab** — Card grid with budget progress bars, performance metrics
- **Email Builder** — WYSIWYG template editor with live HTML preview
- **Workflows tab** — Outreach automation builder with email/SMS/wait/condition steps

### Data Pipelines
- Integration status dashboard with record counts
- Pause/resume controls for each pipeline
- Full CRUD with source/destination/schedule configuration

### Settings
- Notification preferences (email + push toggles)
- Security (password management)
- Integrations (connect QuickBooks, Zillow, Mailchimp, etc.)
- Appearance (light/dark/system theme toggle)
- General (timezone, date format, currency)

### Platform Features
- Dark mode with light/dark/system toggle (persisted in localStorage)
- Global search across all entity types with dropdown results
- Toast notifications on all CRUD operations
- Skip-to-content link and `:focus-visible` for keyboard accessibility
- 44px minimum touch targets on mobile
- 404 page and error boundary
- Zero external chart dependencies (SVG-based)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| Client State | Zustand (UI + entity CRUD) |
| Server State | TanStack React Query (future API) |
| Icons | Lucide React |
| Charts | Custom SVG (BarChart, DonutChart, Sparkline) |

## Getting Started

```bash
npm install       # Install dependencies
npm run dev       # Start dev server (http://localhost:5173)
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint check
```

## Project Structure

```
src/
  components/
    layout/           # AppLayout, Sidebar, Header, SearchResults
    ui/               # MetricCard, DataTable, StatusBadge, PageHeader, Modal, FormField, Toast, MiniChart, Skeleton
    dashboard/        # AIInsights
    properties/       # PropertyForm
    tenants/          # TenantForm
    maintenance/      # MaintenanceForm
    crm/              # ContactForm, ContactDetail, KanbanBoard
    marketing/        # CampaignForm, EmailTemplateBuilder, WorkflowBuilder
    pipelines/        # PipelineForm
  pages/              # Dashboard, Properties, Tenants, Maintenance, CRM, Marketing, Pipelines, Settings, NotFound
  store/              # useStore (UI), useDataStore (entities)
  types/              # TypeScript interfaces + workflow types
  data/               # Mock data
docs/
  PARITY.md           # Feature parity tracking and gap matrix
  ARCHITECTURE.md     # System architecture documentation
  CHANGELOG.md        # Version changelog
```

## Responsive Design

Mobile-first with breakpoints:
- **Mobile** (<640px): Single column, hamburger sidebar, 44px touch targets
- **Tablet** (640px–1024px): Two-column grids, expanded tables
- **Desktop** (>1024px): Collapsible sidebar, multi-column layouts, full data views

## License

Proprietary — Stewardly Inc.
