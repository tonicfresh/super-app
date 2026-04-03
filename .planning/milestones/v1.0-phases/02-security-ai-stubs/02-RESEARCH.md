# Phase 2: Security & AI Stubs - Research

**Researched:** 2026-04-03
**Domain:** Security middleware wiring, AI system callback implementation, Hono/Drizzle/Framework integration
**Confidence:** HIGH

## Summary

Phase 2 schliesst die kritischsten Luecken in der Super-App: Die deaktivierte Permission-Middleware (HACK) wird reaktiviert, Hanko-Token-Fehler werden granular behandelt, und alle 6 gestubten AI-System-Callbacks (`getSecret`, `getSetting`, `dbInsert`, `queryDailyTotal`, `queryModuleDaily`, `checkModuleAccess`) werden an echte Implementierungen angebunden. Zusaetzlich wird die Model-Selection verdrahtet und die hardcoded Pricing-Tabelle durch Settings ersetzt.

Die Codebase hat bereits alle notwendigen Bausteine implementiert — `createDrizzleCostQueries()` in `cost-queries.ts`, `hasPermission()` in Framework-Permissions, `getSecret()` im Framework-Crypt-Modul, `getProviderModel()` in Providers. Die Arbeit besteht aus Wiring (Closures mit DB/TenantId erstellen) und Absicherung (Error Handling, Caching), nicht aus Neuentwicklung.

**Primary recommendation:** Pro Requirement eine eigene Datei oder Closure-Factory erstellen, die beim Server-Start in `index.ts` die Framework-Funktionen mit DB-Instanz und TenantId bindet. Keine globalen Singletons — alles ueber das bestehende Dependency-Injection-Pattern (Deps-Objekte).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Super-App-eigene Permission-Middleware in `template/backend/src/auth/` erstellen, die `hasPermission()` aus dem Framework importiert und in der Route-Chain anwendet. Framework-Code (Sub-Submodule) wird NICHT geaendert.
- **D-02:** Die Framework-Funktion `hasPermission(userId, method, path)` in `framework/src/lib/auth/permissions.ts` ist voll funktional mit Cache (`refreshPermissionsCache`). Darauf aufbauen, nicht neu erfinden.
- **D-03:** Permission-Cache aus dem Framework nutzen — keine eigene Cache-Schicht. Framework hat bereits Redis-Cache mit In-Memory-Fallback.
- **D-04:** Try-catch um `verifyHankoToken(c)` in der Auth-Middleware mit spezifischen Error Responses: 401 fuer expired/invalid Token, 503 fuer Hanko-Service-Down. Kein Stack-Leak in Responses.
- **D-05:** Da Framework nicht aenderbar: Super-App-Wrapper mit zusaetzlicher Fehler-Differenzierung.
- **D-06:** `getSecret` an Framework's `getSecret(name, tenantId)` aus `framework/src/lib/crypt/index.ts` anbinden. TenantId wird beim Server-Start als Closure erfasst.
- **D-07:** `getSetting` als App-Level Service implementieren, der gegen `base_server_settings` Tabelle (key/value) abfragt via Drizzle.
- **D-08:** `dbInsert`, `queryDailyTotal`, `queryModuleDaily` an die existierende `createDrizzleCostQueries()` Helper-Funktion in `ai/cost-queries.ts` anbinden.
- **D-09:** Caching fuer queryDailyTotal/queryModuleDaily mit dem bestehenden Redis-Cache (Framework) + In-Memory-Fallback. TTL: 5 Minuten fuer Tages-Totals, 1 Minute fuer Modul-Queries.
- **D-10:** `checkModuleAccess` gegen die Permissions-Tabelle implementieren statt `always true`. Nutzt die gleiche `hasPermission()` Infrastruktur wie SEC-01.
- **D-11:** `model: null as any` ersetzen durch Aufruf von `getProviderModel("chat", getSetting)` aus `ai/providers.ts`.
- **D-12:** Graceful Handling wenn keine API Keys konfiguriert: Default auf `DEFAULT_MODELS` Fallback. Wenn gar kein Provider verfuegbar: AI-System startet, aber Agent-Aufrufe geben klaren Fehler statt Server-Crash.
- **D-13:** Hardcoded Pricing-Tabelle in `ai/init.ts` ersetzen durch `getSetting("ai.pricing")`. Fallback auf aktuelle hardcoded Werte wenn Setting nicht gesetzt.
- **D-14:** Cache mit 24h TTL fuer Pricing.

