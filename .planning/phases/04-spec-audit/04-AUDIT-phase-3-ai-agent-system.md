# Spec Audit: Phase 3 -- AI Agent System

**Spec:** docs/superpowers/plans/2026-04-02-phase3-ai-agent-system.md
**Code:** template/backend/src/ai/
**Audit Date:** 2026-04-03
**Auditor:** GSD Executor (04-02)

---

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| Implemented | 6 | 75% |
| Partial | 2 | 25% |
| Missing | 0 | 0% |
| Divergent | 0 | 0% |

**Implementation Grade: 88%**

All 8 spec tasks have corresponding code. The core architecture (module-connector, main-agent, sub-agent, privacy, approval, channels, integration) is fully present. Two tasks are marked partial due to minor divergences from spec signatures that reflect intentional improvements made during Phase 2/3 execution.

---

## Tracked in Prior Phases

The following deviations were already addressed by prior audit phases:

| ID | Description | Tracked In | Status |
|----|-------------|------------|--------|
| SEC-03 | Approval Workflow DB-Storage | Phase 3 (03-01, 03-02, 03-03) | Completed |
| SEC-04 | Rate Limiting (sliding-window) | Phase 3 (03-01, 03-02) | Completed |
| AI-05 | Agent Step Tracking (mc_agent_sessions) | Phase 3 (03-01, 03-02) | Completed |

---

## Task-by-Task Audit

### Task 1: Module Connector -- Tool Loading with Permission-Filtering

**Spec File:** `template/backend/src/ai/module-connector.ts`
**Actual File:** `template/backend/src/ai/module-connector.ts` (exists)

| Feature | Status | Notes |
|---------|--------|-------|
| `ModuleConnectorDeps` interface | implemented | Matches spec exactly |
| `loadModuleTools()` function | implemented | Signature and logic match spec |
| `loadSubAgents()` function | implemented | Naming pattern `<name>Agent` matches |
| `createDynamicAgentTool()` function | implemented | Cross-module tool creation matches |
| Permission filtering via `checkModuleAccess` | implemented | Async per-module check as specified |
| Valibot parameters (not Zod) | implemented | Uses `v.object`, `v.pipe`, `v.string` |
| Test file exists | implemented | `module-connector.test.ts` present |

**Status: implemented**
**Priority: --**

---

### Task 2: Main Agent

**Spec File:** `template/backend/src/ai/main-agent.ts`
**Actual File:** `template/backend/src/ai/main-agent.ts` (exists)

| Feature | Status | Notes |
|---------|--------|-------|
| `createMainAgent()` factory | implemented | Returns `MainAgentConfig` |
| `MainAgentConfig` interface | implemented | userId, tenantId, system, tools, maxSteps, onStepFinish, model |
| `MainAgentDeps` interface | partial | `logAgentStep` accepts `AgentStepLogWithSession` instead of `AgentStepLog` (Phase 3 improvement) |
| `maxSteps: 30` | implemented | Hardcoded as specified |
| System instructions with privacy rules | implemented | Contains NEVER, LIMIT_REACHED, FORBIDDEN, VALIDATION_ERROR |
| `onStepFinish` callback | implemented | Logs cost + agent step + debug |
| Model type `LanguageModelV1` | partial | Uses `LanguageModel` (AI SDK canonical type alias, functionally equivalent) |
| `sessionId` closure pattern | implemented | Added in Phase 3 (03-02), not in original spec but improves tracking |
| `isLanguageModelWithMeta()` guard | implemented | Safe provider/modelId extraction (Phase 2 improvement) |
| Test file exists | implemented | `main-agent.test.ts` present |

**Status: partial** (minor type divergence: `LanguageModel` vs `LanguageModelV1`)
**Priority: low** -- Functionally equivalent, `LanguageModel` is the Phase 1 decision (TYPE-01)

**Deviations:**
1. Model type changed from `LanguageModelV1` to `LanguageModel` -- Decision from Phase 1 (TYPE-01)
2. `logAgentStep` signature extended with `sessionId`/`isFirstStep` -- Phase 3 improvement for session tracking
3. `isLanguageModelWithMeta()` guard added for safe provider extraction -- Phase 2 improvement

---

### Task 3: Sub-Agent Pattern -- ToolLoopAgent per Module

**Spec File:** `template/backend/src/ai/sub-agent.ts`
**Actual File:** `template/backend/src/ai/sub-agent.ts` (exists)

| Feature | Status | Notes |
|---------|--------|-------|
| `createSubAgentConfig()` factory | implemented | Matches spec signature |
| `SubAgentConfig` interface | implemented | moduleName, system, tools, maxSteps, model, onStepFinish |
| `SubAgentDeps` interface | implemented | model, logAICost, logAgentStep |
| `maxSteps: 10` for sub-agents | implemented | As specified |
| Module-specific instructions | implemented | Contains module name, scope rules, privacy rules |
| `agentType: "sub"` in step log | implemented | |
| `createDynamicAgentConfig()` | implemented | maxSteps: 15, cross-module |
| Model type uses `LanguageModel` | implemented | Same Phase 1 decision as main-agent |
| `isLanguageModelWithMeta()` guard | implemented | Safe extraction |
| Test file exists | implemented | `sub-agent.test.ts` present |

