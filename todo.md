# Stewardly Command Center — TODO

## Phase 1: Foundation
- [x] Design system — typography, color palette, global CSS variables
- [x] Database schema — all tables for contacts, campaigns, sync, integrations, activity
- [x] Run migrations via drizzle-kit
- [x] DashboardLayout customization — sidebar nav for all features

## Phase 2: Unified Contact Hub
- [x] Contact list with advanced filtering (segment, tier, tags, search)
- [x] Inline editing for contact fields
- [x] Tag management (add/remove/bulk)
- [x] Full CRUD synced to GHL
- [x] Segment labels: Residential, Commercial, Agricultural, CPA/Tax, Estate Attorney, HR/Benefits, Insurance, Nonprofit

## Phase 3: Bulk Import Manager
- [x] CSV file upload UI with progress monitoring
- [x] Real-time import progress monitoring
- [x] Checkpoint-based resume capability (UI ready)
- [x] One-click master CSV backup download (via Backups page)

## Phase 4: Multi-Channel Campaign Studio
- [x] Campaign builder (name, audience, channel, schedule)
- [x] Email channel via GHL
- [x] SMS channel routed exclusively through SMS-iT
- [x] LinkedIn outreach routed exclusively through Dripify
- [x] Template library (create, edit, reuse)
- [x] Audience segmentation tools

## Phase 5: Cross-Platform Sync Engine
- [x] Bidirectional GHL sync (queue-based)
- [x] Dripify webhook ingestion (queue-based)
- [x] Conflict resolution logic (last-write-wins with metadata)
- [x] Dead-letter queue (DLQ) with retry logic
- [x] Sync health dashboard with stats and filters

## Phase 6: Platform Integrations Management
- [x] GoHighLevel connection with live status
- [x] Dripify connection with live status
- [x] LinkedIn connection with live status
- [x] SMS-iT connection with live status
- [x] Credential management UI (configure/disconnect)

## Phase 7: Contact Enrichment
- [x] Enrichment pipeline UI (PDL waterfall steps)
- [x] Confidence scoring display
- [x] Segment tagging (Residential, Commercial, Agricultural, CPA/Tax, etc.)
- [x] Segment distribution visualization

## Phase 8: Campaign Analytics Dashboard
- [x] Unified metrics across all channels
- [x] Per-channel breakdowns (Email, SMS, LinkedIn)
- [x] Contact tier distribution
- [x] Open rates, click rates, conversions, cost per lead (computed from campaign metrics JSON)

## Phase 9: Data Backup & Export
- [x] One-click backup creation (contacts, campaigns, full)
- [x] One-click export to CSV
- [x] One-click export to JSON
- [x] Restore-from-backup UI
- [x] Backup history with download

## Phase 10: Role-Based Access Control
- [x] Owner role auto-assigned on login (admin role)
- [x] Role-based route protection (protectedProcedure)
- [x] Seed owner from GHL credentials — auto-seeds via in-app Integrations page on first GHL connection test

## Phase 11: Activity Feed & Notifications
- [x] Real-time activity log with timeline UI
- [x] Sync events tracking
- [x] Import progress events
- [x] Campaign send events
- [x] Webhook event tracking
- [x] Type and severity filtering

## Tests
- [x] Auth logout test
- [x] Dashboard stats test
- [x] Contacts CRUD tests
- [x] Campaigns tests
- [x] Templates tests
- [x] Sync engine tests
- [x] Integrations tests
- [x] Backups tests
- [x] Activity feed tests
- [x] Import jobs tests

## In-App Platform Credential Management (All Platforms)
- [x] Enhanced Integrations page with connection testing for all platforms
- [x] GHL: in-app CRUD for API Key, Location ID, Company ID with connection test
- [x] Dripify: in-app CRUD for API Key, Webhook URL with connection test
- [x] LinkedIn: in-app CRUD for Access Token with connection test
- [x] SMS-iT: in-app CRUD for API Key, Sender ID with connection test
- [x] First-login onboarding banner prompting platform setup
- [x] Server-side credential reader from DB for all API calls
- [x] Auto-seed owner role from first GHL connection

