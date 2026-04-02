# Super App — Codebase Audit & Stabilisierung

## What This Is

Systematische Analyse der bestehenden Super-App-Codebase gegen die 8 geplanten Architektur-Phasen. Ziel ist es, alle Inkonsistenzen, Tech Debt, fehlende Implementierungen und Abweichungen von den Specs zu finden, priorisieren und schrittweise zu beheben. Toby entscheidet nach der Analyse, was umgesetzt wird.

## Core Value

Die bestehende Codebase soll solide, konsistent und bereit fuer die geplanten Features sein — kein neuer Code auf wackeligem Fundament.

## Requirements

### Validated

- ✓ Modulare Sub-Repository-Architektur mit Dual-Mode-Modulen — existing
- ✓ AI Agent System mit Main-Agent, Sub-Agents, Privacy, Cost-Tracking — existing (teilweise gestubbt)
- ✓ Mission Control Modul mit Cost-Tracking und Audit — existing
- ✓ Hanko WebAuthn/Passkey Authentication — existing
- ✓ Theming System mit Default + Cyberpunk Theme — existing
- ✓ Frontend Shell mit Vue 3, PrimeVue, Pinia, i18n — existing
- ✓ Drizzle ORM mit Table-Prefix-Convention — existing
- ✓ Valibot Validation durchgaengig — existing

### Active

- [ ] Vollstaendige Codeanalyse: IST vs. SOLL (8 Phasen-Specs)
- [ ] Priorisierte Liste aller Inkonsistenzen und Abweichungen
- [ ] Kritische Security-Fixes (Permission-Middleware, Hanko Error Handling)
- [ ] Tech Debt Abbau (as any Eliminierung, gestubte Funktionen)
- [ ] Test-Coverage-Luecken schliessen (Integration Tests, E2E)
- [ ] Versions-Konsistenz zwischen Backend/Frontend package.json
- [ ] AI-System TODOs aufloesen (7 gestubte Callbacks in index.ts)
- [ ] Dokumentation aktualisieren (CLAUDE.md, Specs vs. Reality)

### Out of Scope

- Neue Features implementieren — erst stabilisieren, dann erweitern
- ai-proxy Integration — separates Projekt, nicht Teil dieses Audits
- Deployment/CI Pipeline — Fokus auf Code-Qualitaet
- Frontend E2E Tests mit Playwright — zu aufwaendig fuer diesen Milestone

## Context

**Bestehende Codebase:** Monorepo mit Bun Workspaces, Template (Backend/Frontend), Modules (mission-control, todos, speech), Shared Types. Framework ist ein Sub-Submodule.

**8 Phasen-Plaene:** Existieren unter `docs/superpowers/plans/` mit detaillierten Implementierungs-Specs fuer Shared Core, Auth, AI Agent, AI Providers, Mission Control, PWA, Theming, Todos.

**Codebase Map:** `.planning/codebase/` mit 7 Dokumenten (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS).

**Bekannte Probleme (aus CONCERNS.md):**
- 7 gestubte TODO-Callbacks in AI-System Init
- Permission-Middleware komplett deaktiviert (HACK)
- 11x `as any` Type Escapes
- Hardcoded Cost Pricing ohne Update-Mechanismus
- Hanko Token Verification ohne Fallback
- Keine E2E Integration Tests
- Kein Coverage Reporting

## Constraints

- **Tech Stack**: Bestehend — Bun, Hono, Vue 3, Drizzle, Valibot (NICHT Zod)
- **Framework**: Sub-Submodule, nicht direkt aenderbar (nur Super-App Code)
- **Backward Compatibility**: Bestehende Module (mission-control, todos) muessen weiter funktionieren
- **Validation**: Valibot (NICHT Zod!) — konsistent durch gesamte Codebase

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Analyse vor Umsetzung | Toby will zuerst Gesamtbild sehen, dann priorisieren | — Pending |
| Code + Plaene abgleichen | IST-Zustand gegen 8 Phasen-Specs validieren | — Pending |
| Framework nicht aendern | Sub-Submodule gehoert nicht zur Super-App | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-02 after initialization*
