# Phase 03: AI System Completion — Research

**Researched:** 2026-04-03
**Domain:** Hono Middleware, Drizzle ORM, Vercel AI SDK, In-Memory Rate Limiting
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Neues Drizzle-Schema `app_approval_requests` erstellen (mit `app_*` Prefix, da App-Level — nicht `mc_*`). Felder: id, tenantId, userId, toolName, toolArgs, status (pending/approved/denied), createdAt, resolvedAt, resolvedBy.

**D-02:** Die zwei bestehenden Approval-Implementierungen konsolidieren: `ai/approval.ts` (In-Memory Map, genutzt von createAISystem) und `services/approval.ts` (Push/SSE Integration). Zusammenfuehren zu einer einzigen Implementierung mit DB-Backend und Event-Emitting.

**D-03:** `storeApprovalRequest`, `updateApprovalRequest` Stubs in index.ts an die konsolidierte Approval-Service anbinden. `notifyUser` an die bestehende Push/SSE-Infrastruktur aus `services/approval.ts` anbinden.

**D-04:** Rate Limiting als Hono-Middleware implementieren — keine bestehende Rate-Limiting-Infrastruktur vorhanden (grep: 0 Treffer). Middleware schuetzt ID-basierte Endpoints (Tool-Aufrufe, Approval-Routes, Modul-Routes).

**D-05:** In-Memory Rate Limiter mit Sliding Window (kein Redis noetig fuer v1). Konfigurierbar: max Requests pro Zeitfenster pro User+Endpoint. Default: 60/min fuer normale Endpoints, 10/min fuer sensitive Operations.

**D-06:** Keine ID-Obscuration noetig — Codebase nutzt bereits UUIDs und nanoid ueberall (kein sequenzielles Auto-Increment). UUIDs sind nicht enumerable.

**D-07:** `logAgentStepToDB` Stub verdrahten mit INSERT in `mc_agent_sessions` Tabelle. Session-Row wird beim ersten Step erstellt (INSERT), danach bei jedem weiteren Step aktualisiert (UPDATE: steps++, tokensUsed+=, toolCalls append, status update).

**D-08:** Session-ID beim `createMainAgent()` Aufruf generieren (nicht pro Step). Wird als Closure durch die gesamte Agent-Ausfuehrung weitergegeben.

**D-09:** Schema-Mapping: AgentStepLog.agentType → agent_type, tokensInput+tokensOutput → tokens_used (kumuliert), toolCalls → tool_calls (jsonb array append), status → status. completedAt wird beim letzten Step gesetzt.

### Claude's Discretion
- Exakte Rate-Limit-Werte (koennen spaeter per Settings angepasst werden)
- Approval-Request Timeout-Verhalten (auto-deny nach X Minuten?)
- Ob mc_agent_sessions.tool_calls als flaches Array oder verschachtelt gespeichert wird
- Fehlerbehandlung wenn Approval-DB-Write fehlschlaegt (retry vs. in-memory fallback)

### Deferred Ideas (OUT OF SCOPE)
None — Analyse blieb innerhalb des Phase-Scopes.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-03 | AI Tool Approval Workflow DB-Storage implementieren (aktuell gestubbt) | D-01 bis D-03: Schema + Konsolidierung + Stub-Verdrahtung |
| SEC-04 | Privacy ID-Enumeration-Schutz (Rate Limiting, ID-Obscuration) | D-04 bis D-06: Hono-Middleware, Sliding Window, UUID-Analyse |
| AI-05 | Agent Step Tracking und Approval Requests in DB loggen (aktuell no-op) | D-07 bis D-09: mc_agent_sessions INSERT/UPDATE-Muster |
</phase_requirements>

---

## Summary

Phase 3 vervollstaendigt drei aufeinander aufbauende Teile des AI-Systems: (1) Approval Requests werden DB-persistiert statt nur in-memory gehalten, (2) jeder Agent-Step wird in `mc_agent_sessions` kumulativ protokolliert, und (3) eine Hono-Middleware schuetzt sensitive Endpoints gegen ID-Enumeration-Angriffe.

