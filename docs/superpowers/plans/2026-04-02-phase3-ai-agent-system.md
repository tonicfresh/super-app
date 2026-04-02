# Phase 3: AI Agent System

**Date:** 2026-04-02
**Status:** Ready
**Spec:** `docs/superpowers/specs/2026-04-02-super-app-architecture-design.md` (Section 4, 6, 7)
**Depends on:** Phase 1 (Shared Types + Core Backend), Phase 2 (Auth), Phase 4 (AI Providers & Cost Tracking)
**For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development**

---

## Ziel

Vollstaendiges AI-Agent-System fuer die Super App: Main Agent mit ToolLoopAgent, Module Connector fuer dynamisches Tool-Loading, Sub-Agent-Pattern, Chat-API-Channel, Privacy Layer und Human-in-the-Loop. Nach dieser Phase kann der Agent ueber die REST-API gesteuert werden, Tools aus allen registrierten Modulen nutzen und Kosten automatisch tracken.

## Voraussetzungen

- Phase 1 abgeschlossen (shared/, module-registry, cost-tracking, guardrails)
- Phase 2 abgeschlossen (Auth-System, JWT, userId/tenantId im Request-Context)
- Bun Runtime installiert
- PostgreSQL laeuft (fuer Integrationstests)
- Vercel AI SDK installiert (`ai` Package)
- Phase 4 stellt die Provider Registry bereit (LanguageModelV1 per Dependency Injection)

## Konventionen

- **Runtime:** Bun
- **Validation:** Valibot (NICHT Zod — trotz AI SDK Beispielen in der Spec die `z` verwenden)
- **ORM:** Drizzle ORM
- **Testing:** `bun:test`
- **Commit-Messages:** Englisch, Conventional Commits
- **TDD:** Tests zuerst, dann Implementierung
- **Path-Alias:** `@framework/*` mappt auf `./framework/src/*` (tsconfig im template/backend)
- **AI SDK Imports:** `import { tool, streamText, generateText } from "ai";`

> **Hinweis:** Phase 3 setzt voraus, dass Phase 4 (AI Providers & Cost Tracking) die Provider Registry
> (`providers.ts`) bereitstellt. Das AI-Agent-System verwendet Dependency Injection — `model: LanguageModelV1`
> wird als Parameter uebergeben, nicht direkt aus einer lokalen `providers.ts` importiert.

---

## Task 1: Module Connector — Tool Loading mit Permission-Filtering

**Ziel:** `template/backend/src/ai/module-connector.ts` — `loadModuleTools()` filtert Tools nach User-Permissions, `loadSubAgents()` erstellt Sub-Agent-Tools fuer jeden Modul.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/ai/module-connector.ts` |
| Create | `template/backend/src/ai/module-connector.test.ts` |

### Step 1.1: Tests schreiben (TDD)

- [ ] Test-Datei anlegen

**`template/backend/src/ai/module-connector.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  loadModuleTools,
  loadSubAgents,
  createDynamicAgentTool,
  type ModuleConnectorDeps,
} from "./module-connector";
import type { ModulePlugin } from "@super-app/shared";

// --- Test-Fixtures ---

const mailPlugin: ModulePlugin = {
  config: {
    name: "mail",
    version: "1.0.0",
    permissions: {
      base: { read: "mail:read", write: "mail:write", update: "mail:update", delete: "mail:delete" },
      custom: { send: "mail:send" },
    },
  },
  tools: {
    sendMail: { _isTool: true, _module: "mail" },
    searchMail: { _isTool: true, _module: "mail" },
  },
};

const todosPlugin: ModulePlugin = {
  config: {
    name: "todos",
    version: "1.0.0",
    permissions: {
      base: { read: "todos:read", write: "todos:write", update: "todos:update", delete: "todos:delete" },
    },
  },
  tools: {
    createTodo: { _isTool: true, _module: "todos" },
    listTodos: { _isTool: true, _module: "todos" },
  },
};

const docsPlugin: ModulePlugin = {
  config: {
    name: "docs",
    version: "1.0.0",
    permissions: {
      base: { read: "docs:read", write: "docs:write", update: "docs:update", delete: "docs:delete" },
    },
  },
  // Kein tools-Export
};

describe("Module Connector", () => {
  describe("loadModuleTools()", () => {
    it("should load all tools for a user with full access", async () => {
      const deps: ModuleConnectorDeps = {
        getRegisteredModules: () => [mailPlugin, todosPlugin],
        checkModuleAccess: mock(async () => true),
      };

      const tools = await loadModuleTools("user-1", "tenant-1", deps);

      expect(Object.keys(tools)).toHaveLength(4);
      expect(tools).toHaveProperty("sendMail");
      expect(tools).toHaveProperty("searchMail");
      expect(tools).toHaveProperty("createTodo");
      expect(tools).toHaveProperty("listTodos");
    });

    it("should filter tools by user module access", async () => {
      const deps: ModuleConnectorDeps = {
        getRegisteredModules: () => [mailPlugin, todosPlugin],
        checkModuleAccess: mock(async (_userId: string, _tenantId: string, moduleName: string) => {
          return moduleName === "todos"; // Nur Todos-Zugriff
        }),
      };

      const tools = await loadModuleTools("user-2", "tenant-1", deps);

      expect(Object.keys(tools)).toHaveLength(2);
      expect(tools).not.toHaveProperty("sendMail");
      expect(tools).toHaveProperty("createTodo");
      expect(tools).toHaveProperty("listTodos");
    });

    it("should return empty object if user has no module access", async () => {
      const deps: ModuleConnectorDeps = {
        getRegisteredModules: () => [mailPlugin, todosPlugin],
        checkModuleAccess: mock(async () => false),
      };

      const tools = await loadModuleTools("user-3", "tenant-1", deps);

      expect(Object.keys(tools)).toHaveLength(0);
    });

    it("should skip modules without tools", async () => {
      const deps: ModuleConnectorDeps = {
        getRegisteredModules: () => [docsPlugin],
        checkModuleAccess: mock(async () => true),
      };

      const tools = await loadModuleTools("user-1", "tenant-1", deps);

      expect(Object.keys(tools)).toHaveLength(0);
    });

    it("should call checkModuleAccess with correct parameters", async () => {
      const checkFn = mock(async () => true);
      const deps: ModuleConnectorDeps = {
        getRegisteredModules: () => [mailPlugin],
        checkModuleAccess: checkFn,
      };

      await loadModuleTools("user-42", "tenant-7", deps);

      expect(checkFn).toHaveBeenCalledWith("user-42", "tenant-7", "mail");
    });
  });

  describe("loadSubAgents()", () => {
    it("should create a sub-agent tool for each module with tools", async () => {
      const deps: ModuleConnectorDeps = {
        getRegisteredModules: () => [mailPlugin, todosPlugin, docsPlugin],
        checkModuleAccess: mock(async () => true),
      };

      const subAgentTools = await loadSubAgents("user-1", "tenant-1", deps);

      expect(Object.keys(subAgentTools)).toHaveLength(2); // mail + todos, nicht docs
      expect(subAgentTools).toHaveProperty("mailAgent");
      expect(subAgentTools).toHaveProperty("todosAgent");
      expect(subAgentTools).not.toHaveProperty("docsAgent");
    });

    it("should filter sub-agents by user access", async () => {
      const deps: ModuleConnectorDeps = {
        getRegisteredModules: () => [mailPlugin, todosPlugin],
        checkModuleAccess: mock(async (_u: string, _t: string, mod: string) => mod === "mail"),
      };

      const subAgentTools = await loadSubAgents("user-1", "tenant-1", deps);

      expect(Object.keys(subAgentTools)).toHaveLength(1);
      expect(subAgentTools).toHaveProperty("mailAgent");
      expect(subAgentTools).not.toHaveProperty("todosAgent");
    });

    it("should name sub-agent tools with pattern <moduleName>Agent", async () => {
      const deps: ModuleConnectorDeps = {
        getRegisteredModules: () => [mailPlugin],
        checkModuleAccess: mock(async () => true),
      };

      const subAgentTools = await loadSubAgents("user-1", "tenant-1", deps);
      const keys = Object.keys(subAgentTools);

      expect(keys[0]).toBe("mailAgent");
    });
  });

  describe("createDynamicAgentTool()", () => {
    it("should create a tool with correct description", () => {
      const deps: ModuleConnectorDeps = {
        getRegisteredModules: () => [mailPlugin, todosPlugin],
        checkModuleAccess: mock(async () => true),
      };

      const dynamicTool = createDynamicAgentTool(deps);

      expect(dynamicTool).toBeDefined();
      expect(dynamicTool.description).toContain("cross-module");
    });
  });
});
```

### Step 1.2: Implementierung

- [ ] Module Connector implementieren

**`template/backend/src/ai/module-connector.ts`:**
```typescript
// ============================================================
// Module Connector — Verbindet Module mit dem Agent-System
// ============================================================

import { tool } from "ai";
import * as v from "valibot";
import type { ModulePlugin } from "@super-app/shared";

// --- Dependency Injection ---

export interface ModuleConnectorDeps {
  /** Gibt alle registrierten Module zurueck (aus module-registry) */
  getRegisteredModules: () => ModulePlugin[];
  /** Prueft ob ein User Zugriff auf ein Modul hat */
  checkModuleAccess: (
    userId: string,
    tenantId: string,
    moduleName: string
  ) => Promise<boolean>;
}

/**
 * Laedt alle AI-Tools aus registrierten Modulen,
 * gefiltert nach User-Berechtigungen.
 *
 * Gibt ein flaches Tool-Objekt zurueck (Tool-Name → Tool).
 */
export async function loadModuleTools(
  userId: string,
  tenantId: string,
  deps: ModuleConnectorDeps
): Promise<Record<string, unknown>> {
  const modules = deps.getRegisteredModules();
  const tools: Record<string, unknown> = {};

  for (const mod of modules) {
    if (!mod.tools) continue;

    const hasAccess = await deps.checkModuleAccess(
      userId,
      tenantId,
      mod.config.name
    );
    if (!hasAccess) continue;

    Object.assign(tools, mod.tools);
  }

  return tools;
}

/**
 * Erstellt Sub-Agent-Tools fuer jedes Modul mit Tools.
 * Jeder Sub-Agent ist ein ToolLoopAgent mit stopWhen: stepCountIs(10).
 * Sub-Agents werden als Tools fuer den Main Agent registriert.
 *
 * Naming: `<moduleName>Agent` (z.B. "mailAgent", "todosAgent")
 */
