# Module: Todos

## Rules
- Table prefix: `todos_`
- All tools must return `ToolResult` type from `@super-app/shared`
- No sensitive data in tool responses (IDs and flags only)
- Tests are mandatory for every endpoint and tool
- Schema changes ONLY via Drizzle, NEVER raw SQL
- Use PrimeVue Design Tokens, NEVER hardcode colors
- Validation: Valibot (NICHT Zod)

## Files
| File | Purpose |
|------|---------|
| `backend/src/plugin.ts` | Integrated entry — exports schema, routes, tools, config |
| `backend/src/tools.ts` | AI tools — permission + guardrail + privacy pattern |
| `backend/src/index.ts` | Standalone entry — defineServer() |
| `backend/src/db/schema.ts` | Drizzle schema (tables: todos_items, todos_lists, todos_labels) |
| `backend/src/routes/index.ts` | Hono CRUD routes |
| `backend/src/services/index.ts` | Business logic |
| `frontend/src/module.ts` | Frontend module definition — routes, navigation, permissions |
| `frontend/src/main.ts` | Standalone entry — own Vue app |
| `frontend/src/stores/todos.ts` | Pinia store for todo state |

## Shared Types
Import from `@super-app/shared`:
- `ToolResult` — standardized tool response
- `ModuleConfig` — backend module configuration
- `ModuleDefinition` — frontend module definition
- `GuardrailConfig` — guardrail settings

## Test Commands
```bash
bun test                  # Alle Tests
bun run app:generate      # Migration generieren nach Schema-Aenderung
```
