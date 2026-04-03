# Phase 5: Test Coverage & Documentation - Research

**Researched:** 2026-04-03
**Domain:** Bun Integration Testing, CLAUDE.md Documentation Sync
**Confidence:** HIGH

## Summary

Phase 5 erfordert vier Integration-Test-Suites und ein CLAUDE.md-Update. Die gesamte Test-Infrastruktur ist bereits etabliert: Bun 1.2.10 als Test-Runner, `bun:test` fuer describe/it/expect/mock, DI-basierte Architektur die Mocking trivial macht, und 71 bestehende Tests die alle gruen sind. Die vier neuen Test-Dateien folgen exakt den etablierten Patterns -- keine neuen Libraries oder Frameworks noetig.

Die Integration Tests unterscheiden sich von den bestehenden Unit Tests nur darin, dass sie mehrere Module zusammenverdrahten (z.B. Registry + AI System + Tool Execution). Dank der konsequenten DI-Architektur (`createXyz(deps)`) koennen alle externen Abhaengigkeiten (DB, Netzwerk, AI SDK) gemockt werden, waehrend die interne Verdrahtung real getestet wird.

**Primary recommendation:** Alle vier Tests als `[feature].integration.test.ts` neben den Source-Dateien, mit dem etablierten `mock()` + `createXyz(mockDeps)` Pattern. Kein neues Tooling noetig.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Alle Integration Tests als Bun-Tests mit gemockten Dependencies -- KEIN laufender Server oder Datenbank noetig. Folgt dem etablierten Pattern: `createXyz(mockDeps)` -> Funktion aufrufen -> Ergebnis pruefen.
- **D-02:** Tests als eigene Dateien in den jeweiligen Feature-Verzeichnissen (co-located), nicht in einem separaten `tests/` Ordner. Namensschema: `[feature].integration.test.ts` um sie von Unit-Tests zu unterscheiden.
- **D-03:** Ein einzelner Multi-Step Test der den kompletten Flow abdeckt: Module registrieren -> AI System erstellen -> Tool aufrufen -> Permission Check verifizieren -> Execution verifizieren -> Cost Logging verifizieren.
- **D-04:** Test-Location: `template/backend/src/ai/module-integration.integration.test.ts`
- **D-05:** Tests auf Super-App Middleware-Level mit gemocktem `verifyToken` Dependency. Vier Szenarien: gueltiger Token, abgelaufener Token, Cache Hit/Miss, malformed Token.
- **D-06:** Test-Location: `template/backend/src/auth/auth-flow.integration.test.ts`
- **D-07:** Integration Test der prueft: Tool-Ausfuehrung wird blockiert wenn Budget ueberschritten.
- **D-08:** Test-Location: `template/backend/src/ai/cost-guardrail.integration.test.ts`
- **D-09:** Integration Test der einen AI-Tool-Aufruf simuliert der auf sensitive Ressourcen zugreift, und verifiziert dass der LLM-Kontext nur maskierte Daten enthaelt.
- **D-10:** Test-Location: `template/backend/src/ai/privacy.integration.test.ts` (existiert bereits mit Unit-Tests -- wird erweitert)
- **D-11:** CLAUDE.md Fokus auf drei Sektionen: Tech Stack Versionen, Implementierungsphasen Status-Tabelle, Projektstruktur.
- **D-12:** Architecture- und Conventions-Sektionen nur aktualisieren wenn Phasen 1-4 fundamentale Pattern-Aenderungen eingefuehrt haben.
- **D-13:** Kein komplettes CLAUDE.md Rewrite -- gezieltes Section-Update.

