# Platform Integration Status — Stewardly Command Center

Last updated: Pass 1

## Integration Matrix

| Platform | Auth | Read | Write | Sync | Backup | Last verified |
|---|---|---|---|---|---|---|
| GoHighLevel | JWT/API Key | contacts, campaigns | contacts (full CRUD + push) | bidirectional (push dirty + pull changes) | local DB only | Pass 1 |
| Dripify | API Key / Session Cookie | campaigns (list) | absent | pull-only (webhook events) | absent | Pass 1 |
| LinkedIn | Access Token / Session Cookie | absent | absent | absent | absent | Pass 1 |
| SMS-iT | API Key | credit balance | absent | pull-only (via import) | absent | Pass 1 |

## GHL Integration Detail

GoHighLevel is the most mature integration:

- **Auth:** JWT token or API key stored in credentials table; JWT decode for locationId/companyId extraction; token expiry monitoring
- **Read:** Full contact list with pagination (100/page), single contact fetch, search by email/phone
- **Write:** Create contact, update contact (all standard fields + custom fields + tags), delete contact
- **Sync:** Bidirectional — push dirty contacts (syncStatus=dirty) to GHL, pull GHL changes to local DB with full field mapping via `mapGhlContactToLocal`; sync scheduler with configurable interval and direction
- **Bulk Import:** CSV upload with column mapping, parallel workers, checkpoint resume; GHL API push after local DB insert
- **Campaign:** Send email via GHL API, send SMS via GHL API

## Dripify Integration Detail

- **Auth:** API key or Firebase session cookie
- **Read:** List campaigns from Dripify API
- **Write:** Not implemented
- **Sync:** Webhook event processing only (no scheduled pull)
- **Gaps:** No contact CRUD, no campaign execution, no bidirectional sync

## LinkedIn Integration Detail

- **Auth:** Access token or session cookie stored in credentials
- **Read:** Not implemented (no API calls)
- **Write:** Not implemented
- **Sync:** Not implemented
- **Gaps:** Full integration absent; only credential storage exists

## SMS-iT Integration Detail

- **Auth:** API key stored in credentials
- **Read:** Credit balance check only
- **Write:** Send SMS (via campaign engine, partial)
- **Sync:** Pull-only via bulk import
- **Gaps:** No contact CRUD, no bidirectional sync, limited campaign execution
