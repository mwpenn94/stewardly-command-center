# Changelog

All notable changes to the Stewardly Command Center project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.3.0] - 2026-04-13

### Added
- **Contact CSV export** — Export button on Contacts page header downloads current page contacts as CSV with 9 columns (First Name, Last Name, Email, Phone, Company, Segment, Tier, City, State); client-side Blob download with date-stamped filename
- **Campaign scheduling** — Launch dialog now has Send Now / Schedule toggle. Schedule mode shows a datetime-local picker for future scheduling. Summary updates to show scheduled date. Button disabled until date selected in schedule mode

## [2.2.0] - 2026-04-13
## [2.3.0] - 2026-04-13

### Added
- **Global search — page navigation** — ⌘K search now surfaces all 13 app pages matching by label and keywords (e.g., type "ai" → AI Insights, "sync" → Sync Engine, "import" → Bulk Import). Pages appear in results before contacts and campaigns for faster navigation
- **Analytics campaign performance chart** — New "Campaign Performance" section shows top 8 campaigns sorted by send volume with proportional bar charts, channel icons, and status badges; provides campaign-level drill-down for analytics
- **Accessibility — ARIA on data visualizations** — `role="meter"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax` on Enrichment data completeness bars and Analytics conversion funnel steps; `aria-hidden` on decorative icons; `role="status"` with `aria-label` on campaign detail MetricCard components; `role="region"` with label on Analytics campaign performance section
- **Settings page — system status** — Settings page now shows live contact/campaign counts, platform connection status with connected/disconnected badges, and 6 quick links to key app areas (Integrations, Channels, Backups, AI Insights, Analytics, Import)

### Fixed
- **GlobalSearch type safety** — Replaced `any` types in contact and campaign search result callbacks with explicit typed interfaces
- **Home.tsx type safety** — Eliminated all 5 `any` casts in Home.tsx; explicit typed interfaces for crossChannelMetrics, aiRecommendations, contactStats segments, activityLog entries, and platformHealth results

## [2.2.0] - 2026-04-13

### Added
- **Data completeness analytics** — Enrichment page now shows live per-field data completeness bars (Email, Phone, Address, City, Company, GHL Synced, Tier Scored, Segmented) with color-coded thresholds (green ≥70%, amber ≥40%, red <40%); average data completeness score; new `contacts.dataCompleteness` tRPC procedure and `getDataCompletenessStats` DB function

### Fixed
- **Mobile touch targets** — Dashboard campaign lifecycle badges now have 44px minimum height on mobile with keyboard accessibility (`role="button"`, `tabIndex`, `onKeyDown`)
- **Contact campaigns mobile** — Campaign channel text hidden on mobile (`hidden sm:inline`) to prevent text overflow on 375px screens
- **Type safety** — `TIMELINE_CHANNEL_ICONS` in Contacts.tsx changed from `Record<string, any>` to `Record<string, LucideIcon>`, removing another `any` type

## [2.1.0] - 2026-04-13

### Added
- **Campaign lifecycle management** — Pause, resume, and cancel buttons in campaign detail dialog; running campaigns can be paused, paused campaigns can be resumed, active campaigns can be cancelled; status updates via tRPC with toast feedback and query invalidation
- **Contact campaign attribution** — Contact detail Info tab now shows a "Campaigns" section listing all campaigns the contact has interacted with, showing campaign name, status badge, and channel; new `contacts.campaigns` tRPC procedure and `getCampaignsForContact` DB function
- **Dashboard campaign lifecycle metrics** — Campaign status breakdown badges (draft/scheduled/running/paused/completed/failed) displayed below stat cards; each badge shows count and clicks through to /campaigns

## [2.0.0] - 2026-04-13

### Added
- **Campaign Detail view** — Click any campaign name to open a detail dialog with two tabs: Overview (audience/sent/failed/interactions metrics, per-channel interaction breakdown, type breakdown, direction stats, timestamps) and Timeline (chronological campaign interaction history with channel icons, sentiment badges, direction indicators)
- **Campaign interaction tracking backend** — New `campaigns.get` tRPC procedure returns single campaign with aggregated interaction stats (by channel, type, direction); new `interactions.byCampaign` procedure returns interactions filtered by campaign ID; 3 new DB functions: `getCampaignById`, `getInteractionsByCampaign`, `getCampaignInteractionStats`
- **Campaign name clickable** — Campaign list items now have clickable names (hover underline, keyboard accessible) that open the detail dialog

