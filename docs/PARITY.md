# Stewardly Command Center — Feature Parity & Gap Matrix

## Status Key
- **Done** — Implemented and verified
- **Open** — Known gap, not yet addressed
- **In Progress** — Currently being worked on
- **Deferred** — Acknowledged but not prioritized

## Feature Matrix

| ID | Feature | Status | Depth (1-5) | Notes | Commit |
|----|---------|--------|-------------|-------|--------|
| G1 | Dashboard metrics & activity feed | Done | 5 | Metrics, charts, AI insights, activity feed, all clickable | Pass 7 |
| G2 | Property CRUD & listing | Done | 4 | Full CRUD with modal forms + detail view | Pass 2 |
| G3 | Tenant directory & lease tracking | Done | 4 | Full CRUD with modal forms + detail view | Pass 2 |
| G4 | Maintenance request workflow | Done | 4 | Full CRUD with modal forms, priority/status editing | Pass 2 |
| G5 | CRM contact pipeline | Done | 4 | Full CRUD with modal forms, tags, pipeline tracking | Pass 2 |
| G6 | Marketing campaign management | Done | 4 | Full CRUD with modal forms + budget/performance tracking | Pass 2 |
| G7 | Data pipeline integration hub | Done | 3 | Status display + pause/resume controls, actual integration pending | Pass 2 |
| G8 | Settings & preferences | Done | 3 | Theme persistence via localStorage, live toggle | Pass 3 |
| G9 | Mobile responsive layout | Done | 4 | Sidebar overlay, responsive grids, touch targets | — |
| G10 | Desktop responsive layout | Done | 4 | Collapsible sidebar, multi-column grids | — |
| G11 | Authentication & auth flow | Open | 0 | Not started — needs auth provider | — |
| G12 | API layer (replace mock data) | Open | 0 | Mock data in place, API client needed | — |
| G13 | Create/Edit forms for entities | Done | 4 | Modal forms for all entities with validation | Pass 2 |
| G14 | Detail views for entities | Done | 3 | Modal detail views for Properties & Tenants | Pass 2 |
| G15 | Real-time notifications | Open | 0 | Static badge count only | — |
| G16 | Dark mode / theme switching | Done | 4 | Light/dark/system toggle in header + settings, localStorage persistence | Pass 3 |
| G17 | AI/Agentic continuous improvement | In Progress | 2 | AI Insights panel with data-driven recommendations | Pass 7 |
| G18 | Predictive analytics | In Progress | 2 | Revenue trend sparkline, occupancy donut charts | Pass 7 |
| G19 | Automated outreach workflows | Done | 4 | Workflow builder with email/sms/wait/condition steps, trigger config | Pass 5 |
| G20 | Multi-platform CRM sync | In Progress | 2 | Pipeline CRUD + CRM kanban done, actual API sync pending | Pass 6 |
| G21 | 404 page & error boundary | Done | 4 | Error boundary wraps app, 404 catch-all route | Pass 3 |
| G22 | Accessibility (skip-link, focus-visible, ARIA) | Done | 3 | Skip-to-content, focus-visible ring, ARIA labels, min touch targets | Pass 3 |
| G23 | Mobile touch targets (44px min) | Done | 3 | Buttons/inputs have min-h-[44px] on mobile | Pass 3 |
| G24 | Global search across entities | Done | 4 | Searches properties, tenants, maintenance, contacts, campaigns with dropdown results | Pass 4 |
| G25 | Toast notification system | Done | 4 | Success/error/info toasts on all CRUD operations with auto-dismiss | Pass 4 |
| G26 | Dashboard clickthrough navigation | Done | 4 | All metric cards + activity items + property list navigates to relevant pages | Pass 4 |
| G27 | Cross-entity navigation | Done | 3 | Property detail shows related tenants + open maintenance | Pass 5 |
| G28 | Email template builder | Done | 4 | WYSIWYG builder with edit/preview, subject, body, CTA, footer | Pass 5 |
| G29 | Marketing tabs (Campaigns/Email/Workflows) | Done | 4 | Tabbed interface in Marketing page | Pass 5 |
| G30 | CRM contact detail + activity timeline | Done | 4 | Detail modal with contact info, tags, notes, timeline | Pass 6 |
| G31 | CRM kanban board view | Done | 4 | Drag-and-drop kanban with status columns, table/kanban toggle | Pass 6 |
| G32 | Pipeline create/edit form | Done | 4 | Full CRUD with source/dest/schedule/status config + toast feedback | Pass 6 |
| G33 | Dashboard charts (bar, donut, sparkline) | Done | 4 | Revenue bars, occupancy donuts, trend sparklines — zero deps | Pass 7 |
| G34 | AI Insights panel | Done | 3 | Data-driven recommendations for late payments, vacancies, leads, leases | Pass 7 |
| G35 | Skeleton loading components | Done | 3 | MetricCardSkeleton, TableRowSkeleton, CardSkeleton | Pass 7 |

## Protected Improvements
<!-- Items that must never be weakened by subsequent passes -->
- Mobile-first responsive sidebar with overlay + collapsible desktop mode
- Consistent card/badge/table component system
- Tailwind v4 custom theme tokens
- TypeScript strict type coverage
- Centralized Zustand data store with CRUD for all entities
- Modal forms with native `<dialog>` for accessibility
- Dashboard reactive metrics from live store
- Dark mode with light/dark/system toggle + localStorage persistence
- Skip-to-content link and focus-visible styling
- 404 catch-all route and error boundary
- 44px minimum touch targets on mobile
- Global search with dropdown results across all entities
- Toast notification system for CRUD feedback
- Dashboard metric cards + activity items clickable for navigation

## Known-Bad
<!-- Dead ends and approaches that failed — don't retry these -->
- Tailwind v4 `@apply` cannot reference custom component classes (use expanded utility classes instead)

## Build Loop Pass Log
<!-- Append one line per pass: Pass N · angle · queue · commit SHA · items completed · items deferred -->
- Pass 1 · foundation & correctness · full scaffold (G1-G10 done) · e946974 · 10 features shipped · G11-G20 deferred
- Pass 2 · CRUD forms & detail views · G13, G14 done + G2-G7 depth upgrade · 6fc6f0c · 8 items completed · G11,G12,G15-G20 deferred
- Pass 3 · dark mode + accessibility + mobile · G16, G21-G23 done · e7e2161 · 4 items completed · G11,G12,G15,G17-G20 deferred
- Pass 4 · cross-app navigation + search + toasts · G24-G26 done · f827126 · 3 items completed · G11,G12,G15,G17-G20,G27 deferred
- Pass 5 · marketing outreach + cross-entity nav · G19,G27-G29 done · 813b86c · 4 items completed · G11,G12,G15,G17,G18,G20 deferred
- Pass 6 · CRM enhancement + pipeline CRUD · G30-G32 done, G20 in progress · 43d13fc · 3 items completed · G11,G12,G15,G17,G18 deferred
- Pass 7 · dashboard charts + AI insights · G33-G35 done, G1 depth 5, G17-G18 started · PENDING · 4 items completed · G11,G12,G15 deferred
