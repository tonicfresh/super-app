# Phase 1: Type Safety & Consistency - Research

**Researched:** 2026-04-03
**Domain:** TypeScript type safety, Valibot validation, Drizzle ORM schema conventions, package version management
**Confidence:** HIGH

## Summary

Phase 1 ist eine reine Code-Qualitaetsphase ohne neue Features. Alle Aenderungen betreffen existierende Dateien: `as any` Eliminierung, LanguageModel-Typ-Definition, Plugin-Validierung, Package-Version-Sync und Schema-Prefix-Enforcement. Die Codebase hat bereits alle noetige Infrastruktur (Valibot, Drizzle pgTableCreator, @super-app/shared als Type-Hub) — es fehlt nur die konsequente Nutzung.

Kritisch: Die Vercel AI SDK v6 exportiert `LanguageModel` als Union-Typ (`string | LanguageModelV3 | LanguageModelV2`). Die `LanguageModelV3`-Schnittstelle hat nativ `provider: string` und `modelId: string` als readonly Properties. Das bedeutet: ein `LanguageModelWithMeta`-Wrapper ist nur noetig um den Union-Typ auf die Objekt-Variante einzuschraenken — nicht um fehlende Properties zu ergaenzen.

**Primary recommendation:** Zuerst LanguageModel-Typen in shared definieren (blockiert 6 von 11 `as any` Fixes), dann alle `as any` eliminieren, dann Validierung/Konsistenz.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `LanguageModel` aus `"ai"` (Vercel AI SDK) in `@super-app/shared` re-exportieren. Zusaetzlich `LanguageModelWithMeta` Interface erstellen das `.provider` (string) und `.modelId` (string) als typisierte Properties exponiert — eliminiert die `(model as any).provider` Casts in main-agent.ts und sub-agent.ts.
- **D-02:** Kein eigenes Custom-Interface erfinden — die AI SDK hat den kanonischen Typ. Nur die fehlenden Meta-Properties ergaenzen die das SDK nicht abdeckt.
- **D-03:** Scope = nur Produktionscode. Test-Dateien (*.test.ts) die `as any` fuer Mock-Injection nutzen sind akzeptables TypeScript-Pattern und bleiben unveraendert.
- **D-04:** Framework-Code (template/backend/framework/) ist nicht aenderbar (Sub-Submodule). Nur Super-App-eigener Code wird bereinigt.
- **D-05:** Konkrete `as any` Targets im Produktionscode (14 Dateien, siehe CONTEXT.md D-05 fuer vollstaendige Liste).
- **D-06:** Plugin-Validation mit Valibot-Schema in `register()` implementieren. Fail fast bei fehlenden/fehlerhaften Exports.
- **D-07:** Validation-Schema in `@super-app/shared` definieren.
- **D-08:** 6 Package-Version-Mismatches beheben (drizzle-orm, hono, nanoid, pg, prettier, typescript).
- **D-09:** Validierungsscript fuer gemeinsame Dependencies erstellen.
- **D-10:** `push_*` Prefix zu `app_*` umbenennen mit Migration.
- **D-11:** `mc_*` in `template/backend/src/ai/db/schema.ts` bleibt — idealerweise ins mission-control Modul verschieben.
- **D-12:** Validierungstest fuer Schema-Prefix-Konventionen erstellen.

### Claude's Discretion
- Reihenfolge der Fixes innerhalb des Plans
- Konkrete Valibot-Schema-Felder fuer Plugin-Validation
- Ob Version-Sync als Test oder als Standalone-Script implementiert wird
- Migration-Strategie fuer push_* → app_* Rename (ALTER TABLE vs. neue Migration)