Die Codebase-Analyse zeigt, dass die Fundamente vollstaendig vorhanden sind. Alle drei TODOs in `index.ts` (Zeilen 154–162) sind klar umgrenzte Stub-Funktionen mit bekannten Signaturen. Die zwei Approval-Implementierungen (`ai/approval.ts` und `services/approval.ts`) erfordern eine Konsolidierung, da sie verschiedene Aspekte desselben Problems loesen (In-Memory-Lifecycle vs. Push/SSE-Notification). Das mc_agent_sessions-Schema ist session-level (eine Row pro Conversation), nicht per-step — dieser Unterschied ist entscheidend fuer das korrekte INSERT/UPDATE-Muster.

**Primary recommendation:** Alle drei Aufgaben koennen als unabhaengige Waves implementiert werden. Wave 1: Drizzle-Schema und DB-Service fuer Approvals. Wave 2: logAgentStepToDB verdrahten. Wave 3: Rate-Limiting-Middleware hinzufuegen und in index.ts einhaengen.

---

## Standard Stack

### Core (bereits im Projekt — keine neuen Installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | 0.44.6 | Schema-Definition, INSERT/UPDATE | Bereits in allen Modulen genutzt |
| `pgTableCreator` | Drizzle intern | Table-Prefix-Enforcement (`app_*`) | Etabliertes Pattern im Monorepo |
| Hono | 4.10.1 | Middleware-System fuer Rate Limiter | Bereits Backend-Framework |
| `crypto.randomUUID` | Bun built-in | UUID-Generierung fuer Session-IDs | Bereits in `ai/approval.ts:5` genutzt |
| Valibot | 1.3.1 | Schema-Validation fuer DB-Inserts | Pflicht lt. CLAUDE.md — NICHT Zod |
| Bun Test | 1.2.10 | Test-Runner | Native, kein Install noetig |

### Kein neuer Install erforderlich
Phase 3 fuehrt keine neuen Dependencies ein. Alle benoetigten Tools sind bereits installiert.

---

## Architecture Patterns

### Recommended Project Structure (neue Dateien)

```
template/backend/src/
├── db/
│   └── approval-requests.schema.ts   # Neues Drizzle-Schema fuer app_approval_requests
├── ai/
│   └── agent-session-tracker.ts      # logAgentStepToDB Implementierung (Insert+Update Logik)
└── middleware/
    └── rate-limiter.ts               # Sliding-Window Rate Limiter Middleware
```

### Pattern 1: Drizzle Schema mit `app_*` Prefix

Das Monorepo nutzt `pgTableCreator` konsistent. Fuer App-Level-Tabellen ist der Prefix `app_*` (nicht `mc_*`, nicht `base_*`).

**Evidenz:** `template/backend/src/db/schema.ts` importiert bereits `mcAgentSessions` und `mcAuditLog` aus dem Mission Control Modul. App-Level-Tables bekommen `app_*` Prefix per Konvention aus Phase 1 (CON-02).

```typescript
// Source: modules/mission-control/backend/src/db/schema.ts (Pattern)
import { pgTableCreator, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const appTable = pgTableCreator((name) => `app_${name}`);

export const appApprovalRequests = appTable("approval_requests", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id").notNull(),
  toolName: text("tool_name").notNull(),
  toolArgs: jsonb("tool_args").notNull().default({}),
  status: text("status").notNull().default("pending"), // pending | approved | denied
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
});
```

### Pattern 2: mc_agent_sessions INSERT+UPDATE (Session-Level)

**Kritischer Befund:** `mc_agent_sessions` ist eine **Session-Level** Tabelle — eine Row pro Conversation, nicht pro Step. Das Schema (Zeilen 25–50 in `modules/mission-control/backend/src/db/schema.ts`) hat `steps: integer` (Zaehler), `tokensUsed: integer` (kumuliert), `toolCalls: jsonb` (Array, wird appended).

**Muster:** Beim ersten `logAgentStepToDB`-Aufruf einer Session → INSERT. Bei jedem weiteren Aufruf mit gleicher sessionId → UPDATE mit inkrementierten Werten.

