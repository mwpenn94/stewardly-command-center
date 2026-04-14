# Changelog

All notable changes to the Stewardly Command Center project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.4.0] - 2026-04-14

### Added
- **Admin Purge Test Data** — Danger Zone section in Settings page with confirmation dialog; removes E2E test contacts, campaigns, imports, and activity entries; shows result counts after purge
- **Bulk Import History pagination** — Import history table paginated at 10 items per page with page controls and total count header
- **Quick Setup Guides** — SMS-iT (5-step) and Dripify (4-step) guided credential wizards with numbered steps and per-field hints
- **Server-side CSV Export All** — Export All button on Contacts page triggers server-side CSV generation respecting current search/segment/tier filters; downloads all matching contacts (not just current page)
- **GHL Reset button** — Integrations page shows Reset button for error-status integrations to clear stale errors without losing configuration

### Fixed
- **Test interference** — `bidirectional-sync.test.ts` now uses `beforeEach` (instead of `beforeAll`) to disconnect GHL credentials, preventing parallel test file race conditions with `e2e.test.ts`

## [2.3.0] - 2026-04-13

### Added
- **Campaign scheduling** — Launch dialog now has Send Now / Schedule toggle with datetime-local picker for future scheduling
- **Global search — page navigation** — Search now surfaces all 13 app pages matching by label and keywords
- **Analytics campaign performance chart** — Top 8 campaigns sorted by send volume with proportional bar charts
- **Accessibility — ARIA on data visualizations** — `role="meter"` with aria attributes on Enrichment bars and Analytics funnel steps
- **Settings page — system status** — Live contact/campaign counts, platform connection status, and 6 quick links

### Fixed
- **GlobalSearch type safety** — Replaced `any` types with explicit typed interfaces
- **Home.tsx type safety** — Eliminated all 5 `any` casts with explicit typed interfaces

## [2.2.0] - 2026-04-13

### Added
- **Data completeness analytics** — Enrichment page shows live per-field data completeness bars with color-coded thresholds (green >=70%, amber >=40%, red <40%)

### Fixed
- **Mobile touch targets** — Dashboard campaign lifecycle badges now have 44px minimum height on mobile
- **Contact campaigns mobile** — Campaign channel text hidden on mobile to prevent overflow
- **Type safety** — `TIMELINE_CHANNEL_ICONS` changed from `Record<string, any>` to `Record<string, LucideIcon>`

## [2.1.0] - 2026-04-13

### Added
- **Campaign lifecycle management** — Pause, resume, and cancel buttons in campaign detail dialog
- **Contact campaign attribution** — Contact detail Info tab shows campaigns the contact has interacted with
- **Dashboard campaign lifecycle metrics** — Campaign status breakdown badges below stat cards
- **Dashboard omnichannel grid interactive** — Channel cards navigate to Channel Management page
- **Activity Feed click-through** — Activity log entries navigate to relevant source pages
- **Global Search templates** — Search now finds templates with tier and status badges

## [2.0.0] - 2026-04-13

### Added
- **Campaign Detail view** — Click any campaign to see full metrics dialog with Overview and Timeline tabs
- **Campaign interaction tracking backend** — `campaigns.get`, `interactions.byCampaign` procedures with 3 new DB functions
- **Contact interaction logging** — Log Interaction form in contact detail with 13 channels and per-channel types
- **Channel-specific form labels** — Contextual field labels for email, social, calls, direct mail, events

### Fixed
- **Campaign metrics type** — Changed from `any` to `Record<string, unknown>`
- **Dead code** — Removed unused `addToSyncQueue` function from db.ts
- **Contact timeline error handling** — QueryError with retry button replaces eternal loading spinner

## [1.9.0] - 2026-04-13

### Added
- **Campaign audience selector** — All / By Segment / By Tier targeting with live contact count preview
- **Analytics interactive navigation** — Channel rows and tier cards navigate to relevant pages