### Deferred Ideas (OUT OF SCOPE)
None — Analyse blieb innerhalb des Phase-Scopes.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TYPE-01 | LanguageModel Interface in @super-app/shared definieren und exportieren | LanguageModelV3 hat nativ `provider` und `modelId`. Re-Export aus "ai" + LanguageModelWithMeta als `Pick<LanguageModelV3, 'provider' | 'modelId'>` plus LanguageModel-Faehigkeit. Existierende shared/src/types.ts ist der richtige Ort. |
| TYPE-02 | Alle 11+ `as any` Assertions durch korrekte Typen ersetzen | Vollstaendige Inventur aller `as any` in Produktionscode abgeschlossen (14 Stellen in 10 Dateien). Loesungsansatz pro Stelle dokumentiert. |
| TYPE-03 | Module Registry Plugin-Validation bei Registrierung | `createModuleRegistry()` in module-registry.ts hat bereits `register()` Methode. Valibot-Schema fuer ModulePlugin erstellen, in register() aufrufen. Existierendes ModulePlugin-Interface als Vorlage. |
| CON-01 | Backend/Frontend package.json Versionen synchronisieren | 6 Mismatches verifiziert (drizzle-orm, hono, nanoid, pg, prettier, typescript). Frontend hat neuere Versionen. |
| CON-02 | Drizzle Schema Table-Prefix Enforcement validieren | push_subscriptions.schema.ts verwendet `push_*` statt `app_*` — ist App-Level-Code. mc_* in ai/db/schema.ts ist korrekt (Mission Control Domain). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Valibot | 1.3.1 | Schema validation fuer Plugin-Validation und Input-Checks | Projekt-Standard (NICHT Zod), bereits in @super-app/shared und Backend |
| Vercel AI SDK | 6.0.143 | LanguageModel Typ-Export, streamText Config-Typen | Bereits im Projekt, kanonische LanguageModel-Definition |
| Drizzle ORM | 0.44.6→0.45.2 | Schema-Definitionen, pgTableCreator | Projekt-Standard, Upgrade als Teil CON-01 |
| TypeScript | 5.9.3 | Strenge Typ-Pruefung, tsc --noEmit | Projekt-Standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-kit | 0.31.10 | Migration-Generierung fuer push_* → app_* Rename | CON-02 Schema-Prefix-Fix |
| Bun Test | 1.2.10 (built-in) | Test-Runner fuer Validierungstests | TYPE-03, CON-01, CON-02 Tests |

**Installation:**
Keine neuen Packages noetig. Nur Version-Updates in bestehenden package.json Dateien.

## Architecture Patterns

### Betroffene Projektstruktur
```
shared/src/
├── types.ts              # LanguageModelWithMeta + ModulePluginSchema hinzufuegen
template/backend/src/
├── module-registry.ts    # Valibot-Validation in register()
├── index.ts              # model: null as any → typed null
├── ai/
│   ├── index.ts          # streamText config cast
│   ├── main-agent.ts     # model.provider/modelId casts
│   ├── sub-agent.ts      # model.provider/modelId casts (2x)
│   ├── routes/settings.ts # TaskType cast
│   ├── channels/api.ts   # ChatRouteDeps.streamText model: any
│   └── db/schema.ts      # mc_* prefix (move candidate)
├── auth/module-auth-middleware.ts  # JSON/JWT casts
├── db/push-subscriptions.schema.ts # push_* → app_* rename
template/frontend/src/
├── utils/fetcher.ts      # response.text() as any (6x)
├── i18n.ts               # module import cast
├── volt/utils.ts         # PrimeVue passthrough cast
modules/
├── mission-control/backend/src/routes/audit.ts  # query cast
├── mission-control/backend/src/routes/logs.ts   # query cast
├── todos/backend/src/index.ts     # stub return casts
├── todos/backend/src/routes/index.ts  # stub return cast
```

