# Campaign Orchestration Parity Matrix — Stewardly Command Center (scope #5)

Last updated: Pass 1

## A. Multi-channel sequence builder

| Capability | Tier | CC | HubSpot | Customer.io | Iterable | Make |
|---|---|---|---|---|---|---|
| Visual sequence builder (drag/drop steps) | M | partial | superior | superior | superior | match |
| Multi-channel steps (email + SMS + LinkedIn in one sequence) | M | match | partial | match | match | match |
| Configurable delays between steps | M | match | match | match | match | match |
| Conditional branching (if opened → path A, else → path B) | M | absent | superior | superior | superior | match |
| A/B testing within sequence | N | absent | match | match | match | absent |

## B. Execution engine

| Capability | Tier | CC | HubSpot | Customer.io | Iterable |
|---|---|---|---|---|---|
| Send email via GHL | M | match | n/a | n/a | n/a |
| Send SMS via SMS-iT | M | partial | n/a | n/a | n/a |
| Send LinkedIn message via Dripify | M | partial | n/a | n/a | n/a |
| Execute across all 13 channels | M | partial | partial | partial | match |
| Rate limiting per channel | M | absent | match | match | match |
| Retry failed sends | M | absent | match | match | match |

## C. Testing & monitoring

| Capability | Tier | CC | HubSpot | Customer.io | Make |
|---|---|---|---|---|---|
| Test sequence with a specific contact | M | absent | match | superior | match |
| Dry-run (no sends) | M | absent | partial | match | match |
| Live sequence monitor (who is at which step) | M | absent | match | superior | partial |
| Pause/resume running sequence | M | match | match | match | match |

## D. Analytics

| Capability | Tier | CC | HubSpot | Customer.io | Iterable |
|---|---|---|---|---|---|
| Per-step conversion | M | absent | superior | superior | superior |
| Cross-channel attribution | M | absent | match | match | match |
| Export analytics | N | absent | match | match | match |

## E. Mobile, a11y

| Capability | Tier | CC | HubSpot | Customer.io |
|---|---|---|---|---|
| Mobile sequence monitor | M | partial | partial | match |
| Mobile pause/resume | M | partial | partial | match |
| WCAG 2.2 AA | M | partial | partial | partial |

## F. Stewardly-differentiating

| Capability | Tier | CC | Notes |
|---|---|---|---|
| Native LinkedIn in sequence (not just trigger a Zap) | M | partial | Dripify integration exists but execution is partial |
| SMS + LinkedIn + Email + GHL-workflow in one sequence | M | partial | Flow Builder supports all channels; execution partial for non-email |
| Non-technical user can build multi-channel sequence | M | match | Flow Builder UI with step reordering and channel selection |

## Summary

- **Must-have rows:** 25
- **Rows at match or superior:** 7
- **Match rate:** 28%
- **Platform 4-of-4 rows:** 0 (email via GHL works; other channels partial)
