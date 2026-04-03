# Spec Audit: Phase 8 — Reference Module: Todos

**Spec:** docs/superpowers/plans/2026-04-02-phase8-reference-module-todos.md
**Code:** modules/todos/
**Audit Date:** 2026-04-03

## Summary

- Tasks in Spec: 13
- Implemented: 12 | Partial: 1 | Missing: 0 | Divergent: 1
- Implementation Grade: 95%

The Todos module is substantially complete as the reference module for the Super App. All 13 spec tasks have corresponding implementations. The directory structure, database schema, service layer, CRUD routes, AI tools, plugin.ts/module.ts contracts, Pinia store, frontend views/components, standalone mode, integration wiring, security tests, and documentation all exist. One task (Task 12: Security Tests) is marked partial because tests use placeholder assertions instead of real integration tests. One divergence is noted in Task 5 (tools export has stub deps at module level).

## Task-by-Task Audit

### Task 1: Module Scaffold — Verzeichnisstruktur

**Status:** IMPLEMENTED

**Spec expects:**
- Backend: src/{index,plugin,tools,db/schema,routes/index,jobs/index,services/index}.ts
- Backend: tests/{routes,tools,schema,security}.test.ts
- Backend: package.json, tsconfig.json, drizzle.config.ts
- Frontend: src/{main,module}.ts, views/{TodoList,TodoDetail,TodoSettings}.vue, components/{TodoCard,TodoKanban,TodoFilters}.vue, stores/todos.ts
- Frontend: package.json
- README.md, AGENTS.md

**Actual:**

| File | Status |
|------|--------|
| backend/src/index.ts | EXISTS |
| backend/src/plugin.ts | EXISTS |
| backend/src/tools.ts | EXISTS |
| backend/src/db/schema.ts | EXISTS |
| backend/src/routes/index.ts | EXISTS |
| backend/src/jobs/index.ts | EXISTS |
| backend/src/services/index.ts | EXISTS |
| backend/src/services/todo-service.test.ts | EXISTS |
| backend/tests/routes.test.ts | EXISTS |
| backend/tests/tools.test.ts | EXISTS |
| backend/tests/schema.test.ts | EXISTS |
| backend/tests/security.test.ts | EXISTS |
| backend/package.json | EXISTS |
| backend/tsconfig.json | EXISTS |
| backend/drizzle.config.ts | EXISTS |
| frontend/src/main.ts | EXISTS |
| frontend/src/module.ts | EXISTS |
| frontend/src/views/TodoList.vue | EXISTS |
| frontend/src/views/TodoDetail.vue | EXISTS |
| frontend/src/views/TodoSettings.vue | EXISTS |
| frontend/src/components/TodoCard.vue | EXISTS |
| frontend/src/components/TodoKanban.vue | EXISTS |
| frontend/src/components/TodoFilters.vue | EXISTS |
| frontend/src/stores/todos.ts | EXISTS |
| frontend/package.json | EXISTS |
| README.md | EXISTS |
| AGENTS.md | EXISTS |

**Divergences:** None — all 26+ expected files present.

---

### Task 2: Database Schema — Drizzle Tabellen

**Status:** IMPLEMENTED

| Feature | Status | Notes |
|---------|--------|-------|
| `pgTableCreator` with `todos_` prefix | implemented | `todosTable = pgTableCreator((name) => \`todos_\${name}\`)` |
| `todosItems` table (id, tenantId, title, description, status, priority, dueDate, assigneeId, listId, createdBy, createdAt, updatedAt) | implemented | All columns match spec |
| `todosLists` table (id, tenantId, name, color, icon, createdBy, createdAt) | implemented | |
| `todosLabels` table (id, tenantId, name, color) | implemented | |
| `todosItemsToLabels` junction table (todoId, labelId with FK cascade) | implemented | M:N relationship |
| `TodoStatus` enum (open, in_progress, done) | implemented | |
| `TodoPriority` enum (low, medium, high, urgent) | implemented | |
| `todosStatusEnum` pgEnum | implemented | |
| `todosPriorityEnum` pgEnum | implemented | |
| Relations (items->lists, items->labels, labels->items) | implemented | Drizzle relations |
| Indexes (tenant, status, assignee, list, dueDate) | implemented | 5 indexes on items |
| Valibot schemas (insert, select, update) | implemented | Via drizzle-valibot |
| `todosSchema` barrel export | implemented | All tables + relations + junction |
| `tests/schema.test.ts` | implemented | |

