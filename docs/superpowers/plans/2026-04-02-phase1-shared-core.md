# Phase 1: Shared Types + Core Backend Foundation

**Date:** 2026-04-02
**Status:** Ready
**Spec:** `docs/superpowers/specs/2026-04-02-super-app-architecture-design.md`
**For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development**

---

## Ziel

Grundlegende Infrastruktur der Super App: Das `shared/` Paket mit allen TypeScript-Typen, das `module-registry.ts` im Template-Backend, das Module-Scaffold-Script, Cost-Tracking und Guardrail-Utilities. Danach kann jedes neue Modul auf einer stabilen, getypten Basis aufbauen.

## Voraussetzungen

- Bun Runtime installiert
- Repository geklont mit Submodules (`git submodule update --init --recursive`)
- PostgreSQL laeuft (Docker oder lokal) fuer Integrationstests
- Template-Backend unter `template/` ist funktionsfaehig

## Konventionen

- **Runtime:** Bun
- **Validation:** Valibot (NICHT Zod — trotz AI SDK Beispielen in der Spec die `z` verwenden)
- **ORM:** Drizzle ORM
- **Testing:** `bun:test`
- **Commit-Messages:** Englisch, Conventional Commits
- **TDD:** Tests zuerst, dann Implementierung
- **Path-Alias:** `@framework/*` mappt auf `./framework/src/*` (tsconfig im template/backend)

---

## Task 1: Shared Package — Projektstruktur + TypeScript-Typen

**Ziel:** Eigenstaendiges `shared/` Paket mit allen gemeinsamen Typen als `@super-app/shared` importierbar.

### Files

| Action | Path |
|--------|------|
| Create | `shared/package.json` |
| Create | `shared/tsconfig.json` |
| Create | `shared/src/index.ts` |
| Create | `shared/src/types.ts` |
| Create | `shared/src/types.test.ts` |

### Step 1.1: Package-Konfiguration erstellen

```bash
mkdir -p shared/src
```

**`shared/package.json`:**
```json
{
  "name": "@super-app/shared",
  "version": "0.1.0",
  "description": "Shared types and utilities for the Super App platform",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types.ts",
    "./cost-tracking": "./src/cost-tracking.ts",
    "./guardrails": "./src/guardrails.ts"
  },
  "scripts": {
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "valibot": "^1.2.0"
  },
  "devDependencies": {
    "@types/bun": "^1.3.3",
    "typescript": "^5.9.3"
  }
}
```

**`shared/tsconfig.json`:**
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
    "declarationMap": true,
    "sourceMap": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Step 1.2: Tests schreiben (TDD)

**`shared/src/types.test.ts`:**
```typescript
import { describe, it, expect } from "bun:test";
import type {
  ToolResult,
  ToolErrorCode,
  ModuleConfig,
  GuardrailConfig,
  ModuleDefinition,
  RouteRecord,
  ModulePlugin,
} from "./types";

describe("Shared Types", () => {
  describe("ToolResult", () => {
    it("should accept a successful result with data", () => {
      const result: ToolResult = {
        success: true,
        data: { sentTo: "Toby", remaining: 49 },
      };
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.sentTo).toBe("Toby");
      }
    });

    it("should accept a failed result with error code and message", () => {
      const result: ToolResult = {
        success: false,
        code: "FORBIDDEN",
        message: "No permission to send mail",
      };
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("FORBIDDEN");
        expect(result.message).toBeDefined();
      }
    });

    it("should support all ToolErrorCode values", () => {
      const codes: ToolErrorCode[] = [
        "FORBIDDEN",
        "LIMIT_REACHED",
        "NOT_FOUND",
        "VALIDATION_ERROR",
        "UNAVAILABLE",
      ];
      codes.forEach((code) => {
        const result: ToolResult = { success: false, code, message: `Error: ${code}` };
        expect(result.success).toBe(false);
      });
    });
  });

  describe("ModuleConfig", () => {
    it("should accept a complete module config with base permissions", () => {
      const config: ModuleConfig = {
        name: "mail",
        version: "1.0.0",
        permissions: {
          base: {
            read: "mail:read",
            write: "mail:write",
            update: "mail:update",
            delete: "mail:delete",
          },
        },
      };
      expect(config.name).toBe("mail");
      expect(config.permissions.base.read).toBe("mail:read");
    });

    it("should accept custom permissions", () => {
      const config: ModuleConfig = {
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
          },
        },
      };
      expect(config.permissions.custom?.send).toBe("mail:send");
    });

    it("should accept guardrails configuration", () => {
      const config: ModuleConfig = {
        name: "mail",
        version: "1.0.0",
        permissions: {
          base: {
            read: "mail:read",
            write: "mail:write",
            update: "mail:update",
            delete: "mail:delete",
          },
        },
        guardrails: {
          "mail:send": { dailyLimit: 50, requiresApproval: false },
          "mail:delete": { dailyLimit: 20, requiresApproval: true },
        },
      };
      expect(config.guardrails?.["mail:send"]?.dailyLimit).toBe(50);
      expect(config.guardrails?.["mail:delete"]?.requiresApproval).toBe(true);
    });
  });

  describe("GuardrailConfig", () => {
    it("should accept all optional fields", () => {
      const guardrail: GuardrailConfig = {
        dailyLimit: 100,
        hourlyLimit: 20,
        requiresApproval: true,
        allowedTimeWindow: { start: "08:00", end: "18:00" },
      };
      expect(guardrail.dailyLimit).toBe(100);
      expect(guardrail.hourlyLimit).toBe(20);
      expect(guardrail.allowedTimeWindow?.start).toBe("08:00");
    });

    it("should accept an empty guardrail config", () => {
      const guardrail: GuardrailConfig = {};
      expect(guardrail.dailyLimit).toBeUndefined();
    });
  });

  describe("ModuleDefinition", () => {
    it("should accept a complete frontend module definition", () => {
      const def: ModuleDefinition = {
        name: "mail",
        routes: [
          { path: "/mail", component: () => Promise.resolve({}) },
          { path: "/mail/compose", component: () => Promise.resolve({}) },
        ],
        navigation: {
          label: "Mail",
          icon: "i-heroicons-envelope",
          position: "sidebar",
          order: 10,
        },
        permissions: ["mail:read"],
      };
      expect(def.name).toBe("mail");
      expect(def.routes).toHaveLength(2);
      expect(def.navigation.position).toBe("sidebar");
    });

    it("should support all navigation positions", () => {
      const positions: ModuleDefinition["navigation"]["position"][] = [
        "sidebar",
        "topbar",
        "hidden",
      ];
      positions.forEach((pos) => {
        const def: ModuleDefinition = {
          name: "test",
          routes: [],
          navigation: { label: "Test", icon: "test", position: pos, order: 1 },
          permissions: [],
        };
        expect(def.navigation.position).toBe(pos);
      });
    });
  });

  describe("ModulePlugin", () => {
    it("should accept a minimal plugin with only config", () => {
      const plugin: ModulePlugin = {
        config: {
          name: "test",
          version: "0.1.0",
          permissions: {
            base: { read: "test:read", write: "test:write", update: "test:update", delete: "test:delete" },
          },
        },
      };
      expect(plugin.config.name).toBe("test");
      expect(plugin.schema).toBeUndefined();
    });

    it("should accept a full plugin with all exports", () => {
      const plugin: ModulePlugin = {
        config: {
          name: "mail",
          version: "1.0.0",
          permissions: {
            base: { read: "mail:read", write: "mail:write", update: "mail:update", delete: "mail:delete" },
          },
        },
        schema: { mailAccounts: {} as any },
        routes: (() => {}) as any,
        jobs: [],
        tools: { sendMail: {} as any },
      };
      expect(plugin.config.name).toBe("mail");
      expect(plugin.tools?.sendMail).toBeDefined();
    });
  });
});
```

### Step 1.3: Typen implementieren