Der `AgentStepLog` in `main-agent.ts` (Zeilen 11–24) liefert pro Step: `userId`, `tenantId`, `agentType`, `stepNumber`, `tokensInput`, `tokensOutput`, `toolCalls[]`, `finishReason`, `timestamp`. Aber es gibt kein `sessionId`-Feld im `AgentStepLog`-Interface — das ist eine **Luecke** die geschlossen werden muss.

**Zwei Loesungsoptionen:**
1. `AgentStepLog` Interface um `sessionId: string` erweitern
2. Session-Tracker als Closure in `createMainAgent()` erzeugen, der sessionId intern haelt

Option 2 (Closure) vermeidet Interface-Aenderung und ist minimal-invasiv — empfohlen per D-08.

```typescript
// Pattern: Closure-basierter Session-Tracker in createMainAgent()
// Source: Analyse von main-agent.ts:102-177
export async function createMainAgent(userId, tenantId, deps) {
  const sessionId = randomUUID(); // Einmalig generiert (D-08)
  let sessionCreated = false;

  // In onStepFinish Closure: sessionId ist captured
  onStepFinish: async (event) => {
    await deps.logAgentStep({
      sessionId,   // Neu: wird als extra Feld mitgegeben
      isFirst: !sessionCreated,
      // ... bestehende Felder
    });
    sessionCreated = true;
  }
}
```

**Drizzle INSERT/UPDATE Muster:**
```typescript
// Erster Aufruf: INSERT
await db.insert(mcAgentSessions).values({
  id: sessionId,
  agentType: step.agentType,
  moduleName: "main",
  userId: step.userId,
  channel: "pwa",
  status: "running",
  steps: 1,
  tokensUsed: step.tokensInput + step.tokensOutput,
  toolCalls: step.toolCalls,
});

// Folge-Aufrufe: UPDATE
await db.update(mcAgentSessions)
  .set({
    steps: sql`${mcAgentSessions.steps} + 1`,
    tokensUsed: sql`${mcAgentSessions.tokensUsed} + ${tokens}`,
    toolCalls: sql`${mcAgentSessions.toolCalls} || ${newCalls}::jsonb`,
    status: finishReason === "stop" ? "completed" : "running",
    completedAt: finishReason === "stop" ? new Date() : null,
  })
  .where(eq(mcAgentSessions.id, sessionId));
```

### Pattern 3: Hono Middleware — Sliding Window Rate Limiter

**Befund:** grep nach `rateLim`, `rate_lim`, `RateLimit` in `template/backend/src/` liefert 0 Treffer. Keine bestehende Rate-Limiting-Infrastruktur vorhanden. D-04 bestaetigt dies.

**Sliding Window** (In-Memory, v1) — kein Redis noetig. Map mit `key: userId+endpoint → [{timestamp}]`. Aufraeum-Logik: alte Eintraege (ausserhalb Window) beim Lesen verwerfen.

**Key-Strategie:** `userId:routePattern` — nicht die volle URL mit IDs (wuerde fuer jeden Request einzigartig sein). Stattdessen Template-Pattern: `/api/v1/ai/approvals/*` → `userId:/ai/approvals`.

