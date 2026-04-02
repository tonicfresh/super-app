# Architecture

**Analysis Date:** 2026-04-02

## Pattern Overview

**Overall:** Federated Module Architecture with Centralized AI Orchestration

**Key Characteristics:**
- **Dual-Mode Modules**: Every module runs standalone (own server) OR integrated (merged into Super App)
- **Single Orchestrator Pattern**: One main agent delegates to sub-agents and module tools based on user intent
- **Permission-First**: All tools enforce permission checks before execution, guardrails before logic, privacy on output
- **One Framework, One Database**: All modules share the `fullstack-framework` and single PostgreSQL instance with prefixed tables
- **Privacy by Design**: LLM never sees sensitive data (emails, phones, passwords) — only IDs, flags, and sanitized outputs

---

## Layers

**Entry Point Layer:**
- Purpose: Initialize server, compose modules, define routes
- Location: `template/backend/src/index.ts`
- Contains: `defineServer()` call with merged schemas/routes/jobs/AI system
- Depends on: Module registry, framework, all plugins
- Used by: Bun runtime at startup

**Module Registry Layer:**
- Purpose: Dynamically register, discover, and compose modules at startup
- Location: `template/backend/src/module-registry.ts`
- Contains: `ModuleRegistry` interface and implementation with methods to merge schemas, routes, jobs, tools, permissions, guardrails
- Depends on: Module plugins via `@super-app/shared` types
- Used by: `index.ts`, AI system initialization

**Module Plugin Layer:**
- Purpose: Standard export contract that every module must implement
- Location: `modules/{name}/backend/src/plugin.ts` (every module)
- Contains: `moduleConfig`, `schema`, `routes`, `jobs`, `tools` exports
- Depends on: Module's own schema, routes, tools, service layer
- Used by: Module registry during composition

**AI System Layer:**
- Purpose: Orchestrate conversational AI across channels, manage tools, track costs, enforce guardrails
- Location: `template/backend/src/ai/`
- Contains:
  - `main-agent.ts` — ToolLoopAgent (Vercel AI SDK) that understands user intent and delegates
  - `module-connector.ts` — Loads module tools filtered by user permissions
  - `sub-agent.ts` — Creates specialized agents per module for complex tasks
  - `privacy.ts` — Sanitizes outputs to hide sensitive data from LLM
  - `cost-tracking.ts` — Logs token usage and costs to external service
  - `cost-guardrails.ts` — Enforces daily/hourly limits, approval requirements
  - `providers.ts` — Manages AI model registry (Anthropic, Mistral, OpenRouter)
  - `init.ts` — Initializes AI context with secrets, settings, DB callbacks
- Depends on: Module registry, permission system, guardrail config from DB, cost DB schema
- Used by: All channels (Telegram, PWA, API)

**Communication Channels Layer:**
- Purpose: Adapt input/output for different mediums
- Location: `template/backend/src/ai/channels/` and `template/backend/src/routes/`
- Contains:
  - `api.ts` — REST/WebSocket endpoint for PWA chat (`/api/v1/ai/chat`)
  - `approval-routes.ts` — Endpoints for approving/denying tool executions
  - `tenant/[tenantId]/chat/index.ts` — Chat routes (template entry point)
- Depends on: Main agent, approval service
- Used by: Frontend, PWA, Telegram bot (external)

**Service Layer:**
- Purpose: Business logic, database access, external integrations
- Location: `template/backend/src/services/` and `modules/{name}/backend/src/services/`
- Contains:
  - `approval.ts` — Handles tool approval workflows
  - `push-notification.ts` — Sends push notifications to users
  - Module-specific services (todos service, mail service, etc.)
- Depends on: Database, external APIs
- Used by: Tools, routes, job handlers

**Database Layer:**
- Purpose: Schema definitions, migrations, data access
- Location: `template/backend/src/db/schema.ts` and `modules/{name}/backend/src/db/schema.ts`
- Contains:
  - Framework tables: `users`, `tenants`, `teams`, `permissions`, `secrets`, `jobs`
  - App tables: `app_*` for Super App-specific data
  - Module tables: `{module}_*` prefixed for each module
  - AI tables: `mc_*` for mission control cost/audit logs
- Depends on: Drizzle ORM, PostgreSQL
- Used by: Service layer, job handlers, cost tracking

**Auth Layer:**
- Purpose: Handle authentication, permissions, invitation codes, settings
- Location: `template/backend/src/auth/`
- Contains:
  - `hanko-config.ts` — WebAuthn/Passkey via Hanko
  - `permission-setup.ts` — Initialize permission matrix from all modules
  - `seed-permissions.ts` — Seed default permissions on startup
  - `invitation-codes.routes.ts` — Admin endpoints for code generation
  - `module-auth-middleware.ts` — Check module access before tool execution
