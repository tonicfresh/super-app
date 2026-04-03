# Spec Audit: Phase 5 — Mission Control

**Spec:** docs/superpowers/plans/2026-04-02-phase5-mission-control.md
**Code:** modules/mission-control/
**Audit Date:** 2026-04-03

---

## Summary

| Category | Count |
|----------|-------|
| Implemented (match spec) | 7 |
| Partial (partially matches) | 2 |
| Missing (not implemented) | 0 |
| Divergent (differs from spec) | 3 |

**Implementation Grade:** 85%

**Overall Assessment:** Mission Control is substantially implemented across all 9 spec tasks. Backend and frontend both exist with the expected structure. Key divergences are in the plugin.ts routes adapter pattern (uses stub deps instead of factory passthrough), the standalone index.ts (does not use defineServer from framework), and tool execute bodies return hardcoded empty data instead of wiring to actual services. The module is structurally complete but operationally relies on stub/placeholder implementations for service wiring.

---

## Task-by-Task Audit

### Task 1: Modul-Grundstruktur — Dateien und Package-Konfiguration

**Status:** IMPLEMENTED

**Spec expects:**
- `modules/mission-control/backend/package.json`
- `modules/mission-control/backend/tsconfig.json`
- `modules/mission-control/backend/drizzle.config.ts`
- `modules/mission-control/frontend/package.json`
- `modules/mission-control/frontend/tsconfig.json`
- `modules/mission-control/README.md`
- `modules/mission-control/AGENTS.md`
- Directory structure: `backend/src/{routes,db,services,jobs}`, `backend/tests`, `frontend/src/{views,components,stores}`

**Actual:**
- [x] `backend/package.json` exists
- [x] `backend/tsconfig.json` exists
- [x] `backend/drizzle.config.ts` exists
- [x] `frontend/package.json` exists
- [x] `frontend/tsconfig.json` exists
- [ ] `README.md` — NOT FOUND (missing)
- [ ] `AGENTS.md` — NOT FOUND (missing)
- [x] All directories exist: routes, db, services, jobs, tests, views, components, stores

**Divergences:**
- Missing README.md and AGENTS.md documentation files (non-functional, low priority)

---

### Task 2: Database Schema — Drizzle-Tabellen

**Status:** IMPLEMENTED

**Spec expects:**
- `mc_agent_sessions` table with: id, agentType, moduleName, userId, channel, status, startedAt, completedAt, steps, tokensUsed, costUsd, toolCalls
- `mc_audit_log` table with: id, timestamp, userId, agentId, action, resource, result, metadata
- `mc_ai_costs` table with: id, project, provider, model, tokensInput, tokensOutput, costUsd, createdAt
- `mcTable` creator with `mc_` prefix
- Schema tests in `tests/schema.test.ts`

**Actual:**
- [x] All three tables defined with exact columns matching spec
- [x] `pgTableCreator` with `mc_` prefix
- [x] `mcSchema` barrel export with all three tables
- [x] `tests/schema.test.ts` exists
- [x] Column names, types, and defaults match spec exactly

**Divergences:** None — exact match.

---

### Task 3: Backend Services — Agent Session Tracking + Audit Log

**Status:** IMPLEMENTED

**Spec expects:**
- `createAgentSessionService(deps)` with methods: startSession, recordStep, completeSession, getRunningAgents, getRecentSessions
- `createAuditLogService(deps)` with methods: log, query
- DI pattern with insert/update/select/broadcast deps
- `services/index.ts` barrel export
- `tests/services.test.ts`

**Actual:**
- [x] `agent-session.service.ts` — all 5 methods implemented with correct DI pattern
- [x] `audit-log.service.ts` — both methods implemented with correct DI pattern
- [x] `services/index.ts` barrel export exists
- [x] `tests/services.test.ts` exists
- [x] Type interfaces match spec: ToolCallRecord, StartSessionInput, CompleteSessionInput, AgentSessionServiceDeps, AuditLogInput, AuditLogQuery, AuditLogServiceDeps

**Divergences:** None — exact match.

---

### Task 4: Backend Routes — REST API Endpoints

**Status:** IMPLEMENTED

**Spec expects:**
- `createAgentRoutes(agentService)` — GET /, GET /recent
- `createLogRoutes(auditService)` — GET / with filters
- `createCostRoutes(deps)` — GET / with groupBy + time range
- `createAuditRoutes(auditService)` — GET / with filters
- `createHealthRoutes(deps)` — GET / with DB check + agent count
- `createMcRoutes(deps)` — master router mounting all sub-routes
- `McRouteDeps` interface
- `tests/routes.test.ts`