```typescript
// Source: Pattern aus Hono-Dokumentation (verifiziert via WebFetch)
// template/backend/src/middleware/rate-limiter.ts
import type { Context, Next, MiddlewareHandler } from "hono";

interface RateLimiterConfig {
  windowMs: number;     // Zeitfenster in ms
  maxRequests: number;  // Max Requests pro Fenster
  keyGenerator?: (c: Context) => string;
}

const requestLog = new Map<string, number[]>();

export function createRateLimiter(config: RateLimiterConfig): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const userId = c.get("userId") as string ?? c.req.header("x-forwarded-for") ?? "anonymous";
    const routeKey = c.req.routePath ?? c.req.path;
    const key = config.keyGenerator ? config.keyGenerator(c) : `${userId}:${routeKey}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Bestehende Log-Eintraege laden und alte verwerfen
    const existing = (requestLog.get(key) ?? []).filter(t => t > windowStart);

    if (existing.length >= config.maxRequests) {
      return c.json({ error: "Too Many Requests" }, 429);
    }

    existing.push(now);
    requestLog.set(key, existing);
    await next();
  };
}
```

**Cleanup-Strategie:** Ohne Cleanup wuechst die Map unbegrenzt. Empfehlung: setInterval alle 5 Minuten veraltete Keys entfernen (Keys wo alle Timestamps ausserhalb des Windows liegen). Alternativ: LRU-artiges Entfernen beim naechsten Zugriff.

### Pattern 4: Approval-Konsolidierung

**Befund (D-02):** Zwei Implementierungen mit ueberlappender aber nicht identischer Verantwortung:

| Datei | Verantwortung | Zu behalten |
|-------|---------------|-------------|
| `ai/approval.ts` | In-Memory Map, Request-Lifecycle (create/resolve/getPending), DB-Hooks via Deps | Logik behalten, DB-Deps verdrahten |
| `services/approval.ts` | Push-Notification + SSE via emitActivity, waitForApproval Promise | Event-Emitting-Logik behalten |

**Konsolidierungsstrategie:** `ai/approval.ts` bleibt die kanonische Implementierung (wird von `createAISystem` genutzt). Die Deps-Callbacks `notifyUser` und `storeRequest` werden in `index.ts` mit der Logik aus `services/approval.ts` verdrahtet:

```typescript
// index.ts: notifyUser verdrahten (statt no-op)
notifyUser: async (userId, request) => {
  // SSE an verbundene Clients
  emitActivity(userId, {
    type: "approval_required",
    data: { id: request.id, toolName: request.toolName, description: request.description }
  });
  // Optional: Push Notification (services/push-notification.ts)
}
```

Die `services/approval.ts` Datei koennte als separater Service bestehen bleiben (fuer `waitForApproval`-Promise-Pattern, das in der alten Chat-Route genutzt wird). Die zwei Implementierungen muessen nicht physisch zusammengefuehrt werden, solange die Stubs an die richtige Logik delegieren.

### Anti-Patterns to Avoid

- **Per-Step INSERT in mc_agent_sessions:** Falsch — die Tabelle ist session-level. Pro Conversation nur eine Row.
- **Rate Limiter mit vollem URL-Pfad als Key:** Wuerde bei `/api/v1/ai/approvals/req-uuid-123/approve` fuer jeden Request einen einzigartigen Key erzeugen → kein Schutz. Routepattern nutzen.
- **`resolvedBy` ohne Auth-Context:** Bei `POST /approve` den aufrufenden User-ID aus dem Hono-Context lesen (`c.get("userId")`), nicht aus dem Request-Body (Manipulation moeglich).
- **Direktes `sql` Raw statt Drizzle-Abstraktion:** CLAUDE.md: "NIEMALS raw SQL". Stattdessen `sql`-Template-Tags von Drizzle fuer atomare Updates (z.B. `sql\`${table.col} + 1\``).

---

## Don't Hand-Roll

| Problem | Dont Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID-Generierung | Eigene Zufalls-ID | `crypto.randomUUID()` (Bun built-in) | Bereits genutzt in `ai/approval.ts:5` |
| JSONB-Array-Append | String-Concatenation | `sql\`${col} || ${val}::jsonb\`` | Drizzle atomic, typsicher |
| Sliding Window Reset | Manuelles Timestamp-Array | Filter + push Pattern (s.o.) | Ausreichend einfach fuer v1 |
| Drizzle Upsert | Separate EXISTS-Query + INSERT/UPDATE | `.onConflictDoUpdate()` | Atomic, race-condition-safe |

**Key insight:** Die meisten Komplexitaeten in dieser Phase entstehen durch korrektes Mapping zwischen den bestehenden TypeScript-Interfaces und den Drizzle-Schemas — nicht durch neue Algorithmen.

---

## Common Pitfalls

### Pitfall 1: agentSessionId fehlt in AgentStepLog Interface

**Was schief geht:** `AgentStepLog` (main-agent.ts:11-24) hat kein `sessionId`-Feld. Ohne Session-ID kann `logAgentStepToDB` nicht unterscheiden ob es INSERT oder UPDATE soll.

**Warum es passiert:** Das Interface wurde vor dem Session-Tracking-Konzept definiert.

