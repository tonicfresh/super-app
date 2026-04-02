# Todos Module

> First reference module for the Super App platform. Demonstrates all architectural patterns.

## Overview

Full-featured todo management with lists, labels, priorities, and due dates.
Serves as the template for all future modules.

## Patterns Demonstrated

| Pattern | Where |
|---------|-------|
| Dual-Mode (standalone + integrated) | `backend/src/index.ts` + `plugin.ts` |
| ModuleConfig contract | `backend/src/plugin.ts` |
| ModuleDefinition contract | `frontend/src/module.ts` |
| AI Tools with guardrails | `backend/src/tools.ts` |
| Privacy (sanitized LLM responses) | `tools.ts` → `sanitizeTodoForLLM()` |
| Drizzle schema with prefix | `backend/src/db/schema.ts` |
| Tenant isolation | All routes + services |
| Valibot validation | Routes + Tools |
| PrimeVue + Design Tokens | All Vue components |
| Pinia state management | `frontend/src/stores/todos.ts` |

## Structure

```
todos/
├── backend/
│   ├── src/
│   │   ├── index.ts            # Standalone entry: defineServer()
│   │   ├── plugin.ts           # Integrated entry: exports everything
│   │   ├── tools.ts            # AI tools (5 tools)
│   │   ├── db/schema.ts        # Drizzle schema (4 tables)
│   │   ├── routes/index.ts     # CRUD routes (7 endpoints)
│   │   ├── jobs/index.ts       # Background jobs
│   │   └── services/index.ts   # Business logic
│   └── tests/
│       ├── routes.test.ts      # Route tests
│       ├── tools.test.ts       # Tool tests (guardrails, privacy)
│       ├── schema.test.ts      # Schema tests
│       └── security.test.ts    # Auth, permissions, tenant isolation
├── frontend/
│   ├── src/
│   │   ├── main.ts             # Standalone Vue app
│   │   ├── module.ts           # Module definition (routes, nav)
│   │   ├── views/
│   │   │   ├── TodoList.vue    # Main view (list + kanban)
│   │   │   ├── TodoDetail.vue  # Single todo
│   │   │   └── TodoSettings.vue # Lists & labels management
│   │   ├── components/
│   │   │   ├── TodoCard.vue    # Single todo card
│   │   │   ├── TodoKanban.vue  # Kanban board
│   │   │   └── TodoFilters.vue # Filter bar
│   │   └── stores/
│   │       └── todos.ts        # Pinia store
├── README.md
└── AGENTS.md
```

## Database Tables

| Table | Description |
|-------|-------------|
| `todos_items` | Main todo entries |
| `todos_lists` | Todo lists/categories |
| `todos_labels` | Labels/tags |
| `todos_items_to_labels` | Many-to-many junction |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/todos` | List todos (with filters) |
| POST | `/api/v1/todos` | Create todo |
| GET | `/api/v1/todos/:id` | Get single todo |
| PUT | `/api/v1/todos/:id` | Update todo |
| DELETE | `/api/v1/todos/:id` | Delete todo |
| GET | `/api/v1/todos/lists` | List todo lists |
| POST | `/api/v1/todos/lists` | Create todo list |

## AI Tools

| Tool | Description | Guardrail |
|------|-------------|-----------|
| `createTodo` | Create a new todo | dailyLimit: 100 |
| `listTodos` | List todos (privacy: no descriptions) | — |
| `updateTodoStatus` | Change todo status | — |
| `searchTodos` | Search todos by query | — |
| `deleteTodo` | Delete a todo | dailyLimit: 20, requiresApproval |

## Permissions

| Permission | Description |
|------------|-------------|
| `todos:read` | View todos |
| `todos:write` | Create todos |
| `todos:update` | Edit todos |
| `todos:delete` | Delete todos |
| `todos:admin` | Full access to settings |

## Development

```bash
# Standalone mode
cd backend && bun run dev

# Tests
cd backend && bun test

# Generate migration after schema changes
cd backend && bun run app:generate
```

## Table Prefix

All database tables use the prefix `todos_`.
