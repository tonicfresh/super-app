import { todosSchema } from "./db/schema";
import { todosRoutes, createTodosRoutes } from "./routes/index";
import { todosJobs } from "./jobs/index";
import { createTodoService, type TodoItem } from "./services/index";

// ============================================================
// Todos Module — Standalone Mode
//
// Startet das Todos-Modul als eigenstaendigen Server.
// Nutzt die gleiche Business-Logik, Routes und Schema
// wie im integrierten Modus.
//
// Usage: bun run dev (oder: bun --hot run src/index.ts)
// ============================================================

// Services mit In-Memory-Platzhaltern (fuer Standalone-Betrieb ohne DB)
const todoService = createTodoService({
  findAll: async () => [],
  findById: async () => null,
  create: async (input) => ({
    id: crypto.randomUUID(),
    tenantId: "",
    title: "",
    description: null,
    status: "open" as const,
    priority: "medium" as const,
    dueDate: null,
    assigneeId: null,
    listId: null,
    createdBy: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...input,
  }),
  update: async (_id, input) => ({
    id: _id,
    tenantId: "",
    title: "",
    description: null,
    status: "open" as const,
    priority: "medium" as const,
    dueDate: null,
    assigneeId: null,
    listId: null,
    createdBy: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...input,
  } as TodoItem),
  remove: async () => true,
  count: async () => 0,
});

const todosRoutesStandalone = createTodosRoutes({
  todoService,
  todoListService: {
    list: async () => [],
    create: async (_t, input) => ({ id: crypto.randomUUID(), ...input }),
  },
});

export { todosSchema, todosRoutesStandalone as routes, todosJobs };
export { plugin, moduleConfig } from "./plugin";
