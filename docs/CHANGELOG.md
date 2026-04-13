# Changelog

All notable changes to the Stewardly Command Center project will be documented in this file.

## [0.9.0] - 2026-04-13

### Added
- **Light mode theme** — Full OKLCH light color palette (warm white backgrounds, darker gold accent, proper contrast) with smooth dark/light switching
- **Code splitting** — All routes lazy-loaded via `React.lazy()` + `Suspense`; main bundle reduced from 725KB to 527KB, pages load as 4-34KB separate chunks
- **Global search** — `⌘K` / `Ctrl+K` shortcut opens search from anywhere; searches contacts and campaigns with dropdown results; available in both desktop header and mobile top bar
- Page loading spinner for lazy route transitions

### Changed
- CSS restructured: `:root` now defines light theme, `.dark` class overrides with dark theme (was inverted)
- Card hover effects adapt to light/dark mode

## [0.8.0] - 2026-04-13

### Added
- **Settings page** — Theme toggle (dark/light), notification preferences, timezone/date format configuration, profile display, integration quick links
- Dark/light theme switching now functional via ThemeProvider `switchable` flag

### Fixed
- **Mobile responsiveness** across all pages:
  - Campaign Studio: platform health grid stacks on mobile (was 3-col fixed)
  - Sync Engine: scheduler controls and platform grid stack on mobile
  - All page headers: title + action buttons stack vertically on mobile
  - 44px minimum touch targets on all mobile action buttons
  - Main content padding reduced from `p-6` to `p-4` on mobile
  - Filter rows wrap properly on small screens
- Settings link in user dropdown now routes to `/settings` (was `/integrations`)

### Changed
- **Complete documentation rewrite** — README.md, ARCHITECTURE.md, and PARITY.md now accurately describe the actual tRPC/shadcn/Drizzle full-stack application (were describing an outdated Zustand-based frontend)
- Sidebar navigation now includes Settings page with Settings icon
- PARITY.md feature matrix fully rewritten to track actual features (28 items vs old 35 that tracked non-existent features)

## [0.7.1] - 2026-04-13

### Changed
- Removed unused Vite template assets (hero.png, react.svg, vite.svg, icons.svg)
- Updated package.json with description and version 0.7.0
- Comprehensive README rewrite documenting all features, project structure, tech stack
- Architecture document refresh with complete component inventory and AI infrastructure docs

## [0.7.0] - 2026-04-13

### Added
- **Dashboard Charts** — Revenue by Property bar chart, Occupancy donut charts per property, 6-month revenue trend sparkline
- **AI Insights Panel** — Data-driven recommendations based on live store data: overdue payments, urgent maintenance, low occupancy, new leads, lease expirations, rent optimization
- **MiniChart Components** — Zero-dependency BarChart, DonutChart, Sparkline SVG components
- **Skeleton Components** — MetricCardSkeleton, TableRowSkeleton, CardSkeleton for loading states

### Changed
- Dashboard significantly enhanced with charts row above activity feed
- Dashboard G1 depth upgraded to 5/5

## [0.6.0] - 2026-04-13

### Added
- CRM contact detail modal with email/phone links, company info, tags, notes
- CRM activity timeline with email, note, meeting, and creation events
- CRM Kanban board view with drag-and-drop between status columns (new/contacted/qualified/converted/lost)
- Table/Kanban view toggle in CRM page
- Pipeline create/edit form modal with source, destination, schedule, status configuration
- Pipeline cards clickable to open edit form
- Toast notifications on pipeline pause/resume/create/update

### Changed
- CRM page enhanced with dual view modes (table + kanban)
- Pipelines page now supports full CRUD with modal forms

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