**Status: implemented**
**Priority: --**

---

### Task 4: Chat API Channel

**Spec File:** `template/backend/src/ai/channels/api.ts`
**Actual File:** `template/backend/src/ai/channels/api.ts` (exists)

| Feature | Status | Notes |
|---------|--------|-------|
| `createChatRoutes()` factory | implemented | Returns Hono app |
| `ChatRouteDeps` interface | implemented | createMainAgent + streamText injection |
| `POST /chat` route | implemented | Input validation, auth context, streaming |
| Message validation (required, array, non-empty) | implemented | 3 checks as specified |
| Auth context (userId, tenantId) | implemented | From Hono context |
| Error handling (500 on streamText failure) | implemented | |
| `ChatMessage` type | implemented | role + content |
| `streamText` DI pattern | implemented | Injected for testability |
| Model passed as `LanguageModel` | implemented | Uses `agentConfig.model` directly (spec had string concat) |
| Test file exists | implemented | `api.test.ts` present |

**Status: implemented**
**Priority: --**

**Note:** Spec had `model: \`\${agentConfig.provider}:\${agentConfig.modelId}\`` but code correctly passes `agentConfig.model` (the LanguageModel object). This is an improvement over spec.

---

### Task 5: Privacy Layer

**Spec File:** `template/backend/src/ai/privacy.ts`
**Actual File:** `template/backend/src/ai/privacy.ts` (exists)

| Feature | Status | Notes |
|---------|--------|-------|
| `SENSITIVE_PATTERNS` (email, phone, password, apiKey) | implemented | All 4 patterns match spec |
| `SensitiveDataType` type | implemented | Union type exported |
| `containsSensitiveData()` | implemented | Recursive, handles null/undefined/arrays/objects |
| `sanitizeToolResponse()` | implemented | Deep copy via JSON, recursive replacement |
| `REPLACEMENTS` map | implemented | [REDACTED_EMAIL], [REDACTED_PHONE], etc. |
| `SensitiveDataResult` interface | implemented | found, types, paths |
| Immutability (does not mutate input) | implemented | JSON.parse(JSON.stringify()) deep copy |
| Test file exists | implemented | `privacy.test.ts` present |
| Integration test file exists | implemented | `privacy-integration.test.ts` present |

**Status: implemented**
**Priority: --**

---

### Task 6: Human-in-the-Loop Approval System

**Spec File:** `template/backend/src/ai/approval.ts` + `channels/approval-routes.ts`
**Actual Files:** Both exist

| Feature | Status | Notes |
|---------|--------|-------|
| `createApprovalManager()` factory | implemented | |
| `ApprovalManager` interface | implemented | requestApproval, resolveApproval, getPendingRequests |
| `ApprovalManagerDeps` interface | implemented | notifyUser, storeRequest, updateRequest, loadRequest (optional) |
| `ApprovalRequest` type | implemented | All fields present |
| `ApprovalDecision` type | implemented | |
| In-memory Map + DB persistence | implemented | Dual storage |
| Notify user on new request | implemented | |
| Throw on unknown/already-resolved | implemented | |
| DB-fallback for restart-safety | implemented | Phase 3 improvement (03-03) |
| `loadRequest` optional dep | implemented | Phase 3 improvement (03-03) |
| Approval Routes (GET pending, POST approve, POST deny) | implemented | |
| Error handling (404, 409) | implemented | |
| Test files exist | implemented | `approval.test.ts` + `approval-routes.test.ts` |

**Status: implemented**
**Priority: --**

---

### Task 7: Integration -- AI Routes in Server

**Spec File:** `template/backend/src/ai/index.ts`
**Actual File:** `template/backend/src/ai/index.ts` (exists)

| Feature | Status | Notes |
|---------|--------|-------|
| `createAISystem()` factory | implemented | Returns AISystemConfig |
| `AISystemDeps` interface | implemented | All deps present + loadApprovalRequest optional |
| `AISystemConfig` interface | implemented | chatRoutes, approvalRoutes, approvalManager, createMainAgent |
| Wire module-connector deps | implemented | |
| Wire approval manager deps | implemented | Including loadRequest |
| Wire chat routes with streamText | implemented | Dynamic import of `ai` |
| Wire approval routes | implemented | |
| Re-exports for external usage | implemented | Types + privacy functions |
| Server integration (index.ts) | partial | See below |
| Test file exists | implemented | `index.test.ts` present |

**Server integration divergence:** The spec shows AI system wired in `template/backend/src/index.ts` with TODO stubs. Phase 3 (03-02) replaced all TODO stubs with real implementations. However, there are TWO parallel AI init paths:

1. `createAISystem()` from `ai/index.ts` -- Phase 3 Agent System (module-connector, main-agent, approval)
2. `initAI()` from `ai/init.ts` -- Phase 4 Provider/Cost System (providers, cost-tracking, guardrails)

These two init paths coexist in `template/backend/src/index.ts`. The spec envisions them as one unified system, but the code has them as separate subsystems called sequentially. This is functionally correct but architecturally divergent.