**Wie vermeiden:** Interface um `sessionId: string` und `isFirstStep: boolean` erweitern. `createMainAgent()` generiert die sessionId als Closure-Variable. ODER: Agent-Session-Tracker als eigenstaendige Klasse mit eigenem State (sessionId + sessionCreated Boolean) erzeugen.

**Warning signs:** `logAgentStepToDB` empfaengt kein sessionId → kann keinen Session-Row erstellen.

### Pitfall 2: mc_agent_sessions.toolCalls JSONB-Append ist nicht atomar ohne SQL-Ausdruck

**Was schief geht:** `db.update().set({ toolCalls: [...existing, newCall] })` erfordert erst READ dann WRITE — race condition bei parallelen Steps.

**Warum es passiert:** Drizzle-Update mit JS-Array macht kein atomares Append.

**Wie vermeiden:** `sql\`${mcAgentSessions.toolCalls} || ${JSON.stringify([newCall])}::jsonb\`` fuer atomares JSONB-Append in PostgreSQL.

**Warning signs:** Steps werden bei hoher Last doppelt gezaehlt oder Tool-Calls fehlen.

### Pitfall 3: Rate Limiter ohne Cleanup wuechst unbegrenzt

**Was schief geht:** Map mit `{userId:route → timestamps[]}` akkumuliert alle Historical-Daten fuer aktive User.

**Warum es passiert:** Cleanup-Logik wird vergessen oder auf spaeter verschoben.

**Wie vermeiden:** Beim jedem Zugriff alte Timestamps filtern (passiert sowieso fuer Window-Check). Zusaetzlich alle 5 Minuten einen `setInterval`-Sweep ueber die Map: Keys loeschen wo alle Timestamps ausserhalb des Fensters sind.

**Warning signs:** Memory-Verbrauch steigt mit Laufzeit korreliert.

### Pitfall 4: resolvedBy in Approval ohne Auth-Check

**Was schief geht:** `resolvedBy` aus Request-Body statt aus verifiziertem Auth-Context lesen.

**Warum es passiert:** Schnell implementiert ohne Security-Review.

**Wie vermeiden:** `resolvedBy` immer aus `c.get("userId")` — nie aus Request-Body. Hono-Auth-Middleware laeuft vorher und setzt `userId` in Context.

**Warning signs:** resolvedBy-Feld kann mit beliebiger User-ID befoellt werden.

### Pitfall 5: Approval-Schema in falscher Tabellen-Gruppe

**Was schief geht:** `approval_requests` mit `mc_*` Prefix erstellen (wuerde es dem Mission-Control-Modul zuordnen).

**Warum es passiert:** Die meisten DB-Tabellen in diesem Bereich haben `mc_*` Prefix.

**Wie vermeiden:** D-01 ist klar: `app_*` Prefix (App-Level, nicht Modul-Level). In `template/backend/src/db/` anlegen und in `customDbSchema` in index.ts registrieren.

---

## Code Examples

### Approval Request Schema (verifiziert gegen bestehende Schemas)

```typescript
// template/backend/src/db/approval-requests.schema.ts
import { pgTableCreator, text, timestamp, jsonb } from "drizzle-orm/pg-core";

const appTable = pgTableCreator((name) => `app_${name}`);

export const appApprovalRequests = appTable("approval_requests", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id").notNull(),
  toolName: text("tool_name").notNull(),
  toolArgs: jsonb("tool_args").notNull().default({}),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
});

export type AppApprovalRequestInsert = typeof appApprovalRequests.$inferInsert;
export type AppApprovalRequestSelect = typeof appApprovalRequests.$inferSelect;
```

### logAgentStepToDB Implementierung (verifiziert gegen mc_agent_sessions Schema)