**`shared/src/types.ts`:**
```typescript
// ============================================================
// @super-app/shared — Gemeinsame Typen fuer alle Module
// ============================================================

// --- Tool System ---

/**
 * Fehlercodes fuer Tool-Antworten.
 * Jedes Tool MUSS einen dieser Codes bei Fehler zurueckgeben.
 */
export type ToolErrorCode =
  | "FORBIDDEN"
  | "LIMIT_REACHED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "UNAVAILABLE";

/**
 * Standardisierte Antwort fuer ALLE AI-Tools.
 * Discriminated Union: success bestimmt die Struktur.
 */
export type ToolResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; code: ToolErrorCode; message: string };

// --- Guardrails ---

/**
 * Konfiguration fuer Tool-Guardrails.
 * Gespeichert in der DB, konfigurierbar ueber Settings UI.
 */
export interface GuardrailConfig {
  /** Maximale Ausfuehrungen pro Tag */
  dailyLimit?: number;
  /** Maximale Ausfuehrungen pro Stunde */
  hourlyLimit?: number;
  /** Erfordert menschliche Bestaetigung */
  requiresApproval?: boolean;
  /** Erlaubtes Zeitfenster (z.B. nur 08:00-18:00) */
  allowedTimeWindow?: { start: string; end: string };
}

// --- Module Backend Contract ---

/**
 * Backend-Konfiguration eines Moduls.
 * Jedes Modul exportiert dies in plugin.ts.
 */
export interface ModuleConfig {
  /** Eindeutiger Modulname (z.B. "mail", "todos") */
  name: string;
  /** Semantic Version */
  version: string;
  /** Berechtigungen des Moduls */
  permissions: {
    /** Standard-CRUD-Berechtigungen */
    base: {
      read: string;
      write: string;
      update: string;
      delete: string;
    };
    /** Modul-spezifische Berechtigungen */
    custom?: Record<string, string>;
  };
  /** Guardrail-Konfiguration pro Aktion */
  guardrails?: Record<string, GuardrailConfig>;
}

// --- Module Frontend Contract ---

/**
 * Einzelner Routeneintrag fuer ein Frontend-Modul.
 */
export interface RouteRecord {
  /** URL-Pfad (z.B. "/mail/compose") */
  path: string;
  /** Lazy-loaded Komponente */
  component: () => Promise<any>;
}

/**
 * Frontend-Definition eines Moduls.
 * Jedes Modul mit UI exportiert dies in module.ts.
 */
export interface ModuleDefinition {
  /** Eindeutiger Modulname — muss mit ModuleConfig.name uebereinstimmen */
  name: string;
  /** Routen des Moduls */
  routes: RouteRecord[];
  /** Navigations-Konfiguration */
  navigation: {
    /** Anzeigename (z.B. "Mail") */
    label: string;
    /** Iconify Icon-Name */
    icon: string;
    /** Position in der Navigation */
    position: "sidebar" | "topbar" | "hidden";
    /** Sortierreihenfolge (niedrig = oben) */
    order: number;
  };
  /** Erforderliche Berechtigungen zum Anzeigen */
  permissions: string[];
}

// --- Module Plugin (Backend-Export-Contract) ---

/**
 * Alles was ein Modul in seiner plugin.ts exportieren muss/kann.
 * Wird vom module-registry.ts verwendet.
 */
export interface ModulePlugin {
  /** Pflicht: Modul-Konfiguration */
  config: ModuleConfig;
  /** Optional: Drizzle Schema-Objekte */
  schema?: Record<string, unknown>;
  /** Optional: Hono Route-Handler */
  routes?: (app: any) => void;
  /** Optional: Job-Handler */
  jobs?: Array<{ type: string; handler: any }>;
  /** Optional: AI-Tools */
  tools?: Record<string, unknown>;
}

// --- Cost Tracking ---

/**
 * Datenstruktur fuer KI-Kostenlogging.
 */
export interface AICostEntry {
  /** Modulname (z.B. "mail", "todos", "main-agent") */
  project: string;
  /** Provider-Name (z.B. "anthropic", "mistral", "openrouter") */
  provider: string;
  /** Modellname (z.B. "claude-sonnet-4-5", "mistral-large") */
  model: string;
  /** Eingabe-Tokens */
  tokensInput: number;
  /** Ausgabe-Tokens */
  tokensOutput: number;
  /** Kosten in USD */
  costUsd: number;
}

// --- Agent Session (fuer Mission Control) ---

/**
 * Agent-Session-Typen fuer Monitoring.
 */
export type AgentType = "main" | "sub" | "dynamic";
export type AgentChannel = "telegram" | "pwa" | "api";
export type AgentStatus =
  | "running"
  | "completed"
  | "failed"
  | "timeout"
  | "awaiting_approval";
```

**`shared/src/index.ts`:**
```typescript
// Barrel-Export: Alle Typen und Utilities
export type {
  ToolResult,
  ToolErrorCode,
  ModuleConfig,
  GuardrailConfig,
  ModuleDefinition,
  RouteRecord,
  ModulePlugin,
  AICostEntry,
  AgentType,
  AgentChannel,
  AgentStatus,
} from "./types";
```

### Step 1.4: Tests ausfuehren

```bash
cd shared && bun install && bun test
```

### Step 1.5: Typecheck

```bash
cd shared && bun run typecheck
```

### Commit

```
feat(shared): add shared types package with ToolResult, ModuleConfig, GuardrailConfig, ModuleDefinition
```

---

## Task 2: Cost-Tracking Utility

**Ziel:** `shared/src/cost-tracking.ts` — zentrales, fire-and-forget Kostenlogging mit internem DB-Insert und optionalem externem Tracker.

### Files

| Action | Path |
|--------|------|
| Create | `shared/src/cost-tracking.ts` |
| Create | `shared/src/cost-tracking.test.ts` |

### Step 2.1: Tests schreiben (TDD)

**`shared/src/cost-tracking.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import {
  logAICost,
  createCostTracker,
  type CostTrackerDeps,
} from "./cost-tracking";
import type { AICostEntry } from "./types";

describe("Cost Tracking", () => {
  const sampleEntry: AICostEntry = {
    project: "mail",
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    tokensInput: 1500,
    tokensOutput: 300,
    costUsd: 0.012,
  };

  describe("createCostTracker", () => {
    it("should call the internal logger", async () => {
      const internalLog = mock(async (_entry: AICostEntry) => {});
      const tracker = createCostTracker({
        logInternal: internalLog,
      });

      await tracker.log(sampleEntry);

      expect(internalLog).toHaveBeenCalledTimes(1);
      expect(internalLog).toHaveBeenCalledWith(sampleEntry);
    });

    it("should call the external logger if configured", async () => {
      const internalLog = mock(async (_entry: AICostEntry) => {});
      const externalLog = mock(async (_entry: AICostEntry) => {});
      const tracker = createCostTracker({
        logInternal: internalLog,
        logExternal: externalLog,
      });

      await tracker.log(sampleEntry);

      expect(internalLog).toHaveBeenCalledTimes(1);
      expect(externalLog).toHaveBeenCalledTimes(1);
    });

    it("should not throw if internal logger fails", async () => {
      const internalLog = mock(async () => {
        throw new Error("DB connection lost");
      });
      const tracker = createCostTracker({ logInternal: internalLog });

      // Darf keinen Fehler werfen — fire-and-forget
      await expect(tracker.log(sampleEntry)).resolves.toBeUndefined();
    });

    it("should not throw if external logger fails", async () => {
      const internalLog = mock(async (_entry: AICostEntry) => {});
      const externalLog = mock(async () => {
        throw new Error("External API down");
      });
      const tracker = createCostTracker({
        logInternal: internalLog,
        logExternal: externalLog,
      });

      await expect(tracker.log(sampleEntry)).resolves.toBeUndefined();
    });

    it("should validate entry fields are numbers >= 0", async () => {
      const internalLog = mock(async (_entry: AICostEntry) => {});
      const tracker = createCostTracker({ logInternal: internalLog });

      const invalidEntry: AICostEntry = {
        project: "mail",
        provider: "anthropic",
        model: "claude-sonnet-4-5",
        tokensInput: -1,
        tokensOutput: 300,
        costUsd: 0.01,
      };

      await tracker.log(invalidEntry);
      // Ungueltige Eintraege werden geloggt aber nicht geworfen
      expect(internalLog).toHaveBeenCalledTimes(0);
    });

    it("should validate project and provider are non-empty strings", async () => {
      const internalLog = mock(async (_entry: AICostEntry) => {});
      const tracker = createCostTracker({ logInternal: internalLog });

      const invalidEntry: AICostEntry = {
        project: "",
        provider: "anthropic",
        model: "claude-sonnet-4-5",
        tokensInput: 100,
        tokensOutput: 50,
        costUsd: 0.01,
      };

      await tracker.log(invalidEntry);
      expect(internalLog).toHaveBeenCalledTimes(0);
    });
  });

  describe("logAICost (convenience function)", () => {
    it("should be a fire-and-forget function that never throws", async () => {
      // logAICost ist die globale Convenience-Funktion
      // Sie darf NIEMALS den aufrufenden Code blockieren oder einen Fehler werfen
      await expect(logAICost(sampleEntry)).resolves.toBeUndefined();
    });
  });
});
```

### Step 2.2: Implementierung

