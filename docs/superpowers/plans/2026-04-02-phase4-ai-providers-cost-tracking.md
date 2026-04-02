# Phase 4: AI Providers & Cost Tracking

**Date:** 2026-04-02
**Status:** Ready
**Spec:** `docs/superpowers/specs/2026-04-02-super-app-architecture-design.md` (Section 6)
**Depends on:** Phase 1 (shared types, cost-tracking utility, guardrails utility), Phase 3 (agent system)
**For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development**

---

## Ziel

Multi-Provider AI-Unterstuetzung mit dynamischer Modellauswahl pro Task-Typ, persistente Kostenerfassung in der Datenbank, Budget-Guardrails die VOR jedem AI-Call pruefen, und eine Settings-UI zur Verwaltung von API-Keys, Modellzuordnungen und Budgetlimits. Optional: Weiterleitung der Kosten an einen externen Tracker (z.B. costs.fever-context.de).

## Voraussetzungen

- Phase 1 abgeschlossen: `@super-app/shared` mit `AICostEntry`, `createCostTracker`, `createGuardrailChecker`
- Phase 3 abgeschlossen: Agent-System (`main-agent.ts`, `sub-agents/`, `onStepFinish`)
- Bun Runtime installiert
- PostgreSQL laeuft (Docker oder lokal) fuer Integrationstests
- Template-Backend unter `template/` ist funktionsfaehig
- AI SDK Pakete installiert: `ai`, `@ai-sdk/anthropic`, `@ai-sdk/mistral`, `@openrouter/ai-sdk-provider`

## Konventionen

- **Runtime:** Bun
- **Validation:** Valibot (NICHT Zod — trotz AI SDK Beispielen in der Spec die `z` verwenden)
- **ORM:** Drizzle ORM
- **Table Prefix:** `mc_` fuer alle Cost-Tracking-Tabellen (Mission Control besitzt Kostendaten)
- **Testing:** `bun:test`
- **Commit-Messages:** Englisch, Conventional Commits
- **TDD:** Tests zuerst, dann Implementierung
- **Path-Alias:** `@framework/*` mappt auf `./framework/src/*` (tsconfig im template/backend)
- **Secrets:** API-Keys werden im Framework-eigenen `secrets`-Table gespeichert (AES-256 verschluesselt), NICHT in `.env`

---

## Task 1: Cost Tracking DB Schema

**Ziel:** Drizzle-Schema fuer `mc_ai_costs` Tabelle mit `mc_` Prefix. Die Tabelle speichert jeden einzelnen AI-Call mit Provider, Modell, Token-Zahlen und Kosten.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/ai/db/schema.ts` |
| Create | `template/backend/src/ai/db/schema.test.ts` |

### Step 1.1: Tests schreiben (TDD)

**`template/backend/src/ai/db/schema.test.ts`:**
```typescript
import { describe, it, expect } from "bun:test";
import { mcAiCosts, type McAiCostInsert, type McAiCostSelect } from "./schema";
import { getTableName, getTableColumns } from "drizzle-orm";

describe("mc_ai_costs Schema", () => {
  it("should have table name with mc_ prefix", () => {
    const name = getTableName(mcAiCosts);
    expect(name).toBe("mc_ai_costs");
  });

  it("should have all required columns", () => {
    const columns = getTableColumns(mcAiCosts);
    expect(columns).toHaveProperty("id");
    expect(columns).toHaveProperty("project");
    expect(columns).toHaveProperty("provider");
    expect(columns).toHaveProperty("model");
    expect(columns).toHaveProperty("tokensInput");
    expect(columns).toHaveProperty("tokensOutput");
    expect(columns).toHaveProperty("costUsd");
    expect(columns).toHaveProperty("createdAt");
  });

  it("should accept a valid insert object", () => {
    const entry: McAiCostInsert = {
      project: "mail",
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      tokensInput: 1500,
      tokensOutput: 300,
      costUsd: "0.012",
    };
    expect(entry.project).toBe("mail");
    expect(entry.provider).toBe("anthropic");
  });

  it("should have optional id and createdAt on insert", () => {
    const entry: McAiCostInsert = {
      project: "todos",
      provider: "mistral",
      model: "mistral-large",
      tokensInput: 500,
      tokensOutput: 100,
      costUsd: "0.003",
    };
    // id und createdAt haben defaults, duerfen fehlen
    expect(entry.id).toBeUndefined();
    expect(entry.createdAt).toBeUndefined();
  });

  it("should have all fields on select type", () => {
    // Type-Level-Test: McAiCostSelect muss alle Felder haben
    const select: McAiCostSelect = {
      id: "uuid-123",
      project: "mail",
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      tokensInput: 1500,
      tokensOutput: 300,
      costUsd: "0.012",
      createdAt: new Date(),
    };
    expect(select.id).toBe("uuid-123");
    expect(select.createdAt).toBeInstanceOf(Date);
  });
});
```

### Step 1.2: Schema implementieren

**`template/backend/src/ai/db/schema.ts`:**
```typescript
import { sql } from "drizzle-orm";
import {
  pgTableCreator,
  uuid,
  varchar,
  integer,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// Mission Control Tabellen-Prefix
const mcTable = pgTableCreator((name) => `mc_${name}`);

/**
 * AI-Kosten-Tabelle.
 * Speichert jeden einzelnen AI-Call mit Provider, Modell, Tokens und Kosten.
 * Prefix: mc_ (Mission Control besitzt Kostendaten).
 */
export const mcAiCosts = mcTable(
  "ai_costs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    /** Modulname (z.B. "mail", "todos", "main-agent") */
    project: varchar("project", { length: 255 }).notNull(),
    /** Provider-Name (z.B. "anthropic", "mistral", "openrouter") */
    provider: varchar("provider", { length: 255 }).notNull(),
    /** Modellname (z.B. "claude-sonnet-4-5", "mistral-large") */
    model: varchar("model", { length: 255 }).notNull(),
    /** Eingabe-Tokens */
    tokensInput: integer("tokens_input").notNull().default(0),
    /** Ausgabe-Tokens */
    tokensOutput: integer("tokens_output").notNull().default(0),
    /** Kosten in USD (numeric fuer praezise Dezimalrechnung) */
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
    /** Zeitstempel des AI-Calls */
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("mc_ai_costs_project_idx").on(table.project),
    index("mc_ai_costs_provider_idx").on(table.provider),
    index("mc_ai_costs_created_at_idx").on(table.createdAt),
    index("mc_ai_costs_project_created_idx").on(table.project, table.createdAt),
  ]
);

export type McAiCostSelect = typeof mcAiCosts.$inferSelect;
export type McAiCostInsert = typeof mcAiCosts.$inferInsert;
```

### Step 1.3: Tests ausfuehren

```bash
cd template/backend && bun test src/ai/db/schema.test.ts
```

### Commit

```
feat(ai): add mc_ai_costs drizzle schema for cost tracking database
```

---

## Task 2: Cost Tracking Service

**Ziel:** `template/backend/src/ai/cost-tracking.ts` — verbindet die shared `createCostTracker`-Utility mit echtem DB-Insert und optionalem externen Tracker. Wird einmal beim Server-Start initialisiert.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/ai/cost-tracking.ts` |
| Create | `template/backend/src/ai/cost-tracking.test.ts` |

### Step 2.1: Tests schreiben (TDD)

**`template/backend/src/ai/cost-tracking.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  createDbCostLogger,
  createExternalForwarder,
  initCostTracking,
  type CostTrackingConfig,
} from "./cost-tracking";
import type { AICostEntry } from "@super-app/shared";

describe("Cost Tracking Service", () => {
  const sampleEntry: AICostEntry = {
    project: "mail",
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    tokensInput: 1500,
    tokensOutput: 300,
    costUsd: 0.012,
  };

  describe("createDbCostLogger", () => {
    it("should insert cost entry into mc_ai_costs table", async () => {
      const insertMock = mock(async (values: any) => {});
      const logger = createDbCostLogger(insertMock);

      await logger(sampleEntry);

      expect(insertMock).toHaveBeenCalledTimes(1);
      const calledWith = insertMock.mock.calls[0][0];
      expect(calledWith.project).toBe("mail");
      expect(calledWith.provider).toBe("anthropic");
      expect(calledWith.model).toBe("claude-sonnet-4-5");
      expect(calledWith.tokensInput).toBe(1500);
      expect(calledWith.tokensOutput).toBe(300);
      expect(calledWith.costUsd).toBe(0.012);
      expect(calledWith.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("createExternalForwarder", () => {
    it("should POST cost entry to external URL with bearer token", async () => {
      const fetchMock = mock(async (url: string, options: RequestInit) => {
        return new Response("OK", { status: 200 });
      });
      const forwarder = createExternalForwarder(
        "https://costs.example.com/api/costs",
        "test-token-123",
        fetchMock as any
      );

      await forwarder(sampleEntry);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://costs.example.com/api/costs");
      expect(options.method).toBe("POST");
      expect(options.headers).toHaveProperty("Authorization", "Bearer test-token-123");
      expect(options.headers).toHaveProperty("Content-Type", "application/json");
      const body = JSON.parse(options.body as string);
      expect(body.project).toBe("mail");
    });

    it("should not throw if external fetch fails", async () => {
      const fetchMock = mock(async () => {
        throw new Error("Network error");
      });
      const forwarder = createExternalForwarder(
        "https://costs.example.com/api/costs",
        "test-token",
        fetchMock as any
      );

      // Fire-and-forget: darf keinen Fehler werfen
      await expect(forwarder(sampleEntry)).resolves.toBeUndefined();
    });
  });

  describe("initCostTracking", () => {
    it("should create tracker with only internal logger when no external config", () => {
      const insertMock = mock(async () => {});
      const config: CostTrackingConfig = {
        dbInsert: insertMock,
      };

      const tracker = initCostTracking(config);
      expect(tracker).toBeDefined();
      expect(typeof tracker.log).toBe("function");
    });

    it("should create tracker with both loggers when external config provided", () => {
      const insertMock = mock(async () => {});
      const config: CostTrackingConfig = {
        dbInsert: insertMock,
        externalUrl: "https://costs.example.com/api/costs",
        externalToken: "token-123",
      };

      const tracker = initCostTracking(config);
      expect(tracker).toBeDefined();
      expect(typeof tracker.log).toBe("function");
    });
  });
});
```

### Step 2.2: Implementierung