export async function loadSubAgents(
  userId: string,
  tenantId: string,
  deps: ModuleConnectorDeps
): Promise<Record<string, ReturnType<typeof tool>>> {
  const modules = deps.getRegisteredModules();
  const subAgentTools: Record<string, ReturnType<typeof tool>> = {};

  for (const mod of modules) {
    if (!mod.tools) continue;

    const hasAccess = await deps.checkModuleAccess(
      userId,
      tenantId,
      mod.config.name
    );
    if (!hasAccess) continue;

    const modName = mod.config.name;
    const modTools = mod.tools;

    subAgentTools[`${modName}Agent`] = tool({
      description: `Handle complex ${modName} tasks. Delegates to a specialized ${modName} sub-agent with access to all ${modName} tools. Use for multi-step ${modName} operations.`,
      parameters: v.object({
        task: v.pipe(v.string(), v.minLength(1)),
      }),
      execute: async ({ task }) => {
        // Der eigentliche Sub-Agent wird im Main Agent erstellt
        // (mit generateText und den Modul-Tools).
        // Hier geben wir die Konfiguration zurueck,
        // die der Main Agent zum Erstellen des Sub-Agents braucht.
        //
        // In der echten Implementierung wird hier ein ToolLoopAgent
        // mit generateText() aufgerufen. Fuer jetzt ist das die
        // Schnittstelle die der Main Agent nutzt.
        return {
          _subAgent: true,
          moduleName: modName,
          task,
          tools: modTools,
        };
      },
    });
  }

  return subAgentTools;
}

/**
 * Erstellt das Dynamic-Agent-Tool fuer moduluebergreifende Aufgaben.
 * Der Main Agent kann damit temporaere Agents mit Tools aus mehreren
 * Modulen erstellen.
 */
export function createDynamicAgentTool(
  deps: ModuleConnectorDeps
): ReturnType<typeof tool> {
  return tool({
    description:
      "Create a temporary specialized agent for complex cross-module tasks. " +
      "Use when a task requires tools from multiple modules working together.",
    parameters: v.object({
      task: v.pipe(v.string(), v.minLength(1)),
      requiredModules: v.array(v.pipe(v.string(), v.minLength(1))),
    }),
    execute: async ({ task, requiredModules }) => {
      const allModules = deps.getRegisteredModules();
      const selectedTools: Record<string, unknown> = {};

      for (const modName of requiredModules) {
        const mod = allModules.find((m) => m.config.name === modName);
        if (mod?.tools) {
          Object.assign(selectedTools, mod.tools);
        }
      }

      if (Object.keys(selectedTools).length === 0) {
        return {
          success: false,
          message: `No tools found for modules: ${requiredModules.join(", ")}`,
        };
      }

      // Konfiguration fuer den dynamischen Agent
      return {
        _dynamicAgent: true,
        task,
        requiredModules,
        tools: selectedTools,
      };
    },
  });
}
```

### Step 1.3: Tests ausfuehren

- [ ] Tests ausfuehren

```bash
cd template/backend && bun test src/ai/module-connector.test.ts
```

### Commit

```
feat(ai): add module-connector with permission-filtered tool loading and sub-agent creation
```

---

## Task 2: Main Agent

**Ziel:** `template/backend/src/ai/main-agent.ts` — ToolLoopAgent der User-Eingaben von jedem Channel annimmt, alle Modul-Tools nutzt (gefiltert nach Permissions), mit `stopWhen: stepCountIs(30)` und `onStepFinish` Callback fuer Cost-Tracking + Mission Control Logging.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/ai/main-agent.ts` |
| Create | `template/backend/src/ai/main-agent.test.ts` |

### Step 2.1: Tests schreiben (TDD)

- [ ] Test-Datei anlegen

**`template/backend/src/ai/main-agent.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { LanguageModelV1 } from "ai";
import {
  createMainAgent,
  type MainAgentConfig,
  type MainAgentDeps,
  type AgentStepLog,
} from "./main-agent";

describe("Main Agent", () => {
  let stepLogs: AgentStepLog[];
  let costLogs: Array<Record<string, unknown>>;

  // Minimal mock fuer LanguageModelV1 — wird von Phase 4 Provider Registry bereitgestellt
  const mockModel = { modelId: "claude-sonnet-4-5", provider: "anthropic" } as unknown as LanguageModelV1;

  const defaultDeps: MainAgentDeps = {
    loadModuleTools: mock(async () => ({
      mockTool: { _tool: true },
    })),
    loadSubAgents: mock(async () => ({
      mockAgent: { _agent: true },
    })),
    createDynamicAgentTool: mock(() => ({ _dynamic: true })),
    model: mockModel,
    logAICost: mock(async (entry: Record<string, unknown>) => {
      costLogs.push(entry);
    }),
    logAgentStep: mock(async (step: AgentStepLog) => {
      stepLogs.push(step);
    }),
    isDebugEnabled: mock(async () => false),
  };

  beforeEach(() => {
    stepLogs = [];
    costLogs = [];
  });

  describe("createMainAgent()", () => {
    it("should create an agent config with userId and tenantId", async () => {
      const config = await createMainAgent("user-1", "tenant-1", defaultDeps);

      expect(config).toBeDefined();
      expect(config.userId).toBe("user-1");
      expect(config.tenantId).toBe("tenant-1");
    });

    it("should include module tools in the agent config", async () => {
      const config = await createMainAgent("user-1", "tenant-1", defaultDeps);

      expect(config.tools).toHaveProperty("mockTool");
    });

    it("should include sub-agent tools in the agent config", async () => {
      const config = await createMainAgent("user-1", "tenant-1", defaultDeps);

      expect(config.tools).toHaveProperty("mockAgent");
    });

    it("should include the dynamic agent tool", async () => {
      const config = await createMainAgent("user-1", "tenant-1", defaultDeps);

      expect(config.tools).toHaveProperty("createDynamicAgent");
    });

    it("should set maxSteps to 30", async () => {
      const config = await createMainAgent("user-1", "tenant-1", defaultDeps);

      expect(config.maxSteps).toBe(30);
    });

    it("should include system instructions with privacy rules", async () => {
      const config = await createMainAgent("user-1", "tenant-1", defaultDeps);

      expect(config.system).toContain("NEVER");
      expect(config.system).toContain("email");
      expect(config.system).toContain("LIMIT_REACHED");
      expect(config.system).toContain("FORBIDDEN");
    });

    it("should have an onStepFinish callback", async () => {
      const config = await createMainAgent("user-1", "tenant-1", defaultDeps);

      expect(config.onStepFinish).toBeDefined();
      expect(typeof config.onStepFinish).toBe("function");
    });
  });

  describe("onStepFinish callback", () => {
    it("should log cost on each step", async () => {
      const config = await createMainAgent("user-1", "tenant-1", defaultDeps);

      await config.onStepFinish({
        stepNumber: 1,
        usage: { promptTokens: 500, completionTokens: 100, totalTokens: 600 },
        toolCalls: [],
        finishReason: "tool-calls",
      });

      expect(defaultDeps.logAICost).toHaveBeenCalledTimes(1);
    });

    it("should log agent step on each step", async () => {
      const config = await createMainAgent("user-1", "tenant-1", defaultDeps);

      await config.onStepFinish({
        stepNumber: 2,
        usage: { promptTokens: 300, completionTokens: 50, totalTokens: 350 },
        toolCalls: [{ name: "sendMail", args: { userId: "u1" } }],
        finishReason: "tool-calls",
      });

      expect(defaultDeps.logAgentStep).toHaveBeenCalledTimes(1);
    });

    it("should include tool call info in the step log", async () => {
      const logFn = mock(async (step: AgentStepLog) => {
        stepLogs.push(step);
      });

      const config = await createMainAgent("user-1", "tenant-1", {
        ...defaultDeps,
        logAgentStep: logFn,
      });

      await config.onStepFinish({
        stepNumber: 1,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        toolCalls: [{ name: "createTodo", args: { title: "Test" } }],
        finishReason: "tool-calls",
      });

      expect(stepLogs).toHaveLength(1);
      expect(stepLogs[0].toolCalls).toHaveLength(1);
      expect(stepLogs[0].toolCalls[0].name).toBe("createTodo");
    });

    it("should pass the correct provider and model to cost logging", async () => {
      const logCostFn = mock(async (entry: Record<string, unknown>) => {
        costLogs.push(entry);
      });

      const config = await createMainAgent("user-1", "tenant-1", {
        ...defaultDeps,
        logAICost: logCostFn,
      });

      await config.onStepFinish({
        stepNumber: 1,
        usage: { promptTokens: 200, completionTokens: 80, totalTokens: 280 },
        toolCalls: [],
        finishReason: "stop",
      });

      expect(logCostFn).toHaveBeenCalledTimes(1);
      const call = logCostFn.mock.calls[0][0];
      expect(call.provider).toBe("anthropic");
      expect(call.model).toBe("claude-sonnet-4-5");
    });
  });
});
```

### Step 2.2: Implementierung

- [ ] Main Agent implementieren

**`template/backend/src/ai/main-agent.ts`:**
```typescript
// ============================================================
// Main Agent — Zentraler Einstiegspunkt fuer alle Channels
// ============================================================

import type { AICostEntry } from "@super-app/shared";
import type { LanguageModelV1 } from "ai";

// --- Typen ---

export interface AgentStepLog {
  userId: string;
  tenantId: string;
  agentType: "main" | "sub" | "dynamic";
  stepNumber: number;
  tokensInput: number;
  tokensOutput: number;
  toolCalls: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  finishReason: string;
  timestamp: Date;
}

export interface StepFinishEvent {
  stepNumber: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  finishReason: string;
}

export interface MainAgentConfig {
  userId: string;
  tenantId: string;
  system: string;
  tools: Record<string, unknown>;
  maxSteps: number;
  onStepFinish: (event: StepFinishEvent) => Promise<void>;
  /** AI-Modell — LanguageModelV1 aus Phase 4 Provider Registry */
  model: LanguageModelV1;
}

export interface MainAgentDeps {
  /** Laedt Modul-Tools gefiltert nach User-Permissions */
  loadModuleTools: (
    userId: string,
    tenantId: string
  ) => Promise<Record<string, unknown>>;
  /** Erstellt Sub-Agent-Tools fuer jedes Modul */
  loadSubAgents: (
    userId: string,
    tenantId: string
  ) => Promise<Record<string, unknown>>;
  /** Erstellt das Dynamic-Agent-Tool */
  createDynamicAgentTool: () => unknown;
  /** AI-Modell — wird von Phase 4 Provider Registry bereitgestellt */
  model: LanguageModelV1;
  /** Loggt KI-Kosten (fire-and-forget) */
  logAICost: (entry: Partial<AICostEntry>) => Promise<void>;
  /** Loggt Agent-Schritte fuer Mission Control */
  logAgentStep: (step: AgentStepLog) => Promise<void>;
  /** Prueft ob Debug-Modus aktiv ist */
  isDebugEnabled: () => Promise<boolean>;
}

/**
 * System-Instructions fuer den Main Agent.
 * Privacy-Regeln sind HART codiert — nicht aenderbar ueber Settings.
 */
const MAIN_AGENT_INSTRUCTIONS = `You are a personal assistant for the Super App platform.