**Divergences:** None — exact match.

---

### Task 3: Todo Service — Business-Logik

**Status:** IMPLEMENTED

| Feature | Status | Notes |
|---------|--------|-------|
| `CreateTodoInput` interface | implemented | title, description?, status?, priority?, dueDate?, assigneeId?, listId?, createdBy |
| `UpdateTodoInput` interface | implemented | All fields optional |
| `ListTodosFilter` interface | implemented | status?, priority?, assigneeId?, listId?, search?, limit?, offset? |
| `TodoItem` interface | implemented | All fields with correct types |
| `TodoServiceDeps` interface (DI) | implemented | findAll, findById, create, update, remove, count |
| `createTodoService()` factory | implemented | |
| `list()` — tenant-scoped | implemented | Passes filter to deps |
| `getById()` — tenant check | implemented | Returns null for wrong tenant |
| `create()` — validates title | implemented | Empty and >500 char validation |
| `update()` — tenant check + title validation | implemented | |
| `remove()` — tenant check | implemented | Returns false for wrong tenant |
| `count()` — for pagination | implemented | |
| `todo-service.test.ts` | implemented | All test cases from spec |

**Divergences:** None — exact match.

---

### Task 4: Backend Routes — Full CRUD API

**Status:** IMPLEMENTED

| Feature | Status | Notes |
|---------|--------|-------|
| `CreateTodoBody` Valibot schema | implemented | title (minLength 1, maxLength 500), optional fields |
| `UpdateTodoBody` Valibot schema | implemented | All optional |
| `CreateListBody` Valibot schema | implemented | name required |
| `GET /` — list with filters | implemented | Query params: status, priority, assigneeId, listId, search, limit, offset |
| `POST /` — create with validation | implemented | 201 on success, 400 on validation error |
| `GET /:id` — get single | implemented | 404 on not found |
| `PUT /:id` — update | implemented | 404 on not found |
| `DELETE /:id` — delete | implemented | 204 on success |
| `GET /lists` — list todo lists | implemented | |
| `POST /lists` — create list | implemented | |
| Tenant-scoped (userId/tenantId from context) | implemented | `c.get("tenantId")` / `c.get("userId")` |
| `tests/routes.test.ts` | implemented | |

**Divergences:** None — routes structure matches spec. Note: spec shows `todosRoutes = (app: any) => void` function signature, actual matches.

---

### Task 5: AI Tools — tools.ts mit Guardrails + Privacy

**Status:** IMPLEMENTED (with minor divergence)

| Feature | Status | Notes |
|---------|--------|-------|
| `TodosToolsDeps` interface | implemented | checkScope, checkGuardrail, todoService, getTenantId, getUserId |
| `sanitizeTodoForLLM()` helper | implemented | Returns only id, title, status, priority, hasDescription, hasDueDate, assigneeId |
| `createTodosTools()` factory | implemented | |
| `createTodo` tool | implemented | Permission check (todos:write), guardrail check, Valibot params |
| `listTodos` tool | implemented | Permission check (todos:read), no guardrail for reads, privacy sanitization |
| `updateTodoStatus` tool | implemented | Permission check (todos:update), guardrail check, NOT_FOUND handling |
| `searchTodos` tool | implemented | Permission check (todos:read), privacy-safe results |
| `deleteTodo` tool | implemented | Permission check (todos:delete), guardrail check, NOT_FOUND handling |
| 4-step pattern (Permission -> Guardrail -> Execute -> ToolResult) | implemented | All 5 tools follow pattern |
| Privacy: no descriptions in responses | implemented | sanitizeTodoForLLM strips description |
| `tests/tools.test.ts` | implemented | ToolResult contract tests |

