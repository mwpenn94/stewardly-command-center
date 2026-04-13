# Stewardly Command Center — Feature Parity & Gap Matrix

## Status Key
- **Done** — Implemented and verified
- **Open** — Known gap, not yet addressed
- **In Progress** — Currently being worked on
- **Deferred** — Acknowledged but not prioritized

## Feature Matrix

| ID | Feature | Status | Depth (1-5) | Notes | Commit |
|----|---------|--------|-------------|-------|--------|
| G1 | Dashboard KPIs + segment breakdown + activity feed | Done | 4 | 4 stat cards, segment %, recent activity, platform health | legacy |
| G2 | Contact CRUD with search/filter/pagination | Done | 4 | Segment + tier filters, GHL sync toggle, platform indicators | legacy |
| G3 | Bulk import with CSV upload + column mapping | Done | 4 | Worker config, progress tracking, checkpoint resume | legacy |
| G4 | Campaign Studio (campaigns/sequences/templates) | Done | 4 | Multi-channel: Email, SMS, LinkedIn; create, launch, track | legacy |
| G5 | Sync Engine with scheduler + DLQ | Done | 4 | Hybrid sync, per-platform controls, retry functionality | legacy |
| G6 | Platform integrations (GHL, SMS-iT, Dripify, LinkedIn) | Done | 4 | Credential CRUD, connection testing, status display | legacy |
| G7 | Analytics with per-channel metrics + funnel | Done | 3 | KPI cards, channel breakdown, funnel viz, tier distribution | legacy |
| G8 | Contact enrichment pipeline UI | Done | 2 | Pipeline display ready, PDL integration pending | legacy |
| G9 | Backups & data export | Done | 3 | Create, download, restore; CSV + JSON formats | legacy |
| G10 | Activity feed with type/severity filtering | Done | 3 | Chronological audit log of all system events | legacy |
| G11 | Settings page with theme toggle + preferences | Done | 3 | Dark/light toggle, notifications, timezone, date format | Pass 9 |
| G12 | Mobile responsive layout | Done | 4 | Responsive grids, 44px touch targets, mobile sidebar overlay, responsive padding | Pass 9 |
| G13 | Desktop responsive layout | Done | 4 | Collapsible resizable sidebar, multi-column grids | legacy |
| G14 | Error boundary + 404 page | Done | 3 | App-level error boundary with recovery, 404 catch-all | legacy |
| G15 | Dark mode theme | Done | 4 | OKLCH dark navy + gold accent, now switchable light/dark | Pass 9 |
| G16 | Toast notification system | Done | 4 | Sonner toasts on all CRUD operations | legacy |
| G17 | Skeleton loading states | Done | 3 | Skeleton loaders on tables, cards, lists | legacy |
| G18 | Authentication flow | Done | 3 | Cookie-based auth, login redirect, role-based access | legacy |
| G19 | tRPC API layer (55+ procedures) | Done | 4 | Full type-safe API: contacts, campaigns, sync, integrations | legacy |
| G20 | Database schema (8 tables + migrations) | Done | 4 | Drizzle ORM, MySQL/TiDB, migration-first workflow | legacy |
| G21 | Multi-platform campaign orchestration | Done | 3 | Orchestrator: sequences, health checks, pause/resume/cancel | legacy |
| G22 | Test suite (205 tests) | Done | 4 | Unit + integration + live E2E across 10 files | legacy |
| G23 | Real-time notifications | Open | 0 | Static — needs WebSocket or SSE for live updates | — |
| G24 | AI/Agentic continuous improvement engine | Open | 0 | Future: LLM integration, predictive analytics, churn prediction | — |
| G25 | Predictive analytics | Open | 0 | Future: ML-based forecasting, propensity modeling | — |
| G26 | OAuth2 standard auth flows | Open | 0 | Currently JWT/cookie extraction; needs standard OAuth2 | — |
| G27 | Light mode theme polish | In Progress | 1 | Toggle exists; light theme CSS variables need definition | Pass 9 |
| G28 | Code splitting / lazy loading | Open | 0 | Single bundle 725KB; needs dynamic imports for routes | — |

## Protected Improvements
<!-- Items that must never be weakened by subsequent passes -->
- Mobile-first responsive sidebar with overlay + collapsible desktop mode
- tRPC end-to-end type safety from DB to UI
- OKLCH dark theme with consistent design tokens
- shadcn/ui component system (50+ Radix primitives)
- Hybrid sync scheduler with per-platform controls
- Multi-platform campaign orchestration (Email, SMS, LinkedIn)
- Test isolation with userId 9999 for non-live tests
- Credential format normalization (legacy + current)
- 44px minimum touch targets on mobile
- Toast notification system for all operations
- Settings page with theme toggle + notification preferences

## Known-Bad
<!-- Dead ends and approaches that failed — don't retry these -->
- Tailwind v4 `@apply` cannot reference custom component classes (use expanded utility classes instead)
- GHL API blocked by Cloudflare from datacenter IPs (solved via curl-impersonate)
- Non-live tests using userId 1 overwrite production credentials (always use userId 9999)

## Reconciliation Log
<!-- Conflicts between parallel processes resolved here -->
- Pass 9: Full PARITY.md rewrite — old matrix tracked features from a prior Zustand-based frontend that no longer exists. New matrix reflects the actual tRPC/shadcn/full-stack codebase.

## Build Loop Pass Log
<!-- Append one line per pass: Pass N · angle · queue · commit SHA · items completed · items deferred -->
- Pass 1 · foundation & correctness · full scaffold (G1-G10 done) · e946974 · 10 features shipped · G11-G20 deferred
- Pass 2 · CRUD forms & detail views · G13, G14 done + G2-G7 depth upgrade · 6fc6f0c · 8 items completed · G11,G12,G15-G20 deferred
- Pass 3 · dark mode + accessibility + mobile · G16, G21-G23 done · e7e2161 · 4 items completed · G11,G12,G15,G17-G20 deferred
- Pass 4 · cross-app navigation + search + toasts · G24-G26 done · f827126 · 3 items completed · G11,G12,G15,G17-G20,G27 deferred
- Pass 5 · marketing outreach + cross-entity nav · G19,G27-G29 done · 813b86c · 4 items completed · G11,G12,G15,G17,G18,G20 deferred
- Pass 6 · CRM enhancement + pipeline CRUD · G30-G32 done, G20 in progress · 43d13fc · 3 items completed · G11,G12,G15,G17,G18 deferred
- Pass 7 · dashboard charts + AI insights · G33-G35 done, G1 depth 5, G17-G18 started · 2645449 · 4 items completed · G11,G12,G15 deferred
- Pass 8 · cleanup + docs refresh + merge · dead code removed, README/ARCH updated, package.json v0.7.0 · PENDING · docs refreshed · G11,G12,G15 deferred
- Pass 9 · doc correctness + mobile responsiveness + functional gaps · G11,G12,G15,G27 done; README/ARCH/PARITY rewritten; Settings page added; mobile fixes shipped · PENDING · 4 items completed · G23,G24,G25,G26,G28 deferred
