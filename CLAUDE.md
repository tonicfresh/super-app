# Super App

> Modulare, skalierbare Applikations-Plattform mit Sub-Repository-Architektur.

## Uebersicht
- **Ziel:** Persoenliche Productivity-Plattform (Mail, Todos, Contacts, Documents, Knowledge Base, etc.)
- **Zielgruppe:** Toby selbst, spaeter andere
- **Status:** In Entwicklung (Phase 1-8 geplant)
- **Prioritaet:** Hoch

## Tech Stack (Stand: 2026-04-03)

### Backend (`template/backend/package.json`)
| Paket | Version |
|-------|---------|
| Bun | 1.2.10 |
| Hono.js | 4.12.10 |
| Drizzle ORM | 0.45.2 |
| Vercel AI SDK | 6.0.143 |
| Valibot | 1.3.1 |
| pg | 8.20.0 |
| drizzle-kit | 0.31.10 |

### Frontend
| Paket | Version |
|-------|---------|
| Vue 3 | 3.5.31 |
| Tailwind CSS | 4.2.2 |
| PrimeVue | 4.5.4 |
| Pinia | 3.0.4 |
| Vue Router | 4.6.4 |
| vue-i18n | 11.3.0 |
| Valibot | 1.3.1 |

### Infrastruktur
| Komponente | Version |
|------------|---------|
| PostgreSQL | 17.9 |
| pgvector | 0.8.2 |
| Docker Image | pgvector/pgvector:pg17 |

## Projektstruktur
```
super-app/
├── template/                   # [Submodule] Fullstack App Template
│   ├── backend/
│   │   ├── framework/          # [Sub-submodule] fullstack-framework
│   │   └── src/                # Super App Backend
│   └── frontend/               # Super App Frontend (Vue 3)
├── modules/                    # Feature-Module (je ein Submodule)
│   ├── speech/                 # TTS & STT
│   └── mission-control/        # Agent Monitoring (mandatory)
├── shared/                     # Shared Types & Utilities (@super-app/shared)
├── themes/                     # Design Tokens + CSS Overrides
├── side-projects/              # Zukunftsideen (z.B. Voice Remote)
└── docs/                       # Architektur-Specs + Implementierungsplaene
```

## Entwicklungsumgebung
```bash
# Backend starten (Port 3100)
cd template/backend
bun run dev

# Frontend starten (Port 5173/5174)
cd template/frontend
bun run dev

# Migrations ausfuehren
cd template/backend
bun run migrate

# Neues Modul-Schema generieren
bun run app:generate
```

## Wichtige Dateien
- `docs/superpowers/specs/2026-04-02-super-app-architecture-design.md` — Architektur-Spec
- `docs/superpowers/plans/2026-04-02-phase*.md` — Implementierungsplaene (Phase 1-8)
- `template/backend/src/index.ts` — Backend Entry Point (defineServer)
- `template/backend/.env` — Umgebungsvariablen (NICHT committen!)

## Architektur-Prinzipien
- **Dual-Mode:** Jedes Modul laeuft standalone ODER integriert
- **Validation:** Valibot (NICHT Zod!)
- **ORM:** Drizzle ORM, NIEMALS raw SQL
- **Table Creator:** `pgTableCreator` pro Modul (Framework: `base_*`, App: `app_*`, Module: `<modul>_*`)
- **AI Tools:** Permission check → Guardrail check → Execute → ToolResult
- **Privacy:** LLM sieht nur IDs und Flags, niemals sensible Daten
- **Theming:** Keine hardcodierten Farben/Schatten/Radien — immer Design Tokens

## Implementierungsphasen
| Phase | Beschreibung | Status | Audit-Grade |
|-------|-------------|--------|-------------|
| 1 | Shared Core (Types, Utils, Registry) | Implementiert | 100% |
| 2 | Auth & Security (Passkey, Permissions) | Implementiert | 96% |
| 3 | AI Agent System (Main Agent, Sub-Agents) | Implementiert | 88% |
| 4 | AI Providers & Cost Tracking | Implementiert | 85% |
| 5 | Mission Control (Monitoring, Audit) | Teilweise (Stub-Deps) | 85% |
| 6 | PWA & Push Notifications | Implementiert | 90% |
| 7 | Theming System | Implementiert | 100% |
| 8 | Reference Module: Todos | Implementiert | 95% |

## Verbindungen
- **Framework:** github.com/tonicfresh/template_fullstack-app-toby
- **Speech-Modul:** github.com/tonicfresh/super-app-speech
- **PostgreSQL:** localhost:5432, DB: superapp, User: pg
- **Backend Port:** 3100 (3000 ist belegt)

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Super App — Codebase Audit & Stabilisierung**