### Pattern 1: LanguageModelWithMeta Type Guard
**What:** Typ-Narrowing von `LanguageModel` (Union: string | V3 | V2) auf die Objekt-Variante mit provider/modelId
**When to use:** Ueberall wo `.provider` oder `.modelId` auf einem model-Objekt zugegriffen wird
**Example:**
```typescript
// shared/src/types.ts
import type { LanguageModel as AILanguageModel } from "ai";
import type { LanguageModelV3 } from "@ai-sdk/provider";

/** Re-Export des kanonischen LanguageModel Typs */
export type { AILanguageModel as LanguageModel };

/**
 * LanguageModel mit garantierten Meta-Properties.
 * Nutze diesen Typ wenn .provider und .modelId benoetigt werden.
 * LanguageModelV3 hat diese Properties nativ.
 */
export type LanguageModelWithMeta = LanguageModelV3;

/** Type Guard: Prueft ob ein LanguageModel Meta-Properties hat */
export function isLanguageModelWithMeta(
  model: AILanguageModel
): model is LanguageModelWithMeta {
  return (
    typeof model === "object" &&
    model !== null &&
    "provider" in model &&
    "modelId" in model
  );
}
```

### Pattern 2: Valibot Plugin Validation Schema
**What:** Runtime-Validation fuer ModulePlugin bei Registry-Registrierung
**When to use:** In `register()` Methode von module-registry.ts
**Example:**
```typescript
// shared/src/types.ts (ergaenzen)
import * as v from "valibot";

export const ModulePluginSchema = v.object({
  config: v.object({
    name: v.pipe(v.string(), v.minLength(1)),
    version: v.pipe(v.string(), v.minLength(1)),
    permissions: v.object({
      base: v.object({
        read: v.string(),
        write: v.string(),
        update: v.string(),
        delete: v.string(),
      }),
      custom: v.optional(v.record(v.string(), v.string())),
    }),
    guardrails: v.optional(v.record(v.string(), v.any())),
  }),
  schema: v.optional(v.record(v.string(), v.unknown())),
  routes: v.optional(v.function()),
  jobs: v.optional(v.array(v.object({
    type: v.string(),
    handler: v.any(),
  }))),
  tools: v.optional(v.record(v.string(), v.unknown())),
});
```

### Pattern 3: Generic Fetcher (Frontend `as any` Fix)
**What:** Generischer Return-Typ mit Conditional Type statt `as any`
**When to use:** fetcher.ts Methoden die `returnAsText` Parameter haben
**Example:**
```typescript
async get<T = unknown>(url: string, returnAsText?: false): Promise<T>;
async get(url: string, returnAsText: true): Promise<string>;
async get<T = unknown>(url: string, returnAsText = false): Promise<T | string> {
  // ... fetch logic ...
  if (returnAsText) {
    return response.text();
  }
  return response.json();
}
```

### Anti-Patterns to Avoid
- **`as any` fuer Type Narrowing:** Stattdessen Type Guards oder explizite Interface-Casts verwenden
- **Valibot im Hot Path:** Plugin-Validation nur bei Registrierung (Startup), nie bei jedem Request
- **Framework-Code aendern:** template/backend/framework/ ist Sub-Submodule — nur Super-App-Code aendern

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LanguageModel Typ | Eigenes Interface mit provider/modelId | `LanguageModelV3` aus `@ai-sdk/provider` | SDK hat die Properties nativ, V3 ist die aktuelle Version |
| Schema Validation | Manuelles if/throw Checking | Valibot `v.parse(schema, value)` | Projekt-Standard, bessere Fehlermeldungen, wiederverwendbar |
| Version-Sync Check | Shell-Script mit jq | Bun-Script das beide package.json parsed und vergleicht | Type-safe, laeuft in bestehendem Bun-Ecosystem |
| DB Migration | Manuelles SQL | `drizzle-kit generate` nach Schema-Aenderung | Konsistent mit bestehendem Workflow |

## Common Pitfalls

### Pitfall 1: LanguageModel Union-Typ vs. Objekt-Typ
**What goes wrong:** `LanguageModel` in AI SDK v6 ist `string | LanguageModelV3 | LanguageModelV2`. Direkter Zugriff auf `.provider` schlaegt auf dem String-Fall fehl.
**Why it happens:** AI SDK erlaubt String-Model-IDs ("anthropic:claude-sonnet-4-5") als Shorthand.
**How to avoid:** `LanguageModelWithMeta` als eigener Typ fuer Stellen die Meta-Properties brauchen. Type Guard `isLanguageModelWithMeta()` fuer Runtime-Checks.
**Warning signs:** TypeScript-Fehler "Property 'provider' does not exist on type 'string'".