### Fixed
- **AI segment engagement — real data** — Replaced `Math.random()` with weighted engagement score from real data
- **AI cross-channel patterns — data-driven scoring** — Confidence and conversion lift computed from actual campaign counts
- **AI channel synergies — data-driven scoring** — Synergy scores computed from actual channel activity
- **Enrichment enrichedCount** — Now queries actual contacts with `enrichedAt IS NOT NULL`
- **Contacts search 320px mobile** — Fixed horizontal scroll on 320px phones

## [1.8.0] - 2026-04-13

### Fixed
- **Build infrastructure** — Restored missing npm packages that prevented production builds
- **TypeScript zero errors** — Fixed 17 TypeScript compilation errors across 6 files
- **Orchestrator type alignment** — `SequenceStep.channel` expanded from 3 to all 13 channels
- **Template creation schema** — `z.enum` for template channel expanded from 3 to 13 channels
- **tsconfig target** — Added `target: "ES2022"` for modern JS feature support

## [1.7.0] - 2026-04-13

### Added
- **Dashboard AI Quick Insights** — Health score indicator with top 3 recommendations and actionable links

### Fixed
- **Contact detail dialog mobile** — Responsive max-width with `calc(100%-2rem)` base
- **Mutation error handling** — All 8 mutations now show toast errors on failure
- **Double-click protection** — Delete/retry buttons disabled during pending state
- **Safe JSON.parse** — Tags and metrics parsing wrapped in try/catch

## [1.6.0] - 2026-04-13

### Added
- **Campaign engine all 13 channels** — Backend expanded from 4 to all 13 channels

### Fixed
- **Mobile touch targets** — All action buttons meet 44px minimum touch target size
- **Campaign dialog widths** — Responsive `max-w-[calc(100%-2rem)]` pattern
- **Dashboard omnichannel grid** — 2-column layout for screens under 400px
- **Backups Platform Data Mirror** — Now wired to real platform health data

## [1.5.0] - 2026-04-13

### Added
- **Campaign Flow Builder** — Visual tab for building cross-channel sequences with step reordering and per-channel message composition

## [1.4.0] - 2026-04-13

### Added
- **Channel Management page** — 13 channels organized by category with per-channel toggle, provider selection, daily limits, and monthly budgets

## [1.3.0] - 2026-04-13

### Added
- **Cross-channel pattern analysis** — AI engine identifies 5 key cross-channel patterns with conversion lift metrics
- **Channel synergy scoring** — 6 channel synergy pairs with 0-100 scores
- **AI cross-channel recommendations** — Multi-channel expansion suggestions

## [1.2.0] - 2026-04-13

### Added
- **Omnichannel expansion (13 channels)** — Schema, campaigns, templates, and sequences now support all channels
- **Contact interaction tracking** — New `contact_interactions` table with 25 interaction types
- **Channel configuration system** — New `channel_configs` table with per-channel settings
- **Unified contact timeline** — 3-tab layout (Info / Timeline / Channels) in contact detail
- **Dashboard omnichannel overview** — 13-channel grid with live interaction counts
- **Campaign Studio all-channel support** — Create campaigns across all 13 channels
- **Analytics all-channel expansion** — Per-channel metrics for all 13 channels

## [1.1.0] - 2026-04-13

### Added
- **AI/Agentic Continuous Improvement Engine** — Health scores, predictions, recommendations, and lead scores from real data
- **AI Insights page** — System health gauges, recommendations, predictions, campaign performance, segment analysis
- **AI lead scoring** — Data-completeness + engagement-based scoring with bulk tier assignment

### Fixed
- **Mobile responsiveness deep fix** — BulkImport, ManusDialog, SelectTrigger, pagination, and empty states all responsive

## [1.0.0] - 2026-04-13

### Added
- **Documentation overhaul** — All docs rewritten for accuracy
- Vite config made portable — Manus-specific plugins load conditionally

### Fixed
- Build failure when optional Manus plugins are not installed
- Corrected all documentation counts and inventories

