---
phase: 1
slug: type-safety-consistency
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| **Quick run command** | `cd template/backend && bun test` |
| **Full suite command** | `cd template/backend && bun test && cd ../frontend && bun run type-check` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd template/backend && bun test`
- **After every plan wave:** Run `cd template/backend && bun test && cd ../frontend && bun run type-check`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | TYPE-01 | unit | `cd template/backend && bun test shared` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | TYPE-02 | unit | `cd template/backend && bun test` | ✅ | ⬜ pending |
| 01-02-01 | 02 | 1 | TYPE-03 | typecheck | `cd template/backend && bun run typecheck` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | CON-01 | unit | `cd template/backend && bun test` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 2 | CON-02 | integration | `cd template/backend && bun test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `template/backend/src/ai/types.test.ts` — stubs for TYPE-01, TYPE-02
- [ ] `bun run typecheck` script in backend package.json — if not present
- [ ] `shared/src/types.test.ts` — stubs for LanguageModel interface validation

*Existing test infrastructure (Bun Test) covers framework; task-level stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Schema prefix in DB | CON-02 | Requires running DB migration | Run `bun run migrate`, check table names with `\dt` in psql |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