### Pitfall 2: streamText Config Cast
**What goes wrong:** `streamText(config as any)` in ai/index.ts — der Cast versteckt dass `ChatRouteDeps.streamText` den `model` Parameter als `any` typisiert.
**Why it happens:** Die ChatRouteDeps-Schnittstelle in channels/api.ts hat `model: any` statt `LanguageModel`.
**How to avoid:** Zuerst ChatRouteDeps.streamText mit korrektem LanguageModel-Typ aktualisieren, dann wird der Cast in ai/index.ts ueberfluessig.
**Warning signs:** Typ-Fehler erst zur Laufzeit statt beim Kompilieren.

### Pitfall 3: push_* → app_* Migration mit Datenverlust
**What goes wrong:** ALTER TABLE RENAME in einer neuen Drizzle-Migration koennte mit bestehenden push_subscriptions kollidieren.
**Why it happens:** Drizzle-Kit erkennt den Rename nicht automatisch und generiert DROP + CREATE.
**How to avoid:** Manuell ALTER TABLE SQL in die Migration schreiben ODER pruefen ob Tabelle bereits existiert. Am sichersten: `ALTER TABLE push_subscriptions RENAME TO app_subscriptions` direkt.
**Warning signs:** `drizzle-kit generate` erzeugt DROP TABLE statt RENAME.

### Pitfall 4: Package-Version-Upgrade Breaking Changes
**What goes wrong:** drizzle-orm 0.44.6 → 0.45.2 oder hono 4.10.1 → 4.12.10 koennte Breaking Changes enthalten.
**Why it happens:** Auch Minor-Version-Updates koennen API-Aenderungen in schnell-entwickelten Paketen haben.
**How to avoid:** Nach Version-Bump `bun test` und `bun run dev` ausfuehren, alle Tests muessen gruen bleiben.
**Warning signs:** Import-Fehler oder geaenderte Funktionssignaturen nach Update.

### Pitfall 5: mc_* Schema-Verschiebung und Circular Dependencies
**What goes wrong:** `template/backend/src/ai/db/schema.ts` mit `mc_*` Prefix ins mission-control Modul verschieben koennte Circular Dependencies erzeugen.
**Why it happens:** App-Level-Code (ai/index.ts) importiert das Schema direkt. Wenn es im Modul liegt, muesste der App-Level das Modul importieren.
**How to avoid:** Schema-Verschiebung separat evaluieren. Wenn Circular Dependencies drohen, mc_* im App-Level belassen und nur mit Kommentar dokumentieren warum.
**Warning signs:** Bun-Startup-Fehler mit "Cannot access before initialization".

## Code Examples

### Fix: main-agent.ts / sub-agent.ts Provider Extraction
```typescript
// VORHER:
const modelProvider =
  typeof model === "object" && model !== null && "provider" in model
    ? (model as any).provider
    : "unknown";

// NACHHER (mit importiertem Type Guard):
import { isLanguageModelWithMeta } from "@super-app/shared";

const modelProvider = isLanguageModelWithMeta(model)
  ? model.provider
  : "unknown";
const modelId = isLanguageModelWithMeta(model)
  ? model.modelId
  : "unknown";
```

### Fix: module-auth-middleware.ts JWT/Hanko Casts
```typescript
// VORHER:
const data = (await res.json()) as any;
const decoded = jwtlib.verify(token, JWT_PUBLIC_KEY) as any;

// NACHHER:
interface HankoValidateResponse {
  is_valid: boolean;
  user_id?: string;
  claims?: {
    subject?: string;
    email?: { address?: string };
  };
}
const data: HankoValidateResponse = await res.json();

interface JWTPayload {
  sub?: string;
  email?: string;
}
const decoded = jwtlib.verify(token, JWT_PUBLIC_KEY) as JWTPayload;
```