**Divergence:**
- D-01: `checkGuardrail` return type in `TodosToolsDeps` uses `{ allowed, used, max, remaining }` but spec code shows `{ reached, used, max }`. The interface is slightly different but functionally equivalent — the actual tool code checks `guardrail.allowed` which works.
- D-02: Default `todosTools` export at module level uses stub deps (`checkScope: async () => true`, `todoService: {} as any`). Same pattern as Mission Control — the stubs are replaced at runtime by the framework.

**Status:** IMPLEMENTED
**Priority:** low (stub deps are framework convention)

---

### Task 6: plugin.ts — Backend Contract

**Status:** IMPLEMENTED

| Feature | Status | Notes |
|---------|--------|-------|
| `moduleConfig: ModuleConfig` | implemented | name: "todos", version: "1.0.0" |
| permissions.base (read, write, update, delete) | implemented | |
| permissions.custom (admin) | implemented | |
| guardrails (todos:write: dailyLimit 100, todos:delete: dailyLimit 20 + requiresApproval) | implemented | |
| `plugin: ModulePlugin` export | implemented | config, schema, routes, jobs, tools |
| Named exports (schema, routes, jobs, tools) | implemented | |
| `jobs/index.ts` — empty array placeholder | implemented | |

**Divergences:** None — exact match.

---

### Task 7: Frontend — module.ts Contract

**Status:** IMPLEMENTED

| Feature | Status | Notes |
|---------|--------|-------|
| `moduleDefinition: ModuleDefinition` | implemented | |
| name: "todos" | implemented | |
| routes: /todos (TodoList), /todos/:id (TodoDetail), /todos/settings (TodoSettings) | implemented | Lazy imports |
| navigation: label "Todos", icon, position "sidebar", order 20 | implemented | |
| permissions: ["todos:read"] | implemented | |

**Divergences:** None — exact match.

---

### Task 8: Frontend — Pinia Store

**Status:** IMPLEMENTED

| Feature | Status | Notes |
|---------|--------|-------|
| `Todo` interface | implemented | All fields |
| `TodoList` interface | implemented | All fields |
| `TodosFilter` interface | implemented | status?, priority?, listId?, search? |
| `useTodosStore` defineStore | implemented | Composition API style |
| State: todos, lists, currentTodo, filter, loading, error, viewMode | implemented | |
| Computed: filteredTodos, openTodos, inProgressTodos, doneTodos, todosByPriority | implemented | |
| Actions: fetchTodos, fetchTodo, createTodo, updateTodo, deleteTodo, fetchLists, createList, setFilter, setViewMode | implemented | |
| API helper with error handling | implemented | |
| View mode toggle (list/kanban) | implemented | |

**Divergences:** None — exact match.

---

### Task 9: Frontend — Views + Components

**Status:** IMPLEMENTED

| Feature | Status | Notes |
|---------|--------|-------|
| `TodoCard.vue` — priority/status severity, due date, overdue detection, emit click/statusChange/delete | implemented | PrimeVue Card + Tag |
| `TodoFilters.vue` — status/priority dropdowns, search, view mode toggle | implemented | PrimeVue Select + InputText + SelectButton |
| `TodoKanban.vue` — 3-column board (open/in_progress/done) | implemented | Grid layout with TodoCard |
| `TodoList.vue` — DataTable list + Kanban toggle, create dialog | implemented | All form fields, filter integration |
| `TodoDetail.vue` — view + edit mode, status/priority selectors | implemented | Full CRUD UI |
| `TodoSettings.vue` — list management with ColorPicker | implemented | DataTable + create form |
| No hardcoded colors | implemented | Uses PrimeVue tokens and Tailwind utilities |
| German labels (Offen, In Arbeit, Erledigt, etc.) | implemented | |

**Divergences:** None — all 6 components match spec.

---

### Task 10: Standalone Mode — index.ts + main.ts

