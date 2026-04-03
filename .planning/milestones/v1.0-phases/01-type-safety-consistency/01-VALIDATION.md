---
phase: 1
slug: type-safety-consistency
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-03
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun Test (native) |
| **Config file** | `template/backend/bunfig.toml` |
| **Quick run command** | `cd template/backend && bun test --bail` |
| **Full suite command** | `cd template/backend && bun test && cd ../frontend && bun run type-check && cd ../../modules/mission-control/backend && bun test --bail 2>/dev/null && cd ../../../modules/todos/backend && bun test --bail 2>/dev/null` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd template/backend && bun test --bail`
- **After every plan wave:** Run full suite (backend + frontend type-check + modules)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-T1 | 01 | 1 | TYPE-01, TYPE-03 | unit | `cd shared && bun test src/types.test.ts` | Exists (extend) | pending |
| 01-T2 | 01 | 1 | TYPE-03 | unit | `cd template/backend && bun test src/module-registry.test.ts` | Exists (extend) | pending |
| 02-T1 | 02 | 1 | CON-01 | smoke+unit | `bun run scripts/check-version-sync.ts && cd template/backend && bun test --bail` | Wave 0 (script) | pending |
| 02-T2 | 02 | 1 | CON-02 | unit | `cd template/backend && bun test src/db/schema-prefix.test.ts` | Wave 0 (new test) | pending |
| 03-T1 | 03 | 2 | TYPE-02 | grep+unit | `cd template/backend && grep -rn "as any" src/ --include="*.ts" --exclude="*.test.ts" --exclude="*.d.ts" \| grep -v framework/ \| wc -l && bun test --bail` | Exists | pending |
| 03-T2 | 03 | 2 | TYPE-02 | grep+typecheck | `grep -rn "as any" template/frontend/src/ --include="*.ts" --include="*.vue" --exclude="*.test.ts" --exclude="*.d.ts" \| wc -l && cd template/frontend && bun run type-check` | Exists | pending |
| 03-T3 | 03 | 2 | TYPE-02 | grep+unit | `grep -rn "as any" modules/*/backend/src/ --include="*.ts" --exclude="*.test.ts" --exclude="*.d.ts" \| wc -l && cd modules/mission-control/backend && bun test --bail 2>/dev/null` | Exists | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] `shared/src/types.test.ts` — Exists, will be extended for LanguageModelWithMeta + ModulePluginSchema (Plan 01-T1)
- [x] `template/backend/src/module-registry.test.ts` — Exists, will be extended for Plugin-Validation-Rejection (Plan 01-T2)
- [x] `scripts/check-version-sync.ts` — Created in Plan 02-T1 as part of the task itself
- [x] `template/backend/src/db/schema-prefix.test.ts` — Created in Plan 02-T2 as part of the task itself (TDD)

*All Wave 0 test files are either existing (to be extended) or created within their respective tasks using TDD pattern. No separate Wave 0 task needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Schema prefix in DB | CON-02 | Requires running DB migration | Run `bun run migrate`, check table names with `\dt` in psql |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
