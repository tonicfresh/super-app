# Phase 1: Type Safety & Consistency - Context

**Gathered:** 2026-04-03 (assumptions mode — user deferred all decisions to Claude)
**Status:** Ready for planning

<domain>
## Phase Boundary

Die Codebase hat saubere Typen, keine `as any` Escapes in Produktionscode, konsistente Package-Versionen zwischen Backend/Frontend, und validierte Schema-Prefixes. Kein neuer Feature-Code — nur Typisierung, Konsistenz und Validierung.

</domain>

<decisions>
## Implementation Decisions

### LanguageModel Type (TYPE-01)
- **D-01:** `LanguageModel` aus `"ai"` (Vercel AI SDK) in `@super-app/shared` re-exportieren. Zusaetzlich `LanguageModelWithMeta` Interface erstellen das `.provider` (string) und `.modelId` (string) als typisierte Properties exponiert — eliminiert die `(model as any).provider` Casts in main-agent.ts und sub-agent.ts.
- **D-02:** Kein eigenes Custom-Interface erfinden — die AI SDK hat den kanonischen Typ. Nur die fehlenden Meta-Properties ergaenzen die das SDK nicht abdeckt.

### `as any` Elimination (TYPE-02)
- **D-03:** Scope = nur Produktionscode. Test-Dateien (*.test.ts) die `as any` fuer Mock-Injection nutzen sind akzeptables TypeScript-Pattern und bleiben unveraendert.
- **D-04:** Framework-Code (template/backend/framework/) ist nicht aenderbar (Sub-Submodule). Nur Super-App-eigener Code wird bereinigt.
- **D-05:** Konkrete Targets im Produktionscode:
  - `template/backend/src/ai/main-agent.ts` — 2x `(model as any).provider/.modelId` → LanguageModelWithMeta
  - `template/backend/src/ai/sub-agent.ts` — 4x gleich → LanguageModelWithMeta
  - `template/backend/src/ai/index.ts` — 1x `streamText(config as any)` → korrekter StreamText-Config-Typ
  - `template/backend/src/index.ts` — 1x `model: null as any` → `model: null as LanguageModel | null`
  - `template/backend/src/auth/module-auth-middleware.ts` — 2x JSON/JWT casts → typed response/decoded
  - `template/backend/src/ai/routes/settings.ts` — 1x TaskType cast → proper union type
  - `template/frontend/src/utils/fetcher.ts` — 6x `response.text() as any` → generische Typisierung
  - `template/frontend/src/i18n.ts` — 1x → typed module import
  - `template/frontend/src/volt/utils.ts` — 1x → proper PT types (PrimeVue passthrough)
  - `modules/mission-control/backend/src/routes/audit.ts` — 1x query cast → typed enum
  - `modules/mission-control/backend/src/routes/logs.ts` — 1x query cast → typed enum
  - `modules/todos/backend/src/index.ts` — 2x stub returns → proper return types
  - `modules/todos/backend/src/routes/index.ts` — 1x stub return → proper type

### Module Registry Validation (TYPE-03)
- **D-06:** Plugin-Validation mit Valibot-Schema in `register()` implementieren. Bei fehlenden oder fehlerhaften Exports sofort mit beschreibendem Error abbrechen (fail fast). Schema validiert: config.name (string), config.permissions (string[]), schema (object), routes (function), tools (object).
- **D-07:** Validation-Schema in `@super-app/shared` definieren, damit Module es auch fuer Selbsttests nutzen koennen.

### Package-Version Sync (CON-01)
- **D-08:** Folgende 6 Mismatches beheben — Backend-Versionen auf Frontend anheben (Frontend hat neuere Versionen):
  - drizzle-orm: BE 0.44.6 → ^0.45.2
  - hono: BE 4.10.1 → ^4.12.10
  - nanoid: BE 5.1.6 → ^5.1.7
  - pg: BE 8.16.3 → ^8.20.0
  - prettier: Auf einheitliche Version (3.8.1) fuer beide
  - typescript: Auf einheitliche Pinning-Strategie (^5.9.3)
