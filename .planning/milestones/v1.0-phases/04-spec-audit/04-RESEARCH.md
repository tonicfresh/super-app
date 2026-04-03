# Phase 04: Spec Audit - Research

**Researched:** 2026-04-03
**Domain:** Code-Spec Deviation Analysis (8 Architecture Specs vs. Actual Codebase)
**Confidence:** HIGH

## Summary

Phase 04 ist eine reine Analyse-Phase ohne Code-Aenderungen. Ziel ist der systematische Abgleich der 8 Architektur-Spec-Plaene (insgesamt ~24.400 Zeilen mit detaillierten Task-Beschreibungen, File-Tabellen und Code-Beispielen) gegen den tatsaechlichen Code-Stand. Pro Spec wird ein Deviation-Report erstellt, plus ein konsolidierter Summary-Report.

Die Codebase hat bereits Implementierungen in allen 8 Spec-Bereichen — von vollstaendig (shared/, themes/, todos) bis rudimentaer (PWA-Grundgeruest). Die Phasen 1-3 des Audit-Projekts haben bereits diverse Fixes angewendet (Type Safety, Security Stubs, AI System Completion), sodass der IST-Stand deutlich besser ist als der urspruengliche CONCERNS.md Stand. Der Audit muss diese Fixes beruecksichtigen und Abweichungen die durch Phase 1-3 Requirements abgedeckt sind als "tracked" markieren.

**Primary recommendation:** Audit sequentiell nach Spec-Nummer durchfuehren (1-8), da spaetere Specs auf fruehere aufbauen. Pro Spec: mechanischer Section-by-Section Vergleich (existiert Datei? Stimmt Signatur? Ist Logik implementiert?) mit strukturiertem Deviation-Report.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Jede der 8 Specs bekommt einen separaten Deviation-Report als Markdown-Datei unter `.planning/phases/04-spec-audit/`. Namensschema: `04-AUDIT-phase-N-name.md`.
- **D-02:** Zusaetzlich ein konsolidierter Summary-Report (`04-AUDIT-SUMMARY.md`) mit Prozent-Implementierungsgrad pro Spec und Gesamt-Priorisierungsliste aller Abweichungen.
- **D-03:** Report-Format pro Abweichung: Feature/Section, Status (implemented/partial/missing/divergent), Priority (critical/high/medium/low), konkrete Beschreibung, File-Referenz, Fix-Vorschlag.
- **D-04:** Audit vergleicht gegen den IST-Stand der Codebase. Abweichungen die bereits durch Phase 1-3 Requirements abgedeckt sind (TYPE-01 bis AI-07, SEC-01 bis SEC-04) werden dokumentiert aber als "tracked in Phase X" markiert — keine doppelte Priorisierung.
- **D-05:** Der Audit laeuft nach Phase 2 (ROADMAP Dependency). Phase 1-2 Fixes sollten dann bereits angewendet sein. Falls nicht: Abweichungen trotzdem dokumentieren mit Vermerk.
- **D-06:** Audit nutzt die DETAILLIERTEN Plan-Dateien als primaere Checkliste — nicht nur die High-Level Architecture Spec.
- **D-07:** Mapping der 8 Specs zu Code-Verzeichnissen (Phase 1 -> shared/, Phase 2 -> auth/, etc.)
- **D-08:** Pro Spec: Section-by-Section Vergleich — jede Task/Feature aus dem Plan wird gegen den tatsaechlichen Code gecheckt.