**`template/backend/src/ai/cost-tracking.ts`:**
```typescript
import {
  createCostTracker,
  initGlobalCostTracker,
  type CostTrackerDeps,
  type AICostEntry,
} from "@super-app/shared";

// --- Typen ---

export interface CostTrackingConfig {
  /** DB-Insert-Funktion: schreibt in mc_ai_costs */
  dbInsert: (values: any) => Promise<void>;
  /** Optionale externe Tracker-URL */
  externalUrl?: string;
  /** Optionaler Bearer-Token fuer externen Tracker */
  externalToken?: string;
}

// --- DB Logger ---

/**
 * Erstellt eine Log-Funktion die Kosten in die mc_ai_costs Tabelle schreibt.
 * @param insertFn - Funktion die ein Drizzle-Insert ausfuehrt
 */
export function createDbCostLogger(
  insertFn: (values: any) => Promise<void>
): (entry: AICostEntry) => Promise<void> {
  return async (entry: AICostEntry) => {
    await insertFn({
      project: entry.project,
      provider: entry.provider,
      model: entry.model,
      tokensInput: entry.tokensInput,
      tokensOutput: entry.tokensOutput,
      costUsd: entry.costUsd,
      createdAt: new Date(),
    });
  };
}

// --- Externer Forwarder ---

/**
 * Erstellt eine Log-Funktion die Kosten an einen externen Tracker weiterleitet.
 * Fire-and-forget: Fehler werden geloggt aber nie geworfen.
 */
export function createExternalForwarder(
  url: string,
  token: string,
  fetchFn: typeof fetch = globalThis.fetch
): (entry: AICostEntry) => Promise<void> {
  return async (entry: AICostEntry) => {
    try {
      await fetchFn(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(entry),
      });
    } catch (err) {
      console.error("[cost-tracking] Externes Forwarding fehlgeschlagen:", err);
    }
  };
}

// --- Initialisierung ---

/**
 * Initialisiert das Cost-Tracking-System.
 * Wird einmal beim Server-Start aufgerufen.
 *
 * @param config - DB-Insert + optionale externe Konfiguration
 * @returns Tracker-Instanz (auch global via logAICost() nutzbar)
 */
export function initCostTracking(config: CostTrackingConfig) {
  const deps: CostTrackerDeps = {
    logInternal: createDbCostLogger(config.dbInsert),
  };

  if (config.externalUrl && config.externalToken) {
    deps.logExternal = createExternalForwarder(
      config.externalUrl,
      config.externalToken
    );
  }

  const tracker = createCostTracker(deps);

  // Globalen Tracker setzen fuer logAICost() Convenience-Funktion
  initGlobalCostTracker(deps);

  return tracker;
}
```

### Step 2.3: Tests ausfuehren

```bash
cd template/backend && bun test src/ai/cost-tracking.test.ts
```

### Commit

```
feat(ai): add cost-tracking service with DB logger and external forwarder
```

---

## Task 3: Provider Registry

**Ziel:** `template/backend/src/ai/providers.ts` — AI SDK `createProviderRegistry` mit Anthropic, Mistral, OpenRouter. API-Keys kommen aus dem Framework-eigenen `secrets`-Table (verschluesselt). `getProviderModel(taskType)` gibt das konfigurierte Modell fuer einen Task-Typ zurueck.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/ai/providers.ts` |
| Create | `template/backend/src/ai/providers.test.ts` |

### Step 3.1: Tests schreiben (TDD)

**`template/backend/src/ai/providers.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  createProviders,
  getProviderModel,
  type ProviderConfig,
  type TaskType,
  TASK_TYPES,
  DEFAULT_MODELS,
} from "./providers";

describe("Provider Registry", () => {
  describe("TASK_TYPES", () => {
    it("should define all supported task types", () => {
      expect(TASK_TYPES).toContain("chat");
      expect(TASK_TYPES).toContain("summarization");
      expect(TASK_TYPES).toContain("code-analysis");
      expect(TASK_TYPES).toContain("embeddings");
    });
  });

  describe("DEFAULT_MODELS", () => {
    it("should have a default model for every task type", () => {
      for (const taskType of TASK_TYPES) {
        expect(DEFAULT_MODELS[taskType]).toBeDefined();
        expect(DEFAULT_MODELS[taskType]).toContain(":"); // format: "provider:model"
      }
    });
  });

  describe("createProviders", () => {
    it("should create a registry with available providers", async () => {
      const config: ProviderConfig = {
        getSecret: mock(async (name: string) => {
          if (name === "ANTHROPIC_API_KEY") return "sk-ant-test";
          if (name === "MISTRAL_API_KEY") return "test-mistral-key";
          return null;
        }) as any,
      };

      const registry = await createProviders(config);
      expect(registry).toBeDefined();
      expect(registry.providers).toContain("anthropic");
      expect(registry.providers).toContain("mistral");
      expect(registry.providers).not.toContain("openrouter");
    });

    it("should skip providers without API keys", async () => {
      const config: ProviderConfig = {
        getSecret: mock(async (name: string) => {
          if (name === "ANTHROPIC_API_KEY") return "sk-ant-test";
          return null;
        }) as any,
      };

      const registry = await createProviders(config);
      expect(registry.providers).toContain("anthropic");
      expect(registry.providers).not.toContain("mistral");
      expect(registry.providers).not.toContain("openrouter");
    });

    it("should return empty providers list when no keys configured", async () => {
      const config: ProviderConfig = {
        getSecret: mock(async () => null) as any,
      };

      const registry = await createProviders(config);
      expect(registry.providers).toHaveLength(0);
    });
  });

  describe("getProviderModel", () => {
    it("should return configured model for a task type", async () => {
      const getSetting = mock(async (key: string) => {
        if (key === "ai.model.chat") return "anthropic:claude-sonnet-4-5";
        return null;
      });

      const model = await getProviderModel("chat", getSetting as any);
      expect(model).toBe("anthropic:claude-sonnet-4-5");
    });

    it("should return default model when no setting configured", async () => {
      const getSetting = mock(async () => null);

      const model = await getProviderModel("chat", getSetting as any);
      expect(model).toBe(DEFAULT_MODELS["chat"]);
    });

    it("should handle all task types", async () => {
      const getSetting = mock(async () => null);

      for (const taskType of TASK_TYPES) {
        const model = await getProviderModel(taskType, getSetting as any);
        expect(model).toBeDefined();
        expect(model).toContain(":");
      }
    });
  });
});
```

### Step 3.2: Implementierung

**`template/backend/src/ai/providers.ts`:**
```typescript
import { createProviderRegistry } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { mistral } from "@ai-sdk/mistral";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// --- Typen ---