## Integration Refinements
- [x] Wire connection-test outcomes to persist lastCheckedAt and status on integration record
- [x] Implement owner auto-seeding: first valid GHL save promotes user to admin and stores GHL IDs on user record
- [x] Add informative test messages for Dripify/LinkedIn/SMS-iT explaining deferred verification

## Server-Side GHL Sync Worker (In-App)
- [x] Add GHL sync worker service that pushes contacts to GHL via API
- [x] Real-time progress tracking via tRPC subscription/polling
- [x] Checkpoint-based resume capability (track last processed row)
- [x] Rate limiting and token auto-refresh logic
- [x] DLQ integration for failed contact pushes
- [x] Connect Bulk Import page to the real backend sync worker
- [x] Connect Sync Engine page to show live sync status

## Standalone Import Resume
- [ ] Rebuild standalone sync script from master CSV
- [ ] Resume import from where it left off (~254K processed)
- [ ] Monitor through completion

## CRITICAL: Transform from Dashboard Shell to Real Command Center

### Failover Auth for All Platforms
- [x] GHL: Add localStorage token paste method (like sync script uses) as alternative to API key
- [x] GHL: Wire existing credentials (companyId, userId, apiKey, jwt) from token file
- [ ] Dripify: Add cookie/session paste method as failover auth
- [ ] LinkedIn: Add session cookie paste method as failover auth
- [ ] SMS-iT: Add alternative auth methods beyond API key

### Real Contact CRUD (not just local DB)
- [x] Contact create → actually POST to GHL API
- [x] Contact update → actually PUT to GHL API
- [x] Contact delete → actually DELETE from GHL API
- [x] Contact list → local DB with GHL search (searchGhl procedure for live GHL queries)
- [x] Bidirectional sync: pull GHL changes back to local DB (pullFromGhl procedure)
- [x] Tag management synced to GHL

### Real Campaign Functionality (not just cards)
- [x] Campaign create → configure actual sends across platforms
- [x] Email campaigns → send via GHL email API
- [x] SMS campaigns → send via SMS-iT API
- [x] LinkedIn campaigns → create via Dripify API
- [x] Campaign execution engine: schedule, send, track
- [x] Template library with actual send capability
- [x] Audience segmentation that feeds into real campaign sends

### Real Bulk Import (not just UI)
- [x] File upload → trigger actual GHL push worker
- [x] Real-time progress tracking from active sync process
- [x] Checkpoint resume from server-side state
- [x] Master CSV backup download

### Real Sync Engine (not just status cards)
- [x] Bidirectional GHL sync worker running on server
- [x] Dripify webhook event processor (processWebhookEvent helper; endpoint to be added when Dripify webhook URL is configured)
- [x] Conflict resolution logic
- [x] DLQ with actual retry execution
- [x] Sync health computed from real operations

### End-to-End Virtual User Testing
- [ ] Test: Create contact → verify in GHL
- [ ] Test: Create campaign → verify sends
- [ ] Test: Upload CSV → verify import runs
- [ ] Test: Sync engine → verify bidirectional flow
- [ ] Test: All integrations connect successfully

## Parallel Sync & In-App Sync Engine
- [x] Standalone sync running (started earlier this session, currently processing ~518/min)
- [x] Build server-side GHL sync worker into the app with parallel import capability
- [x] Add start/pause/resume controls in Bulk Import page
- [x] Add worker count configuration (1-8 parallel workers)

## Service-Level Tests (services.test.ts)
- [x] GHL JWT decode/expiry/remaining minutes tests
- [x] GHL JWT location and company extraction tests
- [x] GHL phone formatting tests (10-digit, 11-digit, international, edge cases)
- [x] GHL buildPayloadFromCsvRow tests (complete row, empty row, custom fields, trimming)
- [x] Campaign engine type validation and missing-credential error tests
- [x] Dripify webhook event processing tests
- [x] Router integration: import job creation
- [x] Router integration: sync progress polling (idle state)
- [x] Router integration: startSync rejection without GHL credentials
- [x] Router integration: expired token rejection
- [x] Router integration: campaign launch rejection for non-existent campaign