**Status:** IMPLEMENTED

| Feature | Status | Notes |
|---------|--------|-------|
| Backend `index.ts` — `defineServer()` with port 3001 | implemented | Uses @framework/index |
| customDbSchema from todosSchema | implemented | |
| customHonoApps with /todos baseRoute | implemented | |
| jobHandlers from todosJobs | implemented | |
| Frontend `main.ts` — standalone Vue app | implemented | Pinia, router, PrimeVue |
| Router: /, /todos, /todos/settings, /todos/:id | implemented | |

**Divergences:** None — matches spec dual-mode pattern.

---

### Task 11: Integration in Super App

**Status:** IMPLEMENTED

| Feature | Status | Notes |
|---------|--------|-------|
| `template/backend/src/index.ts` imports todosPlugin | implemented | `plugin as todosPlugin` registered in module registry |
| `template/frontend/src/module-loader.ts` imports todosModule | implemented | Part of builtInModules array |

**Divergences:** None — integration wiring matches spec.

---

### Task 12: Security & Permission Tests

**Status:** PARTIAL

| Feature | Status | Notes |
|---------|--------|-------|
| `tests/security.test.ts` file | implemented | File exists |
| Authentication tests (401 for unauthenticated/invalid JWT) | partial | Tests exist but use `expect(401).toBe(401)` placeholder assertions |
| Authorization tests (403 without permissions) | partial | Placeholder assertions |
| Tenant isolation tests | partial | Placeholder assertions |
| Data privacy tests | partial | Placeholder assertions |

**Divergence:** All security tests are placeholder/structural tests that assert constants against themselves (e.g., `expect(401).toBe(401)`). The test file clearly documents what should be tested, but no actual HTTP requests are made. This is explicitly acknowledged in the spec with the note: "Die Security-Tests verwenden Placeholder. Bei der Implementierung mit echtem Server-Setup werden die Kommentare durch echten Code ersetzt."

**Priority:** medium — Security tests need real integration test setup to be meaningful.

---

### Task 13: README.md

**Status:** IMPLEMENTED

| Feature | Status | Notes |
|---------|--------|-------|
| README.md exists | implemented | |
| AGENTS.md exists | implemented | |
| Patterns table | implemented | |
| Structure diagram | implemented | |
| API endpoints table | implemented | |
| AI tools table | implemented | |
| Permissions table | implemented | |
| Development commands | implemented | |

**Divergences:** None.

---

## Cross-Cutting Observations

| Area | Status | Notes |
|------|--------|-------|
| Valibot (not Zod) throughout | implemented | All validation uses Valibot consistently |
| Table prefix convention (todos_*) | implemented | pgTableCreator correctly applied |
| Privacy pattern (sanitizeTodoForLLM) | implemented | No descriptions in LLM responses |
| Dual-mode pattern (standalone + integrated) | implemented | Both entry points functional |
| DI pattern for testability | implemented | All services/routes use factory + deps |
| PrimeVue Design Tokens (no hardcoded colors) | implemented | All components use tokens |

## Deviation Summary

| # | Type | Description | Priority | Fix Proposal |
|---|------|-------------|----------|-------------|
| D-01 | Minor | `checkGuardrail` return type differs slightly (allowed vs reached) | low | Functionally equivalent, no fix needed |
| D-02 | Convention | Default tools export uses stub deps (common framework pattern) | low | Replaced at runtime, no fix needed |
| D-03 | Partial | Security tests use placeholder assertions (no real integration tests) | medium | Implement actual integration test setup with test server |

## Overall Assessment

Phase 8 Todos module is the most comprehensive module in the Super App at 95% implementation grade. All 13 spec tasks have corresponding code covering the full stack: schema, services, routes, AI tools, plugin/module contracts, Pinia store, Vue views/components, standalone mode, integration wiring, and documentation. The only gap is the security tests which are structural placeholders rather than real integration tests. The module successfully demonstrates all architectural patterns specified: dual-mode, DI, privacy, guardrails, tenant isolation, and PrimeVue design tokens.
