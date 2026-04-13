# Stewardly Command Center — Feature Parity & Gap Matrix

## Status Key
- **Done** — Implemented and verified
- **Open** — Known gap, not yet addressed
- **In Progress** — Currently being worked on
- **Deferred** — Acknowledged but not prioritized

## Feature Matrix

| ID | Feature | Status | Depth (1-5) | Notes | Commit |
|----|---------|--------|-------------|-------|--------|
| G1 | Dashboard metrics & activity feed | Done | 3 | Mock data, needs API | — |
| G2 | Property CRUD & listing | Done | 4 | Full CRUD with modal forms + detail view | Pass 2 |
| G3 | Tenant directory & lease tracking | Done | 4 | Full CRUD with modal forms + detail view | Pass 2 |
| G4 | Maintenance request workflow | Done | 4 | Full CRUD with modal forms, priority/status editing | Pass 2 |
| G5 | CRM contact pipeline | Done | 4 | Full CRUD with modal forms, tags, pipeline tracking | Pass 2 |
| G6 | Marketing campaign management | Done | 4 | Full CRUD with modal forms + budget/performance tracking | Pass 2 |
| G7 | Data pipeline integration hub | Done | 3 | Status display + pause/resume controls, actual integration pending | Pass 2 |
| G8 | Settings & preferences | Done | 2 | UI done; persistence layer pending | — |
| G9 | Mobile responsive layout | Done | 4 | Sidebar overlay, responsive grids, touch targets | — |
| G10 | Desktop responsive layout | Done | 4 | Collapsible sidebar, multi-column grids | — |
| G11 | Authentication & auth flow | Open | 0 | Not started — needs auth provider | — |
| G12 | API layer (replace mock data) | Open | 0 | Mock data in place, API client needed | — |
| G13 | Create/Edit forms for entities | Done | 4 | Modal forms for all entities with validation | Pass 2 |
| G14 | Detail views for entities | Done | 3 | Modal detail views for Properties & Tenants | Pass 2 |
| G15 | Real-time notifications | Open | 0 | Static badge count only | — |
| G16 | Dark mode / theme switching | Open | 0 | Theme tokens ready, toggle needed | — |
| G17 | AI/Agentic continuous improvement | Open | 0 | Architecture planned, not started | — |
| G18 | Predictive analytics | Open | 0 | Requires AI engine + data pipeline | — |
| G19 | Automated outreach workflows | Open | 0 | Marketing automation not started | — |
| G20 | Multi-platform CRM sync | Open | 0 | Pipeline UI exists, sync logic needed | — |

## Protected Improvements
<!-- Items that must never be weakened by subsequent passes -->
- Mobile-first responsive sidebar with overlay + collapsible desktop mode
- Consistent card/badge/table component system
- Tailwind v4 custom theme tokens
- TypeScript strict type coverage
- Centralized Zustand data store with CRUD for all entities
- Modal forms with native `<dialog>` for accessibility
- Dashboard reactive metrics from live store

## Known-Bad
<!-- Dead ends and approaches that failed — don't retry these -->
- Tailwind v4 `@apply` cannot reference custom component classes (use expanded utility classes instead)

## Build Loop Pass Log
<!-- Append one line per pass: Pass N · angle · queue · commit SHA · items completed · items deferred -->
- Pass 1 · foundation & correctness · full scaffold (G1-G10 done) · e946974 · 10 features shipped · G11-G20 deferred
- Pass 2 · CRUD forms & detail views · G13, G14 done + G2-G7 depth upgrade · PENDING · 8 items completed · G11,G12,G15-G20 deferred
