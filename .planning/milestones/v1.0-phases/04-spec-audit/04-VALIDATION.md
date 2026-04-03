---
phase: 4
slug: spec-audit
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | N/A — Phase 4 is a pure analysis/documentation phase |
| **Config file** | none — no code changes, only Markdown outputs |
| **Quick run command** | `ls .planning/phases/04-spec-audit/04-*-DEVIATION.md 2>/dev/null | wc -l` |
| **Full suite command** | `for f in .planning/phases/04-spec-audit/04-*-DEVIATION.md; do echo "--- $f ---"; head -5 "$f"; done` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Verify deviation report file exists and has expected sections
- **After every plan wave:** Verify all expected deviation reports are present
- **Before `/gsd:verify-work`:** All 8 deviation reports + consolidated summary must exist
- **Max feedback latency:** 1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | SPEC-01 | file check | `test -f .planning/phases/04-spec-audit/04-01-DEVIATION.md` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | SPEC-02 | file check | `test -f .planning/phases/04-spec-audit/04-02-DEVIATION.md` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | SPEC-03 | file check | `test -f .planning/phases/04-spec-audit/04-03-DEVIATION.md` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | SPEC-04 | file check | `test -f .planning/phases/04-spec-audit/04-04-DEVIATION.md` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | SPEC-05 | file check | `test -f .planning/phases/04-spec-audit/04-05-DEVIATION.md` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | SPEC-06 | file check | `test -f .planning/phases/04-spec-audit/04-06-DEVIATION.md` | ❌ W0 | ⬜ pending |
| 04-02-03 | 02 | 1 | SPEC-07 | file check | `test -f .planning/phases/04-spec-audit/04-07-DEVIATION.md` | ❌ W0 | ⬜ pending |
| 04-02-04 | 02 | 1 | SPEC-08 | file check | `test -f .planning/phases/04-spec-audit/04-08-DEVIATION.md` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | ALL | file check | `test -f .planning/phases/04-spec-audit/04-CONSOLIDATED.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework needed — this phase produces documentation only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deviation accuracy | ALL | Requires human judgment on whether deviations are correctly categorized | Review each deviation report for accuracy of status labels |
| Priority correctness | ALL | Subjective judgment on severity | Review priority assignments (critical/high/medium/low) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 1s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