/** Unterstuetzte Task-Typen fuer Modellauswahl */
export const TASK_TYPES = [
  "chat",
  "summarization",
  "code-analysis",
  "embeddings",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

/** Secret-Namen fuer Provider-API-Keys (im Framework secrets Table) */
export const PROVIDER_SECRET_NAMES = {
  anthropic: "ANTHROPIC_API_KEY",
  mistral: "MISTRAL_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
} as const;

/** Standard-Modelle pro Task-Typ (format: "provider:model") */
export const DEFAULT_MODELS: Record<TaskType, string> = {
  chat: "anthropic:claude-sonnet-4-5",
  summarization: "mistral:mistral-large-latest",
  "code-analysis": "openrouter:deepseek/deepseek-coder",
  embeddings: "mistral:mistral-embed",
};

export interface ProviderConfig {
  /** Funktion zum Lesen von Secrets aus der DB (Framework getSecret) */
  getSecret: (name: string) => Promise<string | null>;
}

export interface ProviderRegistryResult {
  /** Die AI SDK Provider-Registry (oder null wenn keine Provider verfuegbar) */
  registry: ReturnType<typeof createProviderRegistry> | null;
  /** Liste der verfuegbaren Provider-Namen */
  providers: string[];
}

// --- Provider Registry ---

/**
 * Erstellt die AI SDK Provider-Registry.
 * Liest API-Keys aus dem Framework-Secrets-Table (verschluesselt).
 * Ueberspringt Provider ohne konfigurierten API-Key.
 */
export async function createProviders(
  config: ProviderConfig
): Promise<ProviderRegistryResult> {
  const [anthropicKey, mistralKey, openrouterKey] = await Promise.all([
    config.getSecret(PROVIDER_SECRET_NAMES.anthropic),
    config.getSecret(PROVIDER_SECRET_NAMES.mistral),
    config.getSecret(PROVIDER_SECRET_NAMES.openrouter),
  ]);

  const providers: Record<string, any> = {};
  const availableProviders: string[] = [];

  if (anthropicKey) {
    providers.anthropic = anthropic({ apiKey: anthropicKey });
    availableProviders.push("anthropic");
    console.log("[ai-providers] Anthropic Provider aktiviert");
  }

  if (mistralKey) {
    providers.mistral = mistral({ apiKey: mistralKey });
    availableProviders.push("mistral");
    console.log("[ai-providers] Mistral Provider aktiviert");
  }

  if (openrouterKey) {
    providers.openrouter = createOpenRouter({ apiKey: openrouterKey });
    availableProviders.push("openrouter");
    console.log("[ai-providers] OpenRouter Provider aktiviert");
  }

  if (availableProviders.length === 0) {
    console.warn("[ai-providers] Keine AI-Provider konfiguriert. AI-Features deaktiviert.");
    return { registry: null, providers: [] };
  }

  const registry = createProviderRegistry(providers);
  return { registry, providers: availableProviders };
}

// --- Modell-Auswahl pro Task ---

/**
 * Gibt das konfigurierte Modell fuer einen Task-Typ zurueck.
 * Format: "provider:model" (z.B. "anthropic:claude-sonnet-4-5").
 *
 * Liest zuerst aus den Settings (DB). Falls nicht konfiguriert,
 * wird der Default aus DEFAULT_MODELS verwendet.
 *
 * @param taskType - Der Task-Typ (chat, summarization, etc.)
 * @param getSetting - Funktion zum Lesen von Settings aus der DB
 */
export async function getProviderModel(
  taskType: TaskType,
  getSetting: (key: string) => Promise<string | null>
): Promise<string> {
  const settingKey = `ai.model.${taskType}`;
  const configured = await getSetting(settingKey);

  if (configured) {
    return configured;
  }

  return DEFAULT_MODELS[taskType];
}

// --- Globale Instanz ---

let _globalProviders: ProviderRegistryResult | null = null;

/**
 * Initialisiert die globalen Provider.
 * Wird einmal beim Server-Start aufgerufen.
 */
export async function initProviders(config: ProviderConfig): Promise<ProviderRegistryResult> {
  _globalProviders = await createProviders(config);
  return _globalProviders;
}

/**
 * Gibt die globale Provider-Registry zurueck.
 * Wirft wenn nicht initialisiert.
 */
export function getProviders(): ProviderRegistryResult {
  if (!_globalProviders) {
    throw new Error("[ai-providers] Provider nicht initialisiert. initProviders() zuerst aufrufen.");
  }
  return _globalProviders;
}
```

### Step 3.3: Tests ausfuehren

```bash
cd template/backend && bun test src/ai/providers.test.ts
```

### Commit

```
feat(ai): add multi-provider registry with Anthropic, Mistral, OpenRouter via secrets
```

---

## Task 4: Cost Guardrails

**Ziel:** `template/backend/src/ai/cost-guardrails.ts` — Budget-Pruefungen die VOR jedem AI-Call ausgefuehrt werden. Drei Ebenen: globales Tagesbudget, Max pro Einzelcall, Tageslimit pro Modul. Konfigurierbar ueber Settings (DB).

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/ai/cost-guardrails.ts` |
| Create | `template/backend/src/ai/cost-guardrails.test.ts` |

### Step 4.1: Tests schreiben (TDD)

**`template/backend/src/ai/cost-guardrails.test.ts`:**
```typescript
import { describe, it, expect, mock } from "bun:test";
import {
  checkCostGuardrails,
  createCostGuardrailChecker,
  type CostGuardrailConfig,
  type CostGuardrailDeps,
  type CostGuardrailResult,
  DEFAULT_COST_GUARDRAILS,
} from "./cost-guardrails";

describe("Cost Guardrails", () => {
  describe("DEFAULT_COST_GUARDRAILS", () => {
    it("should have sensible defaults", () => {
      expect(DEFAULT_COST_GUARDRAILS.dailyBudgetUsd).toBe(5.0);
      expect(DEFAULT_COST_GUARDRAILS.perCallMaxUsd).toBe(0.5);
      expect(DEFAULT_COST_GUARDRAILS.perModuleDailyUsd).toBe(2.0);
    });
  });

  describe("createCostGuardrailChecker", () => {
    it("should allow call when under all limits", async () => {
      const deps: CostGuardrailDeps = {
        getConfig: mock(async () => DEFAULT_COST_GUARDRAILS),
        getDailyTotalUsd: mock(async () => 1.0),
        getModuleDailyUsd: mock(async (_module: string) => 0.5),
      };
      const checker = createCostGuardrailChecker(deps);

      const result = await checker.check("mail", 0.1);
      expect(result.allowed).toBe(true);
      expect(result.dailySpent).toBe(1.0);
      expect(result.dailyBudget).toBe(5.0);
      expect(result.dailyRemaining).toBe(4.0);
    });

    it("should reject when daily budget would be exceeded", async () => {
      const deps: CostGuardrailDeps = {
        getConfig: mock(async () => DEFAULT_COST_GUARDRAILS),
        getDailyTotalUsd: mock(async () => 4.8),
        getModuleDailyUsd: mock(async () => 0.5),
      };
      const checker = createCostGuardrailChecker(deps);

      const result = await checker.check("mail", 0.3);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("DAILY_BUDGET_EXCEEDED");
    });

    it("should reject when exactly at daily budget", async () => {
      const deps: CostGuardrailDeps = {
        getConfig: mock(async () => DEFAULT_COST_GUARDRAILS),
        getDailyTotalUsd: mock(async () => 5.0),
        getModuleDailyUsd: mock(async () => 0.5),
      };
      const checker = createCostGuardrailChecker(deps);

      const result = await checker.check("mail", 0.01);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("DAILY_BUDGET_EXCEEDED");
    });

    it("should reject when per-call max exceeded", async () => {
      const deps: CostGuardrailDeps = {
        getConfig: mock(async () => DEFAULT_COST_GUARDRAILS),
        getDailyTotalUsd: mock(async () => 0.0),
        getModuleDailyUsd: mock(async () => 0.0),
      };
      const checker = createCostGuardrailChecker(deps);

      const result = await checker.check("mail", 0.6);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("PER_CALL_MAX_EXCEEDED");
    });

    it("should check per-call max BEFORE daily budget", async () => {
      const deps: CostGuardrailDeps = {
        getConfig: mock(async () => DEFAULT_COST_GUARDRAILS),
        getDailyTotalUsd: mock(async () => 4.9),
        getModuleDailyUsd: mock(async () => 0.0),
      };
      const checker = createCostGuardrailChecker(deps);

      // 0.6 ueberschreitet per-call max (0.5), aber auch daily budget
      const result = await checker.check("mail", 0.6);
      expect(result.reason).toBe("PER_CALL_MAX_EXCEEDED");
    });

    it("should reject when per-module daily limit exceeded", async () => {
      const deps: CostGuardrailDeps = {
        getConfig: mock(async () => DEFAULT_COST_GUARDRAILS),
        getDailyTotalUsd: mock(async () => 1.0),
        getModuleDailyUsd: mock(async () => 1.9),
      };
      const checker = createCostGuardrailChecker(deps);

      const result = await checker.check("mail", 0.2);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("MODULE_DAILY_LIMIT_EXCEEDED");
    });

    it("should use custom config when provided", async () => {
      const customConfig: CostGuardrailConfig = {
        dailyBudgetUsd: 10.0,
        perCallMaxUsd: 1.0,
        perModuleDailyUsd: 5.0,
      };
      const deps: CostGuardrailDeps = {
        getConfig: mock(async () => customConfig),
        getDailyTotalUsd: mock(async () => 6.0),
        getModuleDailyUsd: mock(async () => 3.0),
      };
      const checker = createCostGuardrailChecker(deps);

      // Unter custom limits
      const result = await checker.check("mail", 0.8);
      expect(result.allowed).toBe(true);
    });

    it("should return module-specific spending info", async () => {
      const deps: CostGuardrailDeps = {
        getConfig: mock(async () => DEFAULT_COST_GUARDRAILS),
        getDailyTotalUsd: mock(async () => 2.0),
        getModuleDailyUsd: mock(async () => 1.5),
      };
      const checker = createCostGuardrailChecker(deps);

      const result = await checker.check("mail", 0.1);
      expect(result.moduleSpent).toBe(1.5);
      expect(result.moduleLimit).toBe(2.0);
      expect(result.moduleRemaining).toBe(0.5);
    });

    it("should allow zero-cost calls", async () => {
      const deps: CostGuardrailDeps = {
        getConfig: mock(async () => DEFAULT_COST_GUARDRAILS),
        getDailyTotalUsd: mock(async () => 4.99),
        getModuleDailyUsd: mock(async () => 1.99),
      };
      const checker = createCostGuardrailChecker(deps);

      const result = await checker.check("mail", 0);
      expect(result.allowed).toBe(true);
    });
  });
});
```

### Step 4.2: Implementierung

**`template/backend/src/ai/cost-guardrails.ts`:**
```typescript
// --- Typen ---

/**
 * Konfiguration fuer Kosten-Guardrails.
 * Gespeichert in der DB, konfigurierbar ueber Settings UI.
 */
export interface CostGuardrailConfig {
  /** Max USD pro Tag ueber alle Module */
  dailyBudgetUsd: number;
  /** Max USD pro einzelnem AI-Call */
  perCallMaxUsd: number;
  /** Max USD pro Tag pro Modul */
  perModuleDailyUsd: number;
}

/** Standard-Guardrails (aus der Spec) */
export const DEFAULT_COST_GUARDRAILS: CostGuardrailConfig = {
  dailyBudgetUsd: 5.0,
  perCallMaxUsd: 0.5,
  perModuleDailyUsd: 2.0,
};

/**
 * Ergebnis einer Guardrail-Pruefung.
 */
export interface CostGuardrailResult {
  /** Ob der Call erlaubt ist */
  allowed: boolean;
  /** Grund bei Ablehnung */
  reason?:
    | "DAILY_BUDGET_EXCEEDED"
    | "PER_CALL_MAX_EXCEEDED"
    | "MODULE_DAILY_LIMIT_EXCEEDED";
  /** Heute insgesamt ausgegeben (USD) */
  dailySpent: number;
  /** Tagesbudget (USD) */
  dailyBudget: number;
  /** Verbleibendes Tagesbudget (USD) */
  dailyRemaining: number;
  /** Heute fuer dieses Modul ausgegeben (USD) */
  moduleSpent: number;
  /** Tageslimit fuer dieses Modul (USD) */
  moduleLimit: number;
  /** Verbleibendes Modul-Tageslimit (USD) */
  moduleRemaining: number;
}

/**
 * Dependencies fuer den Cost-Guardrail-Checker (DI fuer Testbarkeit).
 */
export interface CostGuardrailDeps {
  /** Laedt die aktuelle Guardrail-Config aus der DB/Settings */
  getConfig: () => Promise<CostGuardrailConfig>;
  /** Summe aller Kosten heute (USD) */
  getDailyTotalUsd: () => Promise<number>;
  /** Summe der Kosten heute fuer ein bestimmtes Modul (USD) */
  getModuleDailyUsd: (moduleName: string) => Promise<number>;
}

// --- Checker ---

/**
 * Erstellt einen Cost-Guardrail-Checker.
 *
 * Pruef-Reihenfolge:
 * 1. Per-Call Maximum (billigster Check, keine DB-Abfrage noetig)
 * 2. Daily Budget (globale Summe)
 * 3. Per-Module Daily Limit (modul-spezifische Summe)
 */
export function createCostGuardrailChecker(deps: CostGuardrailDeps) {
  return {
    /**
     * Prueft ob ein AI-Call mit geschaetzten Kosten erlaubt ist.
     *
     * @param moduleName - Name des aufrufenden Moduls
     * @param estimatedCostUsd - Geschaetzte Kosten des Calls in USD
     */
    async check(
      moduleName: string,
      estimatedCostUsd: number
    ): Promise<CostGuardrailResult> {
      const config = await deps.getConfig();

      // 1. Per-Call Maximum (kein DB-Zugriff noetig)
      if (estimatedCostUsd > config.perCallMaxUsd) {
        const [dailyTotal, moduleTotal] = await Promise.all([
          deps.getDailyTotalUsd(),
          deps.getModuleDailyUsd(moduleName),
        ]);
        return {
          allowed: false,
          reason: "PER_CALL_MAX_EXCEEDED",
          dailySpent: dailyTotal,
          dailyBudget: config.dailyBudgetUsd,
          dailyRemaining: Math.max(0, config.dailyBudgetUsd - dailyTotal),
          moduleSpent: moduleTotal,
          moduleLimit: config.perModuleDailyUsd,
          moduleRemaining: Math.max(0, config.perModuleDailyUsd - moduleTotal),
        };
      }

      // 2 + 3: Parallele DB-Abfragen
      const [dailyTotal, moduleTotal] = await Promise.all([
        deps.getDailyTotalUsd(),
        deps.getModuleDailyUsd(moduleName),
      ]);

      const baseResult = {
        dailySpent: dailyTotal,
        dailyBudget: config.dailyBudgetUsd,
        dailyRemaining: Math.max(0, config.dailyBudgetUsd - dailyTotal),
        moduleSpent: moduleTotal,
        moduleLimit: config.perModuleDailyUsd,
        moduleRemaining: Math.max(0, config.perModuleDailyUsd - moduleTotal),
      };

      // 2. Daily Budget
      if (dailyTotal + estimatedCostUsd > config.dailyBudgetUsd) {
        return {
          ...baseResult,
          allowed: false,
          reason: "DAILY_BUDGET_EXCEEDED",
        };
      }

      // 3. Per-Module Daily Limit
      if (moduleTotal + estimatedCostUsd > config.perModuleDailyUsd) {
        return {
          ...baseResult,
          allowed: false,
          reason: "MODULE_DAILY_LIMIT_EXCEEDED",
        };
      }

      return {
        ...baseResult,
        allowed: true,
      };
    },
  };
}

// --- Globaler Checker ---

let _globalChecker: ReturnType<typeof createCostGuardrailChecker> | null = null;

/**
 * Initialisiert den globalen Cost-Guardrail-Checker.
 */
export function initCostGuardrails(deps: CostGuardrailDeps): void {
  _globalChecker = createCostGuardrailChecker(deps);
}

/**
 * Globale Convenience-Funktion: Prueft Cost-Guardrails vor einem AI-Call.
 * Wenn kein Checker initialisiert, wird der Call erlaubt (graceful degradation).
 */
export async function checkCostGuardrails(
  moduleName: string,
  estimatedCostUsd: number
): Promise<CostGuardrailResult> {
  if (!_globalChecker) {
    console.warn("[cost-guardrails] Kein Checker initialisiert. Call erlaubt.");
    return {
      allowed: true,
      dailySpent: 0,
      dailyBudget: DEFAULT_COST_GUARDRAILS.dailyBudgetUsd,
      dailyRemaining: DEFAULT_COST_GUARDRAILS.dailyBudgetUsd,
      moduleSpent: 0,
      moduleLimit: DEFAULT_COST_GUARDRAILS.perModuleDailyUsd,
      moduleRemaining: DEFAULT_COST_GUARDRAILS.perModuleDailyUsd,
    };
  }
  return _globalChecker.check(moduleName, estimatedCostUsd);
}
```

### Step 4.3: Tests ausfuehren

```bash
cd template/backend && bun test src/ai/cost-guardrails.test.ts
```

### Commit

```
feat(ai): add cost guardrails with daily budget, per-call max, and per-module limits
```

---

## Task 5: Cost Queries — DB-Abfragen fuer Guardrails und Dashboard

**Ziel:** `template/backend/src/ai/cost-queries.ts` — Drizzle-basierte Abfragen gegen `mc_ai_costs` fuer Tagessummen, Modul-Summen, und Dashboard-Aggregationen. Werden von den Guardrails und der Settings-UI benoetigt.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/ai/cost-queries.ts` |
| Create | `template/backend/src/ai/cost-queries.test.ts` |

### Step 5.1: Tests schreiben (TDD)

**`template/backend/src/ai/cost-queries.test.ts`:**
```typescript
import { describe, it, expect, mock } from "bun:test";
import {
  createCostQueries,
  type CostQueryDeps,
  type CostSummary,
  type CostByProvider,
  type CostByModule,
} from "./cost-queries";

describe("Cost Queries", () => {
  const mockDeps: CostQueryDeps = {
    queryDailyTotal: mock(async () => 2.45),
    queryModuleDaily: mock(async (module: string) => 0.82),
    queryTodaySummary: mock(async () => ({
      totalUsd: 2.45,
      totalCalls: 47,
      totalTokensInput: 125000,
      totalTokensOutput: 28000,
    })),
    queryWeekSummary: mock(async () => ({
      totalUsd: 12.30,
      totalCalls: 312,
      totalTokensInput: 890000,
      totalTokensOutput: 195000,
    })),
    queryByProvider: mock(async () => [
      { provider: "anthropic", totalUsd: 1.80, calls: 30 },
      { provider: "mistral", totalUsd: 0.65, calls: 17 },
    ]),
    queryByModule: mock(async () => [
      { module: "mail", totalUsd: 0.95, calls: 15 },
      { module: "todos", totalUsd: 0.50, calls: 12 },
      { module: "main-agent", totalUsd: 1.00, calls: 20 },
    ]),
  };

  describe("getDailyTotalUsd", () => {
    it("should return today's total cost in USD", async () => {
      const queries = createCostQueries(mockDeps);
      const total = await queries.getDailyTotalUsd();
      expect(total).toBe(2.45);
    });
  });

  describe("getModuleDailyUsd", () => {
    it("should return today's cost for a specific module", async () => {
      const queries = createCostQueries(mockDeps);
      const total = await queries.getModuleDailyUsd("mail");
      expect(total).toBe(0.82);
    });
  });

  describe("getTodaySummary", () => {
    it("should return aggregated stats for today", async () => {
      const queries = createCostQueries(mockDeps);
      const summary = await queries.getTodaySummary();
      expect(summary.totalUsd).toBe(2.45);
      expect(summary.totalCalls).toBe(47);
    });
  });

  describe("getWeekSummary", () => {
    it("should return aggregated stats for the current week", async () => {
      const queries = createCostQueries(mockDeps);
      const summary = await queries.getWeekSummary();
      expect(summary.totalUsd).toBe(12.30);
      expect(summary.totalCalls).toBe(312);
    });
  });

  describe("getByProvider", () => {
    it("should return costs grouped by provider", async () => {
      const queries = createCostQueries(mockDeps);
      const byProvider = await queries.getByProvider();
      expect(byProvider).toHaveLength(2);
      expect(byProvider[0].provider).toBe("anthropic");
    });
  });

  describe("getByModule", () => {
    it("should return costs grouped by module", async () => {
      const queries = createCostQueries(mockDeps);
      const byModule = await queries.getByModule();
      expect(byModule).toHaveLength(3);
      expect(byModule[0].module).toBe("mail");
    });
  });
});
```

### Step 5.2: Implementierung

**`template/backend/src/ai/cost-queries.ts`:**
```typescript
// --- Typen ---

export interface CostSummary {
  totalUsd: number;
  totalCalls: number;
  totalTokensInput: number;
  totalTokensOutput: number;
}

export interface CostByProvider {
  provider: string;
  totalUsd: number;
  calls: number;
}

export interface CostByModule {
  module: string;
  totalUsd: number;
  calls: number;
}

/**
 * Dependencies fuer Cost-Queries (DI fuer Testbarkeit).
 * In der echten Implementierung werden diese mit Drizzle-Queries befuellt.
 */
export interface CostQueryDeps {
  /** Summe aller Kosten heute */
  queryDailyTotal: () => Promise<number>;
  /** Summe der Kosten heute fuer ein Modul */
  queryModuleDaily: (moduleName: string) => Promise<number>;
  /** Aggregierte Stats fuer heute */
  queryTodaySummary: () => Promise<CostSummary>;
  /** Aggregierte Stats fuer diese Woche */
  queryWeekSummary: () => Promise<CostSummary>;
  /** Kosten nach Provider gruppiert (heute) */
  queryByProvider: () => Promise<CostByProvider[]>;
  /** Kosten nach Modul gruppiert (heute) */
  queryByModule: () => Promise<CostByModule[]>;
}

// --- Queries ---

/**
 * Erstellt Cost-Query-Funktionen mit injizierten Dependencies.
 */
export function createCostQueries(deps: CostQueryDeps) {
  return {
    /** Gesamtkosten heute in USD */
    getDailyTotalUsd: deps.queryDailyTotal,
    /** Kosten heute fuer ein bestimmtes Modul */
    getModuleDailyUsd: deps.queryModuleDaily,
    /** Zusammenfassung heute */
    getTodaySummary: deps.queryTodaySummary,
    /** Zusammenfassung diese Woche */
    getWeekSummary: deps.queryWeekSummary,
    /** Kosten nach Provider */
    getByProvider: deps.queryByProvider,
    /** Kosten nach Modul */
    getByModule: deps.queryByModule,
  };
}

// --- Drizzle Query Builder (echte Implementierung) ---

/**
 * Erstellt die echten Drizzle-Query-Funktionen fuer mc_ai_costs.
 *
 * Wird beim Server-Start aufgerufen mit der DB-Instanz.
 * Nutzt SQL-Aggregationen (SUM, COUNT) fuer effiziente Abfragen.
 */
export function createDrizzleCostQueries(db: any, mcAiCosts: any): CostQueryDeps {
  const startOfToday = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  };

  const startOfWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    // Montag als Wochenstart (europaeisch)
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  return {
    queryDailyTotal: async () => {
      const { sql, gte } = await import("drizzle-orm");
      const result = await db
        .select({ total: sql<string>`COALESCE(SUM(${mcAiCosts.costUsd}), 0)` })
        .from(mcAiCosts)
        .where(gte(mcAiCosts.createdAt, startOfToday()));
      return parseFloat(result[0]?.total ?? "0");
    },

    queryModuleDaily: async (moduleName: string) => {
      const { sql, gte, eq, and } = await import("drizzle-orm");
      const result = await db
        .select({ total: sql<string>`COALESCE(SUM(${mcAiCosts.costUsd}), 0)` })
        .from(mcAiCosts)
        .where(
          and(
            eq(mcAiCosts.project, moduleName),
            gte(mcAiCosts.createdAt, startOfToday())
          )
        );
      return parseFloat(result[0]?.total ?? "0");
    },

    queryTodaySummary: async () => {
      const { sql, gte } = await import("drizzle-orm");
      const result = await db
        .select({
          totalUsd: sql<string>`COALESCE(SUM(${mcAiCosts.costUsd}), 0)`,
          totalCalls: sql<number>`COUNT(*)`,
          totalTokensInput: sql<number>`COALESCE(SUM(${mcAiCosts.tokensInput}), 0)`,
          totalTokensOutput: sql<number>`COALESCE(SUM(${mcAiCosts.tokensOutput}), 0)`,
        })
        .from(mcAiCosts)
        .where(gte(mcAiCosts.createdAt, startOfToday()));
      const row = result[0];
      return {
        totalUsd: parseFloat(row?.totalUsd ?? "0"),
        totalCalls: Number(row?.totalCalls ?? 0),
        totalTokensInput: Number(row?.totalTokensInput ?? 0),
        totalTokensOutput: Number(row?.totalTokensOutput ?? 0),
      };
    },

    queryWeekSummary: async () => {
      const { sql, gte } = await import("drizzle-orm");
      const result = await db
        .select({
          totalUsd: sql<string>`COALESCE(SUM(${mcAiCosts.costUsd}), 0)`,
          totalCalls: sql<number>`COUNT(*)`,
          totalTokensInput: sql<number>`COALESCE(SUM(${mcAiCosts.tokensInput}), 0)`,
          totalTokensOutput: sql<number>`COALESCE(SUM(${mcAiCosts.tokensOutput}), 0)`,
        })
        .from(mcAiCosts)
        .where(gte(mcAiCosts.createdAt, startOfWeek()));
      const row = result[0];
      return {
        totalUsd: parseFloat(row?.totalUsd ?? "0"),
        totalCalls: Number(row?.totalCalls ?? 0),
        totalTokensInput: Number(row?.totalTokensInput ?? 0),
        totalTokensOutput: Number(row?.totalTokensOutput ?? 0),
      };
    },

    queryByProvider: async () => {
      const { sql, gte } = await import("drizzle-orm");
      const result = await db
        .select({
          provider: mcAiCosts.provider,
          totalUsd: sql<string>`COALESCE(SUM(${mcAiCosts.costUsd}), 0)`,
          calls: sql<number>`COUNT(*)`,
        })
        .from(mcAiCosts)
        .where(gte(mcAiCosts.createdAt, startOfToday()))
        .groupBy(mcAiCosts.provider)
        .orderBy(sql`SUM(${mcAiCosts.costUsd}) DESC`);
      return result.map((r: any) => ({
        provider: r.provider,
        totalUsd: parseFloat(r.totalUsd ?? "0"),
        calls: Number(r.calls ?? 0),
      }));
    },

    queryByModule: async () => {
      const { sql, gte } = await import("drizzle-orm");
      const result = await db
        .select({
          module: mcAiCosts.project,
          totalUsd: sql<string>`COALESCE(SUM(${mcAiCosts.costUsd}), 0)`,
          calls: sql<number>`COUNT(*)`,
        })
        .from(mcAiCosts)
        .where(gte(mcAiCosts.createdAt, startOfToday()))
        .groupBy(mcAiCosts.project)
        .orderBy(sql`SUM(${mcAiCosts.costUsd}) DESC`);
      return result.map((r: any) => ({
        module: r.module,
        totalUsd: parseFloat(r.totalUsd ?? "0"),
        calls: Number(r.calls ?? 0),
      }));
    },
  };
}
```

### Step 5.3: Tests ausfuehren

```bash
cd template/backend && bun test src/ai/cost-queries.test.ts
```

### Commit

```
feat(ai): add cost query functions for guardrails and dashboard aggregations
```

---

## Task 6: Server-Start Integration — Wiring

**Ziel:** Alle AI-Komponenten (Provider, Cost-Tracking, Guardrails) beim Server-Start verdrahten. Schema in `defineServer()` registrieren, Tracker und Guardrails initialisieren, `onStepFinish`-Callback mit Cost-Logging verbinden.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/ai/init.ts` |
| Create | `template/backend/src/ai/init.test.ts` |
| Modify | `template/backend/src/index.ts` |

