---
phase: 01-type-safety-consistency
plan: 01
subsystem: types
tags: [valibot, ai-sdk, language-model, type-guard, module-validation]

# Dependency graph
requires: []
provides:
  - LanguageModelWithMeta type and isLanguageModelWithMeta guard in @super-app/shared
  - ModulePluginSchema Valibot validation schema in @super-app/shared
  - Validated Module Registry register() with fail-fast plugin validation
affects: [01-03-as-any-elimination, ai-system, module-registration]

# Tech tracking
tech-stack:
  added: [ai@6.0.144, @ai-sdk/provider@3.0.8 (devDependencies in shared)]
  patterns: [valibot-schema-for-runtime-validation, type-guard-pattern, fail-fast-registration]

key-files:
  created: []
  modified:
    - shared/src/types.ts
    - shared/src/types.test.ts
    - shared/src/index.ts
    - shared/package.json
    - template/backend/src/module-registry.ts
    - template/backend/src/module-registry.test.ts

key-decisions:
  - "Used LanguageModelV1 instead of LanguageModelV3 — SDK v6 uses V1 as canonical type"
  - "Type guard accepts unknown input for maximum flexibility in downstream usage"
  - "Validation error wraps ValiError into descriptive Error with plugin name for debuggability"

patterns-established:
  - "Valibot schema validation at module boundaries (register-time, not runtime)"
  - "Type guard pattern: isXxxWithMeta for narrowing union types"

requirements-completed: [TYPE-01, TYPE-03]

# Metrics
duration: 3min
completed: 2026-04-03
---

# Phase 01 Plan 01: Shared Types & Plugin Validation Summary

**LanguageModelWithMeta type guard and ModulePluginSchema Valibot validation with fail-fast registration in Module Registry**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-02T23:52:47Z
- **Completed:** 2026-04-02T23:55:49Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- LanguageModelWithMeta type and isLanguageModelWithMeta type guard exported from @super-app/shared
- ModulePluginSchema Valibot schema validates complete plugin structure at registration time
- Module Registry register() rejects invalid plugins with descriptive error messages before any other logic

## Task Commits

Each task was committed atomically:

1. **Task 1: Define LanguageModel types and ModulePlugin validation schema** - `0bcd839` (feat)
2. **Task 2: Wire Valibot validation into Module Registry** - `f021155` (feat, template submodule) + `52711c9` (chore, parent ref)

## Files Created/Modified
- `shared/src/types.ts` - Added LanguageModelWithMeta type, isLanguageModelWithMeta guard, ModulePluginSchema
- `shared/src/types.test.ts` - Added 10 new tests for type guard and schema validation
- `shared/src/index.ts` - Barrel exports for new types and functions
- `shared/package.json` - Added ai and @ai-sdk/provider as devDependencies
- `template/backend/src/module-registry.ts` - Added v.parse(ModulePluginSchema) validation in register()
- `template/backend/src/module-registry.test.ts` - Added 6 new tests for plugin validation rejection

## Decisions Made
- Used LanguageModelV1 instead of LanguageModelV3 as the plan assumed — the actual AI SDK v6 exports `LanguageModel = LanguageModelV1` (not V3). Adapted accordingly; the type still provides .provider and .modelId as needed.
- Type guard accepts `unknown` input type for maximum flexibility — callers can pass untyped values and narrow safely.
- Validation wraps ValiError into a standard Error with plugin name included for better debugging.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] LanguageModelV3 does not exist in AI SDK v6**
- **Found during:** Task 1 (reading @ai-sdk/provider types)
- **Issue:** Plan specified `LanguageModelV3` but SDK v6 only has `LanguageModelV1` with `specificationVersion: 'v1'`
- **Fix:** Used `LanguageModelV1` instead — it has identical .provider and .modelId properties as specified
- **Files modified:** shared/src/types.ts
- **Verification:** TypeScript compilation succeeds, all tests pass
- **Committed in:** 0bcd839 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** SDK version difference required type name adjustment. No functional impact — same properties available.

## Issues Encountered
- Template directory is a git submodule, requiring separate commit in submodule + parent ref update.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- LanguageModelWithMeta and ModulePluginSchema are available for Plan 03 (as-any elimination)
- Module Registry now validates all plugins at registration time — any existing module with invalid structure will fail fast

## Self-Check: PASSED

All files exist, all commits found, all acceptance criteria verified.

---
*Phase: 01-type-safety-consistency*
*Completed: 2026-04-03*
