# Mission Control

Mandatory built-in module for AI agent monitoring, audit logging, and cost tracking.

## Features

- Real-time agent session monitoring (WebSocket)
- Audit log for all permission checks
- AI cost tracking per module, provider, and time range
- System health overview

## Permissions

- `mc:read` — View dashboards, logs, and costs
- `mc:admin` — Stop agents, modify guardrails, full access

## Standalone Mode

```bash
cd backend && bun run dev
```

## Integrated Mode

Registered automatically via `plugin.ts` in the Super App template.