### Claude's Discretion
- Reihenfolge der Implementierung innerhalb der Plaene
- Konkreter Error-Response-Body fuer Hanko-Fehler
- Ob getSetting einen generischen JSON-Parser braucht oder spezifisch fuer Pricing
- Cache-Eviction-Strategie fuer Permission-Cache bei Rechteaenderungen

### Deferred Ideas (OUT OF SCOPE)
None — Analyse blieb innerhalb des Phase-Scopes.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | Permission-Middleware reaktivieren | Framework `hasPermission()` ist voll funktional (Zeile 89-116 in permissions.ts). Super-App-Wrapper noetig weil Framework-Code nicht aenderbar. |
| SEC-02 | Hanko Token Verification mit Fallback Error Handling | `authAndSetUsersInfo` hat bereits try-catch mit generischem 401. Super-App-Wrapper differenziert zwischen expired/invalid (401) und service-down (503). |
| AI-01 | getSecret/getSetting an Framework anbinden | `getSecret(name, tenantId)` in `framework/src/lib/crypt/index.ts`. `getSetting` muss neu gegen `base_server_settings` Tabelle (key/value mit unique index auf key). |
| AI-02 | dbInsert fuer Cost-Logging an Drizzle anbinden | `createDrizzleCostQueries()` in `cost-queries.ts` liefert alle noetige Funktionen. Braucht `db` (via `getDb()`) und `mcAiCosts` Schema. |
| AI-03 | checkModuleAccess gegen Permissions implementieren | Nutzt `hasPermission()` Pattern mit `<module>:read` Scope. |
| AI-04 | Model-Selection aus Provider-Registry laden | `getProviderModel("chat", getSetting)` liefert "provider:model" String. Provider-Registry's `languageModel()` loest auf. |
| AI-06 | Cost-Pricing aus Settings laden statt hardcoded | `getSetting("ai.pricing")` als JSON-String. Fallback auf bestehende hardcoded Werte. 24h Cache. |
| AI-07 | queryDailyTotal/queryModuleDaily Caching | Redis-Cache (Framework) + In-Memory-Fallback Pattern wiederverwenden. TTL 5min/1min. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Validation:** Valibot (NICHT Zod!) — konsistent durch gesamte Codebase
- **ORM:** Drizzle ORM, NIEMALS raw SQL
- **Framework:** Sub-Submodule, nicht direkt aenderbar (nur Super-App Code)
- **Table Creator:** `pgTableCreator` pro Modul (Framework: `base_*`, App: `app_*`, Module: `<modul>_*`)
- **Backward Compatibility:** Bestehende Module (mission-control, todos) muessen weiter funktionieren
- **Code Style:** Variablen/Funktionen Englisch, Kommentare Deutsch, TypeScript strict
- **Naming:** `create[Service]()` fuer Service-Factories, `define[Feature]Routes()` fuer Route-Handler

## Standard Stack

Keine neuen Pakete noetig. Alles ist bereits in der Codebase verfuegbar.

### Core (bereits installiert)
| Library | Version | Purpose | Why Used |
|---------|---------|---------|----------|
| Hono.js | 4.10.1 | HTTP middleware chain fuer Permission/Auth | Bestehende Middleware-Pattern |
| Drizzle ORM | 0.44.6 | DB-Queries fuer Settings, Cost-Insert, Permissions | Bestehende Schema-Definitionen |
| Vercel AI SDK | 6.0.143 | Provider Registry, `languageModel()` Aufloesung | Bestehende Provider-Architektur |
| Valibot | 1.3.1 | Input-Validierung Settings | Bestehende Validierungs-Pattern |

### Framework-Funktionen (importierbar, nicht aenderbar)
| Function | Import Path | Purpose |
|----------|-------------|---------|
| `hasPermission(userId, method, path)` | `@framework/lib/auth/permissions` | Permission-Check mit Cache |
| `refreshPermissionsCache()` | `@framework/lib/auth/permissions` | Cache-Neuaufbau |
| `getSecret(name, tenantId)` | `@framework/lib/crypt/index` | Verschluesselte Secrets aus DB |
| `setSecret(data)` | `@framework/lib/crypt/index` | Secret in DB speichern |
| `getDb()` | `@framework/lib/db/db-connection` | Drizzle DB-Instanz |
| `serverSettings` | `@framework/lib/db/schema/server` | `base_server_settings` Tabelle |
| `getCachedToken` / `setCachedToken` | `@framework/lib/utils/redis-cache` | Redis/In-Memory Cache |

