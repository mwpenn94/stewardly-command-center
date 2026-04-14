# CRUD Parity Matrix — Stewardly Command Center (scope #1)

Last updated: Pass 1

## A. Contact CRUD

| Capability | Tier | CC (G/D/L/S) | Workato | Zapier | Make | Census | GHL native | Dripify native |
|---|---|---|---|---|---|---|---|---|
| List contacts (paginated) | M | match/absent/absent/absent | match | partial | match | superior | superior | match |
| View contact detail | M | match/absent/absent/absent | match | partial | match | match | superior | match |
| Create contact | M | match/absent/absent/absent | match | match | match | partial | superior | match |
| Edit contact fields | M | match/absent/absent/absent | match | partial | match | partial | superior | match |
| Delete contact (soft+hard) | M | partial/absent/absent/absent | partial | partial | partial | partial | superior | match |
| Tag / custom-field management | M | match/absent/absent/absent | match | partial | match | match | superior | match |
| Bulk-edit selected contacts | M | absent/absent/absent/absent | partial | absent | partial | partial | match | partial |

## B. Campaign / sequence CRUD

| Capability | Tier | CC | Workato | Make | GHL native | Dripify native |
|---|---|---|---|---|---|---|
| List campaigns/sequences | M | match | partial | partial | superior | superior |
| View campaign detail + stats | M | match | partial | partial | superior | superior |
| Create campaign | M | match | absent | absent | superior | superior |
| Pause/resume campaign | M | match | partial | partial | superior | superior |
| Clone campaign | M | absent | absent | absent | match | match |

## C. Message / interaction CRUD

| Capability | Tier | CC | Workato | Make | GHL native | SMS-iT native |
|---|---|---|---|---|---|---|
| View sent-message history | M | match | partial | partial | superior | superior |
| Send one-off message | M | partial | partial | partial | superior | superior |
| Reply from unified inbox | M | absent | absent | absent | partial | partial |

## D. Cross-platform unified view

| Capability | Tier | CC | Workato | Zapier | Make |
|---|---|---|---|---|---|
| Single search across all 4 platforms | M | partial | partial | absent | partial |
| Merged contact view (same person across platforms) | M | partial | partial | absent | partial |
| Cross-platform tag/label | M | absent | partial | absent | partial |

## E. Mobile, a11y, perf

| Capability | Tier | CC | Workato | Zapier |
|---|---|---|---|---|
| Mobile CRUD parity | M | match | partial | match |
| 44x44 touch targets (per README claim) | M | match | match | match |
| WCAG 2.2 AA on CRUD surfaces | M | partial | partial | partial |
| Dark mode parity | M | match | partial | partial |

## F. Stewardly-differentiating

| Capability | Tier | CC | Notes |
|---|---|---|---|
| One-surface CRUD across GHL + Dripify + LinkedIn + SMS-iT | M | partial | GHL CRUD works; Dripify/LinkedIn/SMS-iT read-only or absent |
| Cross-platform duplicate detection on create | M | absent | not yet implemented |
| Zero-external-chart-dep UI (per README) as perf/simplicity differentiator | M | absent | Recharts is installed; prompt claim is stale |

## Summary

- **Must-have rows:** 24
- **Rows at match or superior:** 10
- **Match rate:** 42%
- **Platform 4-of-4 rows:** 0 (GHL has CRUD; other 3 platforms lack full CRUD)
