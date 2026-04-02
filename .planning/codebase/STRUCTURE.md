# Codebase Structure

**Analysis Date:** 2026-04-02

## Directory Layout

```
super-app/                                  # Monorepo root (Bun workspaces)
├── template/                               # Main app template (submodule)
│   ├── backend/
│   │   ├── framework/                      # Fullstack framework (sub-submodule)
│   │   ├── src/
│   │   │   ├── index.ts                    # Server entry: defineServer() composition
│   │   │   ├── module-registry.ts          # Module discovery and composition
│   │   │   ├── ai/                         # AI orchestration system
│   │   │   │   ├── main-agent.ts           # ToolLoopAgent (Vercel AI SDK)
│   │   │   │   ├── sub-agent.ts            # Per-module specialized agents
│   │   │   │   ├── module-connector.ts     # Loads module tools and permissions
│   │   │   │   ├── privacy.ts              # Sanitizes outputs for LLM
│   │   │   │   ├── cost-tracking.ts        # Logs to external costs service
│   │   │   │   ├── cost-guardrails.ts      # Enforces limits
│   │   │   │   ├── providers.ts            # AI model registry
│   │   │   │   ├── init.ts                 # Startup initialization
│   │   │   │   ├── channels/               # Communication adapters
│   │   │   │   │   ├── api.ts              # REST/WebSocket endpoint
│   │   │   │   │   └── approval-routes.ts  # Approval workflow endpoints
│   │   │   │   ├── db/
│   │   │   │   │   └── schema.ts           # Mission Control cost tracking table
│   │   │   │   └── routes/
│   │   │   │       ├── costs.ts            # Cost tracking endpoints
│   │   │   │       └── settings.ts         # Model/provider settings
│   │   │   ├── auth/                       # Authentication & permissions
│   │   │   │   ├── hanko-config.ts         # WebAuthn passkey provider config
│   │   │   │   ├── permission-setup.ts     # Initialize permission matrix
│   │   │   │   ├── seed-permissions.ts     # Seed default permissions from modules
│   │   │   │   ├── invitation-codes.ts     # Signup code management
│   │   │   │   ├── module-auth-middleware.ts # Check module access per user
│   │   │   │   └── auth-config.routes.ts   # Public auth config endpoint
│   │   │   ├── db/                         # Framework-level schemas
│   │   │   │   ├── schema.ts               # Users, tenants, teams, permissions
│   │   │   │   └── push-subscriptions.schema.ts # Push notification subscriptions
│   │   │   ├── routes/                     # Main app routes
│   │   │   │   ├── tenant/[tenantId]/chat/ # Chat input/output handler
│   │   │   │   ├── ai-chat.ts              # AI chat routes
│   │   │   │   ├── push.ts                 # Push notification register endpoint
│   │   │   │   └── theme.ts                # Theme loading endpoint
│   │   │   ├── services/                   # Business logic
│   │   │   │   ├── approval.ts             # Tool approval workflow
│   │   │   │   └── push-notification.ts    # Push notification sending
│   │   │   ├── settings/                   # App settings UI
│   │   │   │   ├── settings.routes.ts      # Settings endpoints
│   │   │   │   └── settings-schema.ts      # Settings database schema
│   │   │   ├── scripts/
│   │   │   │   └── module-create.ts        # Script to scaffold new module
│   │   │   └── lib/                        # Utilities (from framework)
│   │   ├── drizzle.config.ts               # Drizzle migration config
│   │   ├── package.json
│   │   └── tests/
│   └── frontend/
│       ├── src/
│       │   ├── main.ts                     # Vue app entry point
│       │   ├── App.vue                     # Root component (shell, auth guard)
│       │   ├── module-loader.ts            # Dynamic module import at runtime
│       │   ├── router/
│       │   │   └── index.ts                # Vue Router config
│       │   ├── stores/                     # Pinia stores
│       │   │   ├── auth.ts                 # Auth state and methods
│       │   │   ├── user.ts                 # Current user profile
│       │   │   ├── theme.ts                # Theme selection
│       │   │   └── toast.ts                # Toast notifications
│       │   ├── auth/                       # Auth UI components
│       │   │   ├── PasskeyLogin.vue        # WebAuthn passkey login
│       │   │   └── InvitationCodeForm.vue  # Signup with code
│       │   ├── components/                 # Global/shell components
│       │   │   ├── Navigation.vue          # Sidebar and top nav
│       │   │   ├── ChatView.vue            # Main chat interface
│       │   │   └── PermissionGate.vue      # Shows UI only if user has permission
│       │   ├── views/                      # Page-level components
│       │   │   ├── admin/                  # Admin pages
│       │   │   │   ├── permissions.vue     # Permission management
│       │   │   │   ├── guardrails.vue      # Limit configuration
│       │   │   │   ├── modules.vue         # Module enable/disable
│       │   │   │   └── costs.vue           # Cost dashboard
│       │   │   └── chat/
│       │   │       └── index.vue           # Chat page
│       │   ├── composables/                # Vue composables
│       │   │   ├── useAuth.ts              # Auth logic
│       │   │   ├── useCost.ts              # Cost query helpers
│       │   │   └── useTheme.ts             # Theme logic
│       │   ├── i18n.ts                     # Internationalization setup
│       │   ├── locales/                    # Translation files
│       │   │   ├── de.json
│       │   │   └── en.json
│       │   ├── primevue-theme.ts           # PrimeVue unstyled config
│       │   ├── theme-loader.ts             # Dynamic theme loading
│       │   ├── volt/                       # PrimeVue Volt theme (local)
│       │   ├── utils/                      # Shared utilities
│       │   └── types/                      # TypeScript type definitions
│       ├── package.json
│       └── tests/
├── modules/                                # Feature modules (each a submodule)
│   ├── mission-control/                    # Agent monitoring (MANDATORY)
│   │   ├── backend/
│   │   │   ├── framework/                  # Submodule (shared framework)
│   │   │   ├── src/
│   │   │   │   ├── index.ts                # Standalone entry
│   │   │   │   ├── plugin.ts               # Integrated entry (config, schema, routes, tools)
│   │   │   │   ├── tools.ts                # AI tools (query sessions, audit log)
│   │   │   │   ├── routes/
│   │   │   │   │   ├── costs.ts            # Cost analytics endpoints
│   │   │   │   │   ├── sessions.ts         # Agent session history endpoints
│   │   │   │   │   └── audit.ts            # Audit log endpoints
│   │   │   │   ├── db/
│   │   │   │   │   └── schema.ts           # Agent sessions, audit log, cost aggregates
│   │   │   │   ├── services/
│   │   │   │   │   ├── cost-aggregator.ts  # Aggregate costs from DB
│   │   │   │   │   ├── session-query.ts    # Query agent sessions
│   │   │   │   │   └── audit-log.ts        # Manage audit trail
│   │   │   │   └── jobs/
│   │   │   │       └── cost-aggregation.ts # Daily job to sum costs
│   │   │   ├── drizzle.config.ts
│   │   │   ├── package.json
│   │   │   └── tests/
│   │   ├── frontend/
│   │   │   ├── src/
│   │   │   │   ├── main.ts                 # Standalone entry
│   │   │   │   ├── module.ts               # Integrated entry (routes, nav, permissions)
│   │   │   │   ├── views/
│   │   │   │   │   ├── CostsDashboard.vue  # Charts: costs over time, per module
│   │   │   │   │   ├── SessionHistory.vue  # Agent session timeline
│   │   │   │   │   └── AuditLog.vue        # Audit trail viewer
│   │   │   │   ├── components/
│   │   │   │   │   ├── CostChart.vue       # D3.js cost visualization
│   │   │   │   │   └── SessionDetails.vue  # Drill-down view
│   │   │   │   └── stores/
│   │   │   │       └── missions.ts         # Mission Control state
│   │   │   ├── package.json
│   │   │   └── tests/
│   │   ├── README.md                       # Module documentation
│   │   └── AGENTS.md                       # Claude instructions for module development
│   ├── todos/                              # Example reference module
│   │   ├── backend/
│   │   │   ├── framework/
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   ├── plugin.ts               # Exports config, schema, routes, jobs, tools
│   │   │   │   ├── tools.ts                # AI tools: createTodo, listTodos, updateTodo, deleteTodo
│   │   │   │   ├── routes/
│   │   │   │   │   ├── index.ts            # Express Hono route handlers
│   │   │   │   │   ├── todos.ts            # CRUD endpoints
│   │   │   │   │   └── lists.ts            # Todo list management
│   │   │   │   ├── db/
│   │   │   │   │   └── schema.ts           # todos_items, todos_lists, todos_labels
│   │   │   │   ├── services/
│   │   │   │   │   ├── todo-service.ts     # Business logic
│   │   │   │   │   └── list-service.ts
│   │   │   │   └── jobs/
│   │   │   │       └── index.ts            # Background jobs (reminders, cleanup)
│   │   │   ├── drizzle.config.ts
│   │   │   ├── package.json
│   │   │   └── tests/
│   │   ├── frontend/
│   │   │   ├── src/
│   │   │   │   ├── main.ts
│   │   │   │   ├── module.ts               # Exports routes, navigation, permissions
│   │   │   │   ├── views/
│   │   │   │   │   ├── TodosList.vue
│   │   │   │   │   ├── TodoDetail.vue
│   │   │   │   │   └── CreateTodo.vue
│   │   │   │   ├── components/
│   │   │   │   │   └── TodoItem.vue
│   │   │   │   └── stores/
│   │   │   │       └── todos.ts
│   │   │   ├── package.json
│   │   │   └── tests/
│   │   ├── README.md
│   │   └── AGENTS.md
│   ├── speech/                             # TTS/STT module
│   │   ├── backend/
│   │   ├── frontend/
│   │   ├── README.md
│   │   └── AGENTS.md
│   └── [future modules]
├── shared/                                 # Shared types & utilities (submodule)
│   ├── src/
│   │   ├── index.ts                        # Barrel export
│   │   ├── types.ts                        # TypeScript types
│   │   │   ├── ToolResult, ToolErrorCode
│   │   │   ├── ModuleConfig, ModulePlugin
│   │   │   ├── ModuleDefinition, RouteRecord
│   │   │   ├── GuardrailConfig
│   │   │   ├── AICostEntry
│   │   │   ├── AgentSessionLog
│   │   │   └── PushNotification
│   │   ├── guardrails.ts                   # Guardrail checking logic
│   │   ├── cost-tracking.ts                # Cost calculation utilities
│   │   ├── theme.ts                        # Theme type definitions and utilities
│   │   └── tests/
│   ├── package.json
│   └── tsconfig.json
├── themes/                                 # Design tokens and theme overrides
│   ├── default/                            # Default light theme
│   │   ├── tailwind.config.ts
│   │   ├── tokens.ts                       # Color, spacing, typography tokens
│   │   └── primevue-overrides.css          # PrimeVue component styling
│   └── cyberpunk/                          # Alternative theme
│       ├── tailwind.config.ts
│       └── primevue-overrides.css
├── side-projects/                          # Experimental/future ideas
│   └── voice-remote/                       # Voice control idea (not active)
├── scripts/
│   ├── module-create.ts                    # Scaffold new module (backend + frontend)
│   └── [other utilities]
├── docs/                                   # Architecture documentation
│   ├── superpowers/
│   │   ├── specs/
│   │   │   └── 2026-04-02-super-app-architecture-design.md
│   │   └── plans/
│   │       ├── 2026-04-02-phase1-shared-core.md
│   │       ├── 2026-04-02-phase2-auth-security.md
│   │       ├── 2026-04-02-phase3-ai-agent-system.md
│   │       ├── 2026-04-02-phase4-ai-providers-cost-tracking.md
│   │       ├── 2026-04-02-phase5-mission-control.md
│   │       ├── 2026-04-02-phase6-pwa-push-notifications.md
│   │       ├── 2026-04-02-phase7-theming-system.md
│   │       └── 2026-04-02-phase8-reference-module-todos.md
│   └── FAILS.md                            # Known issues and learnings
├── .planning/                              # GSD codebase mapping
│   └── codebase/
│       ├── ARCHITECTURE.md
│       ├── STRUCTURE.md
│       ├── CONVENTIONS.md
│       └── TESTING.md
├── .claude/                                # Claude Code integration
│   ├── agents/
│   ├── commands/
│   ├── hooks/
│   └── [GSD framework files]
├── CLAUDE.md                               # Project instructions for Claude
├── package.json                            # Bun workspace root
├── bun.lock                                # Bun lock file
└── [git, docker, config files]
```