## Architecture Patterns

### Recommended Changes Structure
```
template/backend/src/
├── auth/
│   └── permission-middleware.ts   # NEU: Super-App Permission Wrapper (SEC-01)
│   └── auth-error-handler.ts     # NEU: Hanko Error Differentiation (SEC-02)
├── services/
│   └── settings-service.ts       # NEU: getSetting() gegen base_server_settings (AI-01)
├── ai/
│   ├── init.ts                   # AENDERN: Pricing aus Settings (AI-06)
│   ├── cost-queries.ts           # UNGEAENDERT: createDrizzleCostQueries bleibt
│   └── providers.ts              # UNGEAENDERT: getProviderModel bleibt
├── index.ts                      # AENDERN: Stubs durch echte Closures ersetzen
```

### Pattern 1: Closure-Binding bei Server-Start
**What:** Framework-Funktionen die `tenantId` oder `db` brauchen werden beim Server-Start via Closure gebunden.
**When to use:** Ueberall wo gestubte Callbacks in `index.ts` verdrahtet werden.
**Example:**
```typescript
// In index.ts — getSecret Closure erstellen
import { getSecret as frameworkGetSecret } from "@framework/lib/crypt/index";

const defaultTenantId = "default"; // Aus Config oder erstem Tenant
const getSecret = async (name: string) => frameworkGetSecret(name, defaultTenantId);
```

### Pattern 2: Super-App Auth Wrapper (Framework nicht aenderbar)
**What:** Eigene Middleware-Funktion die Framework-Auth importiert aber erweiterte Fehlerbehandlung hinzufuegt.
**When to use:** SEC-01 (Permission) und SEC-02 (Hanko Error).
**Example:**
```typescript
// template/backend/src/auth/permission-middleware.ts
import { hasPermission } from "@framework/lib/auth/permissions";
import type { Context } from "hono";

export async function checkPermission(c: Context, next: Function) {
  const userId = c.get("usersId");
  const method = c.req.method;
  const path = c.req.path;
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const allowed = await hasPermission(userId, method, path);
  if (!allowed) {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  await next();
}
```

### Pattern 3: getSetting Service mit Cache
**What:** Generischer Settings-Service der `base_server_settings` abfragt und JSON parsen kann.
**When to use:** AI-01 (getSetting), AI-06 (Pricing), Guardrails-Config.
**Example:**
```typescript
// template/backend/src/services/settings-service.ts
import { getDb } from "@framework/lib/db/db-connection";
import { serverSettings } from "@framework/lib/db/schema/server";
import { eq } from "drizzle-orm";

// In-Memory Cache mit TTL
const cache = new Map<string, { value: string | null; expiresAt: number }>();

export function createSettingsService(defaultTtlMs: number = 60_000) {
  return {
    getSetting: async (key: string): Promise<string | null> => {
      const cached = cache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
      
      const result = await getDb()
        .select({ value: serverSettings.value })
        .from(serverSettings)
        .where(eq(serverSettings.key, key))
        .limit(1);
      
      const value = result[0]?.value ?? null;
      cache.set(key, { value, expiresAt: Date.now() + defaultTtlMs });
      return value;
    },
    
    invalidate: (key: string) => cache.delete(key),
    invalidateAll: () => cache.clear(),
  };
}
```

### Pattern 4: Cost Query Caching Wrapper
**What:** Wickelt `createDrizzleCostQueries()` mit TTL-basiertem Cache.
**When to use:** AI-07 (queryDailyTotal/queryModuleDaily Caching).
**Example:**
```typescript
function withCache<T>(fn: (...args: any[]) => Promise<T>, ttlMs: number) {
  const cache = new Map<string, { value: T; expiresAt: number }>();
  return async (...args: any[]): Promise<T> => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const value = await fn(...args);
    cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  };
}
```