**`shared/src/cost-tracking.ts`:**
```typescript
import type { AICostEntry } from "./types";

// --- Dependency Injection fuer Testbarkeit ---

export interface CostTrackerDeps {
  /** Internes Logging (z.B. DB-Insert in mc_ai_costs) */
  logInternal: (entry: AICostEntry) => Promise<void>;
  /** Optionales externes Logging (z.B. cost-tracker.fever-context.de) */
  logExternal?: (entry: AICostEntry) => Promise<void>;
}

/**
 * Validiert einen AICostEntry.
 * Gibt true zurueck wenn gueltig, false wenn nicht.
 */
function isValidCostEntry(entry: AICostEntry): boolean {
  if (!entry.project || entry.project.trim() === "") return false;
  if (!entry.provider || entry.provider.trim() === "") return false;
  if (!entry.model || entry.model.trim() === "") return false;
  if (typeof entry.tokensInput !== "number" || entry.tokensInput < 0) return false;
  if (typeof entry.tokensOutput !== "number" || entry.tokensOutput < 0) return false;
  if (typeof entry.costUsd !== "number" || entry.costUsd < 0) return false;
  return true;
}

/**
 * Erstellt einen Cost-Tracker mit injizierten Abhaengigkeiten.
 * Wird im Template-Backend mit echten DB- und HTTP-Funktionen initialisiert.
 */
export function createCostTracker(deps: CostTrackerDeps) {
  return {
    /**
     * Loggt KI-Kosten. Fire-and-forget: wirft niemals Fehler.
     */
    async log(entry: AICostEntry): Promise<void> {
      if (!isValidCostEntry(entry)) {
        console.warn("[cost-tracking] Ungueltiger Eintrag, wird ignoriert:", entry);
        return;
      }

      try {
        await deps.logInternal(entry);
      } catch (err) {
        console.error("[cost-tracking] Internes Logging fehlgeschlagen:", err);
      }

      if (deps.logExternal) {
        try {
          await deps.logExternal(entry);
        } catch (err) {
          console.error("[cost-tracking] Externes Logging fehlgeschlagen:", err);
        }
      }
    },
  };
}

// --- Globaler Tracker (wird beim Server-Start initialisiert) ---

let _globalTracker: ReturnType<typeof createCostTracker> | null = null;

/**
 * Setzt den globalen Cost-Tracker.
 * Wird einmal beim Server-Start aufgerufen mit echten Dependencies.
 */
export function initGlobalCostTracker(deps: CostTrackerDeps): void {
  _globalTracker = createCostTracker(deps);
}

/**
 * Globale Convenience-Funktion: Loggt KI-Kosten.
 * Fire-and-forget — wirft NIEMALS Fehler, blockiert NIEMALS.
 *
 * Wenn kein globaler Tracker initialisiert ist, wird ein Warn-Log ausgegeben.
 */
export async function logAICost(entry: AICostEntry): Promise<void> {
  if (!_globalTracker) {
    console.warn("[cost-tracking] Kein globaler Tracker initialisiert. Eintrag verworfen.");
    return;
  }
  await _globalTracker.log(entry);
}

/**
 * Erstellt eine externe Log-Funktion fuer HTTP-basierte Cost-Tracker.
 * Nutzt fetch fire-and-forget.
 */
export function createExternalCostLogger(url: string, token: string) {
  return async (entry: AICostEntry): Promise<void> => {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(entry),
    });
  };
}
```

### Step 2.3: Index-Exports aktualisieren

**`shared/src/index.ts`** — ergaenzen:
```typescript
// Barrel-Export: Alle Typen und Utilities
export type {
  ToolResult,
  ToolErrorCode,
  ModuleConfig,
  GuardrailConfig,
  ModuleDefinition,
  RouteRecord,
  ModulePlugin,
  AICostEntry,
  AgentType,
  AgentChannel,
  AgentStatus,
} from "./types";

// Cost Tracking
export {
  createCostTracker,
  initGlobalCostTracker,
  logAICost,
  createExternalCostLogger,
  type CostTrackerDeps,
} from "./cost-tracking";
```

### Step 2.4: Tests ausfuehren

```bash
cd shared && bun test src/cost-tracking.test.ts
```

### Commit

```
feat(shared): add cost-tracking utility with fire-and-forget logging and DI support
```

---

## Task 3: Guardrail-Check Utility

**Ziel:** `shared/src/guardrails.ts` — prueft Limits (daily, hourly, time-window, approval) gegen eine injizierte Usage-Quelle.

### Files

| Action | Path |
|--------|------|
| Create | `shared/src/guardrails.ts` |
| Create | `shared/src/guardrails.test.ts` |

### Step 3.1: Tests schreiben (TDD)

**`shared/src/guardrails.test.ts`:**
```typescript
import { describe, it, expect, mock } from "bun:test";
import {
  checkGuardrail,
  createGuardrailChecker,
  type GuardrailCheckResult,
  type GuardrailCheckerDeps,
} from "./guardrails";
import type { GuardrailConfig } from "./types";

describe("Guardrail Checker", () => {
  describe("createGuardrailChecker", () => {
    it("should return allowed when no guardrail is configured", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => undefined,
        getUsageCount: async () => ({ daily: 0, hourly: 0 }),
      });

      const result = await checker.check("mail:send");
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it("should return allowed when under daily limit", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => ({ dailyLimit: 50 }),
        getUsageCount: async () => ({ daily: 10, hourly: 5 }),
      });

      const result = await checker.check("mail:send");
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(10);
      expect(result.max).toBe(50);
      expect(result.remaining).toBe(40);
    });

    it("should return not allowed when daily limit reached", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => ({ dailyLimit: 50 }),
        getUsageCount: async () => ({ daily: 50, hourly: 10 }),
      });

      const result = await checker.check("mail:send");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("DAILY_LIMIT_REACHED");
      expect(result.used).toBe(50);
      expect(result.max).toBe(50);
    });

    it("should return not allowed when hourly limit reached", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => ({ hourlyLimit: 10 }),
        getUsageCount: async () => ({ daily: 20, hourly: 10 }),
      });

      const result = await checker.check("mail:send");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("HOURLY_LIMIT_REACHED");
    });

    it("should check daily limit before hourly limit", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => ({ dailyLimit: 5, hourlyLimit: 10 }),
        getUsageCount: async () => ({ daily: 5, hourly: 10 }),
      });

      const result = await checker.check("mail:send");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("DAILY_LIMIT_REACHED");
    });

    it("should flag requiresApproval when configured", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => ({ requiresApproval: true, dailyLimit: 100 }),
        getUsageCount: async () => ({ daily: 5, hourly: 2 }),
      });

      const result = await checker.check("mail:delete");
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(true);
    });

    it("should reject outside allowed time window", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => ({
          allowedTimeWindow: { start: "08:00", end: "18:00" },
        }),
        getUsageCount: async () => ({ daily: 0, hourly: 0 }),
        getCurrentTime: () => new Date("2026-04-02T20:30:00"), // 20:30 — ausserhalb
      });

      const result = await checker.check("mail:send");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("OUTSIDE_TIME_WINDOW");
    });

    it("should allow inside allowed time window", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => ({
          allowedTimeWindow: { start: "08:00", end: "18:00" },
        }),
        getUsageCount: async () => ({ daily: 0, hourly: 0 }),
        getCurrentTime: () => new Date("2026-04-02T12:00:00"), // 12:00 — innerhalb
      });

      const result = await checker.check("mail:send");
      expect(result.allowed).toBe(true);
    });

    it("should handle combined guardrails correctly", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => ({
          dailyLimit: 50,
          hourlyLimit: 10,
          requiresApproval: true,
          allowedTimeWindow: { start: "08:00", end: "22:00" },
        }),
        getUsageCount: async () => ({ daily: 5, hourly: 2 }),
        getCurrentTime: () => new Date("2026-04-02T14:00:00"),
      });

      const result = await checker.check("mail:send");
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(true);
      expect(result.remaining).toBe(45); // dailyLimit - daily used
    });
  });
});
```

### Step 3.2: Implementierung