### Step 6.1: Tests schreiben (TDD)

**`template/backend/src/ai/init.test.ts`:**
```typescript
import { describe, it, expect, mock } from "bun:test";
import { initAI, type AIInitConfig, type AIContext } from "./init";

describe("AI Init", () => {
  it("should initialize all AI subsystems", async () => {
    const config: AIInitConfig = {
      getSecret: mock(async (name: string) => {
        if (name === "ANTHROPIC_API_KEY") return "sk-test";
        return null;
      }) as any,
      getSetting: mock(async () => null) as any,
      dbInsert: mock(async () => {}) as any,
      queryDailyTotal: mock(async () => 0) as any,
      queryModuleDaily: mock(async () => 0) as any,
    };

    const ctx = await initAI(config);
    expect(ctx).toBeDefined();
    expect(ctx.providers).toBeDefined();
    expect(ctx.costTracker).toBeDefined();
    expect(ctx.costGuardrails).toBeDefined();
    expect(typeof ctx.onStepFinish).toBe("function");
  });

  it("should create onStepFinish callback that logs costs", async () => {
    const dbInsertMock = mock(async () => {});
    const config: AIInitConfig = {
      getSecret: mock(async () => null) as any,
      getSetting: mock(async () => null) as any,
      dbInsert: dbInsertMock,
      queryDailyTotal: mock(async () => 0) as any,
      queryModuleDaily: mock(async () => 0) as any,
    };

    const ctx = await initAI(config);

    // Simuliere einen onStepFinish-Call mit Token-Usage
    await ctx.onStepFinish({
      usage: { promptTokens: 1000, completionTokens: 200 },
      response: {
        modelId: "claude-sonnet-4-5",
      },
      moduleName: "mail",
    });

    // Cost-Logger sollte aufgerufen worden sein
    expect(dbInsertMock).toHaveBeenCalledTimes(1);
  });

  it("should gracefully handle missing providers", async () => {
    const config: AIInitConfig = {
      getSecret: mock(async () => null) as any,
      getSetting: mock(async () => null) as any,
      dbInsert: mock(async () => {}) as any,
      queryDailyTotal: mock(async () => 0) as any,
      queryModuleDaily: mock(async () => 0) as any,
    };

    const ctx = await initAI(config);
    expect(ctx.providers.providers).toHaveLength(0);
  });
});
```