---

## Directory Purposes

**template/**
- Purpose: Main Super App application (orchestrator that composes all modules)
- Contains: Backend server, frontend shell, framework submodule
- Key files: `backend/src/index.ts` (server entry), `frontend/src/main.ts` (client entry)

**modules/**
- Purpose: Feature modules that can run standalone OR integrated
- Contains: mission-control (mandatory), todos (reference), speech, and future modules (mail, contacts, docs, etc.)
- Key files: `{module}/backend/src/plugin.ts` (integration contract), `{module}/backend/src/tools.ts` (AI tools)

**shared/**
- Purpose: Single source of truth for types shared across all modules and the main app
- Contains: TypeScript interfaces, guardrail logic, cost utilities, theme types
- Key files: `src/types.ts` (core contracts), `src/guardrails.ts` (guardrail enforcement)

**docs/superpowers/**
- Purpose: Architecture specifications and implementation plans
- Contains: Phase-by-phase implementation roadmap (phases 1-8), architecture design spec
- Key files: `specs/2026-04-02-super-app-architecture-design.md` (the source of truth)

**themes/**
- Purpose: Design tokens and CSS overrides for theming
- Contains: Default and cyberpunk themes with Tailwind and PrimeVue customizations
- Key files: `{theme}/tokens.ts` (color/spacing/typography), `{theme}/primevue-overrides.css` (component styling)

**side-projects/**
- Purpose: Experimental features (not integrated into main app)
- Contains: Voice remote control idea (placeholder)

---

## Key File Locations

**Entry Points:**

| File | Purpose |
|------|---------|
| `template/backend/src/index.ts` | Backend server initialization — registers modules, initializes AI, returns Hono app |
| `template/frontend/src/main.ts` | Frontend Vue app initialization — sets up Pinia, Router, i18n, PrimeVue |
| `modules/{name}/backend/src/index.ts` | Module standalone entry — can run as own server with `bun run dev` |
| `modules/{name}/frontend/src/main.ts` | Module standalone frontend entry |

**Configuration:**

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project instructions for Claude (tech stack, architecture, phases) |
| `package.json` | Bun workspace root — defines workspace layout |
| `template/backend/drizzle.config.ts` | Database migration config |
| `shared/tsconfig.json` | TypeScript config for shared package |

**Core Logic:**

| File | Purpose |
|------|---------|
| `template/backend/src/module-registry.ts` | Module discovery, schema/route/job merging, permission aggregation |
| `template/backend/src/ai/main-agent.ts` | ToolLoopAgent initialization and configuration |
| `template/backend/src/ai/module-connector.ts` | Load tools filtered by user permissions, create sub-agents |
| `template/backend/src/ai/privacy.ts` | Output sanitization — prevent LLM from seeing sensitive data |
| `template/backend/src/auth/permission-setup.ts` | Initialize permission matrix from all modules |
| `shared/src/types.ts` | Type contracts: ModuleConfig, ModulePlugin, ToolResult, etc. |

**Testing:**

| File Pattern | Purpose |
|--------------|---------|
| `src/**/*.test.ts` | Unit/integration tests (using bun:test) |
| `template/backend/src/index.test.ts` | Server integration tests |
| `template/frontend/src/*.test.ts` | Component/composable tests |
| `modules/{name}/backend/tests/` | Module-specific tests |

---

## Naming Conventions

**Files:**

| Pattern | Example | Convention |
|---------|---------|-----------|
| Routes | `todos.routes.ts` | Hono route handlers, suffix `-routes.ts` |
| Services | `todo-service.ts` | Business logic, suffix `-service.ts` |
| Schemas | `schema.ts` | Drizzle ORM table definitions |
| Tests | `*.test.ts` | Use `.test.ts` suffix (bun:test convention) |
| Types | `types.ts` | TypeScript types and interfaces |
| Utilities | `cost-tracking.ts` | Helpers and utilities, descriptive hyphenated names |
| Configuration | `hanko-config.ts` | Config builders/validators, suffix `-config.ts` |

**Directories:**

| Pattern | Example | Purpose |
|---------|---------|---------|
| Module name | `modules/todos` | Lowercase, singular (but `contacts`, `messages` ok) |
| Semantic folders | `routes/`, `services/`, `db/` | Logical grouping by concern |
| Parameterized routes | `tenant/[tenantId]/chat/` | Square brackets for dynamic segments (Hono convention) |
| Barrel exports | `routes/index.ts` | `index.ts` exports all from directory |

**TypeScript:**

| Pattern | Example |
|---------|---------|
| Interface | `ModuleConfig`, `ToolResult`, `GuardrailConfig` |
| Type | `ToolErrorCode`, `AgentChannel` |
| Function | `createMainAgent()`, `sanitizeTodoForLLM()` |
| Constant | `MAIN_AGENT_INSTRUCTIONS`, `MAX_AGENT_STEPS` |
| Variable | `userId`, `tenantId`, `guardrail` |

---

## Where to Add New Code

**New Module (complete feature with AI):**
1. Create directory: `modules/{name}/`
2. Create backend: `modules/{name}/backend/` with structure:
   - `src/index.ts` — Standalone entry
   - `src/plugin.ts` — Integration contract (config, schema, routes, jobs, tools)
   - `src/tools.ts` — AI tool implementations with 4-step pattern
   - `src/routes/` — Hono route handlers
   - `src/db/schema.ts` — Drizzle table definitions (prefixed with `{name}_`)
   - `src/services/` — Business logic
   - `src/jobs/` — Background job handlers
   - `drizzle.config.ts` — Migration config
   - `package.json` — Dependencies
3. Create frontend: `modules/{name}/frontend/` with structure:
   - `src/main.ts` — Standalone entry
   - `src/module.ts` — Integration contract (routes, navigation, permissions)
   - `src/views/` — Page components
   - `src/components/` — Reusable components
   - `src/stores/` — Pinia stores
   - `package.json`
4. Register in main app: `template/backend/src/index.ts` → import plugin, call `registry.register()`
5. Documentation: `modules/{name}/README.md` and `modules/{name}/AGENTS.md`

**New AI Tool (within existing module):**
1. Add function to `modules/{name}/backend/src/tools.ts`
2. Follow 4-step pattern: Permission check → Guardrail check → Execute → ToolResult
3. Use Valibot for parameter validation
4. Sanitize output (no sensitive data to LLM)
5. Add test: `modules/{name}/backend/tests/tools.test.ts`
6. Register in module's `plugin.ts`

**New Admin Settings/Dashboard:**
1. Create route: `template/backend/src/routes/{setting-name}.ts`
2. Add to `index.ts` custom routes
3. Create frontend view: `template/frontend/src/views/admin/{setting-name}.vue`
4. Add to router in `template/frontend/src/router/index.ts`

**New Frontend Component:**
1. **Global component** (used by multiple modules): `template/frontend/src/components/{name}.vue`
2. **Module-specific component**: `modules/{name}/frontend/src/components/{name}.vue`
3. Use PrimeVue for consistency, style with Tailwind CSS and design tokens

**Database Schema Addition:**
1. Add table to appropriate `schema.ts`:
   - Framework-level: `template/backend/src/db/schema.ts` (prefix with `base_`)
   - App-level: `template/backend/src/db/schema.ts` (prefix with `app_`)
   - Module-level: `modules/{name}/backend/src/db/schema.ts` (prefix with `{name}_`)
2. Use `pgTableCreator((name) => 'prefix_${name}')` for prefixing
3. Run `bun run migrate` to generate migration
4. Never write migration SQL manually

**Shared Type Addition:**
1. Add interface/type to `shared/src/types.ts`
2. Export from `shared/src/index.ts`
3. Use in modules with: `import type { YourType } from "@super-app/shared"`

**Guardrail Configuration:**
1. Add to module's `moduleConfig.guardrails` in `plugin.ts`
2. Or update in UI: `template/frontend/src/views/admin/guardrails.vue`
3. Checked at runtime in tool's `execute()` via `checkGuardrail()`

---

## Special Directories

**template/backend/framework/**
- Purpose: Shared fullstack framework (git submodule)
- Generated: No (external repo)
- Committed: Submodule pointer only
- Contains: Hono base app, database utilities, JWT middleware, file handling, job system

**template/backend/drizzle-sql/**
- Purpose: Generated SQL migrations (output of `drizzle-kit generate`)
- Generated: Yes (auto-generated from schema changes)
- Committed: Yes (for reproducibility)

**template/backend/public/ and static/**
- Purpose: Static assets (HTML, CSS, JS that's not served by Vite)
- Generated: Depends on context
- Committed: Yes (public), No (built static)

**template/backend/logs/**
- Purpose: Local development log files
- Generated: Yes (at runtime)
- Committed: No (gitignored)

**template/backend/tmp/**
- Purpose: Temporary files during development
- Generated: Yes (at runtime)
- Committed: No (gitignored)

**template/frontend/public/**
- Purpose: Static assets (favicon, manifest for PWA, fonts)
- Generated: No
- Committed: Yes

**shared/node_modules/**
- Purpose: Dependencies (Bun manages this)
- Generated: Yes (bun install)
- Committed: No (gitignored)

**.planning/codebase/**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by `/gsd:map-codebase` command)
- Committed: Yes (for navigator/executor reference)
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md (as applicable)

**.claude/**
- Purpose: Claude Code integration (hooks, agents, commands)
- Generated: Partially (GSD framework injects files)
- Committed: Yes (custom hooks only, not GSD framework)

---

*Structure analysis: 2026-04-02*