**`shared/src/guardrails.ts`:**
```typescript
import type { GuardrailConfig } from "./types";

// --- Ergebnis-Typ ---

export type GuardrailCheckResult = {
  /** Ob die Aktion erlaubt ist */
  allowed: boolean;
  /** Ob menschliche Bestaetigung noetig ist */
  requiresApproval: boolean;
  /** Grund bei Ablehnung */
  reason?:
    | "DAILY_LIMIT_REACHED"
    | "HOURLY_LIMIT_REACHED"
    | "OUTSIDE_TIME_WINDOW";
  /** Aktuelle Nutzung (bezogen auf den limitierenden Faktor) */
  used?: number;
  /** Maximale Nutzung (bezogen auf den limitierenden Faktor) */
  max?: number;
  /** Verbleibende Nutzung */
  remaining?: number;
};

// --- Dependency Injection ---

export interface GuardrailCheckerDeps {
  /** Laedt die Guardrail-Config fuer eine Aktion aus der DB */
  getConfig: (action: string) => Promise<GuardrailConfig | undefined>;
  /** Laedt die aktuelle Nutzungsanzahl (daily/hourly) aus der DB */
  getUsageCount: (action: string) => Promise<{ daily: number; hourly: number }>;
  /** Optionaler Zeitgeber fuer Testbarkeit */
  getCurrentTime?: () => Date;
}

/**
 * Parst einen Zeitstring "HH:MM" in Minuten seit Mitternacht.
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Prueft ob die aktuelle Zeit innerhalb des erlaubten Fensters liegt.
 */
function isWithinTimeWindow(
  now: Date,
  window: { start: string; end: string }
): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(window.start);
  const endMinutes = parseTimeToMinutes(window.end);

  // Normaler Fall: start < end (z.B. 08:00-18:00)
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Ueber Mitternacht: start > end (z.B. 22:00-06:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

/**
 * Erstellt einen Guardrail-Checker mit injizierten Abhaengigkeiten.
 */
export function createGuardrailChecker(deps: GuardrailCheckerDeps) {
  return {
    /**
     * Prueft Guardrails fuer eine bestimmte Aktion.
     *
     * Reihenfolge: Time Window → Daily Limit → Hourly Limit → Approval
     */
    async check(action: string): Promise<GuardrailCheckResult> {
      const config = await deps.getConfig(action);

      // Keine Guardrails konfiguriert → alles erlaubt
      if (!config) {
        return { allowed: true, requiresApproval: false };
      }

      const now = deps.getCurrentTime ? deps.getCurrentTime() : new Date();

      // 1. Zeitfenster pruefen
      if (config.allowedTimeWindow) {
        if (!isWithinTimeWindow(now, config.allowedTimeWindow)) {
          return {
            allowed: false,
            requiresApproval: false,
            reason: "OUTSIDE_TIME_WINDOW",
          };
        }
      }

      const usage = await deps.getUsageCount(action);

      // 2. Tageslimit pruefen
      if (config.dailyLimit !== undefined) {
        if (usage.daily >= config.dailyLimit) {
          return {
            allowed: false,
            requiresApproval: false,
            reason: "DAILY_LIMIT_REACHED",
            used: usage.daily,
            max: config.dailyLimit,
            remaining: 0,
          };
        }
      }

      // 3. Stundenlimit pruefen
      if (config.hourlyLimit !== undefined) {
        if (usage.hourly >= config.hourlyLimit) {
          return {
            allowed: false,
            requiresApproval: false,
            reason: "HOURLY_LIMIT_REACHED",
            used: usage.hourly,
            max: config.hourlyLimit,
            remaining: 0,
          };
        }
      }

      // 4. Alles OK — berechne remaining basierend auf dem engsten Limit
      const dailyRemaining =
        config.dailyLimit !== undefined
          ? config.dailyLimit - usage.daily
          : Infinity;
      const hourlyRemaining =
        config.hourlyLimit !== undefined
          ? config.hourlyLimit - usage.hourly
          : Infinity;
      const remaining = Math.min(dailyRemaining, hourlyRemaining);

      return {
        allowed: true,
        requiresApproval: config.requiresApproval ?? false,
        used: config.dailyLimit !== undefined ? usage.daily : usage.hourly,
        max: config.dailyLimit ?? config.hourlyLimit,
        remaining: remaining === Infinity ? undefined : remaining,
      };
    },
  };
}

// --- Globaler Checker ---

let _globalChecker: ReturnType<typeof createGuardrailChecker> | null = null;

/**
 * Initialisiert den globalen Guardrail-Checker.
 * Wird einmal beim Server-Start aufgerufen.
 */
export function initGlobalGuardrailChecker(deps: GuardrailCheckerDeps): void {
  _globalChecker = createGuardrailChecker(deps);
}

/**
 * Globale Convenience-Funktion: Prueft Guardrails fuer eine Aktion.
 * Wenn kein Checker initialisiert ist, wird immer erlaubt.
 */
export async function checkGuardrail(
  action: string
): Promise<GuardrailCheckResult> {
  if (!_globalChecker) {
    console.warn("[guardrails] Kein globaler Checker initialisiert. Alles erlaubt.");
    return { allowed: true, requiresApproval: false };
  }
  return _globalChecker.check(action);
}
```

### Step 3.3: Index-Exports aktualisieren

**`shared/src/index.ts`** — ergaenzen:
```typescript
// Barrel-Export: Alle Typen und Utilities
export type {
  ToolResult,
  ToolErrorCode,
  ModuleConfig,
  GuardrailConfig,
  ModuleDefinition,
  RouteRecord,
  ModulePlugin,
  AICostEntry,
  AgentType,
  AgentChannel,
  AgentStatus,
} from "./types";

// Cost Tracking
export {
  createCostTracker,
  initGlobalCostTracker,
  logAICost,
  createExternalCostLogger,
  type CostTrackerDeps,
} from "./cost-tracking";

// Guardrails
export {
  createGuardrailChecker,
  initGlobalGuardrailChecker,
  checkGuardrail,
  type GuardrailCheckResult,
  type GuardrailCheckerDeps,
} from "./guardrails";
```

### Step 3.4: Tests ausfuehren

```bash
cd shared && bun test src/guardrails.test.ts
```

### Commit

```
feat(shared): add guardrail-check utility with daily/hourly limits, time windows, and approval flags
```

---

## Task 4: Module Registry

**Ziel:** `template/backend/src/module-registry.ts` — zentrale Registrierung aller Module mit Zugriff auf Config, Schema, Routes, Tools und Jobs.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/module-registry.ts` |
| Create | `template/backend/src/module-registry.test.ts` |

### Step 4.1: Tests schreiben (TDD)

**`template/backend/src/module-registry.test.ts`:**
```typescript
import { describe, it, expect, beforeEach } from "bun:test";
import {
  ModuleRegistry,
  createModuleRegistry,
  type RegisteredModule,
} from "./module-registry";
import type { ModuleConfig, ModulePlugin } from "@super-app/shared";

// --- Test-Fixtures ---

const mailConfig: ModuleConfig = {
  name: "mail",
  version: "1.0.0",
  permissions: {
    base: { read: "mail:read", write: "mail:write", update: "mail:update", delete: "mail:delete" },
    custom: { send: "mail:send" },
  },
  guardrails: {
    "mail:send": { dailyLimit: 50 },
  },
};

const todosConfig: ModuleConfig = {
  name: "todos",
  version: "1.0.0",
  permissions: {
    base: { read: "todos:read", write: "todos:write", update: "todos:update", delete: "todos:delete" },
  },
};

const mailPlugin: ModulePlugin = {
  config: mailConfig,
  schema: { mailAccounts: { _table: true } },
  routes: (app: any) => { app.get("/inbox", () => "inbox"); },
  jobs: [{ type: "mail:process", handler: async () => {} }],
  tools: { sendMail: { _tool: true }, searchMail: { _tool: true } },
};

const todosPlugin: ModulePlugin = {
  config: todosConfig,
  schema: { todosItems: { _table: true } },
  routes: (app: any) => { app.get("/list", () => "list"); },
  tools: { createTodo: { _tool: true } },
};

