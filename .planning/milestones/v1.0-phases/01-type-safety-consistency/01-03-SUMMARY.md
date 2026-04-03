---
phase: 01-type-safety-consistency
plan: 03
subsystem: types
tags: [as-any-elimination, type-safety, language-model, function-overloads, type-guards]

# Dependency graph
requires:
  - phase: 01-type-safety-consistency plan 01
    provides: LanguageModelWithMeta type and isLanguageModelWithMeta guard in @super-app/shared
provides:
  - Zero as-any in production code across backend, frontend, and modules
  - Fetcher interface with function overloads for type-safe returnAsText
  - HankoValidateResponse and JWTPayload typed interfaces in auth middleware
  - PTProps type for PrimeVue PassThrough in volt/utils
  - ChatInstance interface for AI SDK Chat usage
  - Typed AuditResult validation in mission-control routes
affects: [all-modules, ai-system, auth-middleware, frontend-utils]

# Tech tracking
tech-stack:
  added: []
  patterns: [interface-with-overloads-for-object-methods, typed-query-param-validation, full-default-objects-for-stubs]

key-files:
  created: []
  modified:
    - template/backend/src/ai/main-agent.ts
    - template/backend/src/ai/sub-agent.ts
    - template/backend/src/ai/index.ts
    - template/backend/src/ai/channels/api.ts
    - template/backend/src/index.ts
    - template/backend/src/ai/routes/settings.ts
    - template/backend/src/auth/module-auth-middleware.ts
    - template/frontend/src/utils/fetcher.ts
    - template/frontend/src/i18n.ts
    - template/frontend/src/volt/utils.ts
    - template/frontend/src/volt/Checkbox.vue
    - template/frontend/src/views/chat/index.vue
    - modules/mission-control/backend/src/routes/audit.ts
    - modules/mission-control/backend/src/routes/logs.ts
    - modules/todos/backend/src/index.ts
    - modules/todos/backend/src/routes/index.ts
    - modules/todos/frontend/src/views/TodoDetail.vue
    - modules/todos/frontend/src/views/TodoList.vue

key-decisions:
  - "Fetcher uses separate interface with overloads (not inline on object literal) because TS does not support overload signatures in object literals"
  - "Chat SDK Chat<UIMessage> typed via ChatInstance interface (subset) + as unknown cast because SDK's ChatTransport interface changed and SimpleChatTransport is a deliberate workaround"
  - "i18n Messages typed as Record<string, Record<string, Record<string, string>>> to match vue-i18n LocaleMessages structure"
  - "Todo stubs use full TodoItem defaults instead of spread-as-any for type-safe in-memory placeholders"

patterns-established:
  - "Function overloads via interface for object literal methods (TS limitation workaround)"
  - "Typed query param validation with valid-values array + union type narrowing"
  - "Full default objects for type-safe stubs in standalone module mode"

requirements-completed: [TYPE-02]

# Metrics
duration: 10min
completed: 2026-04-03
---

# Phase 01 Plan 03: as-any Elimination Summary

**Zero as-any in all production code via isLanguageModelWithMeta guards, Fetcher overloads, typed auth interfaces, and full-default stubs**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-03T00:01:03Z
- **Completed:** 2026-04-03T00:11:18Z
- **Tasks:** 3
- **Files modified:** 18

## Accomplishments
- Eliminated all `as any` type assertions from backend production code (7 files, 11 assertions)
- Eliminated all `as any` from frontend production code (5 files, 11 assertions including .vue files)
- Eliminated all `as any` from module production code (6 files, 7 assertions including frontend views)
- Total: 29 `as any` removed, zero remaining in production code

## Task Commits

Each task was committed atomically:

1. **Task 1: Eliminate as any in backend AI files** - `ef653c9` (fix, template submodule) + `bc06781` (chore, parent ref)
2. **Task 2: Eliminate as any in frontend files** - `1a81b14` (fix, template submodule) + `b980020` (chore, parent ref)
3. **Task 3: Eliminate as any in module files** - `7420c5c` (fix)