### Claude's Discretion
- Ob `bun test --coverage` als Gate eingefuehrt wird
- Exakte Mock-Fixture-Daten fuer die Tests
- Ob eine test-utils.ts Datei fuer gemeinsame Test-Helpers erstellt wird
- Reihenfolge der Test-Implementierung

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | E2E Module Integration Tests (Registry -> Agent -> Tool -> Permission) | createModuleRegistry() + createAISystem() + loadModuleTools() Pattern vollstaendig dokumentiert, Mock-Fixtures aus module-registry.test.ts wiederverwendbar |
| TEST-02 | Hanko Auth Flow Tests (Token, Cache, Expiry) | createModuleAuthMiddleware(deps) mit verifyToken-Mock existiert in module-auth-middleware.test.ts -- Cache-Szenario erfordert erweiterten Mock mit State |
| TEST-03 | Cost Guardrail Enforcement Integration Tests | createCostGuardrailChecker(deps) vollstaendig DI-basiert, drei Blockierungs-Szenarien direkt testbar |
| TEST-04 | Privacy System Integration Tests | privacy-integration.test.ts existiert bereits mit Tool-Response-Patterns -- Erweiterung um AI-Tool-Aufruf-Simulation mit sanitizeToolResponse() |
| CON-03 | CLAUDE.md gegen tatsaechlichen Code-Stand aktualisieren | Drei Sektionen identifiziert: Tech Stack (package.json Versionen), Status-Tabelle (Phasen 1-4), Projektstruktur (neue Dateien) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bun:test | 1.2.10 (built-in) | Test Runner, Assertions, Mocking | Bereits im Projekt etabliert, kein externer Runner noetig |
| Hono | 4.10.1 | HTTP-Test via `app.request()` | Fuer Auth-Flow Tests -- Hono hat eingebauten Test-Client |

### Supporting
Keine zusaetzlichen Libraries noetig. Alles ist mit Bun built-ins abgedeckt.

**Verifiziert:** `bun test --coverage` ist in Bun 1.2.10 verfuegbar (text und lcov Reporter). Coverage-Gate optional.

## Architecture Patterns

### Test File Organization (Locked)
```
template/backend/src/
├── ai/
│   ├── module-integration.integration.test.ts  # TEST-01 (NEU)
│   ├── cost-guardrail.integration.test.ts      # TEST-03 (NEU)
│   ├── privacy.integration.test.ts             # TEST-04 (ERWEITERN)
│   ├── index.test.ts                           # Bestehend
│   ├── main-agent.test.ts                      # Bestehend
│   ├── cost-tracking.test.ts                   # Bestehend
│   └── privacy.test.ts                         # Bestehend
├── auth/
│   └── auth-flow.integration.test.ts           # TEST-02 (NEU)
```

### Pattern 1: Multi-Step Integration Test (TEST-01)
**What:** Verdrahtet Registry + AI System + Module Connector + Main Agent in einem Test
**When to use:** Wenn mehrere DI-basierte Systeme zusammen getestet werden
**Example:**
```typescript
// Aus bestehenden Tests abgeleitet
import { createModuleRegistry } from "../module-registry";
import { createAISystem, type AISystemDeps } from "./index";
import { containsSensitiveData } from "./privacy";

const testPlugin: ModulePlugin = {
  config: {
    name: "test-module",
    version: "1.0.0",
    permissions: {
      base: { read: "test:read", write: "test:write", update: "test:update", delete: "test:delete" },
    },
  },
  tools: {
    testTool: { _tool: true, execute: async () => ({ success: true, data: { id: "1" } }) },
  },
};

// 1. Registry aufbauen
const registry = createModuleRegistry();
registry.register(testPlugin);

// 2. AI System erstellen mit Registry
const system = await createAISystem({
  getRegisteredModules: () => registry.getAll(),
  checkModuleAccess: mock(async () => true),
  model: mockModel,
  // ... weitere Deps
});

// 3. Main Agent erstellen und Tools verifizieren
const agent = await system.createMainAgent("user-1", "tenant-1");
expect(agent.tools).toHaveProperty("testTool");
```

### Pattern 2: Auth Flow mit State-basiertem Mock (TEST-02)
**What:** verifyToken-Mock der verschiedene Token-Zustaende simuliert inkl. Cache
**When to use:** Wenn Mock-Verhalten pro Test-Szenario variieren muss
**Example:**
```typescript
// Cache-Simulation mit closure
const tokenCache = new Map<string, { usersId: string; usersEmail: string }>();
const verifyToken = mock(async (authHeader: string | undefined) => {
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  
  // Cache check
  if (tokenCache.has(token)) return tokenCache.get(token)!;
  
  // Token validation
  if (token === "valid-token") {
    const result = { usersId: "user-1", usersEmail: "user@test.com" };
    tokenCache.set(token, result);
    return result;
  }
  if (token === "expired-token") return null;
  return null; // malformed
});
```

