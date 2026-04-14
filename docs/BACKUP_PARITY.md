# Backup Parity Matrix — Stewardly Command Center (scope #4)

Last updated: Pass 1

## A. Backup creation

| Capability | Tier | CC | Rewind | OwnBackup | Spanning |
|---|---|---|---|---|---|
| One-click full backup | M | match | superior | superior | superior |
| Contacts-only backup | M | match | match | match | match |
| Campaigns-only backup | M | match | match | match | match |
| Scheduled automatic backups | M | absent | superior | superior | superior |
| Incremental backups | N | absent | superior | superior | match |

## B. Export formats

| Capability | Tier | CC | Rewind | OwnBackup | Spanning |
|---|---|---|---|---|---|
| CSV export | M | match | match | match | match |
| JSON export | M | match | match | match | partial |
| Excel export | N | absent | match | match | match |
| Platform-native format export | N | absent | match | match | partial |

## C. Restore

| Capability | Tier | CC | Rewind | OwnBackup | Spanning |
|---|---|---|---|---|---|
| Full restore from backup | M | partial | superior | superior | superior |
| Selective restore (specific records) | M | absent | match | match | match |
| Point-in-time restore | M | absent | superior | superior | match |
| Restore preview (dry run) | M | absent | match | match | partial |

## D. Cross-platform backup

| Capability | Tier | CC | Rewind | OwnBackup |
|---|---|---|---|---|
| Backup GHL data | M | partial | n/a | n/a |
| Backup SMS-iT data | M | absent | n/a | n/a |
| Backup Dripify data | M | absent | n/a | n/a |
| Backup LinkedIn data | M | absent | n/a | n/a |
| Platform data mirror status | M | match | n/a | n/a |

## E. Mobile, a11y

| Capability | Tier | CC | Rewind | OwnBackup |
|---|---|---|---|---|
| Mobile backup management | M | match | partial | partial |
| WCAG 2.2 AA | M | partial | partial | partial |

## F. Stewardly-differentiating

| Capability | Tier | CC | Notes |
|---|---|---|---|
| Unified backup across all 4 platforms | M | absent | Only local DB backup; no platform data backup |
| Disaster recovery with platform re-push | M | absent | Restore to local only; no push-back to platforms |

## Summary

- **Must-have rows:** 21
- **Rows at match or superior:** 7
- **Match rate:** 33%
- **Platform 4-of-4 rows:** 0 (local backup only; no cross-platform backup)