### Claude's Discretion
- Reihenfolge der 8 Spec-Audits
- Granularitaet der Abweichungsberichte (pro Funktion vs. pro Feature-Block)
- Ob Abweichungen die "besser als Spec" sind positiv vermerkt werden
- Formatierung der Prozent-Berechnung (gewichtet nach Priority oder gleichverteilt)

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SPEC-01 | Phase 1 (Shared Core) gegen tatsaechlichen shared/ Code abgleichen | 7 Tasks, ~2476 Zeilen Spec. shared/src/ hat 8 Dateien (types, cost-tracking, guardrails, theme + tests). Mechanisch vergleichbar. |
| SPEC-02 | Phase 2 (Auth & Security) gegen auth/ Code abgleichen | 7 Tasks, ~3640 Zeilen Spec. auth/ hat 19 Dateien. Framework-Submodule nicht aenderbar aber auditierbar. |
| SPEC-03 | Phase 3 (AI Agent System) gegen ai/ Code abgleichen | 8 Tasks, ~3015 Zeilen Spec. ai/ hat 28+ Dateien inkl. channels/, db/, routes/. Phase 3 Fixes bereits angewendet. |
| SPEC-04 | Phase 4 (AI Providers & Cost) gegen providers/cost-tracking Code abgleichen | 10 Tasks, ~2687 Zeilen Spec. Dateien in ai/ (providers.ts, cost-tracking.ts, cost-guardrails.ts, cost-queries.ts). Phase 2 Fixes (cost query caching) bereits angewendet. |
| SPEC-05 | Phase 5 (Mission Control) gegen mission-control Modul abgleichen | 9 Tasks, ~3119 Zeilen Spec. Modul existiert mit Backend (routes, tools, schema, services, ws-handler, jobs) und Frontend (stores, views, components). |
| SPEC-06 | Phase 6 (PWA & Push) gegen push/PWA Code abgleichen | 7 Tasks, ~2965 Zeilen Spec. PWA-Grundgeruest existiert: manifest.json, sw.js, push-subscriptions schema, push routes, composables (usePWA, usePushNotifications), PushSettings/PushPermissionBanner Komponenten. |
| SPEC-07 | Phase 7 (Theming) gegen themes/ Code abgleichen | 7 Tasks, ~2643 Zeilen Spec. themes/ hat default + cyberpunk Themes mit tokens.ts, overrides.css, registry. Frontend hat useTheme composable + theme-loader. |
| SPEC-08 | Phase 8 (Todos) gegen todos Modul abgleichen | 13 Tasks, ~3844 Zeilen Spec. Modul existiert mit Backend (plugin, tools, schema, routes, services, jobs) und Frontend (stores, views, components inkl. Kanban). |
</phase_requirements>

## Architecture Patterns

### Audit Report Structure (per Spec)

```
.planning/phases/04-spec-audit/
├── 04-AUDIT-phase-1-shared-core.md
├── 04-AUDIT-phase-2-auth-security.md
├── 04-AUDIT-phase-3-ai-agent-system.md
├── 04-AUDIT-phase-4-ai-providers-cost.md
├── 04-AUDIT-phase-5-mission-control.md
├── 04-AUDIT-phase-6-pwa-push.md
├── 04-AUDIT-phase-7-theming.md
├── 04-AUDIT-phase-8-todos.md
└── 04-AUDIT-SUMMARY.md
```

### Pattern: Section-by-Section Deviation Report

Jeder Report folgt der gleichen Struktur:

```markdown
# Spec Audit: Phase N — [Name]

**Spec:** docs/superpowers/plans/2026-04-02-phaseN-[name].md
**Code:** [primaeres Verzeichnis]
**Audit Date:** 2026-04-03

## Summary
- Tasks in Spec: N
- Implemented: X | Partial: Y | Missing: Z | Divergent: W
- Implementation Grade: XX%

## Task-by-Task Audit

### Task 1: [Name aus Spec]

| Feature/Section | Status | Priority | Description | File Reference | Fix Proposal |
|-----------------|--------|----------|-------------|----------------|--------------|
| [feature] | implemented/partial/missing/divergent | critical/high/medium/low | [was fehlt/abweicht] | [pfad:zeile] | [konkreter Fix] |

[... pro Task ...]

## Cross-Cutting Deviations
[Abweichungen die mehrere Tasks betreffen]

## Tracked in Prior Phases
| Deviation | Tracked in | Requirement |
|-----------|-----------|-------------|
| [beschreibung] | Phase 1/2/3 | TYPE-XX / SEC-XX / AI-XX |
```

