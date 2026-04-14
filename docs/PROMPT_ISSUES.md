# Prompt Issues — Stewardly Command Center

## Pass 1 · found-by:readme-scope-mismatch
**Where:** Continuous Build Loop prompt, section "PASS 1 KNOWN ISSUE — FIX FIRST"
**What:** Prompt states the README body describes a "property management template" (Properties / Tenants / Maintenance) that does not match the actual product scope. However, the README was already rewritten in prior passes (Pass 9+) and now accurately describes the marketing command center scope (GHL / Dripify / LinkedIn / SMS-iT, 13 channels, campaigns, contacts, sync, backups, AI insights). No property management boilerplate remains.
**Interpretation taken:** The prompt's known issue is stale — it references a README state that no longer exists. The README body already matches the repo "About" description and actual `src/` contents. No rewrite needed. Logged this as resolved.
**Alternative interpretations:** (1) Rewrite the README anyway to add the 5 parity scope descriptions from the prompt. (2) Treat the prompt as authoritative and assume the README must be wrong.
**Suggested patch:** Remove or update the "PASS 1 KNOWN ISSUE" section in the prompt to reflect that the README has already been reconciled.
**Impact on this pass:** No README rewrite needed. Pass 1 proceeds with doc scaffolding and baseline capture.

## Pass 1 · found-by:stack-mismatch
**Where:** Continuous Build Loop prompt, line 5 — "Stack: React 19 + TypeScript, Vite 8, Tailwind 4, React Router 7, Zustand, TanStack Query, Lucide React, custom SVG charts (no external chart deps)."
**What:** Several stack claims do not match the actual codebase: (1) Vite is v7.1.7, not v8. (2) Routing uses Wouter, not React Router 7. (3) Zustand is not installed — state management is tRPC + React Query. (4) Recharts is installed as a dependency (not "no external chart deps"). (5) TanStack Query is correct (used via tRPC).
**Interpretation taken:** Treat the actual `package.json` as ground truth. The prompt's stack description is outdated. Proceeding with the real stack.
**Alternative interpretations:** (1) Migrate to match the prompt's stack (React Router 7, Zustand, remove Recharts). (2) Ask user for clarification.
**Suggested patch:** Update prompt stack line to: "React 19 + TypeScript, Vite 7, Tailwind 4, Wouter, TanStack Query (via tRPC), Recharts, Lucide React."
**Impact on this pass:** No migration performed. Documentation will reflect actual stack.

## Pass 1 · found-by:convergence-criteria-scope
**Where:** Continuous Build Loop prompt, Convergence Criteria items 1-9
**What:** Several convergence criteria reference tooling not available in the Manus sandbox environment: (1) axe-core accessibility scanning requires browser automation with axe injection. (2) Network throttling (slow 3G) requires Chrome DevTools Protocol. (3) Canonical-route 390x844 screenshot diff requires pixel-level comparison tooling. (4) Commit SHA references assume direct git commit workflow, but Manus uses `webdev_save_checkpoint` which manages git internally.
**Interpretation taken:** Adapt convergence criteria to available tooling: use manual accessibility review instead of axe-core, use responsive viewport screenshots via browser tool, use checkpoint versions instead of commit SHAs, skip network throttling metrics.
**Alternative interpretations:** (1) Install axe-core and Playwright for full automation. (2) Block on missing tooling.
**Suggested patch:** Add a "Manus adaptation" note to convergence criteria acknowledging sandbox constraints.
**Impact on this pass:** Metrics that require unavailable tooling will be marked "n/a (sandbox constraint)" in LOOP_DASHBOARD.md.