Systematische Analyse der bestehenden Super-App-Codebase gegen die 8 geplanten Architektur-Phasen. Ziel ist es, alle Inkonsistenzen, Tech Debt, fehlende Implementierungen und Abweichungen von den Specs zu finden, priorisieren und schrittweise zu beheben. Toby entscheidet nach der Analyse, was umgesetzt wird.

**Core Value:** Die bestehende Codebase soll solide, konsistent und bereit fuer die geplanten Features sein — kein neuer Code auf wackeligem Fundament.

### Constraints

- **Tech Stack**: Bestehend — Bun, Hono, Vue 3, Drizzle, Valibot (NICHT Zod)
- **Framework**: Sub-Submodule, nicht direkt aenderbar (nur Super-App Code)
- **Backward Compatibility**: Bestehende Module (mission-control, todos) muessen weiter funktionieren
- **Validation**: Valibot (NICHT Zod!) — konsistent durch gesamte Codebase
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.9.3 - All backend and frontend code
- JavaScript - Package scripts, configuration files
- Shell/Bash - Docker compose, build scripts
- SQL - PostgreSQL migrations (via Drizzle Kit)
## Runtime
- Bun 1.2.10 (pinned in Dockerfile, native TypeScript + bunfig support)
- Bun
- Lockfile: `bun.lock` (present)
## Frameworks
- Hono.js 4.10.1 - Lightweight, edge-computing ready HTTP framework
- hono-openapi 1.1.0 - OpenAPI/Swagger integration for Hono
- @hono/swagger-ui 0.5.2 - Swagger UI middleware
- Vue 3 3.5.31 - Progressive framework with composition API
- Vite (rolldown-vite latest) - Next-gen build tool
- Tailwind CSS 4.2.2 - Utility-first CSS framework
- PrimeVue 4.5.4 - Component library
- Drizzle ORM 0.44.6 - Type-safe SQL query builder
- drizzle-kit 0.31.10 - Migration and schema generation CLI
- pg 8.16.3 - PostgreSQL client
- postgres 3.4.7 - Alternative PostgreSQL client
- pgvector 0.2.1 - Vector search/embeddings support
- Vercel AI SDK 6.0.143 - LLM integration framework
- @ai-sdk/anthropic 3.0.64 - Claude/Anthropic provider
- @ai-sdk/mistral 3.0.27 - Mistral provider
- @ai-sdk/vue 3.0.143 - Vue-specific AI SDK bindings
- @openrouter/ai-sdk-provider 2.3.3 - OpenRouter provider
- Valibot 1.3.1 - Schema validation library (NOT Zod)
- drizzle-valibot 0.4.2 - Valibot-Drizzle integration
- @ai-sdk/valibot 2.0.22 - Valibot integration for AI SDK
- @valibot/to-json-schema 1.6.0 - JSON schema generation from Valibot
- Pinia 3.0.4 - Vue state management
- Vue Router 4.6.4 - Client-side routing
- vue-i18n 11.3.0 - Internationalization
- Bun Test - Native Bun test runner (`.test.ts` files)
- Vitest - For speech module (not installed in main backend)
- TypeScript 5.9.3 - Static type checking
- Prettier 3.8.1 (backend), 3.6.2 (frontend) - Code formatting
- ts-morph 22.0.0 - AST manipulation for code generation
- Rolldown - High-performance bundler (via rolldown-vite)
- unplugin-icons 22.5.0 - Icon system
- unplugin-auto-import 20.3.0 - Auto-import Vue composition APIs
- unplugin-vue-components 30.0.0 - Auto-import Vue components
- @tailwindcss/vite 4.2.2 - Tailwind CSS integration
- vite-plugin-vue-devtools 8.1.1 - Vue DevTools integration
- nanoid 5.1.6 - Unique ID generation
- cron 4.3.3 - Cron job scheduling
- csv 6.4.1 - CSV parsing
- jsonwebtoken 9.0.2 - JWT token signing/verification
- nodemailer 7.0.9 - SMTP email delivery
- @aws-sdk/client-s3 3.1022.0 - AWS S3 file operations (included, not actively used)
- @aws-sdk/s3-request-presigner 3.1022.0 - S3 presigned URLs (included, not actively used)
- @hono/standard-validator 0.1.5 - Standard validator middleware
- @hono/valibot-validator 0.5.3 - Valibot validator middleware
- mitt 3.0.1 - Event emitter/pubsub
- tailwind-merge 3.5.0 - Tailwind CSS class merging
- nanoid 5.1.7 - Unique IDs (frontend)
## Configuration
- `.env.default` (repository, no secrets)
- `.env` (local, never committed - .gitignore)
- POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
- POSTGRES_CA (optional, for SSL connections)
- API Keys: ANTHROPIC_API_KEY, MISTRAL_API_KEY, OPENROUTER_API_KEY (runtime secrets)
- Email: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_SECURE, SMTP_DEFAULT_SENDER
- Encryption: SECRETS_AES_KEY, SECRETS_AES_IV (framework-level data encryption)
- JWT: JWT_PUBLIC_KEY, JWT_PRIVATE_KEY (token signing)
- Debug flags: WRITE_DEBUG_FILES, CRON_LOG, SMTP_DEBUG
- `tsconfig.json` - TypeScript compiler options (monorepo root)
- `tsconfig.app.json` (frontend) - App-specific TS config
- `tsconfig.node.json` (frontend) - Vite/build tool config
- `vite.config.ts` - Frontend build and dev server config
- `drizzle.config.ts` - Migration settings per workspace (app, framework)
- `.prettierrc.json` - Code formatting rules
- Monorepo with Bun workspaces
- Workspace definition: `template/backend`, `template/frontend`, `shared`, `modules/*/backend`, `modules/*/frontend`
## Platform Requirements
- Bun >= 1.2.10 (runtime)
- Node 20.19.0 or >= 22.12.0 (frontend engine field only)
- PostgreSQL 17.9 with pgvector extension
- Docker image: `oven/bun:1` as base
- PostgreSQL database with pgvector support
- Bun runtime (built, not requiring source)
## Database
- pgvector 0.8.2 - Vector embeddings/similarity search
- drizzle-orm with TypeScript first-class support
- Direct postgres client for migrations
- pgadmin container (development only, port 5050)
- Framework tables: `base_*` prefix (authentication, settings, tenants)
- App tables: `app_*` prefix (super-app specific features)
- Module tables: `<module>_*` prefix (e.g., `mc_*` for mission-control)
- Migrations tracked in `app_migrations` table
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Components: `PascalCase.vue` (e.g., `PushSettings.vue`, `Default.vue`)
- Test files: `[name].test.ts` (co-located with source)
- Utilities: `camelCase.ts` (e.g., `fetcher.ts`, `date.ts`)
- Composables: `use[Feature].ts` (e.g., `useTheme.ts`, `usePasskey.ts`)
- Stores (Pinia): `camelCase.ts` (e.g., `authStore.ts`, `main.ts`)
- Schema/Database: `schema.ts`
- Configuration: `[name].config.ts` (e.g., `drizzle.config.ts`)
- Composable factories: `createUse[Feature]()` — Takes deps object, returns composable interface
- Route handlers: `define[Feature]Routes()` — Takes app, path, deps, returns void
- Service creators: `create[Service]()` — Returns service object/class
- Example: `createUseTheme(deps)`, `defineSettingsRoutes(app, path, deps)`, `createCostTracker(deps)`
- camelCase for all variables and constants
- UPPERCASE_SNAKE_CASE only for immutable test fixtures (e.g., `TEST_EMAIL`, `TEST_PASSWORD`)
- Single-letter variables avoided; prefer descriptive names
- Private/internal: prefix with underscore in class context
- PascalCase for interfaces and types
- Suffix convention: `[Feature]Deps` for dependency interfaces, `[Feature]Return` for return types
- Example: `UseThemeDeps`, `UseThemeReturn`, `SettingsRouteDeps`, `CostTrackerDeps`
## Code Style
- **Frontend:** Prettier 3.6.2
- **Backend:** Prettier 3.8.1
- No ESLint or dedicated linter configured
- TypeScript strict mode enforced in all `tsconfig.json`
- Type-checking: `bun run type-check` (Vue)
- Order:
- `@framework` → `template/backend/framework/src`
- `@super-app/shared` → `shared/src`
- No aliases configured for relative imports — use relative paths
## Error Handling
- **Fire-and-forget with try-catch:**
- **Throw on critical paths:**
- **Database errors in tests:**
- **HTTP errors (Hono):**
- **Validation errors (Valibot):**
- Sensitive operations (auth, payments): throw and let middleware handle
- UI operations (theme, preferences): catch, log, don't block user
- Database operations: catch and log, decide if operation is essential
- External API calls: catch, log, may have fallback behavior
## Logging
- Prefix with `[module]` for context: `console.warn("[auth] ...")`, `console.error("[useTheme] ...")`
- Log level usage:
- Never log sensitive data (emails, passwords, tokens)
- Always log enough context to debug (function name, operation, error type)
## Comments
- JSDoc on public functions and types
- Inline comments for non-obvious business logic or workarounds
- Avoid obvious comments (e.g., don't comment `const x = 5;`)
- German comments acceptable for business logic explanations
- Used on public API functions (composables, route handlers, services)
- Parameters documented with `@param`
- Return type documented with `@returns` (though TypeScript handles most)
- Example from codebase:
## Function Design
- Target: < 50 lines for single-responsibility
- Composables: 30-60 lines typical (setup + getters + methods)
- Test suites: 10-30 lines per test case
- Prefer dependency injection objects over multiple parameters
- Example: `createUseTheme(deps)` where `deps: UseThemeDeps` contains all needed functions
- Maximum 3-4 parameters; beyond that use object pattern
- Composables return object with getters and async methods
- Services return typed objects (not void)
- Tests use `expect()` — no return values
- Example composable return:
## Module Design
- Named exports for types and functions
- Example:
- No default exports in utility/service files
- Used in framework: `template/backend/framework/src/index.ts` exports core types
- Not used in app-level modules (import from specific files)
- Feature = Directory with related code
- Each feature directory contains:
- Components: `src/components/`
- Composables: `src/composables/`
- Stores: `src/stores/`
- Utils: `src/utils/`
- Each composable/store has co-located `.test.ts` file
## Validation
- All input validation uses Valibot schemas
- Example: `v.object({ tenantId: v.string() })`
- Route handlers use `@hono/valibot-validator` middleware
- Cost tracking validates numerics: `tokensInput >= 0`, `costUsd >= 0`
## Privacy & Security
- LLM context: Never send actual user data, only IDs and flags
- Tool responses: Check with `containsSensitiveData()` before passing to LLM
- Patterns defined in `template/backend/src/ai/privacy.ts` (email, phone, password, API keys)
- Cost tracking: Never log actual email/phone in cost entries
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- **Dual-Mode Modules**: Every module runs standalone (own server) OR integrated (merged into Super App)
- **Single Orchestrator Pattern**: One main agent delegates to sub-agents and module tools based on user intent
- **Permission-First**: All tools enforce permission checks before execution, guardrails before logic, privacy on output
- **One Framework, One Database**: All modules share the `fullstack-framework` and single PostgreSQL instance with prefixed tables
- **Privacy by Design**: LLM never sees sensitive data (emails, phones, passwords) — only IDs, flags, and sanitized outputs
## Layers
- Purpose: Initialize server, compose modules, define routes
- Location: `template/backend/src/index.ts`
- Contains: `defineServer()` call with merged schemas/routes/jobs/AI system
- Depends on: Module registry, framework, all plugins
- Used by: Bun runtime at startup
- Purpose: Dynamically register, discover, and compose modules at startup
- Location: `template/backend/src/module-registry.ts`
- Contains: `ModuleRegistry` interface and implementation with methods to merge schemas, routes, jobs, tools, permissions, guardrails
- Depends on: Module plugins via `@super-app/shared` types
- Used by: `index.ts`, AI system initialization
- Purpose: Standard export contract that every module must implement
- Location: `modules/{name}/backend/src/plugin.ts` (every module)
- Contains: `moduleConfig`, `schema`, `routes`, `jobs`, `tools` exports
- Depends on: Module's own schema, routes, tools, service layer
- Used by: Module registry during composition
- Purpose: Orchestrate conversational AI across channels, manage tools, track costs, enforce guardrails
- Location: `template/backend/src/ai/`
- Contains:
- Depends on: Module registry, permission system, guardrail config from DB, cost DB schema
- Used by: All channels (Telegram, PWA, API)
- Purpose: Adapt input/output for different mediums
- Location: `template/backend/src/ai/channels/` and `template/backend/src/routes/`
- Contains:
- Depends on: Main agent, approval service
- Used by: Frontend, PWA, Telegram bot (external)
- Purpose: Business logic, database access, external integrations
- Location: `template/backend/src/services/` and `modules/{name}/backend/src/services/`
- Contains:
- Depends on: Database, external APIs
- Used by: Tools, routes, job handlers
- Purpose: Schema definitions, migrations, data access
- Location: `template/backend/src/db/schema.ts` and `modules/{name}/backend/src/db/schema.ts`
- Contains:
- Depends on: Drizzle ORM, PostgreSQL
- Used by: Service layer, job handlers, cost tracking
- Purpose: Handle authentication, permissions, invitation codes, settings
- Location: `template/backend/src/auth/`
- Contains:
- Depends on: Database, Hanko API
- Used by: All routes, tool permission checks
- Purpose: App container, navigation, auth, theme
- Location: `template/frontend/src/`
- Contains:
- Depends on: Vue Router, Pinia, PrimeVue
- Used by: All frontend routes and modules
- Purpose: UI for individual modules
- Location: `modules/{name}/frontend/src/`
- Contains:
- Depends on: @super-app/shared types, PrimeVue
- Used by: Module loader at frontend startup
- Purpose: Single source of truth for all type contracts
- Location: `shared/src/types.ts`
- Contains:
- Depends on: Nothing
- Used by: All modules, main app, AI system
## Data Flow
- **Auth State** → Pinia store on frontend, JWT in cookies
- **User Permissions** → Cached in-memory per session, checked before each tool
- **Guardrail State** → DB queried per tool execution, tracks hourly/daily usage
- **AI Session State** → Maintained by Vercel AI SDK during multi-step tool loops
- **Cost State** → Stored in `mc_ai_costs` table, aggregated in Mission Control dashboard
## Key Abstractions
- Purpose: Contract that every module must fulfill to be composable
- Examples: `modules/todos/backend/src/plugin.ts`, `modules/mission-control/backend/src/plugin.ts`
- Pattern: Each plugin exports `{ config, schema, routes, jobs, tools }` in a single object, plus individual named exports for destructuring
- Purpose: Standardized response format so AI knows success vs. failure, and why it failed
- Examples: `{ success: true, data: { id: "123", title: "Buy milk" } }` or `{ success: false, code: "LIMIT_REACHED", message: "..." }`
- Pattern: Discriminated union — `success` boolean determines if `data` or `code` fields are present
- Purpose: Enable each module to run standalone (own `index.ts` with `defineServer()`) or integrated (via `plugin.ts` exports)
- Examples:
- Pattern: Shared business logic in `services/`, `db/schema.ts`, `tools.ts` — different entry points, same implementation
- Purpose: Namespace tables in single PostgreSQL by module
- Examples: `todos_items`, `mail_messages`, `mc_agent_sessions`
- Pattern: `pgTableCreator((name) => 'mail_${name}')` creates a factory that prefixes all table names. Framework uses `base_*`, app uses `app_*`, each module uses `<module>_*`
- Purpose: Never leak sensitive data to the LLM in tool responses
- Examples: Return `{ id, title, status, hasDescription }` not `{ id, title, status, description: "secret stuff" }`
- Pattern: Helper function (e.g., `sanitizeTodoForLLM()`) strips fields before returning `ToolResult`
- Purpose: Granular, composable permissions system
- Examples: `"todos:read"`, `"todos:write"`, `"todos:delete"`, `"mail:send"`, `"mail:admin"`
- Pattern: `"<module>:<action>"` — base CRUD are `read|write|update|delete`, custom actions per module. Defined in `moduleConfig.permissions`, checked at tool execution time
## Entry Points
- Location: `template/backend/src/index.ts`
- Triggers: `bun run dev` or production deployment
- Responsibilities:
- Location: `modules/{name}/backend/src/index.ts`
- Triggers: `bun run dev` from module directory
- Responsibilities:
- Location: `template/frontend/src/main.ts`
- Triggers: `bun run dev` or production build
- Responsibilities:
- Location: `template/backend/src/routes/tenant/[tenantId]/chat/index.ts`
- Triggers: HTTP POST to `/api/v1/tenant/{tenantId}/chat`
- Responsibilities:
- Location: `template/backend/src/ai/init.ts`
- Triggers: Called at server startup before `defineServer()`
- Responsibilities:
## Error Handling
## Cross-Cutting Concerns
- Agent steps logged to `mc_agent_sessions` table (for Mission Control dashboard)
- AI costs logged to external `costs.fever-context.de` API
- Debug logs go to stdout when `AI_DEBUG=true`
- Approval requests logged to `approval_requests` table
- Input validation: Valibot schemas on tool parameters
- Database schema validation: Drizzle ORM enforces types at compile time
- Permission validation: `checkScope()` before any tool execution
- Guardrail validation: `checkGuardrail()` before tools with limits
- JWT-based with Hanko WebAuthn/Passkey support
- Invitation codes for new user signup (optional)
- Middleware `authAndSetUsersInfo` adds user context to all requests
- Module-level access control: `checkUserPermission` verifies user can access module
- Permission matrix seeded from all modules' `moduleConfig.permissions`
- Tenant-based isolation: all queries include `tenantId` filter
- Tool-level checks: `checkScope()` called inside every tool's `execute()` function
- Role-based guardrails: approval required for certain tools (dynamic per user type)
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