### Step 6.2: Implementierung

**`template/backend/src/ai/init.ts`:**
```typescript
import { initProviders, type ProviderRegistryResult } from "./providers";
import {
  initCostTracking,
  type CostTrackingConfig,
} from "./cost-tracking";
import {
  initCostGuardrails,
  createCostGuardrailChecker,
  DEFAULT_COST_GUARDRAILS,
  type CostGuardrailConfig,
} from "./cost-guardrails";
import { logAICost, type AICostEntry } from "@super-app/shared";

// --- Typen ---

export interface AIInitConfig {
  /** Framework getSecret-Funktion */
  getSecret: (name: string) => Promise<string | null>;
  /** Framework getSetting-Funktion */
  getSetting: (key: string) => Promise<string | null>;
  /** DB-Insert in mc_ai_costs */
  dbInsert: (values: any) => Promise<void>;
  /** Abfrage: Gesamtkosten heute */
  queryDailyTotal: () => Promise<number>;
  /** Abfrage: Kosten heute pro Modul */
  queryModuleDaily: (moduleName: string) => Promise<number>;
  /** Optionale externe Tracker-URL */
  externalCostUrl?: string;
  /** Optionaler Bearer-Token fuer externen Tracker */
  externalCostToken?: string;
}

export interface AIContext {
  /** Provider-Registry mit verfuegbaren Providern */
  providers: ProviderRegistryResult;
  /** Cost-Tracker-Instanz */
  costTracker: ReturnType<typeof import("@super-app/shared").createCostTracker>;
  /** Cost-Guardrail-Checker */
  costGuardrails: ReturnType<typeof createCostGuardrailChecker>;
  /** Callback fuer onStepFinish (AI SDK Integration) */
  onStepFinish: (data: {
    usage: { promptTokens: number; completionTokens: number };
    response: { modelId: string };
    moduleName: string;
  }) => Promise<void>;
}

// --- Kosten-Schaetzung nach Provider/Modell ---

/**
 * Schaetzt Kosten basierend auf Token-Zahlen und Modell.
 * Konservative Schaetzung fuer Guardrail-Checks.
 */
function estimateCostUsd(
  model: string,
  tokensInput: number,
  tokensOutput: number
): number {
  // Preise pro Million Tokens (konservative Schaetzung)
  const pricing: Record<string, { input: number; output: number }> = {
    "claude-sonnet": { input: 3.0, output: 15.0 },
    "claude-haiku": { input: 0.25, output: 1.25 },
    "mistral-large": { input: 2.0, output: 6.0 },
    "mistral-small": { input: 0.2, output: 0.6 },
    "mistral-embed": { input: 0.1, output: 0.0 },
    deepseek: { input: 0.14, output: 0.28 },
  };

  // Modell-Pattern matchen
  const modelLower = model.toLowerCase();
  let pricePerMillion = { input: 3.0, output: 15.0 }; // Default: Claude Sonnet Preise

  for (const [pattern, price] of Object.entries(pricing)) {
    if (modelLower.includes(pattern)) {
      pricePerMillion = price;
      break;
    }
  }

  return (
    (tokensInput / 1_000_000) * pricePerMillion.input +
    (tokensOutput / 1_000_000) * pricePerMillion.output
  );
}

/**
 * Extrahiert den Provider-Namen aus einer Model-ID.
 * z.B. "claude-sonnet-4-5" -> "anthropic"
 */
function inferProvider(modelId: string): string {
  const lower = modelId.toLowerCase();
  if (lower.includes("claude")) return "anthropic";
  if (lower.includes("mistral")) return "mistral";
  if (lower.includes("deepseek")) return "openrouter";
  return "unknown";
}

// --- Initialisierung ---

/**
 * Initialisiert das komplette AI-Subsystem.
 * Wird einmal beim Server-Start aufgerufen.
 */
export async function initAI(config: AIInitConfig): Promise<AIContext> {
  // 1. Provider initialisieren
  const providers = await initProviders({
    getSecret: config.getSecret,
  });

  // 2. Cost-Tracking initialisieren
  const costTrackingConfig: CostTrackingConfig = {
    dbInsert: config.dbInsert,
  };
  if (config.externalCostUrl && config.externalCostToken) {
    costTrackingConfig.externalUrl = config.externalCostUrl;
    costTrackingConfig.externalToken = config.externalCostToken;
  }
  const costTracker = initCostTracking(costTrackingConfig);

  // 3. Cost-Guardrails initialisieren
  const costGuardrails = createCostGuardrailChecker({
    getConfig: async () => {
      // Versuche Config aus Settings zu laden, sonst Defaults
      try {
        const dailyBudget = await config.getSetting("ai.guardrails.dailyBudgetUsd");
        const perCallMax = await config.getSetting("ai.guardrails.perCallMaxUsd");
        const perModuleDaily = await config.getSetting("ai.guardrails.perModuleDailyUsd");

        return {
          dailyBudgetUsd: dailyBudget ? parseFloat(dailyBudget) : DEFAULT_COST_GUARDRAILS.dailyBudgetUsd,
          perCallMaxUsd: perCallMax ? parseFloat(perCallMax) : DEFAULT_COST_GUARDRAILS.perCallMaxUsd,
          perModuleDailyUsd: perModuleDaily ? parseFloat(perModuleDaily) : DEFAULT_COST_GUARDRAILS.perModuleDailyUsd,
        };
      } catch {
        return DEFAULT_COST_GUARDRAILS;
      }
    },
    getDailyTotalUsd: config.queryDailyTotal,
    getModuleDailyUsd: config.queryModuleDaily,
  });
  initCostGuardrails({
    getConfig: async () => DEFAULT_COST_GUARDRAILS,
    getDailyTotalUsd: config.queryDailyTotal,
    getModuleDailyUsd: config.queryModuleDaily,
  });

  // 4. onStepFinish Callback erstellen
  const onStepFinish = async (data: {
    usage: { promptTokens: number; completionTokens: number };
    response: { modelId: string };
    moduleName: string;
  }) => {
    const costUsd = estimateCostUsd(
      data.response.modelId,
      data.usage.promptTokens,
      data.usage.completionTokens
    );

    const entry: AICostEntry = {
      project: data.moduleName,
      provider: inferProvider(data.response.modelId),
      model: data.response.modelId,
      tokensInput: data.usage.promptTokens,
      tokensOutput: data.usage.completionTokens,
      costUsd,
    };

    // Fire-and-forget: logAICost wirft nie
    await logAICost(entry);
  };

  console.log(
    `[ai] AI-Subsystem initialisiert. Provider: [${providers.providers.join(", ")}]`
  );

  return {
    providers,
    costTracker,
    costGuardrails,
    onStepFinish,
  };
}
```

