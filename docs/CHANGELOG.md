# Changelog

All notable changes to the Stewardly Command Center project will be documented in this file.

## [0.5.0] - 2026-04-13

### Added
- **Marketing** page now has three tabs: Campaigns, Email Builder, Workflows
- Email Template Builder with edit/preview toggle, subject/preheader/heading/body/CTA/footer fields
- HTML preview rendering of email templates with Copy HTML action
- Outreach Workflow Builder with drag-and-drop-style step management
- Workflow step types: Send Email, Send SMS, Wait (delay days), Condition
- Two pre-built workflow templates: New Lead Welcome Sequence, Lease Expiration Reminder
- Create/edit/save workflows with trigger configuration
- Property detail modal now shows related tenants and open maintenance requests
- Workflow type definitions

### Changed
- Marketing page restructured with tab navigation
- Property detail view enhanced with cross-entity data (tenants + maintenance)

## [0.4.0] - 2026-04-13

### Added
- Global search dropdown in header searching across properties, tenants, maintenance, contacts, and campaigns
- Search results show entity type, title, subtitle with click-to-navigate
- Toast notification system with success/error/info variants and auto-dismiss
- All CRUD operations (create, update, delete) now show toast feedback
- Dashboard metric cards are clickable — navigate to relevant pages
- Dashboard activity feed items are clickable — navigate to entity pages
- Dashboard property overview items are clickable — navigate to properties
- MetricCard component now supports optional onClick with keyboard accessibility

### Changed
- Header search now shows live dropdown results with click-outside-to-close

## [0.3.0] - 2026-04-13

### Added
- Dark mode with light/dark/system toggle in header and Settings > Appearance
- Theme preference persistence via localStorage
- System preference detection with live switching via `prefers-color-scheme` media query
- Skip-to-content accessibility link for keyboard navigation
- Global `:focus-visible` ring styling for keyboard users
- 44px minimum touch targets on all buttons and inputs for mobile
- 404 Not Found page with navigation options
- Error boundary wrapping entire app with recovery UI
- Dark color scheme CSS variables for all theme tokens

### Changed
- Header actions now have proper 44px touch targets on mobile
- Settings appearance section wired to actual theme toggle
- Modal dialog uses explicit text color for dark mode compatibility

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
