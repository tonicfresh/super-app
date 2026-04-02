# Phase 2: Security & AI Stubs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 02-Security & AI Stubs
**Areas discussed:** Permission Middleware, Hanko Error Handling, getSecret/getSetting, Cost DB, Model Selection, Cost Pricing
**Mode:** User delegated all decisions to Claude ("entscheide selbst, langfristig sinnvoll")

---

## Claude's Decisions (All Areas)

### Permission Middleware (SEC-01)
- **Decision:** Super-App-eigene Middleware die Framework's hasPermission() nutzt
- **Alternative considered:** Framework-Submodule patchen (rejected: Sub-Submodule nicht aenderbar)

### Hanko Error Handling (SEC-02)
- **Decision:** Super-App-Wrapper mit granularer Fehler-Differenzierung (401 vs 503)
- **Alternative considered:** Framework-Level try-catch ausreichend (rejected: nicht granular genug)

### getSecret/getSetting (AI-01)
- **Decision:** Closure mit TenantId fuer getSecret, neuer getSetting Service gegen base_server_settings
- **Alternative considered:** Unified key-value API (rejected: over-engineering fuer den aktuellen Bedarf)

### Cost DB Operations (AI-02, AI-07)
- **Decision:** Existierende createDrizzleCostQueries() anbinden + Redis-Cache mit 5min/1min TTL
- **Alternative considered:** Eigene SQL Queries (rejected: existierende Implementation ist vollstaendig)

### Model Selection (AI-04)
- **Decision:** getProviderModel() + provider registry languageModel()
- **Alternative considered:** Hardcoded Model (rejected: nicht langfristig)

### Cost Pricing (AI-06)
- **Decision:** JSON in base_server_settings + 24h Cache
- **Alternative considered:** Eigene Pricing-Tabelle (rejected: over-engineering)

## Deferred Ideas

None.
