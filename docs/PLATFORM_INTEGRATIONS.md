# Platform Integration Status — Stewardly Command Center

Last updated: 2026-04-14 (v2.5.0)

## Integration Matrix

| Platform | Auth Method | Read | Write | Sync | Backup | Last verified |
|---|---|---|---|---|---|---|
| GoHighLevel | **Private Integration Token (recommended)**, JWT session token, or legacy API Key | contacts, campaigns | contacts (full CRUD + push), SMS, email | bidirectional (push dirty + pull changes) | local DB export | v2.5.0 |
| Dripify | API Key / Session Cookie | campaigns (list) | contacts (push to Dripify) | pull campaigns + push contacts | local DB export | v2.5.0 |
| LinkedIn | Access Token / Session Cookie | profile (via Dripify) | connection requests (via Dripify) | via Dripify bridge | absent | v2.5.0 |
| SMS-iT | API Key | credit balance, contacts | contacts (push to SMS-iT), SMS send | pull credits + push contacts | local DB export | v2.5.0 |

---

## GHL Authentication: Private Integration Token vs API Key vs JWT

GoHighLevel offers three authentication methods. Understanding the differences is critical for choosing the right approach for Stewardly.

### Comparison Table

| Feature | Private Integration Token (PIT) | Legacy API Key (v1) | JWT Session Token |
|---|---|---|---|
| **API Version** | v2 (current, maintained) | v1 (deprecated, end-of-life) | v2 (current) |
| **Security** | Scope-restricted — you choose exactly which permissions the token gets | Unrestricted — full access to all account data | Full permissions of the logged-in user |
| **Expiry** | Never expires (rotate manually every 90 days recommended) | Never expires | Expires in ~1 hour; requires browser automation to refresh |
| **Setup Complexity** | Generate from GHL Settings UI in 4 steps | Copy from Settings > Business Profile | Extract from browser localStorage via CDP |
| **Best For** | **Production integrations** (single-account) | Legacy systems only (not recommended) | Development/debugging only |
| **Minimum Permission** | Agency admin with "Private Integrations" permission enabled | Any sub-account admin | Any logged-in user |

### Recommendation for Stewardly Users

The **Private Integration Token (PIT)** is the recommended authentication method for Stewardly Command Center. It is functionally a JWT (Bearer format), uses the current v2 API, never expires, and allows granular scope control. The legacy API Key (v1) is deprecated and should not be used for new integrations. The browser-extracted JWT session token is useful only as a development workaround since it expires hourly.

### Required GHL Scopes for Stewardly

When creating a Private Integration Token, select these scopes to enable all Stewardly features:

| Scope | Purpose | Required For |
|---|---|---|
| `contacts.readonly` | Read contacts, search by email/phone | Contact sync (pull), search, enrichment |
| `contacts.write` | Create, update, delete contacts | Contact CRUD, bulk import, push sync |
| `conversations.readonly` | Read conversation threads | Message history display |
| `conversations.write` | Create conversation threads | Campaign conversation tracking |
| `conversations/message.readonly` | Read messages | Email/SMS history |
| `conversations/message.write` | Send messages (email, SMS) | Campaign sends, email outreach |
| `locations.readonly` | Read location/sub-account info | Connection verification, location ID validation |
| `locations/customFields.readonly` | Read custom field definitions | Custom field mapping during import |
| `locations/customFields.write` | Create/update custom fields | Custom field sync |
| `locations/tags.readonly` | Read tags | Tag sync from GHL |
| `locations/tags.write` | Create tags | Tag push to GHL |
| `users.readonly` | Read user profiles | Owner verification, user lookup |

### How to Create a Private Integration Token

The setup process takes approximately 2 minutes and requires agency admin access with Private Integrations permission enabled.

1. Navigate to **Settings > Private Integrations** in your GHL account (if not visible, enable it under Settings > Labs first).
2. Click **"Create new Integration"**.
3. Name it **"Stewardly Command Center"** and add a description.
4. Select the scopes listed in the table above (contacts, conversations, conversations/message, locations, locations/customFields, locations/tags, users — both readonly and write for each).
5. Click **Save** and **copy the generated token immediately** (it cannot be retrieved later).
6. Paste the token into Stewardly's **Integrations > GoHighLevel > API Key** field. Stewardly accepts PITs in the same field since they use identical Bearer authorization.

> **Important:** The token is shown only once. Store it securely. If lost, rotate the token from the same settings page to generate a new one.

### Minimum Permissions Required