### Anti-Patterns to Avoid
- **Framework-Code aendern:** Sub-Submodule. Die `checkUserPermission` HACK-Funktion in `hono-middlewares.ts` bleibt wie sie ist — wir erstellen eine eigene in der Super-App.
- **Globale Singletons statt DI:** Kein `let _globalSettings` — immer ueber Deps-Objekte.
- **Raw SQL:** Drizzle ORM hat alles was noetig ist, inklusive `serverSettings` Schema.
- **Cache ohne TTL:** Jeder Cache MUSS eine TTL haben. In-Memory Map mit `expiresAt` als Minimum.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Permission checking | Eigene Permissions-Logik | `hasPermission()` aus Framework | Bereits mit Cache, Regex-Matching, Group-Resolution |
| Secret encryption | Eigene AES-Verschluesselung | `getSecret()`/`setSecret()` aus Framework | AES-256 bereits implementiert mit Env-basiertem Key |
| Cost DB queries | Eigene SQL-Aggregationen | `createDrizzleCostQueries()` | SUM, COUNT, Zeitraum-Filter alles fertig |
| Model resolution | Eigene Provider-Logik | `getProviderModel()` + Registry `languageModel()` | Settings-Fallback auf DEFAULT_MODELS eingebaut |
| Redis cache | Eigene Redis-Anbindung | Framework `redis-cache.ts` Pattern | Auto-Fallback auf In-Memory wenn Redis nicht da |

**Key insight:** Alles existiert bereits — die Phase verbindet nur bestehende Bausteine. Neue Logik beschraenkt sich auf Closures, Caching-Wrapper und Error-Differenzierung.

## Common Pitfalls

### Pitfall 1: DB nicht verfuegbar bei AI-System-Init
**What goes wrong:** `initAI()` und `createAISystem()` werden VOR `defineServer()` aufgerufen (Zeile 48-92 in index.ts). Die DB-Verbindung wird erst in `defineServer()` erstellt.
**Why it happens:** `getDb()` wirft wenn der Client noch nicht initialisiert ist.
**How to avoid:** Lazy-Evaluation: Closures die `getDb()` erst beim ersten Aufruf resolvieren, nicht bei der Definition. Oder: `createDatabaseClient()` explizit vor `initAI()` aufrufen.
**Warning signs:** `"Database client not initialized"` Error beim Server-Start.

### Pitfall 2: TenantId-Binding fuer getSecret
**What goes wrong:** Framework's `getSecret(name, tenantId)` braucht eine TenantId. Beim Server-Start ist noch kein User-Context da.
**Why it happens:** AI-System wird statisch initialisiert, nicht pro Request.
**How to avoid:** Default-TenantId aus der DB laden (erster Tenant) oder aus Env-Variable. Fuer Multi-Tenant spaeter: TenantId pro AI-Session.
**Warning signs:** `getSecret` gibt null zurueck obwohl Secrets gesetzt sind — weil TenantId nicht stimmt.

### Pitfall 3: checkUserPermission HACK im Framework
**What goes wrong:** Die Framework-Middleware `checkUserPermission` ist deaktiviert (`await next()` ohne Check). Wenn man sie in der Route-Chain laesst UND eine eigene Permission-Middleware hinzufuegt, wird Permission doppelt (oder gar nicht) geprueft.
**Why it happens:** Framework-Code ist nicht aenderbar.
**How to avoid:** Die eigene `checkPermission` Middleware ERSETZT `checkUserPermission` in der Route-Chain. In `index.ts` die Import-Quelle aendern: `import { checkPermission } from "./auth/permission-middleware"` statt aus dem Framework.
**Warning signs:** Alle Requests gehen durch obwohl Permissions gesetzt sind.

### Pitfall 4: Permission-Cache nicht invalidiert
**What goes wrong:** Wenn ein Admin Berechtigungen aendert, zeigt der Cache noch die alten Werte.
**Why it happens:** `permissionsCache` in Framework ist global, `refreshPermissionsCache()` muss explizit aufgerufen werden.
**How to avoid:** Nach jeder Permission-Aenderung (Admin-API) `refreshPermissionsCache()` aufrufen. Alternativ: TTL-basierte Cache-Invalidierung.
**Warning signs:** Berechtigungsaenderungen greifen erst nach Server-Restart.

### Pitfall 5: Model null wenn keine Provider konfiguriert
**What goes wrong:** `getProviderModel()` gibt einen String zurueck (z.B. "anthropic:claude-sonnet-4-5"), aber die Registry hat keinen Anthropic-Provider registriert.
**Why it happens:** Keine API-Keys in Secrets gespeichert.
**How to avoid:** D-12: Pruefung ob Provider-Registry null ist. Wenn ja: AI-System startet, aber `model` ist ein Proxy-Objekt das bei Aufruf einen klaren Fehler wirft statt Server-Crash.
**Warning signs:** Unhandled promise rejection bei AI-Chat-Anfrage.

