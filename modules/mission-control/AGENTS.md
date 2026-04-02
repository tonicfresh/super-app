# Mission Control — AI Coding Instructions

## Module: mission-control
- Prefix: `mc_` for all database tables
- Permissions: `mc:read`, `mc:admin`
- This is a MANDATORY module — always included in the Super App

## Structure
- `backend/src/plugin.ts` — Integrated entry point (exports config, schema, routes, tools)
- `backend/src/index.ts` — Standalone entry point (own server)
- `backend/src/tools.ts` — AI tools (agent status, stop agents, query logs)
- `backend/src/routes/` — Hono route handlers (agents, logs, costs, audit, health)
- `backend/src/db/schema.ts` — Drizzle schema (mc_agent_sessions, mc_audit_log)
- `backend/src/services/` — Business logic
- `frontend/src/module.ts` — Integrated frontend entry
- `frontend/src/main.ts` — Standalone frontend entry
- `frontend/src/views/` — Vue page components

## Conventions
- Validation: Valibot (NOT Zod)
- ORM: Drizzle
- Testing: bun:test, TDD
- Charts: ApexCharts
- Components: PrimeVue + Volt theme
