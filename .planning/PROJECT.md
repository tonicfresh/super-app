# Super App — Codebase Audit & Stabilisierung

## What This Is

Modulare, skalierbare Applikations-Plattform mit Sub-Repository-Architektur. Die Codebase wurde in v1.0 systematisch stabilisiert: Type Safety hergestellt, Security-Luecken geschlossen, AI-System verdrahtet, alle 8 Architektur-Specs abgeglichen (92% Implementation Grade) und mit 30 Integration Tests abgesichert.

## Core Value

Die bestehende Codebase soll solide, konsistent und bereit fuer die geplanten Features sein — kein neuer Code auf wackeligem Fundament.

## Requirements

### Validated

- ✓ Modulare Sub-Repository-Architektur mit Dual-Mode-Modulen — existing
- ✓ AI Agent System mit Main-Agent, Sub-Agents, Privacy, Cost-Tracking — existing
- ✓ Mission Control Modul mit Cost-Tracking und Audit — existing
- ✓ Hanko WebAuthn/Passkey Authentication — existing
- ✓ Theming System mit Default + Cyberpunk Theme — existing
- ✓ Frontend Shell mit Vue 3, PrimeVue, Pinia, i18n — existing
- ✓ Drizzle ORM mit Table-Prefix-Convention — existing
- ✓ Valibot Validation durchgaengig — existing
- ✓ LanguageModel types in @super-app/shared — v1.0
- ✓ ModulePlugin validation bei Registrierung — v1.0
- ✓ Zero `as any` in production code — v1.0
- ✓ Package-Versionen synchronisiert (Backend/Frontend) — v1.0
- ✓ Schema Table-Prefix Enforcement (base_*, app_*, <modul>_*) — v1.0
- ✓ Permission-Middleware reaktiviert — v1.0
- ✓ Hanko Token Verification mit Error Handling — v1.0
- ✓ AI Tool Approval Workflow mit DB-Storage — v1.0
- ✓ Privacy Rate Limiting gegen ID-Enumeration — v1.0
- ✓ getSecret/getSetting an Framework-Secrets angebunden — v1.0
- ✓ dbInsert fuer Cost-Logging an Drizzle angebunden — v1.0
- ✓ checkModuleAccess gegen Permissions-Tabelle — v1.0
- ✓ Model-Selection aus Provider-Registry — v1.0
- ✓ Agent Step Tracking in DB — v1.0
- ✓ Cost-Pricing aus Settings statt hardcoded — v1.0
- ✓ queryDailyTotal/queryModuleDaily Caching — v1.0
- ✓ 8 Spec-Audits durchgefuehrt (92% Implementation Grade) — v1.0
- ✓ Integration Tests (Cost, Privacy, Auth, E2E) — v1.0
- ✓ CLAUDE.md synchronisiert — v1.0

### Active

(Wird mit `/gsd:new-milestone` definiert)

### Out of Scope

- Neue Features implementieren — erst stabilisieren, dann erweitern
- ai-proxy Integration — separates Projekt, nicht Teil dieses Audits
- Deployment/CI Pipeline — Fokus auf Code-Qualitaet
- Frontend E2E Tests mit Playwright — zu aufwaendig fuer diesen Milestone
- Mobile App — web-first Ansatz

## Context

**Shipped v1.0** am 2026-04-03 mit ~17.400 LOC TypeScript.
Tech Stack: Bun 1.2.10, Hono.js 4.12.10, Vue 3.5.31, Drizzle ORM 0.45.2, Valibot 1.3.1, PostgreSQL 17.9 + pgvector.

**Codebase-Zustand nach v1.0:**
- 92% Implementation Grade ueber 8 Architektur-Specs
- 30 neue Integration Tests (alle gruen)
- 2 kritische MC-Gaps: Plugin Routes stub deps, Standalone non-functional
- Legacy chat route bypass und dual AI init path als Tech Debt
- 130 pre-existing Knowledge API test failures (extern)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Analyse vor Umsetzung | Toby will zuerst Gesamtbild sehen, dann priorisieren | ✓ Good |
| Code + Plaene abgleichen | IST-Zustand gegen 8 Phasen-Specs validieren | ✓ Good — 92% Implementation Grade |
| Framework nicht aendern | Sub-Submodule gehoert nicht zur Super-App | ✓ Good — Scope gehalten |
| LanguageModelV1 statt V3 | SDK v6 canonical type | ✓ Good |
| Frontend-Versionen als Alignment-Target | Backend Dependencies an Frontend anpassen | ✓ Good |
| In-memory Rate Limiting | Kein Redis fuer Single-Instance | ✓ Good — einfach, funktional |
| Atomic SQL Increments fuer Sessions | Race Condition Prevention | ✓ Good |
| Deprecation-first Consolidation | services/approval.ts deprecated, nicht geloescht | ⚠️ Revisit — Aufraeum-Kandidat |
| MC Plugin Stub Deps | Framework-Contract Compliance | ⚠️ Revisit — echte Deps noetig |

## Constraints

- **Tech Stack**: Bestehend — Bun, Hono, Vue 3, Drizzle, Valibot (NICHT Zod)
- **Framework**: Sub-Submodule, nicht direkt aenderbar (nur Super-App Code)
- **Backward Compatibility**: Bestehende Module muessen weiter funktionieren
- **Validation**: Valibot durchgaengig

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-04-03 after v1.0 milestone*