### Pitfall 6: Pricing-Cache Invalidierung
**What goes wrong:** Pricing in Settings geaendert, aber Cache zeigt 24h lang die alten Werte.
**Why it happens:** 24h TTL ist lang, Pricing-Aenderungen sind selten aber wenn dann kritisch.
**How to avoid:** Cache-Invalidierung ueber die Settings-API triggern. Beim PUT/POST auf Settings den Cache clearen.
**Warning signs:** Kosten-Schaetzungen weichen von echten Kosten ab nach Pricing-Update.

## Code Examples

### index.ts Stub-Verdrahtung (Zentrales Pattern)
```typescript
// VORHER (gestubbt):
getSecret: async (_name) => null,

// NACHHER (verdrahtet):
import { getSecret as frameworkGetSecret } from "@framework/lib/crypt/index";
const tenantId = await resolveDefaultTenantId(); // Aus DB oder Env
getSecret: async (name) => frameworkGetSecret(name, tenantId),
```

### getSetting Implementation
```typescript
// Generischer Service — kann Strings und JSON parsen
const settingsService = createSettingsService();

// Fuer initAI:
getSetting: settingsService.getSetting,

// Fuer Pricing (JSON):
const pricingJson = await settingsService.getSetting("ai.pricing");
const pricing = pricingJson ? JSON.parse(pricingJson) : DEFAULT_PRICING;
```

### Hanko Error Differentiation
```typescript
export async function authWithErrorDifferentiation(c: Context, next: Function) {
  try {
    const { usersEmail, usersId, scopes } = await checkToken(c);
    c.set("usersEmail", usersEmail);
    c.set("usersId", usersId);
    addScopesToContext(c, scopes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    
    // Hanko Service nicht erreichbar
    if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
      return c.json({ error: "Auth service unavailable" }, 503);
    }
    
    // Token expired/invalid
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
}
```