Core Rules:
- You NEVER see email addresses, phone numbers, passwords, or other sensitive personal data
- You work only with user IDs, names, and boolean flags (e.g. hasEmail, hasPhone)
- When a tool returns "LIMIT_REACHED", inform the user about the limit and suggest alternatives
- When a tool returns "FORBIDDEN", tell the user they lack the required permission
- When a tool returns "VALIDATION_ERROR", explain what input was invalid
- Ask for clarification on unclear or ambiguous tasks instead of guessing
- For complex tasks involving multiple modules, use the appropriate sub-agent
- For cross-module tasks, use the createDynamicAgent tool

Response Guidelines:
- Be concise and helpful
- Use structured responses when listing data
- Always confirm destructive actions before executing
- Report remaining quotas after actions that consume limits`;

/**
 * Erstellt die Konfiguration fuer den Main Agent.
 *
 * Gibt ein Config-Objekt zurueck das vom Channel (API, Telegram)
 * mit generateText() oder streamText() verwendet wird.
 */
export async function createMainAgent(
  userId: string,
  tenantId: string,
  deps: MainAgentDeps
): Promise<MainAgentConfig> {
  // Tools laden (gefiltert nach User-Permissions)
  const moduleTools = await deps.loadModuleTools(userId, tenantId);
  const subAgentTools = await deps.loadSubAgents(userId, tenantId);
  const dynamicAgentTool = deps.createDynamicAgentTool();

  // Modell wird per Dependency Injection uebergeben (Phase 4 Provider Registry)
  const { model } = deps;

  // Alle Tools zusammenfuegen
  const tools: Record<string, unknown> = {
    ...moduleTools,
    ...subAgentTools,
    createDynamicAgent: dynamicAgentTool,
  };

  return {
    userId,
    tenantId,
    system: MAIN_AGENT_INSTRUCTIONS,
    tools,
    maxSteps: 30,
    model,

    onStepFinish: async (event: StepFinishEvent) => {
      const { stepNumber, usage, toolCalls, finishReason } = event;

      // 1. Kosten loggen (fire-and-forget)
      await deps.logAICost({
        project: "main-agent",
        provider: model.provider,
        model: model.modelId,
        tokensInput: usage.promptTokens,
        tokensOutput: usage.completionTokens,
        costUsd: 0, // Wird vom Cost-Tracker berechnet
      });

      // 2. Agent-Schritt fuer Mission Control loggen
      await deps.logAgentStep({
        userId,
        tenantId,
        agentType: "main",
        stepNumber,
        tokensInput: usage.promptTokens,
        tokensOutput: usage.completionTokens,
        toolCalls: toolCalls.map((tc) => ({
          name: tc.name,
          args: tc.args,
        })),
        finishReason,
        timestamp: new Date(),
      });

      // 3. Debug-Logging (optional)
      const debug = await deps.isDebugEnabled();
      if (debug) {
        console.log(
          `[main-agent] Step ${stepNumber}: ${toolCalls.length} tool calls, ` +
            `${usage.totalTokens} tokens, finish: ${finishReason}`
        );
      }
    },
  };
}
```

### Step 2.3: Tests ausfuehren

- [ ] Tests ausfuehren

```bash
cd template/backend && bun test src/ai/main-agent.test.ts
```

### Commit

```
feat(ai): add main-agent with ToolLoopAgent config, privacy instructions, and cost tracking
```

---

## Task 3: Sub-Agent Pattern — ToolLoopAgent per Modul

**Ziel:** `template/backend/src/ai/sub-agent.ts` — Factory fuer Modul-Sub-Agents. Jeder Sub-Agent ist ein ToolLoopAgent mit `stopWhen: stepCountIs(10)` und eigenen onStepFinish-Callbacks.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/ai/sub-agent.ts` |
| Create | `template/backend/src/ai/sub-agent.test.ts` |

### Step 3.1: Tests schreiben (TDD)

- [ ] Test-Datei anlegen

**`template/backend/src/ai/sub-agent.test.ts`:**
```typescript
import { describe, it, expect, mock } from "bun:test";
import type { LanguageModelV1 } from "ai";
import {
  createSubAgentConfig,
  type SubAgentConfig,
  type SubAgentDeps,
} from "./sub-agent";

describe("Sub-Agent", () => {
  const mockModel = { modelId: "mistral-large-latest", provider: "mistral" } as unknown as LanguageModelV1;

  const defaultDeps: SubAgentDeps = {
    model: mockModel,
    logAICost: mock(async () => {}),
    logAgentStep: mock(async () => {}),
  };

  describe("createSubAgentConfig()", () => {
    it("should create config with module name", () => {
      const config = createSubAgentConfig(
        "mail",
        { sendMail: { _tool: true } },
        "user-1",
        "tenant-1",
        defaultDeps
      );

      expect(config.moduleName).toBe("mail");
    });

    it("should set maxSteps to 10 for sub-agents", () => {
      const config = createSubAgentConfig(
        "todos",
        { createTodo: { _tool: true } },
        "user-1",
        "tenant-1",
        defaultDeps
      );

      expect(config.maxSteps).toBe(10);
    });

    it("should include module-specific instructions", () => {
      const config = createSubAgentConfig(
        "mail",
        { sendMail: { _tool: true } },
        "user-1",
        "tenant-1",
        defaultDeps
      );

      expect(config.system).toContain("mail");
      expect(config.system).toContain("specialized");
    });

    it("should include only the module tools", () => {
      const moduleTools = {
        sendMail: { _tool: true },
        searchMail: { _tool: true },
      };

      const config = createSubAgentConfig(
        "mail",
        moduleTools,
        "user-1",
        "tenant-1",
        defaultDeps
      );

      expect(Object.keys(config.tools)).toHaveLength(2);
      expect(config.tools).toHaveProperty("sendMail");
      expect(config.tools).toHaveProperty("searchMail");
    });

    it("should have onStepFinish with agentType 'sub'", async () => {
      const logFn = mock(async (step: any) => {});
      const config = createSubAgentConfig(
        "mail",
        { sendMail: { _tool: true } },
        "user-1",
        "tenant-1",
        { ...defaultDeps, logAgentStep: logFn }
      );

      await config.onStepFinish({
        stepNumber: 1,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        toolCalls: [],
        finishReason: "stop",
      });

      expect(logFn).toHaveBeenCalledTimes(1);
      const loggedStep = logFn.mock.calls[0][0];
      expect(loggedStep.agentType).toBe("sub");
      expect(loggedStep.userId).toBe("user-1");
    });

    it("should log cost with module name as project", async () => {
      const costFn = mock(async (entry: any) => {});
      const config = createSubAgentConfig(
        "todos",
        { createTodo: { _tool: true } },
        "user-1",
        "tenant-1",
        { ...defaultDeps, logAICost: costFn }
      );

      await config.onStepFinish({
        stepNumber: 1,
        usage: { promptTokens: 200, completionTokens: 80, totalTokens: 280 },
        toolCalls: [],
        finishReason: "stop",
      });

      expect(costFn).toHaveBeenCalledTimes(1);
      const loggedCost = costFn.mock.calls[0][0];
      expect(loggedCost.project).toBe("todos");
    });
  });
});
```

### Step 3.2: Implementierung

- [ ] Sub-Agent Factory implementieren

**`template/backend/src/ai/sub-agent.ts`:**
```typescript
// ============================================================
// Sub-Agent Factory — Erstellt spezialisierte Modul-Agents
// ============================================================

import type { AICostEntry } from "@super-app/shared";
import type { LanguageModelV1 } from "ai";
import type { StepFinishEvent, AgentStepLog } from "./main-agent";

// --- Typen ---

export interface SubAgentConfig {
  moduleName: string;
  system: string;
  tools: Record<string, unknown>;
  maxSteps: number;
  /** AI-Modell — LanguageModelV1 aus Phase 4 Provider Registry */
  model: LanguageModelV1;
  onStepFinish: (event: StepFinishEvent) => Promise<void>;
}

export interface SubAgentDeps {
  /** AI-Modell — wird von Phase 4 Provider Registry bereitgestellt */
  model: LanguageModelV1;
  /** Loggt KI-Kosten (fire-and-forget) */
  logAICost: (entry: Partial<AICostEntry>) => Promise<void>;
  /** Loggt Agent-Schritte fuer Mission Control */
  logAgentStep: (step: AgentStepLog) => Promise<void>;
}

/**
 * Erstellt die Konfiguration fuer einen Modul-Sub-Agent.
 *
 * Sub-Agents haben:
 * - maxSteps: 10 (weniger als Main Agent)
 * - Nur die Tools des eigenen Moduls
 * - Modul-spezifische Instructions
 * - onStepFinish mit agentType "sub"
 */
export function createSubAgentConfig(
  moduleName: string,
  moduleTools: Record<string, unknown>,
  userId: string,
  tenantId: string,
  deps: SubAgentDeps
): SubAgentConfig {
  const { model } = deps;

  return {
    moduleName,
    system: `You are the specialized agent for the "${moduleName}" module.

Rules:
- Use ONLY the tools available to you — they all belong to the ${moduleName} module
- Respond concisely with the result of your actions
- If a tool returns an error, report it clearly
- Do NOT attempt tasks outside your module scope
- Follow all privacy rules: never expose sensitive data (emails, phones, passwords)`,
    tools: { ...moduleTools },
    maxSteps: 10,
    model,

    onStepFinish: async (event: StepFinishEvent) => {
      const { stepNumber, usage, toolCalls, finishReason } = event;

      // Kosten mit Modulname als Projekt loggen
      await deps.logAICost({
        project: moduleName,
        provider: model.provider,
        model: model.modelId,
        tokensInput: usage.promptTokens,
        tokensOutput: usage.completionTokens,
        costUsd: 0,
      });

      // Agent-Schritt loggen
      await deps.logAgentStep({
        userId,
        tenantId,
        agentType: "sub",
        stepNumber,
        tokensInput: usage.promptTokens,
        tokensOutput: usage.completionTokens,
        toolCalls: toolCalls.map((tc) => ({
          name: tc.name,
          args: tc.args,
        })),
        finishReason,
        timestamp: new Date(),
      });
    },
  };
}

/**
 * Erstellt die Konfiguration fuer einen dynamischen Cross-Module Agent.
 * Gleich wie Sub-Agent, aber mit Tools aus mehreren Modulen und
 * maxSteps: 15.
 */