The minimum GHL account permission needed to create a Private Integration Token is **Agency Admin** with the "Private Integrations" role permission enabled. This permission is found at Settings > Team > Edit admin > Roles & Permissions. By default, all agency admins have this permission, but it can be restricted on a per-user basis.

For the legacy API Key (v1), any sub-account admin can find it under Settings > Business Profile, but this method is deprecated and provides unrestricted access to all account data without scope control.

### Failover: Browser JWT (Development Only)

Stewardly also supports pasting a JWT session token extracted from the browser's localStorage. This is the token used by the GHL web application itself. While it provides full v2 API access, it expires approximately every hour and requires manual refresh or browser automation (CDP) to maintain. This method is suitable only for development, testing, and initial data migration — not for production use.

---

## GHL Integration Detail

GoHighLevel is the most mature integration with full bidirectional CRUD:

- **Auth:** Private Integration Token (recommended), JWT session token, or legacy API key stored in credentials table; JWT decode for locationId/companyId extraction; token expiry monitoring; Reset button clears error status without losing configuration
- **Read:** Full contact list with pagination (100/page), single contact fetch, search by email/phone, custom field definitions pull
- **Write:** Create contact, update contact (all 35 standard fields + 58 custom fields + tags), delete contact — all via `buildPushPayloadFromLocal` helper
- **Sync:** Bidirectional — push dirty contacts (syncStatus=pending) to GHL, pull GHL changes to local DB with full field mapping via `mapGhlContactToLocal`; sync scheduler with configurable interval (30s to 1hr) and per-platform direction toggles
- **Bulk Import:** CSV upload with column mapping, parallel workers, checkpoint resume; GHL API push after local DB insert; paginated import history (10/page)
- **GHL Import:** Dedicated pull-from-GHL page with JWT auth, batch import with progress tracking, field mapping from GHL schema to local 47-column contacts table
- **Campaign:** Send email via GHL API, send SMS via GHL API, social media queue via GHL Social
- **Export:** Server-side CSV export of all contacts with search/segment/tier filter support

## Dripify Integration Detail

Dripify integration supports campaign reading and contact push:

- **Auth:** API key or Firebase session cookie; Quick Setup Guide (4-step wizard with per-field hints)
- **Read:** List campaigns from Dripify API with status and metrics
- **Write:** Push contacts to Dripify campaigns via `pushContactToDripify` — maps local contact fields to Dripify prospect format (firstName, lastName, email, company, linkedinUrl)
- **Sync:** Pull campaign list on connect; push contacts to campaigns for LinkedIn outreach
- **LinkedIn Bridge:** Dripify acts as the LinkedIn automation layer — connection requests, profile views, and message sequences are executed through Dripify campaigns targeting LinkedIn profiles

## LinkedIn Integration Detail

- **Auth:** Access token or session cookie stored in credentials
- **Read:** Profile data accessible via Dripify bridge when Dripify is connected
- **Write:** Connection requests and messages sent via Dripify campaign sequences
- **Sync:** Indirect via Dripify — LinkedIn activity tracked through Dripify campaign metrics
- **Direct API:** LinkedIn's API restrictions make direct integration impractical for automation; Dripify serves as the sanctioned bridge layer

## SMS-iT Integration Detail

SMS-iT integration supports credit checking and contact push:

- **Auth:** API key stored in credentials; Quick Setup Guide (5-step wizard with per-field hints)
- **Read:** Credit balance check, contact list pull
- **Write:** Push contacts to SMS-iT via `pushContactToSmsIt` — maps local contact fields to SMS-iT format (firstName, lastName, email, phone, company, tags); send SMS via campaign engine
- **Sync:** Pull credit balance on connect; push contacts for SMS outreach
- **Campaign:** SMS send via SMS-iT API with delivery tracking through campaign engine

## Cross-Platform Features

All platforms share these capabilities through the orchestrator layer:

- **Credential Management:** Per-platform credential storage with show/hide toggle, connection testing, and error status tracking
- **Sync Engine:** Unified sync scheduler with per-platform direction toggles (push/pull), configurable intervals, and force sync controls
- **Campaign Routing:** Campaign engine routes messages to the appropriate platform based on channel selection (email/SMS via GHL or SMS-iT, LinkedIn via Dripify, social via GHL)
- **Contact Sync Status:** Per-contact sync status tracking (synced/pending/error) with batch push for dirty contacts
- **Dead Letter Queue:** Failed sync operations captured in DLQ with retry functionality
- **Webhook Processing:** Inbound webhook handler for real-time event processing from all platforms
