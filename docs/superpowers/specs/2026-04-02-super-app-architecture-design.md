# Super App — Architecture Design Specification

**Date:** 2026-04-02
**Status:** Draft
**Approach:** Federated Modules (Ansatz B)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Project Structure & Module Contracts](#2-project-structure--module-contracts)
3. [Database Architecture](#3-database-architecture)
4. [Agent System & AI Architecture](#4-agent-system--ai-architecture)
5. [Auth, Security & Passkey](#5-auth-security--passkey)
6. [AI Providers & Cost Tracking](#6-ai-providers--cost-tracking)
7. [Mission Control Module](#7-mission-control-module)
8. [PWA, Push Notifications & Communication Channels](#8-pwa-push-notifications--communication-channels)
9. [Theming & Design System](#9-theming--design-system)
10. [Testing, Debug & Developer Experience](#10-testing-debug--developer-experience)
11. [Consistency Rules](#11-consistency-rules)

---

## 1. Overview

The Super App is a modular, scalable application platform built on a sub-repository architecture. Each functional module is an independent, reusable package that works **standalone** as its own application — or integrates seamlessly into the Super App as a managed module.

### Core Principles

- **Dual-Mode**: Every module runs standalone OR integrated — same code, different entry points
- **One Framework**: All modules use the same `fullstack-framework` as foundation
- **Tool-Based AI**: Modules expose AI tools with built-in permissions, guardrails, and privacy
- **Security First**: Minimal `.env`, encrypted secrets in DB, Passkey auth, audit logging
- **Consistency**: Identical structure, patterns, and conventions across all modules
- **No Overengineering**: One PostgreSQL, one server process, AI SDK handles orchestration

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Bun |
| **Backend Framework** | Hono.js (via fullstack-framework) |
| **Frontend Framework** | Vue 3 (SPA) |
| **CSS** | Tailwind CSS v4 |
| **Component Library** | PrimeVue + Volt theme |
| **State Management** | Pinia |
| **Routing** | Vue Router |
| **i18n** | vue-i18n |
| **Validation** | Valibot (shared frontend + backend) |
| **Database** | PostgreSQL + pgvector |
| **ORM** | Drizzle ORM |
| **AI SDK** | Vercel AI SDK (ToolLoopAgent, tool(), streamText) |
| **AI Providers** | Anthropic, Mistral, OpenRouter (configurable) |
| **Auth** | JWT + Hanko (WebAuthn/Passkey) |
| **Charts** | ApexCharts (vue3-apexcharts) |
| **Icons** | Iconify (unplugin-icons) |
| **Testing** | bun:test + Framework test utilities |

---

## 2. Project Structure & Module Contracts

### Repository Structure

```
super-app/                              # Main repo (orchestrator)
├── template/                           # [Submodule] Fullstack app template
│   ├── backend/
│   │   ├── framework/                  # [Sub-submodule] fullstack-framework
│   │   └── src/
│   │       ├── index.ts                # defineServer() — composes all modules
│   │       ├── module-registry.ts      # Central module registration
│   │       └── ai/
│   │           ├── main-agent.ts       # ToolLoopAgent with all module tools
│   │           ├── sub-agents/         # Hardcoded specialized agents
│   │           ├── providers.ts        # AI provider registry
│   │           ├── cost-tracking.ts    # Centralized cost logging
│   │           └── channels/
│   │               ├── telegram.ts     # Telegram bot adapter
│   │               └── api.ts         # REST/WebSocket for PWA chat
│   └── frontend/
│       └── src/
│           ├── App.vue                 # Shell: navigation, auth, layout
│           ├── module-loader.ts        # Dynamic module import
│           └── views/
│               ├── admin/
│               │   ├── permissions.vue # Permission management
│               │   ├── guardrails.vue  # Limit configuration
│               │   └── modules.vue     # Module management
│               └── chat/
│                   └── index.vue       # AI chat interface
├── modules/                            # Feature modules (each a submodule)
│   ├── mission-control/                # Agent monitoring (always included)
│   ├── mail/
│   ├── todos/
│   ├── contacts/
│   ├── documents/
│   ├── knowledge-base/
│   └── speech/
├── plugins/                            # Runtime plugins (installed via UI)
├── services/                           # 24/7 background services
├── design-system/                      # [Submodule] Shared UI components
├── shared/                             # [Submodule] Shared types & utils
└── docs/                               # Architecture documentation
```

### Required Files Per Module

Every module MUST contain this exact structure:

```
modules/<name>/
├── backend/
│   ├── framework/              # Submodule (same framework everywhere)
│   ├── src/
│   │   ├── index.ts            # Standalone entry: defineServer({...})
│   │   ├── plugin.ts           # Integrated entry: exports schema, routes, tools, config
│   │   ├── tools.ts            # AI tools with guardrails + privacy
│   │   ├── routes/             # Hono route handlers
│   │   ├── db/
│   │   │   └── schema.ts       # Drizzle schema (module-prefixed tables)
│   │   ├── jobs/               # Background job handlers
│   │   └── services/           # Business logic
│   ├── tests/                  # Tests — MANDATORY
│   │   ├── routes.test.ts
│   │   ├── tools.test.ts
│   │   ├── security.test.ts
│   │   └── schema.test.ts
│   ├── drizzle.config.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.ts             # Standalone entry: own Vue app
│   │   ├── module.ts           # Integrated entry: exports routes, nav, permissions
│   │   ├── views/              # Page components
│   │   ├── components/         # Reusable UI components
│   │   └── stores/             # Pinia stores
│   └── package.json
├── README.md                   # Documentation — MANDATORY
└── AGENTS.md                   # AI coding assistant instructions
```

### Backend Contract: `plugin.ts`

Every module MUST export the following:

```typescript
// modules/<name>/backend/src/plugin.ts

import type { ModuleConfig } from "@super-app/shared";

export const moduleConfig: ModuleConfig = {
  name: "mail",
  version: "1.0.0",
  permissions: {
    base: {
      read: "mail:read",
      write: "mail:write",
      update: "mail:update",
      delete: "mail:delete",
    },
    custom: {
      send: "mail:send",
      settings: "mail:settings",
      admin: "mail:admin",
    },
  },
  guardrails: {
    "mail:send": { dailyLimit: 50, requiresApproval: false },
    "mail:delete": { dailyLimit: 20, requiresApproval: true },
  },
};

export { mailSchema as schema } from "./db/schema";
export { mailRoutes as routes } from "./routes";
export { mailJobs as jobs } from "./jobs";
export { mailTools as tools } from "./tools";
```

### Frontend Contract: `module.ts`

Every module with a UI MUST export:

```typescript
// modules/<name>/frontend/src/module.ts

import type { ModuleDefinition } from "@super-app/shared";

export const moduleDefinition: ModuleDefinition = {
  name: "mail",
  routes: [
    { path: "/mail", component: () => import("./views/Inbox.vue") },
    { path: "/mail/compose", component: () => import("./views/Compose.vue") },
    { path: "/mail/settings", component: () => import("./views/Settings.vue") },
  ],
  navigation: {
    label: "Mail",
    icon: "i-heroicons-envelope",
    position: "sidebar",
    order: 10,
  },
  permissions: ["mail:read"],
};
```

### Tool Contract: `tools.ts`

Every AI tool MUST follow this pattern:

```typescript
// modules/<name>/backend/src/tools.ts

import { tool } from "ai";
import { z } from "valibot";
import type { ToolResult } from "@super-app/shared";

export const mailTools = {
  sendMail: tool({
    description: "Send an email to a user by their ID",
    inputSchema: z.object({
      userId: z.string(),       // Only IDs — never email addresses
      subject: z.string(),
      body: z.string(),
    }),
    needsApproval: async ({ userId }) => {
      const user = await db.getUser(userId);
      return user.isExternal;   // Dynamic: approval only for external recipients
    },
    execute: async ({ userId, subject, body }): Promise<ToolResult> => {
      // 1. Permission check (framework)
      if (!await checkScope("mail:send")) {
        return { success: false, code: "FORBIDDEN", message: "No permission" };
      }
      // 2. Guardrail check (DB config)
      const limit = await checkGuardrail("mail:send");
      if (limit.reached) {
        return { success: false, code: "LIMIT_REACHED", message: `Limit: ${limit.used}/${limit.max}` };
      }
      // 3. Execute — sensitive data only here, never returned to LLM
      const user = await db.getUser(userId);
      await mailService.send({ to: user.email, subject, body });
      // 4. Response — only name, never address
      return { success: true, data: { sentTo: user.name, remaining: limit.max - limit.used - 1 } };
    },
  }),
};
```

### Shared Types: `@super-app/shared`

```typescript
// shared/src/types.ts

export type ToolResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; code: ToolErrorCode; message: string };

export type ToolErrorCode =
  | "FORBIDDEN"
  | "LIMIT_REACHED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "UNAVAILABLE";

export interface ModuleConfig {
  name: string;
  version: string;
  permissions: {
    base: { read: string; write: string; update: string; delete: string };
    custom?: Record<string, string>;
  };
  guardrails?: Record<string, GuardrailConfig>;
}

export interface GuardrailConfig {
  dailyLimit?: number;
  hourlyLimit?: number;
  requiresApproval?: boolean;
  allowedTimeWindow?: { start: string; end: string };
}

export interface ModuleDefinition {
  name: string;
  routes: RouteRecord[];
  navigation: {
    label: string;
    icon: string;
    position: "sidebar" | "topbar" | "hidden";
    order: number;
  };
  permissions: string[];
}
```

### Dual-Mode Architecture

Every module has two entry points — the business logic, routes, components, and schema are shared and identical between both modes.

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
// super-app/template/backend/src/index.ts
import { defineServer } from "@framework/index";
import { schema as mailSchema, routes as mailRoutes, jobs as mailJobs } from "../../modules/mail/backend/src/plugin";
import { schema as todosSchema, routes as todosRoutes, jobs as todosJobs } from "../../modules/todos/backend/src/plugin";

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

### Module Registry

```typescript
// template/backend/src/module-registry.ts

export const moduleRegistry = {
  modules: [
    { config: mailConfig, tools: mailTools, schema: mailSchema, routes: mailRoutes },
    { config: todosConfig, tools: todosTools, schema: todosSchema, routes: todosRoutes },
    // New module → add one line here
  ],

  getModule(name: string) {
    return this.modules.find(m => m.config.name === name);
  },

  async getAllTools(userId: string, tenantId: string) {
    const tools: Record<string, Tool> = {};
    for (const mod of this.modules) {
      const hasAccess = await checkModuleAccess(userId, tenantId, mod.config.name);
      if (hasAccess && mod.tools) {
        Object.assign(tools, mod.tools);
      }
    }
    return tools;
  },
};
```

### Plugin System

Plugins are different from modules. Modules are core building blocks developed as submodules. Plugins are optional, community-driven extensions installed at runtime.

| Aspect | Module | Plugin |
|--------|--------|--------|
| Deployment | Git submodule, compiled into app | Installed at runtime via UI |
| Development | Same framework, same structure | Plugin API, sandboxed |
| Persistence | Always present in the repo | Stored in database/filesystem |
| Updates | Git pull + rebuild | Hot-update via UI |
| Trust level | Full system access | Sandboxed, scoped permissions |

---

## 3. Database Architecture

### One PostgreSQL For Everything

All modules share a single PostgreSQL instance. Schema isolation happens through table prefixes.

```
PostgreSQL (super-app)
├── Framework tables:    users, tenants, teams, permissions, files, jobs, secrets, ...
├── Mail tables:         mail_accounts, mail_messages, mail_folders, ...
├── Todos tables:        todos_items, todos_lists, todos_labels, ...
├── Contacts tables:     contacts_persons, contacts_groups, ...
├── Mission Control:     mc_agent_sessions, mc_audit_log, mc_ai_costs, ...
└── pgvector extension:  Embeddings for Knowledge/RAG (framework)
```

**Integrated mode:** One shared DB, framework manages the connection. Modules bring only their schema via `plugin.ts` → `export { schema }`. The `defineServer()` merges all schemas.

**Standalone mode:** Own DB per module. The `.env` points to a different database. Framework creates its own tables (auth, tenants, etc.) + the module's tables.

### Drizzle ORM — MANDATORY

**NEVER write raw SQL for schema changes.** Tables are defined exclusively in TypeScript via Drizzle ORM. Migrations are generated with `drizzle-kit generate` from the schema diff. Manual SQL in migration files is forbidden. This applies to the framework, the Super App, AND every single module.

```typescript
// modules/mail/backend/src/db/schema.ts
import { pgTableCreator, text, timestamp, boolean } from "drizzle-orm/pg-core";

// Jedes Modul erstellt seinen eigenen Table Creator mit Prefix.
// Framework: pgBaseTable (base_*), App: pgAppTable (app_*),
// Module: eigener Creator (mail_*, todos_*, mc_*, etc.)
const mailTable = pgTableCreator((name) => `mail_${name}`);

export const mailAccounts = mailTable("accounts", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
```

```bash
# Generate migration from schema diff (NEVER write manually)
bun run app:generate

# Run all migrations (framework + app)
bun run migrate
```

### Table Naming Convention

All tables MUST be prefixed with the module name to avoid schema collisions:

```
mail_*       → Mail module
todos_*      → Todos module
contacts_*   → Contacts module
mc_*         → Mission Control module
docs_*       → Documents module
kb_*         → Knowledge Base module
```

---

## 4. Agent System & AI Architecture

### Overview

The agent system is built entirely on the **Vercel AI SDK**. No custom orchestration layer, no custom agent framework — the AI SDK IS the orchestration.

```
┌─────────────────────────────────────────────────┐
│                 Communication Channels           │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Telegram │ │ PWA Chat │ │ More Channels    │ │
│  └────┬─────┘ └────┬─────┘ └───────┬──────────┘ │
│       └─────────────┼───────────────┘            │
│                     ▼                            │
│  ┌─────────────────────────────────────────────┐ │
│  │              MAIN AGENT                     │ │
│  │  ToolLoopAgent (AI SDK)                     │ │
│  │  - Understands user intent                  │ │
│  │  - Delegates to sub-agents or direct tools  │ │
│  │  - Maintains conversation context           │ │
│  └──────┬──────────┬──────────┬────────────────┘ │
│         ▼          ▼          ▼                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Mail Agent│ │Todo Agent│ │Docs Agent│  ...    │
│  │(Sub)     │ │(Sub)     │ │(Sub)     │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│         │          │          │                  │
│         ▼          ▼          ▼                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Mail Tools│ │Todo Tools│ │Docs Tools│  ...    │
│  │Permission│ │Permission│ │Permission│        │
│  │Guardrail │ │Guardrail │ │Guardrail │        │
│  │Privacy   │ │Privacy   │ │Privacy   │        │
│  └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────┘
```

### Main Agent

Single entry point for all channels:

```typescript
// template/backend/src/ai/main-agent.ts
import { ToolLoopAgent, tool, stepCountIs } from "ai";
import { loadModuleTools, loadSubAgents } from "./module-connector";

export function createMainAgent(userId: string, tenantId: string) {
  const moduleTools = loadModuleTools(userId, tenantId);
  const subAgentTools = loadSubAgents(userId, tenantId);

  return new ToolLoopAgent({
    model: getProviderModel("chat"),  // Configured via Settings UI
    instructions: `You are a personal assistant.
    
    Rules:
    - You NEVER see email addresses, phone numbers, or passwords
    - You work only with user IDs and names
    - When a tool returns "LIMIT_REACHED", inform the user
    - When a tool returns "FORBIDDEN", tell the user they lack permission
    - Ask for clarification on unclear tasks instead of guessing
    `,
    tools: {
      ...moduleTools,
      ...subAgentTools,
    },
    stopWhen: stepCountIs(30),
    onStepFinish: async ({ stepNumber, usage, toolCalls, finishReason }) => {
      // Always: log costs
      await logAICost({ ... });
      // Always: log to Mission Control
      await logAgentStep({ ... });
      // Debug mode: detailed logging
      if (await isDebugEnabled()) { ... }
    },
  });
}
```

### Sub-Agents

Each module can provide a specialized sub-agent. Sub-agents are registered as tools for the main agent:

```typescript
// template/backend/src/ai/module-connector.ts

export function loadSubAgents(userId: string, tenantId: string) {
  const registry = getModuleRegistry();
  const subAgentTools: Record<string, Tool> = {};

  for (const mod of registry.modules) {
    if (!mod.tools) continue;

    const subAgent = new ToolLoopAgent({
      model: getProviderModel("chat"),
      instructions: `You are the specialized agent for the "${mod.config.name}" module.
        Use only the tools available to you. Respond concisely.`,
      tools: mod.tools,
      stopWhen: stepCountIs(10),
    });

    subAgentTools[`${mod.config.name}Agent`] = tool({
      description: `Handle complex ${mod.config.name} tasks.`,
      inputSchema: z.object({ task: z.string() }),
      execute: async ({ task }, { abortSignal }) => {
        const result = await subAgent.generate({ prompt: task, abortSignal });
        return result.text;
      },
    });
  }

  return subAgentTools;
}
```

### Dynamic Sub-Agents

The main agent can create specialized agents at runtime for cross-module tasks:

```typescript
const createDynamicAgent = tool({
  description: "Create a temporary specialized agent for complex cross-module tasks.",
  inputSchema: z.object({
    task: z.string(),
    requiredModules: z.array(z.string()),
  }),
  execute: async ({ task, requiredModules }, { abortSignal }) => {
    const selectedTools = {};
    for (const modName of requiredModules) {
      const mod = registry.getModule(modName);
      if (mod?.tools) Object.assign(selectedTools, mod.tools);
    }

    const dynamicAgent = new ToolLoopAgent({
      model: getProviderModel("chat"),
      instructions: `Solve the following task: ${task}`,
      tools: selectedTools,
      stopWhen: stepCountIs(15),
    });

    const result = await dynamicAgent.generate({ prompt: task, abortSignal });
    return result.text;
  },
});
```

### Communication Channels

Each channel is a thin adapter — it translates the medium, the logic sits in the main agent:

```typescript
// template/backend/src/ai/channels/telegram.ts
export function setupTelegramChannel(bot: TelegramBot) {
  bot.on("message", async (msg) => {
    const userId = await resolveUser(msg.from.id);
    const tenantId = await resolveTenant(userId);
    const agent = createMainAgent(userId, tenantId);
    const result = await agent.stream({ prompt: msg.text });
    // Stream response to Telegram with throttled edits
  });
}

// template/backend/src/ai/channels/api.ts
// For PWA chat and browser — uses AI SDK UI streaming
export function setupChatAPI(app: Hono) {
  app.post("/api/v1/ai/chat", async (c) => {
    const { messages } = await c.req.json();
    const agent = createMainAgent(c.get("userId"), c.get("tenantId"));
    return createAgentUIStreamResponse({ agent, uiMessages: messages });
  });
}
```

### Privacy by Design

Tools are a **privacy boundary**. The LLM operates on an abstracted level (IDs, names, flags). The actual code in `execute` works with sensitive data — without returning it to the LLM.

```typescript
// ✅ CORRECT — LLM sees only what's necessary
execute: async ({ query }) => {
  const contacts = await db.searchContacts(query);
  return {
    success: true,
    data: {
      results: contacts.map(c => ({
        id: c.id,
        name: c.name,
        hasEmail: !!c.email,    // Flag, not the address
        hasPhone: !!c.phone,    // Flag, not the number
      })),
    },
  };
}
```

### Guardrails

Hard limits sit in the tool's `execute()` function — not in LLM prompts. The LLM cannot bypass them.

Every tool follows: **1. Permission check → 2. Guardrail check → 3. Execute → 4. Standardized response**

Guardrails are configurable via the Settings UI and stored in the database:

```typescript
export interface GuardrailConfig {
  dailyLimit?: number;
  hourlyLimit?: number;
  requiresApproval?: boolean;
  allowedTimeWindow?: { start: string; end: string };
}
```

### Human-in-the-Loop

The AI SDK's `needsApproval` mechanism pauses the agent loop and waits for human confirmation:

```typescript
const sendMail = tool({
  needsApproval: true,  // Always ask
  // OR dynamically:
  needsApproval: async ({ userId }) => {
    const user = await db.getUser(userId);
    return user.isExternal;
  },
  execute: async (...) => { ... },
});
```

When the agent hits `needsApproval`, the loop stops. The backend sends a notification (Push, Telegram, WebSocket) to the user:

```
Agent waiting for confirmation:
"Send mail to Tobias: Subject 'Meeting cancelled'"
[✅ Allow]  [❌ Deny]  [✏️ Edit]
```

After the user responds, the agent continues or aborts.

### Agent Notification System

Configurable per agent via Settings UI:

```
Agent Notifications:
├── Main Agent:
│   ├── On start:            ☐ Telegram  ☑ Push  ☐ Off
│   ├── On error:            ☑ Telegram  ☑ Push  ☐ Off
│   ├── On approval request: ☑ Telegram  ☑ Push  ☐ Off
│   └── On completion:       ☐ Telegram  ☐ Push  ☑ Off
├── Mail Sub-Agent:
│   ├── On send action:      ☑ Telegram  ☐ Push  ☐ Off
│   └── On limit reached:    ☑ Telegram  ☑ Push  ☐ Off
```

---

## 5. Auth, Security & Passkey

### Auth Flow: Registration → Passkey

```
1. User opens Super App
2. Enters Invitation Code (mandatory)
   → Framework checks: invitationCodes table
   → Assigns user to a tenant
3. Registers with email + password
   → Framework: setUserInDb() + verification mail
4. Verify email (magic link)
5. First login → offer Passkey setup
   → Hanko WebAuthn: device-bound passkey

From now on: login with Passkey only
(Password remains as fallback)
```

### Passkey: Device-Bound, Multi-Device

```
Account "user@example.com"
├── Passkey 1: MacBook Pro (Touch ID)        ← registered 2026-04-01
├── Passkey 2: iPhone (Face ID)              ← registered 2026-04-02
└── Passkey 3: Windows Desktop (Windows Hello) ← registered 2026-04-15

Each passkey is bound to a device.
New device = register new passkey (after login with existing passkey).
```

Hanko manages this completely — the framework already has the integration:
- `verifyHankoToken()` validates sessions
- User upsert on first Hanko login
- Token caching for performance
- Cookie + Bearer Token support

### Token Flow

```
Browser/PWA → JWT in Authorization: Bearer <token> → Backend → Framework Middleware
                                                         ↓
                                                    Validates token (cache → Hanko API)
                                                    Extracts userId + tenantId
                                                    Checks path permissions (regex, cached)
                                                    → 200 (pass) or 403 (deny)
```

### Permission Architecture

The framework uses path-based permissions with regex matching. Extended with module scopes:

```
Tenant (Organization)
├── Permission Groups
│   ├── "Admin" → /api/v1/.* (GET|POST|PUT|DELETE)
│   ├── "Mail User" → /api/v1/mail/.* (GET|POST)
│   ├── "Todo Reader" → /api/v1/todos/.* (GET)
│   └── ...
├── Teams
│   ├── "Management" → Groups: Admin
│   └── "Staff" → Groups: Mail User, Todo Reader
└── Users
    ├── User A → Team: Management
    ├── User B → Team: Staff
    └── User C → Groups: Todo Reader (direct)
```

**Frontend visibility:** The `module-loader.ts` checks permissions before registering routes and rendering navigation. Unauthorized modules are invisible.

### Permission Audit Log

Every permission check is logged:

```typescript
interface AuditEntry {
  timestamp: Date;
  userId: string;
  agentId: string;
  action: string;              // "mail:send", "todos:delete"
  resource: string;            // "usr_123", "todo_456"
  result: "granted" | "denied" | "approval_requested" | "approval_granted" | "approval_denied";
  metadata: Record<string, unknown>;
}
```

### Security Measures: Publicly Accessible

| Measure | Implementation |
|---------|---------------|
| **HTTPS** | Traefik/Coolify |
| **CORS** | Framework `allowedOrigins` config |
| **Rate Limiting** | Hono middleware (per IP + per user) |
| **JWT Expiry** | Configurable via `defineServer({ jwtExpiresAfter })` |
| **Token Refresh** | `LocalAuth.refreshToken()` (framework) |
| **Encrypted Secrets** | AES-256-CBC, tenant-scoped (framework `secrets` table) |
| **Invitation Code** | Mandatory for registration — no open registration |
| **Email Verification** | Magic link (framework) |
| **Passkey** | Hanko WebAuthn — device-bound |
| **Permission Cache** | In-memory with refresh (framework) |
| **SQL Injection** | Drizzle ORM — parameterized queries (by design) |
| **XSS** | Vue 3 template escaping (by design) |
| **CSRF** | JWT in header (not cookie) — CSRF-immune |
| **Input Validation** | Valibot schemas — frontend + backend |

### Minimal `.env`

```env
# ONLY these values in .env — nothing else
DATABASE_URL=postgresql://user:pass@localhost:5432/superapp
ENCRYPTION_KEY=<generated via bun run init>
JWT_PRIVATE_KEY=<generated via bun run init>
PORT=3000
HANKO_API_URL=https://hanko.example.com

# EVERYTHING ELSE → Settings UI → encrypted in DB (secrets table)
# SMTP, API keys, Telegram bot token, etc.
```

---

## 6. AI Providers & Cost Tracking

### Multi-Provider via AI SDK

The AI SDK `createProviderRegistry` enables dynamic provider switching. API keys are managed via the Settings UI, not `.env`.

```typescript
// template/backend/src/ai/providers.ts
import { createProviderRegistry } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { mistral } from "@ai-sdk/mistral";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export async function createProviders() {
  const settings = await getSettings();
  
  return createProviderRegistry({
    anthropic: anthropic({ apiKey: settings.anthropicKey }),
    mistral: mistral({ apiKey: settings.mistralKey }),
    openrouter: createOpenRouter({ apiKey: settings.openrouterKey }),
  });
}

// Per task / per module — different models possible:
// Mail agent     → mistral("mistral-large")      (cost-effective)
// Knowledge RAG  → anthropic("claude-sonnet")     (good for analysis)
// Code review    → openrouter("deepseek/coder")   (specialized)
```

### Provider Selection via Settings UI

```
Super App → Settings → AI Providers
├── Anthropic:   [API Key: ••••••••] ☑ Active
├── Mistral:     [API Key: ••••••••] ☑ Active
├── OpenRouter:  [API Key: ••••••••] ☑ Active
│
├── Default model per task:
│   ├── Chat/Agent:      [Anthropic Claude Sonnet ▼]
│   ├── Summarization:   [Mistral Large ▼]
│   ├── Code Analysis:   [OpenRouter → DeepSeek ▼]
│   └── Embeddings:      [Mistral Embed ▼]
│
└── Cost Dashboard:
    ├── Today: €0.47
    ├── This week: €3.21
    └── [Daily limit: €5.00]  ← Guardrail!
```

### Cost Tracking: Mandatory for Every Module

Every AI call — regardless of provider — automatically logs costs. This happens centrally via the `onStepFinish` callback. Modules do NOT implement cost tracking themselves.

```typescript
// shared/src/cost-tracking.ts
export async function logAICost(data: {
  project: string;       // Module name (e.g. "mail", "todos")
  provider: string;      // "anthropic", "mistral", "openrouter"
  model: string;         // "claude-sonnet-4-5", "mistral-large", etc.
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
}) {
  // Internal: Super App cost tracking table
  await db.insert(mcAiCosts).values({ ...data, createdAt: new Date() });
  
  // Optional: external cost tracker (configurable via Settings)
  const externalTracker = await getSetting("costTracker.externalUrl");
  if (externalTracker) {
    fetch(externalTracker, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${await getSetting("costTracker.token")}`,
      },
      body: JSON.stringify(data),
    }).catch(() => {}); // Fire-and-forget
  }
}
```

### Cost Guardrails

```typescript
// Hard limits — checked before every AI call
const costGuardrails = {
  dailyBudgetUsd: 5.00,        // Max $5/day across all modules
  perCallMaxUsd: 0.50,         // Max $0.50 per single call
  perModuleDailyUsd: 2.00,     // Max $2/day per module
};
```

---

## 7. Mission Control Module

Mission Control is a **mandatory built-in module** — always included, not optional. It provides real-time monitoring and control of all AI agents, costs, and permissions.

### Structure

```
modules/mission-control/
├── backend/src/
│   ├── plugin.ts              # Admin-only permissions
│   ├── tools.ts               # Agent status, stop agents, query logs
│   └── routes/
│       ├── agents.ts          # Running agents, status, duration
│       ├── logs.ts            # Real-time logs, filter, search
│       ├── costs.ts           # AI cost dashboard data
│       ├── audit.ts           # Permission audit log
│       └── health.ts          # System health, DB, services
├── frontend/src/
│   ├── module.ts
│   └── views/
│       ├── Dashboard.vue      # Overview: agents, costs, health
│       ├── AgentMonitor.vue   # Live: what is each agent doing?
│       ├── LogViewer.vue      # Real-time log stream (WebSocket)
│       ├── CostTracker.vue    # Costs per module, provider, time range
│       ├── AuditLog.vue       # Permission audit trail
│       └── Settings.vue       # Guardrails, limits, provider config
```

### Agent Session Tracking

```typescript
interface AgentSession {
  id: string;
  agentType: "main" | "sub" | "dynamic";
  moduleName: string;
  userId: string;
  channel: "telegram" | "pwa" | "api";
  status: "running" | "completed" | "failed" | "timeout" | "awaiting_approval";
  startedAt: Date;
  completedAt: Date | null;
  steps: number;
  tokensUsed: number;
  costUsd: number;
  toolCalls: {
    tool: string;
    args: Record<string, unknown>;  // Sensitive data filtered!
    result: "success" | "error";
    errorCode?: ToolErrorCode;
    duration: number;
  }[];
}
```

### Live Dashboard

```
┌─────────────────────────────────────────────────┐
│  Mission Control                                │
├─────────────────────────────────────────────────┤
│  Active Agents: 2        Today: 47 Sessions     │
│  Cost today: €1.23       Budget: €5.00 (24%)    │
├─────────────────────────────────────────────────┤
│  Live Agents:                                   │
│  ┌─────────────────────────────────────────┐    │
│  │ #1 Main Agent (Telegram → User)         │    │
│  │    Step 3/30 | €0.02 | 12s              │    │
│  │    → mailAgent("Send mail to usr_123")  │    │
│  └─────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────┐    │
│  │ #2 Mail Sub-Agent                       │    │
│  │    Step 1/10 | €0.01 | 3s               │    │
│  │    → sendMail(userId: "usr_123")        │    │
│  └─────────────────────────────────────────┘    │
├─────────────────────────────────────────────────┤
│  Recent Sessions:                               │
│  ✅ 14:23 Todo-Agent | 5 Steps | €0.03 | 8s    │
│  ✅ 14:15 Main Agent | 2 Steps | €0.01 | 3s    │
│  ❌ 13:58 Mail-Agent | LIMIT_REACHED | 0s       │
└─────────────────────────────────────────────────┘
```

---

## 8. PWA, Push Notifications & Communication Channels

### PWA as Primary Channel

The Super App is a **Progressive Web App** optimized for both mobile (phone) and desktop (browser). The PWA is the primary user interface — not Telegram, not a native app.

- **Mobile:** Fullscreen PWA with native-app feel, installable via "Add to Home Screen"
- **Desktop:** Standard browser experience with full feature set
- **AI Chat:** Built-in chat interface using AI SDK Vue hooks (`@ai-sdk/vue`)

```typescript
// Frontend: AI SDK Vue integration (already in template)
import { useChat } from "@ai-sdk/vue";

const { messages, input, handleSubmit, isLoading } = useChat({
  api: "/api/v1/ai/chat",
});
```

### Push Notifications (iOS + Android + Desktop)

Push notifications are a **core system feature** — not per-module. All notifications (agent approvals, module alerts, system messages) go through one central push service.

iOS supports Web Push since iOS 16.4 for installed PWAs.

```typescript
// Backend: Central notification service
interface PushNotification {
  userId: string;
  title: string;
  body: string;
  module?: string;          // "mail", "todos", "mission-control"
  action?: {
    type: "approval" | "navigate" | "dismiss";
    url?: string;           // Deep link into PWA
    agentSessionId?: string; // For approval actions
  };
}

// Used by:
// - Agent approval requests (Human-in-the-Loop)
// - Agent completion/error notifications
// - Module notifications (new mail, overdue todo, etc.)
// - System alerts (cost limit reached, service down)
```

**Service Worker** handles:
- Push subscription management
- Background notification display
- Deep linking into the PWA on notification tap
- Offline queue for pending actions

### Communication Channel Architecture

All channels are thin adapters. The user always talks to the **Main Agent** — the channel only translates the medium:

```
PWA Chat (primary)    ──→
Telegram (optional)   ──→  Main Agent  ──→  Response
Voice (optional)      ──→
Future channels       ──→
```

**Adding a new channel** (e.g. ElevenLabs Voice) requires only one file:

```typescript
// template/backend/src/ai/channels/voice.ts
export function setupVoiceChannel(app: Hono) {
  app.post("/api/v1/ai/voice", async (c) => {
    const audioBlob = await c.req.blob();
    
    // STT: Audio → Text (via Speech module)
    const transcript = await speechModule.transcribe(audioBlob);
    
    // Same agent as PWA/Telegram — identical behavior
    const agent = createMainAgent(c.get("userId"), c.get("tenantId"));
    const result = await agent.generate({ prompt: transcript });
    
    // TTS: Text → Audio (via Speech module)
    const audio = await speechModule.synthesize(result.text);
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg" } });
  });
}
```

### Agent Activity in Chat

The PWA chat shows live agent activity — the user sees what sub-agents and tools are being used in real-time via WebSocket streaming:

```
┌─────────────────────────────────────┐
│ AI Assistant                        │
│                                     │
│ You: Schreibe Tobias eine Mail      │
│      dass das Meeting ausfällt      │
│                                     │
│ 🔍 Searching contacts "Tobias"...   │  ← Live step
│ 📧 Sending mail via mailAgent...    │  ← Live step
│ ✅ Todo marked as done              │  ← Live step
│                                     │
│ Erledigt! Mail an Tobias gesendet   │
│ und das zugehörige Todo abgehakt.   │
└─────────────────────────────────────┘
```

---

## 9. Theming & Design System

### Theme Architecture

A theme is a **package of design tokens + custom CSS overrides**. Switching themes changes the entire look of the app — all modules, all screens, instantly.

```
themes/
├── default/
│   ├── tokens.ts          # Colors, fonts, radii, spacing, shadows
│   └── overrides.css      # Custom CSS (glassmorphism, list-styles, etc.)
├── cyberpunk/
│   ├── tokens.ts
│   └── overrides.css
├── minimal-light/
│   ├── tokens.ts
│   └── overrides.css
└── ocean/
    ├── tokens.ts
    └── overrides.css
```

### Design Tokens

PrimeVue Design Tokens + Tailwind CSS Custom Properties control everything:

```typescript
// themes/cyberpunk/tokens.ts
export const cyberpunkTheme = {
  primary: { 50: '#fdf4ff', 500: '#d946ef', 900: '#4a044e' },
  secondary: { 500: '#06b6d4' },
  surface: {
    ground: '#0a0a0f',
    card: 'rgba(255, 255, 255, 0.04)',
    overlay: '#1a1a2e',
  },
  border: { radius: '16px' },
  font: {
    headline: 'Space Grotesk',
    body: 'Inter',
  },
  shadow: {
    card: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
};
```

### Custom CSS Overrides

For effects that go beyond tokens (glassmorphism, list-style, 3D effects):

```css
/* themes/cyberpunk/overrides.css */

/* Glassmorphism cards */
.p-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Squares instead of bullet points */
ul li::marker {
  content: '■ ';
  color: var(--p-primary-500);
}

/* 3D hover effect on cards */
.p-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}
```

### What is Themeable

| Element | How | Token/CSS |
|---------|-----|-----------|
| Colors (all) | Design token | `primary`, `secondary`, `surface.*` |
| Border radius | Design token | `border.radius` |
| Fonts | Design token | `font.headline`, `font.body` |
| Shadows | Design token | `shadow.card`, `shadow.overlay` |
| Spacing | Design token | `spacing.*` |
| Glassmorphism | CSS override | `backdrop-filter`, `background: rgba()` |
| List markers | CSS override | `ul li::marker` |
| 3D effects | CSS override | `transform`, `box-shadow` |
| Animations | CSS override | `transition`, `@keyframes` |
| Layout variants | CSS override | Sidebar position, card grid, etc. |

### Theme Selection in Settings

```
Settings → Appearance
├── Theme: [Cyberpunk ▼] [Minimal ▼] [Ocean ▼] [Custom...]
├── Mode:  [Dark ▼] [Light ▼] [System ▼]
└── Preview: [Live preview of changes]
```

### MANDATORY Rule for Modules

**No module may hardcode colors, shadows, border-radii, or fonts.** All visual styling MUST use PrimeVue Design Tokens or Tailwind CSS Custom Properties. This guarantees: change the theme → everything changes, everywhere, instantly. No module needs to be touched.

---

## 10. Testing, Debug & Developer Experience

### Mandatory Tests Per Module

| Test Type | What is tested | File Pattern |
|-----------|---------------|--------------|
| **Route Tests** | Every API endpoint (CRUD + permissions) | `routes/*.test.ts` |
| **Tool Tests** | Every AI tool (guardrails, privacy, responses) | `tools.test.ts` |
| **Schema Tests** | Migrations run without errors | `db/schema.test.ts` |
| **Security Tests** | No access without permission, no data leaks | `security.test.ts` |

### Tool Test Example (Guardrails + Privacy)

```typescript
describe("Mail Tools", () => {
  const { db, user, tenant } = initTests();

  test("sendMail returns FORBIDDEN without permission", async () => {
    const result = await mailTools.sendMail.execute({
      userId: "usr_123", subject: "Test", body: "Hello",
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe("FORBIDDEN");
  });

  test("sendMail returns LIMIT_REACHED when exceeded", async () => {
    await seedMails(50);
    const result = await mailTools.sendMail.execute({
      userId: "usr_123", subject: "Test", body: "Hello",
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe("LIMIT_REACHED");
  });

  test("searchMail NEVER returns email addresses", async () => {
    const result = await mailTools.searchMail.execute({ query: "test" });
    expect(result.success).toBe(true);
    const json = JSON.stringify(result.data);
    expect(json).not.toContain("@");
    expect(json).not.toMatch(/[\w.]+@[\w.]+\.\w+/);
  });

  test("Tool response follows ToolResult contract", async () => {
    const result = await mailTools.searchMail.execute({ query: "test" });
    if (result.success) {
      expect(result.data).toBeDefined();
    } else {
      expect(result.code).toBeDefined();
      expect(result.message).toBeDefined();
    }
  });
});
```

### Security Test Example

```typescript
describe("Mail Security", () => {
  const { fetcher, userWithoutPermission, userWithPermission } = initTests();

  test("GET /mail without permission → 403", async () => {
    const res = await fetcher.as(userWithoutPermission).get("/api/v1/mail");
    expect(res.status).toBe(403);
  });

  test("GET /mail with mail:read → 200", async () => {
    const res = await fetcher.as(userWithPermission).get("/api/v1/mail");
    expect(res.status).toBe(200);
  });
});
```

### Debug Mode

Toggleable via 3 methods (priority: Env > Settings > Default):

```typescript
// 1. Environment variable (development)
AI_DEBUG=true bun run dev

// 2. Settings UI (production — temporarily toggleable)
// Super App → Settings → Developer → Debug Mode: [On/Off]

// 3. Per-request (targeted debugging)
// Header: X-Debug: true (admin only)
```

**What debug mode activates:**

| Feature | Normal | Debug |
|---------|--------|-------|
| Agent steps | Errors only | Every step with args + result |
| Tool calls | Errors only | Full input/output |
| SQL queries | Off | All queries with duration |
| Permission checks | Denied only | All checks (granted + denied) |
| Token usage | Aggregated | Per step breakdown |
| Response headers | Standard | `X-Debug-Steps`, `X-Debug-Tokens`, `X-Debug-Duration` |

### Module Scaffold Command

```bash
# Create new module with full boilerplate
bun run module:create contacts

# Creates:
# modules/contacts/
# ├── backend/ (framework submodule, plugin.ts, tools.ts, routes, schema, tests)
# ├── frontend/ (main.ts, module.ts, views, components, stores)
# ├── README.md
# └── AGENTS.md
```

### AGENTS.md Per Module

Every module gets an `AGENTS.md` — instructions for AI coding assistants:

```markdown
# Module: <Name>

## Rules
- Table prefix: `<name>_`
- All tools must return ToolResult type
- No sensitive data in tool responses
- Tests are mandatory for every endpoint and tool
- Schema changes ONLY via Drizzle, NEVER raw SQL

## Files
| File | Purpose |
|------|---------|
| `plugin.ts` | Integrated entry — export schema, routes, tools here |
| `tools.ts` | AI tools — follow permission + guardrail + privacy pattern |
| `index.ts` | Standalone entry — do not modify for Super App integration |

## Test Commands
- `bun test` — all tests
- `bun run app:generate` — generate migration after schema change
```

---

## 11. Consistency Rules

These apply to EVERY module, no exceptions:

1. **Same framework** — every module uses `fullstack-framework` as a submodule
2. **Same structure** — every module follows the exact directory layout
3. **Same entry points** — `index.ts` + `plugin.ts` (backend), `main.ts` + `module.ts` (frontend)
4. **Same UI components** — PrimeVue/Volt, never custom equivalents
5. **Same styling** — Tailwind CSS v4 with shared design tokens
6. **Same validation** — Valibot schemas, shared between frontend and backend
7. **Same API patterns** — Hono routes following framework conventions (tenant-scoped, permission-checked)
8. **Same database patterns** — Drizzle ORM, `pgTableCreator` with module prefix (Framework: `pgBaseTable` → `base_*`, App: `pgAppTable` → `app_*`, Module: eigener Creator → `mail_*`, `todos_*`, `mc_*`, etc.), generated migrations, NEVER raw SQL
9. **Same auth flow** — framework-managed, never custom
10. **Same error handling** — framework response helpers
11. **Same i18n structure** — locale JSON files per module
12. **Same testing patterns** — framework test utilities (`initTests()`, `testFetcher`)
13. **Same tool pattern** — permission check → guardrail check → execute → ToolResult response
14. **Same privacy rules** — LLM sees only IDs and flags, never sensitive data
15. **Same cost tracking** — automatic via `onStepFinish`, modules do NOT implement their own
16. **Same theming** — never hardcode colors, shadows, border-radii, or fonts. Always use PrimeVue Design Tokens and Tailwind CSS Custom Properties. Every module must work with every theme.
17. **Same notification pattern** — use central push notification service, never custom per-module push implementations

---

*End of specification.*