export function createDynamicAgentConfig(
  task: string,
  selectedTools: Record<string, unknown>,
  requiredModules: string[],
  userId: string,
  tenantId: string,
  deps: SubAgentDeps
): SubAgentConfig {
  const { model } = deps;

  return {
    moduleName: `dynamic[${requiredModules.join("+")}]`,
    system: `You are a specialized agent created for the following task: ${task}

You have access to tools from these modules: ${requiredModules.join(", ")}.
Use them to complete the task. Respond with the final result.`,
    tools: { ...selectedTools },
    maxSteps: 15,
    model,

    onStepFinish: async (event: StepFinishEvent) => {
      const { stepNumber, usage, toolCalls, finishReason } = event;

      await deps.logAICost({
        project: `dynamic-agent`,
        provider: model.provider,
        model: model.modelId,
        tokensInput: usage.promptTokens,
        tokensOutput: usage.completionTokens,
        costUsd: 0,
      });

      await deps.logAgentStep({
        userId,
        tenantId,
        agentType: "dynamic",
        stepNumber,
        tokensInput: usage.promptTokens,
        tokensOutput: usage.completionTokens,
        toolCalls: toolCalls.map((tc) => ({
          name: tc.name,
          args: tc.args,
        })),
        finishReason,
        timestamp: new Date(),
      });
    },
  };
}
```

### Step 3.3: Tests ausfuehren

- [ ] Tests ausfuehren

```bash
cd template/backend && bun test src/ai/sub-agent.test.ts
```

### Commit

```
feat(ai): add sub-agent factory with module-scoped tools and step logging
```

---

## Task 4: Chat API Channel

**Ziel:** `template/backend/src/ai/channels/api.ts` — Hono Route `POST /api/v1/ai/chat` die den Main Agent erstellt und die Antwort streamt. Nutzt AI SDK UI Streaming.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/ai/channels/api.ts` |
| Create | `template/backend/src/ai/channels/api.test.ts` |

### Step 4.1: Tests schreiben (TDD)

- [ ] Test-Datei anlegen

**`template/backend/src/ai/channels/api.test.ts`:**
```typescript
import { describe, it, expect, mock } from "bun:test";
import { Hono } from "hono";
import { createChatRoutes, type ChatRouteDeps } from "./api";

describe("Chat API Channel", () => {
  const mockDeps: ChatRouteDeps = {
    createMainAgent: mock(async (_userId: string, _tenantId: string) => ({
      userId: "user-1",
      tenantId: "tenant-1",
      system: "You are a helpful assistant.",
      tools: {},
      maxSteps: 30,
      provider: "anthropic",
      modelId: "claude-sonnet-4-5",
      onStepFinish: mock(async () => {}),
    })),
    streamText: mock(async (config: any) => ({
      toDataStreamResponse: () =>
        new Response("data: test\n\n", {
          headers: { "Content-Type": "text/event-stream" },
        }),
    })),
  };

  function createTestApp(deps: ChatRouteDeps = mockDeps) {
    const app = new Hono();
    // Auth-Middleware simulieren
    app.use("*", async (c, next) => {
      c.set("userId", "user-1");
      c.set("tenantId", "tenant-1");
      await next();
    });
    app.route("/api/v1/ai", createChatRoutes(deps));
    return app;
  }

  describe("POST /api/v1/ai/chat", () => {
    it("should return 200 with streaming response", async () => {
      const app = createTestApp();

      const res = await app.request("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    });

    it("should return 400 when messages are missing", async () => {
      const app = createTestApp();

      const res = await app.request("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("messages");
    });

    it("should return 400 when messages is not an array", async () => {
      const app = createTestApp();

      const res = await app.request("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: "not an array" }),
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 when messages array is empty", async () => {
      const app = createTestApp();

      const res = await app.request("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      });

      expect(res.status).toBe(400);
    });

    it("should pass userId and tenantId from auth context to agent", async () => {
      const createAgentFn = mock(async (userId: string, tenantId: string) => ({
        userId,
        tenantId,
        system: "test",
        tools: {},
        maxSteps: 30,
        provider: "anthropic",
        modelId: "claude-sonnet-4-5",
        onStepFinish: mock(async () => {}),
      }));

      const app = createTestApp({
        ...mockDeps,
        createMainAgent: createAgentFn,
      });

      await app.request("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hi" }],
        }),
      });

      expect(createAgentFn).toHaveBeenCalledWith("user-1", "tenant-1");
    });

    it("should pass messages to streamText", async () => {
      const streamFn = mock(async (config: any) => ({
        toDataStreamResponse: () =>
          new Response("data: ok\n\n", {
            headers: { "Content-Type": "text/event-stream" },
          }),
      }));

      const app = createTestApp({
        ...mockDeps,
        streamText: streamFn,
      });

      await app.request("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: "What is 2+2?" },
          ],
        }),
      });

      expect(streamFn).toHaveBeenCalledTimes(1);
      const callArgs = streamFn.mock.calls[0][0];
      expect(callArgs.messages).toHaveLength(1);
      expect(callArgs.messages[0].content).toBe("What is 2+2?");
    });

    it("should handle streamText errors gracefully", async () => {
      const failingStream = mock(async () => {
        throw new Error("Provider unavailable");
      });

      const app = createTestApp({
        ...mockDeps,
        streamText: failingStream,
      });

      const res = await app.request("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hi" }],
        }),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });
  });
});
```

### Step 4.2: Implementierung

- [ ] Chat API Route implementieren

**`template/backend/src/ai/channels/api.ts`:**
```typescript
// ============================================================
// Chat API Channel — REST/Streaming Endpoint fuer PWA Chat
// ============================================================

import { Hono } from "hono";
import type { MainAgentConfig } from "../main-agent";

// --- Typen ---

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRouteDeps {
  /** Erstellt den Main Agent fuer einen User */
  createMainAgent: (
    userId: string,
    tenantId: string
  ) => Promise<MainAgentConfig>;
  /** AI SDK streamText Funktion (injiziert fuer Testbarkeit) */
  streamText: (config: {
    model: any;
    system: string;
    messages: ChatMessage[];
    tools: Record<string, unknown>;
    maxSteps: number;
    onStepFinish: (event: any) => Promise<void>;
  }) => Promise<{
    toDataStreamResponse: () => Response;
  }>;
}

/**
 * Erstellt die Chat-API Hono Routes.
 *
 * Routes:
 * - POST /chat — Streaming Chat mit Main Agent
 */
export function createChatRoutes(deps: ChatRouteDeps): Hono {
  const app = new Hono();

  app.post("/chat", async (c) => {
    // 1. Request validieren
    let body: { messages?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    if (!body.messages) {
      return c.json({ error: "Field 'messages' is required" }, 400);
    }

    if (!Array.isArray(body.messages)) {
      return c.json({ error: "Field 'messages' must be an array" }, 400);
    }

    if (body.messages.length === 0) {
      return c.json({ error: "Field 'messages' must not be empty" }, 400);
    }

    const messages = body.messages as ChatMessage[];

    // 2. Auth-Context auslesen
    const userId = c.get("userId") as string;
    const tenantId = c.get("tenantId") as string;

    if (!userId || !tenantId) {
      return c.json({ error: "Authentication required" }, 401);
    }

    try {
      // 3. Main Agent erstellen
      const agentConfig = await deps.createMainAgent(userId, tenantId);

      // 4. Streaming Response erstellen
      const result = await deps.streamText({
        model: `${agentConfig.provider}:${agentConfig.modelId}`,
        system: agentConfig.system,
        messages,
        tools: agentConfig.tools,
        maxSteps: agentConfig.maxSteps,
        onStepFinish: agentConfig.onStepFinish,
      });

      return result.toDataStreamResponse();
    } catch (err) {
      console.error("[chat-api] Fehler bei Agent-Ausfuehrung:", err);
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return c.json({ error: message }, 500);
    }
  });

  return app;
}
```

### Step 4.3: Tests ausfuehren

- [ ] Tests ausfuehren

```bash
cd template/backend && bun test src/ai/channels/api.test.ts
```

### Commit

```
feat(ai): add chat API channel with streaming response and input validation
```

---

## Task 5: Privacy Layer

**Ziel:** Privacy-Tests und Utility-Funktionen die sicherstellen, dass Tools niemals sensible Daten (E-Mail-Adressen, Telefonnummern, Passwoerter) in ihren Responses exponieren.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/ai/privacy.ts` |
| Create | `template/backend/src/ai/privacy.test.ts` |

### Step 5.1: Tests schreiben (TDD)

- [ ] Test-Datei anlegen

**`template/backend/src/ai/privacy.test.ts`:**
```typescript
import { describe, it, expect } from "bun:test";
import {
  containsSensitiveData,
  sanitizeToolResponse,
  SENSITIVE_PATTERNS,
  type SensitiveDataType,
} from "./privacy";