### Fix: ai/routes/settings.ts TaskType Cast
```typescript
// VORHER:
if (!TASK_TYPES.includes(taskType as any)) {

// NACHHER:
if (!(TASK_TYPES as readonly string[]).includes(taskType)) {
// ODER:
import type { TaskType } from "../providers";
const isValidTaskType = (t: string): t is TaskType =>
  (TASK_TYPES as readonly string[]).includes(t);
if (!isValidTaskType(taskType)) {
```

### Fix: mission-control audit/logs Query Cast
```typescript
// VORHER:
const result = c.req.query("result") as any;

// NACHHER:
type AuditResult = "success" | "failure" | "error" | undefined;
const resultParam = c.req.query("result");
const result: AuditResult = resultParam &&
  ["success", "failure", "error"].includes(resultParam)
    ? resultParam as AuditResult
    : undefined;
```

### Fix: index.ts Model Null
```typescript
// VORHER:
model: null as any,

// NACHHER:
import type { LanguageModel } from "@super-app/shared";
model: null as unknown as LanguageModel,
// Oder besser: model als optional in AISystemDeps definieren (model?: LanguageModel)
```

### Fix: todos Stub Returns
```typescript
// VORHER:
create: async (input) => ({ id: crypto.randomUUID(), ...input } as any),

// NACHHER (mit explizitem Typ):
import type { InferSelectModel } from "drizzle-orm";
import { todosItems } from "./db/schema";
type TodoItem = InferSelectModel<typeof todosItems>;

create: async (input): Promise<TodoItem> => ({
  id: crypto.randomUUID(),
  ...input,
  // Fehlende Pflichtfelder explizit setzen
  createdAt: new Date(),
  updatedAt: new Date(),
  // ... weitere Defaults
} as TodoItem),
```