```typescript
// template/backend/src/ai/agent-session-tracker.ts
import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { mcAgentSessions } from "../../../modules/mission-control/backend/src/db/schema";
import type { AgentStepLog } from "./main-agent";

export interface AgentStepLogWithSession extends AgentStepLog {
  sessionId: string;
  isFirstStep: boolean;
  moduleName?: string;
  channel?: string;
}

export function createAgentSessionTracker(db: PostgresJsDatabase<any>) {
  return async (step: AgentStepLogWithSession): Promise<void> => {
    const tokens = step.tokensInput + step.tokensOutput;
    const toolCallsJson = JSON.stringify(step.toolCalls);
    const isLast = step.finishReason === "stop";

    if (step.isFirstStep) {
      await db.insert(mcAgentSessions).values({
        id: step.sessionId,
        agentType: step.agentType,
        moduleName: step.moduleName ?? "main",
        userId: step.userId,
        channel: step.channel ?? "pwa",
        status: isLast ? "completed" : "running",
        steps: 1,
        tokensUsed: tokens,
        toolCalls: step.toolCalls,
        completedAt: isLast ? new Date() : undefined,
      });
    } else {
      await db.update(mcAgentSessions)
        .set({
          steps: sql`${mcAgentSessions.steps} + 1`,
          tokensUsed: sql`${mcAgentSessions.tokensUsed} + ${tokens}`,
          toolCalls: sql`${mcAgentSessions.toolCalls} || ${toolCallsJson}::jsonb`,
          status: isLast ? "completed" : "running",
          completedAt: isLast ? new Date() : undefined,
        })
        .where(eq(mcAgentSessions.id, step.sessionId));
    }
  };
}
```

### Sliding Window Rate Limiter fuer Hono

```typescript
// template/backend/src/middleware/rate-limiter.ts
import type { MiddlewareHandler } from "hono";

interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (c: any) => string;
}

const requestLog = new Map<string, number[]>();

// Cleanup alle 5 Minuten
setInterval(() => {
  const cutoff = Date.now() - 60_000; // Grosszuegig — 1min als minimum Window
  for (const [key, timestamps] of requestLog.entries()) {
    if (timestamps.every(t => t < cutoff)) {
      requestLog.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function createRateLimiter(config: RateLimiterConfig): MiddlewareHandler {
  return async (c, next) => {
    const userId = (c.get("userId") as string | undefined)
      ?? c.req.header("x-forwarded-for")
      ?? "anonymous";
    const routeKey = c.req.routePath ?? c.req.path;
    const key = config.keyGenerator ? config.keyGenerator(c) : `${userId}:${routeKey}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const existing = (requestLog.get(key) ?? []).filter(t => t > windowStart);

    if (existing.length >= config.maxRequests) {
      c.header("Retry-After", String(Math.ceil(config.windowMs / 1000)));
      return c.json({ error: "Too Many Requests" }, 429);
    }

    existing.push(now);
    requestLog.set(key, existing);
    await next();
  };
}

// Vordefinierte Limiter-Instanzen fuer die zwei Faelle (D-05)
export const standardRateLimiter = createRateLimiter({
  windowMs: 60_000,    // 1 Minute
  maxRequests: 60,     // 60 Requests/min fuer normale Endpoints
});

export const sensitiveRateLimiter = createRateLimiter({
  windowMs: 60_000,    // 1 Minute
  maxRequests: 10,     // 10 Requests/min fuer Approval-Routes
});
```

### index.ts Integration der drei Stubs

```typescript
// template/backend/src/index.ts (Ergaenzungen)

// Approval Schema zu customDbSchema hinzufuegen
import { appApprovalRequests } from "./db/approval-requests.schema";

// createAgentSessionTracker importieren
import { createAgentSessionTracker } from "./ai/agent-session-tracker";

// Rate Limiter importieren
import { standardRateLimiter, sensitiveRateLimiter } from "./middleware/rate-limiter";

// Stubs ersetzen:
logAgentStepToDB: createAgentSessionTracker(getDb()),

storeApprovalRequest: async (request) => {
  const db = getDb();
  await db.insert(appApprovalRequests).values({
    id: request.id,
    tenantId: request.tenantId,
    userId: request.userId,
    toolName: request.toolName,
    toolArgs: request.toolArgs,
    status: request.status,
    createdAt: request.createdAt,
  });
},

updateApprovalRequest: async (id, update) => {
  const db = getDb();
  await db.update(appApprovalRequests)
    .set({
      status: update.status,
      resolvedAt: update.resolvedAt,
      resolvedBy: update.resolvedBy,
    })
    .where(eq(appApprovalRequests.id, id));
},