describe("Privacy Layer", () => {
  describe("SENSITIVE_PATTERNS", () => {
    it("should detect email addresses", () => {
      expect(SENSITIVE_PATTERNS.email.test("user@example.com")).toBe(true);
      expect(SENSITIVE_PATTERNS.email.test("test.user+tag@domain.co.uk")).toBe(true);
      expect(SENSITIVE_PATTERNS.email.test("not-an-email")).toBe(false);
    });

    it("should detect phone numbers", () => {
      expect(SENSITIVE_PATTERNS.phone.test("+49 151 12345678")).toBe(true);
      expect(SENSITIVE_PATTERNS.phone.test("+1-555-123-4567")).toBe(true);
      expect(SENSITIVE_PATTERNS.phone.test("0151 12345678")).toBe(true);
      expect(SENSITIVE_PATTERNS.phone.test("hello")).toBe(false);
    });

    it("should detect password-like fields", () => {
      expect(SENSITIVE_PATTERNS.password.test("password: secret123")).toBe(true);
      expect(SENSITIVE_PATTERNS.password.test("passwd: abc")).toBe(true);
      expect(SENSITIVE_PATTERNS.password.test("just some text")).toBe(false);
    });

    it("should detect API keys", () => {
      expect(SENSITIVE_PATTERNS.apiKey.test("sk-ant-api03-abc123")).toBe(true);
      expect(SENSITIVE_PATTERNS.apiKey.test("sk_live_12345abcde")).toBe(true);
      expect(SENSITIVE_PATTERNS.apiKey.test("Bearer eyJhbGciOiJIUz")).toBe(true);
      expect(SENSITIVE_PATTERNS.apiKey.test("normal text")).toBe(false);
    });
  });

  describe("containsSensitiveData()", () => {
    it("should return false for clean data", () => {
      const cleanResult = {
        success: true,
        data: {
          userId: "usr_123",
          name: "Tobias",
          hasEmail: true,
          hasPhone: false,
        },
      };

      const result = containsSensitiveData(cleanResult);
      expect(result.found).toBe(false);
      expect(result.types).toEqual([]);
    });

    it("should detect email in nested data", () => {
      const dirtyResult = {
        success: true,
        data: {
          userId: "usr_123",
          email: "tobias@example.com",
        },
      };

      const result = containsSensitiveData(dirtyResult);
      expect(result.found).toBe(true);
      expect(result.types).toContain("email");
    });

    it("should detect phone numbers in nested data", () => {
      const dirtyResult = {
        success: true,
        data: {
          contact: {
            phone: "+49 151 12345678",
          },
        },
      };

      const result = containsSensitiveData(dirtyResult);
      expect(result.found).toBe(true);
      expect(result.types).toContain("phone");
    });

    it("should detect multiple sensitive data types", () => {
      const dirtyResult = {
        success: true,
        data: {
          email: "test@test.com",
          phone: "+49 151 0000000",
          apiKey: "sk-ant-api03-secret",
        },
      };

      const result = containsSensitiveData(dirtyResult);
      expect(result.found).toBe(true);
      expect(result.types.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle arrays in data", () => {
      const dirtyResult = {
        results: [
          { name: "Clean", id: "1" },
          { name: "Dirty", email: "user@example.com" },
        ],
      };

      const result = containsSensitiveData(dirtyResult);
      expect(result.found).toBe(true);
      expect(result.types).toContain("email");
    });

    it("should handle null and undefined values", () => {
      const result = containsSensitiveData({
        data: null,
        other: undefined,
      });
      expect(result.found).toBe(false);
    });
  });

  describe("sanitizeToolResponse()", () => {
    it("should pass through clean data unchanged", () => {
      const clean = {
        success: true,
        data: { userId: "usr_1", name: "Test" },
      };

      const sanitized = sanitizeToolResponse(clean);
      expect(sanitized).toEqual(clean);
    });

    it("should replace email addresses with [REDACTED_EMAIL]", () => {
      const dirty = {
        success: true,
        data: { contact: "user@example.com" },
      };

      const sanitized = sanitizeToolResponse(dirty);
      expect(JSON.stringify(sanitized)).not.toContain("user@example.com");
      expect(JSON.stringify(sanitized)).toContain("[REDACTED_EMAIL]");
    });

    it("should replace phone numbers with [REDACTED_PHONE]", () => {
      const dirty = {
        data: { phone: "+49 151 12345678" },
      };

      const sanitized = sanitizeToolResponse(dirty);
      expect(JSON.stringify(sanitized)).not.toContain("+49 151 12345678");
      expect(JSON.stringify(sanitized)).toContain("[REDACTED_PHONE]");
    });

    it("should handle deeply nested objects", () => {
      const dirty = {
        level1: {
          level2: {
            level3: {
              secret: "user@secret.com",
            },
          },
        },
      };

      const sanitized = sanitizeToolResponse(dirty);
      expect(JSON.stringify(sanitized)).not.toContain("user@secret.com");
    });

    it("should not mutate the original object", () => {
      const original = {
        data: { email: "test@test.com" },
      };
      const originalStr = JSON.stringify(original);

      sanitizeToolResponse(original);

      expect(JSON.stringify(original)).toBe(originalStr);
    });
  });
});
```

### Step 5.2: Implementierung

- [ ] Privacy Layer implementieren

**`template/backend/src/ai/privacy.ts`:**
```typescript
// ============================================================
// Privacy Layer — Schuetzt sensible Daten vor LLM-Exposure
// ============================================================

export type SensitiveDataType = "email" | "phone" | "password" | "apiKey";

/**
 * Regex-Patterns fuer sensible Daten.
 * Werden zum Scannen von Tool-Responses verwendet.
 */
export const SENSITIVE_PATTERNS: Record<SensitiveDataType, RegExp> = {
  email: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/,
  phone: /(?:\+\d{1,3}[\s\-]?)?\(?\d{2,4}\)?[\s\-]?\d{3,}[\s\-]?\d{2,}/,
  password: /(?:password|passwd|passwort|kennwort)[\s]*[:=]\s*\S+/i,
  apiKey: /(?:sk[_\-][a-zA-Z0-9\-_]{10,}|Bearer\s+[a-zA-Z0-9._\-]+)/,
};

const REPLACEMENTS: Record<SensitiveDataType, string> = {
  email: "[REDACTED_EMAIL]",
  phone: "[REDACTED_PHONE]",
  password: "[REDACTED_PASSWORD]",
  apiKey: "[REDACTED_API_KEY]",
};

interface SensitiveDataResult {
  found: boolean;
  types: SensitiveDataType[];
  /** Pfade zu den gefundenen sensiblen Daten */
  paths: string[];
}

/**
 * Prueft rekursiv ob ein Objekt sensible Daten enthaelt.
 * Scannt alle String-Werte in verschachtelten Objekten und Arrays.
 */
export function containsSensitiveData(
  data: unknown,
  currentPath: string = ""
): SensitiveDataResult {
  const result: SensitiveDataResult = { found: false, types: [], paths: [] };

  if (data === null || data === undefined) {
    return result;
  }

  if (typeof data === "string") {
    for (const [type, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
      if (pattern.test(data)) {
        result.found = true;
        const dataType = type as SensitiveDataType;
        if (!result.types.includes(dataType)) {
          result.types.push(dataType);
        }
        result.paths.push(currentPath || "root");
      }
    }
    return result;
  }

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const childResult = containsSensitiveData(
        data[i],
        `${currentPath}[${i}]`
      );
      if (childResult.found) {
        result.found = true;
        for (const t of childResult.types) {
          if (!result.types.includes(t)) result.types.push(t);
        }
        result.paths.push(...childResult.paths);
      }
    }
    return result;
  }

  if (typeof data === "object") {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const childResult = containsSensitiveData(
        value,
        currentPath ? `${currentPath}.${key}` : key
      );
      if (childResult.found) {
        result.found = true;
        for (const t of childResult.types) {
          if (!result.types.includes(t)) result.types.push(t);
        }
        result.paths.push(...childResult.paths);
      }
    }
  }

  return result;
}

/**
 * Bereinigt Tool-Responses von sensiblen Daten.
 * Erstellt eine tiefe Kopie und ersetzt alle erkannten Patterns.
 *
 * WICHTIG: Dies ist eine Sicherheitsnetz-Funktion.
 * Tools SOLLTEN von vornherein keine sensiblen Daten zurueckgeben.
 * Diese Funktion faengt Fehler ab.
 */
export function sanitizeToolResponse<T>(data: T): T {
  // Tiefe Kopie ueber JSON (sicher fuer Tool-Responses ohne Funktionen)
  const copy = JSON.parse(JSON.stringify(data));
  return sanitizeRecursive(copy) as T;
}

function sanitizeRecursive(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    let sanitized = data;
    for (const [type, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
      const globalPattern = new RegExp(pattern.source, "gi");
      const replacement = REPLACEMENTS[type as SensitiveDataType];
      sanitized = sanitized.replace(globalPattern, replacement);
    }
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeRecursive(item));
  }

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeRecursive(value);
    }
    return result;
  }

  return data;
}
```

### Step 5.3: Tests ausfuehren

- [ ] Tests ausfuehren

```bash
cd template/backend && bun test src/ai/privacy.test.ts
```

### Commit

```
feat(ai): add privacy layer with sensitive data detection and sanitization
```

---

## Task 6: Human-in-the-Loop System

**Ziel:** `template/backend/src/ai/approval.ts` — `needsApproval` Mechanismus fuer Tools, WebSocket-Notification bei Approval-Anfragen, Approve/Deny Endpoint.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/ai/approval.ts` |
| Create | `template/backend/src/ai/approval.test.ts` |
| Create | `template/backend/src/ai/channels/approval-routes.ts` |
| Create | `template/backend/src/ai/channels/approval-routes.test.ts` |

### Step 6.1: Approval-System Tests schreiben (TDD)

- [ ] Test-Datei anlegen