describe("ModuleRegistry", () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    registry = createModuleRegistry();
  });

  describe("register()", () => {
    it("should register a module", () => {
      registry.register(mailPlugin);
      expect(registry.getAll()).toHaveLength(1);
    });

    it("should register multiple modules", () => {
      registry.register(mailPlugin);
      registry.register(todosPlugin);
      expect(registry.getAll()).toHaveLength(2);
    });

    it("should throw when registering duplicate module names", () => {
      registry.register(mailPlugin);
      expect(() => registry.register(mailPlugin)).toThrow(
        'Module "mail" is already registered'
      );
    });
  });

  describe("getModule()", () => {
    it("should find a registered module by name", () => {
      registry.register(mailPlugin);
      const mod = registry.getModule("mail");
      expect(mod).toBeDefined();
      expect(mod!.config.name).toBe("mail");
    });

    it("should return undefined for unknown module", () => {
      const mod = registry.getModule("unknown");
      expect(mod).toBeUndefined();
    });
  });

  describe("getAll()", () => {
    it("should return all registered modules", () => {
      registry.register(mailPlugin);
      registry.register(todosPlugin);
      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((m) => m.config.name)).toEqual(["mail", "todos"]);
    });

    it("should return empty array when no modules registered", () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe("getMergedSchema()", () => {
    it("should merge all module schemas", () => {
      registry.register(mailPlugin);
      registry.register(todosPlugin);
      const schema = registry.getMergedSchema();
      expect(schema).toHaveProperty("mailAccounts");
      expect(schema).toHaveProperty("todosItems");
    });

    it("should return empty object when no schemas", () => {
      registry.register({ config: todosConfig });
      const schema = registry.getMergedSchema();
      expect(Object.keys(schema)).toHaveLength(0);
    });
  });

  describe("getMergedRoutes()", () => {
    it("should return all module routes with base paths", () => {
      registry.register(mailPlugin);
      registry.register(todosPlugin);
      const routes = registry.getMergedRoutes();
      expect(routes).toHaveLength(2);
      expect(routes[0].baseRoute).toBe("/mail");
      expect(routes[1].baseRoute).toBe("/todos");
    });

    it("should skip modules without routes", () => {
      registry.register({ config: todosConfig, schema: {} });
      const routes = registry.getMergedRoutes();
      expect(routes).toHaveLength(0);
    });
  });

  describe("getMergedJobs()", () => {
    it("should merge all module jobs", () => {
      registry.register(mailPlugin);
      registry.register(todosPlugin);
      const jobs = registry.getMergedJobs();
      expect(jobs).toHaveLength(1); // Nur mail hat Jobs
      expect(jobs[0].type).toBe("mail:process");
    });
  });

  describe("getAllTools()", () => {
    it("should merge all module tools", () => {
      registry.register(mailPlugin);
      registry.register(todosPlugin);
      const tools = registry.getAllTools();
      expect(Object.keys(tools)).toHaveLength(3); // sendMail, searchMail, createTodo
      expect(tools).toHaveProperty("sendMail");
      expect(tools).toHaveProperty("createTodo");
    });
  });

  describe("getAllPermissions()", () => {
    it("should collect all permissions from all modules", () => {
      registry.register(mailPlugin);
      registry.register(todosPlugin);
      const perms = registry.getAllPermissions();
      expect(perms).toContain("mail:read");
      expect(perms).toContain("mail:send");
      expect(perms).toContain("todos:read");
    });
  });

  describe("getAllGuardrails()", () => {
    it("should collect all guardrails from all modules", () => {
      registry.register(mailPlugin);
      registry.register(todosPlugin);
      const guardrails = registry.getAllGuardrails();
      expect(guardrails).toHaveProperty("mail:send");
      expect(guardrails["mail:send"].dailyLimit).toBe(50);
    });
  });
});
```

### Step 4.2: Implementierung

**`template/backend/src/module-registry.ts`:**
```typescript
import type {
  ModulePlugin,
  ModuleConfig,
  GuardrailConfig,
} from "@super-app/shared";

// --- Typen ---

export interface RegisteredModule extends ModulePlugin {
  /** Zeitpunkt der Registrierung */
  registeredAt: Date;
}

export interface MergedRoute {
  baseRoute: string;
  app: (app: any) => void;
}

export interface ModuleRegistry {
  /** Registriert ein Modul. Wirft bei doppeltem Namen. */
  register(plugin: ModulePlugin): void;

  /** Findet ein Modul nach Name. */
  getModule(name: string): RegisteredModule | undefined;

  /** Alle registrierten Module. */
  getAll(): RegisteredModule[];

  /** Merged Schema aller Module (fuer defineServer). */
  getMergedSchema(): Record<string, unknown>;

  /** Merged Routes aller Module mit /modulename als Basis. */
  getMergedRoutes(): MergedRoute[];

  /** Merged Jobs aller Module. */
  getMergedJobs(): Array<{ type: string; handler: any }>;

  /** Alle Tools aller Module als flaches Objekt. */
  getAllTools(): Record<string, unknown>;

  /** Alle Permissions aller Module. */
  getAllPermissions(): string[];

  /** Alle Guardrails aller Module. */
  getAllGuardrails(): Record<string, GuardrailConfig>;
}

/**
 * Erstellt eine neue ModuleRegistry-Instanz.
 */
export function createModuleRegistry(): ModuleRegistry {
  const modules: RegisteredModule[] = [];

  return {
    register(plugin: ModulePlugin): void {
      const existing = modules.find(
        (m) => m.config.name === plugin.config.name
      );
      if (existing) {
        throw new Error(
          `Module "${plugin.config.name}" is already registered`
        );
      }
      modules.push({
        ...plugin,
        registeredAt: new Date(),
      });
      console.log(
        `[module-registry] Modul "${plugin.config.name}" v${plugin.config.version} registriert`
      );
    },

    getModule(name: string): RegisteredModule | undefined {
      return modules.find((m) => m.config.name === name);
    },

    getAll(): RegisteredModule[] {
      return [...modules];
    },

    getMergedSchema(): Record<string, unknown> {
      const merged: Record<string, unknown> = {};
      for (const mod of modules) {
        if (mod.schema) {
          Object.assign(merged, mod.schema);
        }
      }
      return merged;
    },

    getMergedRoutes(): MergedRoute[] {
      const routes: MergedRoute[] = [];
      for (const mod of modules) {
        if (mod.routes) {
          routes.push({
            baseRoute: `/${mod.config.name}`,
            app: mod.routes,
          });
        }
      }
      return routes;
    },

    getMergedJobs(): Array<{ type: string; handler: any }> {
      const jobs: Array<{ type: string; handler: any }> = [];
      for (const mod of modules) {
        if (mod.jobs) {
          jobs.push(...mod.jobs);
        }
      }
      return jobs;
    },

    getAllTools(): Record<string, unknown> {
      const tools: Record<string, unknown> = {};
      for (const mod of modules) {
        if (mod.tools) {
          Object.assign(tools, mod.tools);
        }
      }
      return tools;
    },

    getAllPermissions(): string[] {
      const perms: string[] = [];
      for (const mod of modules) {
        const { base, custom } = mod.config.permissions;
        perms.push(...Object.values(base));
        if (custom) {
          perms.push(...Object.values(custom));
        }
      }
      return perms;
    },

    getAllGuardrails(): Record<string, GuardrailConfig> {
      const guardrails: Record<string, GuardrailConfig> = {};
      for (const mod of modules) {
        if (mod.config.guardrails) {
          Object.assign(guardrails, mod.config.guardrails);
        }
      }
      return guardrails;
    },
  };
}

// --- Globale Registry-Instanz ---

let _globalRegistry: ModuleRegistry | null = null;

/**
 * Gibt die globale ModuleRegistry zurueck.
 * Erstellt sie beim ersten Aufruf.
 */
export function getModuleRegistry(): ModuleRegistry {
  if (!_globalRegistry) {
    _globalRegistry = createModuleRegistry();
  }
  return _globalRegistry;
}

/**
 * Setzt die globale Registry zurueck (nur fuer Tests).
 */
export function resetModuleRegistry(): void {
  _globalRegistry = null;
}
```

### Step 4.3: tsconfig.json — Path-Alias fuer @super-app/shared

Pruefen ob `template/backend/tsconfig.json` bereits Pfad-Aliase definiert. Falls ja, `@super-app/shared` ergaenzen:

**`template/backend/tsconfig.json`** — Unter `compilerOptions.paths` ergaenzen:
```json
{
  "compilerOptions": {
    "paths": {
      "@framework/*": ["./framework/src/*"],
      "@super-app/shared": ["../../shared/src/index.ts"],
      "@super-app/shared/*": ["../../shared/src/*"]
    }
  }
}
```

> **Hinweis:** Die exakte Aenderung haengt vom bestehenden tsconfig.json ab. Nur die `paths`-Eintraege ergaenzen, nichts entfernen.

### Step 4.4: Tests ausfuehren

```bash
cd template/backend && bun test src/module-registry.test.ts
```

### Commit

```
feat(template): add module-registry with dynamic registration, schema/route/tool merging
```

---

## Task 5: defineServer() Integration mit Module Registry

**Ziel:** `template/backend/src/index.ts` so anpassen, dass Module ueber die Registry registriert und automatisch in `defineServer()` eingebunden werden.

### Files

| Action | Path |
|--------|------|
| Modify | `template/backend/src/index.ts` |
| Create | `template/backend/src/index.test.ts` |

### Step 5.1: Tests schreiben (TDD)

**`template/backend/src/index.test.ts`:**
```typescript
import { describe, it, expect } from "bun:test";
import {
  createModuleRegistry,
  getModuleRegistry,
  resetModuleRegistry,
} from "./module-registry";
import type { ModulePlugin } from "@super-app/shared";