**Actual:**
- [x] All 5 route files exist: agents.ts, logs.ts, costs.ts, audit.ts, health.ts
- [x] `routes/index.ts` with `createMcRoutes` and `McRouteDeps` interface
- [x] Route handlers match spec signatures
- [x] `tests/routes.test.ts` exists
- [x] Filter parameters, pagination, groupBy all implemented

**Divergences:** None — exact match.

---

### Task 5: AI Tools + Plugin + Standalone Entry Points

**Status:** PARTIAL (Divergent)

**Spec expects:**
- `createMcTools(deps)` with 4 tools: getAgentStatus, queryAuditLog, getCostSummary, getSystemHealth
- All tools check `mc:read` permission via `checkScope`
- Valibot parameters for each tool
- `ToolResult` return type
- `plugin.ts` with ModulePlugin export: config, schema, routes (factory), jobs, tools
- `plugin.ts` routes getter returns `createMcRoutes` factory directly
- `index.ts` standalone mode using `defineServer` from framework
- `jobs/index.ts` empty job array
- `tests/tools.test.ts`, `tests/security.test.ts`

**Actual:**
- [x] `createMcTools(deps)` — all 4 tools present with correct names
- [x] All tools check `mc:read` permission
- [x] Valibot parameter schemas correct
- [x] `ToolResult` return type used
- [x] `moduleConfig` correct: name, version, permissions (base + custom)
- [x] `tests/tools.test.ts` exists
- [x] `tests/security.test.ts` exists
- [x] `jobs/index.ts` — empty array, correct

**Divergences:**

1. **plugin.ts routes getter** — Spec says routes getter should return `createMcRoutes` factory directly. Actual implementation wraps it in an adapter `(app: any) => void` that creates services with **stub deps** (empty callbacks, hardcoded returns). This was done to match framework `(app) => void` contract but means integrated mode uses non-functional stubs.

2. **tools execute bodies** — All 4 tools return **hardcoded empty data** (e.g., `agents: []`, `entries: []`, `costs: []`, `activeAgents: 0`). They don't wire to actual services. The spec code also shows placeholder data, but the architecture expects these to be wired to real service calls.

3. **index.ts standalone mode** — Spec uses `defineServer` from `@framework/index` with full server config. Actual implementation does NOT import defineServer — instead creates services with stub deps and exports them. No server is actually started. The standalone entry point is non-functional.

4. **Default mcTools export** — `mcTools` uses `checkScope: async () => true` passthrough, which is correct per spec but creates a security-insensitive default.

---

### Task 6: Frontend — Module Entry Points + Pinia Stores

**Status:** IMPLEMENTED

**Spec expects:**
- `module.ts` with ModuleDefinition: name, routes (5 views), navigation, permissions
- `main.ts` standalone Vue app with PrimeVue, Pinia, router
- 4 Pinia stores: agent-sessions, audit-log, costs, health
- Store interfaces: AgentSessionView, AuditEntryView, CostGroupView, HealthStatus

**Actual:**
- [x] `module.ts` — exact match: 5 routes, navigation config, permissions ["mc:read"]
- [x] `main.ts` — standalone Vue app setup matches spec
- [x] `agent-sessions.store.ts` — all state, getters, actions, WS handler match spec
- [x] `audit-log.store.ts` — entries, fetchLogs with filters match spec
- [x] `costs.store.ts` — costGroups, totalUsd, totalEur, fetchCosts match spec
- [x] `health.store.ts` — HealthStatus interface, fetchHealth match spec
- [x] All type interfaces match spec

**Divergences:** None — exact match.

---

### Task 7: Frontend Views — Vue Dashboard-Komponenten

**Status:** IMPLEMENTED

**Spec expects:**
- Dashboard.vue — KPI cards, live agents, recent sessions, auto-refresh
- AgentMonitor.vue — WebSocket connection, live agent cards, recent sessions table
- LogViewer.vue — filter by userId/action/result, audit log table
- CostTracker.vue — ApexCharts bar chart, group-by toggle, KPI cards, detail table
- AuditLog.vue — result filter, date range, permission trail table
- KpiCard.vue — label, value, icon, trend props
- AgentCard.vue — agent info, status badge, duration, last tool call

**Actual:**
- [x] All 5 views exist and match spec structure
- [x] `KpiCard.vue` — matches spec props and template
- [x] `AgentCard.vue` — matches spec props, formatDuration, lastToolCall functions
- [x] Dashboard.vue — KPI row, live agents, recent sessions, 10s auto-refresh
- [x] AgentMonitor.vue — WebSocket with reconnect, live agents grid, sessions table
- [x] LogViewer.vue — userId/action/result filters, log table
- [x] CostTracker.vue — ApexCharts bar chart, module/provider/model toggle, KPI cards
- [x] AuditLog.vue — result filter, date range, audit trail table