**`template/backend/src/ai/approval.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  ApprovalManager,
  createApprovalManager,
  type ApprovalRequest,
  type ApprovalManagerDeps,
  type ApprovalDecision,
} from "./approval";

describe("Approval Manager", () => {
  let manager: ApprovalManager;
  let notifyFn: ReturnType<typeof mock>;
  let storeFn: ReturnType<typeof mock>;
  let updateFn: ReturnType<typeof mock>;

  beforeEach(() => {
    notifyFn = mock(async () => {});
    storeFn = mock(async () => {});
    updateFn = mock(async () => {});

    manager = createApprovalManager({
      notifyUser: notifyFn,
      storeRequest: storeFn,
      updateRequest: updateFn,
    });
  });

  describe("requestApproval()", () => {
    it("should create an approval request with unique ID", async () => {
      const request = await manager.requestApproval({
        userId: "user-1",
        tenantId: "tenant-1",
        agentSessionId: "session-1",
        toolName: "sendMail",
        toolArgs: { userId: "usr_123", subject: "Test" },
        description: 'Send mail to Tobias: Subject "Test"',
      });

      expect(request.id).toBeDefined();
      expect(typeof request.id).toBe("string");
      expect(request.id.length).toBeGreaterThan(0);
    });

    it("should set status to 'pending'", async () => {
      const request = await manager.requestApproval({
        userId: "user-1",
        tenantId: "tenant-1",
        agentSessionId: "session-1",
        toolName: "sendMail",
        toolArgs: {},
        description: "Test",
      });

      expect(request.status).toBe("pending");
    });

    it("should store the request in the DB", async () => {
      await manager.requestApproval({
        userId: "user-1",
        tenantId: "tenant-1",
        agentSessionId: "session-1",
        toolName: "deleteMail",
        toolArgs: { mailId: "m_1" },
        description: "Delete mail m_1",
      });

      expect(storeFn).toHaveBeenCalledTimes(1);
    });

    it("should notify the user", async () => {
      await manager.requestApproval({
        userId: "user-1",
        tenantId: "tenant-1",
        agentSessionId: "session-1",
        toolName: "sendMail",
        toolArgs: {},
        description: "Send important mail",
      });

      expect(notifyFn).toHaveBeenCalledTimes(1);
      const notifyCall = notifyFn.mock.calls[0];
      expect(notifyCall[0]).toBe("user-1"); // userId
      expect(notifyCall[1]).toHaveProperty("toolName", "sendMail");
    });

    it("should include createdAt timestamp", async () => {
      const before = new Date();
      const request = await manager.requestApproval({
        userId: "user-1",
        tenantId: "tenant-1",
        agentSessionId: "session-1",
        toolName: "test",
        toolArgs: {},
        description: "Test",
      });
      const after = new Date();

      expect(request.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(request.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("resolveApproval()", () => {
    it("should approve a pending request", async () => {
      const request = await manager.requestApproval({
        userId: "user-1",
        tenantId: "tenant-1",
        agentSessionId: "session-1",
        toolName: "sendMail",
        toolArgs: {},
        description: "Test",
      });

      const decision = await manager.resolveApproval(request.id, "approved");

      expect(decision.status).toBe("approved");
      expect(decision.resolvedAt).toBeDefined();
    });

    it("should deny a pending request", async () => {
      const request = await manager.requestApproval({
        userId: "user-1",
        tenantId: "tenant-1",
        agentSessionId: "session-1",
        toolName: "sendMail",
        toolArgs: {},
        description: "Test",
      });

      const decision = await manager.resolveApproval(request.id, "denied", "Too risky");

      expect(decision.status).toBe("denied");
      expect(decision.reason).toBe("Too risky");
    });

    it("should update the stored request", async () => {
      const request = await manager.requestApproval({
        userId: "user-1",
        tenantId: "tenant-1",
        agentSessionId: "session-1",
        toolName: "test",
        toolArgs: {},
        description: "Test",
      });

      await manager.resolveApproval(request.id, "approved");

      expect(updateFn).toHaveBeenCalledTimes(1);
    });

    it("should throw if request ID is unknown", async () => {
      await expect(
        manager.resolveApproval("unknown-id", "approved")
      ).rejects.toThrow("not found");
    });

    it("should throw if request is already resolved", async () => {
      const request = await manager.requestApproval({
        userId: "user-1",
        tenantId: "tenant-1",
        agentSessionId: "session-1",
        toolName: "test",
        toolArgs: {},
        description: "Test",
      });

      await manager.resolveApproval(request.id, "approved");

      await expect(
        manager.resolveApproval(request.id, "denied")
      ).rejects.toThrow("already resolved");
    });
  });

  describe("getPendingRequests()", () => {
    it("should return all pending requests for a user", async () => {
      await manager.requestApproval({
        userId: "user-1",
        tenantId: "tenant-1",
        agentSessionId: "s1",
        toolName: "sendMail",
        toolArgs: {},
        description: "Mail 1",
      });

      await manager.requestApproval({
        userId: "user-1",
        tenantId: "tenant-1",
        agentSessionId: "s2",
        toolName: "deleteTodo",
        toolArgs: {},
        description: "Delete todo",
      });

      const pending = manager.getPendingRequests("user-1");
      expect(pending).toHaveLength(2);
    });

    it("should not return resolved requests", async () => {
      const req = await manager.requestApproval({
        userId: "user-1",
        tenantId: "tenant-1",
        agentSessionId: "s1",
        toolName: "test",
        toolArgs: {},
        description: "Test",
      });

      await manager.resolveApproval(req.id, "approved");

      const pending = manager.getPendingRequests("user-1");
      expect(pending).toHaveLength(0);
    });

    it("should only return requests for the specified user", async () => {
      await manager.requestApproval({
        userId: "user-1",
        tenantId: "tenant-1",
        agentSessionId: "s1",
        toolName: "test",
        toolArgs: {},
        description: "For user 1",
      });

      await manager.requestApproval({
        userId: "user-2",
        tenantId: "tenant-1",
        agentSessionId: "s2",
        toolName: "test",
        toolArgs: {},
        description: "For user 2",
      });

      const pending = manager.getPendingRequests("user-1");
      expect(pending).toHaveLength(1);
      expect(pending[0].userId).toBe("user-1");
    });
  });
});
```

### Step 6.2: Approval-System implementieren

- [ ] Approval Manager implementieren

**`template/backend/src/ai/approval.ts`:**
```typescript
// ============================================================
// Approval Manager — Human-in-the-Loop fuer Tool-Ausfuehrung
// ============================================================

import { randomUUID } from "crypto";

// --- Typen ---

export type ApprovalStatus = "pending" | "approved" | "denied";

export interface ApprovalRequest {
  id: string;
  userId: string;
  tenantId: string;
  agentSessionId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  description: string;
  status: ApprovalStatus;
  reason?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface ApprovalRequestInput {
  userId: string;
  tenantId: string;
  agentSessionId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  description: string;
}

export interface ApprovalDecision {
  requestId: string;
  status: "approved" | "denied";
  reason?: string;
  resolvedAt: Date;
}

export interface ApprovalManagerDeps {
  /** Benachrichtigt den User ueber eine anstehende Approval-Anfrage */
  notifyUser: (
    userId: string,
    request: ApprovalRequest
  ) => Promise<void>;
  /** Speichert eine Approval-Anfrage in der DB */
  storeRequest: (request: ApprovalRequest) => Promise<void>;
  /** Aktualisiert eine Approval-Anfrage in der DB */
  updateRequest: (
    requestId: string,
    update: Partial<ApprovalRequest>
  ) => Promise<void>;
}

export interface ApprovalManager {
  /** Erstellt eine neue Approval-Anfrage und benachrichtigt den User */
  requestApproval(input: ApprovalRequestInput): Promise<ApprovalRequest>;
  /** Loest eine Approval-Anfrage auf (approve/deny) */
  resolveApproval(
    requestId: string,
    status: "approved" | "denied",
    reason?: string
  ): Promise<ApprovalDecision>;
  /** Gibt alle offenen Anfragen fuer einen User zurueck */
  getPendingRequests(userId: string): ApprovalRequest[];
}

/**
 * Erstellt einen neuen Approval Manager.
 *
 * Der Manager haelt offene Anfragen im Speicher und persistiert
 * sie gleichzeitig in der DB (fuer Restart-Safety).
 */
export function createApprovalManager(
  deps: ApprovalManagerDeps
): ApprovalManager {
  // In-Memory Store fuer schnellen Zugriff
  const requests = new Map<string, ApprovalRequest>();

  return {
    async requestApproval(
      input: ApprovalRequestInput
    ): Promise<ApprovalRequest> {
      const request: ApprovalRequest = {
        id: randomUUID(),
        userId: input.userId,
        tenantId: input.tenantId,
        agentSessionId: input.agentSessionId,
        toolName: input.toolName,
        toolArgs: input.toolArgs,
        description: input.description,
        status: "pending",
        createdAt: new Date(),
      };

      // In-Memory speichern
      requests.set(request.id, request);

      // In DB persistieren
      await deps.storeRequest(request);

      // User benachrichtigen (WebSocket, Push, Telegram)
      await deps.notifyUser(input.userId, request);

      console.log(
        `[approval] Neue Anfrage: ${request.id} — ${input.toolName} fuer User ${input.userId}`
      );

      return request;
    },

    async resolveApproval(
      requestId: string,
      status: "approved" | "denied",
      reason?: string
    ): Promise<ApprovalDecision> {
      const request = requests.get(requestId);

      if (!request) {
        throw new Error(`Approval request "${requestId}" not found`);
      }

      if (request.status !== "pending") {
        throw new Error(
          `Approval request "${requestId}" is already resolved (${request.status})`
        );
      }

      const resolvedAt = new Date();

      // In-Memory aktualisieren
      request.status = status;
      request.reason = reason;
      request.resolvedAt = resolvedAt;

      // In DB aktualisieren
      await deps.updateRequest(requestId, {
        status,
        reason,
        resolvedAt,
      });

      console.log(
        `[approval] Anfrage ${requestId} ${status}${reason ? ` (${reason})` : ""}`
      );

      return {
        requestId,
        status,
        reason,
        resolvedAt,
      };
    },

    getPendingRequests(userId: string): ApprovalRequest[] {
      const pending: ApprovalRequest[] = [];
      for (const request of requests.values()) {
        if (request.userId === userId && request.status === "pending") {
          pending.push(request);
        }
      }
      return pending;
    },
  };
}
```

### Step 6.3: Approval Routes Tests schreiben (TDD)

- [ ] Test-Datei anlegen

**`template/backend/src/ai/channels/approval-routes.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import {
  createApprovalRoutes,
  type ApprovalRouteDeps,
} from "./approval-routes";

describe("Approval Routes", () => {
  let mockManager: ApprovalRouteDeps["approvalManager"];

  beforeEach(() => {
    mockManager = {
      getPendingRequests: mock((userId: string) => [
        {
          id: "req-1",
          userId,
          tenantId: "t1",
          agentSessionId: "s1",
          toolName: "sendMail",
          toolArgs: { userId: "usr_1" },
          description: "Send mail",
          status: "pending" as const,
          createdAt: new Date("2026-04-02T10:00:00Z"),
        },
      ]),
      resolveApproval: mock(async (id: string, status: string, reason?: string) => ({
        requestId: id,
        status: status as "approved" | "denied",
        reason,
        resolvedAt: new Date(),
      })),
    };
  });

  function createTestApp() {
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("userId", "user-1");
      c.set("tenantId", "tenant-1");
      await next();
    });
    app.route("/api/v1/ai/approvals", createApprovalRoutes({ approvalManager: mockManager }));
    return app;
  }

  describe("GET /api/v1/ai/approvals/pending", () => {
    it("should return pending approvals for the authenticated user", async () => {
      const app = createTestApp();

      const res = await app.request("/api/v1/ai/approvals/pending");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.requests).toHaveLength(1);
      expect(body.requests[0].toolName).toBe("sendMail");
    });
  });

  describe("POST /api/v1/ai/approvals/:id/approve", () => {
    it("should approve a pending request", async () => {
      const app = createTestApp();

      const res = await app.request("/api/v1/ai/approvals/req-1/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("approved");
    });
  });

  describe("POST /api/v1/ai/approvals/:id/deny", () => {
    it("should deny a pending request", async () => {
      const app = createTestApp();

      const res = await app.request("/api/v1/ai/approvals/req-1/deny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Not now" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("denied");
      expect(body.reason).toBe("Not now");
    });

    it("should work without a reason", async () => {
      const app = createTestApp();

      const res = await app.request("/api/v1/ai/approvals/req-1/deny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
    });
  });

  describe("error handling", () => {
    it("should return 404 if request not found", async () => {
      mockManager.resolveApproval = mock(async () => {
        throw new Error('Approval request "unknown" not found');
      });

      const app = createTestApp();

      const res = await app.request("/api/v1/ai/approvals/unknown/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(404);
    });

    it("should return 409 if request already resolved", async () => {
      mockManager.resolveApproval = mock(async () => {
        throw new Error('Approval request "req-1" is already resolved');
      });

      const app = createTestApp();

      const res = await app.request("/api/v1/ai/approvals/req-1/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(409);
    });
  });
});
```

### Step 6.4: Approval Routes implementieren

- [ ] Approval Routes implementieren