describe("Server Module Integration", () => {
  it("should merge module schemas into a single object", () => {
    const registry = createModuleRegistry();
    registry.register({
      config: {
        name: "mod-a",
        version: "1.0.0",
        permissions: { base: { read: "a:r", write: "a:w", update: "a:u", delete: "a:d" } },
      },
      schema: { tableA: { _t: true } },
    });
    registry.register({
      config: {
        name: "mod-b",
        version: "1.0.0",
        permissions: { base: { read: "b:r", write: "b:w", update: "b:u", delete: "b:d" } },
      },
      schema: { tableB: { _t: true } },
    });

    const merged = registry.getMergedSchema();
    expect(merged).toHaveProperty("tableA");
    expect(merged).toHaveProperty("tableB");
  });

  it("should produce customHonoApps-compatible route entries", () => {
    const registry = createModuleRegistry();
    registry.register({
      config: {
        name: "contacts",
        version: "1.0.0",
        permissions: { base: { read: "c:r", write: "c:w", update: "c:u", delete: "c:d" } },
      },
      routes: (app: any) => {
        app.get("/", () => "contacts list");
      },
    });

    const routes = registry.getMergedRoutes();
    expect(routes).toHaveLength(1);
    expect(routes[0].baseRoute).toBe("/contacts");
    expect(typeof routes[0].app).toBe("function");
  });

  it("should produce jobHandlers-compatible job entries", () => {
    const handler = async () => ({ done: true });
    const registry = createModuleRegistry();
    registry.register({
      config: {
        name: "mail",
        version: "1.0.0",
        permissions: { base: { read: "m:r", write: "m:w", update: "m:u", delete: "m:d" } },
      },
      jobs: [{ type: "mail:sync", handler }],
    });

    const jobs = registry.getMergedJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].type).toBe("mail:sync");
    expect(jobs[0].handler).toBe(handler);
  });
});
```

### Step 5.2: index.ts anpassen

**`template/backend/src/index.ts`** — Neue Version mit Registry-Integration:

```typescript
import { defineServer } from "@framework/index";
import { getModuleRegistry } from "./module-registry";
import type { ModulePlugin } from "@super-app/shared";

// --- Module Imports (ein Modul = eine Zeile) ---
// import { plugin as mailPlugin } from "../../modules/mail/backend/src/plugin";
// import { plugin as todosPlugin } from "../../modules/todos/backend/src/plugin";

// --- Module registrieren ---
const registry = getModuleRegistry();
// registry.register(mailPlugin);
// registry.register(todosPlugin);

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
  customHonoApps: registry.getMergedRoutes().map((route) => ({
    baseRoute: route.baseRoute,
    app: route.app,
  })),
  jobHandlers: registry.getMergedJobs(),
});

export default server;
```

### Step 5.3: Tests ausfuehren

```bash
cd template/backend && bun test src/index.test.ts
```

### Commit

```
feat(template): integrate module-registry into defineServer() for automatic module composition
```

---

## Task 6: Module Scaffold Script

**Ziel:** `bun run module:create <name>` generiert die komplette Boilerplate-Struktur fuer ein neues Modul.

### Files

| Action | Path |
|--------|------|
| Create | `scripts/module-create.ts` |
| Create | `scripts/module-create.test.ts` |
| Modify | `package.json` (Root) — Script-Eintrag |

### Step 6.1: Root package.json erstellen (falls nicht vorhanden)

Pruefen ob `/Users/toby/Documents/github/projekte/super-app/package.json` existiert. Falls nicht:

**`package.json`** (Root):
```json
{
  "name": "super-app",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "module:create": "bun run scripts/module-create.ts"
  },
  "devDependencies": {
    "@types/bun": "^1.3.3",
    "typescript": "^5.9.3"
  }
}
```

### Step 6.2: Tests schreiben (TDD)

**`scripts/module-create.test.ts`:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { rmSync, existsSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";

// Hilfsfunktion: Script ausfuehren
async function runModuleCreate(name: string, cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["bun", "run", join(import.meta.dir, "module-create.ts"), name], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { exitCode, stdout, stderr };
}

const TEST_DIR = join(import.meta.dir, "..", "__test-modules__");
const MODULES_DIR = join(TEST_DIR, "modules");

describe("module:create script", () => {
  beforeEach(() => {
    mkdirSync(MODULES_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should fail without a module name argument", async () => {
    const result = await runModuleCreate("", TEST_DIR);
    expect(result.stderr || result.stdout).toContain("module name");
  });

  it("should fail with invalid module name (uppercase)", async () => {
    const result = await runModuleCreate("MyModule", TEST_DIR);
    expect(result.stderr || result.stdout).toContain("lowercase");
  });

  it("should fail with invalid module name (special chars)", async () => {
    const result = await runModuleCreate("my_module!", TEST_DIR);
    expect(result.stderr || result.stdout).toContain("lowercase");
  });

  it("should create correct directory structure", async () => {
    // Setze MODULES_PATH env damit das Script ins richtige Verzeichnis schreibt
    process.env.SUPER_APP_MODULES_PATH = MODULES_DIR;
    const result = await runModuleCreate("contacts", TEST_DIR);

    const base = join(MODULES_DIR, "contacts");
    expect(existsSync(join(base, "backend", "src", "index.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "src", "plugin.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "src", "tools.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "src", "db", "schema.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "src", "routes", "index.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "src", "jobs", "index.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "src", "services", "index.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "tests", "routes.test.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "tests", "tools.test.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "tests", "schema.test.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "tests", "security.test.ts"))).toBe(true);
    expect(existsSync(join(base, "backend", "package.json"))).toBe(true);
    expect(existsSync(join(base, "frontend", "src", "main.ts"))).toBe(true);
    expect(existsSync(join(base, "frontend", "src", "module.ts"))).toBe(true);
    expect(existsSync(join(base, "frontend", "src", "views", ".gitkeep"))).toBe(true);
    expect(existsSync(join(base, "frontend", "src", "components", ".gitkeep"))).toBe(true);
    expect(existsSync(join(base, "frontend", "src", "stores", ".gitkeep"))).toBe(true);
    expect(existsSync(join(base, "frontend", "package.json"))).toBe(true);
    expect(existsSync(join(base, "README.md"))).toBe(true);
    expect(existsSync(join(base, "AGENTS.md"))).toBe(true);

    delete process.env.SUPER_APP_MODULES_PATH;
  });

  it("should use correct module name in generated files", async () => {
    process.env.SUPER_APP_MODULES_PATH = MODULES_DIR;
    await runModuleCreate("contacts", TEST_DIR);

    const pluginTs = readFileSync(
      join(MODULES_DIR, "contacts", "backend", "src", "plugin.ts"),
      "utf-8"
    );
    expect(pluginTs).toContain('name: "contacts"');

    const moduleTs = readFileSync(
      join(MODULES_DIR, "contacts", "frontend", "src", "module.ts"),
      "utf-8"
    );
    expect(moduleTs).toContain('name: "contacts"');

    const schemaTs = readFileSync(
      join(MODULES_DIR, "contacts", "backend", "src", "db", "schema.ts"),
      "utf-8"
    );
    expect(schemaTs).toContain("contacts_");

    const agentsMd = readFileSync(
      join(MODULES_DIR, "contacts", "AGENTS.md"),
      "utf-8"
    );
    expect(agentsMd).toContain("contacts");

    delete process.env.SUPER_APP_MODULES_PATH;
  });

  it("should fail if module directory already exists", async () => {
    process.env.SUPER_APP_MODULES_PATH = MODULES_DIR;
    mkdirSync(join(MODULES_DIR, "contacts"), { recursive: true });

    const result = await runModuleCreate("contacts", TEST_DIR);
    expect(result.stderr || result.stdout).toContain("already exists");

    delete process.env.SUPER_APP_MODULES_PATH;
  });

  it("should accept hyphenated module names", async () => {
    process.env.SUPER_APP_MODULES_PATH = MODULES_DIR;
    const result = await runModuleCreate("knowledge-base", TEST_DIR);

    const base = join(MODULES_DIR, "knowledge-base");
    expect(existsSync(join(base, "backend", "src", "plugin.ts"))).toBe(true);

    const pluginTs = readFileSync(
      join(base, "backend", "src", "plugin.ts"),
      "utf-8"
    );
    expect(pluginTs).toContain('name: "knowledge-base"');

    // Schema-Prefix: Bindestriche werden zu Unterstrichen
    const schemaTs = readFileSync(
      join(base, "backend", "src", "db", "schema.ts"),
      "utf-8"
    );
    expect(schemaTs).toContain("kb_");

    delete process.env.SUPER_APP_MODULES_PATH;
  });
});
```

### Step 6.3: Implementierung

