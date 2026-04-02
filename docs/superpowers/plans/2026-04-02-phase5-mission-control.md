# Phase 5: Mission Control Module

**Date:** 2026-04-02
**Status:** Ready
**Spec:** `docs/superpowers/specs/2026-04-02-super-app-architecture-design.md` (Section 7)
**For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development**

---

## Ziel

Mission Control ist das erste echte Modul der Super App, gebaut nach der vollstaendigen Modulstruktur aus der Spec. Es ist ein **mandatory built-in module** — immer enthalten, nicht optional. Es bietet Echtzeit-Monitoring und Kontrolle ueber alle AI-Agents, Kosten und Berechtigungen. Dual-Mode: laeuft standalone ODER integriert in die Super App.

## Voraussetzungen

- Phase 1 (Shared Core) abgeschlossen — `@super-app/shared` mit allen Typen verfuegbar
- Phase 2–4 abgeschlossen (Auth, Agent System, Cost-Tracking DB-Tabelle `mc_ai_costs`)
- Bun Runtime installiert
- PostgreSQL laeuft
- Template-Backend funktionsfaehig mit `defineServer()` und Module Registry
- WebSocket-Support im Framework vorhanden (org-scoped)

## Konventionen

- **Runtime:** Bun
- **Validation:** Valibot (NICHT Zod — trotz AI SDK Beispielen in der Spec die `z` verwenden)
- **ORM:** Drizzle ORM
- **Testing:** `bun:test`
- **Commit-Messages:** Englisch, Conventional Commits
- **TDD:** Tests zuerst, dann Implementierung
- **Tabellen-Prefix:** `mc_` (Mission Control)
- **Berechtigungen:** `mc:read`, `mc:admin`
- **Component Library:** PrimeVue + Volt theme
- **Charts:** ApexCharts (vue3-apexcharts)
- **Path-Alias:** `@framework/*` mappt auf `./framework/src/*`

---

## Task 1: Modul-Grundstruktur — Dateien und Package-Konfiguration

**Ziel:** `modules/mission-control/` mit vollstaendiger Modul-Struktur anlegen (Backend + Frontend, Dual-Mode Entry Points).

### Files

| Action | Path |
|--------|------|
| Create | `modules/mission-control/backend/package.json` |
| Create | `modules/mission-control/backend/tsconfig.json` |
| Create | `modules/mission-control/backend/drizzle.config.ts` |
| Create | `modules/mission-control/frontend/package.json` |
| Create | `modules/mission-control/frontend/tsconfig.json` |
| Create | `modules/mission-control/README.md` |
| Create | `modules/mission-control/AGENTS.md` |

### Step 1.1: Backend Package-Konfiguration

```bash
mkdir -p modules/mission-control/backend/src/{routes,db,services,jobs}
mkdir -p modules/mission-control/backend/tests
```

**`modules/mission-control/backend/package.json`:**
```json
{
  "name": "@super-app/mission-control-backend",
  "version": "0.1.0",
  "description": "Mission Control module — AI agent monitoring, audit logging, cost tracking",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "dev": "bun run src/index.ts",
    "test": "bun test",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "@super-app/shared": "workspace:*",
    "drizzle-orm": "^0.44.0",
    "hono": "^4.7.0",
    "valibot": "^1.2.0"
  },
  "devDependencies": {
    "@types/bun": "^1.3.3",
    "drizzle-kit": "^0.30.0",
    "typescript": "^5.9.3"
  }
}
```