### Version-Sync Validierungsscript
```typescript
// scripts/check-version-sync.ts
import backendPkg from "../template/backend/package.json";
import frontendPkg from "../template/frontend/package.json";

const backendDeps = { ...backendPkg.dependencies, ...backendPkg.devDependencies };
const frontendDeps = { ...frontendPkg.dependencies, ...frontendPkg.devDependencies };

const mismatches: string[] = [];
for (const [name, beVersion] of Object.entries(backendDeps)) {
  const feVersion = frontendDeps[name];
  if (feVersion && beVersion !== feVersion) {
    mismatches.push(`${name}: BE=${beVersion} FE=${feVersion}`);
  }
}

if (mismatches.length > 0) {
  console.error("Version mismatches found:");
  mismatches.forEach(m => console.error(`  ${m}`));
  process.exit(1);
}
console.log("All shared dependency versions are in sync.");
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LanguageModelV2 | LanguageModelV3 | AI SDK v6 | V3 hat provider/modelId nativ, V2 auch aber aelteres Interface |
| Zod validation | Valibot validation | Projekt-Entscheidung | Projekt-Standard, bereits in shared/types.ts genutzt |
| Manual plugin checks | Schema-based validation | This phase | Fail-fast bei fehlerhaften Plugin-Exports |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun Test (built-in, v1.2.10) |
| Config file | Kein separates Config-File, Bun Test nutzt Defaults |
| Quick run command | `cd template/backend && bun test --bail` |
| Full suite command | `cd template/backend && bun test && cd ../../modules/mission-control/backend && bun test && cd ../../../modules/todos/backend && bun test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TYPE-01 | LanguageModelWithMeta re-exported from shared, type guard works | unit | `cd shared && bun test src/types.test.ts` | Exists (erweitern) |
| TYPE-02 | Kein `as any` in Produktionscode (grep-basiert) | smoke | `grep -r "as any" template/backend/src template/frontend/src modules/*/backend/src modules/*/frontend/src --include="*.ts" --include="*.vue" --exclude="*.test.ts" --exclude="*.d.ts" \| wc -l` | Wave 0 |
| TYPE-03 | Registry wirft bei ungueltigem Plugin | unit | `cd template/backend && bun test src/module-registry.test.ts` | Exists (erweitern) |
| CON-01 | Keine Version-Mismatches zwischen BE/FE | smoke | `bun run scripts/check-version-sync.ts` | Wave 0 |
| CON-02 | Alle Schema-Prefixes folgen Konvention | unit | `bun test src/db/schema-prefix.test.ts` (neu) | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd template/backend && bun test --bail`
- **Per wave merge:** Full suite (backend + modules + shared)
- **Phase gate:** Full suite green + `as any` grep returns 0 in production code

### Wave 0 Gaps
- [ ] `scripts/check-version-sync.ts` — covers CON-01 (neues Script)
- [ ] `template/backend/src/db/schema-prefix.test.ts` — covers CON-02 (neuer Test)
- [ ] `shared/src/types.test.ts` — erweitern fuer LanguageModelWithMeta + ModulePluginSchema Tests
- [ ] `template/backend/src/module-registry.test.ts` — erweitern fuer Plugin-Validation-Rejection Tests

## Open Questions

1. **mc_* Schema-Verschiebung: Machbar ohne Circular Dependencies?**
   - Was wir wissen: `template/backend/src/ai/db/schema.ts` definiert `mc_ai_costs` und `mc_agent_sessions` mit `mc_*` Prefix. Wird von `template/backend/src/ai/cost-tracking.ts` und anderen AI-Dateien importiert.
   - Was unklar ist: Ob mission-control/backend als Modul seine eigenen Schema-Exporte bereitstellen kann, ohne dass App-Level-Code das Modul importieren muss.
   - Recommendation: Erst evaluieren (Import-Chain checken), dann entscheiden. Nicht in Wave 1 erzwingen.

2. **push_* → app_* Migration: ALTER TABLE oder neue Tabelle?**
   - Was wir wissen: `push_subscriptions` ist die einzige Tabelle mit `push_*` Prefix. Drizzle-Kit generiert bei Rename wahrscheinlich DROP+CREATE.
   - Recommendation: Handgeschriebenes `ALTER TABLE push_subscriptions RENAME TO app_subscriptions;` SQL als Custom-Migration. Sicherer als automatisch generiert.

3. **Frontend-seitige `as any` in Vue-Komponenten**
   - Was wir wissen: `modules/todos/frontend/src/views/TodoList.vue:68` und `TodoDetail.vue:76-77` haben `as any` Casts.
   - Was unklar ist: Ob diese im Scope von TYPE-02 liegen (CONTEXT.md listet sie nicht explizit).
   - Recommendation: In Wave 2 mit aufnehmen wenn Zeit, aber nicht Phase-blockierend.

## Sources

### Primary (HIGH confidence)
- Vercel AI SDK v6 Typdefinitionen — `template/backend/node_modules/ai/dist/index.d.ts` und `@ai-sdk/provider/dist/index.d.ts` — LanguageModel Union-Typ, LanguageModelV3 mit provider/modelId
- Existierender Code — `shared/src/types.ts`, `template/backend/src/module-registry.ts`, alle `as any` Stellen direkt inspiziert
- package.json Dateien — Backend und Frontend Version-Mismatches verifiziert

### Secondary (MEDIUM confidence)
- Drizzle ORM Migration-Verhalten bei Table-Rename (basierend auf bekanntem Verhalten: generiert DROP+CREATE statt RENAME)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Alle Libraries bereits im Projekt, Versionen direkt in node_modules verifiziert
- Architecture: HIGH - Alle betroffenen Dateien gelesen, genaue Zeilennummern und Loesungsansaetze bekannt
- Pitfalls: HIGH - LanguageModel Union-Typ direkt in .d.ts verifiziert, Drizzle-Migration-Verhalten aus Erfahrung

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stabile Dependencies, keine schnellen Aenderungen erwartet)