- Depends on: Database, Hanko API
- Used by: All routes, tool permission checks

**Frontend Shell Layer:**
- Purpose: App container, navigation, auth, theme
- Location: `template/frontend/src/`
- Contains:
  - `App.vue` — Root component with sidebar, top nav, auth guard
  - `router/` — Vue Router configuration
  - `stores/` — Pinia stores for auth, user, theme
  - `auth/` — Login/passkey UI
- Depends on: Vue Router, Pinia, PrimeVue
- Used by: All frontend routes and modules

**Module Frontend Layer:**
- Purpose: UI for individual modules
- Location: `modules/{name}/frontend/src/`
- Contains:
  - `module.ts` — Exports routes and navigation config
  - `views/` — Page components (lazy-loaded)
  - `components/` — Reusable UI components
  - `stores/` — Module-specific state
- Depends on: @super-app/shared types, PrimeVue
- Used by: Module loader at frontend startup

**Shared Types Layer:**
- Purpose: Single source of truth for all type contracts
- Location: `shared/src/types.ts`
- Contains:
  - `ModuleConfig` — Backend contract
  - `ModulePlugin` — Plugin export contract
  - `ModuleDefinition` — Frontend contract
  - `ToolResult` — Standardized tool response format
  - `ToolErrorCode` — Enum of error codes
  - `GuardrailConfig` — Limit configuration
  - `AICostEntry` — Cost logging format
- Depends on: Nothing
- Used by: All modules, main app, AI system

---

## Data Flow

**User Sends Message (Any Channel):**

1. **Input Reception** → Channel adapter (API route, Telegram bot) receives user message
2. **Auth Context** → Extract or resolve userId, tenantId from session/chat ID
3. **Main Agent Init** → `createMainAgent(userId, tenantId)` loads permissions and creates ToolLoopAgent
4. **Tool Loading** → `loadModuleTools()` filters all module tools by user's granted permissions
5. **Message Processing** → Main agent calls `generateText()` with message + tools
6. **Intent Reasoning** → AI SDK's ToolLoopAgent analyzes intent, decides which tools to call
7. **Tool Execution Loop** (AI SDK handles):
   - AI decides to call tool X
   - SDK invokes tool's `execute()` function
   - **Permission Check** → `checkScope("module:action")`
   - **Guardrail Check** → `checkGuardrail("module:action")` queries DB for daily/hourly limits
   - **Business Logic** → Service layer modifies data, triggers events
   - **Privacy Sanitization** → Output scrubbed (only IDs, flags, no secrets)
   - **Response Return** → `ToolResult { success, data|code|message }`
   - AI reads response, decides next step or stops
8. **Cost Logging** (fire-and-forget) → `logAICost()` posts to costs.fever-context.de
9. **Agent Step Logging** → Mission Control records step details (tool calls, tokens, timestamp)
10. **Final Response** → Channel adapter formats result and sends to user

**State Management:**
- **Auth State** → Pinia store on frontend, JWT in cookies
- **User Permissions** → Cached in-memory per session, checked before each tool
- **Guardrail State** → DB queried per tool execution, tracks hourly/daily usage
- **AI Session State** → Maintained by Vercel AI SDK during multi-step tool loops
- **Cost State** → Stored in `mc_ai_costs` table, aggregated in Mission Control dashboard

---

## Key Abstractions

**ModulePlugin:**
- Purpose: Contract that every module must fulfill to be composable
- Examples: `modules/todos/backend/src/plugin.ts`, `modules/mission-control/backend/src/plugin.ts`
- Pattern: Each plugin exports `{ config, schema, routes, jobs, tools }` in a single object, plus individual named exports for destructuring

**ToolResult:**
- Purpose: Standardized response format so AI knows success vs. failure, and why it failed
- Examples: `{ success: true, data: { id: "123", title: "Buy milk" } }` or `{ success: false, code: "LIMIT_REACHED", message: "..." }`
- Pattern: Discriminated union — `success` boolean determines if `data` or `code` fields are present

**Dual-Mode Entry Points:**
- Purpose: Enable each module to run standalone (own `index.ts` with `defineServer()`) or integrated (via `plugin.ts` exports)
- Examples:
  - Standalone: `modules/todos/backend/src/index.ts` → `defineServer({ customDbSchema: todosSchema, ... })`
  - Integrated: `template/backend/src/index.ts` → registry merges all schemas, routes, jobs
- Pattern: Shared business logic in `services/`, `db/schema.ts`, `tools.ts` — different entry points, same implementation

**Table Prefix Convention:**
- Purpose: Namespace tables in single PostgreSQL by module
- Examples: `todos_items`, `mail_messages`, `mc_agent_sessions`
- Pattern: `pgTableCreator((name) => 'mail_${name}')` creates a factory that prefixes all table names. Framework uses `base_*`, app uses `app_*`, each module uses `<module>_*`

