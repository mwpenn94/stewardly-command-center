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
- [ ] Open rates, click rates, conversions, cost per lead (requires live campaign data)

## Phase 9: Data Backup & Export
- [x] One-click backup creation (contacts, campaigns, full)
- [x] One-click export to CSV
- [x] One-click export to JSON
- [x] Restore-from-backup UI
- [x] Backup history with download

## Phase 10: Role-Based Access Control
- [x] Owner role auto-assigned on login (admin role)
- [x] Role-based route protection (protectedProcedure)
- [ ] Seed owner from GHL credentials (Company ID, User ID, API Key) — deferred, credentials needed

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