**`template/backend/src/ai/channels/approval-routes.ts`:**
```typescript
// ============================================================
// Approval Routes — REST Endpoints fuer Human-in-the-Loop
// ============================================================

import { Hono } from "hono";
import type { ApprovalManager, ApprovalDecision } from "../approval";

// --- Typen ---

export interface ApprovalRouteDeps {
  approvalManager: Pick<
    ApprovalManager,
    "getPendingRequests" | "resolveApproval"
  >;
}

/**
 * Erstellt die Approval-API Hono Routes.
 *
 * Routes:
 * - GET  /pending       — Offene Approval-Anfragen des Users
 * - POST /:id/approve   — Anfrage genehmigen
 * - POST /:id/deny      — Anfrage ablehnen
 */
export function createApprovalRoutes(deps: ApprovalRouteDeps): Hono {
  const app = new Hono();

  // --- GET /pending ---
  app.get("/pending", (c) => {
    const userId = c.get("userId") as string;
    const requests = deps.approvalManager.getPendingRequests(userId);

    return c.json({
      requests: requests.map((r) => ({
        id: r.id,
        toolName: r.toolName,
        toolArgs: r.toolArgs,
        description: r.description,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  });

  // --- POST /:id/approve ---
  app.post("/:id/approve", async (c) => {
    const requestId = c.req.param("id");

    try {
      const decision = await deps.approvalManager.resolveApproval(
        requestId,
        "approved"
      );
      return c.json(decision);
    } catch (err) {
      return handleApprovalError(c, err);
    }
  });

  // --- POST /:id/deny ---
  app.post("/:id/deny", async (c) => {
    const requestId = c.req.param("id");

    let reason: string | undefined;
    try {
      const body = await c.req.json();
      reason = body.reason;
    } catch {
      // Kein Body oder kein JSON — kein Problem
    }

    try {
      const decision = await deps.approvalManager.resolveApproval(
        requestId,
        "denied",
        reason
      );
      return c.json(decision);
    } catch (err) {
      return handleApprovalError(c, err);
    }
  });

  return app;
}

/**
 * Einheitliche Fehlerbehandlung fuer Approval-Endpoints.
 */
function handleApprovalError(c: any, err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error";

  if (message.includes("not found")) {
    return c.json({ error: message }, 404);
  }

  if (message.includes("already resolved")) {
    return c.json({ error: message }, 409);
  }

  console.error("[approval-routes] Unerwarteter Fehler:", err);
  return c.json({ error: "Internal server error" }, 500);
}
```

### Step 6.5: Tests ausfuehren

- [ ] Alle Approval-Tests ausfuehren

```bash
cd template/backend && bun test src/ai/approval.test.ts src/ai/channels/approval-routes.test.ts
```

### Commit

```
feat(ai): add human-in-the-loop approval system with pending/approve/deny endpoints
```

---

## Task 7: Integration — AI Routes in Server einbinden

**Ziel:** Chat- und Approval-Routes in den Haupt-Server einbinden. Wire-up des gesamten AI-Systems.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/ai/index.ts` |
| Create | `template/backend/src/ai/index.test.ts` |
| Modify | `template/backend/src/index.ts` |

### Step 7.1: Tests schreiben (TDD)

- [ ] Test-Datei anlegen

**`template/backend/src/ai/index.test.ts`:**
```typescript
import { describe, it, expect, mock } from "bun:test";
import type { LanguageModelV1 } from "ai";
import { createAISystem, type AISystemConfig, type AISystemDeps } from "./index";

describe("AI System Integration", () => {
  const mockModel = { modelId: "claude-sonnet-4-5", provider: "anthropic" } as unknown as LanguageModelV1;

  const defaultDeps: AISystemDeps = {
    getRegisteredModules: () => [],
    checkModuleAccess: mock(async () => true),
    model: mockModel,
    logAICost: mock(async () => {}),
    logAgentStepToDB: mock(async () => {}),
    storeApprovalRequest: mock(async () => {}),
    updateApprovalRequest: mock(async () => {}),
    notifyUser: mock(async () => {}),
    isDebugEnabled: mock(async () => false),
  };

  describe("createAISystem()", () => {
    it("should create the AI system with all components", async () => {
      const system = await createAISystem(defaultDeps);

      expect(system).toBeDefined();
      expect(system.chatRoutes).toBeDefined();
      expect(system.approvalRoutes).toBeDefined();
      expect(system.approvalManager).toBeDefined();
    });

    it("should expose createMainAgent function", async () => {
      const system = await createAISystem(defaultDeps);

      expect(system.createMainAgent).toBeDefined();
      expect(typeof system.createMainAgent).toBe("function");
    });
  });
});
```

### Step 7.2: AI System Integration implementieren

- [ ] AI System Barrel implementieren

**`template/backend/src/ai/index.ts`:**
```typescript
// ============================================================
// AI System — Zentraler Einstiegspunkt fuer das Agent-System
// ============================================================

import type { Hono } from "hono";
import type { LanguageModelV1 } from "ai";
import type { ModulePlugin, AICostEntry } from "@super-app/shared";
import { loadModuleTools, loadSubAgents, createDynamicAgentTool } from "./module-connector";
import { createMainAgent, type MainAgentConfig, type AgentStepLog } from "./main-agent";
import { createSubAgentConfig } from "./sub-agent";
import { createApprovalManager, type ApprovalManager } from "./approval";
import { createChatRoutes } from "./channels/api";
import { createApprovalRoutes } from "./channels/approval-routes";
import { sanitizeToolResponse, containsSensitiveData } from "./privacy";

// --- Typen ---

export interface AISystemDeps {
  /** Gibt alle registrierten Module zurueck */
  getRegisteredModules: () => ModulePlugin[];
  /** Prueft Modul-Zugriff fuer einen User */
  checkModuleAccess: (
    userId: string,
    tenantId: string,
    moduleName: string
  ) => Promise<boolean>;
  /** AI-Modell — wird von Phase 4 Provider Registry bereitgestellt */
  model: LanguageModelV1;
  /** Loggt KI-Kosten in die DB */
  logAICost: (entry: Partial<AICostEntry>) => Promise<void>;
  /** Loggt Agent-Schritte in die DB */
  logAgentStepToDB: (step: AgentStepLog) => Promise<void>;
  /** Speichert Approval-Request in DB */
  storeApprovalRequest: (request: any) => Promise<void>;
  /** Aktualisiert Approval-Request in DB */
  updateApprovalRequest: (id: string, update: any) => Promise<void>;
  /** Benachrichtigt User (WebSocket, Push, Telegram) */
  notifyUser: (userId: string, data: any) => Promise<void>;
  /** Prueft ob Debug-Modus aktiv ist */
  isDebugEnabled: () => Promise<boolean>;
}

export interface AISystemConfig {
  /** Hono Routes fuer Chat API */
  chatRoutes: Hono;
  /** Hono Routes fuer Approval API */
  approvalRoutes: Hono;
  /** Approval Manager Instanz */
  approvalManager: ApprovalManager;
  /** Erstellt einen Main Agent fuer einen User */
  createMainAgent: (userId: string, tenantId: string) => Promise<MainAgentConfig>;
}

/**
 * Erstellt das gesamte AI-System und verdrahtet alle Komponenten.
 *
 * Wird einmal beim Server-Start aufgerufen.
 */
export async function createAISystem(
  deps: AISystemDeps
): Promise<AISystemConfig> {
  // 1. Approval Manager erstellen
  const approvalManager = createApprovalManager({
    notifyUser: deps.notifyUser,
    storeRequest: deps.storeApprovalRequest,
    updateRequest: deps.updateApprovalRequest,
  });

  // 2. Module Connector Dependencies
  const connectorDeps = {
    getRegisteredModules: deps.getRegisteredModules,
    checkModuleAccess: deps.checkModuleAccess,
  };

  // 3. Main Agent Factory
  const mainAgentFactory = async (
    userId: string,
    tenantId: string
  ): Promise<MainAgentConfig> => {
    return createMainAgent(userId, tenantId, {
      loadModuleTools: (uid, tid) => loadModuleTools(uid, tid, connectorDeps),
      loadSubAgents: (uid, tid) => loadSubAgents(uid, tid, connectorDeps),
      createDynamicAgentTool: () => createDynamicAgentTool(connectorDeps),
      model: deps.model,
      logAICost: deps.logAICost,
      logAgentStep: deps.logAgentStepToDB,
      isDebugEnabled: deps.isDebugEnabled,
    });
  };

  // 4. Chat Routes erstellen
  const chatRoutes = createChatRoutes({
    createMainAgent: mainAgentFactory,
    streamText: async (config) => {
      // In Produktion: import { streamText } from "ai";
      // Hier wird die echte AI SDK streamText Funktion verwendet.
      // Fuer die Integration wird das vom Server injiziert.
      const { streamText } = await import("ai");
      return streamText(config as any);
    },
  });

  // 5. Approval Routes erstellen
  const approvalRoutes = createApprovalRoutes({
    approvalManager,
  });

  console.log("[ai-system] AI-System initialisiert");

  return {
    chatRoutes,
    approvalRoutes,
    approvalManager,
    createMainAgent: mainAgentFactory,
  };
}

// Re-Exports fuer externe Nutzung
export type { MainAgentConfig, AgentStepLog } from "./main-agent";
export type { SubAgentConfig } from "./sub-agent";
export type { ApprovalRequest, ApprovalDecision, ApprovalStatus } from "./approval";
export { containsSensitiveData, sanitizeToolResponse } from "./privacy";
```

### Step 7.3: Server-Integration

- [ ] AI Routes in den Server einbinden

**`template/backend/src/index.ts`** — Ergaenzen (nach der Registry-Setup):
```typescript
import { defineServer } from "@framework/index";
import { getModuleRegistry } from "./module-registry";
import { createAISystem } from "./ai/index";
import type { ModulePlugin } from "@super-app/shared";

// --- Module Imports (ein Modul = eine Zeile) ---
// import { plugin as mailPlugin } from "../../modules/mail/backend/src/plugin";
// import { plugin as todosPlugin } from "../../modules/todos/backend/src/plugin";

// --- Module registrieren ---
const registry = getModuleRegistry();
// registry.register(mailPlugin);
// registry.register(todosPlugin);

// --- AI System initialisieren ---
// Modell kommt aus Phase 4 Provider Registry
// Beispiel: const model = providerRegistry.getModelForTask("chat");
const aiSystem = await createAISystem({
  getRegisteredModules: () => registry.getAll(),
  checkModuleAccess: async (_userId, _tenantId, _moduleName) => {
    // TODO: Echte Permission-Pruefung ueber Framework
    return true;
  },
  model: null as any, // TODO: Phase 4 Provider Registry integrieren
  logAICost: async (_entry) => {
    // TODO: Insert in mc_ai_costs Tabelle
  },
  logAgentStepToDB: async (_step) => {
    // TODO: Insert in mc_agent_sessions Tabelle
  },
  storeApprovalRequest: async (_request) => {
    // TODO: Insert in approval_requests Tabelle
  },
  updateApprovalRequest: async (_id, _update) => {
    // TODO: Update in approval_requests Tabelle
  },
  notifyUser: async (_userId, _data) => {
    // TODO: WebSocket + Push Notification
  },
  isDebugEnabled: async () => {
    return process.env.AI_DEBUG === "true";
  },
});

