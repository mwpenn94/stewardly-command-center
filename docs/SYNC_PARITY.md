# Sync Parity Matrix — Stewardly Command Center (scope #2)

Last updated: Pass 1

## A. Direction & coverage

| Capability | Tier | CC | Census | Hightouch | Polytomic | Workato |
|---|---|---|---|---|---|---|
| Platform to CC read-sync (4 platforms) | M | partial | n/a | n/a | n/a | partial |
| CC to Platform write-sync (4 platforms) | M | partial | superior | superior | superior | match |
| True bidirectional (conflicts handled) | M | partial | partial | partial | match | partial |
| Per-field sync control | M | absent | superior | superior | superior | match |
| Custom fields synced | M | match | match | match | match | partial |

## B. Conflict resolution

| Capability | Tier | CC | Census | Hightouch | Polytomic |
|---|---|---|---|---|---|
| Last-write-wins default | M | match | match | match | match |
| Manual conflict queue | M | absent | partial | partial | match |
| Per-field merge rules | M | absent | match | match | match |
| Conflict preview before resolution | M | absent | partial | partial | partial |

## C. Observability

| Capability | Tier | CC | Census | Hightouch | Workato |
|---|---|---|---|---|---|
| Last-sync-time per platform | M | match | match | match | match |
| Sync-latency dashboard | M | partial | match | match | match |
| Sync failure alerting | M | partial | match | match | match |
| Change audit log | M | partial | superior | match | match |
| Sync-paused-per-platform control | M | match | match | match | match |

## D. Reliability

| Capability | Tier | CC | Census | Hightouch |
|---|---|---|---|---|
| Retry with exponential backoff | M | absent | superior | superior |
| Rate-limit aware (per platform API) | M | absent | superior | superior |
| Graceful handling of platform API outage | M | partial | match | match |

## E. Mobile, a11y

| Capability | Tier | CC | Census | Hightouch |
|---|---|---|---|---|
| Mobile sync-status view | M | match | partial | partial |
| WCAG 2.2 AA | M | partial | partial | partial |

## F. Stewardly-differentiating

| Capability | Tier | CC | Notes |
|---|---|---|---|
| Bidirectional sync across all 4 platforms | M | partial | GHL bidirectional works; SMS-iT/Dripify pull-only; LinkedIn absent |
| Non-technical user can configure sync (no JSON/YAML) | M | match | Sync settings UI with toggles and dropdowns |

## Summary

- **Must-have rows:** 22
- **Rows at match or superior:** 8
- **Match rate:** 36%
- **Platform 4-of-4 rows:** 0 (GHL bidirectional; others partial or absent)