**`scripts/module-create.ts`:**
```typescript
#!/usr/bin/env bun

/**
 * Module Scaffold Script
 * Usage: bun run module:create <module-name>
 *
 * Erstellt die vollstaendige Boilerplate-Struktur fuer ein neues Super-App-Modul.
 */

import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// --- Konfiguration ---

const MODULE_NAME = process.argv[2]?.trim();
const ROOT_DIR = process.env.SUPER_APP_MODULES_PATH || join(import.meta.dir, "..", "modules");

// --- Validierung ---

if (!MODULE_NAME) {
  console.error("Error: Please provide a module name.\nUsage: bun run module:create <module-name>");
  process.exit(1);
}

if (!/^[a-z][a-z0-9-]*$/.test(MODULE_NAME)) {
  console.error(
    `Error: Module name must be lowercase alphanumeric with optional hyphens (got: "${MODULE_NAME}").`
  );
  process.exit(1);
}

const MODULE_DIR = join(ROOT_DIR, MODULE_NAME);

if (existsSync(MODULE_DIR)) {
  console.error(`Error: Module directory "${MODULE_DIR}" already exists.`);
  process.exit(1);
}

// --- Hilfsfunktionen ---

/** Tabellen-Prefix: "knowledge-base" → "kb_", "contacts" → "contacts_", "mail" → "mail_" */
function getTablePrefix(name: string): string {
  // Sonderfaelle fuer lange Namen
  const abbreviations: Record<string, string> = {
    "knowledge-base": "kb",
    "mission-control": "mc",
  };
  if (abbreviations[name]) return abbreviations[name] + "_";
  // Bindestrich entfernen und als Prefix nutzen
  return name.replace(/-/g, "_") + "_";
}

/** PascalCase: "knowledge-base" → "KnowledgeBase" */
function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** camelCase: "knowledge-base" → "knowledgeBase" */
function toCamelCase(name: string): string {
  const pascal = toPascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function writeFile(relativePath: string, content: string): void {
  const fullPath = join(MODULE_DIR, relativePath);
  const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, content);
}

// --- Templates ---

const prefix = getTablePrefix(MODULE_NAME);
const pascal = toPascalCase(MODULE_NAME);
const camel = toCamelCase(MODULE_NAME);

// Backend: plugin.ts
const pluginTs = `import type { ModuleConfig } from "@super-app/shared";

export const moduleConfig: ModuleConfig = {
  name: "${MODULE_NAME}",
  version: "0.1.0",
  permissions: {
    base: {
      read: "${MODULE_NAME}:read",
      write: "${MODULE_NAME}:write",
      update: "${MODULE_NAME}:update",
      delete: "${MODULE_NAME}:delete",
    },
  },
  guardrails: {},
};

export { ${camel}Schema as schema } from "./db/schema";
export { ${camel}Routes as routes } from "./routes";
export { ${camel}Jobs as jobs } from "./jobs";
export { ${camel}Tools as tools } from "./tools";

export const plugin = {
  config: moduleConfig,
  schema: undefined, // Wird beim Import aus schema.ts befuellt
  routes: undefined,
  jobs: undefined,
  tools: undefined,
};
`;

// Backend: index.ts (Standalone)
const indexTs = `import { defineServer } from "@framework/index";
import { ${camel}Schema } from "./db/schema";
import { ${camel}Routes } from "./routes";
import { ${camel}Jobs } from "./jobs";

const server = defineServer({
  port: 3001,
  appName: "${pascal}",
  basePath: "/api/v1",
  loginUrl: "/login.html",
  magicLoginVerifyUrl: "/magic-login-verify.html",
  staticPublicDataPath: "./public",
  staticPrivateDataPath: "./static",
  customDbSchema: {
    ...${camel}Schema,
  },
  customHonoApps: [
    {
      baseRoute: "/${MODULE_NAME}",
      app: ${camel}Routes,
    },
  ],
  jobHandlers: ${camel}Jobs,
});

export default server;
`;

// Backend: tools.ts
const toolsTs = `import type { ToolResult } from "@super-app/shared";

/**
 * AI-Tools fuer das ${pascal}-Modul.
 *
 * Jedes Tool folgt dem Pattern:
 * 1. Permission Check
 * 2. Guardrail Check
 * 3. Execute
 * 4. ToolResult Response (keine sensitiven Daten!)
 */
export const ${camel}Tools = {
  // Beispiel:
  // search${pascal}: tool({
  //   description: "Search ${MODULE_NAME} entries",
  //   inputSchema: v.object({ query: v.string() }),
  //   execute: async ({ query }): Promise<ToolResult> => {
  //     return { success: true, data: { results: [] } };
  //   },
  // }),
};
`;

// Backend: db/schema.ts
const schemaTs = `// import { sql } from "drizzle-orm";
// import { pgTable, text, timestamp, boolean, uuid, index } from "drizzle-orm/pg-core";
// import { relations } from "drizzle-orm";
// import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

/**
 * Drizzle Schema fuer das ${pascal}-Modul.
 * Tabellen-Prefix: ${prefix}
 *
 * WICHTIG: Alle Tabellen MUESSEN mit "${prefix}" beginnen!
 * NIEMALS manuell SQL schreiben — immer Drizzle verwenden.
 */

// export const ${camel}Example = pgTable(
//   "${prefix}example",
//   {
//     id: uuid("id").primaryKey().default(sql\`gen_random_uuid()\`),
//     tenantId: text("tenant_id").notNull(),
//     name: text("name").notNull(),
//     createdAt: timestamp("created_at").defaultNow(),
//   },
//   (table) => [index("${prefix}example_tenant_idx").on(table.tenantId)]
// );

export const ${camel}Schema = {};
`;

// Backend: routes/index.ts
const routesTs = `/**
 * Hono Routes fuer das ${pascal}-Modul.
 *
 * Folgt dem Framework-Pattern:
 * - Tenant-scoped Routen: /tenant/[tenantId]/${MODULE_NAME}/...
 * - Permission-Checks via Middleware
 */

export const ${camel}Routes = (app: any) => {
  // app.get("/", async (c: any) => {
  //   return c.json({ module: "${MODULE_NAME}", status: "ok" });
  // });
};
`;

// Backend: jobs/index.ts
const jobsTs = `/**
 * Background-Jobs fuer das ${pascal}-Modul.
 */

export const ${camel}Jobs: Array<{ type: string; handler: any }> = [
  // { type: "${MODULE_NAME}:example-job", handler: { execute: async (metadata: any) => {} } },
];
`;

// Backend: services/index.ts
const servicesTs = `/**
 * Business-Logik fuer das ${pascal}-Modul.
 * Services werden von Routes und Tools verwendet.
 */

export const ${camel}Service = {
  // async getAll(tenantId: string) { ... },
};
`;

// Backend: package.json
const backendPackageJson = `{
  "name": "@super-app/${MODULE_NAME}-backend",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "bun --hot run src/index.ts",
    "test": "bun test",
    "app:generate": "drizzle-kit generate",
    "app:migrate": "drizzle-kit migrate"
  }
}
`;

// Backend: Tests
const routesTestTs = `import { describe, it, expect } from "bun:test";

describe("${pascal} Routes", () => {
  it.todo("GET /${MODULE_NAME} should return module status");
  it.todo("POST /${MODULE_NAME} should create entry");
  it.todo("PUT /${MODULE_NAME}/:id should update entry");
  it.todo("DELETE /${MODULE_NAME}/:id should delete entry");
});
`;

const toolsTestTs = `import { describe, it, expect } from "bun:test";
import type { ToolResult } from "@super-app/shared";

describe("${pascal} Tools", () => {
  it.todo("should return FORBIDDEN without permission");
  it.todo("should return LIMIT_REACHED when guardrail exceeded");
  it.todo("should NEVER return sensitive data in tool responses");
  it.todo("should follow ToolResult contract");
});
`;

const schemaTestTs = `import { describe, it, expect } from "bun:test";

describe("${pascal} Schema", () => {
  it.todo("schema exports should be defined");
  it.todo("all tables should use ${prefix} prefix");
});
`;

const securityTestTs = `import { describe, it, expect } from "bun:test";

describe("${pascal} Security", () => {
  it.todo("should reject unauthenticated requests");
  it.todo("should reject requests without required permission");
  it.todo("should not expose sensitive data in responses");
});
`;

// Frontend: module.ts
const moduleDefTs = `import type { ModuleDefinition } from "@super-app/shared";

export const moduleDefinition: ModuleDefinition = {
  name: "${MODULE_NAME}",
  routes: [
    {
      path: "/${MODULE_NAME}",
      component: () => import("./views/Index.vue"),
    },
  ],
  navigation: {
    label: "${pascal}",
    icon: "i-heroicons-square-3-stack-3d",
    position: "sidebar",
    order: 50,
  },
  permissions: ["${MODULE_NAME}:read"],
};
`;

// Frontend: main.ts (Standalone)
const frontendMainTs = `/**
 * Standalone-Einstiegspunkt fuer das ${pascal}-Modul.
 * Startet eine eigene Vue-App.
 */

import { createApp } from "vue";
// import App from "./App.vue";