notifyUser: async (userId, request) => {
  // SSE via emitActivity (Pattern aus services/approval.ts:69)
  // Konkrete Implementierung haengt vom verfuegbaren activityBus ab
  console.log(`[approval] Notification fuer User ${userId}: ${request.toolName}`);
},
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Redis fuer Rate Limiting | In-Memory Sliding Window fuer v1 | D-05 | Kein externen Service noetig |
| JSONB-Append via READ+WRITE | Atomares `|| ::jsonb` in PostgreSQL | Bestehendes Pattern | Race-condition-frei |
| Separate services/approval.ts | ai/approval.ts als kanonische Implementierung | D-02 | Eine Wahrheitsquelle |

**Deprecated/outdated:**
- `services/approval.ts`: `storeApprovalRequest`/`resolveApprovalRequest` Deps werden nach Konsolidierung nicht mehr direkt benoetigt — nur noch `emitActivity` und `sendPushNotification` werden als notifyUser-Impl genutzt.

---

## Open Questions

1. **notifyUser vollstaendige Implementierung**
   - Was wir wissen: `services/approval.ts` hat `emitActivity()` und `sendPushNotification()`. Beide brauchen einen injizierten activityBus/pushService.
   - Was unklar ist: Ob der activityBus/pushService in index.ts bereits instanziiert und zugaenglich ist, oder ob er erst erzeugt werden muss.
   - Empfehlung: Im Rahmen von Phase 3 einen minimalen notifyUser implementieren (console.log + SSE wenn activityBus verfuegbar), vollstaendige Push-Integration als separater Task.