**`modules/mission-control/backend/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true,
    "types": ["bun-types"],
    "paths": {
      "@framework/*": ["./framework/src/*"],
      "@super-app/shared": ["../../../shared/src/index.ts"],
      "@super-app/shared/*": ["../../../shared/src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**`modules/mission-control/backend/drizzle.config.ts`:**
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Step 1.2: Frontend Package-Konfiguration

```bash
mkdir -p modules/mission-control/frontend/src/{views,components,stores}
```

**`modules/mission-control/frontend/package.json`:**
```json
{
  "name": "@super-app/mission-control-frontend",
  "version": "0.1.0",
  "description": "Mission Control module — Dashboard, Agent Monitor, Log Viewer, Cost Tracker",
  "type": "module",
  "main": "src/main.ts",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "vue-tsc --noEmit"
  },
  "dependencies": {
    "@super-app/shared": "workspace:*",
    "apexcharts": "^4.5.0",
    "pinia": "^3.0.0",
    "primevue": "^4.3.0",
    "vue": "^3.5.0",
    "vue-router": "^4.5.0",
    "vue3-apexcharts": "^1.7.0"
  },
  "devDependencies": {
    "@types/bun": "^1.3.3",
    "typescript": "^5.9.3",
    "vue-tsc": "^2.2.0"
  }
}
```

**`modules/mission-control/frontend/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["bun-types"],
    "paths": {
      "@super-app/shared": ["../../../shared/src/index.ts"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 1.3: Dokumentation

**`modules/mission-control/README.md`:**
```markdown
# Mission Control

Mandatory built-in module for AI agent monitoring, audit logging, and cost tracking.

## Features

- Real-time agent session monitoring (WebSocket)
- Audit log for all permission checks
- AI cost tracking per module, provider, and time range
- System health overview

## Permissions

- `mc:read` — View dashboards, logs, and costs
- `mc:admin` — Stop agents, modify guardrails, full access

## Standalone Mode

```bash
cd backend && bun run dev
```

## Integrated Mode

Registered automatically via `plugin.ts` in the Super App template.
```

**`modules/mission-control/AGENTS.md`:**
```markdown
# Mission Control — AI Coding Instructions

## Module: mission-control
- Prefix: `mc_` for all database tables
- Permissions: `mc:read`, `mc:admin`
- This is a MANDATORY module — always included in the Super App

## Structure
- `backend/src/plugin.ts` — Integrated entry point (exports config, schema, routes, tools)
- `backend/src/index.ts` — Standalone entry point (own server)
- `backend/src/tools.ts` — AI tools (agent status, stop agents, query logs)
- `backend/src/routes/` — Hono route handlers (agents, logs, costs, audit, health)
- `backend/src/db/schema.ts` — Drizzle schema (mc_agent_sessions, mc_audit_log)
- `backend/src/services/` — Business logic
- `frontend/src/module.ts` — Integrated frontend entry
- `frontend/src/main.ts` — Standalone frontend entry
- `frontend/src/views/` — Vue page components

## Conventions
- Validation: Valibot (NOT Zod)
- ORM: Drizzle
- Testing: bun:test, TDD
- Charts: ApexCharts
- Components: PrimeVue + Volt theme
```

### Commit

```
feat(mission-control): scaffold module directory structure with backend and frontend packages
```

---

## Task 2: Database Schema — Drizzle-Tabellen

**Ziel:** `mc_agent_sessions` und `mc_audit_log` als Drizzle-Tabellen definieren. Die Tabelle `mc_ai_costs` existiert bereits aus Phase 4 — hier wird sie re-exportiert fuer den Schema-Merge.

### Files

| Action | Path |
|--------|------|
| Create | `modules/mission-control/backend/src/db/schema.ts` |
| Create | `modules/mission-control/backend/tests/schema.test.ts` |

### Step 2.1: Tests schreiben (TDD)

**`modules/mission-control/backend/tests/schema.test.ts`:**
```typescript
import { describe, it, expect } from "bun:test";
import {
  mcAgentSessions,
  mcAuditLog,
  mcAiCosts,
} from "../src/db/schema";

describe("Mission Control Schema", () => {
  describe("mc_agent_sessions", () => {
    it("should be a pgTable named 'mc_agent_sessions'", () => {
      // Drizzle pgTable-Objekte haben einen internen Tabellennamen
      expect(mcAgentSessions[Symbol.for("drizzle:Name")]).toBe("mc_agent_sessions");
    });

    it("should have required columns", () => {
      const columns = Object.keys(mcAgentSessions);
      expect(columns).toContain("id");
      expect(columns).toContain("agentType");
      expect(columns).toContain("moduleName");
      expect(columns).toContain("userId");
      expect(columns).toContain("channel");
      expect(columns).toContain("status");
      expect(columns).toContain("startedAt");
      expect(columns).toContain("completedAt");
      expect(columns).toContain("steps");
      expect(columns).toContain("tokensUsed");
      expect(columns).toContain("costUsd");
      expect(columns).toContain("toolCalls");
    });
  });

  describe("mc_audit_log", () => {
    it("should be a pgTable named 'mc_audit_log'", () => {
      expect(mcAuditLog[Symbol.for("drizzle:Name")]).toBe("mc_audit_log");
    });

    it("should have required columns", () => {
      const columns = Object.keys(mcAuditLog);
      expect(columns).toContain("id");
      expect(columns).toContain("timestamp");
      expect(columns).toContain("userId");
      expect(columns).toContain("agentId");
      expect(columns).toContain("action");
      expect(columns).toContain("resource");
      expect(columns).toContain("result");
      expect(columns).toContain("metadata");
    });
  });

  describe("mc_ai_costs", () => {
    it("should be a pgTable named 'mc_ai_costs'", () => {
      expect(mcAiCosts[Symbol.for("drizzle:Name")]).toBe("mc_ai_costs");
    });

    it("should have required columns", () => {
      const columns = Object.keys(mcAiCosts);
      expect(columns).toContain("id");
      expect(columns).toContain("project");
      expect(columns).toContain("provider");
      expect(columns).toContain("model");
      expect(columns).toContain("tokensInput");
      expect(columns).toContain("tokensOutput");
      expect(columns).toContain("costUsd");
      expect(columns).toContain("createdAt");
    });
  });
});
```

### Step 2.2: Implementierung

**`modules/mission-control/backend/src/db/schema.ts`:**
```typescript
import {
  pgTableCreator,
  text,
  timestamp,
  integer,
  real,
  jsonb,
} from "drizzle-orm/pg-core";

// ============================================================
// Mission Control — Datenbank-Schema
// Jedes Modul erstellt seinen eigenen Table Creator mit Prefix.
// Framework: pgBaseTable (base_*), App: pgAppTable (app_*),
// Module: eigener Creator (mc_*, todos_*, etc.)
// ============================================================

const mcTable = pgTableCreator((name) => `mc_${name}`);

// --- Agent Sessions ---

/**
 * Jede AI-Agent-Ausfuehrung wird hier protokolliert.
 * Wird vom main-agent.ts onStepFinish Callback befuellt.
 */
export const mcAgentSessions = mcTable("agent_sessions", {
  /** Eindeutige Session-ID (UUID) */
  id: text("id").primaryKey(),
  /** Agent-Typ: main, sub, oder dynamic */
  agentType: text("agent_type").notNull(),
  /** Name des ausfuehrenden Moduls (z.B. "mail", "todos") */
  moduleName: text("module_name").notNull(),
  /** User-ID des anfragenden Nutzers */
  userId: text("user_id").notNull(),
  /** Kommunikationskanal */
  channel: text("channel").notNull(),
  /** Aktueller Status der Session */
  status: text("status").notNull().default("running"),
  /** Zeitpunkt des Starts */
  startedAt: timestamp("started_at").notNull().defaultNow(),
  /** Zeitpunkt der Fertigstellung (null = noch laufend) */
  completedAt: timestamp("completed_at"),
  /** Anzahl der bisher ausgefuehrten Steps */
  steps: integer("steps").notNull().default(0),
  /** Verbrauchte Tokens (Input + Output) */
  tokensUsed: integer("tokens_used").notNull().default(0),
  /** Kosten in USD */
  costUsd: real("cost_usd").notNull().default(0),
  /** Array der Tool-Aufrufe mit Details */
  toolCalls: jsonb("tool_calls").notNull().default([]),
});

// --- Audit Log ---

/**
 * Protokolliert jeden Permission-Check (granted/denied/approval).
 * Wichtig fuer Compliance und Debugging.
 */
export const mcAuditLog = mcTable("audit_log", {
  /** Eindeutige Log-ID (UUID) */
  id: text("id").primaryKey(),
  /** Zeitpunkt des Events */
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  /** User-ID des betroffenen Nutzers */
  userId: text("user_id").notNull(),
  /** Agent-Session-ID (Referenz auf mc_agent_sessions) */
  agentId: text("agent_id").notNull(),
  /** Ausgefuehrte Aktion (z.B. "mail:send", "todos:delete") */
  action: text("action").notNull(),
  /** Betroffene Ressource (z.B. Modul- oder Entity-Name) */
  resource: text("resource").notNull(),
  /** Ergebnis des Permission-Checks */
  result: text("result").notNull(),
  /** Zusaetzliche Metadaten (z.B. Grund der Ablehnung, IP, etc.) */
  metadata: jsonb("metadata").notNull().default({}),
});

// --- AI Costs ---

/**
 * KI-Kosten pro API-Call.
 * Grundtabelle existiert seit Phase 4 — hier re-definiert fuer den Schema-Merge.
 */
export const mcAiCosts = mcTable("ai_costs", {
  /** Eindeutige ID (UUID) */
  id: text("id").primaryKey(),
  /** Projektname / Modulname */
  project: text("project").notNull(),
  /** AI-Provider (z.B. "anthropic", "mistral", "openrouter") */
  provider: text("provider").notNull(),
  /** Modellname (z.B. "claude-sonnet-4-5") */
  model: text("model").notNull(),
  /** Eingabe-Tokens */
  tokensInput: integer("tokens_input").notNull(),
  /** Ausgabe-Tokens */
  tokensOutput: integer("tokens_output").notNull(),
  /** Kosten in USD */
  costUsd: real("cost_usd").notNull(),
  /** Zeitpunkt des Eintrags */
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Schema-Export fuer plugin.ts ---

export const mcSchema = {
  mcAgentSessions,
  mcAuditLog,
  mcAiCosts,
};
```

### Step 2.3: Tests ausfuehren

```bash
cd modules/mission-control/backend && bun install && bun test tests/schema.test.ts
```

### Commit

```
feat(mission-control): add Drizzle schema for agent_sessions, audit_log, and ai_costs tables
```

---

## Task 3: Backend Services — Agent Session Tracking + Audit Log

**Ziel:** Business-Logic-Services fuer das Erstellen/Aktualisieren von Agent-Sessions und das Schreiben von Audit-Log-Eintraegen.

### Files

| Action | Path |
|--------|------|
| Create | `modules/mission-control/backend/src/services/agent-session.service.ts` |
| Create | `modules/mission-control/backend/src/services/audit-log.service.ts` |
| Create | `modules/mission-control/backend/src/services/index.ts` |
| Create | `modules/mission-control/backend/tests/services.test.ts` |

### Step 3.1: Tests schreiben (TDD)

**`modules/mission-control/backend/tests/services.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  createAgentSessionService,
  type AgentSessionServiceDeps,
} from "../src/services/agent-session.service";
import {
  createAuditLogService,
  type AuditLogServiceDeps,
} from "../src/services/audit-log.service";

// --- Agent Session Service Tests ---

describe("AgentSessionService", () => {
  let insertMock: ReturnType<typeof mock>;
  let updateMock: ReturnType<typeof mock>;
  let selectMock: ReturnType<typeof mock>;
  let broadcastMock: ReturnType<typeof mock>;
  let service: ReturnType<typeof createAgentSessionService>;

  beforeEach(() => {
    insertMock = mock(async (data: any) => ({ id: data.id }));
    updateMock = mock(async (_id: string, _data: any) => {});
    selectMock = mock(async (_filter: any) => []);
    broadcastMock = mock((_event: string, _data: any) => {});
    service = createAgentSessionService({
      insert: insertMock,
      update: updateMock,
      select: selectMock,
      broadcast: broadcastMock,
    });
  });

  describe("startSession()", () => {
    it("should insert a new session with status 'running'", async () => {
      const session = await service.startSession({
        agentType: "main",
        moduleName: "mail",
        userId: "user_123",
        channel: "telegram",
      });

      expect(insertMock).toHaveBeenCalledTimes(1);
      const insertArg = insertMock.mock.calls[0][0];
      expect(insertArg.agentType).toBe("main");
      expect(insertArg.moduleName).toBe("mail");
      expect(insertArg.userId).toBe("user_123");
      expect(insertArg.channel).toBe("telegram");
      expect(insertArg.status).toBe("running");
      expect(insertArg.steps).toBe(0);
      expect(insertArg.tokensUsed).toBe(0);
      expect(insertArg.costUsd).toBe(0);
      expect(insertArg.toolCalls).toEqual([]);
      expect(insertArg.id).toBeDefined();
      expect(session.id).toBe(insertArg.id);
    });

    it("should broadcast 'agent:started' via WebSocket", async () => {
      await service.startSession({
        agentType: "sub",
        moduleName: "todos",
        userId: "user_456",
        channel: "pwa",
      });

      expect(broadcastMock).toHaveBeenCalledTimes(1);
      expect(broadcastMock.mock.calls[0][0]).toBe("agent:started");
    });
  });

  describe("recordStep()", () => {
    it("should update session with incremented step count and tool call", async () => {
      await service.recordStep("session_1", {
        tool: "sendMail",
        args: { userId: "user_123" },
        result: "success",
        duration: 350,
      });

      expect(updateMock).toHaveBeenCalledTimes(1);
      const [id, data] = updateMock.mock.calls[0];
      expect(id).toBe("session_1");
      expect(data.toolCall.tool).toBe("sendMail");
      expect(data.toolCall.duration).toBe(350);
    });

    it("should broadcast 'agent:step' via WebSocket", async () => {
      await service.recordStep("session_1", {
        tool: "sendMail",
        args: {},
        result: "success",
        duration: 100,
      });

      expect(broadcastMock).toHaveBeenCalledTimes(1);
      expect(broadcastMock.mock.calls[0][0]).toBe("agent:step");
    });
  });

  describe("completeSession()", () => {
    it("should update session status to 'completed' with final stats", async () => {
      await service.completeSession("session_1", {
        status: "completed",
        tokensUsed: 1500,
        costUsd: 0.012,
      });

      expect(updateMock).toHaveBeenCalledTimes(1);
      const [id, data] = updateMock.mock.calls[0];
      expect(id).toBe("session_1");
      expect(data.status).toBe("completed");
      expect(data.tokensUsed).toBe(1500);
      expect(data.costUsd).toBe(0.012);
      expect(data.completedAt).toBeInstanceOf(Date);
    });

    it("should broadcast 'agent:completed' via WebSocket", async () => {
      await service.completeSession("session_1", {
        status: "completed",
        tokensUsed: 500,
        costUsd: 0.005,
      });

      expect(broadcastMock).toHaveBeenCalledTimes(1);
      expect(broadcastMock.mock.calls[0][0]).toBe("agent:completed");
    });

    it("should support 'failed' and 'timeout' status", async () => {
      await service.completeSession("session_1", {
        status: "failed",
        tokensUsed: 200,
        costUsd: 0.002,
      });

      const data = updateMock.mock.calls[0][1];
      expect(data.status).toBe("failed");
    });
  });

  describe("getRunningAgents()", () => {
    it("should return only sessions with status 'running'", async () => {
      selectMock = mock(async () => [
        { id: "s1", status: "running", agentType: "main" },
        { id: "s2", status: "running", agentType: "sub" },
      ]);
      service = createAgentSessionService({
        insert: insertMock,
        update: updateMock,
        select: selectMock,
        broadcast: broadcastMock,
      });

      const running = await service.getRunningAgents();
      expect(selectMock).toHaveBeenCalledWith({ status: "running" });
      expect(running).toHaveLength(2);
    });
  });

  describe("getRecentSessions()", () => {
    it("should accept limit and offset parameters", async () => {
      await service.getRecentSessions({ limit: 20, offset: 0 });
      expect(selectMock).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    });

    it("should default to limit 50 and offset 0", async () => {
      await service.getRecentSessions();
      expect(selectMock).toHaveBeenCalledWith({ limit: 50, offset: 0 });
    });
  });
});

// --- Audit Log Service Tests ---

describe("AuditLogService", () => {
  let insertMock: ReturnType<typeof mock>;
  let selectMock: ReturnType<typeof mock>;
  let service: ReturnType<typeof createAuditLogService>;

  beforeEach(() => {
    insertMock = mock(async (_data: any) => {});
    selectMock = mock(async (_filter: any) => []);
    service = createAuditLogService({
      insert: insertMock,
      select: selectMock,
    });
  });

  describe("log()", () => {
    it("should insert an audit entry with all required fields", async () => {
      await service.log({
        userId: "user_123",
        agentId: "session_1",
        action: "mail:send",
        resource: "mail",
        result: "granted",
      });

      expect(insertMock).toHaveBeenCalledTimes(1);
      const data = insertMock.mock.calls[0][0];
      expect(data.userId).toBe("user_123");
      expect(data.agentId).toBe("session_1");
      expect(data.action).toBe("mail:send");
      expect(data.resource).toBe("mail");
      expect(data.result).toBe("granted");
      expect(data.id).toBeDefined();
      expect(data.timestamp).toBeInstanceOf(Date);
    });

    it("should support optional metadata", async () => {
      await service.log({
        userId: "user_123",
        agentId: "session_1",
        action: "mail:delete",
        resource: "mail",
        result: "denied",
        metadata: { reason: "No permission", ip: "192.168.1.1" },
      });

      const data = insertMock.mock.calls[0][0];
      expect(data.metadata.reason).toBe("No permission");
    });

    it("should default metadata to empty object", async () => {
      await service.log({
        userId: "user_123",
        agentId: "session_1",
        action: "todos:write",
        resource: "todos",
        result: "granted",
      });

      const data = insertMock.mock.calls[0][0];
      expect(data.metadata).toEqual({});
    });
  });

  describe("query()", () => {
    it("should filter by userId", async () => {
      await service.query({ userId: "user_123" });
      expect(selectMock).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_123" })
      );
    });

    it("should filter by action", async () => {
      await service.query({ action: "mail:send" });
      expect(selectMock).toHaveBeenCalledWith(
        expect.objectContaining({ action: "mail:send" })
      );
    });

    it("should filter by result", async () => {
      await service.query({ result: "denied" });
      expect(selectMock).toHaveBeenCalledWith(
        expect.objectContaining({ result: "denied" })
      );
    });

    it("should filter by time range", async () => {
      const from = new Date("2026-04-01T00:00:00Z");
      const to = new Date("2026-04-02T23:59:59Z");
      await service.query({ from, to });
      expect(selectMock).toHaveBeenCalledWith(
        expect.objectContaining({ from, to })
      );
    });

    it("should support pagination", async () => {
      await service.query({ limit: 25, offset: 50 });
      expect(selectMock).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25, offset: 50 })
      );
    });

    it("should default to limit 100 and offset 0", async () => {
      await service.query({});
      expect(selectMock).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100, offset: 0 })
      );
    });
  });
});
```

### Step 3.2: Agent Session Service

**`modules/mission-control/backend/src/services/agent-session.service.ts`:**
```typescript
import type { AgentType, AgentChannel, AgentStatus } from "@super-app/shared";

// --- Typen ---

export interface ToolCallRecord {
  tool: string;
  args: Record<string, unknown>;
  result: "success" | "error";
  errorCode?: string;
  duration: number;
}

export interface StartSessionInput {
  agentType: AgentType;
  moduleName: string;
  userId: string;
  channel: AgentChannel;
}

export interface CompleteSessionInput {
  status: AgentStatus;
  tokensUsed: number;
  costUsd: number;
}

// --- Dependency Injection ---

export interface AgentSessionServiceDeps {
  /** Insert in mc_agent_sessions */
  insert: (data: Record<string, unknown>) => Promise<{ id: string }>;
  /** Update mc_agent_sessions by ID */
  update: (id: string, data: Record<string, unknown>) => Promise<void>;
  /** Select from mc_agent_sessions mit Filter */
  select: (filter: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
  /** WebSocket-Broadcast an alle verbundenen Clients */
  broadcast: (event: string, data: unknown) => void;
}

/**
 * Erstellt den Agent Session Service.
 * Verwaltet den Lebenszyklus von Agent-Sessions.
 */
export function createAgentSessionService(deps: AgentSessionServiceDeps) {
  return {
    /**
     * Startet eine neue Agent-Session.
     * Wird aufgerufen wenn ein Agent (main/sub/dynamic) gestartet wird.
     */
    async startSession(input: StartSessionInput) {
      const id = crypto.randomUUID();
      const sessionData = {
        id,
        agentType: input.agentType,
        moduleName: input.moduleName,
        userId: input.userId,
        channel: input.channel,
        status: "running" as const,
        startedAt: new Date(),
        completedAt: null,
        steps: 0,
        tokensUsed: 0,
        costUsd: 0,
        toolCalls: [],
      };

      await deps.insert(sessionData);
      deps.broadcast("agent:started", { id, ...input });

      return { id };
    },

    /**
     * Protokolliert einen einzelnen Tool-Call innerhalb einer Session.
     * Wird vom onStepFinish Callback des AI SDK aufgerufen.
     */
    async recordStep(sessionId: string, toolCall: ToolCallRecord) {
      await deps.update(sessionId, { toolCall });
      deps.broadcast("agent:step", { sessionId, toolCall });
    },

    /**
     * Schliesst eine Agent-Session ab (completed/failed/timeout).
     */
    async completeSession(sessionId: string, input: CompleteSessionInput) {
      const updateData = {
        status: input.status,
        tokensUsed: input.tokensUsed,
        costUsd: input.costUsd,
        completedAt: new Date(),
      };

      await deps.update(sessionId, updateData);
      deps.broadcast("agent:completed", { sessionId, ...updateData });
    },

    /**
     * Gibt alle aktuell laufenden Agent-Sessions zurueck.
     */
    async getRunningAgents() {
      return deps.select({ status: "running" });
    },

    /**
     * Gibt die neuesten Sessions zurueck (paginiert).
     */
    async getRecentSessions(opts?: { limit?: number; offset?: number }) {
      const limit = opts?.limit ?? 50;
      const offset = opts?.offset ?? 0;
      return deps.select({ limit, offset });
    },
  };
}
```

### Step 3.3: Audit Log Service

**`modules/mission-control/backend/src/services/audit-log.service.ts`:**
```typescript
// --- Typen ---

export type AuditResult =
  | "granted"
  | "denied"
  | "approval_requested"
  | "approval_granted"
  | "approval_denied";

export interface AuditLogInput {
  userId: string;
  agentId: string;
  action: string;
  resource: string;
  result: AuditResult;
  metadata?: Record<string, unknown>;
}

export interface AuditLogQuery {
  userId?: string;
  agentId?: string;
  action?: string;
  resource?: string;
  result?: AuditResult;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

// --- Dependency Injection ---

export interface AuditLogServiceDeps {
  /** Insert in mc_audit_log */
  insert: (data: Record<string, unknown>) => Promise<void>;
  /** Select from mc_audit_log mit Filter */
  select: (filter: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
}

/**
 * Erstellt den Audit Log Service.
 * Protokolliert jeden Permission-Check.
 */
export function createAuditLogService(deps: AuditLogServiceDeps) {
  return {
    /**
     * Schreibt einen Audit-Log-Eintrag.
     * Wird bei jedem Permission-Check aufgerufen (granted/denied).
     */
    async log(input: AuditLogInput) {
      const entry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        userId: input.userId,
        agentId: input.agentId,
        action: input.action,
        resource: input.resource,
        result: input.result,
        metadata: input.metadata ?? {},
      };

      await deps.insert(entry);
    },

    /**
     * Abfrage des Audit-Logs mit Filtern.
     */
    async query(filter: AuditLogQuery) {
      return deps.select({
        ...filter,
        limit: filter.limit ?? 100,
        offset: filter.offset ?? 0,
      });
    },
  };
}
```

### Step 3.4: Service-Barrel-Export

**`modules/mission-control/backend/src/services/index.ts`:**
```typescript
export {
  createAgentSessionService,
  type AgentSessionServiceDeps,
  type StartSessionInput,
  type CompleteSessionInput,
  type ToolCallRecord,
} from "./agent-session.service";

export {
  createAuditLogService,
  type AuditLogServiceDeps,
  type AuditLogInput,
  type AuditLogQuery,
  type AuditResult,
} from "./audit-log.service";
```

### Step 3.5: Tests ausfuehren

```bash
cd modules/mission-control/backend && bun test tests/services.test.ts
```

### Commit

```
feat(mission-control): add agent session tracking and audit log services with DI
```

---

## Task 4: Backend Routes — REST API Endpoints

**Ziel:** Hono-Route-Handler fuer die fuenf Mission Control Endpoints: agents, logs, costs, audit, health.

### Files

| Action | Path |
|--------|------|
| Create | `modules/mission-control/backend/src/routes/agents.ts` |
| Create | `modules/mission-control/backend/src/routes/logs.ts` |
| Create | `modules/mission-control/backend/src/routes/costs.ts` |
| Create | `modules/mission-control/backend/src/routes/audit.ts` |
| Create | `modules/mission-control/backend/src/routes/health.ts` |
| Create | `modules/mission-control/backend/src/routes/index.ts` |
| Create | `modules/mission-control/backend/tests/routes.test.ts` |

### Step 4.1: Tests schreiben (TDD)

**`modules/mission-control/backend/tests/routes.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { Hono } from "hono";

// Hinweis: Die Route-Handlers werden mit gemockten Services getestet.
// Die tatsaechliche Hono-App wird hier als Integrationstest aufgebaut.

describe("Mission Control Routes", () => {
  describe("GET /agents", () => {
    it("should return running agents with status 200", async () => {
      const mockAgents = [
        { id: "s1", agentType: "main", status: "running", moduleName: "mail" },
        { id: "s2", agentType: "sub", status: "running", moduleName: "todos" },
      ];

      const app = new Hono();
      app.get("/agents", (c) => {
        return c.json({ agents: mockAgents, count: mockAgents.length });
      });

      const res = await app.request("/agents");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.agents).toHaveLength(2);
      expect(body.count).toBe(2);
    });
  });

  describe("GET /logs", () => {
    it("should return audit logs with pagination", async () => {
      const app = new Hono();
      app.get("/logs", (c) => {
        const limit = Number(c.req.query("limit") ?? 100);
        const offset = Number(c.req.query("offset") ?? 0);
        return c.json({ logs: [], total: 0, limit, offset });
      });

      const res = await app.request("/logs?limit=25&offset=50");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.limit).toBe(25);
      expect(body.offset).toBe(50);
    });

    it("should accept userId filter", async () => {
      const app = new Hono();
      app.get("/logs", (c) => {
        const userId = c.req.query("userId");
        return c.json({ logs: [], filter: { userId } });
      });

      const res = await app.request("/logs?userId=user_123");
      const body = await res.json();
      expect(body.filter.userId).toBe("user_123");
    });

    it("should accept time range filter", async () => {
      const app = new Hono();
      app.get("/logs", (c) => {
        const from = c.req.query("from");
        const to = c.req.query("to");
        return c.json({ logs: [], filter: { from, to } });
      });

      const res = await app.request("/logs?from=2026-04-01&to=2026-04-02");
      const body = await res.json();
      expect(body.filter.from).toBe("2026-04-01");
      expect(body.filter.to).toBe("2026-04-02");
    });
  });

  describe("GET /costs", () => {
    it("should return cost data with grouping", async () => {
      const app = new Hono();
      app.get("/costs", (c) => {
        const groupBy = c.req.query("groupBy") ?? "module";
        return c.json({ costs: [], groupBy, totalUsd: 0 });
      });

      const res = await app.request("/costs?groupBy=provider");
      const body = await res.json();
      expect(body.groupBy).toBe("provider");
    });

    it("should support time range filter", async () => {
      const app = new Hono();
      app.get("/costs", (c) => {
        const from = c.req.query("from");
        const to = c.req.query("to");
        return c.json({ costs: [], filter: { from, to }, totalUsd: 0 });
      });

      const res = await app.request("/costs?from=2026-04-01&to=2026-04-02");
      const body = await res.json();
      expect(body.filter.from).toBe("2026-04-01");
    });
  });

  describe("GET /health", () => {
    it("should return system health status", async () => {
      const app = new Hono();
      app.get("/health", (c) => {
        return c.json({
          status: "healthy",
          uptime: process.uptime(),
          database: "connected",
          activeAgents: 0,
          timestamp: new Date().toISOString(),
        });
      });

      const res = await app.request("/health");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("healthy");
      expect(body.database).toBe("connected");
      expect(body.timestamp).toBeDefined();
    });
  });
});
```

### Step 4.2: Route-Handler implementieren

**`modules/mission-control/backend/src/routes/agents.ts`:**
```typescript
import { Hono } from "hono";
import type { createAgentSessionService } from "../services/agent-session.service";

type AgentSessionService = ReturnType<typeof createAgentSessionService>;

/**
 * Agent-Routes: Laufende Agents, Session-History.
 */
export function createAgentRoutes(agentService: AgentSessionService) {
  const app = new Hono();

  // GET / — Aktuell laufende Agents
  app.get("/", async (c) => {
    const agents = await agentService.getRunningAgents();
    return c.json({ agents, count: agents.length });
  });

  // GET /recent — Letzte Sessions (paginiert)
  app.get("/recent", async (c) => {
    const limit = Number(c.req.query("limit") ?? 50);
    const offset = Number(c.req.query("offset") ?? 0);
    const sessions = await agentService.getRecentSessions({ limit, offset });
    return c.json({ sessions, limit, offset });
  });

  return app;
}
```

**`modules/mission-control/backend/src/routes/logs.ts`:**
```typescript
import { Hono } from "hono";
import type { createAuditLogService } from "../services/audit-log.service";

type AuditLogService = ReturnType<typeof createAuditLogService>;

/**
 * Audit-Log-Routes: Filterbare Permission-Logs.
 */
export function createLogRoutes(auditService: AuditLogService) {
  const app = new Hono();

  // GET / — Audit-Log mit Filtern
  app.get("/", async (c) => {
    const userId = c.req.query("userId");
    const action = c.req.query("action");
    const result = c.req.query("result") as any;
    const from = c.req.query("from") ? new Date(c.req.query("from")!) : undefined;
    const to = c.req.query("to") ? new Date(c.req.query("to")!) : undefined;
    const limit = Number(c.req.query("limit") ?? 100);
    const offset = Number(c.req.query("offset") ?? 0);

    const logs = await auditService.query({
      userId,
      action,
      result,
      from,
      to,
      limit,
      offset,
    });

    return c.json({ logs, total: logs.length, limit, offset });
  });

  return app;
}
```

**`modules/mission-control/backend/src/routes/costs.ts`:**
```typescript
import { Hono } from "hono";

/**
 * Cost-Routes: KI-Kosten aggregiert nach Modul, Provider oder Zeitraum.
 * Deps werden per Factory injiziert (Drizzle DB-Zugriff).
 */
export function createCostRoutes(deps: {
  queryCosts: (filter: Record<string, unknown>) => Promise<{
    costs: Record<string, unknown>[];
    totalUsd: number;
  }>;
}) {
  const app = new Hono();

  // GET / — Kosten-Uebersicht
  app.get("/", async (c) => {
    const groupBy = c.req.query("groupBy") ?? "module";
    const from = c.req.query("from");
    const to = c.req.query("to");

    const result = await deps.queryCosts({ groupBy, from, to });
    return c.json({
      costs: result.costs,
      groupBy,
      totalUsd: result.totalUsd,
      filter: { from, to },
    });
  });

  return app;
}
```

**`modules/mission-control/backend/src/routes/audit.ts`:**
```typescript
import { Hono } from "hono";
import type { createAuditLogService } from "../services/audit-log.service";

type AuditLogService = ReturnType<typeof createAuditLogService>;

/**
 * Audit-Trail-Routes: Permission-Historie.
 */
export function createAuditRoutes(auditService: AuditLogService) {
  const app = new Hono();

  // GET / — Audit-Trail (identisch mit logs, aber fokussiert auf result-Filterung)
  app.get("/", async (c) => {
    const userId = c.req.query("userId");
    const agentId = c.req.query("agentId");
    const resource = c.req.query("resource");
    const result = c.req.query("result") as any;
    const from = c.req.query("from") ? new Date(c.req.query("from")!) : undefined;
    const to = c.req.query("to") ? new Date(c.req.query("to")!) : undefined;
    const limit = Number(c.req.query("limit") ?? 100);
    const offset = Number(c.req.query("offset") ?? 0);

    const logs = await auditService.query({
      userId,
      agentId,
      resource,
      result,
      from,
      to,
      limit,
      offset,
    });

    return c.json({ entries: logs, limit, offset });
  });

  return app;
}
```

**`modules/mission-control/backend/src/routes/health.ts`:**
```typescript
import { Hono } from "hono";

/**
 * Health-Route: Systemstatus.
 */
export function createHealthRoutes(deps: {
  checkDatabase: () => Promise<boolean>;
  getActiveAgentCount: () => Promise<number>;
}) {
  const app = new Hono();

  // GET / — System-Health
  app.get("/", async (c) => {
    let dbStatus = "disconnected";
    try {
      const ok = await deps.checkDatabase();
      dbStatus = ok ? "connected" : "disconnected";
    } catch {
      dbStatus = "error";
    }

    const activeAgents = await deps.getActiveAgentCount().catch(() => -1);

    return c.json({
      status: dbStatus === "connected" ? "healthy" : "degraded",
      uptime: process.uptime(),
      database: dbStatus,
      activeAgents,
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
```

### Step 4.3: Route-Barrel-Export

**`modules/mission-control/backend/src/routes/index.ts`:**
```typescript
import { Hono } from "hono";
import { createAgentRoutes } from "./agents";
import { createLogRoutes } from "./logs";
import { createCostRoutes } from "./costs";
import { createAuditRoutes } from "./audit";
import { createHealthRoutes } from "./health";
import type { createAgentSessionService } from "../services/agent-session.service";
import type { createAuditLogService } from "../services/audit-log.service";

type AgentSessionService = ReturnType<typeof createAgentSessionService>;
type AuditLogService = ReturnType<typeof createAuditLogService>;

export interface McRouteDeps {
  agentService: AgentSessionService;
  auditService: AuditLogService;
  queryCosts: (filter: Record<string, unknown>) => Promise<{
    costs: Record<string, unknown>[];
    totalUsd: number;
  }>;
  checkDatabase: () => Promise<boolean>;
  getActiveAgentCount: () => Promise<number>;
}

/**
 * Erstellt alle Mission Control Routes und mountet sie unter einem Hono-App.
 *
 * Gemountet unter: /api/v1/mission-control/
 *   /agents   — Laufende Agents
 *   /logs     — Audit-Log (filterbar)
 *   /costs    — Kosten-Dashboard
 *   /audit    — Permission-Trail
 *   /health   — System-Health
 */
export function createMcRoutes(deps: McRouteDeps) {
  const app = new Hono();

  app.route("/agents", createAgentRoutes(deps.agentService));
  app.route("/logs", createLogRoutes(deps.auditService));
  app.route("/costs", createCostRoutes({ queryCosts: deps.queryCosts }));
  app.route("/audit", createAuditRoutes(deps.auditService));
  app.route("/health", createHealthRoutes({
    checkDatabase: deps.checkDatabase,
    getActiveAgentCount: deps.getActiveAgentCount,
  }));

  return app;
}

export { createAgentRoutes } from "./agents";
export { createLogRoutes } from "./logs";
export { createCostRoutes } from "./costs";
export { createAuditRoutes } from "./audit";
export { createHealthRoutes } from "./health";
```

### Step 4.4: Tests ausfuehren

```bash
cd modules/mission-control/backend && bun test tests/routes.test.ts
```

### Commit

```
feat(mission-control): add REST API routes for agents, logs, costs, audit, and health
```

---

## Task 5: AI Tools + Plugin + Standalone Entry Points

**Ziel:** Mission Control AI-Tools (Agent-Status abfragen, Agents stoppen, Logs durchsuchen) sowie die Dual-Mode Entry Points (`plugin.ts` und `index.ts`).

### Files

| Action | Path |
|--------|------|
| Create | `modules/mission-control/backend/src/tools.ts` |
| Create | `modules/mission-control/backend/src/plugin.ts` |
| Create | `modules/mission-control/backend/src/index.ts` |
| Create | `modules/mission-control/backend/src/jobs/index.ts` |
| Create | `modules/mission-control/backend/tests/tools.test.ts` |
| Create | `modules/mission-control/backend/tests/security.test.ts` |

### Step 5.1: Tests schreiben (TDD) — Tools

**`modules/mission-control/backend/tests/tools.test.ts`:**
```typescript
import { describe, it, expect, mock } from "bun:test";
import { createMcTools } from "../src/tools";

describe("Mission Control AI Tools", () => {
  // Default-Deps: Permission erlaubt
  const allowedDeps = {
    checkScope: mock(async () => true),
  };
  const mcTools = createMcTools(allowedDeps);

  it("should export getAgentStatus tool", () => {
    expect(mcTools).toHaveProperty("getAgentStatus");
  });

  it("should export queryAuditLog tool", () => {
    expect(mcTools).toHaveProperty("queryAuditLog");
  });

  it("should export getCostSummary tool", () => {
    expect(mcTools).toHaveProperty("getCostSummary");
  });

  it("should export getSystemHealth tool", () => {
    expect(mcTools).toHaveProperty("getSystemHealth");
  });

  it("all tools should have description property", () => {
    for (const [name, toolDef] of Object.entries(mcTools)) {
      expect((toolDef as any).description).toBeDefined();
      expect(typeof (toolDef as any).description).toBe("string");
    }
  });

  describe("Permission checks (mc:read)", () => {
    it("should return FORBIDDEN when mc:read is denied", async () => {
      const deniedTools = createMcTools({
        checkScope: mock(async () => false),
      });

      const result = await (deniedTools.getAgentStatus as any).execute({});
      expect(result.success).toBe(false);
      expect(result.code).toBe("FORBIDDEN");
    });

    it("should succeed when mc:read is granted", async () => {
      const result = await (mcTools.getAgentStatus as any).execute({});
      expect(result.success).toBe(true);
    });

    it("should check mc:read for all tools", async () => {
      const scopeCheck = mock(async () => false);
      const deniedTools = createMcTools({ checkScope: scopeCheck });

      for (const [name, toolDef] of Object.entries(deniedTools)) {
        const result = await (toolDef as any).execute({});
        expect(result.code).toBe("FORBIDDEN");
      }

      // checkScope wurde fuer jedes Tool aufgerufen
      expect(scopeCheck).toHaveBeenCalledTimes(Object.keys(deniedTools).length);
    });
  });
});
```

### Step 5.2: Tests schreiben (TDD) — Security

**`modules/mission-control/backend/tests/security.test.ts`:**
```typescript
import { describe, it, expect } from "bun:test";
import { moduleConfig } from "../src/plugin";

describe("Mission Control Security", () => {
  describe("Permissions", () => {
    it("should require mc:read for base read access", () => {
      expect(moduleConfig.permissions.base.read).toBe("mc:read");
    });

    it("should have mc:admin as custom permission", () => {
      expect(moduleConfig.permissions.custom?.admin).toBe("mc:admin");
    });

    it("should define all base CRUD permissions with mc: prefix", () => {
      const { base } = moduleConfig.permissions;
      expect(base.read).toMatch(/^mc:/);
      expect(base.write).toMatch(/^mc:/);
      expect(base.update).toMatch(/^mc:/);
      expect(base.delete).toMatch(/^mc:/);
    });
  });

  describe("Module Config", () => {
    it("should be named 'mission-control'", () => {
      expect(moduleConfig.name).toBe("mission-control");
    });

    it("should have a version", () => {
      expect(moduleConfig.version).toBeDefined();
      expect(moduleConfig.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
```

### Step 5.3: AI Tools implementieren

**`modules/mission-control/backend/src/tools.ts`:**
```typescript
import { tool } from "ai";
import * as v from "valibot";
import type { ToolResult } from "@super-app/shared";

// --- Dependency Injection fuer Testbarkeit ---

export interface McToolsDeps {
  checkScope: (permission: string) => Promise<boolean>;
}

/**
 * Mission Control AI Tools.
 * Nur fuer Admins (mc:admin) — der Agent kann damit den Systemstatus abfragen.
 *
 * WICHTIG: Alle Tools pruefen mc:read Permission via checkScope (4-Step-Pattern).
 * Guardrails entfallen — alle Tools sind read-only.
 * Sensitive Daten (z.B. vollstaendige Tool-Args) werden gefiltert!
 */
export function createMcTools(deps: McToolsDeps) {
  return {
    /**
     * Gibt den Status aller laufenden Agents zurueck.
     */
    getAgentStatus: tool({
      description:
        "Get the current status of all running AI agents. Returns agent type, module, user, channel, step count, and duration.",
      parameters: v.object({}),
      execute: async (): Promise<ToolResult> => {
        // 1. Permission check
        if (!(await deps.checkScope("mc:read"))) {
          return { success: false, code: "FORBIDDEN", message: "No permission: mc:read" };
        }
        // 2. Execute (no guardrail needed for read-only)
        return {
          success: true,
          data: { message: "Agent status retrieved", agents: [] },
        };
      },
    }),

    /**
     * Durchsucht den Audit-Log.
     */
    queryAuditLog: tool({
      description:
        "Search the permission audit log. Filter by user, action, result (granted/denied), or time range.",
      parameters: v.object({
        userId: v.optional(v.string()),
        action: v.optional(v.string()),
        result: v.optional(
          v.picklist(["granted", "denied", "approval_requested", "approval_granted", "approval_denied"])
        ),
        limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))),
      }),
      execute: async (input): Promise<ToolResult> => {
        // 1. Permission check
        if (!(await deps.checkScope("mc:read"))) {
          return { success: false, code: "FORBIDDEN", message: "No permission: mc:read" };
        }
        // 2. Execute (no guardrail needed for read-only)
        return {
          success: true,
          data: { message: "Audit log queried", entries: [], filter: input },
        };
      },
    }),

    /**
     * Gibt eine Kosten-Zusammenfassung zurueck.
     */
    getCostSummary: tool({
      description:
        "Get AI cost summary. Can group by module, provider, or model. Supports time range filtering.",
      parameters: v.object({
        groupBy: v.optional(v.picklist(["module", "provider", "model"])),
        days: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(90))),
      }),
      execute: async (input): Promise<ToolResult> => {
        // 1. Permission check
        if (!(await deps.checkScope("mc:read"))) {
          return { success: false, code: "FORBIDDEN", message: "No permission: mc:read" };
        }
        // 2. Execute (no guardrail needed for read-only)
        return {
          success: true,
          data: {
            message: "Cost summary retrieved",
            groupBy: input.groupBy ?? "module",
            totalUsd: 0,
            costs: [],
          },
        };
      },
    }),

    /**
     * Gibt den Systemstatus zurueck.
     */
    getSystemHealth: tool({
      description:
        "Check system health: database status, active agents count, uptime, and memory usage.",
      parameters: v.object({}),
      execute: async (): Promise<ToolResult> => {
        // 1. Permission check
        if (!(await deps.checkScope("mc:read"))) {
          return { success: false, code: "FORBIDDEN", message: "No permission: mc:read" };
        }
        // 2. Execute (no guardrail needed for read-only)
        return {
          success: true,
          data: {
            status: "healthy",
            uptime: process.uptime(),
            database: "connected",
            activeAgents: 0,
          },
        };
      },
    }),
  };
}

// Default-Export mit Passthrough-Deps (wird vom Framework ueberschrieben)
export const mcTools = createMcTools({
  checkScope: async () => true,
});
```

### Step 5.4: Plugin (Integrated Entry Point)

**`modules/mission-control/backend/src/plugin.ts`:**
```typescript
import type { ModuleConfig, ModulePlugin } from "@super-app/shared";
import { mcSchema } from "./db/schema";
import { createMcRoutes } from "./routes";
import { mcTools } from "./tools";

// --- Modul-Konfiguration ---

export const moduleConfig: ModuleConfig = {
  name: "mission-control",
  version: "0.1.0",
  permissions: {
    base: {
      read: "mc:read",
      write: "mc:write",
      update: "mc:update",
      delete: "mc:delete",
    },
    custom: {
      admin: "mc:admin",
    },
  },
  guardrails: {
    // Mission Control Tools haben keine Guardrails — sie sind read-only
    // Nur mc:admin berechtigt, keine taeglichen Limits noetig
  },
};

// --- Modul-Plugin-Export ---

/**
 * Convenience-Export: Alles als ModulePlugin-Objekt.
 * Kann direkt in registry.register(plugin) verwendet werden.
 *
 * Routes nutzen eine Factory (createMcRoutes) weil sie Service-Dependencies brauchen.
 * Der Getter stellt sicher, dass die Routes lazy geladen werden.
 */
export const plugin: ModulePlugin = {
  config: moduleConfig,
  schema: mcSchema,
  get routes() {
    // Factory-Pattern: Routes brauchen Service-Deps (AgentSession, AuditLog)
    // Das Framework ruft createMcRoutes(deps) auf und mountet die Hono-App
    return createMcRoutes;
  },
  jobs: [],
  tools: mcTools,
};

export { mcSchema as schema } from "./db/schema";
export { createMcRoutes as routes } from "./routes";
export { mcTools as tools } from "./tools";
```

### Step 5.5: Standalone Entry Point

**`modules/mission-control/backend/src/index.ts`:**
```typescript
import { defineServer } from "@framework/index";
import { mcSchema } from "./db/schema";
import { createMcRoutes } from "./routes";
import { createAgentSessionService } from "./services/agent-session.service";
import { createAuditLogService } from "./services/audit-log.service";

/**
 * Mission Control — Standalone-Modus.
 * Startet als eigenstaendige App mit eigenem Server + DB.
 */

// Services werden mit echten DB-Dependencies initialisiert
// (hier als Platzhalter — die echte Implementierung nutzt Drizzle)
const agentService = createAgentSessionService({
  insert: async (data) => ({ id: data.id as string }),
  update: async () => {},
  select: async () => [],
  broadcast: () => {},
});

const auditService = createAuditLogService({
  insert: async () => {},
  select: async () => [],
});

const mcRoutes = createMcRoutes({
  agentService,
  auditService,
  queryCosts: async () => ({ costs: [], totalUsd: 0 }),
  checkDatabase: async () => true,
  getActiveAgentCount: async () => 0,
});

const server = defineServer({
  port: 3010,
  jwtExpiresAfter: 60 * 60 * 24 * 30,
  appName: "Mission Control",
  basePath: "/api/v1",
  loginUrl: "/login.html",
  magicLoginVerifyUrl: "/magic-login-verify.html",
  staticPublicDataPath: "./public",
  staticPrivateDataPath: "./static",

  customDbSchema: { ...mcSchema },
  customHonoApps: [
    { baseRoute: "/mission-control", app: mcRoutes },
  ],
  jobHandlers: [],
});

export default server;
```

### Step 5.6: Jobs (leer, fuer Struktur)

**`modules/mission-control/backend/src/jobs/index.ts`:**
```typescript
/**
 * Mission Control hat keine Background-Jobs.
 * Datei existiert fuer die vollstaendige Modulstruktur.
 */
export const mcJobs: Array<{ type: string; handler: any }> = [];
```

### Step 5.7: Tests ausfuehren

```bash
cd modules/mission-control/backend && bun test tests/tools.test.ts tests/security.test.ts
```

### Commit

```
feat(mission-control): add AI tools, plugin.ts, and standalone index.ts entry points
```

---

## Task 6: Frontend — Module Entry Points + Pinia Stores

**Ziel:** Frontend-Grundstruktur mit Dual-Mode Entry Points (`module.ts` + `main.ts`), Pinia Stores fuer Agent-Sessions, Audit-Log und Kosten.

### Files

| Action | Path |
|--------|------|
| Create | `modules/mission-control/frontend/src/module.ts` |
| Create | `modules/mission-control/frontend/src/main.ts` |
| Create | `modules/mission-control/frontend/src/stores/agent-sessions.store.ts` |
| Create | `modules/mission-control/frontend/src/stores/audit-log.store.ts` |
| Create | `modules/mission-control/frontend/src/stores/costs.store.ts` |
| Create | `modules/mission-control/frontend/src/stores/health.store.ts` |

### Step 6.1: Module Entry (Integrated Mode)

**`modules/mission-control/frontend/src/module.ts`:**
```typescript
import type { ModuleDefinition } from "@super-app/shared";

export const moduleDefinition: ModuleDefinition = {
  name: "mission-control",
  routes: [
    {
      path: "/mission-control",
      component: () => import("./views/Dashboard.vue"),
    },
    {
      path: "/mission-control/agents",
      component: () => import("./views/AgentMonitor.vue"),
    },
    {
      path: "/mission-control/logs",
      component: () => import("./views/LogViewer.vue"),
    },
    {
      path: "/mission-control/costs",
      component: () => import("./views/CostTracker.vue"),
    },
    {
      path: "/mission-control/audit",
      component: () => import("./views/AuditLog.vue"),
    },
  ],
  navigation: {
    label: "Mission Control",
    icon: "i-heroicons-command-line",
    position: "sidebar",
    order: 0, // Immer ganz oben — mandatory module
  },
  permissions: ["mc:read"],
};
```

### Step 6.2: Standalone Entry

**`modules/mission-control/frontend/src/main.ts`:**
```typescript
import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import { moduleDefinition } from "./module";

// Standalone-Modus: Eigene Vue-App
const app = createApp({
  template: '<router-view />',
});

const router = createRouter({
  history: createWebHistory(),
  routes: moduleDefinition.routes.map((r) => ({
    path: r.path,
    component: r.component,
  })),
});

app.use(createPinia());
app.use(router);
app.use(PrimeVue, { /* Volt theme config */ });

app.mount("#app");
```

### Step 6.3: Pinia Stores

**`modules/mission-control/frontend/src/stores/agent-sessions.store.ts`:**
```typescript
import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface AgentSessionView {
  id: string;
  agentType: "main" | "sub" | "dynamic";
  moduleName: string;
  userId: string;
  channel: "telegram" | "pwa" | "api";
  status: "running" | "completed" | "failed" | "timeout" | "awaiting_approval";
  startedAt: string;
  completedAt: string | null;
  steps: number;
  tokensUsed: number;
  costUsd: number;
  toolCalls: {
    tool: string;
    args: Record<string, unknown>;
    result: "success" | "error";
    errorCode?: string;
    duration: number;
  }[];
}

export const useAgentSessionsStore = defineStore("mc-agent-sessions", () => {
  // State
  const runningAgents = ref<AgentSessionView[]>([]);
  const recentSessions = ref<AgentSessionView[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const runningCount = computed(() => runningAgents.value.length);
  const todaySessionCount = computed(() => {
    const today = new Date().toISOString().split("T")[0];
    return recentSessions.value.filter(
      (s) => s.startedAt.startsWith(today)
    ).length;
  });

  // Actions
  async function fetchRunningAgents() {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await fetch("/api/v1/mission-control/agents");
      const data = await res.json();
      runningAgents.value = data.agents;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchRecentSessions(limit = 50) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(
        `/api/v1/mission-control/agents/recent?limit=${limit}`
      );
      const data = await res.json();
      recentSessions.value = data.sessions;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      isLoading.value = false;
    }
  }

  /** WebSocket-Updates verarbeiten */
  function handleWsEvent(event: string, data: any) {
    if (event === "agent:started") {
      runningAgents.value.push(data);
    } else if (event === "agent:step") {
      const agent = runningAgents.value.find((a) => a.id === data.sessionId);
      if (agent) {
        agent.steps++;
        agent.toolCalls.push(data.toolCall);
      }
    } else if (event === "agent:completed") {
      const idx = runningAgents.value.findIndex((a) => a.id === data.sessionId);
      if (idx !== -1) {
        const completed = { ...runningAgents.value[idx], ...data };
        runningAgents.value.splice(idx, 1);
        recentSessions.value.unshift(completed);
      }
    }
  }

  return {
    runningAgents,
    recentSessions,
    isLoading,
    error,
    runningCount,
    todaySessionCount,
    fetchRunningAgents,
    fetchRecentSessions,
    handleWsEvent,
  };
});
```

**`modules/mission-control/frontend/src/stores/audit-log.store.ts`:**
```typescript
import { defineStore } from "pinia";
import { ref } from "vue";

export interface AuditEntryView {
  id: string;
  timestamp: string;
  userId: string;
  agentId: string;
  action: string;
  resource: string;
  result: "granted" | "denied" | "approval_requested" | "approval_granted" | "approval_denied";
  metadata: Record<string, unknown>;
}

export interface AuditFilter {
  userId?: string;
  action?: string;
  result?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export const useAuditLogStore = defineStore("mc-audit-log", () => {
  const entries = ref<AuditEntryView[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);

  async function fetchLogs(filter: AuditFilter = {}) {
    isLoading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filter.userId) params.set("userId", filter.userId);
      if (filter.action) params.set("action", filter.action);
      if (filter.result) params.set("result", filter.result);
      if (filter.from) params.set("from", filter.from);
      if (filter.to) params.set("to", filter.to);
      if (filter.limit) params.set("limit", String(filter.limit));
      if (filter.offset) params.set("offset", String(filter.offset));

      const res = await fetch(`/api/v1/mission-control/logs?${params}`);
      const data = await res.json();
      entries.value = data.logs;
      total.value = data.total;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      isLoading.value = false;
    }
  }

  return { entries, isLoading, error, total, fetchLogs };
});
```

**`modules/mission-control/frontend/src/stores/costs.store.ts`:**
```typescript
import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface CostGroupView {
  label: string;
  totalUsd: number;
  totalTokens: number;
  count: number;
}

export const useCostsStore = defineStore("mc-costs", () => {
  const costGroups = ref<CostGroupView[]>([]);
  const totalUsd = ref(0);
  const groupBy = ref<"module" | "provider" | "model">("module");
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getter: EUR-Approximation (1 USD ~ 0.92 EUR)
  const totalEur = computed(() => +(totalUsd.value * 0.92).toFixed(4));

  async function fetchCosts(opts?: {
    groupBy?: "module" | "provider" | "model";
    from?: string;
    to?: string;
  }) {
    isLoading.value = true;
    error.value = null;
    if (opts?.groupBy) groupBy.value = opts.groupBy;

    try {
      const params = new URLSearchParams();
      params.set("groupBy", groupBy.value);
      if (opts?.from) params.set("from", opts.from);
      if (opts?.to) params.set("to", opts.to);

      const res = await fetch(`/api/v1/mission-control/costs?${params}`);
      const data = await res.json();
      costGroups.value = data.costs;
      totalUsd.value = data.totalUsd;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      isLoading.value = false;
    }
  }

  return { costGroups, totalUsd, totalEur, groupBy, isLoading, error, fetchCosts };
});
```

**`modules/mission-control/frontend/src/stores/health.store.ts`:**
```typescript
import { defineStore } from "pinia";
import { ref } from "vue";

export interface HealthStatus {
  status: "healthy" | "degraded" | "down";
  uptime: number;
  database: "connected" | "disconnected" | "error";
  activeAgents: number;
  timestamp: string;
}

export const useHealthStore = defineStore("mc-health", () => {
  const health = ref<HealthStatus | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchHealth() {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await fetch("/api/v1/mission-control/health");
      health.value = await res.json();
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      isLoading.value = false;
    }
  }

  return { health, isLoading, error, fetchHealth };
});
```

### Commit

```
feat(mission-control): add frontend module entry points and Pinia stores for agents, logs, costs, health
```

---

## Task 7: Frontend Views — Vue Dashboard-Komponenten

**Ziel:** Fuenf Vue-Views: Dashboard (Uebersicht), AgentMonitor (Live-Agents via WebSocket), LogViewer (Echtzeit-Logs), CostTracker (Kosten pro Modul/Provider/Zeit), AuditLog (Permission-Trail).

### Files

| Action | Path |
|--------|------|
| Create | `modules/mission-control/frontend/src/views/Dashboard.vue` |
| Create | `modules/mission-control/frontend/src/views/AgentMonitor.vue` |
| Create | `modules/mission-control/frontend/src/views/LogViewer.vue` |
| Create | `modules/mission-control/frontend/src/views/CostTracker.vue` |
| Create | `modules/mission-control/frontend/src/views/AuditLog.vue` |
| Create | `modules/mission-control/frontend/src/components/KpiCard.vue` |
| Create | `modules/mission-control/frontend/src/components/AgentCard.vue` |

### Step 7.1: KPI Card Komponente

**`modules/mission-control/frontend/src/components/KpiCard.vue`:**
```vue
<script setup lang="ts">
/**
 * KPI-Karte fuer Dashboard-Metriken.
 * Zeigt einen Wert mit Label und optionalem Trend-Indikator.
 */
defineProps<{
  label: string;
  value: string | number;
  icon?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}>();
</script>

<template>
  <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-5">
    <div class="flex items-center justify-between mb-3">
      <span class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ label }}</span>
      <span v-if="icon" :class="icon" class="text-xl text-primary-500" />
    </div>
    <div class="text-2xl font-bold text-surface-900 dark:text-surface-0">{{ value }}</div>
    <div v-if="trendValue" class="mt-2 text-sm" :class="{
      'text-green-500': trend === 'up',
      'text-red-500': trend === 'down',
      'text-surface-400': trend === 'neutral',
    }">
      {{ trendValue }}
    </div>
  </div>
</template>
```

### Step 7.2: Agent Card Komponente

**`modules/mission-control/frontend/src/components/AgentCard.vue`:**
```vue
<script setup lang="ts">
import type { AgentSessionView } from "../stores/agent-sessions.store";

/**
 * Karte fuer einen laufenden Agent.
 * Zeigt Typ, Modul, Steps, Kosten und aktuelle Tool-Calls.
 */
defineProps<{
  agent: AgentSessionView;
}>();

function formatDuration(startedAt: string): string {
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function lastToolCall(agent: AgentSessionView) {
  return agent.toolCalls.length > 0
    ? agent.toolCalls[agent.toolCalls.length - 1]
    : null;
}
</script>

<template>
  <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-primary-200 dark:border-primary-800 p-4">
    <div class="flex items-center justify-between mb-2">
      <span class="font-semibold text-surface-900 dark:text-surface-0">
        {{ agent.agentType === 'main' ? 'Main Agent' : `${agent.moduleName} Agent` }}
      </span>
      <span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        {{ agent.status }}
      </span>
    </div>
    <div class="text-sm text-surface-500 dark:text-surface-400 space-y-1">
      <div>Step {{ agent.steps }}/30 | {{ agent.costUsd.toFixed(4) }} USD | {{ formatDuration(agent.startedAt) }}</div>
      <div>{{ agent.channel }} → {{ agent.userId }}</div>
      <div v-if="lastToolCall(agent)" class="text-primary-600 dark:text-primary-400 font-mono text-xs mt-1">
        → {{ lastToolCall(agent)!.tool }}({{ Object.keys(lastToolCall(agent)!.args).join(', ') }})
      </div>
    </div>
  </div>
</template>
```

### Step 7.3: Dashboard View

**`modules/mission-control/frontend/src/views/Dashboard.vue`:**
```vue
<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useAgentSessionsStore } from "../stores/agent-sessions.store";
import { useCostsStore } from "../stores/costs.store";
import { useHealthStore } from "../stores/health.store";
import KpiCard from "../components/KpiCard.vue";
import AgentCard from "../components/AgentCard.vue";

/**
 * Mission Control Dashboard — Uebersichtsseite.
 * Zeigt KPIs, laufende Agents und letzte Sessions.
 */
const agentStore = useAgentSessionsStore();
const costsStore = useCostsStore();
const healthStore = useHealthStore();

let refreshInterval: ReturnType<typeof setInterval>;

onMounted(async () => {
  await Promise.all([
    agentStore.fetchRunningAgents(),
    agentStore.fetchRecentSessions(10),
    costsStore.fetchCosts({ from: new Date().toISOString().split("T")[0] }),
    healthStore.fetchHealth(),
  ]);

  // Auto-Refresh alle 10 Sekunden
  refreshInterval = setInterval(() => {
    agentStore.fetchRunningAgents();
    healthStore.fetchHealth();
  }, 10_000);
});

onUnmounted(() => {
  clearInterval(refreshInterval);
});

function statusIcon(status: string): string {
  switch (status) {
    case "completed": return "✅";
    case "failed": return "❌";
    case "timeout": return "⏰";
    case "awaiting_approval": return "⏳";
    default: return "🔄";
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Mission Control</h1>

    <!-- KPI Row -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Active Agents"
        :value="agentStore.runningCount"
        icon="i-heroicons-cpu-chip"
      />
      <KpiCard
        label="Sessions Today"
        :value="agentStore.todaySessionCount"
        icon="i-heroicons-chart-bar"
      />
      <KpiCard
        label="Cost Today"
        :value="`€${costsStore.totalEur.toFixed(2)}`"
        icon="i-heroicons-currency-euro"
      />
      <KpiCard
        label="System"
        :value="healthStore.health?.status ?? 'unknown'"
        icon="i-heroicons-heart"
      />
    </div>

    <!-- Live Agents -->
    <div>
      <h2 class="text-lg font-semibold text-surface-800 dark:text-surface-100 mb-3">Live Agents</h2>
      <div v-if="agentStore.runningAgents.length === 0" class="text-surface-400 italic">
        Keine aktiven Agents.
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AgentCard
          v-for="agent in agentStore.runningAgents"
          :key="agent.id"
          :agent="agent"
        />
      </div>
    </div>

    <!-- Recent Sessions -->
    <div>
      <h2 class="text-lg font-semibold text-surface-800 dark:text-surface-100 mb-3">Recent Sessions</h2>
      <div class="space-y-2">
        <div
          v-for="session in agentStore.recentSessions"
          :key="session.id"
          class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-lg text-sm"
        >
          <span>{{ statusIcon(session.status) }}</span>
          <span class="text-surface-500 w-14">{{ new Date(session.startedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) }}</span>
          <span class="font-medium text-surface-800 dark:text-surface-200">{{ session.moduleName }}</span>
          <span class="text-surface-400">{{ session.steps }} Steps</span>
          <span class="text-surface-400">€{{ (session.costUsd * 0.92).toFixed(4) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
```

### Step 7.4: Agent Monitor View

**`modules/mission-control/frontend/src/views/AgentMonitor.vue`:**
```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useAgentSessionsStore } from "../stores/agent-sessions.store";
import AgentCard from "../components/AgentCard.vue";

/**
 * Agent Monitor — Echtzeit-Ueberwachung via WebSocket.
 * Zeigt alle laufenden Agents mit Live-Updates.
 */
const agentStore = useAgentSessionsStore();
const wsConnected = ref(false);
let ws: WebSocket | null = null;

function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${window.location.host}/api/v1/ws`);

  ws.onopen = () => {
    wsConnected.value = true;
  };

  ws.onmessage = (event) => {
    try {
      const { type, data } = JSON.parse(event.data);
      agentStore.handleWsEvent(type, data);
    } catch {
      console.warn("[AgentMonitor] Ungueltiges WebSocket-Event:", event.data);
    }
  };

  ws.onclose = () => {
    wsConnected.value = false;
    // Reconnect nach 3 Sekunden
    setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

onMounted(async () => {
  await agentStore.fetchRunningAgents();
  await agentStore.fetchRecentSessions(20);
  connectWebSocket();
});

onUnmounted(() => {
  ws?.close();
  ws = null;
});
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Agent Monitor</h1>
      <span
        class="text-xs px-2 py-1 rounded-full"
        :class="wsConnected
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'"
      >
        {{ wsConnected ? 'Live' : 'Reconnecting...' }}
      </span>
    </div>

    <!-- Laufende Agents -->
    <div>
      <h2 class="text-lg font-semibold text-surface-800 dark:text-surface-100 mb-3">
        Running ({{ agentStore.runningCount }})
      </h2>
      <div v-if="agentStore.runningAgents.length === 0" class="text-surface-400 italic p-4">
        Keine aktiven Agents. Warte auf neue Sessions...
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AgentCard
          v-for="agent in agentStore.runningAgents"
          :key="agent.id"
          :agent="agent"
        />
      </div>
    </div>

    <!-- Letzte Sessions -->
    <div>
      <h2 class="text-lg font-semibold text-surface-800 dark:text-surface-100 mb-3">Recent Sessions</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-surface-500 border-b border-surface-200 dark:border-surface-700">
              <th class="pb-2">Status</th>
              <th class="pb-2">Time</th>
              <th class="pb-2">Agent</th>
              <th class="pb-2">Module</th>
              <th class="pb-2">Steps</th>
              <th class="pb-2">Cost</th>
              <th class="pb-2">Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="session in agentStore.recentSessions"
              :key="session.id"
              class="border-b border-surface-100 dark:border-surface-800"
            >
              <td class="py-2">
                <span class="px-2 py-0.5 rounded text-xs" :class="{
                  'bg-green-100 text-green-800': session.status === 'completed',
                  'bg-red-100 text-red-800': session.status === 'failed',
                  'bg-yellow-100 text-yellow-800': session.status === 'timeout',
                }">{{ session.status }}</span>
              </td>
              <td class="py-2 text-surface-500">{{ new Date(session.startedAt).toLocaleTimeString('de-DE') }}</td>
              <td class="py-2 font-medium">{{ session.agentType }}</td>
              <td class="py-2">{{ session.moduleName }}</td>
              <td class="py-2">{{ session.steps }}</td>
              <td class="py-2">{{ session.costUsd.toFixed(4) }} $</td>
              <td class="py-2 text-surface-400">
                {{ session.completedAt
                  ? `${((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000).toFixed(1)}s`
                  : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
```

### Step 7.5: Log Viewer View

**`modules/mission-control/frontend/src/views/LogViewer.vue`:**
```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useAuditLogStore } from "../stores/audit-log.store";

/**
 * Log Viewer — Echtzeit-Audit-Logs mit Filtern.
 */
const auditStore = useAuditLogStore();
const filterUserId = ref("");
const filterAction = ref("");
const filterResult = ref("");

async function applyFilter() {
  await auditStore.fetchLogs({
    userId: filterUserId.value || undefined,
    action: filterAction.value || undefined,
    result: filterResult.value || undefined,
    limit: 100,
  });
}

onMounted(async () => {
  await auditStore.fetchLogs({ limit: 100 });
});

function resultClass(result: string) {
  switch (result) {
    case "granted": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "denied": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "approval_requested": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    default: return "bg-surface-100 text-surface-800";
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Log Viewer</h1>

    <!-- Filter -->
    <div class="flex flex-wrap gap-3">
      <input
        v-model="filterUserId"
        type="text"
        placeholder="User ID"
        class="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 text-sm"
      />
      <input
        v-model="filterAction"
        type="text"
        placeholder="Action (e.g. mail:send)"
        class="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 text-sm"
      />
      <select
        v-model="filterResult"
        class="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 text-sm"
      >
        <option value="">All Results</option>
        <option value="granted">Granted</option>
        <option value="denied">Denied</option>
        <option value="approval_requested">Approval Requested</option>
      </select>
      <button
        class="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition"
        @click="applyFilter"
      >
        Filter
      </button>
    </div>

    <!-- Log-Tabelle -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-surface-500 border-b border-surface-200 dark:border-surface-700">
            <th class="pb-2">Time</th>
            <th class="pb-2">User</th>
            <th class="pb-2">Action</th>
            <th class="pb-2">Resource</th>
            <th class="pb-2">Result</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in auditStore.entries"
            :key="entry.id"
            class="border-b border-surface-100 dark:border-surface-800"
          >
            <td class="py-2 text-surface-500 font-mono text-xs">
              {{ new Date(entry.timestamp).toLocaleString('de-DE') }}
            </td>
            <td class="py-2">{{ entry.userId }}</td>
            <td class="py-2 font-mono text-xs">{{ entry.action }}</td>
            <td class="py-2">{{ entry.resource }}</td>
            <td class="py-2">
              <span class="px-2 py-0.5 rounded text-xs" :class="resultClass(entry.result)">
                {{ entry.result }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="auditStore.entries.length === 0 && !auditStore.isLoading" class="text-center text-surface-400 py-8">
      Keine Log-Eintraege gefunden.
    </div>
  </div>
</template>
```

### Step 7.6: Cost Tracker View

**`modules/mission-control/frontend/src/views/CostTracker.vue`:**
```vue
<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useCostsStore } from "../stores/costs.store";
import VueApexCharts from "vue3-apexcharts";
import KpiCard from "../components/KpiCard.vue";

/**
 * Cost Tracker — KI-Kosten pro Modul, Provider und Zeitraum.
 * Visualisierung mit ApexCharts.
 */
const costsStore = useCostsStore();
const selectedGroupBy = ref<"module" | "provider" | "model">("module");

// ApexCharts Konfiguration
const chartOptions = ref({
  chart: {
    type: "bar" as const,
    height: 350,
    toolbar: { show: false },
  },
  colors: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"],
  plotOptions: {
    bar: { borderRadius: 6, horizontal: false },
  },
  xaxis: {
    categories: [] as string[],
  },
  yaxis: {
    title: { text: "Cost (USD)" },
  },
  tooltip: {
    y: { formatter: (val: number) => `$${val.toFixed(4)}` },
  },
});

const chartSeries = ref([{
  name: "Cost (USD)",
  data: [] as number[],
}]);

watch(
  () => costsStore.costGroups,
  (groups) => {
    chartOptions.value.xaxis.categories = groups.map((g) => g.label);
    chartSeries.value = [{
      name: "Cost (USD)",
      data: groups.map((g) => g.totalUsd),
    }];
  },
  { deep: true }
);

async function loadCosts() {
  await costsStore.fetchCosts({ groupBy: selectedGroupBy.value });
}

onMounted(loadCosts);
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Cost Tracker</h1>
      <div class="flex gap-2">
        <button
          v-for="group in (['module', 'provider', 'model'] as const)"
          :key="group"
          class="px-3 py-1.5 rounded-lg text-sm transition"
          :class="selectedGroupBy === group
            ? 'bg-primary-500 text-white'
            : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'"
          @click="selectedGroupBy = group; loadCosts()"
        >
          {{ group.charAt(0).toUpperCase() + group.slice(1) }}
        </button>
      </div>
    </div>

    <!-- KPI Row -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <KpiCard
        label="Total (USD)"
        :value="`$${costsStore.totalUsd.toFixed(4)}`"
        icon="i-heroicons-banknotes"
      />
      <KpiCard
        label="Total (EUR)"
        :value="`€${costsStore.totalEur.toFixed(4)}`"
        icon="i-heroicons-currency-euro"
      />
      <KpiCard
        label="Groups"
        :value="costsStore.costGroups.length"
        icon="i-heroicons-squares-2x2"
      />
    </div>

    <!-- Chart -->
    <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
      <VueApexCharts
        type="bar"
        height="350"
        :options="chartOptions"
        :series="chartSeries"
      />
    </div>

    <!-- Detail-Tabelle -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-surface-500 border-b border-surface-200 dark:border-surface-700">
            <th class="pb-2">{{ selectedGroupBy.charAt(0).toUpperCase() + selectedGroupBy.slice(1) }}</th>
            <th class="pb-2 text-right">Calls</th>
            <th class="pb-2 text-right">Tokens</th>
            <th class="pb-2 text-right">Cost (USD)</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="group in costsStore.costGroups"
            :key="group.label"
            class="border-b border-surface-100 dark:border-surface-800"
          >
            <td class="py-2 font-medium">{{ group.label }}</td>
            <td class="py-2 text-right">{{ group.count }}</td>
            <td class="py-2 text-right">{{ group.totalTokens.toLocaleString() }}</td>
            <td class="py-2 text-right font-mono">${{ group.totalUsd.toFixed(4) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
```

### Step 7.7: Audit Log View

**`modules/mission-control/frontend/src/views/AuditLog.vue`:**
```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useAuditLogStore } from "../stores/audit-log.store";

/**
 * Audit Log — Permission-Trail.
 * Fokussiert auf granted/denied-Uebersicht fuer Compliance.
 */
const auditStore = useAuditLogStore();
const filterResult = ref("");
const dateFrom = ref("");
const dateTo = ref("");

async function loadAudit() {
  await auditStore.fetchLogs({
    result: filterResult.value || undefined,
    from: dateFrom.value || undefined,
    to: dateTo.value || undefined,
    limit: 100,
  });
}

onMounted(loadAudit);

function resultBadge(result: string) {
  switch (result) {
    case "granted": return { label: "Granted", class: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
    case "denied": return { label: "Denied", class: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
    case "approval_requested": return { label: "Pending", class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };
    case "approval_granted": return { label: "Approved", class: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
    case "approval_denied": return { label: "Rejected", class: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
    default: return { label: result, class: "bg-surface-100 text-surface-800" };
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Audit Log</h1>

    <!-- Filter -->
    <div class="flex flex-wrap gap-3 items-end">
      <div>
        <label class="block text-xs text-surface-500 mb-1">Result</label>
        <select
          v-model="filterResult"
          class="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 text-sm"
        >
          <option value="">All</option>
          <option value="granted">Granted</option>
          <option value="denied">Denied</option>
          <option value="approval_requested">Approval Requested</option>
          <option value="approval_granted">Approval Granted</option>
          <option value="approval_denied">Approval Denied</option>
        </select>
      </div>
      <div>
        <label class="block text-xs text-surface-500 mb-1">From</label>
        <input v-model="dateFrom" type="date" class="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 text-sm" />
      </div>
      <div>
        <label class="block text-xs text-surface-500 mb-1">To</label>
        <input v-model="dateTo" type="date" class="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 text-sm" />
      </div>
      <button
        class="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition"
        @click="loadAudit"
      >
        Apply
      </button>
    </div>

    <!-- Audit-Tabelle -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-surface-500 border-b border-surface-200 dark:border-surface-700">
            <th class="pb-2">Timestamp</th>
            <th class="pb-2">User</th>
            <th class="pb-2">Agent</th>
            <th class="pb-2">Action</th>
            <th class="pb-2">Resource</th>
            <th class="pb-2">Result</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in auditStore.entries"
            :key="entry.id"
            class="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800"
          >
            <td class="py-2 text-surface-500 font-mono text-xs whitespace-nowrap">
              {{ new Date(entry.timestamp).toLocaleString('de-DE') }}
            </td>
            <td class="py-2 font-mono text-xs">{{ entry.userId }}</td>
            <td class="py-2 font-mono text-xs">{{ entry.agentId }}</td>
            <td class="py-2 font-mono text-xs text-primary-600 dark:text-primary-400">{{ entry.action }}</td>
            <td class="py-2">{{ entry.resource }}</td>
            <td class="py-2">
              <span class="px-2 py-0.5 rounded text-xs" :class="resultBadge(entry.result).class">
                {{ resultBadge(entry.result).label }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="auditStore.entries.length === 0 && !auditStore.isLoading" class="text-center text-surface-400 py-8">
      Keine Audit-Eintraege im gewaehlten Zeitraum.
    </div>
  </div>
</template>
```

### Commit

```
feat(mission-control): add Dashboard, AgentMonitor, LogViewer, CostTracker, and AuditLog views
```

---

## Task 8: Module Registration + Integration Wiring

**Ziel:** Mission Control in `template/backend/src/index.ts` registrieren, WebSocket-Events fuer Echtzeit-Updates verdrahten, Frontend-Modul in den Module-Loader eintragen.

### Files

| Action | Path |
|--------|------|
| Modify | `template/backend/src/index.ts` |
| Modify | `template/frontend/src/module-loader.ts` |
| Create | `modules/mission-control/backend/src/ws-handler.ts` |

### Step 8.1: WebSocket-Handler

**`modules/mission-control/backend/src/ws-handler.ts`:**
```typescript
/**
 * WebSocket-Handler fuer Mission Control Echtzeit-Events.
 * Nutzt das org-scoped WebSocket-System des Frameworks.
 *
 * Events:
 * - agent:started   — Neuer Agent gestartet
 * - agent:step      — Agent hat einen Tool-Call ausgefuehrt
 * - agent:completed — Agent-Session abgeschlossen
 */

export interface McWebSocketDeps {
  /** Framework WebSocket-Broadcast-Funktion (org-scoped) */
  broadcast: (channel: string, event: string, data: unknown) => void;
}

/**
 * Erstellt einen Broadcast-Helper fuer Mission Control Events.
 * Sendet Events an den "mission-control" WebSocket-Channel.
 */
export function createMcBroadcaster(deps: McWebSocketDeps) {
  return (event: string, data: unknown) => {
    deps.broadcast("mission-control", event, data);
  };
}
```

### Step 8.2: Template-Backend anpassen

**`template/backend/src/index.ts`** — Mission Control Plugin importieren und registrieren:

```typescript
import { defineServer } from "@framework/index";
import { getModuleRegistry } from "./module-registry";

// --- Module Imports ---
import { plugin as missionControlPlugin } from "../../modules/mission-control/backend/src/plugin";

// --- Module registrieren ---
const registry = getModuleRegistry();
registry.register(missionControlPlugin); // MANDATORY — immer registriert

// --- Server starten ---
const server = defineServer({
  port: 3000,
  jwtExpiresAfter: 60 * 60 * 24 * 30,
  appName: "Super App",
  basePath: "/api/v1",
  loginUrl: "/login.html",
  magicLoginVerifyUrl: "/magic-login-verify.html",
  staticPublicDataPath: "./public",
  staticPrivateDataPath: "./static",

  customDbSchema: {
    ...registry.getMergedSchema(),
  },
  customHonoApps: registry.getMergedRoutes().map((route) => ({
    baseRoute: route.baseRoute,
    app: route.app,
  })),
  jobHandlers: registry.getMergedJobs(),
});

export default server;
```

### Step 8.3: Frontend Module-Loader anpassen

**`template/frontend/src/module-loader.ts`** — Mission Control importieren:

```typescript
import { moduleDefinition as missionControl } from "../../modules/mission-control/frontend/src/module";

// Mission Control ist IMMER geladen — mandatory module
export const builtInModules = [
  missionControl,
];

// Weitere Module werden dynamisch geladen
export async function loadOptionalModules() {
  const modules = [];
  // Hier werden optionale Module dynamisch importiert
  // z.B. const mail = await import("../../modules/mail/frontend/src/module");
  return modules;
}
```

### Commit

```
feat(mission-control): wire module into template backend registry and frontend module-loader
```

---

## Task 9: Finalisierung — Tests, Typecheck, Verifikation

**Ziel:** Alle Tests laufen, Typen stimmen, Modul ist vollstaendig integriert.

### Files

| Action | Path |
|--------|------|
| Verify | Alle Dateien aus Tasks 1–8 |

### Step 9.1: Index-Exports pruefen

Sicherstellen dass alle Backend-Exports korrekt aus `plugin.ts` kommen:

```typescript
// Soll exportieren: moduleConfig, schema, tools, plugin
import { plugin, moduleConfig } from "./plugin";
import { mcSchema } from "./db/schema";
import { mcTools } from "./tools";
```

### Step 9.2: Alle Tests ausfuehren

```bash
# Schema-Tests
cd modules/mission-control/backend && bun test tests/schema.test.ts

# Service-Tests
cd modules/mission-control/backend && bun test tests/services.test.ts

# Route-Tests
cd modules/mission-control/backend && bun test tests/routes.test.ts

# Tool-Tests
cd modules/mission-control/backend && bun test tests/tools.test.ts

# Security-Tests
cd modules/mission-control/backend && bun test tests/security.test.ts

# Alle Tests zusammen
cd modules/mission-control/backend && bun test
```

### Step 9.3: Typecheck ueber alles

```bash
cd modules/mission-control/backend && bun run typecheck
```

### Step 9.4: Integrationscheck

```bash
# Pruefen ob das Plugin korrekt importiert werden kann
cd /Users/toby/Documents/github/projekte/super-app && bun -e "
  import { plugin } from './modules/mission-control/backend/src/plugin';
  console.log('Module:', plugin.config.name);
  console.log('Version:', plugin.config.version);
  console.log('Schema tables:', Object.keys(plugin.schema));
  console.log('Tools:', Object.keys(plugin.tools));
  console.log('Permissions:', JSON.stringify(plugin.config.permissions));
"
```

### Commit

```
chore(mission-control): finalize module, verify all tests pass and types check
```

---

## Zusammenfassung der Deliverables

| # | Deliverable | Pfad | Tests |
|---|-------------|------|-------|
| 1 | Modul-Grundstruktur | `modules/mission-control/` | — |
| 2 | Database Schema | `modules/mission-control/backend/src/db/schema.ts` | `tests/schema.test.ts` |
| 3 | Agent Session + Audit Log Services | `modules/mission-control/backend/src/services/` | `tests/services.test.ts` |
| 4 | REST API Routes | `modules/mission-control/backend/src/routes/` | `tests/routes.test.ts` |
| 5 | AI Tools + Plugin + Entry Points | `modules/mission-control/backend/src/{tools,plugin,index}.ts` | `tests/tools.test.ts`, `tests/security.test.ts` |
| 6 | Frontend Stores | `modules/mission-control/frontend/src/stores/` | — |
| 7 | Frontend Views | `modules/mission-control/frontend/src/views/` | — |
| 8 | Module Registration Wiring | `template/backend/src/index.ts`, `template/frontend/src/module-loader.ts` | — |

## Abhaengigkeiten zwischen Tasks

```
Task 1 (Modul-Grundstruktur)
  └── Task 2 (Database Schema)
       ├── Task 3 (Services) — braucht Schema-Typen
       │    └── Task 4 (Routes) — braucht Services
       └── Task 5 (Tools + Plugin) — braucht Schema + Services
            └── Task 8 (Registration Wiring) — braucht Plugin
  └── Task 6 (Frontend Stores) — braucht REST API Definition aus Task 4
       └── Task 7 (Frontend Views) — braucht Stores
Task 9 (Finalisierung) — haengt von allen ab
```

**Parallelisierbar:** Task 3 + Task 5 (beide brauchen nur Task 2). Task 6 kann parallel zu Task 5 beginnen (braucht nur die API-Spezifikation, nicht die Implementierung).

## Verifikation nach Abschluss

```bash
# 1. Alle Backend-Tests
cd /Users/toby/Documents/github/projekte/super-app/modules/mission-control/backend && bun test

# 2. Typecheck
cd /Users/toby/Documents/github/projekte/super-app/modules/mission-control/backend && bun run typecheck

# 3. Plugin-Import-Check
cd /Users/toby/Documents/github/projekte/super-app && bun -e "
  import { plugin } from './modules/mission-control/backend/src/plugin';
  console.log('Name:', plugin.config.name);
  console.log('Tables:', Object.keys(plugin.schema));
  console.log('Tools:', Object.keys(plugin.tools));
  console.log('OK');
"

# 4. Route-Smoke-Test (standalone)
cd /Users/toby/Documents/github/projekte/super-app/modules/mission-control/backend && timeout 5 bun run src/index.ts &
sleep 2 && curl -s http://localhost:3010/api/v1/mission-control/health | jq .
kill %1

# 5. Frontend-Dateien vorhanden
ls -la /Users/toby/Documents/github/projekte/super-app/modules/mission-control/frontend/src/views/
ls -la /Users/toby/Documents/github/projekte/super-app/modules/mission-control/frontend/src/stores/
```