## Files Created/Modified
- `template/backend/src/ai/main-agent.ts` - isLanguageModelWithMeta replaces (model as any)
- `template/backend/src/ai/sub-agent.ts` - isLanguageModelWithMeta in both agent factories
- `template/backend/src/ai/index.ts` - removed as any from streamText call
- `template/backend/src/ai/channels/api.ts` - typed model as LanguageModel, onStepFinish as Record
- `template/backend/src/index.ts` - null as unknown as LanguageModel replaces null as any
- `template/backend/src/ai/routes/settings.ts` - TASK_TYPES as readonly string[] replaces taskType as any
- `template/backend/src/auth/module-auth-middleware.ts` - HankoValidateResponse and JWTPayload interfaces
- `template/frontend/src/utils/fetcher.ts` - Fetcher interface with function overloads
- `template/frontend/src/i18n.ts` - typed LocaleModule and Messages, no any in module loading
- `template/frontend/src/volt/utils.ts` - PTProps type for PrimeVue PassThrough
- `template/frontend/src/volt/Checkbox.vue` - Record<string, unknown> replaces as any on slotProps
- `template/frontend/src/views/chat/index.vue` - ChatInstance interface, typed SimpleChatTransport
- `modules/mission-control/backend/src/routes/audit.ts` - typed AuditResult validation
- `modules/mission-control/backend/src/routes/logs.ts` - typed AuditResult validation
- `modules/todos/backend/src/index.ts` - full TodoItem defaults in stub create/update
- `modules/todos/backend/src/routes/index.ts` - full TodoItem defaults in placeholder create
- `modules/todos/frontend/src/views/TodoDetail.vue` - specific union types for status/priority
- `modules/todos/frontend/src/views/TodoList.vue` - specific union type for status

## Decisions Made
- **Fetcher interface pattern:** TypeScript does not support function overload signatures on object literal methods. Solution: define a separate `Fetcher` interface with overloads, then type the object as `const fetcher: Fetcher`.
- **Chat SDK workaround preserved:** The AI SDK `Chat<UIMessage>` class requires a `ChatTransport` with `sendMessages`/`reconnectToStream`, but `SimpleChatTransport` is a deliberate workaround. Used `ChatInstance` interface (typed subset) + `as unknown as ChatInstance` instead of `as any`.
- **i18n Messages:** Used `Record<string, Record<string, Record<string, string>>>` to match vue-i18n's expected `LocaleMessages` structure. The `Record<string, unknown>` approach caused type incompatibility with `createI18n()`.
- **Todo stubs:** Replaced spread-as-any with full default objects matching all TodoItem fields. More verbose but fully type-safe.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Additional as-any in .vue files not listed in plan**
- **Found during:** Task 2 (frontend as-any elimination)
- **Issue:** Plan listed only fetcher.ts, i18n.ts, volt/utils.ts. Additional `as any` existed in Checkbox.vue (2x) and chat/index.vue (1x + parameter any).
- **Fix:** Fixed all .vue files: Checkbox uses Record<string, unknown>, chat uses ChatInstance interface.
- **Files modified:** template/frontend/src/volt/Checkbox.vue, template/frontend/src/views/chat/index.vue
- **Committed in:** 1a81b14 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Module frontend .vue files had as-any not listed in plan**
- **Found during:** Task 3 (module as-any elimination)
- **Issue:** Plan listed only backend module files. TodoDetail.vue (2x) and TodoList.vue (1x) also had `as any`.
- **Fix:** Replaced with specific union type casts (`"open" | "in_progress" | "done"` etc.).
- **Files modified:** modules/todos/frontend/src/views/TodoDetail.vue, modules/todos/frontend/src/views/TodoList.vue
- **Committed in:** 7420c5c (Task 3 commit)

**3. [Rule 3 - Blocking] TS function overloads not supported in object literals**
- **Found during:** Task 2 (fetcher.ts rewrite)
- **Issue:** Initial approach used inline overload signatures on object methods, which TS rejects with "comma expected".
- **Fix:** Extracted overload signatures to a separate `Fetcher` interface, typed the object via `const fetcher: Fetcher`.
- **Files modified:** template/frontend/src/utils/fetcher.ts
- **Committed in:** 1a81b14 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 missing critical, 1 blocking)
**Impact on plan:** All deviations were necessary to achieve the plan's goal of zero as-any. The plan underestimated the number of as-any locations (missed .vue files). No scope creep.

## Issues Encountered
- Pre-existing type-check errors in frontend (24 errors from LanguageModelV1 import, bun:test module, etc.) — all unrelated to our changes. No new type errors introduced.
- Pre-existing test failures in framework knowledge tests (MISTRAL_API_KEY not set) — not related to our changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All `as any` eliminated from production code — Type Safety phase (01) is complete
- isLanguageModelWithMeta guard used consistently in AI agent files
- Fetcher has proper overloads for type-safe text/json returns
- Auth middleware has typed response interfaces
- Module stubs are fully type-safe

## Known Stubs
None — all stubs that existed before are now properly typed with full default objects.

---
*Phase: 01-type-safety-consistency*
*Completed: 2026-04-03*
