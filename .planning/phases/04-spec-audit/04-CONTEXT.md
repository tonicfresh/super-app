# Phase 4: Spec Audit - Context

**Gathered:** 2026-04-03 (assumptions mode — user deferred all decisions to Claude)
**Status:** Ready for planning

<domain>
## Phase Boundary

Vollstaendiger Abgleich zwischen den 8 Architektur-Specs (docs/superpowers/plans/) und dem tatsaechlichen Code. Jede Spec bekommt einen Abweichungsbericht (implementiert/teilweise/fehlend/abweichend) mit Priorisierung. Ergebnis: konsolidierte Uebersicht ueber den Implementierungsgrad. ANALYSE-Phase — kein Code-Aenderungen.

</domain>

<decisions>
## Implementation Decisions

### Audit Output Format (SPEC-01 bis SPEC-08)
- **D-01:** Jede der 8 Specs bekommt einen separaten Deviation-Report als Markdown-Datei unter `.planning/phases/04-spec-audit/`. Namensschema: `04-AUDIT-phase-N-name.md`.
- **D-02:** Zusaetzlich ein konsolidierter Summary-Report (`04-AUDIT-SUMMARY.md`) mit Prozent-Implementierungsgrad pro Spec und Gesamt-Priorisierungsliste aller Abweichungen.
- **D-03:** Report-Format pro Abweichung: Feature/Section, Status (implemented/partial/missing/divergent), Priority (critical/high/medium/low), konkrete Beschreibung, File-Referenz, Fix-Vorschlag.

### Audit-Scope relativ zu Phase 1-3 Fixes
- **D-04:** Audit vergleicht gegen den IST-Stand der Codebase. Abweichungen die bereits durch Phase 1-3 Requirements abgedeckt sind (TYPE-01 bis AI-07, SEC-01 bis SEC-04) werden dokumentiert aber als "tracked in Phase X" markiert — keine doppelte Priorisierung.
- **D-05:** Der Audit laeuft nach Phase 2 (ROADMAP Dependency). Phase 1-2 Fixes sollten dann bereits angewendet sein. Falls nicht: Abweichungen trotzdem dokumentieren mit Vermerk.

### Spec-to-Code Mapping
- **D-06:** Audit nutzt die DETAILLIERTEN Plan-Dateien (je 2400-3800 Zeilen mit File-Listings, Code-Beispielen, Type-Signaturen) als primaere Checkliste — nicht nur die High-Level Architecture Spec.
- **D-07:** Mapping der 8 Specs zu Code-Verzeichnissen:
  - Phase 1 Plan → `shared/src/`
  - Phase 2 Plan → `template/backend/src/auth/`
  - Phase 3 Plan → `template/backend/src/ai/`
  - Phase 4 Plan → `template/backend/src/ai/providers.ts`, `cost-tracking.ts`, `cost-guardrails.ts`
  - Phase 5 Plan → `modules/mission-control/`
  - Phase 6 Plan → PWA/Push Composables + Push Routes
  - Phase 7 Plan → `themes/` + `useTheme.ts`
  - Phase 8 Plan → `modules/todos/`
- **D-08:** Pro Spec: Section-by-Section Vergleich — jede Task/Feature aus dem Plan wird gegen den tatsaechlichen Code gecheckt. Mechanischer Vergleich (existiert Datei? Stimmt Signatur? Ist Logik implementiert?).

### Claude's Discretion
- Reihenfolge der 8 Spec-Audits
- Granularitaet der Abweichungsberichte (pro Funktion vs. pro Feature-Block)
- Ob Abweichungen die "besser als Spec" sind (z.B. zusaetzliche Validierung) positiv vermerkt werden
- Formatierung der Prozent-Berechnung (gewichtet nach Priority oder gleichverteilt)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Die 8 Architektur-Specs (PRIMARY — alle muessen gelesen werden)
- `docs/superpowers/plans/2026-04-02-phase1-shared-core.md` — Shared Core Types, Utils, Registry
- `docs/superpowers/plans/2026-04-02-phase2-auth-security.md` — Auth & Security
- `docs/superpowers/plans/2026-04-02-phase3-ai-agent-system.md` — AI Agent System
- `docs/superpowers/plans/2026-04-02-phase4-ai-providers-cost.md` — AI Providers & Cost Tracking
- `docs/superpowers/plans/2026-04-02-phase5-mission-control.md` — Mission Control
- `docs/superpowers/plans/2026-04-02-phase6-pwa-push.md` — PWA & Push Notifications
- `docs/superpowers/plans/2026-04-02-phase7-theming.md` — Theming System
- `docs/superpowers/plans/2026-04-02-phase8-todos.md` — Reference Module: Todos

### Architecture Spec
- `docs/superpowers/specs/2026-04-02-super-app-architecture-design.md` — Gesamtarchitektur als Referenz fuer uebergreifende Patterns

### Requirements
- `.planning/REQUIREMENTS.md` — SPEC-01 bis SPEC-08 Definitionen

### Prior Phases
- `.planning/phases/01-type-safety-consistency/01-CONTEXT.md` — Type Fixes (tracked)
- `.planning/phases/02-security-ai-stubs/02-CONTEXT.md` — Security/AI Fixes (tracked)
- `.planning/phases/03-ai-system-completion/03-CONTEXT.md` — AI Completion (tracked)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.planning/codebase/CONCERNS.md` — Bereits dokumentierte Abweichungen als Startpunkt fuer den Audit
- `.planning/codebase/STRUCTURE.md` — Aktuelle Projektstruktur als Referenz
- `.planning/codebase/ARCHITECTURE.md` — Architektur-Analyse als Vergleichsbasis

### Established Patterns
- **Plan-Dateien**: Jede Spec hat explizite "Files"-Tabellen und Code-Beispiele — mechanisch vergleichbar
- **Module Plugin Contract**: `ModulePlugin` Interface in shared/types.ts definiert was jedes Modul exportieren muss

### Integration Points
- Alle 8 Spec-Verzeichnisse wie in D-07 gelistet
- `template/backend/src/module-registry.ts` — Zentrale Komposition aller Module

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

*Phase: 04-spec-audit*
*Context gathered: 2026-04-03*