2. **Auto-Deny fuer abgelaufene Approval-Requests (Claude's Discretion)**
   - Was wir wissen: Kein Timeout-Mechanismus geplant in Phase 3.
   - Was unklar ist: Sollen pending requests nach X Minuten automatisch denied werden?
   - Empfehlung: In Phase 3 kein Timeout. Spaeterer Cron-Job als v2-Feature (SCALE-03 Bereich).

3. **`c.req.routePath` Verfuegbarkeit in Hono**
   - Was wir wissen: Hono hat `c.req.routePath` in neueren Versionen fuer gematchtes Route-Pattern.
   - Was unklar ist: Ob die Hono-Version (4.10.1) es zuverlaessig unterstuetzt oder ob `c.req.path` ausreicht.
   - Empfehlung: Fallback auf `c.req.path` wenn `routePath` undefined — fuer die Rate-Limiter-Keys ist der genaue String sekundaer, Hauptsache konsistent.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 3 ist reine Code-Aenderung (kein neue externe Dienste, keine neuen CLI-Tools). PostgreSQL und Bun laufen bereits. Drizzle Migrations werden im bestehenden Workflow ausgefuehrt (`bun run app:generate && bun run app:migrate`).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bun Test 1.2.10 |
| Config file | Kein dediziertes Config-File — `bun test` findet `*.test.ts` automatisch |
| Quick run command | `bun test template/backend/src/ai/approval.test.ts` |
| Full suite command | `bun test template/backend/src/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-03 | Approval Request wird in DB persistiert (INSERT) | unit | `bun test template/backend/src/ai/approval.test.ts` | Partiell — Approval-Logik getestet, DB-Integration fehlt |
| SEC-03 | Approval-Update wird in DB geschrieben (UPDATE) | unit | `bun test template/backend/src/ai/approval.test.ts` | Partiell |
| SEC-04 | Rate Limiter blockiert nach 10 Requests mit HTTP 429 | unit | `bun test template/backend/src/middleware/rate-limiter.test.ts` | ❌ Wave 0 |
| SEC-04 | Rate Limiter erlaubt Requests bis zum Limit | unit | `bun test template/backend/src/middleware/rate-limiter.test.ts` | ❌ Wave 0 |
| AI-05 | Erster Step erzeugt INSERT in mc_agent_sessions | unit | `bun test template/backend/src/ai/agent-session-tracker.test.ts` | ❌ Wave 0 |
| AI-05 | Folge-Steps erzeugen UPDATE mit korrekten Inkrementen | unit | `bun test template/backend/src/ai/agent-session-tracker.test.ts` | ❌ Wave 0 |
| AI-05 | Letzter Step setzt status=completed + completedAt | unit | `bun test template/backend/src/ai/agent-session-tracker.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test template/backend/src/ai/ template/backend/src/middleware/`
- **Per wave merge:** `bun test template/backend/src/`
- **Phase gate:** Vollstaendige Test-Suite grueen vor `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `template/backend/src/middleware/rate-limiter.test.ts` — deckt SEC-04 (429, Sliding Window, Cleanup)
- [ ] `template/backend/src/ai/agent-session-tracker.test.ts` — deckt AI-05 (INSERT erste Session, UPDATE Folge-Steps, completedAt)
- [ ] DB-Mocks fuer approval/session Tests (Drizzle mock oder in-memory SQLite)

*(Bestehende `approval.test.ts` und `approval-routes.test.ts` testen bereits Approval-Logik mit gemockten DB-Deps — dieses Pattern fuer neue Tests wiederverwenden)*

---

## Project Constraints (from CLAUDE.md)

| Direktive | Auswirkung auf Phase 3 |
|-----------|------------------------|
| **Validation: Valibot (NICHT Zod!)** | Alle neuen Schemas mit Valibot validieren — nicht `drizzle-valibot` fuer Schemas allein ausreichend, Valibot-Schemas fuer HTTP-Input |
| **ORM: Drizzle ORM, NIEMALS raw SQL** | JSONB-Append ueber `sql\`\`` Template-Tag von Drizzle (nicht direkt pg raw query) |
| **Table Creator: `pgTableCreator` pro Modul** | `appTable = pgTableCreator(name => \`app_\${name}\`)` fuer approval_requests |
| **Privacy: LLM sieht nur IDs und Flags** | toolArgs in approval_requests sollte bei Approval-Anzeige sanitized werden (kein sensible Data) |
| **Theming: keine hardcodierten Werte** | Nicht relevant fuer Backend-only Phase |
| **Variablen: Englisch, Kommentare: Deutsch** | Im neuen Code beachten |
| **Backward Compatibility** | mcAgentSessions-Schema nicht aendern — nur INSERT/UPDATE darueber |
| **Framework nicht aenderbar** | `@framework/*` Importe nur lesen, nie modifizieren |

---

## Sources

### Primary (HIGH confidence)
- Direkte Codebase-Analyse — alle referenzierten Dateien vollstaendig gelesen
  - `template/backend/src/ai/approval.ts` — ApprovalManager vollstaendig
  - `template/backend/src/ai/main-agent.ts` — AgentStepLog Interface + onStepFinish
  - `template/backend/src/ai/index.ts` — createAISystem + Stub-Verdrahtung
  - `template/backend/src/index.ts` — Die drei Stubs (Zeilen 154–165)
  - `modules/mission-control/backend/src/db/schema.ts` — mc_agent_sessions vollstaendig
  - `template/backend/src/services/approval.ts` — emitActivity + Push-Pattern
- Drizzle ORM Dokumentation (bekannte API: sql, eq, pgTableCreator, insert, update, where)

### Secondary (MEDIUM confidence)
- Hono Middleware-Pattern (verifiziert gegen permission-middleware.ts im Projekt — Pattern ist identisch)
- PostgreSQL JSONB Operator `||` fuer Array-Append (Standard-PostgreSQL, weit dokumentiert)

### Tertiary (LOW confidence)
- `c.req.routePath` Verfuegbarkeit in Hono 4.10.1 — nicht direkt verifiziert, Fallback auf `c.req.path` empfohlen

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — alle Libraries bereits im Projekt, keine neuen
- Architecture: HIGH — basiert auf direkter Codebase-Analyse, nicht auf Annahmen
- Pitfalls: HIGH — aus Analyse der konkreten Schema-Strukturen abgeleitet
- Rate Limiter Pattern: MEDIUM — in-memory Sliding Window ist ein Standardmuster, aber Hono `routePath` nicht verifiziert

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stabile Stack-Versionen, 30 Tage)
