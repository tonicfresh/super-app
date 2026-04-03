# Phase 2: Security & AI Stubs - Context

**Gathered:** 2026-04-03 (assumptions mode — user deferred all decisions to Claude)
**Status:** Ready for planning

<domain>
## Phase Boundary

Kritische Security-Luecken schliessen (Permission-Middleware, Hanko Error Handling) und alle 6 gestubten AI-System-Callbacks an echte Implementierungen anbinden (getSecret, getSetting, dbInsert, checkModuleAccess, model selection, cost queries). Kein neuer Feature-Code — nur Wiring und Absicherung.

</domain>

<decisions>
## Implementation Decisions

### Permission Middleware (SEC-01)
- **D-01:** Super-App-eigene Permission-Middleware in `template/backend/src/auth/` erstellen, die `hasPermission()` aus dem Framework importiert und in der Route-Chain anwendet. Framework-Code (Sub-Submodule) wird NICHT geaendert.
- **D-02:** Die Framework-Funktion `hasPermission(userId, method, path)` in `framework/src/lib/auth/permissions.ts` ist voll funktional mit Cache (`refreshPermissionsCache`). Darauf aufbauen, nicht neu erfinden.
- **D-03:** Permission-Cache aus dem Framework nutzen — keine eigene Cache-Schicht. Framework hat bereits Redis-Cache mit In-Memory-Fallback.

### Hanko Error Handling (SEC-02)
- **D-04:** Try-catch um `verifyHankoToken(c)` in der Auth-Middleware mit spezifischen Error Responses: 401 fuer expired/invalid Token, 503 fuer Hanko-Service-Down. Kein Stack-Leak in Responses.
- **D-05:** Die `authAndSetUsersInfo` Middleware in `hono-middlewares.ts:123-132` hat bereits try-catch mit 401 — pruefen ob das Framework-Level reicht oder ob Super-App-Level granularere Fehlerbehandlung braucht. Da Framework nicht aenderbar: Super-App-Wrapper mit zusaetzlicher Fehler-Differenzierung.

### getSecret/getSetting Wiring (AI-01)
- **D-06:** `getSecret` an Framework's `getSecret(name, tenantId)` aus `framework/src/lib/crypt/index.ts` anbinden. TenantId wird beim Server-Start als Closure erfasst (aus Config oder erstem Tenant).
- **D-07:** `getSetting` als App-Level Service implementieren, der gegen `base_server_settings` Tabelle (key/value) abfragt via Drizzle. Kein Framework-Equivalent vorhanden.

### Cost DB Operations (AI-02, AI-07)
- **D-08:** `dbInsert`, `queryDailyTotal`, `queryModuleDaily` an die existierende `createDrizzleCostQueries()` Helper-Funktion in `ai/cost-queries.ts` anbinden — die Implementierung existiert bereits vollstaendig.
- **D-09:** Caching fuer queryDailyTotal/queryModuleDaily mit dem bestehenden Redis-Cache (Framework) + In-Memory-Fallback. TTL: 5 Minuten fuer Tages-Totals, 1 Minute fuer Modul-Queries.

### Module Access Check (AI-03)
- **D-10:** `checkModuleAccess` gegen die Permissions-Tabelle implementieren statt `always true`. Nutzt die gleiche `hasPermission()` Infrastruktur wie SEC-01.

### Model Selection (AI-04)
- **D-11:** `model: null as any` ersetzen durch Aufruf von `getProviderModel("chat", getSetting)` aus `ai/providers.ts`. Das liefert einen `"provider:model"` String der ueber die Provider-Registry's `languageModel()` Methode aufgeloest wird.
- **D-12:** Graceful Handling wenn keine API Keys konfiguriert: Default auf `DEFAULT_MODELS` Fallback (bereits in providers.ts implementiert). Wenn gar kein Provider verfuegbar: AI-System startet, aber Agent-Aufrufe geben klaren Fehler statt Server-Crash.

### Cost Pricing aus Settings (AI-06)
- **D-13:** Hardcoded Pricing-Tabelle in `ai/init.ts` ersetzen durch `getSetting("ai.pricing")`. Wert als serialisierter JSON-String in `base_server_settings` speichern. Fallback auf aktuelle hardcoded Werte wenn Setting nicht gesetzt.
- **D-14:** Cache mit 24h TTL fuer Pricing — aendert sich selten.

### Claude's Discretion
- Reihenfolge der Implementierung innerhalb der Plaene
- Konkreter Error-Response-Body fuer Hanko-Fehler
- Ob getSetting einen generischen JSON-Parser braucht oder spezifisch fuer Pricing
- Cache-Eviction-Strategie fuer Permission-Cache bei Rechteaenderungen

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Security
- `docs/superpowers/plans/2026-04-02-phase2-auth-security.md` — Auth & Security Plan mit Permission-System und Hanko-Integration
- `.planning/codebase/CONCERNS.md` §2 (Disabled Permission Middleware), §Security 1 (Hanko Token)

### AI System
- `docs/superpowers/plans/2026-04-02-phase4-ai-providers-cost.md` — AI Provider Registry und Cost Tracking Plan
- `.planning/codebase/CONCERNS.md` §1 (Incomplete AI Init — 7 TODOs)

### Existing Code
- `template/backend/src/ai/cost-queries.ts` — Bereits implementierte Drizzle Cost Queries (createDrizzleCostQueries)
- `template/backend/src/ai/providers.ts` — Provider Registry mit getProviderModel und DEFAULT_MODELS
- `template/backend/framework/src/lib/auth/permissions.ts` — hasPermission() Funktion mit Cache

### Requirements
- `.planning/REQUIREMENTS.md` — SEC-01, SEC-02, AI-01 bis AI-04, AI-06, AI-07

### Prior Phase
- `.planning/phases/01-type-safety-consistency/01-CONTEXT.md` — LanguageModelWithMeta Type (D-01), Framework nicht aenderbar (D-04)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `template/backend/src/ai/cost-queries.ts` — `createDrizzleCostQueries()` mit vollstaendigen SQL-Aggregationen fuer Daily Totals und Per-Module Queries
- `template/backend/src/ai/providers.ts` — `getProviderModel()` mit Settings-Fallback auf DEFAULT_MODELS
- `template/backend/framework/src/lib/auth/permissions.ts` — `hasPermission()` mit Permission-Cache
- `template/backend/framework/src/lib/crypt/index.ts` — `getSecret(name, tenantId)` mit AES-Verschluesselung
- `template/backend/framework/src/lib/utils/redis-cache.ts` — Redis-Cache mit In-Memory-Fallback

### Established Patterns
- **Dependency Injection**: Alle AI-System-Callbacks sind als Deps-Objekt in `createAISystem()` injiziert
- **Closure Pattern**: TenantId-Binding bei Server-Start fuer Framework-Funktionen
- **Framework Re-use**: Immer Framework-Funktionen importieren statt neu bauen

### Integration Points
- `template/backend/src/index.ts:48-90` — Alle 7 Stub-Callbacks die verdrahtet werden muessen
- `template/backend/src/ai/init.ts:58-82` — Hardcoded Pricing-Tabelle
- `template/backend/framework/src/lib/db/schema/server.ts` — `base_server_settings` Tabelle

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

*Phase: 02-security-ai-stubs*
*Context gathered: 2026-04-03*
