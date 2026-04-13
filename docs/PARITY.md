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
| G2 | Property CRUD & listing | Done | 2 | List/filter done, create/edit forms pending | — |
| G3 | Tenant directory & lease tracking | Done | 2 | List/filter done, detail view pending | — |
| G4 | Maintenance request workflow | Done | 3 | Priority, status, assignment in place | — |
| G5 | CRM contact pipeline | Done | 2 | Pipeline summary, table, tags; detail view pending | — |
| G6 | Marketing campaign management | Done | 3 | Cards, metrics, budget bars; creation form pending | — |
| G7 | Data pipeline integration hub | Done | 2 | Status display done; actual integration pending | — |
| G8 | Settings & preferences | Done | 2 | UI done; persistence layer pending | — |
| G9 | Mobile responsive layout | Done | 4 | Sidebar overlay, responsive grids, touch targets | — |
| G10 | Desktop responsive layout | Done | 4 | Collapsible sidebar, multi-column grids | — |
| G11 | Authentication & auth flow | Open | 0 | Not started — needs auth provider | — |
| G12 | API layer (replace mock data) | Open | 0 | Mock data in place, API client needed | — |
| G13 | Create/Edit forms for entities | Open | 0 | All entities need CRUD forms | — |
| G14 | Detail views for entities | Open | 0 | Click-through detail pages needed | — |
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

## Known-Bad
<!-- Dead ends and approaches that failed — don't retry these -->
- Tailwind v4 `@apply` cannot reference custom component classes (use expanded utility classes instead)

## Build Loop Pass Log
<!-- Append one line per pass: Pass N · angle · queue · commit SHA · items completed · items deferred -->
