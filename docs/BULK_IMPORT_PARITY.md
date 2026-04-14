# Bulk Import Parity Matrix — Stewardly Command Center (scope #3)

Last updated: Pass 1

## A. File ingestion

| Capability | Tier | CC | SF Data Loader | Import2 | Flatfile |
|---|---|---|---|---|---|
| CSV upload + column mapping | M | match | match | superior | superior |
| Excel (.xlsx) upload | N | absent | match | match | superior |
| Drag-and-drop file upload | N | absent | partial | match | superior |
| Preview first N rows before import | M | match | match | match | superior |
| Validate data before commit | M | partial | match | match | superior |

## B. Throughput & reliability

| Capability | Tier | CC | SF Data Loader | Import2 | Flatfile |
|---|---|---|---|---|---|
| 10K+ row import without timeout | M | match | superior | superior | superior |
| 100K+ row import (batched) | M | match | superior | match | superior |
| Checkpoint/resume on failure | M | match | partial | partial | match |
| Parallel worker configuration | M | match | partial | absent | match |
| Progress bar with ETA | M | partial | match | match | match |

## C. Data quality

| Capability | Tier | CC | SF Data Loader | Import2 | Flatfile |
|---|---|---|---|---|---|
| Duplicate detection on import | M | absent | match | match | superior |
| Field-level error reporting | M | absent | match | match | superior |
| Auto-format phone/email | M | match | partial | match | match |
| Custom field mapping | M | match | match | match | superior |

## D. Platform routing

| Capability | Tier | CC | SF Data Loader | Import2 |
|---|---|---|---|---|
| Import to GHL (push after import) | M | match | n/a | n/a |
| Import to SMS-iT | M | absent | n/a | n/a |
| Import to Dripify | M | absent | n/a | n/a |
| Import to LinkedIn | M | absent | n/a | n/a |

## E. Mobile, a11y

| Capability | Tier | CC | SF Data Loader | Flatfile |
|---|---|---|---|---|
| Mobile import flow | M | partial | absent | match |
| WCAG 2.2 AA | M | partial | partial | partial |

## F. Stewardly-differentiating

| Capability | Tier | CC | Notes |
|---|---|---|---|
| Import once, push to all 4 platforms | M | partial | GHL push works; others absent |
| CDN pre-processed data sources | M | match | Quick Import from Google Drive data sources |

## Summary

- **Must-have rows:** 21
- **Rows at match or superior:** 10
- **Match rate:** 48%
- **Platform 4-of-4 rows:** 0 (GHL import+push works; others absent)
