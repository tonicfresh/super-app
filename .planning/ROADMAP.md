# Roadmap: Super App Audit & Stabilisierung

## Overview

Systematische Stabilisierung der bestehenden Super-App-Codebase in 5 Phasen: Zuerst Type Safety und Konsistenz als Fundament, dann kritische Security-Fixes und AI-System-Stubs anbinden, danach AI-System vervollstaendigen, dann alle 8 Phasen-Specs gegen den Code abgleichen, und abschliessend Integration Tests und Dokumentation synchronisieren.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Type Safety & Consistency** - Typen definieren, `as any` eliminieren, Versionen und Schema-Prefixes validieren
- [ ] **Phase 2: Security & AI Stubs** - Permission-Middleware reaktivieren, Hanko-Fehlerbehandlung, alle 6 gestubten AI-Callbacks anbinden
- [ ] **Phase 3: AI System Completion** - Approval Workflow, Privacy-Schutz und Agent Step Tracking implementieren
- [ ] **Phase 4: Spec Audit** - IST vs. SOLL Abgleich aller 8 Architektur-Phasen-Specs
- [ ] **Phase 5: Test Coverage & Documentation** - Integration Tests fuer kritische Pfade, CLAUDE.md aktualisieren

## Phase Details

### Phase 1: Type Safety & Consistency
**Goal**: Die Codebase hat saubere Typen, keine `as any` Escapes, und konsistente Versionen/Schema-Prefixes
**Depends on**: Nothing (first phase)
**Requirements**: TYPE-01, TYPE-02, TYPE-03, CON-01, CON-02
**Success Criteria** (what must be TRUE):
  1. LanguageModel Interface existiert in @super-app/shared und wird in allen AI-Dateien importiert
  2. `bun run typecheck` (oder tsc --noEmit) laeuft ohne Fehler und ohne `as any` Assertions
  3. Backend und Frontend package.json verwenden identische Versionen fuer gemeinsame Dependencies
  4. Alle Drizzle-Schema-Tabellen folgen der Prefix-Konvention (base_*, app_*, <modul>_*)
  5. Module Registry validiert Plugin-Struktur bei Registrierung und wirft bei fehlenden Exports
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: Security & AI Stubs
**Goal**: Kritische Security-Luecken geschlossen und alle gestubten AI-System-Callbacks an echte Implementierungen angebunden
**Depends on**: Phase 1
**Requirements**: SEC-01, SEC-02, AI-01, AI-02, AI-03, AI-04, AI-06, AI-07
**Success Criteria** (what must be TRUE):
  1. Permission-Middleware ist aktiv — ein Request ohne passende Berechtigung erhaelt HTTP 403
  2. Hanko Token Verification hat try-catch mit sauberem Error Response (kein Stack-Leak, kein unhandled throw)
  3. getSecret/getSetting liefern echte Werte aus Framework-Secrets statt null
  4. dbInsert schreibt AI-Kosten tatsaechlich in die mc_ai_costs Tabelle (verifizierbar per DB-Query)
  5. checkModuleAccess prueft gegen die Permissions-Tabelle statt always-true
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: AI System Completion
**Goal**: AI-System hat funktionierenden Approval Workflow, Privacy-Schutz gegen Enumeration, und vollstaendiges Step Tracking
**Depends on**: Phase 2
**Requirements**: SEC-03, SEC-04, AI-05
**Success Criteria** (what must be TRUE):
  1. Sensitive AI-Tool-Operationen erzeugen einen Approval Request in der Datenbank mit Status pending/approved/denied
  2. Wiederholte ID-basierte Zugriffe werden durch Rate Limiting geblockt (HTTP 429)
  3. Agent Steps (Planung, Tool-Aufruf, Ergebnis) werden in mc_agent_sessions geloggt und sind in Mission Control sichtbar
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Spec Audit
**Goal**: Vollstaendiger Abgleich zwischen den 8 Architektur-Specs und dem tatsaechlichen Code — alle Abweichungen dokumentiert und priorisiert
**Depends on**: Phase 2
**Requirements**: SPEC-01, SPEC-02, SPEC-03, SPEC-04, SPEC-05, SPEC-06, SPEC-07, SPEC-08
**Success Criteria** (what must be TRUE):
  1. Fuer jede der 8 Phasen-Specs existiert ein Abweichungsbericht (implementiert / teilweise / fehlend / abweichend)
  2. Alle Abweichungen sind priorisiert (critical / high / medium / low) mit konkretem Fix-Vorschlag
  3. Eine konsolidierte Liste zeigt den Gesamtzustand: wie viel Prozent jeder Spec tatsaechlich implementiert ist
  4. Ergebnisse sind in .planning/ dokumentiert und koennen als Input fuer zukuenftige Feature-Arbeit dienen
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: Test Coverage & Documentation
**Goal**: Kritische Systemflüsse haben Integration Tests und CLAUDE.md spiegelt den tatsaechlichen Code-Stand wider
**Depends on**: Phase 3, Phase 4
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, CON-03
**Success Criteria** (what must be TRUE):
  1. E2E Test existiert: Module Registry -> AI Tool -> Permission Check -> Execution (laeuft gruen)
  2. Hanko Auth Flow Tests decken ab: gueltiger Token, abgelaufener Token, Cache Hit/Miss, malformed Token
  3. Cost Guardrail Test verifiziert: Tool-Ausfuehrung wird blockiert wenn Budget ueberschritten
  4. Privacy Test verifiziert: LLM-Kontext enthaelt nur maskierte Daten bei sensiblen Ressourcen
  5. CLAUDE.md Projektstruktur, Tech Stack und Status-Tabelle stimmen mit dem tatsaechlichen Code ueberein
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5
Note: Phase 3 and Phase 4 can run in parallel (both depend on Phase 2, not on each other).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Type Safety & Consistency | 0/2 | Not started | - |
| 2. Security & AI Stubs | 0/3 | Not started | - |
| 3. AI System Completion | 0/2 | Not started | - |
| 4. Spec Audit | 0/3 | Not started | - |
| 5. Test Coverage & Documentation | 0/3 | Not started | - |