### Pattern 3: Guardrail Enforcement via DI (TEST-03)
**What:** createCostGuardrailChecker mit Deps die Budget-Ueberschreitung simulieren
**When to use:** Wenn der Checker Tool-Ausfuehrung blockieren soll
**Example:**
```typescript
const checker = createCostGuardrailChecker({
  getConfig: mock(async () => DEFAULT_COST_GUARDRAILS),
  getDailyTotalUsd: mock(async () => 4.90), // Knapp unter Budget
  getModuleDailyUsd: mock(async () => 1.50),
});

// Dieser Call wuerde Budget sprengen (4.90 + 0.20 > 5.0)
const result = await checker.check("mail", 0.20);
expect(result.allowed).toBe(false);
expect(result.reason).toBe("DAILY_BUDGET_EXCEEDED");
```

### Anti-Patterns to Avoid
- **Echte DB/Netzwerk in Integration Tests:** DI-Mocks verwenden, keine echte Infrastruktur (D-01)
- **Separate test/ Ordner:** Tests gehoeren co-located neben die Source-Dateien (D-02)
- **AI SDK `streamText` aufrufen:** Den AI SDK Call mocken, nicht wirklich ausfuehren
- **privacy-integration.test.ts ueberschreiben:** Die bestehenden Tests erweitern, nicht ersetzen

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP Test Client | Eigenen Request-Builder | `app.request()` von Hono | Eingebaut, typ-sicher, kein Setup |
| Mock Functions | Eigenes Mock-Framework | `mock()` aus `bun:test` | Built-in, `.mock.calls` Zugriff, `.mockImplementation()` |
| Test Fixtures | Dynamische Factories | Feste Konstanten (UPPERCASE) | Einfacher, reproduzierbar, etabliertes Pattern |
| Coverage Reports | Eigenes Tool | `bun test --coverage` | Built-in seit Bun 1.0 |

## Common Pitfalls

### Pitfall 1: privacy-integration.test.ts existiert bereits
**What goes wrong:** Neue Tests ueberschreiben die bestehenden 7 Privacy-Integration-Tests
**Why it happens:** Datei existiert schon mit Tool-Response-Pattern-Tests
**How to avoid:** Bestehende Tests lesen und NEUE describe-Bloecke am Ende hinzufuegen
**Warning signs:** Test-Count sinkt nach Implementierung

### Pitfall 2: LanguageModel Mock unvollstaendig
**What goes wrong:** AI SDK erwartet bestimmte Properties auf dem Model-Objekt
**Why it happens:** `LanguageModel` ist ein komplexes Interface, Tests nutzen `as unknown as LanguageModel`
**How to avoid:** Gleiches Mock-Pattern wie in main-agent.test.ts: `{ modelId: "...", provider: "..." } as unknown as LanguageModel`
**Warning signs:** TypeScript-Fehler bei Model-Zuweisung

### Pitfall 3: Async Mock-Timing
**What goes wrong:** Mock-Implementierungen werden gesetzt NACHDEM der Test schon laeuft
**Why it happens:** `beforeEach` nicht korrekt genutzt, oder Mock nach erster Ausfuehrung geaendert
**How to avoid:** Alle Mocks in `beforeEach` initialisieren, `(mock as any).mockImplementation()` fuer Mid-Test-Aenderungen
**Warning signs:** Tests die intermittierend fehlschlagen

### Pitfall 4: CLAUDE.md Sections-Grenzen unklar
**What goes wrong:** Zu viel oder zu wenig aktualisiert, Formatierung bricht
**Why it happens:** CLAUDE.md ist 300+ Zeilen, Section-Grenzen sind nicht offensichtlich
**How to avoid:** Nur die drei Ziel-Sektionen editieren (Tech Stack, Status-Tabelle, Projektstruktur), Rest unberuehrt lassen
**Warning signs:** Diff zeigt Aenderungen ausserhalb der drei Sektionen

### Pitfall 5: Module Registry Valibot Validation in Tests
**What goes wrong:** Test-Plugin wird von der Valibot-Validation rejected weil Pflichtfelder fehlen
**Why it happens:** Phase 1 hat Plugin-Validation (TYPE-03) eingefuehrt -- alle Test-Plugins brauchen vollstaendige Struktur
**How to avoid:** Immer vollstaendiges `ModulePlugin` mit allen Pflichtfeldern verwenden (siehe `module-registry.test.ts` Fixtures)
**Warning signs:** `Invalid plugin structure` Error in Tests

