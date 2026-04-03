# Phase 3: AI System Completion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 03-AI System Completion
**Areas discussed:** Approval Workflow, Privacy ID-Enumeration, Agent Step Tracking
**Mode:** User delegated all decisions to Claude ("entscheide selbst, langfristig sinnvoll")

---

## Claude's Decisions (All Areas)

### Approval Workflow (SEC-03)
- **Decision:** Konsolidierung der zwei Approval-Implementierungen + neues app_approval_requests Schema
- **Key insight:** Zwei separate Implementierungen (ai/approval.ts und services/approval.ts) mit unterschiedlichen ApprovalRequest-Interfaces — Wartungs-Albtraum wenn beide bestehen bleiben
- **Alternative considered:** Nur ai/approval.ts mit DB-Backend (rejected: verliert Push/SSE aus services/approval.ts)

### Privacy / Rate Limiting (SEC-04)
- **Decision:** Hono-Middleware mit In-Memory Sliding Window, keine ID-Obscuration
- **Key insight:** Codebase nutzt bereits UUIDs ueberall — Enumeration ist kein realistischer Angriffsvektor
- **Alternative considered:** Redis-basiertes Rate Limiting (rejected: over-engineering fuer v1)

### Agent Step Tracking (AI-05)
- **Decision:** Session-Level Row in mc_agent_sessions, INSERT bei Step 1, UPDATE bei Folge-Steps
- **Key insight:** Frontend Store (agent-sessions.store.ts) erwartet eine Row pro Conversation, nicht pro Step
- **Alternative considered:** Separate mc_agent_steps Tabelle (rejected: Frontend muesste umgebaut werden)

## Deferred Ideas

None.