### Pattern: Audit Methodology (pro Spec-Datei)

1. **Read Spec** — Alle Tasks und Steps identifizieren
2. **Read Code** — Korrespondierende Dateien oeffnen
3. **Mechanischer Vergleich:**
   - Existiert die Datei? (File Table aus Spec)
   - Stimmt die Signatur? (Interfaces, Funktionsparameter)
   - Ist die Logik implementiert? (vs. TODO/no-op/stub)
   - Stimmen die Konventionen? (Table Prefix, Valibot statt Zod, etc.)
4. **Status zuweisen:**
   - `implemented` — Funktionalitaet wie in Spec beschrieben vorhanden
   - `partial` — Teile implementiert, andere fehlen oder sind gestubbt
   - `missing` — Datei/Feature existiert nicht
   - `divergent` — Implementierung weicht vom Spec ab (anders geloest)
5. **Priority zuweisen:**
   - `critical` — Sicherheitsluecke oder Runtime-Crash
   - `high` — Kernfeature fehlt oder falsch implementiert
   - `medium` — Feature fehlt aber Workaround existiert
   - `low` — Kosmetik, Konvention, nice-to-have

### Pattern: Prozent-Berechnung

**Empfehlung (Claude's Discretion):** Gewichtete Berechnung nach Feature-Bloecken, nicht nach Einzelzeilen. Ein Task mit 10 Steps gilt als 100% wenn alle Steps implementiert sind, 50% bei haelftiger Abdeckung, etc. Gewichtung:
- `implemented` = 100%
- `partial` = anteilig (manuell geschaetzt)
- `missing` = 0%
- `divergent` = je nach Bewertung (kann 100% sein wenn besser)

### Pattern: "Besser als Spec" Handling

**Empfehlung (Claude's Discretion):** Positiv vermerken mit Status `divergent (improved)`. Diese zaehlen als 100% implementiert. Beispiel: Wenn der Code eine zusaetzliche Validierung hat die die Spec nicht vorsieht, ist das ein Plus.

## Audit Scope: Pre-Existing Fixes

Die Phasen 1-3 haben folgende Requirements bereits bearbeitet (alle [x] in REQUIREMENTS.md):

| Phase | Requirements | Bereich |
|-------|-------------|---------|
| Phase 1 | TYPE-01, TYPE-02, TYPE-03, CON-01, CON-02 | Types, Consistency |
| Phase 2 | SEC-01, SEC-02, AI-01 - AI-04, AI-06, AI-07 | Security, AI Stubs |
| Phase 3 | SEC-03, SEC-04, AI-05 | AI Completion |

**Auswirkung auf Audit:** Viele Abweichungen die in CONCERNS.md dokumentiert waren (gestubte Callbacks, as-any, Permission-Hack) sollten bereits gefixt sein. Der Audit prueft den aktuellen Code — wenn Fixes applied sind, ist der Status `implemented`. Wenn nicht, wird auf die Phase verwiesen.

## Codebase Map: Spec-to-Code Directories

| Spec | Primary Code Dirs | File Count | Notes |
|------|-------------------|------------|-------|
| Phase 1 (Shared Core) | `shared/src/` | 8 .ts files | types, cost-tracking, guardrails, theme + tests |
| Phase 2 (Auth & Security) | `template/backend/src/auth/` | 19 .ts files | + framework submodule (read-only audit) |
| Phase 3 (AI Agent System) | `template/backend/src/ai/` | 28+ .ts files | channels/, db/, routes/ subdirs |
| Phase 4 (AI Providers & Cost) | `template/backend/src/ai/` (providers, cost-*) | 8 .ts files | Ueberlappung mit Phase 3 Verzeichnis |
| Phase 5 (Mission Control) | `modules/mission-control/` | ~30 .ts/.vue files | Backend + Frontend, eigenes Modul |
| Phase 6 (PWA & Push) | `template/frontend/src/composables/`, `template/backend/src/routes/push.ts`, `template/frontend/public/` | ~10 files | Verteilt ueber Backend/Frontend |
| Phase 7 (Theming) | `themes/`, `template/frontend/src/` (theme-loader, useTheme) | ~12 files | themes/ dir + frontend composable |
| Phase 8 (Todos) | `modules/todos/` | ~15 .ts/.vue files | Backend + Frontend, eigenes Modul |

## Spec Complexity Overview

| Spec | Tasks | Steps/Files | Lines | Estimated Audit Effort |
|------|-------|-------------|-------|----------------------|
| Phase 1: Shared Core | 7 | 41 | 2476 | Medium — kleines Verzeichnis, viele Type-Checks |
| Phase 2: Auth & Security | 7 | 53 | 3640 | High — Framework-Grenzen, viele Integration Points |
| Phase 3: AI Agent System | 8 | 42 | 3015 | High — Komplex, viele Dateien, Phase-3-Fixes |
| Phase 4: AI Providers & Cost | 10 | 51 | 2687 | Medium — Fokussiert auf wenige Dateien |
| Phase 5: Mission Control | 9 | 57 | 3119 | High — Vollstaendiges Modul mit Backend+Frontend |
| Phase 6: PWA & Push | 7 | 48 | 2965 | Medium — PWA-Grundgeruest vorhanden |
| Phase 7: Theming | 7 | 40 | 2643 | Low-Medium — Themes existieren, Vergleich straightforward |
| Phase 8: Todos | 13 | 61 | 3844 | High — Groesstes Spec, viele Views/Komponenten |

## Recommended Audit Order (Claude's Discretion)

**Sequentiell nach Spec-Nummer (1-8):**
1. Phase 1 (Shared Core) — Basis-Typen definieren den Vertrag fuer alles andere
2. Phase 2 (Auth & Security) — Auth-Layer wird von allen Modulen genutzt
3. Phase 3 (AI Agent System) — Kern-AI-System
4. Phase 4 (AI Providers & Cost) — Baut auf Phase 3 AI-System auf
5. Phase 5 (Mission Control) — Referenz-Modul fuer Monitoring
6. Phase 6 (PWA & Push) — Cross-Cutting Feature
7. Phase 7 (Theming) — Frontend-Feature
8. Phase 8 (Todos) — Referenz-Modul als letztes (zeigt Module-Pattern vollstaendig)

**Begruendung:** Spaetere Specs referenzieren fruehere (z.B. Phase 8 nutzt Types aus Phase 1, Permissions aus Phase 2, Tools aus Phase 3). Abweichungen in frueheren Specs koennen kaskadierend Abweichungen in spaeteren erklaeren.

## Common Pitfalls

### Pitfall 1: Spec-Inflation
**What goes wrong:** Specs beschreiben einen idealisierten Endzustand. Viele "Abweichungen" sind einfach "noch nicht gebaut".
**Why it happens:** Die Specs sind ~25.000 Zeilen detailliert — ein MVP implementiert natuerlich nicht alles.
**How to avoid:** Klar unterscheiden zwischen "missing (not yet built)" und "divergent (differently built)". Priority hilft: fehlende Nice-to-have-Features sind `low`, fehlende Kernfeatures `high`.
**Warning signs:** Wenn >70% aller Features als "missing" markiert werden, ist die Spec vermutlich ambitionierter als der aktuelle Milestone.

### Pitfall 2: Framework-Submodule Confusion
**What goes wrong:** Abweichungen in `template/backend/framework/` werden als Super-App-Bugs gemeldet.
**Why it happens:** Framework ist ein Sub-Submodule und nicht direkt aenderbar.
**How to avoid:** Framework-Abweichungen separat markieren: "Framework limitation — requires upstream fix". Fix-Vorschlaege muessen Workarounds in Super-App-Code vorschlagen, nicht Framework-Aenderungen.
**Warning signs:** Fix-Vorschlag referenziert `framework/src/` Dateien.

### Pitfall 3: Phase 1-3 Double-Counting
**What goes wrong:** Bereits gefixte Issues werden als neue Abweichungen gezaehlt.
**Why it happens:** Audit liest alte CONCERNS.md und meldet dieselben Issues.
**How to avoid:** Immer den AKTUELLEN Code lesen, nicht CONCERNS.md als Checkliste nutzen. CONCERNS.md ist Startpunkt fuer bekannte Problembereiche, nicht Wahrheitsquelle.
**Warning signs:** Abweichung beschreibt exakt ein Issue aus CONCERNS.md das bereits als "[x]" in REQUIREMENTS.md markiert ist.

### Pitfall 4: Spec-Dateien sind zu gross fuer Single-Read
**What goes wrong:** Agent liest nur die ersten 2000 Zeilen einer Spec und verpasst spaetere Tasks.
**Why it happens:** Spec-Dateien sind 2400-3800 Zeilen lang.
**How to avoid:** Spec-Dateien in Chunks lesen (offset-Parameter nutzen). Erst Task-Uebersicht extrahieren (grep "## Task"), dann Task-fuer-Task durchgehen.
**Warning signs:** Audit-Report endet abrupt nach Task 3 oder 4.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deviation tracking | Custom JSON/DB schema | Structured Markdown mit Tables | Reports muessen von Menschen lesbar sein, nicht maschinell verarbeitet |
| Prozent-Berechnung | Automatisches Counting-Script | Manuelle Bewertung pro Task-Block | Qualitative Einschaetzung ("partial" ist nicht immer 50%) |
| Diff-Erzeugung | Automatisches Code-Diff gegen Spec-Codeblocks | Manueller Signatur-Vergleich | Spec-Code ist exemplarisch, nicht 1:1 |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun Test (native `bun:test`) |
| Config file | Keine separate Config — `bun test` aus package.json |
| Quick run command | `cd template/backend && bun test` |
| Full suite command | `cd template/backend && bun test` |

### Phase Requirements -> Test Map

Da Phase 04 eine reine Analyse-Phase ist (Output: Markdown-Reports), gibt es keine automatisierbaren Tests. Die Validierung erfolgt durch manuelle Pruefung der Reports auf Vollstaendigkeit und Korrektheit.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SPEC-01 | Deviation Report Phase 1 existiert und ist vollstaendig | manual-only | N/A — Markdown-Output Pruefung | N/A |
| SPEC-02 | Deviation Report Phase 2 existiert und ist vollstaendig | manual-only | N/A | N/A |
| SPEC-03 | Deviation Report Phase 3 existiert und ist vollstaendig | manual-only | N/A | N/A |
| SPEC-04 | Deviation Report Phase 4 existiert und ist vollstaendig | manual-only | N/A | N/A |
| SPEC-05 | Deviation Report Phase 5 existiert und ist vollstaendig | manual-only | N/A | N/A |
| SPEC-06 | Deviation Report Phase 6 existiert und ist vollstaendig | manual-only | N/A | N/A |
| SPEC-07 | Deviation Report Phase 7 existiert und ist vollstaendig | manual-only | N/A | N/A |
| SPEC-08 | Deviation Report Phase 8 existiert und ist vollstaendig | manual-only | N/A | N/A |

**Justification for manual-only:** Phase 04 produziert keine Code-Aenderungen. Output sind ausschliesslich Markdown-Analyse-Dokumente. Automatisierte Tests waeren sinnlos (man wuerde testen ob eine Datei existiert, nicht ob ihr Inhalt korrekt ist).

### Sampling Rate
- **Per task commit:** Datei existiert und hat erwartete Sections
- **Per wave merge:** Alle 8 Reports + Summary vorhanden
- **Phase gate:** Summary-Report zeigt alle 8 Specs abgedeckt

### Wave 0 Gaps
None — keine Test-Infrastruktur benoetigt fuer Analyse-Phase.

## Execution Strategy

### Empfohlene Plan-Aufteilung

Angesichts der Groesse (8 Specs mit je 2400-3800 Zeilen) und des rein analytischen Charakters:

**Option A: 4 Plans a 2 Specs** (empfohlen)
- Plan 1: SPEC-01 (Shared Core) + SPEC-02 (Auth & Security)
- Plan 2: SPEC-03 (AI Agent) + SPEC-04 (AI Providers & Cost)
- Plan 3: SPEC-05 (Mission Control) + SPEC-06 (PWA & Push)
- Plan 4: SPEC-07 (Theming) + SPEC-08 (Todos) + Summary-Report

**Begruendung:** 2 Specs pro Plan haelt die Kontextgroesse handhabbar. Der Summary-Report gehoert in den letzten Plan, da er alle vorherigen Reports aggregiert.

**Option B: 8 Plans a 1 Spec + 1 Summary Plan** (konservativ, mehr Overhead)

### Task-Struktur pro Plan

Jeder Plan hat 2-3 Tasks:
1. **Read & Compare Spec N** — Spec lesen, Code vergleichen, Deviations sammeln
2. **Read & Compare Spec M** — Analog fuer zweite Spec
3. **Write Reports** — Deviation-Reports als Markdown schreiben

### Aufwand-Schaetzung

Pro Spec-Audit: ~10-20 Minuten (Spec lesen ~5min, Code vergleichen ~5-10min, Report schreiben ~5min)
Gesamt: ~80-160 Minuten + Summary ~15 Minuten

## Open Questions

1. **Welche Phase-1-3 Fixes wurden tatsaechlich angewendet?**
   - Was wir wissen: REQUIREMENTS.md zeigt alle [x] als erledigt, Verification Reports existieren fuer Phase 1-3
   - Was unklar ist: Ob 100% der geplanten Fixes wirklich im Code sind (Verification koennte Gaps uebersehen haben)
   - Empfehlung: Audit prueft den IST-Code — wenn ein Fix nicht angewendet wurde, wird er als Abweichung mit "should be tracked in Phase X" vermerkt

2. **Wie detailliert sollen Frontend-Views auditiert werden?**
   - Was wir wissen: Specs enthalten detaillierte Vue-Komponenten-Beschreibungen mit Props und Events
   - Was unklar ist: Ob ein 1:1 Props-Vergleich sinnvoll ist oder ob funktionale Aequivalenz reicht
   - Empfehlung: Funktionale Aequivalenz — "Component existiert und zeigt die beschriebenen Daten" statt "Props heissen exakt wie in Spec"

## Sources

### Primary (HIGH confidence)
- `.planning/phases/04-spec-audit/04-CONTEXT.md` — Locked decisions
- `.planning/REQUIREMENTS.md` — Requirement definitions
- `.planning/STATE.md` — Project state and accumulated decisions
- `.planning/codebase/CONCERNS.md` — Known deviations baseline
- `.planning/codebase/STRUCTURE.md` — Current file structure
- `docs/superpowers/plans/2026-04-02-phase*.md` — The 8 spec files (primary audit targets)
- Actual codebase directory listings (shared/, auth/, ai/, modules/, themes/)

### Secondary (MEDIUM confidence)
- Phase 1-3 Verification Reports — Confirm which fixes were applied

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No libraries needed, pure analysis phase
- Architecture: HIGH — Output format locked in CONTEXT.md decisions D-01 to D-08
- Pitfalls: HIGH — Based on direct codebase analysis and known project patterns

**Research date:** 2026-04-03
**Valid until:** 2026-04-17 (14 days — codebase may change with ongoing work)
