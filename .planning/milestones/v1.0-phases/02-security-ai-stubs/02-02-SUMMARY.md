---
phase: 02-security-ai-stubs
plan: 02
subsystem: ai
tags: [hono-middleware, settings-service, cost-queries, pricing, provider-registry, dependency-injection]

# Dependency graph
requires:
  - phase: 02-security-ai-stubs
    plan: 01
    provides: createSettingsService, createBoundGetSecret, checkPermission, createAuthErrorHandler
provides:
  - Fully wired AI system init (no stub callbacks)
  - Permission-based checkModuleAccess (replaces always-true)
  - Model resolution from provider registry with proxy fallback
  - Settings-based pricing with DEFAULT_PRICING fallback
  - Cached cost queries (5min daily, 1min module TTL)
  - Real framework crypt functions in settings route deps
affects: [ai-system, mission-control, phase-3-agent-sessions]

# Tech tracking
tech-stack:
  added: []
  patterns: [lazy-initialization, in-memory-TTL-cache, proxy-fallback-pattern]

key-files:
  created: []
  modified:
    - template/backend/src/index.ts
    - template/backend/src/ai/init.ts

key-decisions:
  - "Lazy cost queries: getDb() called on first query, not at import time"
  - "Proxy fallback for model when no provider configured (clear error on use)"
  - "Pricing loaded once at initAI() startup, cached implicitly until restart"
  - "Cost query caching: 5min for daily total, 1min for per-module (different freshness needs)"

patterns-established:
  - "Lazy init pattern: let _x = null; function getX() { if (!_x) _x = create(); return _x; }"
  - "Proxy error pattern: Proxy({} as T, { get }) for deferred-error objects"
  - "Settings merge: { ...DEFAULTS, ...customFromDB } for extensible config"

requirements-completed: [AI-02, AI-03, AI-04, AI-06, AI-07]

# Metrics
duration: 5min
completed: 2026-04-03
---

# Phase 02 Plan 02: AI Stub Wiring & Security Middleware Summary

**Alle 7 AI-Stubs in index.ts durch echte Implementierungen ersetzt, Permission-Middleware aktiviert, Pricing aus Settings ladbar**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-03T01:06:22Z
- **Completed:** 2026-04-03T01:11:51Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- 5 initAI stub callbacks replaced with real settings/secrets/cost services
- checkModuleAccess wired to framework hasPermission (was always-true)
- Model resolved from provider registry with proxy fallback for missing providers
- Permission-Middleware replaces deactivated Framework HACK (checkUserPermission)
- Auth error handler wraps authAndSetUsersInfo (401 vs 503 differentiation)
- Settings route deps use real framework crypt functions
- Pricing loaded from DB settings with DEFAULT_PRICING fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: AI-Stubs in index.ts durch echte Implementierungen ersetzen + Security-Middleware verdrahten** - `88aa355` (feat)
2. **Task 2: Pricing aus Settings laden mit Fallback in init.ts** - `c5301ce` (feat)

**Submodule update:** `816cd42` (chore: update template submodule)

## Files Created/Modified
- `template/backend/src/index.ts` - Replaced all AI stubs, security middleware, settings deps with real implementations
- `template/backend/src/ai/init.ts` - PricingTable type, DEFAULT_PRICING export, settings-based pricing loading

## Decisions Made
- Lazy cost queries pattern (getDb() erst beim ersten Aufruf, nicht bei Import)
- Proxy-Objekt als Model-Fallback statt null/throw (klarer Fehler erst bei Nutzung)
- Pricing einmal bei initAI() geladen — impliziter Cache bis Restart
- Unterschiedliche TTLs fuer Cost Queries: 5min daily total, 1min per-module

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Template submodule in worktree did not contain Plan 01 commits (different git object store). Resolved by fetching commits via git bundle from the Plan 01 worktree.

## User Setup Required
None - no external service configuration required.

## Known Stubs
The following Phase 3 stubs remain in `template/backend/src/index.ts` (intentional, out of scope for Phase 2):
- Line 155: `logAgentStepToDB` - TODO: Insert in mc_agent_sessions Tabelle
- Line 158: `storeApprovalRequest` - TODO: Insert in approval_requests Tabelle
- Line 161: `updateApprovalRequest` - TODO: Update in approval_requests Tabelle
- Line 164: `notifyUser` - TODO: WebSocket + Push Notification

These are Phase 3 (AI Agent System) scope and do not prevent Phase 2 goals from being achieved.

## Next Phase Readiness
- All Phase 2 security and AI stub work complete
- AI system fully wired with real services (secrets, settings, costs, permissions)
- Phase 3 can implement agent session logging and approval persistence
- Pricing system extensible via DB settings

## Self-Check: PASSED

- Both modified files exist (index.ts, init.ts)
- All 3 commits found (88aa355, c5301ce, 816cd42)
- 4 remaining TODOs are Phase 3 scope only

---
*Phase: 02-security-ai-stubs*
*Completed: 2026-04-03*