## [0.16.0] - 2026-04-13

### Added
- **Dialog UX** — All campaign dialogs now have explicit Cancel buttons
- **Type safety** — Eliminated all `any` types from page-level components
- **Security** — BulkImport JWT token input uses `type=password`
- **Coming-soon UX** — Enrichment/Backup buttons disabled with tooltip

## [0.15.0] - 2026-04-13

### Added
- **Keyboard shortcuts** — `?` help dialog, `G`+letter navigation, `Cmd+K` search

## [0.14.0] - 2026-04-13

### Added
- **Contact form validation** — Required fields, email/phone format validation
- **QueryError component** — Reusable error state with retry button

## [0.13.0] - 2026-04-13

### Added
- **Notification center** — Bell icon with 10 most recent activities, auto-refresh, alert badge
- **Mobile contact cards** — Touch-friendly card layout on mobile (<768px)

## [0.12.0] - 2026-04-13

### Added
- **Dashboard clickthrough navigation** — Activity feed items navigate to source pages
- **Actionable empty states** — Import/Create/Connect CTAs in empty sections

### Changed
- **Vendor chunk splitting** — Main bundle reduced from 527KB to 346KB

## [0.11.0] - 2026-04-13

### Added
- **Contact detail modal** — Full info with clickable links, classification, platform status
- **Dashboard quick actions** — New Contact, New Campaign, Bulk Import, Force Sync
- **Accessibility** — Skip-to-content link, focus-visible ring, ARIA roles

## [0.10.0] - 2026-04-13

### Added
- **Light mode theme** — Full OKLCH light color palette with smooth switching
- **Code splitting** — All routes lazy-loaded, main bundle reduced from 725KB to 527KB
- **Global search** — `Cmd+K` overlay searching contacts and campaigns

## [0.9.0] - 2026-04-13

### Added
- **Settings page** — Theme toggle, notification preferences, timezone/date format configuration
- Dark/light theme switching via ThemeProvider

### Fixed
- **Mobile responsiveness** across all pages: stacking layouts, 44px touch targets, reduced padding

## [0.8.0] - 2026-04-13

### Added
- **Foundation** — Full-stack application: React 19, TypeScript, Vite, Tailwind CSS 4, Express, tRPC 11, Drizzle ORM
- **Dashboard** — 4 KPI cards, segment breakdown, activity feed, platform health
- **Contacts** — Full CRUD with search, filter, pagination, segment/tier assignment
- **Bulk Import** — CSV upload with column mapping, progress tracking, checkpoint resume
- **Campaign Studio** — Campaigns, sequences, and templates across Email/SMS/LinkedIn
- **Sync Engine** — Hybrid sync scheduler, queue visualization, DLQ with retry
- **Integrations** — GHL, SMS-iT, Dripify, LinkedIn credential management
- **Analytics** — Campaign metrics, funnel visualization, tier distribution
- **Contact Enrichment** — PDL pipeline UI with scoring display
- **Backups** — Create, download, restore with CSV/JSON formats
- **Activity Feed** — Chronological audit log with type/severity filtering
- **Error boundary** — App-level error catching with recovery UI
- **404 page** — Catch-all route with navigation
- **Dark theme** — OKLCH color space, Plus Jakarta Sans + Instrument Serif typography
- **Toast system** — Sonner notifications on all CRUD operations
- **Skeleton loaders** — Loading states on tables, cards, lists
- **Mobile responsive** — Sidebar overlay, collapsible desktop sidebar
- **tRPC API** — Type-safe procedures for all backend operations
- **Database** — Tables via Drizzle ORM with MySQL/TiDB
- **Test suite** — Unit, integration, and live E2E test files
- **Authentication** — Cookie-based auth with login redirect, role-based access
- **Service layer** — GHL, SMS-iT, Dripify, Orchestrator, SyncScheduler, SyncWorker, CampaignEngine, Credentials, AIEngine