**Privacy Sanitization:**
- Purpose: Never leak sensitive data to the LLM in tool responses
- Examples: Return `{ id, title, status, hasDescription }` not `{ id, title, status, description: "secret stuff" }`
- Pattern: Helper function (e.g., `sanitizeTodoForLLM()`) strips fields before returning `ToolResult`

**Permission Scope String:**
- Purpose: Granular, composable permissions system
- Examples: `"todos:read"`, `"todos:write"`, `"todos:delete"`, `"mail:send"`, `"mail:admin"`
- Pattern: `"<module>:<action>"` — base CRUD are `read|write|update|delete`, custom actions per module. Defined in `moduleConfig.permissions`, checked at tool execution time

---

## Entry Points

**Backend Server Entry:**
- Location: `template/backend/src/index.ts`
- Triggers: `bun run dev` or production deployment
- Responsibilities:
  1. Initialize module registry, register all plugins
  2. Validate Hanko env (auth provider)
  3. Initialize AI system (providers, cost tracking, guardrails)
  4. Call `defineServer()` with merged schemas, routes, jobs, AI routes
  5. Return Hono server object to framework

**Module Standalone Entry:**
- Location: `modules/{name}/backend/src/index.ts`
- Triggers: `bun run dev` from module directory
- Responsibilities:
  1. Import own plugin
  2. Call `defineServer()` with module's schema, routes, jobs
  3. Return Hono server for that module only
  4. Enables testing module in isolation

**Frontend Entry:**
- Location: `template/frontend/src/main.ts`
- Triggers: `bun run dev` or production build
- Responsibilities:
  1. Create Vue app with Pinia, Vue Router, i18n, PrimeVue
  2. Set up theme system (theme loader, CSS overrides)
  3. Load auth state from localStorage/session
  4. Mount app to `#app` element

**Chat Route Entry:**
- Location: `template/backend/src/routes/tenant/[tenantId]/chat/index.ts`
- Triggers: HTTP POST to `/api/v1/tenant/{tenantId}/chat`
- Responsibilities:
  1. Extract userId from JWT
  2. Validate request body (message, optional history)
  3. Initialize main agent for this user
  4. Call agent.generateText() with user message
  5. Log costs and agent steps to DB
  6. Return generated response

**AI System Initialization:**
- Location: `template/backend/src/ai/init.ts`
- Triggers: Called at server startup before `defineServer()`
- Responsibilities:
  1. Load provider config from env (ANTHROPIC_API_KEY, etc.)
  2. Create provider registry (which models available)
  3. Initialize cost tracker context (DB insert callback)
  4. Validate guardrail queries (daily total, module daily)
  5. Return `aiContext` object for use in routes

---

## Error Handling

**Strategy:** Structured error codes over exceptions. Tools always return `ToolResult`, never throw.

**Patterns:**

1. **Tool Execution Errors** → Return `{ success: false, code, message }`
   - `FORBIDDEN` → User lacks permission
   - `LIMIT_REACHED` → Daily/hourly limit exceeded
   - `NOT_FOUND` → Resource doesn't exist
   - `VALIDATION_ERROR` → Input doesn't match schema
   - `UNAVAILABLE` → External service down

2. **Permission Denied** → Middleware returns 403 Forbidden to client

3. **Database Errors** → Caught by framework, returns 500 to client (not exposed to LLM)

4. **AI Provider Errors** → Logged to cost tracker as failed attempt, returned to user as "I couldn't process that right now"

5. **Guardrail Breaches** → Tool execution halted, user informed of remaining quota

---

## Cross-Cutting Concerns

**Logging:**
- Agent steps logged to `mc_agent_sessions` table (for Mission Control dashboard)
- AI costs logged to external `costs.fever-context.de` API
- Debug logs go to stdout when `AI_DEBUG=true`
- Approval requests logged to `approval_requests` table

**Validation:**
- Input validation: Valibot schemas on tool parameters
- Database schema validation: Drizzle ORM enforces types at compile time
- Permission validation: `checkScope()` before any tool execution
- Guardrail validation: `checkGuardrail()` before tools with limits

**Authentication:**
- JWT-based with Hanko WebAuthn/Passkey support
- Invitation codes for new user signup (optional)
- Middleware `authAndSetUsersInfo` adds user context to all requests
- Module-level access control: `checkUserPermission` verifies user can access module

**Authorization:**
- Permission matrix seeded from all modules' `moduleConfig.permissions`
- Tenant-based isolation: all queries include `tenantId` filter
- Tool-level checks: `checkScope()` called inside every tool's `execute()` function
- Role-based guardrails: approval required for certain tools (dynamic per user type)

---

*Architecture analysis: 2026-04-02*