**Minor Divergences:**
- Dashboard.vue `statusIcon()` returns text strings ("check", "x") instead of emoji characters as in spec. Functionally equivalent but visually different.
- Dashboard.vue shows `EUR` prefix instead of `€` symbol for cost display. Minor cosmetic difference.

---

### Task 8: Module Registration + Integration Wiring

**Status:** IMPLEMENTED

**Spec expects:**
- `template/backend/src/index.ts` imports and registers missionControlPlugin
- `template/frontend/src/module-loader.ts` imports mission-control moduleDefinition
- `ws-handler.ts` with `createMcBroadcaster` function

**Actual:**
- [x] `template/backend/src/index.ts` imports `plugin as missionControlPlugin` — confirmed via grep
- [x] `template/frontend/src/module-loader.ts` imports missionControl as builtInModule — confirmed. Also includes todosModule (not in spec but expected, as todos is another module)
- [x] `ws-handler.ts` — `createMcBroadcaster(deps)` matches spec exactly

**Divergences:** None — matches spec.

---

### Task 9: Finalisierung — Tests, Typecheck, Verifikation

**Status:** PARTIAL

**Spec expects:**
- All backend tests pass (schema, services, routes, tools, security)
- Typecheck passes
- Plugin import check works
- Route smoke test works (standalone)

**Actual:**
- [x] Test files exist for all areas: schema, services, routes, tools, security
- [ ] Tests not verified as passing (no test run in this audit)
- [ ] Typecheck not verified (no typecheck run in this audit)
- [ ] Standalone smoke test likely fails (index.ts doesn't use defineServer — see Task 5 divergences)

**Note:** Task 9 is a verification task, not an implementation task. The test and source files exist, but the standalone index.ts divergence means the smoke test would fail.

---

## Backend Audit Summary

| Component | Status | Notes |
|-----------|--------|-------|
| `plugin.ts` | Divergent | Routes adapter uses stub deps instead of factory passthrough |
| `db/schema.ts` | Match | All 3 tables exact |
| `routes/` (5 files + index) | Match | All endpoints match spec |
| `services/` (2 files + index) | Match | DI pattern, methods, types all match |
| `tools.ts` | Partial | Structure matches, execute bodies return hardcoded empty data |
| `ws-handler.ts` | Match | createMcBroadcaster matches spec |
| `jobs/index.ts` | Match | Empty array as expected |
| `index.ts` (standalone) | Divergent | Does not use defineServer, stub-only |
| `tests/` (5 files) | Match | All test files present |

## Frontend Audit Summary

| Component | Status | Notes |
|-----------|--------|-------|
| `module.ts` | Match | Routes, navigation, permissions correct |
| `main.ts` | Match | Standalone Vue app setup correct |
| `stores/` (4 files) | Match | All stores with correct interfaces and actions |
| `views/` (5 files) | Match | All views implemented per spec |
| `components/` (2 files) | Match | KpiCard and AgentCard match spec |

---

## Key Findings

### Critical Issues

1. **Stub Dependencies in Plugin Routes (plugin.ts:42-65):** The integrated mode creates services with non-functional stubs (e.g., `insert: async (data) => ({ id: "stub" })`, `queryCosts: async () => ({ costs: [], totalUsd: 0 })`). This means when MC is loaded in the Super App, all routes return empty/fake data. The spec intended the routes getter to return the `createMcRoutes` factory itself, letting the framework inject real deps.

2. **Standalone Entry Point Non-Functional (index.ts):** The standalone mode doesn't start a server. Spec expects `defineServer()` call. Actual code creates services with stubs and exports them — no HTTP server is bound.

### Medium Issues

3. **AI Tools Return Hardcoded Data:** All 4 tools (getAgentStatus, queryAuditLog, getCostSummary, getSystemHealth) return empty arrays and zero values. The permission check works, but the actual data retrieval is not wired.

### Low Priority Issues

4. **Missing README.md and AGENTS.md:** Documentation files specified in Task 1 are not present.

5. **Dashboard statusIcon cosmetic difference:** Returns text strings instead of emoji characters.

---

## Deviation Categories

| Type | Count | Details |
|------|-------|---------|
| Structural (files, directories) | 0 | All expected files exist (except README/AGENTS) |
| Interface/Contract | 0 | All TypeScript interfaces match spec |
| Implementation/Wiring | 3 | Plugin routes adapter, standalone entry, tool execute bodies |
| Cosmetic/Minor | 2 | README/AGENTS missing, statusIcon text vs emoji |