### Fixed
- **Campaign metrics type** — Changed from `any` to `Record<string, unknown>` in Campaigns.tsx, eliminating the last page-level `any` type
- **Dead code** — Removed unused `addToSyncQueue` function from db.ts (was defined but never called)
- **Documentation accuracy** — All docs updated with verified counts: 75 tRPC procedures, corrected line counts across README (pages, services), ARCHITECTURE (custom components, services), DOCUMENTATION (procedures)

## [1.9.0] - 2026-04-13

### Added
- **Campaign audience selector** — Launch dialog now has audience targeting: choose "All" contacts, "By Segment" (Residential, Commercial, Agricultural, CPA/Tax, etc.), or "By Tier" (Gold, Silver, Bronze, Unscored). Live count updates as you select. Filtered contact IDs are sent to the launch API — no more blind launches
- **Analytics interactive navigation** — Channel breakdown rows in Analytics are now clickable and navigate to Campaigns page. Tier distribution cards navigate to Contacts. Hover states added throughout for discoverability

## [2.1.0] - 2026-04-13

### Added
- **Dashboard omnichannel grid interactive** — Channel cards in the omnichannel overview grid are now clickable buttons that navigate to the Channel Management page; hover highlights with primary border color
- **Activity Feed click-through** — Activity log entries are now clickable and navigate to the relevant source page (sync events→/sync, campaigns→/campaigns, imports→/import, etc.) with a subtle ExternalLink indicator on hover
- **Global Search templates** — Search now finds templates in addition to contacts and campaigns. Contact results show tier badges (gold/silver/bronze), campaign results show status badges (draft/running/completed)

## [2.0.0] - 2026-04-13

### Added
- **Campaign detail view** — Click any campaign card to see a full metrics dialog: sent, failed, opened, open rate, click rate, conversions/replies, delivery progress bar with delivered vs. failed breakdown. Drafts show a "Launch" CTA directly from the detail view
- **Contact interaction logging** — New "Log Interaction" form in contact detail timeline tab. Select from 13 channels, choose direction (inbound/outbound), pick from per-channel interaction types (e.g., email→message_sent/opened/clicked, call→call_made/missed, LinkedIn→connection_sent/accepted), add subject and notes. Saves via `interactions.create` tRPC mutation
- **Channel-specific form labels** — Campaign launch, template creation, and sequence step dialogs now show contextual field labels: "Subject" for email, "Caption / Headline" for social channels, "Call Script / Talking Points" for calls, "Mail Content" for direct mail, "Event Description" for events

### Fixed
- **Contact timeline error handling** — Timeline tab now shows QueryError with retry button when interactions.list fails; previously showed eternal loading spinner

## [1.9.0] - 2026-04-13

### Fixed
- **AI segment engagement — real data** — Replaced `Math.random()` placeholder in AI Insights segment analysis with a real weighted engagement score computed from email coverage (25%), phone coverage (15%), tier scoring (25%), sync status (20%), and enrichment status (15%) per segment
- **AI cross-channel patterns — data-driven scoring** — Cross-channel pattern confidence and conversion lift are now computed from actual campaign counts and interaction volume per channel, not hardcoded constants. Sample sizes reflect real data
- **AI channel synergies — data-driven scoring** — Synergy scores computed from actual channel activity: base score 40/60/75 based on whether zero/one/both channels are active, plus volume bonus (up to +20) from interactions and campaigns
- **Enrichment enrichedCount** — Was hardcoded to `0`; now queries actual contacts with `enrichedAt IS NOT NULL` via the `contactStats.enriched` field added to the `getContactStats` DB query
- **Contacts search 320px mobile** — `min-w-[200px]` on search input was forcing horizontal scroll on 320px phones; changed to `min-w-0 sm:min-w-[200px]` so it flows naturally on small screens

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