## Code Examples

### Bestehender Mock-Pattern (aus main-agent.test.ts)
```typescript
// Source: template/backend/src/ai/main-agent.test.ts
import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { LanguageModel } from "ai";

const mockModel = {
  modelId: "claude-sonnet-4-5",
  provider: "anthropic",
} as unknown as LanguageModel;

let defaultDeps: MainAgentDeps;

beforeEach(() => {
  defaultDeps = {
    loadModuleTools: mock(async () => ({ mockTool: { _tool: true } })),
    loadSubAgents: mock(async () => ({ mockAgent: { _agent: true } })),
    createDynamicAgentTool: mock(() => ({ _dynamic: true })),
    model: mockModel,
    logAICost: mock(async () => {}),
    logAgentStep: mock(async () => {}),
    isDebugEnabled: mock(async () => false),
  };
});
```

### Bestehender Hono Test-Pattern (aus module-auth-middleware.test.ts)
```typescript
// Source: template/backend/src/auth/module-auth-middleware.test.ts
import { Hono } from "hono";

let app: Hono;
beforeEach(() => {
  app = new Hono();
  const middleware = createModuleAuthMiddleware(deps);
  app.use("/api/v1/mail/*", middleware);
  app.get("/api/v1/mail/inbox", (c) => c.json({ messages: [] }));
});

it("should return 401 when no token is provided", async () => {
  const res = await app.request("/api/v1/mail/inbox", { method: "GET" });
  expect(res.status).toBe(401);
});
```

### Bestehender Plugin-Fixture (aus module-registry.test.ts)
```typescript
// Source: template/backend/src/module-registry.test.ts
const mailConfig: ModuleConfig = {
  name: "mail",
  version: "1.0.0",
  permissions: {
    base: { read: "mail:read", write: "mail:write", update: "mail:update", delete: "mail:delete" },
    custom: { send: "mail:send" },
  },
  guardrails: { "mail:send": { dailyLimit: 50 } },
};

const mailPlugin: ModulePlugin = {
  config: mailConfig,
  schema: { mailAccounts: { _table: true } },
  routes: (app: any) => { app.get("/inbox", () => "inbox"); },
  jobs: [{ type: "mail:process", handler: async () => {} }],
  tools: { sendMail: { _tool: true }, searchMail: { _tool: true } },
};
```

### Cost Guardrail Checker Test-Pattern
```typescript
// Source: template/backend/src/ai/cost-guardrails.ts
import { createCostGuardrailChecker, DEFAULT_COST_GUARDRAILS } from "./cost-guardrails";

const checker = createCostGuardrailChecker({
  getConfig: mock(async () => DEFAULT_COST_GUARDRAILS),
  getDailyTotalUsd: mock(async () => 0),
  getModuleDailyUsd: mock(async () => 0),
});

const result = await checker.check("mail", 0.01);
expect(result.allowed).toBe(true);
```

## Discretion Recommendations

### Coverage Gate: NICHT einfuehren
**Empfehlung:** `bun test --coverage` ist verfuegbar aber kein Gate setzen. Grund: Die vier neuen Tests decken spezifische kritische Pfade ab. Coverage-Prozentsaetze sind bei einer Codebase mit 60+ Sub-Submodule-Tests irrelevant. Stattdessen: Die Tests muessen gruen sein, das reicht.

### Gemeinsame Test-Utils: JA, erstellen
**Empfehlung:** Eine `template/backend/src/ai/test-utils.ts` Datei mit wiederverwendbaren Fixtures. Drei der vier Tests (TEST-01, TEST-03, TEST-04) brauchen das gleiche Plugin-Fixture und LanguageModel-Mock. Vermeidet Copy-Paste und erleichtert zukuenftige Tests.

Inhalt:
- `createMockModel()` -- LanguageModel Mock
- `createTestPlugin(overrides?)` -- Valides ModulePlugin mit Defaults
- `createMockAISystemDeps(overrides?)` -- AISystemDeps mit Mock-Defaults

