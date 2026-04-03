# Phase 3: AI System Completion - Context

**Gathered:** 2026-04-03 (assumptions mode — user deferred all decisions to Claude)
**Status:** Ready for planning

<domain>
## Phase Boundary

AI-System vervollstaendigen: Approval Workflow mit DB-Persistenz, Privacy-Schutz gegen ID-Enumeration (Rate Limiting), und vollstaendiges Agent Step Tracking in mc_agent_sessions. Baut auf Phase 2 auf (Stubs sind dann verdrahtet).

</domain>

<decisions>
## Implementation Decisions

### Approval Workflow DB Storage (SEC-03)
- **D-01:** Neues Drizzle-Schema `app_approval_requests` erstellen (mit `app_*` Prefix, da App-Level — nicht `mc_*`). Felder: id, tenantId, userId, toolName, toolArgs, status (pending/approved/denied), createdAt, resolvedAt, resolvedBy.
- **D-02:** Die zwei bestehenden Approval-Implementierungen konsolidieren: `ai/approval.ts` (In-Memory Map, genutzt von createAISystem) und `services/approval.ts` (Push/SSE Integration). Zusammenfuehren zu einer einzigen Implementierung mit DB-Backend und Event-Emitting.
- **D-03:** `storeApprovalRequest`, `updateApprovalRequest` Stubs in index.ts an die konsolidierte Approval-Service anbinden. `notifyUser` an die bestehende Push/SSE-Infrastruktur aus `services/approval.ts` anbinden.

### Privacy ID-Enumeration Protection (SEC-04)
- **D-04:** Rate Limiting als Hono-Middleware implementieren — keine bestehende Rate-Limiting-Infrastruktur vorhanden (grep: 0 Treffer). Middleware schuetzt ID-basierte Endpoints (Tool-Aufrufe, Approval-Routes, Modul-Routes).
- **D-05:** In-Memory Rate Limiter mit Sliding Window (kein Redis noetig fuer v1). Konfigurierbar: max Requests pro Zeitfenster pro User+Endpoint. Default: 60/min fuer normale Endpoints, 10/min fuer sensitive Operations.
- **D-06:** Keine ID-Obscuration noetig — Codebase nutzt bereits UUIDs und nanoid ueberall (kein sequenzielles Auto-Increment). UUIDs sind nicht enumerable.

### Agent Step Tracking (AI-05)
- **D-07:** `logAgentStepToDB` Stub verdrahten mit INSERT in `mc_agent_sessions` Tabelle. Session-Row wird beim ersten Step erstellt (INSERT), danach bei jedem weiteren Step aktualisiert (UPDATE: steps++, tokensUsed+=, toolCalls append, status update).
- **D-08:** Session-ID beim `createMainAgent()` Aufruf generieren (nicht pro Step). Wird als Closure durch die gesamte Agent-Ausfuehrung weitergegeben.
- **D-09:** Schema-Mapping: AgentStepLog.agentType → agent_type, tokensInput+tokensOutput → tokens_used (kumuliert), toolCalls → tool_calls (jsonb array append), status → status. completedAt wird beim letzten Step gesetzt.

### Claude's Discretion
- Exakte Rate-Limit-Werte (koennen spaeter per Settings angepasst werden)
- Approval-Request Timeout-Verhalten (auto-deny nach X Minuten?)
- Ob mc_agent_sessions.tool_calls als flaches Array oder verschachtelt gespeichert wird
- Fehlerbehandlung wenn Approval-DB-Write fehlschlaegt (retry vs. in-memory fallback)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### AI System
- `docs/superpowers/plans/2026-04-02-phase5-mission-control.md` — Mission Control Plan mit Agent Session Tracking und Approval Workflow
- `docs/superpowers/plans/2026-04-02-phase3-ai-agent-system.md` — AI Agent System Plan mit Privacy und Approval Design

### Existing Code
- `template/backend/src/ai/approval.ts` — In-Memory ApprovalManager (zu konsolidieren)
- `template/backend/src/services/approval.ts` — Push/SSE Approval Service (zu konsolidieren)
- `template/backend/src/ai/privacy.ts` — Privacy-System (Sanitization, kein Rate Limiting)
- `template/backend/src/ai/main-agent.ts` — AgentStepLog Interface (lines 10-23), onStepFinish Callback
- `modules/mission-control/backend/src/db/schema.ts` — mc_agent_sessions Tabelle (Session-Level Schema)

### Requirements
- `.planning/REQUIREMENTS.md` — SEC-03, SEC-04, AI-05

### Prior Phases
- `.planning/phases/01-type-safety-consistency/01-CONTEXT.md` — Schema-Prefix Konvention (app_* fuer App-Level)
- `.planning/phases/02-security-ai-stubs/02-CONTEXT.md` — Permission-Middleware, getSecret/getSetting verdrahtet

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `template/backend/src/ai/approval.ts` — ApprovalManager mit Request-Lifecycle (create, wait, resolve) — Logik wiederverwenden
- `template/backend/src/services/approval.ts` — Push-Notification und SSE-Event Integration — Event-Emitting wiederverwenden
- `modules/mission-control/backend/src/db/schema.ts` — mc_agent_sessions mit steps, tokensUsed, toolCalls, status, completedAt
- `modules/mission-control/frontend/src/stores/agent-sessions.store.ts` — Frontend Store erwartet Session-Level Rows (nicht per-Step)

### Established Patterns
- **Event Emitting**: `emitActivity()` Pattern in services/approval.ts fuer SSE-Push
- **Session vs. Step**: mc_agent_sessions ist Session-Level (eine Row pro Conversation, kumuliert)
- **UUID Primary Keys**: Ueberall UUIDs statt Auto-Increment — keine Enumeration-Gefahr

### Integration Points
- `template/backend/src/index.ts:76-84` — Die 3 verbleibenden Stubs (logAgentStep, storeApproval, updateApproval)
- `template/backend/src/ai/index.ts:91` — createMainAgent() Aufruf wo Session-ID generiert wird
- `template/backend/src/ai/main-agent.ts:139-176` — onStepFinish Callback der logAgentStep aufruft

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

*Phase: 03-ai-system-completion*
*Context gathered: 2026-04-03*
