# Stewardly Command Center — Architecture

## Overview

Stewardly Command Center is a single-page application (SPA) built with React and TypeScript, designed as a comprehensive property management platform. The architecture prioritizes:

1. **Mobile-first responsive design** — Every component works on 320px screens up to 4K
2. **Type safety** — Full TypeScript coverage from data models to UI components
3. **Modular structure** — Clear separation between pages, layout, reusable UI, data, and state
4. **Performance** — Vite for fast builds, React Query for server state caching, Zustand for minimal client state
5. **AI-ready** — Data-driven insights panel, predictive chart infrastructure

## System Layers

```
┌─────────────────────────────────────────────────────────┐
│                        Pages                            │  Route-level views (9 routes)
├─────────────────────────────────────────────────────────┤
│     Layout (Sidebar, Header, Search, ErrorBoundary)     │  Navigation + chrome
├────────────────────────┬────────────────────────────────┤
│    UI Components       │   Feature Components           │  Shared + domain-specific
│    MetricCard          │   PropertyForm                 │
│    DataTable           │   TenantForm                   │
│    Modal + FormField   │   MaintenanceForm              │
│    Toast               │   ContactForm/Detail/Kanban    │
│    MiniChart           │   CampaignForm                 │
│    Skeleton            │   EmailTemplateBuilder         │
│    StatusBadge         │   WorkflowBuilder              │
│    PageHeader          │   PipelineForm                 │
│                        │   AIInsights                   │
├────────────────────────┴────────────────────────────────┤
│  Zustand Stores: useStore (UI) + useDataStore (CRUD)    │
├─────────────────────────────────────────────────────────┤
│           TypeScript Types + Workflow Types              │
├─────────────────────────────────────────────────────────┤
│           Data Layer (Mock → future API client)         │
└─────────────────────────────────────────────────────────┘
```

## Routing

React Router v7 with a single layout route wrapping all pages:

| Path | Page | Description |
|------|------|-------------|
| `/` | Dashboard | Portfolio metrics, charts, AI insights, activity feed |
| `/properties` | Properties | Property CRUD with detail view + related entities |
| `/tenants` | Tenants | Tenant directory with CRUD and detail view |
| `/maintenance` | Maintenance | Priority-colored request cards with CRUD |
| `/crm` | CRM | Table + Kanban views, contact detail + timeline |
| `/marketing` | Marketing | Campaigns, Email Builder, Workflow Builder tabs |
| `/pipelines` | Pipelines | Integration CRUD with status controls |
| `/settings` | Settings | Notifications, security, integrations, theme, general |
| `*` | NotFound | 404 page with navigation |

## State Management

- **useStore** (Zustand) — UI state: sidebar, search, notifications, theme preference
- **useDataStore** (Zustand) — Entity CRUD: properties, tenants, maintenance, contacts, campaigns, pipelines
- **useToast** (Zustand) — Toast notifications with auto-dismiss
- **React Query** (TanStack) — Future server state (API caching, background refetch)
- **Component-local state** — Filters, form inputs, modals, view toggles

## Styling Architecture

Tailwind CSS v4 with custom theme tokens:
- Light/dark mode via CSS custom properties on `html.dark`
- Custom colors: `primary-*`, `accent-*`, `surface-*`, `text-*`, `border`
- Component classes: `.card`, `.btn-primary`, `.btn-secondary`, `.input`, `.badge`
- Mobile-first breakpoints: `sm:` (640px), `lg:` (1024px), `xl:` (1280px)
- 44px minimum touch targets on mobile
- Skip-to-content link and `:focus-visible` for accessibility

## Data Model

Core entities:
- **Property** — Physical locations with units, occupancy, revenue, type, status
- **Tenant** — Leaseholders with lease dates, payment/balance, property linkage
- **MaintenanceRequest** — Work orders with priority (low→urgent), status workflow, assignment
- **Contact** — CRM entries with type (lead/prospect/vendor/partner), pipeline status, tags
- **Campaign** — Marketing campaigns with channel, budget, reach/engagement/conversion metrics
- **DataPipeline** — Integration connectors with source, destination, schedule, sync status
- **OutreachWorkflow** — Marketing automation with trigger, steps (email/sms/wait/condition)
- **Activity** — Cross-entity activity feed items

## Charts & Visualization

Zero-dependency SVG chart components:
- **BarChart** — Vertical bar chart with value labels and color coding
- **DonutChart** — Circular progress indicator with percentage
- **Sparkline** — SVG polyline for trend visualization

## AI Infrastructure

- **AIInsights** — Reactive panel that generates recommendations from live store data
- Insight types: opportunities, warnings, recommendations
- Data signals: overdue payments, urgent maintenance, low occupancy, new leads, lease expirations
- Future: LLM integration for natural language queries and predictive analytics

## Future Architecture (Planned)

1. **API Layer** — Replace mock data with REST/GraphQL API client
2. **Authentication** — Auth provider integration (Auth0/Clerk)
3. **Real-time** — WebSocket subscriptions for live updates
4. **AI/LLM Engine** — Natural language queries, predictive rent optimization, churn prediction
5. **Continuous Improvement** — Self-monitoring quality metrics, automated regression detection