- **D-09:** Validierungsscript erstellen das gemeinsame Dependencies vergleicht — laeuft als Test oder pre-commit Check.

### Schema-Prefix Enforcement (CON-02)
- **D-10:** `push_*` Prefix in `template/backend/src/db/push-subscriptions.schema.ts` zu `app_*` umbenennen — ist App-Level-Code, kein eigenstaendiges Modul. Migration-Script fuer bestehende Tabellen.
- **D-11:** `mc_*` in `template/backend/src/ai/db/schema.ts` bleibt — gehoert logisch zum Mission-Control-Domain, auch wenn die Datei im App-Level liegt. Idealfall: diese Schema-Datei ins mission-control Modul verschieben (wenn moeglich ohne Circular Dependencies).
- **D-12:** Validierungstest erstellen der alle Schema-Dateien scannt und Prefix-Konventionen prueft: Framework = `base_*`, App = `app_*`, Module = `<moduleName>_*`.

### Claude's Discretion
- Reihenfolge der Fixes innerhalb des Plans (z.B. LanguageModel zuerst weil viele `as any` davon abhaengen)
- Konkrete Valibot-Schema-Felder fuer Plugin-Validation
- Ob Version-Sync als Test oder als Standalone-Script implementiert wird
- Migration-Strategie fuer push_* → app_* Rename (ALTER TABLE vs. neue Migration)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architektur-Specs
- `docs/superpowers/specs/2026-04-02-super-app-architecture-design.md` — Gesamtarchitektur, Dual-Mode-Pattern, Table-Prefix-Konvention
- `docs/superpowers/plans/2026-04-02-phase1-shared-core.md` — Original Phase-1-Plan (Shared Core Types)

### Codebase-Analyse
- `.planning/codebase/CONCERNS.md` — Tech Debt Liste, `as any` Instances, Schema-Prefix-Probleme
- `.planning/codebase/CONVENTIONS.md` — Naming Patterns, Type Conventions, Validation (Valibot)
- `.planning/codebase/STACK.md` — Tech Stack mit Versionen

### Requirements
- `.planning/REQUIREMENTS.md` — TYPE-01, TYPE-02, TYPE-03, CON-01, CON-02 Definitionen

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `shared/src/types.ts` — Bereits ModulePlugin, ModuleConfig, ToolResult, GuardrailConfig definiert. LanguageModelWithMeta gehoert hierhin.
- `template/backend/src/module-registry.ts` — createModuleRegistry() existiert, register() braucht nur Validation-Layer
- `@hono/valibot-validator` — Bereits als Dependency, Valibot-Patterns etabliert

### Established Patterns
- **Dependency Injection**: `createUse[Feature](deps)` Pattern — Registry-Validation passt in dieses Muster
- **Type Re-Exports**: `@super-app/shared` ist der Single Source of Truth fuer Typen (bereits in Nutzung)
- **pgTableCreator**: Jedes Modul nutzt Factory-Pattern: `pgTableCreator((name) => 'prefix_${name}')` — Validierung kann gegen dieses Pattern pruefen

### Integration Points
- `template/backend/src/ai/main-agent.ts:124-128` und `sub-agent.ts:51-55,122-126` — Hauptkonsumenten des LanguageModel-Typs
- `template/backend/src/index.ts:64` — Entry Point wo model erstellt wird (null as any)
- `template/backend/src/module-registry.ts:55` — register() Methode fuer Plugin-Validation

</code_context>

<specifics>
## Specific Ideas

Keine spezifischen Anforderungen — User hat alle Entscheidungen an Claude delegiert mit dem Hinweis "langfristig sinnvoll". Alle Entscheidungen sind auf Nachhaltigkeit, Wartbarkeit und Konsistenz ausgerichtet.

</specifics>

<deferred>
## Deferred Ideas

None — Analyse blieb innerhalb des Phase-Scopes.

</deferred>

---

*Phase: 01-type-safety-consistency*
*Context gathered: 2026-04-03*
