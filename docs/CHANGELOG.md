# Changelog

All notable changes to the Stewardly Command Center project will be documented in this file.

## [0.2.0] - 2026-04-13

### Added
- Reusable Modal component using native `<dialog>` for accessibility
- FormField component with input/select/textarea variants and error display
- Zustand data store with full CRUD operations for all entities
- **Property** create/edit form with address, type, units, occupancy, revenue fields
- **Property** detail modal with stats, edit, and delete actions
- **Tenant** create/edit form with lease dates, rent, property/unit selection
- **Tenant** detail modal with lease period, balance, and contact info
- **Maintenance** create/edit form with property/tenant selection, priority, category, assignment
- **CRM Contact** create/edit form with tag management (add/remove), type, source, notes
- **Marketing Campaign** create/edit form with channel selection, budget, audience, date range
- **Data Pipeline** pause/resume toggle controls
- Dashboard now computes metrics from live data store (reacts to CRUD changes)
- All pages wired to centralized data store instead of direct mock imports

## [0.1.0] - 2026-04-13

### Added
- Project scaffolding with React 19, TypeScript, Vite 8, Tailwind CSS 4
- Responsive sidebar navigation with collapsible desktop mode and mobile hamburger overlay
- Global search bar and notification indicator in header
- **Dashboard** page with 8 metric cards, activity feed, and property overview
- **Properties** page with card grid, type filtering, and search
- **Tenants** page with data table, status filtering, and quick contact actions
- **Maintenance** page with priority-colored request cards and status workflow
- **CRM** page with pipeline summary, contact table, and tag management
- **Marketing** page with campaign cards, budget progress bars, and performance metrics
- **Data Pipelines** page with integration status, record counts, and action controls
- **Settings** page with notification toggles, security, integrations, appearance, and general preferences
- Zustand store for UI state management
- React Query provider for future API integration
- Custom Tailwind theme with design tokens (primary, accent, surface, text, border)
- Reusable UI components: MetricCard, DataTable, StatusBadge, PageHeader
- Full TypeScript type definitions for all entities
- Mock data layer with realistic property management data
- Project documentation: README, ARCHITECTURE, CHANGELOG, PARITY.md
