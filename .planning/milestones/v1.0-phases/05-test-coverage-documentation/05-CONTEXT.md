# Phase 5: Test Coverage & Documentation - Context

**Gathered:** 2026-04-03 (assumptions mode — user deferred all decisions to Claude)
**Status:** Ready for planning

<domain>
## Phase Boundary

Kritische Systemfluesse mit Integration Tests abdecken und CLAUDE.md auf aktuellen Code-Stand bringen. Vier spezifische Test-Suites (Module E2E, Hanko Auth, Cost Guardrails, Privacy) plus Dokumentations-Sync. Baut auf Phase 3+4 auf (alle Code-Fixes und Spec-Audit abgeschlossen).

</domain>

<decisions>
## Implementation Decisions

### Integration Test Architektur (TEST-01 bis TEST-04)
- **D-01:** Alle Integration Tests als Bun-Tests mit gemockten Dependencies — KEIN laufender Server oder Datenbank noetig. Folgt dem etablierten Pattern: `createXyz(mockDeps)` → Funktion aufrufen → Ergebnis pruefen.
- **D-02:** Tests als eigene Dateien in den jeweiligen Feature-Verzeichnissen (co-located), nicht in einem separaten `tests/` Ordner. Namensschema: `[feature].integration.test.ts` um sie von Unit-Tests zu unterscheiden.

### E2E Module Integration (TEST-01)
- **D-03:** Ein einzelner Multi-Step Test der den kompletten Flow abdeckt: Module registrieren → AI System erstellen → Tool aufrufen → Permission Check verifizieren → Execution verifizieren → Cost Logging verifizieren. Alle Einzelteile existieren als Unit Tests — der Integration Test verdrahtet sie erstmals end-to-end.
- **D-04:** Test-Location: `template/backend/src/ai/module-integration.integration.test.ts`

### Hanko Auth Flow (TEST-02)
- **D-05:** Tests auf Super-App Middleware-Level mit gemocktem `verifyToken` Dependency. Vier Szenarien: gueltiger Token, abgelaufener Token, Cache Hit/Miss, malformed Token.
- **D-06:** Test-Location: `template/backend/src/auth/auth-flow.integration.test.ts`

### Cost Guardrail Enforcement (TEST-03)
- **D-07:** Integration Test der prueft: Tool-Ausfuehrung wird blockiert wenn Budget ueberschritten. Wired den Cost Guardrail Checker mit einem Mock-Tool und verifiziert die Blockierung.
- **D-08:** Test-Location: `template/backend/src/ai/cost-guardrail.integration.test.ts`

### Privacy System (TEST-04)
- **D-09:** Integration Test der einen AI-Tool-Aufruf simuliert der auf sensitive Ressourcen zugreift, und verifiziert dass der LLM-Kontext nur maskierte Daten enthaelt. Nutzt die bestehende `containsSensitiveData()` Funktion.
- **D-10:** Test-Location: `template/backend/src/ai/privacy.integration.test.ts`

### CLAUDE.md Update (CON-03)
- **D-11:** Fokus auf drei Sektionen die am meisten driften: Tech Stack Versionen (nach Phase 1 Version-Sync), Implementierungsphasen Status-Tabelle (Phasen 1-4 abgeschlossen markieren), Projektstruktur (neue Dateien/Verzeichnisse aus Phasen 1-4).
- **D-12:** Architecture- und Conventions-Sektionen sind Pattern-basiert und aendern sich nicht — nur aktualisieren wenn Phasen 1-4 fundamentale Pattern-Aenderungen eingefuehrt haben.
- **D-13:** Kein komplettes CLAUDE.md Rewrite — gezieltes Section-Update. Die bestehende Dokumentation ist strukturell korrekt und umfangreich.

### Claude's Discretion
- Ob `bun test --coverage` als Gate eingefuehrt wird (Bun 1.2.10 Coverage-Support pruefen)
- Exakte Mock-Fixture-Daten fuer die Tests
- Ob eine test-utils.ts Datei fuer gemeinsame Test-Helpers erstellt wird
- Reihenfolge der Test-Implementierung

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Test Patterns
- `.planning/codebase/TESTING.md` — Aktueller Test-Stand, bestehende Patterns, Coverage-Luecken
- `.planning/codebase/CONCERNS.md` §Test Coverage Gaps — Die vier identifizierten Luecken

### Bestehende Tests (als Referenz fuer Patterns)
- `template/backend/src/ai/main-agent.test.ts` — Mock-Pattern fuer AI System Tests
- `template/backend/src/ai/index.test.ts` — createAISystem mit mockDeps Pattern
- `template/backend/src/module-registry.test.ts` — Module Registration Tests
- `template/backend/src/ai/cost-tracking.test.ts` — Cost-Tracking Mock Pattern
- `template/backend/src/auth/module-auth-middleware.test.ts` — Auth Middleware Tests mit gemocktem verifyToken

### Dokumentation
- `CLAUDE.md` — Aktuelle Projekt-Dokumentation (zu aktualisieren)

### Requirements
- `.planning/REQUIREMENTS.md` — TEST-01 bis TEST-04, CON-03

### Prior Phases
- `.planning/phases/01-type-safety-consistency/01-CONTEXT.md` — Version-Sync (D-08)
- `.planning/phases/02-security-ai-stubs/02-CONTEXT.md` — Permission/Auth Changes (D-01 bis D-05)
- `.planning/phases/03-ai-system-completion/03-CONTEXT.md` — Approval/Rate Limiting/Step Tracking
- `.planning/phases/04-spec-audit/04-CONTEXT.md` — Audit-Ergebnisse als Input fuer CLAUDE.md Update

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Alle bestehenden Test-Dateien nutzen `bun:test` (describe, it, expect, mock, beforeEach)
- `createAISystem(defaultDeps)` Pattern in index.test.ts — wiederverwendbar fuer Integration Tests
- `createModuleRegistry()` + `register()` — Test-Setup existiert

### Established Patterns
- **Mock-Pattern**: `mock(async () => value) as any` — akzeptiert in Tests (Phase 1 D-03)
- **Co-Location**: Tests neben Source-Dateien (`feature.test.ts`)
- **DI-Based Testing**: Alle Systeme akzeptieren Deps-Objekte — einfach mockbar

### Integration Points
- `template/backend/src/ai/index.ts` — createAISystem() als Einstiegspunkt fuer E2E Test
- `template/backend/src/module-registry.ts` — createModuleRegistry() fuer Module-Registration
- `template/backend/src/ai/cost-guardrails.ts` — Guardrail-Checker fuer Budget-Tests
- `template/backend/src/ai/privacy.ts` — Privacy-System fuer Mask-Tests

</code_context>

<specifics>
## Specific Ideas

Keine spezifischen Anforderungen — User hat alle Entscheidungen an Claude delegiert mit Fokus auf Langfristigkeit.

</specifics>

<deferred>
## Deferred Ideas

None — Analyse blieb innerhalb des Phase-Scopes.

</deferred>

---

*Phase: 05-test-coverage-documentation*
*Context gathered: 2026-04-03*
