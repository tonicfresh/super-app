---
phase: 02-security-ai-stubs
plan: 01
subsystem: auth
tags: [hono-middleware, permissions, settings, cache, drizzle, dependency-injection]

# Dependency graph
requires:
  - phase: 01-type-safety-alignment
    provides: Type-safe shared types and aligned dependencies
provides:
  - createSettingsService() with getSetting, getSettingJson, invalidate, invalidateAll
  - createBoundGetSecret() tenantId-bound secret accessor
  - checkPermission middleware replacing framework HACK
  - createCheckPermission factory for testable permission checks
  - createAuthErrorHandler differentiating 401 vs 503
affects: [02-02-PLAN, ai-system-init, route-middleware-chain]

# Tech tracking
tech-stack:
  added: []
  patterns: [factory-with-DI, lazy-import-for-testability, in-memory-TTL-cache]

key-files:
  created:
    - template/backend/src/services/settings-service.ts
    - template/backend/src/services/settings-service.test.ts
    - template/backend/src/auth/permission-middleware.ts
    - template/backend/src/auth/permission-middleware.test.ts
    - template/backend/src/auth/auth-error-handler.ts
    - template/backend/src/auth/auth-error-handler.test.ts
  modified: []

key-decisions:
  - "Lazy import for framework hasPermission to avoid DB side-effects in tests"
  - "DI factory pattern (createCheckPermission) over static imports for testability"
  - "Settings-service test uses mock DB query function instead of mock.module to avoid postgres side-effects"

patterns-established:
  - "Factory-with-DI: createCheckPermission(checkFn) enables testing without framework"
  - "Lazy framework imports: checkPermission uses dynamic import() to avoid module-level DB initialization"
  - "TTL cache pattern: Map<key, {value, expiresAt}> with Date.now() comparison"

requirements-completed: [SEC-01, SEC-02, AI-01]

# Metrics
duration: 6min
completed: 2026-04-03
---

# Phase 02 Plan 01: Security & AI Service Stubs Summary

**Settings-Service mit TTL-Cache, Permission-Middleware als HACK-Ersatz, und Auth-Error-Handler mit 401/503-Differenzierung**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-03T00:52:33Z
- **Completed:** 2026-04-03T00:58:03Z
- **Tasks:** 2
- **Files created:** 6

## Accomplishments
- Settings-Service liest aus base_server_settings mit In-Memory-Cache (TTL) und bietet JSON-Parsing
- createBoundGetSecret bindet tenantId an Framework getSecret fuer AI-System Init
- Permission-Middleware ersetzt das deaktivierte Framework-HACK (checkUserPermission)
- Auth-Error-Handler differenziert Token-Fehler (401) von Service-Ausfaellen (503, Hanko down)

## Task Commits

Each task was committed atomically:

1. **Task 1: Settings-Service** - `682f729` (feat) + `8580e13` (chore: submodule update)
2. **Task 2: Permission-Middleware & Auth-Error-Handler** - `40964d2` (feat) + `92f74dc` (chore: submodule update)

_Note: TDD tasks — tests written first (RED), then implementation (GREEN)_

## Files Created/Modified
- `template/backend/src/services/settings-service.ts` - Factory createSettingsService mit Cache, createBoundGetSecret
- `template/backend/src/services/settings-service.test.ts` - 7 Tests (Cache, JSON, invalidate, getSecret binding)
- `template/backend/src/auth/permission-middleware.ts` - checkPermission und createCheckPermission Factory
- `template/backend/src/auth/permission-middleware.test.ts` - 4 Tests (401, 403, success, no stack leak)
- `template/backend/src/auth/auth-error-handler.ts` - createAuthErrorHandler Wrapper-Factory
- `template/backend/src/auth/auth-error-handler.test.ts` - 6 Tests (401, 503, success, no stack leak)

## Decisions Made
- Lazy import fuer Framework hasPermission — vermeidet DB-Side-Effects (postgres URL parsing) bei Tests
- DI-Factory createCheckPermission statt direktem Framework-Import — konsistent mit bestehendem createModuleAuthMiddleware Pattern
- Settings-Service Test nutzt isolierte Mock-DB-Query statt mock.module — robuster gegen Framework-Side-Effects

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Framework-Import Side-Effects in Tests**
- **Found during:** Task 1 and Task 2
- **Issue:** Importing from `@framework` triggers `db-connection.ts` module-level code (postgres client init) which fails without DB env vars
- **Fix:** Settings-Service Test nutzt DI-basierte Mock-Query statt mock.module. Permission-Middleware nutzt lazy `import()` statt top-level import.
- **Files modified:** All test and implementation files
- **Verification:** All 17 tests pass without DB connection
- **Committed in:** 682f729, 40964d2

---

**Total deviations:** 1 auto-fixed (blocking — framework side-effects)
**Impact on plan:** Notwendig fuer Test-Ausfuehrbarkeit ohne DB. Kein Scope Creep.

## Issues Encountered
None beyond the framework side-effect deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Alle drei Service-/Middleware-Dateien erstellt und getestet
- Plan 02-02 kann diese in index.ts verdrahten (ersetze Stubs und HACK)
- checkPermission ist Drop-in-Ersatz fuer Framework checkUserPermission
- createAuthErrorHandler wraps bestehende authAndSetUsersInfo

---
*Phase: 02-security-ai-stubs*
*Completed: 2026-04-03*