### Model Selection mit Graceful Fallback
```typescript
import { getProviderModel } from "./ai/providers";

const modelString = await getProviderModel("chat", settingsService.getSetting);
// modelString = "anthropic:claude-sonnet-4-5"

if (aiContext.providers.registry) {
  const model = aiContext.providers.registry.languageModel(modelString);
  // Verwende model...
} else {
  // Kein Provider verfuegbar — Proxy-Objekt das klaren Fehler gibt
  const model = createNoProviderProxy();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `checkUserPermission` HACK (await next()) | Super-App eigene Middleware | Diese Phase | Permissions greifen endlich |
| Hardcoded Pricing in init.ts | Settings-basiert mit Cache | Diese Phase | Pricing ohne Code-Aenderung anpassbar |
| AI Callbacks alle gestubbt | Echte Framework-Anbindung | Diese Phase | AI-System funktionsfaehig |
| `model: null as any` | Provider-Registry Model | Diese Phase | Type-safe Model-Aufloesung |

## Open Questions

1. **Default TenantId bei Server-Start**
   - What we know: Framework's `getSecret()` braucht tenantId. Beim Server-Start gibt es keinen User-Context.
   - What's unclear: Wie wird die Default-TenantId bestimmt? Erster Tenant in DB? Env-Variable?
   - Recommendation: Env-Variable `DEFAULT_TENANT_ID` mit Fallback auf ersten Tenant aus DB. Fuer Single-Tenant-Setup (Tobys Nutzung) reicht das.

2. **Permission-Middleware: Ersetzen oder Ergaenzen?**
   - What we know: Framework's `checkUserPermission` ist HACK (tut nichts). Super-App hat eigene.
   - What's unclear: Soll die Framework-Middleware aus der Chain entfernt und durch die eigene ersetzt werden, oder soll die eigene zusaetzlich eingefuegt werden?
   - Recommendation: Ersetzen. In `index.ts` den Import auf die Super-App-eigene Middleware umstellen. Die Framework-HACK-Middleware bleibt im Code aber wird nicht mehr verwendet.

3. **getSetting: Generischer JSON-Parser?**
   - What we know: Pricing ist JSON, andere Settings sind einfache Strings.
   - What's unclear: Ob ein generischer `getSettingJson<T>()` Helper sinnvoll ist.
   - Recommendation: JA. `getSetting()` gibt immer `string | null` zurueck, ein Convenience-Wrapper `getSettingJson<T>(key)` parsed JSON mit try-catch und `null`-Fallback. Einfach, wiederverwendbar.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun Test (native) |
| Config file | none (Bun defaults) |
| Quick run command | `bun test --bail template/backend/src/auth/permission-middleware.test.ts` |
| Full suite command | `bun test template/backend/src/` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | Permission middleware blocks unauthorized access | unit | `bun test template/backend/src/auth/permission-middleware.test.ts -t "blocks"` | Wave 0 |
| SEC-01 | Permission middleware allows authorized access | unit | `bun test template/backend/src/auth/permission-middleware.test.ts -t "allows"` | Wave 0 |
| SEC-02 | Auth wrapper returns 401 for invalid token | unit | `bun test template/backend/src/auth/auth-error-handler.test.ts -t "401"` | Wave 0 |
| SEC-02 | Auth wrapper returns 503 for Hanko down | unit | `bun test template/backend/src/auth/auth-error-handler.test.ts -t "503"` | Wave 0 |
| AI-01 | getSecret returns decrypted value | unit | `bun test template/backend/src/services/settings-service.test.ts -t "getSecret"` | Wave 0 |
| AI-01 | getSetting reads from base_server_settings | unit | `bun test template/backend/src/services/settings-service.test.ts -t "getSetting"` | Wave 0 |
| AI-02 | dbInsert writes to mc_ai_costs | unit | `bun test template/backend/src/ai/cost-queries.test.ts -t "insert"` | Exists (erweitern) |
| AI-03 | checkModuleAccess checks permissions | unit | `bun test template/backend/src/ai/module-access.test.ts -t "module"` | Wave 0 |
| AI-04 | Model resolved from provider registry | unit | `bun test template/backend/src/ai/providers.test.ts -t "model"` | Exists (erweitern) |
| AI-06 | Pricing loaded from settings with fallback | unit | `bun test template/backend/src/ai/init.test.ts -t "pricing"` | Exists (erweitern) |
| AI-07 | Cost queries cached with TTL | unit | `bun test template/backend/src/ai/cost-queries.test.ts -t "cache"` | Exists (erweitern) |

### Sampling Rate
- **Per task commit:** `bun test --bail <changed-files>`
- **Per wave merge:** `bun test template/backend/src/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `template/backend/src/auth/permission-middleware.test.ts` -- covers SEC-01
- [ ] `template/backend/src/auth/auth-error-handler.test.ts` -- covers SEC-02
- [ ] `template/backend/src/services/settings-service.test.ts` -- covers AI-01
- [ ] `template/backend/src/ai/module-access.test.ts` -- covers AI-03

Bestehende Test-Dateien die erweitert werden:
- `template/backend/src/ai/cost-queries.test.ts` -- AI-02, AI-07
- `template/backend/src/ai/providers.test.ts` -- AI-04
- `template/backend/src/ai/init.test.ts` -- AI-06

## Sources

### Primary (HIGH confidence)
- Direct code analysis of all referenced files in the codebase
- `template/backend/framework/src/lib/auth/permissions.ts` -- hasPermission() implementation verified
- `template/backend/framework/src/lib/crypt/index.ts` -- getSecret() signature and behavior verified
- `template/backend/framework/src/lib/db/schema/server.ts` -- base_server_settings schema verified
- `template/backend/src/ai/cost-queries.ts` -- createDrizzleCostQueries() verified
- `template/backend/src/ai/providers.ts` -- getProviderModel() verified
- `template/backend/framework/src/lib/utils/redis-cache.ts` -- Cache pattern verified
- `template/backend/framework/src/lib/utils/hono-middlewares.ts` -- HACK and authAndSetUsersInfo verified

### Secondary (MEDIUM confidence)
- `.planning/codebase/CONCERNS.md` -- Problem descriptions and fix approaches

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- alle Libraries bereits installiert und im Code verifiziert
- Architecture: HIGH -- bestehende DI-Patterns (Deps-Objekte, Closure-Binding) direkt aus der Codebase abgeleitet
- Pitfalls: HIGH -- alle aus direkter Code-Analyse identifiziert (DB-Init-Reihenfolge, TenantId, Cache-Invalidierung)
- Wiring complexity: HIGH -- alle Quell- und Ziel-Funktionen gelesen und Signaturen verifiziert

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stabil -- reine Wiring-Phase, keine externen Dependency-Risiken)
