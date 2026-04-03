---
phase: 2
slug: security-ai-stubs
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-03
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun Test (native) |
| **Config file** | none — Bun test runner built-in |
| **Quick run command** | `cd template/backend && bun test --bail` |
| **Full suite command** | `cd template/backend && bun test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd template/backend && bun test --bail`
- **After every plan wave:** Run `cd template/backend && bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-T1 | 01 | 1 | SEC-01 | integration | `cd template/backend && bun test src/auth/permission-middleware.test.ts` | ❌ W0 | ⬜ pending |
| 02-T2 | 01 | 1 | SEC-02 | unit | `cd template/backend && bun test src/auth/token-verification.test.ts` | ❌ W0 | ⬜ pending |
| 02-T3 | 02 | 1 | AI-01, AI-02 | unit | `cd template/backend && bun test src/ai/callbacks.test.ts` | ❌ W0 | ⬜ pending |
| 02-T4 | 02 | 1 | AI-03, AI-04 | unit | `cd template/backend && bun test src/ai/callbacks.test.ts` | ❌ W0 | ⬜ pending |
| 02-T5 | 03 | 2 | AI-06, AI-07 | integration | `cd template/backend && bun test src/ai/cost-tracking.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `template/backend/src/auth/permission-middleware.test.ts` — permission enforcement stubs
- [ ] `template/backend/src/auth/token-verification.test.ts` — Hanko token try-catch stubs
- [ ] `template/backend/src/ai/callbacks.test.ts` — AI callback wiring stubs
- [ ] `template/backend/src/ai/cost-tracking.test.ts` — dbInsert cost tracking stubs

*Test files created by TDD within plan tasks (RED phase before implementation).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Permission 403 with real Hanko token | SEC-01 | Needs running server + Hanko | Start server, send request without permission, verify 403 |
| AI cost row in mc_ai_costs | AI-06 | Needs running DB | Trigger AI call, query mc_ai_costs table |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
