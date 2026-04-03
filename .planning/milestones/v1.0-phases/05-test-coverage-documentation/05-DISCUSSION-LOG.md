# Phase 5: Test Coverage & Documentation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 05-Test Coverage & Documentation
**Areas discussed:** Integration Test Architektur, E2E Module, Hanko Auth, Cost Guardrails, Privacy, CLAUDE.md
**Mode:** User delegated all decisions to Claude ("entscheide selbst, langfristig sinnvoll")

---

## Claude's Decisions (All Areas)

### Integration Test Architektur
- **Decision:** Bun-Tests mit gemockten Deps, co-located, *.integration.test.ts Naming
- **Alternative considered:** Laufender Server + DB noetig (rejected: REQUIREMENTS.md schliesst Playwright E2E aus, DI-Pattern reicht)

### E2E Module Integration (TEST-01)
- **Decision:** Single Multi-Step Test: Register → AI System → Tool → Permission → Execute → Cost Log
- **Key insight:** Alle Einzelteile als Unit Tests vorhanden, nur die Verdrahtung fehlt

### Hanko Auth Flow (TEST-02)
- **Decision:** Middleware-Level Tests mit gemocktem verifyToken
- **Alternative considered:** Gegen echte Hanko-Instanz testen (rejected: Framework-Layer, nicht aenderbar)

### CLAUDE.md Update (CON-03)
- **Decision:** Gezieltes Section-Update (Versionen, Status, Struktur) — kein Rewrite
- **Alternative considered:** Komplettes Rewrite (rejected: 5-10x Aufwand, bestehende Doku ist strukturell korrekt)

## Deferred Ideas

None.
