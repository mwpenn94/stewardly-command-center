# Changelog

All notable changes to the Stewardly Command Center project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.9.0] - 2026-04-13

### Added
- **QueryError on 4 more pages** — SyncEngine, ActivityFeed, Channels, and Integrations now show retry-able error states when queries fail (total: 9 pages with QueryError)
- **BulkImport mobile scroll hint** — Mobile-only helper text "Scroll horizontally to see more columns →" for CSV preview table

### Fixed
- **Touch targets** — Integrations disconnect/configure buttons, Channels configure button, BulkImport CDN import button, Contacts pagination buttons all now ≥44px on mobile
- **Contact detail grid** — Channel reach summary grid changed from 3-col to 2-col on mobile for 320px viewport readability
- **Unused imports** — Removed unused DialogTrigger (BulkImport, Contacts) and useEffect (Integrations)

## [1.8.0] - 2026-04-13

### Fixed
- **Build infrastructure** — Restored missing npm packages (`@tailwindcss/vite`, `tailwindcss`, etc.) that prevented production builds from completing. Both client (Vite) and server (esbuild) builds now pass
- **TypeScript zero errors** — Fixed 17 TypeScript compilation errors across 6 files: `tsc --noEmit` now passes clean
  - `Home.tsx`: `HealthScore` is an object, fixed comparison to use `.overall` property
  - `aiEngine.ts`: Activity log returns `{entries, total}`, was being treated as array; syncStats returns `{total, byStatus, byPlatform}`, was being treated as `Record<string, number>`
  - `Campaigns.tsx`: `SeqStep.channel` typed as proper `SingleChannel` union (was `string`); template form channel typed as `SingleChannel` (was `string`)
  - `Channels.tsx`: Channel keys typed with proper `ChannelKey` union type, removing 2 `as any` casts
  - `Backups.tsx`: Contact stats `synced` property extracted from `bySyncStatus` array (property didn't exist)
  - `vite.config.ts`: Top-level `await` moved into async `defineConfig()` callback
- **Orchestrator type alignment** — `SequenceStep.channel` expanded from 3 channels (`email | sms | linkedin`) to all 13, matching tRPC router schema and Campaign Studio UI
- **Template creation schema** — `z.enum` for template channel expanded from 3 to 13 channels, matching Campaign Studio's all-channel template creation UI
- **tsconfig target** — Added `target: "ES2022"` for proper modern JS feature support (top-level await, private fields)

## [1.7.0] - 2026-04-13

### Added
- **Dashboard AI Quick Insights** — Health score indicator with color-coded status, top 3 prioritized recommendations with priority badges and actionable navigation links, auto-refreshes every 5 minutes. Surfaces the most important AI intelligence directly on the command center home page

### Fixed
- **Contact detail dialog mobile** — Explicit responsive max-width with `calc(100%-2rem)` base and 90vh max-height for better mobile viewing
- **Mutation error handling** — All 8 mutations that were missing `onError` handlers now show toast errors (Contacts CRUD, Campaign delete/template/cancel, SyncEngine retry/stop, BulkImport create)
- **Double-click protection** — Delete contact, delete campaign, and retry DLQ buttons now disabled during pending state with loading spinners
- **Safe JSON.parse** — Contacts tags and Campaign metrics parsing wrapped in try/catch to prevent component crashes on malformed data
- **Documentation accuracy** — All doc files updated with correct counts: 73 tRPC procedures, 11 database tables, accurate line counts

## [1.6.0] - 2026-04-13

### Fixed
- **Mobile touch targets** — Campaign delete/launch/cancel buttons, Flow Builder reorder/remove/channel-add buttons, and Integrations password toggle all now meet 44px minimum touch target size (were 28px)
- **Campaign dialog widths** — All 5 dialogs (Create, Launch, Sequence, Template, Channel Config) now use responsive `max-w-[calc(100%-2rem)] sm:max-w-*` pattern instead of fixed widths that overflowed on mobile
- **Dashboard omnichannel grid** — Added 2-column layout for screens under 400px; was forcing 3 columns on tiny screens causing cramped cards
- **Backups Platform Data Mirror** — Previously hardcoded with static platform names; now wired to real `trpc.orchestrator.platformHealth` and `trpc.contacts.stats` showing live connected/disconnected status, last-checked timestamps, and actual contact mirror counts

### Added
- **Campaign engine all 13 channels** — Backend `CampaignEngine` expanded from 4 channels (email/sms/linkedin/multi) to all 13. Social channels route through GHL Social queue, call channels create agent call tasks, direct mail/webform/chat/event queue for external fulfillment. All channels record `platformResults` for tracking
- **Dashboard stat card icons** — Stat card icons increased to 44px (h-11 w-11) for consistent touch targets

## [1.5.0] - 2026-04-13

### Added
- **Campaign Flow Builder** — New visual tab in Campaign Studio for building cross-channel sequences. Add steps from any of 13 channels, reorder with up/down arrows, configure delays between steps, compose per-channel messages (email subjects, call scripts, social captions), and launch as a unified omnichannel sequence
- **Platform data mirror** — Backups page now shows live platform data mirror status for GHL, SMS-iT, and Dripify with auto-sync indicators. Data continuity messaging confirms local mirror is always active for disaster recovery

## [1.4.0] - 2026-04-13

### Added
- **Channel Management page** — New `/channels` route with all 13 channels organized by category (Messaging, Social, Voice, Physical, Inbound, Events). Per-channel toggle, provider selection (GHL, SMS-iT, Dripify, Twilio, Lob, etc.), daily send limits, monthly budget caps
- **Drizzle migration 0002** — SQL migration for `contact_interactions` and `channel_configs` tables with proper indexes and unique constraints

## [1.3.0] - 2026-04-13

### Added
- **Cross-channel pattern analysis** — AI engine identifies 5 key cross-channel patterns (LinkedIn→Email, Email→Call, Multi-Touch Social, Event→Follow-Up, SMS Urgency) with conversion lift metrics (2.5x-5x), confidence scores, and suggested channel sequences
- **Channel synergy scoring** — 6 channel synergy pairs with 0-100 scores analyzing complementary channel combinations (Webform+Email: 90, Email+LinkedIn: 85, Email+Call: 80, etc.)
- **AI cross-channel recommendations** — Engine detects when campaigns use fewer than 3 channels and recommends multi-channel expansion with expected conversion improvements
- **Visual sequence flows** — Cross-channel patterns display suggested channel sequences with icons and arrows for intuitive understanding

## [1.2.0] - 2026-04-13

### Added
- **Omnichannel expansion (13 channels)** — Schema, campaigns, templates, and sequences now support all channels: Email, SMS, LinkedIn, Facebook, Instagram, Twitter/X, TikTok, Inbound Calls, Outbound Calls, Direct Mail, Webforms/Landing Pages, Chat/Webchat, Events/Webinars
- **Contact interaction tracking** — New `contact_interactions` table with 25 interaction types (messages, calls, forms, events, social), direction (inbound/outbound), sentiment tracking, campaign linkage, and platform attribution
- **Channel configuration system** — New `channel_configs` table with per-channel enable/disable, provider assignment, daily limits, monthly budgets, and status tracking
- **Unified contact timeline** — Contact detail dialog now has 3-tab layout (Info / Timeline / Channels) showing cross-channel interaction history with channel icons, direction indicators, sentiment badges, and relative timestamps
- **Dashboard omnichannel overview** — New 13-channel grid on dashboard showing per-channel interaction counts with live data, total interactions badge, and auto-refresh every 2 minutes
- **Campaign Studio all-channel support** — Create campaigns and sequences across all 13 channels; platform health indicators expanded to show 5 providers (GHL, SMS-iT, Dripify, Direct Mail, Voice/Calls)
- **Analytics all-channel expansion** — Per-channel metrics now cover all 13 channels; only channels with data shown (plus core 3 always visible)
- **7 new tRPC procedures** — `interactions.list`, `interactions.create`, `interactions.stats`, `interactions.crossChannelMetrics`, `channels.list`, `channels.upsert`, `channels.get`
- **DB layer functions** — `getContactInteractions`, `createInteraction`, `getInteractionStats`, `getCrossChannelMetrics`, `getChannelConfigs`, `upsertChannelConfig`, `getChannelConfig`

## [1.1.0] - 2026-04-13

### Added
- **AI/Agentic Continuous Improvement Engine** — Full backend service (`server/services/aiEngine.ts`) computing health scores, predictions, recommendations, and lead scores from real data across contacts, campaigns, sync, and integrations
- **AI Insights page** — New `/ai-insights` route with system health gauges (overall + 5 categories), prioritized recommendations with actionable CTAs, trend-based predictions with confidence scores, campaign performance by channel, segment analysis, and automation summary
- **AI lead scoring** — Data-completeness + engagement-based scoring algorithm with bulk scoring mutation that auto-assigns Gold/Silver/Bronze tiers
- **tRPC AI router** — 6 new procedures: `ai.insights`, `ai.healthScore`, `ai.recommendations`, `ai.predictions`, `ai.leadScore`, `ai.bulkLeadScore`
- AI Insights entry in sidebar navigation with Brain icon

### Fixed
- **Mobile responsiveness deep fix** — BulkImport stats grid (6-col → 2/3/6 responsive), import history grid (4-col → 2/4 responsive), ManusDialog width (fixed 400px → responsive calc), SelectTrigger widths now full-width on mobile across Backups, ActivityFeed, Contacts; pagination buttons use 36px on mobile; all empty state padding reduced from p-12 to p-6 sm:p-12 (9 instances across 7 pages)
- Backup create form layout now stacks on mobile instead of forced flex-row

## [1.0.0] - 2026-04-13

### Added
- **Documentation overhaul** — All docs (README, DOCUMENTATION, ARCHITECTURE, CHANGELOG, PARITY) rewritten for accuracy
- Vite config made portable — Manus-specific plugins now load conditionally, build works in any environment

### Fixed
- Build failure when `@builder.io/vite-plugin-jsx-loc` and `vite-plugin-manus-runtime` are not installed
- Corrected all documentation: table count (8 → 9), procedure count (55+ → 59), line counts, page inventories
- Removed inaccurate changelog entries from versions 0.1.0–0.7.1 that described a different project

## [0.16.0] - 2026-04-13

### Added
- **Dialog UX** — All 4 campaign dialogs (Create, Launch, Sequence, Template) now have explicit Cancel buttons
- **Type safety** — Eliminated all `any` types from page-level components; proper interfaces for Campaigns, Analytics, ActivityFeed, Backups, BulkImport, Enrichment
- **Security** — BulkImport JWT token input uses `type=password` to prevent shoulder-surfing
- **Coming-soon UX** — Enrichment "Enrich All" and Backup "Restore" buttons disabled with tooltip instead of misleading toast
- **Backup status fix** — Status badges now use actual schema values (ready/expired) instead of wrong literals

## [0.15.0] - 2026-04-13

### Added
- **Keyboard shortcuts** — `?` opens help dialog showing all shortcuts; `G` + letter navigates (H=home, C=contacts, M=campaigns, S=sync, A=analytics); `Cmd+K` opens search; `Esc` closes dialogs
- **KeyboardShortcuts dialog** — Accessible reference panel for all keyboard shortcuts

### Changed
- Campaign Studio tabs now full-width on mobile for easier touch targets
- Sequence builder dialog has better mobile max-height handling

## [0.14.0] - 2026-04-13

### Added
- **Contact form validation** — Required field check (name or email), email format validation, phone format validation with inline error messages and red border highlights
- **QueryError component** — Reusable error state with retry button for failed tRPC queries
- Graceful degradation on dashboard platform health section when API is unavailable

## [0.13.0] - 2026-04-13

### Added
- **Notification center** — Bell icon in desktop header and mobile top bar; shows 10 most recent activities with severity icons (success/info/warning/error), click navigates to source page, auto-refreshes every 30 seconds, alert badge count for warnings/errors
- **Mobile contact cards** — Contacts page shows touch-friendly card layout on mobile (<768px) with name, tier badge, email, phone, platform indicators, and segment badge; desktop keeps full table view

### Changed
- Contacts table reduced from 8 to 7 columns on desktop (removed Score column for cleaner layout)
- Desktop header now shows search bar + notification bell

## [0.12.0] - 2026-04-13

### Added
- **Dashboard clickthrough navigation** — Activity feed items navigate to source pages (sync → /sync, campaign → /campaigns, etc.); "View all activity" link at bottom
- **Actionable empty states** — Empty contacts section shows Import/Create links; empty platforms shows Connect link; all empty states have clear CTAs

### Changed
- **Vendor chunk splitting** — Main bundle reduced from 527KB to 346KB (52% total reduction from 725KB original); React, Radix UI, and Query libraries split into cacheable vendor chunks
- Dashboard stat cards now show hover scale animation on icons

## [0.11.0] - 2026-04-13

### Added
- **Contact detail modal** — Click contact name or eye icon to view full info: email/phone/address with clickable links, segment/tier/score classification, platform connection status (GHL, SMS-iT, LinkedIn), tags display, and edit shortcut
- **Dashboard quick actions** — 4 action buttons: New Contact, New Campaign, Bulk Import, Force Sync; stat cards now clickable with keyboard support
- **Accessibility** — Skip-to-content link (visible on Tab), global `:focus-visible` ring on all interactive elements, ARIA `role="button"` on stat cards

## [0.10.0] - 2026-04-13

### Added
- **Light mode theme** — Full OKLCH light color palette (warm white backgrounds, darker gold accent, proper contrast) with smooth dark/light switching
- **Code splitting** — All routes lazy-loaded via `React.lazy()` + `Suspense`; main bundle reduced from 725KB to 527KB, pages load as 4-34KB separate chunks
- **Global search** — `Cmd+K` / `Ctrl+K` shortcut opens search from anywhere; searches contacts and campaigns with dropdown results; available in both desktop header and mobile top bar
- Page loading spinner for lazy route transitions

### Changed
- CSS restructured: `:root` now defines light theme, `.dark` class overrides with dark theme
- Card hover effects adapt to light/dark mode

## [0.9.0] - 2026-04-13

### Added
- **Settings page** — Theme toggle (dark/light), notification preferences, timezone/date format configuration, profile display, integration quick links
- Dark/light theme switching via ThemeProvider

### Fixed
- **Mobile responsiveness** across all pages:
  - Campaign Studio: platform health grid stacks on mobile
  - Sync Engine: scheduler controls and platform grid stack on mobile
  - All page headers: title + action buttons stack vertically on mobile
  - 44px minimum touch targets on all mobile action buttons
  - Main content padding reduced from `p-6` to `p-4` on mobile
  - Filter rows wrap properly on small screens
- Settings link in user dropdown now routes to `/settings`

### Changed
- **Documentation rewrite** — README, ARCHITECTURE, and PARITY rewritten to describe the actual tRPC/shadcn/Drizzle stack (previously described an outdated Zustand-based frontend)
- Sidebar navigation now includes Settings page

## [0.8.0] - 2026-04-13

### Added
- **Foundation** — Full-stack application scaffolded with React 19, TypeScript, Vite, Tailwind CSS 4, Express, tRPC 11, Drizzle ORM
- **Dashboard** — 4 KPI cards, segment breakdown, activity feed, platform health monitoring
- **Contacts** — Full CRUD with search, filter, pagination, segment/tier assignment
- **Bulk Import** — CSV upload with column mapping, progress tracking, checkpoint resume
- **Campaign Studio** — Campaigns, sequences, and templates across Email/SMS/LinkedIn
- **Sync Engine** — Hybrid sync scheduler, queue visualization, DLQ with retry
- **Integrations** — GHL, SMS-iT, Dripify, LinkedIn credential management and connection testing
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
- **tRPC API** — 65 type-safe procedures for all backend operations (59 core + 6 AI)
- **Database** — 9 tables via Drizzle ORM with MySQL/TiDB
- **Test suite** — 10 test files covering unit, integration, and live E2E
- **Authentication** — Cookie-based auth with login redirect, role-based access
- **Service layer** — 9 service modules: GHL, SMS-iT, Dripify, Orchestrator, SyncScheduler, SyncWorker, CampaignEngine, Credentials, AIEngine