### Step 6.3: index.ts anpassen

**`template/backend/src/index.ts`** — mc_ai_costs Schema und AI-Init ergaenzen:

```typescript
import { defineServer } from "@framework/index";
import { getModuleRegistry } from "./module-registry";
import { mcAiCosts } from "./ai/db/schema";
import { initAI } from "./ai/init";
import type { ModulePlugin } from "@super-app/shared";

// --- Module Imports ---
// import { plugin as mailPlugin } from "../../modules/mail/backend/src/plugin";

// --- Module registrieren ---
const registry = getModuleRegistry();
// registry.register(mailPlugin);

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
    mcAiCosts, // Cost-Tracking Tabelle
  },
  customHonoApps: registry.getMergedRoutes().map((route) => ({
    baseRoute: route.baseRoute,
    app: route.app,
  })),
  jobHandlers: registry.getMergedJobs(),
});

// --- AI-Subsystem initialisieren (nach Server-Start) ---
// initAI wird aufgerufen sobald DB-Verbindung steht
// Details der Verdrahtung haengen vom Framework-Lifecycle ab

export default server;
```

### Step 6.4: Tests ausfuehren

```bash
cd template/backend && bun test src/ai/init.test.ts
```

### Commit

```
feat(ai): add AI init wiring with providers, cost-tracking, guardrails, and onStepFinish
```

---

## Task 7: Cost API Routes

**Ziel:** Hono-API-Routen fuer das Cost-Dashboard in der Settings-UI. Endpunkte fuer Tages-/Wochensummen, Aufschluesselung nach Provider und Modul, und Guardrail-Status.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/ai/routes/costs.ts` |
| Create | `template/backend/src/ai/routes/costs.test.ts` |

### Step 7.1: Tests schreiben (TDD)

**`template/backend/src/ai/routes/costs.test.ts`:**
```typescript
import { describe, it, expect, mock } from "bun:test";
import { Hono } from "hono";
import { createCostRoutes, type CostRouteDeps } from "./costs";

describe("Cost API Routes", () => {
  const mockDeps: CostRouteDeps = {
    getTodaySummary: mock(async () => ({
      totalUsd: 2.45,
      totalCalls: 47,
      totalTokensInput: 125000,
      totalTokensOutput: 28000,
    })),
    getWeekSummary: mock(async () => ({
      totalUsd: 12.30,
      totalCalls: 312,
      totalTokensInput: 890000,
      totalTokensOutput: 195000,
    })),
    getByProvider: mock(async () => [
      { provider: "anthropic", totalUsd: 1.80, calls: 30 },
    ]),
    getByModule: mock(async () => [
      { module: "mail", totalUsd: 0.95, calls: 15 },
    ]),
    getGuardrailStatus: mock(async () => ({
      dailyBudgetUsd: 5.0,
      dailySpentUsd: 2.45,
      dailyRemainingUsd: 2.55,
      perCallMaxUsd: 0.5,
      perModuleDailyUsd: 2.0,
    })),
  };

  function createTestApp() {
    const app = new Hono();
    createCostRoutes(app, mockDeps);
    return app;
  }

  it("GET /costs/today should return today's summary", async () => {
    const app = createTestApp();
    const res = await app.request("/costs/today");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalUsd).toBe(2.45);
    expect(body.totalCalls).toBe(47);
  });

  it("GET /costs/week should return week's summary", async () => {
    const app = createTestApp();
    const res = await app.request("/costs/week");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalUsd).toBe(12.30);
  });

  it("GET /costs/by-provider should return provider breakdown", async () => {
    const app = createTestApp();
    const res = await app.request("/costs/by-provider");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].provider).toBe("anthropic");
  });

  it("GET /costs/by-module should return module breakdown", async () => {
    const app = createTestApp();
    const res = await app.request("/costs/by-module");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].module).toBe("mail");
  });

  it("GET /costs/guardrails should return budget status", async () => {
    const app = createTestApp();
    const res = await app.request("/costs/guardrails");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dailyBudgetUsd).toBe(5.0);
    expect(body.dailyRemainingUsd).toBe(2.55);
  });
});
```

### Step 7.2: Implementierung

**`template/backend/src/ai/routes/costs.ts`:**
```typescript
import type { Hono } from "hono";
import type { CostSummary, CostByProvider, CostByModule } from "../cost-queries";

// --- Typen ---

export interface GuardrailStatus {
  dailyBudgetUsd: number;
  dailySpentUsd: number;
  dailyRemainingUsd: number;
  perCallMaxUsd: number;
  perModuleDailyUsd: number;
}

export interface CostRouteDeps {
  getTodaySummary: () => Promise<CostSummary>;
  getWeekSummary: () => Promise<CostSummary>;
  getByProvider: () => Promise<CostByProvider[]>;
  getByModule: () => Promise<CostByModule[]>;
  getGuardrailStatus: () => Promise<GuardrailStatus>;
}

// --- Routes ---

/**
 * Registriert die Cost-API-Routen.
 * Alle Routen erfordern Admin-Berechtigung (wird vom Framework-Middleware geprueft).
 */
export function createCostRoutes(app: Hono, deps: CostRouteDeps): void {
  // Zusammenfassung heute
  app.get("/costs/today", async (c) => {
    const summary = await deps.getTodaySummary();
    return c.json(summary);
  });

  // Zusammenfassung diese Woche
  app.get("/costs/week", async (c) => {
    const summary = await deps.getWeekSummary();
    return c.json(summary);
  });

  // Aufschluesselung nach Provider
  app.get("/costs/by-provider", async (c) => {
    const data = await deps.getByProvider();
    return c.json(data);
  });

  // Aufschluesselung nach Modul
  app.get("/costs/by-module", async (c) => {
    const data = await deps.getByModule();
    return c.json(data);
  });

  // Guardrail-Status (Budget-Auslastung)
  app.get("/costs/guardrails", async (c) => {
    const status = await deps.getGuardrailStatus();
    return c.json(status);
  });
}
```

### Step 7.3: Tests ausfuehren

```bash
cd template/backend && bun test src/ai/routes/costs.test.ts
```

### Commit

```
feat(ai): add cost dashboard API routes for summary, provider, module, and guardrail status
```

---

## Task 8: Settings UI — AI Providers (Frontend)

**Ziel:** Vue-Seite in der Settings-UI: API-Key-Eingaben pro Provider, Standard-Modell pro Task-Typ, Guardrail-Konfiguration, und Kosten-Dashboard-Zusammenfassung. Keys werden ueber die Framework-Secrets-API gespeichert.

### Files

| Action | Path |
|--------|------|
| Create | `template/frontend/src/views/admin/ai-settings.vue` |
| Create | `template/frontend/src/stores/ai-settings.ts` |
| Create | `template/frontend/src/composables/useAICosts.ts` |

### Step 8.1: Pinia Store

**`template/frontend/src/stores/ai-settings.ts`:**
```typescript
import { defineStore } from "pinia";
import { ref, computed } from "vue";

// --- Typen ---

export interface ProviderStatus {
  name: string;
  hasKey: boolean;
  active: boolean;
}

export interface TaskModelConfig {
  taskType: string;
  label: string;
  model: string; // format: "provider:model"
}

export interface CostSummary {
  totalUsd: number;
  totalCalls: number;
  totalTokensInput: number;
  totalTokensOutput: number;
}

export interface GuardrailConfig {
  dailyBudgetUsd: number;
  dailySpentUsd: number;
  dailyRemainingUsd: number;
  perCallMaxUsd: number;
  perModuleDailyUsd: number;
}

// --- Store ---

export const useAISettingsStore = defineStore("ai-settings", () => {
  const providers = ref<ProviderStatus[]>([
    { name: "anthropic", hasKey: false, active: false },
    { name: "mistral", hasKey: false, active: false },
    { name: "openrouter", hasKey: false, active: false },
  ]);

  const taskModels = ref<TaskModelConfig[]>([
    { taskType: "chat", label: "Chat / Agent", model: "anthropic:claude-sonnet-4-5" },
    { taskType: "summarization", label: "Zusammenfassung", model: "mistral:mistral-large-latest" },
    { taskType: "code-analysis", label: "Code-Analyse", model: "openrouter:deepseek/deepseek-coder" },
    { taskType: "embeddings", label: "Embeddings", model: "mistral:mistral-embed" },
  ]);

  const todaySummary = ref<CostSummary>({
    totalUsd: 0,
    totalCalls: 0,
    totalTokensInput: 0,
    totalTokensOutput: 0,
  });

  const weekSummary = ref<CostSummary>({
    totalUsd: 0,
    totalCalls: 0,
    totalTokensInput: 0,
    totalTokensOutput: 0,
  });

  const guardrails = ref<GuardrailConfig>({
    dailyBudgetUsd: 5.0,
    dailySpentUsd: 0,
    dailyRemainingUsd: 5.0,
    perCallMaxUsd: 0.5,
    perModuleDailyUsd: 2.0,
  });

  const loading = ref(false);
  const error = ref<string | null>(null);

  const budgetPercentage = computed(() => {
    if (guardrails.value.dailyBudgetUsd === 0) return 0;
    return Math.round(
      (guardrails.value.dailySpentUsd / guardrails.value.dailyBudgetUsd) * 100
    );
  });

  // --- API-Aufrufe ---

  async function fetchProviderStatus() {
    // GET /api/v1/ai/providers/status
    // Aktualisiert providers.value
  }

  async function saveProviderKey(provider: string, apiKey: string) {
    // POST /api/v1/tenant/:tenantId/secrets
    // Speichert den Key verschluesselt im Framework-Secrets-Table
  }

  async function fetchTaskModels() {
    // GET /api/v1/ai/settings/models
    // Aktualisiert taskModels.value
  }

  async function saveTaskModel(taskType: string, model: string) {
    // PUT /api/v1/ai/settings/models/:taskType
    // Speichert die Modellzuordnung
  }

  async function fetchCostData() {
    loading.value = true;
    error.value = null;
    try {
      // Parallele Abfragen
      const [todayRes, weekRes, guardrailRes] = await Promise.all([
        fetch("/api/v1/ai/costs/today"),
        fetch("/api/v1/ai/costs/week"),
        fetch("/api/v1/ai/costs/guardrails"),
      ]);
      todaySummary.value = await todayRes.json();
      weekSummary.value = await weekRes.json();
      guardrails.value = await guardrailRes.json();
    } catch (err) {
      error.value = "Kostendaten konnten nicht geladen werden";
      console.error("[ai-settings] Fehler beim Laden:", err);
    } finally {
      loading.value = false;
    }
  }

  async function saveGuardrails(config: Partial<GuardrailConfig>) {
    // PUT /api/v1/ai/settings/guardrails
    // Speichert Budget-Limits
  }

  return {
    providers,
    taskModels,
    todaySummary,
    weekSummary,
    guardrails,
    loading,
    error,
    budgetPercentage,
    fetchProviderStatus,
    saveProviderKey,
    fetchTaskModels,
    saveTaskModel,
    fetchCostData,
    saveGuardrails,
  };
});
```

### Step 8.2: Composable fuer Kosten-Formatierung

**`template/frontend/src/composables/useAICosts.ts`:**
```typescript
import { computed } from "vue";
import { useAISettingsStore } from "../stores/ai-settings";

