# Super App

A modular, scalable application platform built on a sub-repository architecture. Each functional module is an independent, reusable package that works **standalone** as its own application — or integrates seamlessly into the Super App as a managed module.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Foundation: The Framework](#foundation-the-framework)
- [Dual-Mode Architecture](#dual-mode-architecture)
- [Module Structure](#module-structure)
- [Permissions & Access Control](#permissions--access-control)
- [Plugin System](#plugin-system)
- [AI Agent System](#ai-agent-system)
- [Services](#services)
- [Security](#security)
- [Design System & Consistency](#design-system--consistency)
- [PWA & Push Notifications](#pwa--push-notifications)
- [Theming System](#theming-system)
- [Getting Started](#getting-started)
- [Adding a Module](#adding-a-module)
- [Consistency Guidelines](#consistency-guidelines)

---

## Architecture Overview

```
super-app/
├── template/                   # Fullstack app template (submodule)
│   ├── backend/
│   │   ├── framework/          # Core framework (sub-submodule)
│   │   └── src/                # Super App backend logic
│   └── frontend/               # Super App frontend (Vue 3 shell)
├── modules/                    # Feature modules (each a submodule)
│   ├── speech/                 # TTS & STT
│   ├── mail/                   # Email client
│   ├── todos/                  # Task management
│   ├── knowledge-base/         # Knowledge management & RAG
│   ├── documents/              # Document processing & digital office
│   └── .../                    # Additional modules
├── agents/                     # AI agent definitions
│   ├── main-agent/             # Central orchestration agent
│   └── sub-agents/             # Specialized task agents
├── services/                   # Background services (24/7)
├── plugins/                    # Installable plugins (via UI)
├── design-system/              # Shared UI components & theming
├── skills/                     # Reusable AI skill definitions
└── shared/                     # Shared types, utils, interfaces
```

---

## Foundation: The Framework

The entire platform is built on top of the **fullstack-framework** — a production-ready application framework that provides all infrastructure a module needs. It is embedded as a Git sub-submodule inside the template.

### What the Framework provides

| Layer | Capabilities |
|-------|-------------|
| **Server** | `defineServer()` — Hono.js web server with hot-reload (Bun) |
| **Authentication** | JWT, Magic Links, OAuth2, Phone Auth, Token Auth |
| **Multi-Tenancy** | Tenant-based data isolation, teams, invitations |
| **Permissions** | Scope-based access control, permission groups |
| **Database** | Drizzle ORM + PostgreSQL, framework schema + app schema separation |
| **Knowledge/RAG** | Embeddings (pgvector), similarity search, chunking, PDF parsing |
| **AI** | Vercel AI SDK integration, tool-loop agents |
| **Files** | S3 + local storage, temporary files, presigned URLs |
| **Jobs** | Background job queue with cron scheduling |
| **Plugins** | Runtime plugin system with lifecycle management |
| **Secrets** | AES-encrypted secret storage per tenant |
| **Webhooks** | CRUD + event-triggered outbound webhooks |
| **WebSockets** | Org-scoped real-time connections |
| **Email** | SMTP via Nodemailer |
| **Communication** | WhatsApp integration |

### How modules use the Framework

Every module — whether running standalone or integrated — uses the same framework via `defineServer()`:

```typescript
import { defineServer } from "@framework/index";
import { mySchema } from "./db/schema";
import { myRoutes } from "./routes";

const server = defineServer({
  port: 3001,
  appName: "My Module",
  customDbSchema: { ...mySchema },
  customHonoApps: [{ baseRoute: "/my-module", app: myRoutes }],
});
```

This guarantees that every module has identical infrastructure: same auth, same database patterns, same job system, same API structure.

---

## Dual-Mode Architecture

**The central design principle:** Every module has two entry points — one for standalone use, one for integration into the Super App. The business logic, routes, components, and database schema are **shared and identical** between both modes.

### How it works

```
┌─────────────────────────────────────────────────────┐
│                    SUPER APP                         │
│  ┌───────────────────────────────────────────────┐  │
│  │  Frontend Shell (Vue 3)                       │  │
│  │  Navigation · Auth · Module Loader            │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐     │  │
│  │  │ Mail UI  │ │ Todos UI │ │ Docs UI  │     │  │
│  │  └──────────┘ └──────────┘ └──────────┘     │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Backend (single defineServer)                │  │
│  │  Auth · Tenants · Permissions · Jobs          │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐     │  │
│  │  │ Mail API │ │Todos API │ │ Docs API │     │  │
│  │  └──────────┘ └──────────┘ └──────────┘     │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Framework (submodule)                        │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

        ↕ Same code, different entry point ↕

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Mail App    │  │  Todos App   │  │  Docs App    │
│  (Standalone)│  │  (Standalone)│  │  (Standalone)│
│  Own Server  │  │  Own Server  │  │  Own Server  │
│  Own Auth    │  │  Own Auth    │  │  Own Auth    │
│  Own DB      │  │  Own DB      │  │  Own DB      │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Backend: Dual Entry Points

**Standalone mode** — the module runs its own server:

```typescript
// modules/mail/backend/src/index.ts
import { defineServer } from "@framework/index";
import { mailSchema, mailRoutes, mailJobs } from "./plugin";

const server = defineServer({
  port: 3001,
  appName: "Mail",
  customDbSchema: mailSchema,
  customHonoApps: [{ baseRoute: "/mail", app: mailRoutes }],
  jobHandlers: mailJobs,
});
```

**Integrated mode** — the Super App imports the module's exports:

```typescript
// modules/mail/backend/src/plugin.ts
export { mailSchema } from "./db/schema";
export { mailRoutes } from "./routes";
export { mailJobs } from "./jobs";
export const moduleConfig = {
  name: "mail",
  version: "1.0.0",
  permissions: ["mail:read", "mail:send", "mail:settings", "mail:admin"],
};
```

**Super App backend** — composes all modules into one server:

```typescript
// super-app/template/backend/src/index.ts
import { defineServer } from "@framework/index";
import { mailSchema, mailRoutes, mailJobs } from "../../modules/mail/backend/src/plugin";
import { todosSchema, todosRoutes, todosJobs } from "../../modules/todos/backend/src/plugin";

const server = defineServer({
  port: 3000,
  appName: "Super App",
  customDbSchema: { ...mailSchema, ...todosSchema },
  customHonoApps: [
    { baseRoute: "/mail", app: mailRoutes },
    { baseRoute: "/todos", app: todosRoutes },
  ],
  jobHandlers: [...mailJobs, ...todosJobs],
});
```

### Frontend: Dual Entry Points

**Standalone mode** — the module runs as its own Vue application:

```typescript
// modules/mail/frontend/src/main.ts
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
const app = createApp(App);
app.use(router);
app.mount("#app");
```

**Integrated mode** — the module exports its routes and components for the Super App shell:

```typescript
// modules/mail/frontend/src/module.ts
export const mailModule = {
  name: "mail",
  routes: [
    { path: "/mail", component: () => import("./views/Inbox.vue") },
    { path: "/mail/compose", component: () => import("./views/Compose.vue") },
    { path: "/mail/settings", component: () => import("./views/Settings.vue") },
  ],
  navigation: {
    label: "Mail",
    icon: "mail",
    position: "sidebar",
  },
  permissions: ["mail:read"],
};
```

**Super App frontend** — dynamically loads all module UIs:

```typescript
// super-app/template/frontend/src/module-loader.ts
import { mailModule } from "../../modules/mail/frontend/src/module";
import { todosModule } from "../../modules/todos/frontend/src/module";

export const registeredModules = [mailModule, todosModule];
// The shell iterates these to build navigation, register routes,
// and check permissions before rendering.
```

---

## Module Structure

Every module follows this exact directory structure. No exceptions — consistency is mandatory.

```
modules/<module-name>/
├── backend/
│   ├── framework/              # Framework submodule (identical everywhere)
│   ├── src/
│   │   ├── index.ts            # Standalone entry: defineServer({...})
│   │   ├── plugin.ts           # Integrated entry: exports schema, routes, config
│   │   ├── routes/             # Hono route handlers
│   │   ├── db/
│   │   │   └── schema.ts       # Drizzle schema (module-prefixed tables)
│   │   ├── jobs/               # Background job handlers
│   │   └── services/           # Business logic
│   ├── drizzle.config.ts
│   ├── package.json
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── main.ts             # Standalone entry: own Vue app
│   │   ├── module.ts           # Integrated entry: exports routes, nav, permissions
│   │   ├── views/              # Page components
│   │   ├── components/         # Reusable UI components
│   │   └── stores/             # Pinia stores
│   ├── package.json
│   └── vite.config.ts
├── README.md                   # Module documentation
└── AGENTS.md                   # AI agent instructions for this module
```

### Module `plugin.ts` contract

Every module MUST export the following from `plugin.ts`:

```typescript
// Required exports
export const moduleConfig = {
  name: string;          // Unique module identifier (e.g. "mail")
  version: string;       // Semver version
  permissions: string[]; // All permission scopes this module uses
};

// Optional exports (depending on module capabilities)
export { schema }    from "./db/schema";    // Drizzle table definitions
export { routes }    from "./routes";       // Hono route handlers
export { jobs }      from "./jobs";         // Background job handlers
```

### Module `module.ts` contract (frontend)

Every module with a UI MUST export the following from `module.ts`:

```typescript
export const moduleDefinition = {
  name: string;          // Must match backend moduleConfig.name
  routes: RouteRecord[]; // Vue Router route definitions
  navigation: {
    label: string;       // Display name in sidebar/nav
    icon: string;        // Icon identifier
    position: "sidebar" | "topbar" | "hidden";
  };
  permissions: string[]; // Required permissions to see this module
};
```

---

## Permissions & Access Control

The Super App provides a centralized permission system. Module access is controlled at the tenant/organization level.

### Permission Scopes

Every module declares its permission scopes. The Super App admin assigns these per user or team:

```
Module "mail":
  - mail:read          # View emails
  - mail:send          # Send emails
  - mail:settings      # Manage mail accounts
  - mail:admin         # Full access

Module "todos":
  - todos:read         # View tasks
  - todos:write        # Create/edit tasks
  - todos:admin        # Manage all tasks
```

### Access Matrix Example

| User | Assigned Permissions | Visible Modules |
|------|---------------------|-----------------|
| Admin | `*` (all) | All modules |
| User A | `mail:read`, `mail:send`, `todos:*` | Mail (read/send), Todos (full) |
| User B | `mail:read` | Mail (read-only) |
| User C | `todos:read` | Todos (read-only) |

### How it works

1. **Backend:** The framework middleware checks permissions before executing route handlers. Modules do not implement their own auth — the framework handles it.
2. **Frontend:** The module loader checks permissions before registering routes and rendering navigation items. Unauthorized modules are invisible.
3. **Standalone mode:** The module uses its own tenant/permission setup via the same framework — the mechanism is identical.

---

## Plugin System

Plugins are **different from modules**. Modules are core building blocks developed and maintained as part of the platform. Plugins are optional, community-driven extensions installed at runtime.

| Aspect | Module | Plugin |
|--------|--------|--------|
| Deployment | Git submodule, compiled into the app | Installed at runtime via UI |
| Development | Same framework, same structure | Plugin API, sandboxed |
| Persistence | Always present in the repo | Stored in database/filesystem |
| Updates | Git pull + rebuild | Hot-update via UI |
| Trust level | Full system access | Sandboxed, scoped permissions |

### Plugin capabilities

- **Plugin Marketplace** — browse and install plugins from the frontend UI
- **Hot-loading** — activate/deactivate without restarting the application
- **Sandboxed execution** — plugins run in isolated contexts with defined permissions
- **Plugin API** — stable, versioned interface for plugin developers

---

## AI Agent System

A hierarchical agent architecture with a central **Main Agent** that orchestrates specialized **Sub-Agents**. Each agent operates within defined boundaries and capabilities.

- **Main Agent** — routing, orchestration, context management, user interaction
- **Sub-Agents** — domain-specific tasks (analysis, generation, automation)
- **Skills** — reusable, composable AI capabilities that can be attached to any agent

Agents can interact with modules through the same API routes that the frontend uses. Modules can also register their own agent tools via `plugin.ts`.

---

## Services

Long-running background services designed for 24/7 reliability:

- Health monitoring & auto-recovery
- Scheduled tasks & cron jobs (via framework job system)
- Queue processing
- External API integrations
- Service watchdogs

Services are deployed independently and communicate with the Super App via API.

---

## Security

Security is a first-class concern across the entire platform.

### Minimal `.env`

Only absolute essentials belong in `.env` files:

```env
# ONLY these values in .env — nothing else
DATABASE_URL=postgresql://...
ENCRYPTION_KEY=...
PORT=3000
```

**Everything else** — API keys, service credentials, SMTP settings, integration tokens — is managed through the **application settings UI** and stored encrypted in the database.

### Security principles

- **Encrypted storage** — all secrets entered via the UI are AES-encrypted at rest
- **Scoped access** — modules and plugins only access credentials they are explicitly granted
- **Audit logging** — all secret access and configuration changes are logged
- **No secrets in code** — strict separation between code and configuration
- **Per-tenant isolation** — each tenant's data and secrets are fully isolated
- **Framework-managed auth** — modules never implement their own authentication

---

## Design System & Consistency

A unified design system ensures visual and behavioral consistency across all modules and the Super App frontend.

### Stack

| Layer | Technology |
|-------|-----------|
| **CSS Framework** | Tailwind CSS v4 |
| **Component Library** | PrimeVue + Volt theme components |
| **Icons** | Iconify (unplugin-icons) |
| **State Management** | Pinia |
| **Routing** | Vue Router |
| **Internationalization** | vue-i18n |
| **Validation** | Valibot (shared between frontend and backend) |
| **Charts** | ApexCharts (vue3-apexcharts) |

### Consistency rules

These apply to **every** module, no exceptions:

1. **Same framework** — every module uses `fullstack-framework` as a submodule
2. **Same structure** — every module follows the exact directory layout defined above
3. **Same entry points** — `index.ts` (standalone) + `plugin.ts` (integrated) for backend, `main.ts` + `module.ts` for frontend
4. **Same UI components** — use PrimeVue/Volt components, never custom equivalents
5. **Same styling** — Tailwind CSS v4 with the shared design tokens
6. **Same validation** — Valibot schemas, shared between frontend and backend where possible
7. **Same API patterns** — Hono routes following framework conventions (tenant-scoped, permission-checked)
8. **Same database patterns** — Drizzle ORM, module-prefixed table names, framework migrations
9. **Same auth flow** — framework-managed, never custom
10. **Same error handling** — framework response helpers
11. **Same i18n structure** — locale JSON files per module, following the established naming pattern
12. **Same testing patterns** — framework test utilities (`initTests()`, `testFetcher`)

### Consistency rules

These apply to **every** module, no exceptions:

1. **Same framework** — every module uses `fullstack-framework` as a submodule
2. **Same structure** — every module follows the exact directory layout defined above
3. **Same entry points** — `index.ts` (standalone) + `plugin.ts` (integrated) for backend, `main.ts` + `module.ts` for frontend
4. **Same UI components** — use PrimeVue/Volt components, never custom equivalents
5. **Same styling** — Tailwind CSS v4 with the shared design tokens
6. **Same validation** — Valibot schemas, shared between frontend and backend where possible
7. **Same API patterns** — Hono routes following framework conventions (tenant-scoped, permission-checked)
8. **Same database patterns** — Drizzle ORM, module-prefixed table names, framework migrations, NEVER raw SQL
9. **Same auth flow** — framework-managed, never custom
10. **Same error handling** — framework response helpers
11. **Same i18n structure** — locale JSON files per module, following the established naming pattern
12. **Same testing patterns** — framework test utilities (`initTests()`, `testFetcher`)
13. **Same tool pattern** — permission check → guardrail check → execute → ToolResult response
14. **Same privacy rules** — LLM sees only IDs and flags, never sensitive data
15. **Same cost tracking** — automatic via `onStepFinish`, modules do NOT implement their own
16. **Same theming** — never hardcode colors, shadows, border-radii, or fonts. Always use PrimeVue Design Tokens and Tailwind CSS Custom Properties
17. **Same notification pattern** — use central push notification service, never custom per-module push implementations

### Table naming convention

To avoid schema collisions between modules, all tables MUST be prefixed with the module name:

```typescript
// modules/mail/backend/src/db/schema.ts
export const mailAccounts = pgTable("mail_accounts", { ... });
export const mailMessages = pgTable("mail_messages", { ... });

// modules/todos/backend/src/db/schema.ts
export const todosItems = pgTable("todos_items", { ... });
export const todosLists = pgTable("todos_lists", { ... });
```

---

## PWA & Push Notifications

The Super App is a **Progressive Web App** — the primary user interface for both mobile and desktop. No native app required.

### Key Features

- **Mobile:** Fullscreen PWA with native-app feel, installable via "Add to Home Screen"
- **Desktop:** Standard browser experience with full feature set
- **AI Chat:** Built-in chat interface using AI SDK Vue hooks (`@ai-sdk/vue`)
- **Push Notifications:** Agent approvals, module alerts, system messages — iOS 16.4+, Android, Desktop
- **Offline Queue:** Pending actions survive network interruptions

### Communication Channels

All channels are thin adapters. The user always talks to the **Main Agent** — the channel only translates the medium:

```
PWA Chat (primary)    ──→
Telegram (optional)   ──→  Main Agent  ──→  Response
Voice (optional)      ──→
Future channels       ──→
```

Adding a new channel (e.g. Voice via ElevenLabs + Speech module) requires only one adapter file. The agent logic stays identical.

### Live Agent Activity

The PWA chat shows real-time agent activity via WebSocket streaming — the user sees which sub-agents and tools are being used as they work.

---

## Theming System

A theme is a **package of design tokens + custom CSS overrides**. Switching themes changes the entire look of the app — all modules, all screens, instantly.

### Theme Structure

```
themes/
├── default/
│   ├── tokens.ts          # Colors, fonts, radii, spacing, shadows
│   └── overrides.css      # Custom CSS (glassmorphism, list-styles, etc.)
├── cyberpunk/
│   ├── tokens.ts
│   └── overrides.css
└── minimal-light/
    ├── tokens.ts
    └── overrides.css
```

### What is Themeable

| Element | Mechanism |
|---------|-----------|
| Colors, fonts, border-radii, spacing, shadows | Design tokens (PrimeVue + Tailwind CSS Custom Properties) |
| Glassmorphism, list markers, 3D effects, animations | CSS overrides per theme |
| Layout variants (sidebar position, card grid) | CSS overrides per theme |

### Mandatory Rule

**No module may hardcode colors, shadows, border-radii, or fonts.** All visual styling MUST use PrimeVue Design Tokens or Tailwind CSS Custom Properties. Change the theme → everything changes, everywhere, instantly.

---

## Getting Started

```bash
# Clone with all submodules (recursive!)
git clone --recurse-submodules https://github.com/tonicfresh/super-app.git
cd super-app

# Initialize the backend
cd template/backend
bun install
bun run init          # Generate .env with secrets
bun run migrate       # Run framework + app migrations

# Start development
bun run dev           # Backend on port 3000

# In a second terminal — start the frontend
cd template/frontend
bun install
bun run dev           # Frontend on port 5173
```

## Adding a Module

### 1. Create the module repository

Use the module structure defined above. The module must include the framework as a submodule in `backend/framework/`.

### 2. Add as submodule

```bash
git submodule add <repo-url> modules/<module-name>
git submodule update --init --recursive
```

### 3. Register in the Super App backend

```typescript
// template/backend/src/index.ts
import { schema, routes, jobs } from "../../modules/<module-name>/backend/src/plugin";

// Add to defineServer configuration:
// customDbSchema: { ...schema }
// customHonoApps: [{ baseRoute: "/<module-name>", app: routes }]
// jobHandlers: [...jobs]
```

### 4. Register in the Super App frontend

```typescript
// template/frontend/src/module-loader.ts
import { moduleDefinition } from "../../modules/<module-name>/frontend/src/module";

// Add to registeredModules array
```

### 5. Run migrations

```bash
cd template/backend
bun run migrate
```

---

## Deploying a Module Standalone

Any module can be deployed independently:

```bash
cd modules/<module-name>
git submodule update --init --recursive

cd backend
bun install
bun run init
bun run migrate
bun run dev
```

The module runs its own server with its own auth, its own database, and its own frontend — using the exact same framework and code as when integrated into the Super App.

---

## License

MIT