// --- Server starten ---
const server = defineServer({
  port: 3000,
  jwtExpiresAfter: 60 * 60 * 24 * 30, // 30 Tage
  appName: "Super App",
  basePath: "/api/v1",
  loginUrl: "/login.html",
  magicLoginVerifyUrl: "/magic-login-verify.html",
  staticPublicDataPath: "./public",
  staticPrivateDataPath: "./static",

  // Module-Schema, -Routes und -Jobs aus der Registry
  customDbSchema: {
    ...registry.getMergedSchema(),
  },
  customHonoApps: [
    ...registry.getMergedRoutes().map((route) => ({
      baseRoute: route.baseRoute,
      app: route.app,
    })),
    // AI Routes
    { baseRoute: "/ai", app: aiSystem.chatRoutes },
    { baseRoute: "/ai/approvals", app: aiSystem.approvalRoutes },
  ],
  jobHandlers: registry.getMergedJobs(),
});

export default server;
```

### Step 7.4: Tests ausfuehren

- [ ] Integration-Tests ausfuehren

```bash
cd template/backend && bun test src/ai/index.test.ts
```

### Commit

```
feat(ai): integrate AI system into server with chat and approval routes
```

---

## Task 8: End-to-End Privacy Tests

**Ziel:** Integrationstests die sicherstellen, dass das gesamte System keine sensiblen Daten leakt — von Tool-Response bis Agent-Output.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/ai/privacy-integration.test.ts` |

### Step 8.1: Integration-Tests schreiben

- [ ] Privacy Integration Tests

**`template/backend/src/ai/privacy-integration.test.ts`:**
```typescript
import { describe, it, expect } from "bun:test";
import { containsSensitiveData, sanitizeToolResponse } from "./privacy";
import type { ToolResult } from "@super-app/shared";

describe("Privacy Integration Tests", () => {
  describe("Tool response patterns — correct (clean)", () => {
    it("should pass: contact search returns IDs and flags only", () => {
      const response: ToolResult = {
        success: true,
        data: {
          results: [
            { id: "usr_001", name: "Tobias", hasEmail: true, hasPhone: true },
            { id: "usr_002", name: "Anna", hasEmail: true, hasPhone: false },
          ],
        },
      };

      const check = containsSensitiveData(response);
      expect(check.found).toBe(false);
    });

    it("should pass: mail tool returns confirmation without addresses", () => {
      const response: ToolResult = {
        success: true,
        data: {
          sentTo: "Tobias",
          messageId: "msg_abc123",
          remaining: 49,
        },
      };

      const check = containsSensitiveData(response);
      expect(check.found).toBe(false);
    });

    it("should pass: todo list returns only safe data", () => {
      const response: ToolResult = {
        success: true,
        data: {
          todos: [
            { id: "t_1", title: "Meeting vorbereiten", done: false, assigneeId: "usr_001" },
            { id: "t_2", title: "Rechnung schreiben", done: true, assigneeId: "usr_002" },
          ],
        },
      };

      const check = containsSensitiveData(response);
      expect(check.found).toBe(false);
    });
  });

  describe("Tool response patterns — incorrect (leaking)", () => {
    it("should CATCH: contact search leaking email", () => {
      const response = {
        success: true,
        data: {
          results: [
            { id: "usr_001", name: "Tobias", email: "tobias@example.com" },
          ],
        },
      };

      const check = containsSensitiveData(response);
      expect(check.found).toBe(true);
      expect(check.types).toContain("email");
    });

    it("should CATCH: mail tool leaking recipient address", () => {
      const response = {
        success: true,
        data: {
          sentTo: "tobias@fever-events.de",
          messageId: "msg_123",
        },
      };

      const check = containsSensitiveData(response);
      expect(check.found).toBe(true);
      expect(check.types).toContain("email");
    });

    it("should CATCH: contact leaking phone number", () => {
      const response = {
        success: true,
        data: {
          contact: {
            id: "usr_001",
            name: "Tobias",
            phone: "+49 151 12345678",
          },
        },
      };

      const check = containsSensitiveData(response);
      expect(check.found).toBe(true);
      expect(check.types).toContain("phone");
    });

    it("should CATCH: API key in tool response", () => {
      const response = {
        success: true,
        data: {
          config: {
            apiKey: "sk-ant-api03-secretkey12345",
          },
        },
      };

      const check = containsSensitiveData(response);
      expect(check.found).toBe(true);
      expect(check.types).toContain("apiKey");
    });
  });

  describe("Sanitization end-to-end", () => {
    it("should sanitize a leaking tool response completely", () => {
      const leakingResponse = {
        success: true,
        data: {
          user: {
            id: "usr_001",
            name: "Tobias",
            email: "tobias@example.com",
            phone: "+49 151 12345678",
          },
          config: {
            apiKey: "sk-ant-api03-secretkey",
          },
        },
      };

      const sanitized = sanitizeToolResponse(leakingResponse);

      // Nach Sanitization darf nichts mehr gefunden werden
      const recheck = containsSensitiveData(sanitized);
      expect(recheck.found).toBe(false);

      // Original nicht veraendert
      expect(leakingResponse.data.user.email).toBe("tobias@example.com");
    });

    it("should preserve non-sensitive data after sanitization", () => {
      const mixed = {
        success: true,
        data: {
          id: "usr_001",
          name: "Tobias",
          email: "tobias@test.com",
          taskCount: 42,
          isActive: true,
        },
      };

      const sanitized = sanitizeToolResponse(mixed);

      expect(sanitized.data.id).toBe("usr_001");
      expect(sanitized.data.name).toBe("Tobias");
      expect(sanitized.data.taskCount).toBe(42);
      expect(sanitized.data.isActive).toBe(true);
      // E-Mail muss ersetzt sein
      expect(sanitized.data.email).not.toContain("@");
    });
  });
});
```

### Step 8.2: Tests ausfuehren

- [ ] Privacy Integration Tests ausfuehren

```bash
cd template/backend && bun test src/ai/privacy-integration.test.ts
```

### Commit

```
test(ai): add end-to-end privacy integration tests for tool response sanitization
```

---

## Zusammenfassung

### Erstellte Dateien

| # | Path | Beschreibung |
|---|------|-------------|
| 1 | `template/backend/src/ai/module-connector.ts` | Tool Loading mit Permission-Filtering und Sub-Agent Creation |
| 2 | `template/backend/src/ai/module-connector.test.ts` | Tests fuer Module Connector |
| 3 | `template/backend/src/ai/main-agent.ts` | Main Agent mit ToolLoopAgent Config, Privacy Instructions |
| 4 | `template/backend/src/ai/main-agent.test.ts` | Tests fuer Main Agent |
| 5 | `template/backend/src/ai/sub-agent.ts` | Sub-Agent Factory fuer Modul-Agents und Dynamic Agents |
| 6 | `template/backend/src/ai/sub-agent.test.ts` | Tests fuer Sub-Agent |
| 7 | `template/backend/src/ai/channels/api.ts` | Chat API Channel mit Streaming Response |
| 8 | `template/backend/src/ai/channels/api.test.ts` | Tests fuer Chat API |
| 9 | `template/backend/src/ai/privacy.ts` | Privacy Layer mit Sensitive Data Detection und Sanitization |
| 10 | `template/backend/src/ai/privacy.test.ts` | Tests fuer Privacy Layer |
| 11 | `template/backend/src/ai/approval.ts` | Human-in-the-Loop Approval Manager |
| 12 | `template/backend/src/ai/approval.test.ts` | Tests fuer Approval Manager |
| 13 | `template/backend/src/ai/channels/approval-routes.ts` | REST Endpoints fuer Approve/Deny |
| 14 | `template/backend/src/ai/channels/approval-routes.test.ts` | Tests fuer Approval Routes |
| 15 | `template/backend/src/ai/index.ts` | AI System Integration Barrel |
| 16 | `template/backend/src/ai/index.test.ts` | Tests fuer AI System Integration |
| 17 | `template/backend/src/ai/privacy-integration.test.ts` | E2E Privacy Tests |

### Modifizierte Dateien

| Path | Aenderung |
|------|-----------|
| `template/backend/src/index.ts` | AI System und Routes eingebunden |

### Architektur-Ueberblick nach Phase 3

```
template/backend/src/ai/
├── index.ts                     # AI System Barrel — Wire-Up aller Komponenten
├── main-agent.ts                # Main Agent Config (maxSteps: 30, model: LanguageModelV1)
├── sub-agent.ts                 # Sub-Agent + Dynamic Agent Factory (maxSteps: 10/15)
├── module-connector.ts          # Tool Loading + Permission Filtering
├── privacy.ts                   # Sensitive Data Detection + Sanitization
├── approval.ts                  # Human-in-the-Loop Approval Manager
└── channels/
    ├── api.ts                   # POST /api/v1/ai/chat (Streaming)
    └── approval-routes.ts       # GET/POST /api/v1/ai/approvals/*
# Hinweis: providers.ts wird von Phase 4 bereitgestellt (nicht Teil von Phase 3)
```

### Commit-Reihenfolge

1. `feat(ai): add module-connector with permission-filtered tool loading and sub-agent creation`
2. `feat(ai): add main-agent with ToolLoopAgent config, privacy instructions, and cost tracking`
3. `feat(ai): add sub-agent factory with module-scoped tools and step logging`
4. `feat(ai): add chat API channel with streaming response and input validation`
5. `feat(ai): add privacy layer with sensitive data detection and sanitization`
6. `feat(ai): add human-in-the-loop approval system with pending/approve/deny endpoints`
7. `feat(ai): integrate AI system into server with chat and approval routes`
8. `test(ai): add end-to-end privacy integration tests for tool response sanitization`

### Abhaengigkeiten

**Phase 3 benoetigt von Phase 4 (AI Providers & Cost Tracking):**
- `LanguageModelV1` Instanz aus der Provider Registry — wird per Dependency Injection an `createMainAgent()`, `createSubAgentConfig()` und `createAISystem()` uebergeben

**Phase 4+ nutzt von Phase 3:**
- **Mission Control Modul** (Phase 4): Nutzt `AgentStepLog` und `AICostEntry` fuer das Live-Dashboard
- **Telegram Channel** (Phase 5): Nutzt `createMainAgent()` wie der Chat API Channel
- **PWA Frontend** (Phase 6): Chat-UI verbindet sich mit `POST /api/v1/ai/chat` via AI SDK UI Hooks
