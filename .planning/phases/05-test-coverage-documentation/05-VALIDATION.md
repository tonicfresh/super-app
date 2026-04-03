---
phase: 5
slug: test-coverage-documentation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in, Bun 1.2.10) |
| **Config file** | none — uses bunfig.toml defaults |
| **Quick run command** | `cd template/backend && bun test --filter "{test-name}"` |
| **Full suite command** | `cd template/backend && bun test` |
| **Estimated runtime** | ~200ms (71 existing tests run in 104ms) |

---

## Sampling Rate

- **After every task commit:** Run `bun test --filter "{new-test-file}"` for the specific test
- **After every plan wave:** Run `bun test` full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | TEST-01 | integration | `bun test --filter "module-registry"` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | TEST-02 | integration | `bun test --filter "auth"` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | TEST-03 | integration | `bun test --filter "cost-guardrail"` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | TEST-04 | integration | `bun test --filter "privacy"` | ✅ (extend) | ⬜ pending |
| 05-03-01 | 03 | 2 | CON-03 | file check | `grep -c '## Tech Stack' CLAUDE.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `template/backend/src/test-utils.ts` — shared mock fixtures (LanguageModel, ModulePlugin, AISystemDeps)
- [ ] Verify `bun test` runs green before starting (baseline)

*Existing infrastructure covers framework needs. Only shared fixtures are new.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CLAUDE.md accuracy | CON-03 | Requires human judgment on completeness | Compare CLAUDE.md sections against actual code structure |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