/**
 * Composable fuer AI-Kosten-Anzeige.
 * Formatiert Betraege, berechnet Prozente, liefert Farb-Codes.
 */
export function useAICosts() {
  const store = useAISettingsStore();

  /** Formatiert USD-Betrag als String (z.B. "$1.23") */
  function formatUsd(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  /** Formatiert USD als Euro (ungefaehre Umrechnung) */
  function formatEur(amountUsd: number, rate = 0.92): string {
    return `€${(amountUsd * rate).toFixed(2)}`;
  }

  /** Formatiert Token-Anzahl lesbar (z.B. "125K") */
  function formatTokens(count: number): string {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
    return count.toString();
  }

  /** Farbe basierend auf Budget-Auslastung */
  const budgetColor = computed(() => {
    const pct = store.budgetPercentage;
    if (pct >= 90) return "red";
    if (pct >= 70) return "orange";
    if (pct >= 50) return "yellow";
    return "green";
  });

  /** Severity fuer PrimeVue ProgressBar/Tag */
  const budgetSeverity = computed(() => {
    const pct = store.budgetPercentage;
    if (pct >= 90) return "danger";
    if (pct >= 70) return "warn";
    return "success";
  });

  return {
    formatUsd,
    formatEur,
    formatTokens,
    budgetColor,
    budgetSeverity,
  };
}
```

### Step 8.3: Vue-Seite

**`template/frontend/src/views/admin/ai-settings.vue`:**
```vue
<script setup lang="ts">
/**
 * AI Settings Seite
 *
 * Drei Bereiche:
 * 1. Provider-Konfiguration (API-Keys + Aktivierung)
 * 2. Modell-Zuordnung pro Task-Typ
 * 3. Kosten-Dashboard mit Guardrails
 */
import { onMounted, ref } from "vue";
import { useAISettingsStore } from "../../stores/ai-settings";
import { useAICosts } from "../../composables/useAICosts";

const store = useAISettingsStore();
const { formatUsd, formatEur, formatTokens, budgetSeverity } = useAICosts();

// Provider Key Eingabefelder (nicht im Store — nur lokal)
const providerKeys = ref<Record<string, string>>({
  anthropic: "",
  mistral: "",
  openrouter: "",
});

const savingKey = ref<string | null>(null);
const savingGuardrails = ref(false);

// Editierbare Guardrails (lokale Kopie)
const editGuardrails = ref({
  dailyBudgetUsd: 5.0,
  perCallMaxUsd: 0.5,
  perModuleDailyUsd: 2.0,
});

// Externe Tracker-Konfiguration
const externalTracker = ref({
  url: "",
  token: "",
});

onMounted(async () => {
  await Promise.all([
    store.fetchProviderStatus(),
    store.fetchTaskModels(),
    store.fetchCostData(),
  ]);
  editGuardrails.value = {
    dailyBudgetUsd: store.guardrails.dailyBudgetUsd,
    perCallMaxUsd: store.guardrails.perCallMaxUsd,
    perModuleDailyUsd: store.guardrails.perModuleDailyUsd,
  };
});

async function saveKey(provider: string) {
  savingKey.value = provider;
  try {
    await store.saveProviderKey(provider, providerKeys.value[provider]);
    providerKeys.value[provider] = "";
    await store.fetchProviderStatus();
  } finally {
    savingKey.value = null;
  }
}

async function saveGuardrailConfig() {
  savingGuardrails.value = true;
  try {
    await store.saveGuardrails(editGuardrails.value);
    await store.fetchCostData();
  } finally {
    savingGuardrails.value = false;
  }
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto space-y-8">
    <h1 class="text-2xl font-bold">AI Provider Einstellungen</h1>

    <!-- Abschnitt 1: Provider -->
    <section class="card">
      <h2 class="text-xl font-semibold mb-4">Provider</h2>
      <div class="space-y-4">
        <div
          v-for="provider in store.providers"
          :key="provider.name"
          class="flex items-center gap-4 p-4 border rounded-lg"
        >
          <div class="flex-1">
            <span class="font-medium capitalize">{{ provider.name }}</span>
            <span
              v-if="provider.hasKey"
              class="ml-2 text-sm text-green-600"
            >
              Key konfiguriert
            </span>
            <span v-else class="ml-2 text-sm text-gray-400">
              Kein Key
            </span>
          </div>
          <input
            v-model="providerKeys[provider.name]"
            type="password"
            :placeholder="`${provider.name.toUpperCase()} API Key`"
            class="input w-64"
          />
          <button
            class="btn btn-primary"
            :disabled="!providerKeys[provider.name] || savingKey === provider.name"
            @click="saveKey(provider.name)"
          >
            {{ savingKey === provider.name ? "Speichert..." : "Speichern" }}
          </button>
        </div>
      </div>
    </section>

    <!-- Abschnitt 2: Modell-Zuordnung -->
    <section class="card">
      <h2 class="text-xl font-semibold mb-4">Standard-Modelle pro Aufgabe</h2>
      <div class="space-y-3">
        <div
          v-for="task in store.taskModels"
          :key="task.taskType"
          class="flex items-center gap-4"
        >
          <label class="w-40 font-medium">{{ task.label }}</label>
          <input
            :value="task.model"
            class="input flex-1"
            placeholder="provider:model"
            @change="store.saveTaskModel(task.taskType, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </section>

    <!-- Abschnitt 3: Kosten-Dashboard -->
    <section class="card">
      <h2 class="text-xl font-semibold mb-4">Kosten-Dashboard</h2>

      <div v-if="store.loading" class="text-center py-8">Laden...</div>

      <div v-else class="space-y-6">
        <!-- Budget-Balken -->
        <div class="p-4 bg-gray-50 rounded-lg">
          <div class="flex justify-between mb-2">
            <span>Tagesbudget</span>
            <span class="font-mono">
              {{ formatUsd(store.guardrails.dailySpentUsd) }} /
              {{ formatUsd(store.guardrails.dailyBudgetUsd) }}
              ({{ formatEur(store.guardrails.dailySpentUsd) }})
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3">
            <div
              class="h-3 rounded-full transition-all"
              :class="{
                'bg-green-500': store.budgetPercentage < 50,
                'bg-yellow-500': store.budgetPercentage >= 50 && store.budgetPercentage < 70,
                'bg-orange-500': store.budgetPercentage >= 70 && store.budgetPercentage < 90,
                'bg-red-500': store.budgetPercentage >= 90,
              }"
              :style="{ width: `${Math.min(store.budgetPercentage, 100)}%` }"
            />
          </div>
        </div>

        <!-- Zusammenfassung -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold">{{ formatUsd(store.todaySummary.totalUsd) }}</div>
            <div class="text-sm text-gray-500">Heute</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold">{{ formatUsd(store.weekSummary.totalUsd) }}</div>
            <div class="text-sm text-gray-500">Diese Woche</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold">{{ store.todaySummary.totalCalls }}</div>
            <div class="text-sm text-gray-500">Calls heute</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold">{{ formatTokens(store.todaySummary.totalTokensInput + store.todaySummary.totalTokensOutput) }}</div>
            <div class="text-sm text-gray-500">Tokens heute</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Abschnitt 4: Guardrails Konfiguration -->
    <section class="card">
      <h2 class="text-xl font-semibold mb-4">Budget-Limits</h2>
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <label class="w-48">Tagesbudget (USD)</label>
          <input
            v-model.number="editGuardrails.dailyBudgetUsd"
            type="number"
            step="0.5"
            min="0"
            class="input w-32"
          />
        </div>
        <div class="flex items-center gap-4">
          <label class="w-48">Max pro Call (USD)</label>
          <input
            v-model.number="editGuardrails.perCallMaxUsd"
            type="number"
            step="0.1"
            min="0"
            class="input w-32"
          />
        </div>
        <div class="flex items-center gap-4">
          <label class="w-48">Max pro Modul/Tag (USD)</label>
          <input
            v-model.number="editGuardrails.perModuleDailyUsd"
            type="number"
            step="0.5"
            min="0"
            class="input w-32"
          />
        </div>
        <button
          class="btn btn-primary"
          :disabled="savingGuardrails"
          @click="saveGuardrailConfig"
        >
          {{ savingGuardrails ? "Speichert..." : "Limits speichern" }}
        </button>
      </div>
    </section>

    <!-- Abschnitt 5: Externer Cost-Tracker -->
    <section class="card">
      <h2 class="text-xl font-semibold mb-4">Externer Cost-Tracker (optional)</h2>
      <p class="text-sm text-gray-500 mb-4">
        Kosten koennen zusaetzlich an einen externen Tracker weitergeleitet werden (z.B. costs.fever-context.de).
        Fire-and-forget — blockiert keine AI-Calls.
      </p>
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <label class="w-32">URL</label>
          <input
            v-model="externalTracker.url"
            type="url"
            placeholder="https://costs.example.com/api/costs"
            class="input flex-1"
          />
        </div>
        <div class="flex items-center gap-4">
          <label class="w-32">Bearer Token</label>
          <input
            v-model="externalTracker.token"
            type="password"
            placeholder="Bearer Token"
            class="input flex-1"
          />
        </div>
        <button class="btn btn-secondary">Speichern</button>
      </div>
    </section>
  </div>
</template>
```

### Step 8.4: Route registrieren

Die AI-Settings-Seite muss in den Vue-Router unter `/admin/ai` registriert werden. In `template/frontend/src/router/` den Eintrag ergaenzen:

```typescript
{
  path: "/admin/ai",
  component: () => import("../views/admin/ai-settings.vue"),
  meta: { requiresAuth: true, requiredScope: "admin" },
}
```

### Commit

```
feat(frontend): add AI settings page with provider config, model mapping, cost dashboard, and guardrails
```

---

## Task 9: External Cost Tracker Integration

**Ziel:** Settings-API-Routen zum Speichern/Laden der externen Tracker-Konfiguration (URL + Token). Die Werte werden in der Framework-Settings-Tabelle gespeichert und beim Server-Start von `initAI()` gelesen.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/ai/routes/settings.ts` |
| Create | `template/backend/src/ai/routes/settings.test.ts` |

### Step 9.1: Tests schreiben (TDD)

**`template/backend/src/ai/routes/settings.test.ts`:**
```typescript
import { describe, it, expect, mock } from "bun:test";
import { Hono } from "hono";
import { createAISettingsRoutes, type AISettingsRouteDeps } from "./settings";

describe("AI Settings Routes", () => {
  const mockDeps: AISettingsRouteDeps = {
    getSetting: mock(async (key: string) => {
      if (key === "ai.externalTracker.url") return "https://costs.example.com/api/costs";
      if (key === "ai.externalTracker.token") return "token-123";
      if (key === "ai.model.chat") return "anthropic:claude-sonnet-4-5";
      return null;
    }) as any,
    setSetting: mock(async (key: string, value: string) => {}) as any,
    getProviderStatus: mock(async () => [
      { name: "anthropic", hasKey: true, active: true },
      { name: "mistral", hasKey: false, active: false },
      { name: "openrouter", hasKey: false, active: false },
    ]) as any,
    saveProviderKey: mock(async (provider: string, key: string) => {}) as any,
  };

  function createTestApp() {
    const app = new Hono();
    createAISettingsRoutes(app, mockDeps);
    return app;
  }

  it("GET /ai/settings/providers should return provider status", async () => {
    const app = createTestApp();
    const res = await app.request("/ai/settings/providers");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(3);
    expect(body[0].name).toBe("anthropic");
    expect(body[0].hasKey).toBe(true);
  });

  it("PUT /ai/settings/providers/:name/key should save API key", async () => {
    const app = createTestApp();
    const res = await app.request("/ai/settings/providers/anthropic/key", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: "sk-new-key" }),
    });
    expect(res.status).toBe(200);
    expect(mockDeps.saveProviderKey).toHaveBeenCalledWith("anthropic", "sk-new-key");
  });

  it("GET /ai/settings/models should return model mappings", async () => {
    const app = createTestApp();
    const res = await app.request("/ai/settings/models");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.chat).toBe("anthropic:claude-sonnet-4-5");
  });

  it("PUT /ai/settings/guardrails should save guardrail config", async () => {
    const app = createTestApp();
    const res = await app.request("/ai/settings/guardrails", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dailyBudgetUsd: 10.0,
        perCallMaxUsd: 1.0,
        perModuleDailyUsd: 5.0,
      }),
    });
    expect(res.status).toBe(200);
    expect(mockDeps.setSetting).toHaveBeenCalled();
  });

  it("GET /ai/settings/external-tracker should return tracker config", async () => {
    const app = createTestApp();
    const res = await app.request("/ai/settings/external-tracker");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://costs.example.com/api/costs");
    expect(body.hasToken).toBe(true);
  });

  it("PUT /ai/settings/external-tracker should save tracker config", async () => {
    const app = createTestApp();
    const res = await app.request("/ai/settings/external-tracker", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://new-tracker.com/api",
        token: "new-token",
      }),
    });
    expect(res.status).toBe(200);
    expect(mockDeps.setSetting).toHaveBeenCalled();
  });
});
```

### Step 9.2: Implementierung

**`template/backend/src/ai/routes/settings.ts`:**
```typescript
import type { Hono } from "hono";
import { TASK_TYPES, DEFAULT_MODELS, PROVIDER_SECRET_NAMES } from "../providers";

// --- Typen ---

export interface AISettingsRouteDeps {
  getSetting: (key: string) => Promise<string | null>;
  setSetting: (key: string, value: string) => Promise<void>;
  getProviderStatus: () => Promise<Array<{ name: string; hasKey: boolean; active: boolean }>>;
  saveProviderKey: (provider: string, apiKey: string) => Promise<void>;
}

// --- Routes ---

/**
 * AI Settings API Routes.
 * Verwaltet Provider-Keys, Modellzuordnungen, Guardrails, und externen Tracker.
 */
export function createAISettingsRoutes(app: Hono, deps: AISettingsRouteDeps): void {
  // --- Provider ---

  app.get("/ai/settings/providers", async (c) => {
    const status = await deps.getProviderStatus();
    return c.json(status);
  });

  app.put("/ai/settings/providers/:name/key", async (c) => {
    const { name } = c.req.param();
    const { apiKey } = await c.req.json<{ apiKey: string }>();

    if (!Object.keys(PROVIDER_SECRET_NAMES).includes(name)) {
      return c.json({ error: "Unbekannter Provider" }, 400);
    }

    await deps.saveProviderKey(name, apiKey);
    return c.json({ success: true });
  });

  // --- Modell-Zuordnung ---

  app.get("/ai/settings/models", async (c) => {
    const models: Record<string, string> = {};
    for (const taskType of TASK_TYPES) {
      const configured = await deps.getSetting(`ai.model.${taskType}`);
      models[taskType] = configured ?? DEFAULT_MODELS[taskType];
    }
    return c.json(models);
  });

  app.put("/ai/settings/models/:taskType", async (c) => {
    const { taskType } = c.req.param();
    const { model } = await c.req.json<{ model: string }>();

    if (!TASK_TYPES.includes(taskType as any)) {
      return c.json({ error: "Unbekannter Task-Typ" }, 400);
    }

    await deps.setSetting(`ai.model.${taskType}`, model);
    return c.json({ success: true });
  });

  // --- Guardrails ---

  app.put("/ai/settings/guardrails", async (c) => {
    const body = await c.req.json<{
      dailyBudgetUsd?: number;
      perCallMaxUsd?: number;
      perModuleDailyUsd?: number;
    }>();

    if (body.dailyBudgetUsd !== undefined) {
      await deps.setSetting("ai.guardrails.dailyBudgetUsd", String(body.dailyBudgetUsd));
    }
    if (body.perCallMaxUsd !== undefined) {
      await deps.setSetting("ai.guardrails.perCallMaxUsd", String(body.perCallMaxUsd));
    }
    if (body.perModuleDailyUsd !== undefined) {
      await deps.setSetting("ai.guardrails.perModuleDailyUsd", String(body.perModuleDailyUsd));
    }

    return c.json({ success: true });
  });

  // --- Externer Tracker ---

  app.get("/ai/settings/external-tracker", async (c) => {
    const url = await deps.getSetting("ai.externalTracker.url");
    const token = await deps.getSetting("ai.externalTracker.token");
    return c.json({
      url: url ?? "",
      hasToken: !!token,
    });
  });

  app.put("/ai/settings/external-tracker", async (c) => {
    const body = await c.req.json<{ url?: string; token?: string }>();

    if (body.url !== undefined) {
      await deps.setSetting("ai.externalTracker.url", body.url);
    }
    if (body.token !== undefined) {
      await deps.setSetting("ai.externalTracker.token", body.token);
    }

    return c.json({ success: true });
  });
}
```

### Step 9.3: Tests ausfuehren

```bash
cd template/backend && bun test src/ai/routes/settings.test.ts
```

### Commit

```
feat(ai): add AI settings API routes for providers, models, guardrails, and external tracker
```

---

## Task 10: npm-Pakete installieren

**Ziel:** Alle benoetigten AI SDK Pakete in `template/backend/package.json` hinzufuegen.

### Files

| Action | Path |
|--------|------|
| Modify | `template/backend/package.json` |

### Step 10.1: Pakete installieren

```bash
cd template/backend && bun add ai @ai-sdk/anthropic @ai-sdk/mistral @openrouter/ai-sdk-provider
```

### Step 10.2: Verifizieren

```bash
cd template/backend && bun run typecheck
```

### Commit

```
chore(deps): add AI SDK packages (ai, anthropic, mistral, openrouter)
```

---

## Zusammenfassung

| Task | Beschreibung | Dateien |
|------|-------------|---------|
| 1 | Cost Tracking DB Schema | `template/backend/src/ai/db/schema.ts` |
| 2 | Cost Tracking Service | `template/backend/src/ai/cost-tracking.ts` |
| 3 | Provider Registry | `template/backend/src/ai/providers.ts` |
| 4 | Cost Guardrails | `template/backend/src/ai/cost-guardrails.ts` |
| 5 | Cost Queries | `template/backend/src/ai/cost-queries.ts` |
| 6 | Server-Start Integration | `template/backend/src/ai/init.ts`, `template/backend/src/index.ts` |
| 7 | Cost API Routes | `template/backend/src/ai/routes/costs.ts` |
| 8 | Settings UI (Frontend) | `template/frontend/src/views/admin/ai-settings.vue` |
| 9 | External Tracker + Settings Routes | `template/backend/src/ai/routes/settings.ts` |
| 10 | npm-Pakete | `template/backend/package.json` |

### Abhaengigkeiten zwischen Tasks

```
Task 10 (Pakete) ──────────────────────────────────────┐
Task 1 (Schema) ─────┬──> Task 2 (Service) ──┐        │
                      ├──> Task 5 (Queries) ──┤        │
                      │                       ├──> Task 6 (Init/Wiring) ──> Task 7 (Cost Routes)
Task 3 (Providers) ──┘                       │                              │
Task 4 (Guardrails) ──────────────────────────┘                             │
                                                                             │
Task 8 (Frontend) <──────────────────────── Task 7 + Task 9 (Settings Routes)
```

**Parallelisierbar:** Task 1, 3, 4, 10 koennen parallel bearbeitet werden.
**Sequenziell:** Task 2 und 5 brauchen Task 1. Task 6 braucht 2, 3, 4, 5. Task 7 und 9 brauchen 6. Task 8 braucht 7 und 9.
