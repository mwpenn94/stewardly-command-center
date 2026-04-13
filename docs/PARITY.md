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
| G19 | tRPC API layer (59 procedures) | Done | 4 | Full type-safe API: contacts, campaigns, sync, integrations | legacy |
| G20 | Database schema (9 tables + migrations) | Done | 4 | Drizzle ORM, MySQL/TiDB, migration-first workflow | legacy |
| G21 | Multi-platform campaign orchestration | Done | 3 | Orchestrator: sequences, health checks, pause/resume/cancel | legacy |
| G22 | Test suite (10 files, 3 tiers) | Done | 4 | Unit + integration + live E2E across 10 files | legacy |
| G23 | Notification center | Done | 3 | Bell icon in header with popover, shows recent activity with severity badges, auto-refresh 30s | Pass 13 |
| G24 | AI/Agentic continuous improvement engine | Open | 0 | Future: LLM integration, predictive analytics, churn prediction | — |
| G25 | Predictive analytics | Open | 0 | Future: ML-based forecasting, propensity modeling | — |
| G26 | OAuth2 standard auth flows | Open | 0 | Currently JWT/cookie extraction; needs standard OAuth2 | — |
| G27 | Light mode theme polish | Done | 4 | Full OKLCH light theme with warm gold accents, card hover adjustments | Pass 10 |
| G28 | Code splitting / lazy loading | Done | 5 | Lazy routes + vendor chunks: main 346KB, vendors 204KB, pages 3-34KB | Pass 12 |
| G29 | Global search (header + mobile) | Done | 3 | ⌘K search across contacts + campaigns, dropdown results, mobile compact | Pass 10 |
| G30 | Contact detail modal | Done | 4 | Full info, platform connections (GHL/SMS/LI), classification, tags, edit shortcut | Pass 11 |
| G31 | Dashboard quick actions + clickable stats | Done | 3 | 4 quick action buttons, stat cards navigate to relevant pages, keyboard accessible | Pass 11 |
| G32 | Accessibility (skip-link, focus-visible, ARIA) | Done | 3 | Skip-to-content link, global focus-visible ring, ARIA roles on interactive cards | Pass 11 |
| G33 | Dashboard clickthrough navigation | Done | 4 | Activity items → source page, stat cards → entity pages, "View all" links | Pass 12 |
| G34 | Actionable empty states | Done | 3 | CTAs with navigation links on empty contacts, platforms, campaigns, activity | Pass 12 |
| G35 | Vendor chunk splitting | Done | 5 | React, Radix, Query separated; main bundle 725KB → 346KB (52% reduction) | Pass 12 |
| G36 | Mobile contact cards | Done | 4 | Card layout on mobile (<768px) with name, badges, platforms; table on desktop | Pass 13 |
| G37 | Notification center (bell icon) | Done | 3 | Popover with 10 latest activities, severity icons, click-to-navigate, auto-refresh | Pass 13 |
| G38 | Contact form validation | Done | 3 | Required fields, email format, phone format, inline error display | Pass 14 |
| G39 | Graceful query error states | Done | 3 | QueryError component with retry button, used on dashboard health check | Pass 14 |
| G40 | Keyboard shortcuts + navigation | Done | 4 | ? for help dialog, G+letter for nav, ⌘K for search, Esc to close | Pass 15 |
| G41 | Campaign page mobile polish | Done | 3 | Full-width tabs, responsive sequence dialog, mobile touch targets | Pass 15 |
| G42 | Campaign dialog Cancel buttons | Done | 3 | All 4 dialogs (Create, Launch, Sequence, Template) have explicit Cancel + primary action | Pass 16 |
| G43 | Type safety — eliminate `any` from pages | Done | 4 | Proper interfaces for Campaigns, Analytics, ActivityFeed, Backups, BulkImport, Enrichment; 0 TS errors | Pass 16 |
| G44 | Coming-soon UX — disabled buttons | Done | 2 | Enrichment "Enrich All" and Backup "Restore" disabled with tooltip instead of misleading toast | Pass 16 |
| G45 | Security — mask JWT input | Done | 2 | BulkImport token input uses type=password to prevent shoulder-surfing | Pass 16 |
| G46 | Backup status alignment | Done | 2 | Status badges use actual schema values (ready/expired) instead of wrong literals (completed/failed) | Pass 16 |
| G47 | Documentation accuracy overhaul | Done | 5 | All docs rewritten: README, DOCUMENTATION, ARCHITECTURE, CHANGELOG, PARITY — correct counts, line numbers, inventories | Pass 17 |
| G48 | Portable build config | Done | 3 | Manus-specific Vite plugins load conditionally; build works in any environment | Pass 17 |

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
- Contact detail modal with platform connection status
- Dashboard quick actions and clickable stat cards
- Skip-to-content link and global focus-visible ring
- Zero `any` types in page-level components (tRPC inference + explicit interfaces)
- All dialogs have explicit Cancel buttons for clear dismissal UX
- Documentation accuracy: all counts, line numbers, and inventories verified against source
- Portable build: Vite config works with or without Manus-specific plugins

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
- Pass 9 · doc correctness + mobile responsiveness + functional gaps · G11,G12,G15,G27 done; README/ARCH/PARITY rewritten; Settings page added; mobile fixes shipped · e59e2eb · 4 items completed · G23,G24,G25,G26,G28 deferred
- Pass 10 · light mode + code splitting + global search · G27,G28,G29 done; light OKLCH theme, lazy routes, ⌘K search · a682b56 · 3 items completed · G23,G24,G25,G26 deferred
- Pass 11 · contact detail + dashboard actions + accessibility · G30,G31,G32 done; detail modal, quick actions, skip-link, focus-visible · 4ee0a18 · 3 items completed · G23,G24,G25,G26 deferred
- Pass 12 · cross-nav + empty states + vendor chunks · G33,G34,G35 done; clickable activity, actionable CTAs, bundle 346KB · b62dfe0 · 3 items completed · G23,G24,G25,G26 deferred
- Pass 13 · notifications + mobile contacts + campaign UX · G23,G36,G37 done; notification center, mobile cards, 30s auto-refresh · 45300c5 · 3 items completed · G24,G25,G26 deferred
- Pass 14 · error handling + input validation + graceful degradation · G38,G39 done; form validation, QueryError component · 00b07a2 · 2 items completed · G24,G25,G26 deferred
- Pass 15 · keyboard shortcuts + campaign mobile + dev ergonomics · G40,G41 done; ? help dialog, G+nav, campaign tabs responsive · 4a20e16 · 2 items completed · G24,G25,G26 deferred
- Pass 16 · dialog UX + type safety + security · G42-G46 done; Cancel buttons, 0 TS errors in pages, masked JWT, disabled coming-soon, backup status fix · PENDING · 5 items completed · G24,G25,G26 deferred
- Pass 17 · documentation accuracy + build fix · G47,G48 done; all 5 doc files rewritten with verified counts, CHANGELOG purged of property-mgmt entries, vite config portable · PENDING · 2 items completed · G24,G25,G26 deferred