// const app = createApp(App);
// app.mount("#app");
`;

// Frontend: package.json
const frontendPackageJson = `{
  "name": "@super-app/${MODULE_NAME}-frontend",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
`;

// README.md
const readmeMd = `# ${pascal} Module

> Part of the Super App platform.

## Overview

TODO: Describe what this module does.

## Structure

\`\`\`
${MODULE_NAME}/
├── backend/
│   ├── src/
│   │   ├── index.ts        # Standalone entry
│   │   ├── plugin.ts       # Integrated entry (Super App)
│   │   ├── tools.ts        # AI tools
│   │   ├── db/schema.ts    # Drizzle schema (prefix: ${prefix})
│   │   ├── routes/         # Hono routes
│   │   ├── jobs/           # Background jobs
│   │   └── services/       # Business logic
│   └── tests/              # Tests (mandatory!)
├── frontend/
│   ├── src/
│   │   ├── main.ts         # Standalone entry
│   │   ├── module.ts       # Integrated entry (Super App)
│   │   ├── views/          # Page components
│   │   ├── components/     # Reusable components
│   │   └── stores/         # Pinia stores
├── README.md
└── AGENTS.md
\`\`\`

## Development

\`\`\`bash
# Standalone mode
cd backend && bun run dev

# Tests
cd backend && bun test
\`\`\`

## Table Prefix

All database tables use the prefix \`${prefix}\`.
`;

// AGENTS.md
const agentsMd = `# Module: ${pascal}

## Rules
- Table prefix: \`${prefix}\`
- All tools must return \`ToolResult\` type from \`@super-app/shared\`
- No sensitive data in tool responses (IDs and flags only)
- Tests are mandatory for every endpoint and tool
- Schema changes ONLY via Drizzle, NEVER raw SQL

## Files
| File | Purpose |
|------|---------|
| \`backend/src/plugin.ts\` | Integrated entry — export schema, routes, tools here |
| \`backend/src/tools.ts\` | AI tools — follow permission + guardrail + privacy pattern |
| \`backend/src/index.ts\` | Standalone entry — do not modify for Super App integration |
| \`frontend/src/module.ts\` | Frontend module definition — routes, navigation, permissions |

## Shared Types
Import from \`@super-app/shared\`:
- \`ToolResult\` — standardized tool response
- \`ModuleConfig\` — backend module configuration
- \`ModuleDefinition\` — frontend module definition
- \`GuardrailConfig\` — guardrail settings

## Test Commands
\`\`\`bash
bun test                  # Alle Tests
bun run app:generate      # Migration generieren nach Schema-Aenderung
\`\`\`
`;

// --- Dateien schreiben ---

console.log(`Creating module "${MODULE_NAME}" in ${MODULE_DIR}...`);

// Backend
writeFile("backend/src/plugin.ts", pluginTs);
writeFile("backend/src/index.ts", indexTs);
writeFile("backend/src/tools.ts", toolsTs);
writeFile("backend/src/db/schema.ts", schemaTs);
writeFile("backend/src/routes/index.ts", routesTs);
writeFile("backend/src/jobs/index.ts", jobsTs);
writeFile("backend/src/services/index.ts", servicesTs);
writeFile("backend/package.json", backendPackageJson);

// Backend Tests
writeFile("backend/tests/routes.test.ts", routesTestTs);
writeFile("backend/tests/tools.test.ts", toolsTestTs);
writeFile("backend/tests/schema.test.ts", schemaTestTs);
writeFile("backend/tests/security.test.ts", securityTestTs);

// Frontend
writeFile("frontend/src/main.ts", frontendMainTs);
writeFile("frontend/src/module.ts", moduleDefTs);
writeFile("frontend/src/views/.gitkeep", "");
writeFile("frontend/src/components/.gitkeep", "");
writeFile("frontend/src/stores/.gitkeep", "");
writeFile("frontend/package.json", frontendPackageJson);

// Root
writeFile("README.md", readmeMd);
writeFile("AGENTS.md", agentsMd);

console.log(`\nModule "${MODULE_NAME}" created successfully!`);
console.log(`\nNext steps:`);
console.log(`  1. cd modules/${MODULE_NAME}/backend && bun install`);
console.log(`  2. Implement schema in backend/src/db/schema.ts`);
console.log(`  3. Add routes in backend/src/routes/index.ts`);
console.log(`  4. Add AI tools in backend/src/tools.ts`);
console.log(`  5. Register in template/backend/src/index.ts:`);
console.log(`     import { plugin as ${camel}Plugin } from "../../modules/${MODULE_NAME}/backend/src/plugin";`);
console.log(`     registry.register(${camel}Plugin);`);
`;

### Step 6.4: Tests ausfuehren

```bash
cd /Users/toby/Documents/github/projekte/super-app && bun test scripts/module-create.test.ts
```

### Commit

```
feat(scripts): add module:create scaffold script with full boilerplate generation
```

---

## Task 7: Shared Package Index finalisieren + Alle Tests

**Ziel:** Sicherstellen dass alle Exports korrekt sind und alle Tests grueen.

### Files

| Action | Path |
|--------|------|
| Verify | `shared/src/index.ts` |
| Verify | Alle Test-Dateien |

### Step 7.1: Finaler Index-Export

**`shared/src/index.ts`:**
```typescript
// ============================================================
// @super-app/shared — Barrel Export
// ============================================================

// --- Typen ---
export type {
  ToolResult,
  ToolErrorCode,
  ModuleConfig,
  GuardrailConfig,
  ModuleDefinition,
  RouteRecord,
  ModulePlugin,
  AICostEntry,
  AgentType,
  AgentChannel,
  AgentStatus,
} from "./types";

// --- Cost Tracking ---
export {
  createCostTracker,
  initGlobalCostTracker,
  logAICost,
  createExternalCostLogger,
  type CostTrackerDeps,
} from "./cost-tracking";

// --- Guardrails ---
export {
  createGuardrailChecker,
  initGlobalGuardrailChecker,
  checkGuardrail,
  type GuardrailCheckResult,
  type GuardrailCheckerDeps,
} from "./guardrails";
```

### Step 7.2: Alle Tests ausfuehren

```bash
# Shared Package
cd shared && bun install && bun test

# Module Registry
cd template/backend && bun test src/module-registry.test.ts

# Scaffold Script
cd /Users/toby/Documents/github/projekte/super-app && bun test scripts/module-create.test.ts
```

### Step 7.3: Typecheck ueber alles

```bash
cd shared && bun run typecheck
```

### Commit

```
chore(phase1): finalize shared package exports and verify all tests pass
```

---

## Zusammenfassung der Deliverables

| # | Deliverable | Pfad | Tests |
|---|-------------|------|-------|
| 1 | Shared Types Package | `shared/` | `shared/src/types.test.ts` |
| 2 | Cost-Tracking Utility | `shared/src/cost-tracking.ts` | `shared/src/cost-tracking.test.ts` |
| 3 | Guardrail-Check Utility | `shared/src/guardrails.ts` | `shared/src/guardrails.test.ts` |
| 4 | Module Registry | `template/backend/src/module-registry.ts` | `template/backend/src/module-registry.test.ts` |
| 5 | defineServer() Integration | `template/backend/src/index.ts` | `template/backend/src/index.test.ts` |
| 6 | Module Scaffold Script | `scripts/module-create.ts` | `scripts/module-create.test.ts` |

## Abhaengigkeiten zwischen Tasks

```
Task 1 (Shared Types)
  ├── Task 2 (Cost-Tracking) — braucht AICostEntry aus Task 1
  ├── Task 3 (Guardrails) — braucht GuardrailConfig aus Task 1
  └── Task 4 (Module Registry) — braucht ModulePlugin, ModuleConfig aus Task 1
       └── Task 5 (defineServer) — braucht Module Registry aus Task 4
Task 6 (Scaffold Script) — unabhaengig, nutzt aber die Typen aus Task 1
```

**Parallelisierbar:** Task 2 + Task 3 + Task 6 koennen parallel zu Task 4 bearbeitet werden (alle brauchen nur Task 1).

## Verifikation nach Abschluss

```bash
# 1. Alle Tests
cd /Users/toby/Documents/github/projekte/super-app/shared && bun test
cd /Users/toby/Documents/github/projekte/super-app/template/backend && bun test src/module-registry.test.ts src/index.test.ts
cd /Users/toby/Documents/github/projekte/super-app && bun test scripts/module-create.test.ts

# 2. Typecheck
cd /Users/toby/Documents/github/projekte/super-app/shared && bun run typecheck

# 3. Scaffold-Script Smoke-Test
cd /Users/toby/Documents/github/projekte/super-app && bun run module:create test-module
ls -R modules/test-module/
rm -rf modules/test-module/

# 4. Import-Check: Typen sind korrekt exportiert
cd /Users/toby/Documents/github/projekte/super-app/shared && bun -e "import { createCostTracker, createGuardrailChecker } from './src/index'; console.log('OK')"
```