### Reihenfolge: Bottom-up
**Empfehlung:**
1. test-utils.ts (gemeinsame Fixtures)
2. TEST-03 Cost Guardrail (einfachster Test, nur Checker)
3. TEST-04 Privacy (Erweiterung bestehender Datei)
4. TEST-02 Auth Flow (Hono Middleware, eigenstaendig)
5. TEST-01 E2E Module Integration (komplexester Test, braucht alles)
6. CON-03 CLAUDE.md Update (kein Code, nur Dokumentation)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (Bun 1.2.10 built-in) |
| Config file | Keine separate Config -- Bun entdeckt `*.test.ts` automatisch |
| Quick run command | `cd template/backend && bun test src/ai/module-integration.integration.test.ts` |
| Full suite command | `cd template/backend && bun test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | Registry -> Agent -> Tool -> Permission E2E Flow | integration | `cd template/backend && bun test src/ai/module-integration.integration.test.ts` | Wave 0 |
| TEST-02 | Hanko Auth: valid/expired/cached/malformed token | integration | `cd template/backend && bun test src/auth/auth-flow.integration.test.ts` | Wave 0 |
| TEST-03 | Cost Guardrail blockiert bei Budget-Ueberschreitung | integration | `cd template/backend && bun test src/ai/cost-guardrail.integration.test.ts` | Wave 0 |
| TEST-04 | Privacy: LLM-Kontext nur maskierte Daten | integration | `cd template/backend && bun test src/ai/privacy.integration.test.ts` | Existiert (erweitern) |
| CON-03 | CLAUDE.md spiegelt Code-Stand | manual-only | Manueller Diff-Review gegen package.json/Codebase | N/A |

### Sampling Rate
- **Per task commit:** `cd template/backend && bun test [geaenderte-test-datei]`
- **Per wave merge:** `cd template/backend && bun test`
- **Phase gate:** Full suite green (71 bestehende + neue Tests)

### Wave 0 Gaps
- [ ] `template/backend/src/ai/test-utils.ts` -- Gemeinsame Test-Fixtures und Mocks
- [ ] `template/backend/src/ai/module-integration.integration.test.ts` -- TEST-01
- [ ] `template/backend/src/auth/auth-flow.integration.test.ts` -- TEST-02
- [ ] `template/backend/src/ai/cost-guardrail.integration.test.ts` -- TEST-03

Keine Framework-Installation noetig -- alles in Bun built-in.

## Project Constraints (from CLAUDE.md)

- **Validation:** Valibot (NICHT Zod!) -- betrifft Plugin-Validation in Tests
- **ORM:** Drizzle ORM -- nicht direkt relevant da Tests DB mocken
- **Test Runner:** Bun built-in (bun:test) -- keine externe Runner
- **Naming:** `[name].test.ts` (nie `.spec.ts`), Integration: `[name].integration.test.ts`
- **Co-location:** Tests neben Source-Dateien
- **Comments:** Deutsch erlaubt fuer Business-Logik-Erklaerungen
- **Variables/Functions:** Englisch
- **Commit Messages:** Englisch, conventional commits
- **Framework:** Sub-Submodule, nicht direkt aenderbar
- **GSD Workflow:** Aenderungen nur ueber GSD-Workflow

## Sources

### Primary (HIGH confidence)
- Bestehende Test-Dateien im Repo (7 Dateien, 71 Tests) -- direkt gelesen und verifiziert
- `template/backend/src/ai/` Source-Dateien -- alle vier Zielsysteme analysiert
- `.planning/codebase/TESTING.md` -- Test-Patterns und Conventions
- `.planning/codebase/CONCERNS.md` -- Test Coverage Gaps Sektion
- Bun 1.2.10 CLI `--help` Output -- Coverage-Support bestaetigt

### Secondary (MEDIUM confidence)
- `.planning/phases/05-test-coverage-documentation/05-CONTEXT.md` -- User-Entscheidungen

### Tertiary (LOW confidence)
None -- alle Informationen stammen aus dem Repo selbst.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Bun 1.2.10 bereits im Einsatz, 71 gruene Tests als Beweis
- Architecture: HIGH -- Alle Patterns direkt aus bestehenden Tests abgeleitet
- Pitfalls: HIGH -- Aus tatsaechlichem Code-Review identifiziert (z.B. Valibot-Validation, existierende privacy-integration.test.ts)

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stabil -- Bun test API aendert sich selten)