**Status: partial** (dual init path instead of unified)
**Priority: medium** -- Works correctly but creates two separate AI initialization codepaths that could be unified

---

### Task 8: End-to-End Privacy Integration Tests

**Spec File:** `template/backend/src/ai/privacy-integration.test.ts`
**Actual File:** `template/backend/src/ai/privacy-integration.test.ts` (exists)

| Feature | Status | Notes |
|---------|--------|-------|
| Clean data tests (contact, mail, todo) | implemented | All 3 patterns |
| Leaking data tests (email, phone, apiKey) | implemented | All 4 patterns |
| Sanitization end-to-end test | implemented | Sanitize + recheck cycle |
| Immutability test | implemented | Original unchanged |
| Non-sensitive data preservation test | implemented | id, name, taskCount preserved |

**Status: implemented**
**Priority: --**

---

## Additional Files Not In Spec

The following files exist in `template/backend/src/ai/` but are not part of the Phase 3 spec:

| File | Origin | Purpose |
|------|--------|---------|
| `agent-session-tracker.ts` | Phase 3 (03-01) | Session INSERT/UPDATE lifecycle for mc_agent_sessions |
| `agent-session-tracker.test.ts` | Phase 3 (03-01) | Tests for tracker |
| `init.ts` | Phase 4 spec | AI init wiring (providers, cost, guardrails) |
| `init.test.ts` | Phase 4 spec | Tests for AI init |
| `providers.ts` | Phase 4 spec | Multi-provider registry |
| `providers.test.ts` | Phase 4 spec | Tests for providers |
| `cost-tracking.ts` | Phase 4 spec | Cost logging service |
| `cost-tracking.test.ts` | Phase 4 spec | Tests for cost tracking |
| `cost-guardrails.ts` | Phase 4 spec | Budget guardrails |
| `cost-guardrails.test.ts` | Phase 4 spec | Tests for guardrails |
| `cost-queries.ts` | Phase 4 spec | DB queries for costs |
| `cost-queries.test.ts` | Phase 4 spec | Tests for queries |
| `routes/costs.ts` | Phase 4 spec | Cost API routes |
| `routes/costs.test.ts` | Phase 4 spec | Tests for cost routes |
| `routes/settings.ts` | Phase 4 spec | Settings API routes |
| `routes/settings.test.ts` | Phase 4 spec | Tests for settings routes |
| `db/schema.ts` | Phase 4 spec | mc_ai_costs Drizzle schema |
| `db/schema.test.ts` | Phase 4 spec | Tests for schema |

These are all Phase 4 files that share the `ai/` directory. No unexpected files found.

---

## Legacy Code

| File | Status | Notes |
|------|--------|---------|
| `template/backend/src/services/approval.ts` | deprecated | Marked `@deprecated` per D-02 in Phase 3 (03-03). Kanonische Implementierung ist `ai/approval.ts` |
| `template/backend/src/routes/tenant/[tenantId]/chat/index.ts` | legacy | Pre-spec chat route using direct Mistral import. Not using agent system. Should be migrated to use `createAISystem()` |

**Legacy chat route divergence:** The file at `template/backend/src/routes/tenant/[tenantId]/chat/index.ts` is a pre-existing chat endpoint that:
- Imports `mistral` directly from `@ai-sdk/mistral` (hardcoded provider)
- Uses `MISTRAL_API_KEY` from env (not Framework secrets)
- Does not use the Module Connector, Main Agent, or Privacy Layer
- Does not track costs or agent sessions

This is a **separate, parallel chat implementation** that does not follow the Phase 3 spec architecture. It should be migrated to use `createAISystem().chatRoutes` or removed.

**Priority: medium** -- Functional but bypasses all Phase 3 architecture (permissions, privacy, cost tracking, agent sessions)

---

## Deviation Summary

| # | Type | Description | Priority | Fix Proposal |
|---|------|-------------|----------|-------------|
| D-01 | Divergent | `LanguageModelV1` changed to `LanguageModel` in main-agent and sub-agent | low | Intentional Phase 1 decision (TYPE-01). No fix needed |
| D-02 | Divergent | `logAgentStep` signature extended with session context | low | Intentional Phase 3 improvement. No fix needed |
| D-03 | Partial | Dual AI init paths (createAISystem + initAI) in index.ts | medium | Consider unifying into single init entry point |
| D-04 | Legacy | Pre-spec chat route bypasses Phase 3 architecture | medium | Migrate to use createAISystem or deprecate |

---

## Recommendations

1. **Unify AI Init (D-03):** Merge `initAI()` and `createAISystem()` into a single initialization function. Currently they're called sequentially but manage overlapping concerns.

2. **Migrate Legacy Chat (D-04):** The tenant-specific chat route at `routes/tenant/[tenantId]/chat/index.ts` should be migrated to use the agent system, or deprecated with a redirect to the Phase 3 `/api/v1/ai/chat` endpoint.

3. **No critical issues found.** The Phase 3 spec is well-implemented with thoughtful improvements from Phase 2/3 execution.
