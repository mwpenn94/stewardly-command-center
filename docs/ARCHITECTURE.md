# Stewardly Command Center — Architecture

## Overview

Stewardly Command Center is a single-page application (SPA) built with React and TypeScript, designed as a comprehensive property management platform. The architecture prioritizes:

1. **Mobile-first responsive design** — Every component works on 320px screens up to 4K
2. **Type safety** — Full TypeScript coverage from data models to UI components
3. **Modular structure** — Clear separation between pages, layout, reusable UI, data, and state
4. **Performance** — Vite for fast builds, React Query for server state caching, Zustand for minimal client state

## System Layers

```
┌─────────────────────────────────────────────┐
│                   Pages                     │  Route-level views
├─────────────────────────────────────────────┤
│             Layout Components               │  AppLayout, Sidebar, Header
├─────────────────────────────────────────────┤
│              UI Components                  │  MetricCard, DataTable, StatusBadge, PageHeader
├──────────────────┬──────────────────────────┤
│   Zustand Store  │   React Query Cache      │  Client + Server state
├──────────────────┴──────────────────────────┤
│              TypeScript Types               │  Shared data interfaces
├─────────────────────────────────────────────┤
│            Data Layer (Mock)                │  Will become API client layer
└─────────────────────────────────────────────┘
```

## Routing

React Router v7 with a single layout route wrapping all pages:

| Path | Page | Description |
|------|------|-------------|
| `/` | Dashboard | Portfolio overview metrics and activity feed |
| `/properties` | Properties | Property listing with search/filter |
| `/tenants` | Tenants | Tenant directory with lease/payment data |
| `/maintenance` | Maintenance | Maintenance request tracking |
| `/crm` | CRM | Contact/lead pipeline management |
| `/marketing` | Marketing | Campaign management and analytics |
| `/pipelines` | Pipelines | Data integration status and controls |
| `/settings` | Settings | User preferences and configuration |

## State Management

- **Zustand** for ephemeral UI state (sidebar open/collapsed, search query, notifications)
- **React Query** (TanStack) for future server state (API data caching, background refetching, optimistic updates)
- **Component-local state** for filters, form inputs, and UI toggles

## Styling Architecture

Tailwind CSS v4 with custom theme tokens defined in `src/index.css`:
- Custom color palette: `primary-*`, `accent-*`, `surface-*`, `text-*`, `border`
- Reusable component classes: `.card`, `.btn-primary`, `.btn-secondary`, `.input`, `.badge`
- Mobile-first breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)

## Data Model

Core entities:
- **Property** — Physical locations with units, occupancy, revenue
- **Tenant** — Leaseholders with payment/balance tracking
- **MaintenanceRequest** — Work orders with priority/status workflow
- **Contact** — CRM entries (leads, prospects, vendors, partners)
- **Campaign** — Marketing campaigns with channel/budget/performance
- **DataPipeline** — Integration connectors with sync status
- **Activity** — Cross-entity activity feed items

## Future Architecture (Planned)

1. **API Layer** — Replace mock data with REST/GraphQL API client
2. **Authentication** — Auth provider integration (Auth0/Clerk)
3. **Real-time** — WebSocket subscriptions for live updates
4. **AI/Agentic Engine** — Predictive analytics, automated recommendations
5. **Continuous Improvement** — Self-monitoring quality metrics, automated regression detection
