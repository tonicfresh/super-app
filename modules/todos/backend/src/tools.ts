import { tool } from "ai";
import * as v from "valibot";
import type { ToolResult } from "@super-app/shared";

// ============================================================
// Todos AI-Tools
//
// Jedes Tool folgt dem 4-Schritte-Pattern:
// 1. Permission Check
// 2. Guardrail Check
// 3. Execute
// 4. ToolResult Response (keine sensitiven Daten!)
//
// Privacy-Regeln:
// - Descriptions NIEMALS an LLM zurueckgeben (koennen sensible Daten enthalten)
// - Nur id, title, status, priority, hasDescription (Flag)
// - Keine Email-Adressen, Telefonnummern, Passwoerter
// ============================================================

// --- Dependency Injection fuer Testbarkeit ---

export interface TodosToolsDeps {
  checkScope: (permission: string) => Promise<boolean>;
  checkGuardrail: (scope: string) => Promise<{
    allowed: boolean;
    used: number;
    max: number;
    remaining: number;
  }>;
  todoService: {
    list: (tenantId: string, filter: any) => Promise<any[]>;
    create: (tenantId: string, input: any) => Promise<any>;
    update: (tenantId: string, id: string, input: any) => Promise<any | null>;
    remove: (tenantId: string, id: string) => Promise<boolean>;
    getById: (tenantId: string, id: string) => Promise<any | null>;
  };
  getTenantId: () => string;
  getUserId: () => string;
}

/**
 * Sanitisiert ein Todo-Objekt fuer die LLM-Antwort.
 * NIEMALS description zurueckgeben — kann sensible Daten enthalten.
 */
function sanitizeTodoForLLM(todo: any): Record<string, unknown> {
  return {
    id: todo.id,
    title: todo.title,
    status: todo.status,
    priority: todo.priority,
    hasDescription: !!todo.description,
    hasDueDate: !!todo.dueDate,
    assigneeId: todo.assigneeId,
  };
}

/**
 * Factory: Erstellt die Todos-Tools mit injizierten Dependencies.
 */
export function createTodosTools(deps: TodosToolsDeps) {
  return {
    /**
     * createTodo — Neues Todo erstellen
     * Guardrail: dailyLimit 100
     */
    createTodo: tool({
      description: "Create a new todo item",
      parameters: v.object({
        title: v.pipe(v.string(), v.minLength(1), v.maxLength(500)),
        description: v.optional(v.string()),
        status: v.optional(v.picklist(["open", "in_progress", "done"])),
        priority: v.optional(v.picklist(["low", "medium", "high", "urgent"])),
        dueDate: v.optional(v.string()),
        assigneeId: v.optional(v.string()),
        listId: v.optional(v.string()),
      }),
      execute: async (input): Promise<ToolResult> => {
        // 1. Permission Check
        if (!(await deps.checkScope("todos:write"))) {
          return {
            success: false,
            code: "FORBIDDEN",
            message: "No permission: todos:write",
          };
        }

        // 2. Guardrail Check
        const guardrail = await deps.checkGuardrail("todos:write");
        if (!guardrail.allowed) {
          return {
            success: false,
            code: "LIMIT_REACHED",
            message: `Daily limit reached: ${guardrail.used}/${guardrail.max}`,
          };
        }

        // 3. Execute
        const todo = await deps.todoService.create(deps.getTenantId(), {
          ...input,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          createdBy: deps.getUserId(),
        });

        // 4. ToolResult — nur ID, Titel, Status (keine Description!)
        return {
          success: true,
          data: {
            ...sanitizeTodoForLLM(todo),
            remaining: guardrail.remaining,
          },
        };
      },
    }),

    /**
     * listTodos — Todos auflisten
     * Privacy: Nur id, title, status, priority — KEINE Descriptions
     */
    listTodos: tool({
      description:
        "List todo items with optional filters. Returns only IDs, titles, and status — never descriptions.",
      parameters: v.object({
        status: v.optional(v.picklist(["open", "in_progress", "done"])),
        priority: v.optional(v.picklist(["low", "medium", "high", "urgent"])),
        listId: v.optional(v.string()),
        limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50))),
      }),
      execute: async (input): Promise<ToolResult> => {
        // 1. Permission Check
        if (!(await deps.checkScope("todos:read"))) {
          return {
            success: false,
            code: "FORBIDDEN",
            message: "No permission: todos:read",
          };
        }

        // 2. Kein Guardrail fuer Lesezugriffe

        // 3. Execute
        const todos = await deps.todoService.list(deps.getTenantId(), {
          status: input.status,
          priority: input.priority,
          listId: input.listId,
          limit: input.limit ?? 20,
        });

        // 4. ToolResult — sanitisiert, keine Descriptions
        return {
          success: true,
          data: {
            todos: todos.map(sanitizeTodoForLLM),
            total: todos.length,
          },
        };
      },
    }),

    /**
     * updateTodoStatus — Status eines Todos aendern
     */
    updateTodoStatus: tool({
      description: "Update the status of a todo item (open, in_progress, done)",
      parameters: v.object({
        todoId: v.string(),
        status: v.picklist(["open", "in_progress", "done"]),
      }),
      execute: async (input): Promise<ToolResult> => {
        // 1. Permission Check
        if (!(await deps.checkScope("todos:update"))) {
          return {
            success: false,
            code: "FORBIDDEN",
            message: "No permission: todos:update",
          };
        }

        // 2. Guardrail Check
        const guardrail = await deps.checkGuardrail("todos:update");
        if (!guardrail.allowed) {
          return {
            success: false,
            code: "LIMIT_REACHED",
            message: `Limit reached: ${guardrail.used}/${guardrail.max}`,
          };
        }

        // 3. Execute
        const existing = await deps.todoService.getById(
          deps.getTenantId(),
          input.todoId
        );
        if (!existing) {
          return {
            success: false,
            code: "NOT_FOUND",
            message: `Todo not found: ${input.todoId}`,
          };
        }

        const previousStatus = existing.status;
        await deps.todoService.update(
          deps.getTenantId(),
          input.todoId,
          { status: input.status }
        );

        // 4. ToolResult
        return {
          success: true,
          data: {
            id: input.todoId,
            title: existing.title,
            previousStatus,
            newStatus: input.status,
          },
        };
      },
    }),

    /**
     * searchTodos — Todos durchsuchen
     * Privacy: Sucht in title UND description, gibt aber NUR Titel zurueck
     */
    searchTodos: tool({
      description:
        "Search todo items by query. Searches titles and descriptions but only returns titles and IDs.",
      parameters: v.object({
        query: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
        limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(20))),
      }),
      execute: async (input): Promise<ToolResult> => {
        // 1. Permission Check
        if (!(await deps.checkScope("todos:read"))) {
          return {
            success: false,
            code: "FORBIDDEN",
            message: "No permission: todos:read",
          };
        }

        // 2. Kein Guardrail fuer Lesezugriffe

        // 3. Execute
        const todos = await deps.todoService.list(deps.getTenantId(), {
          search: input.query,
          limit: input.limit ?? 10,
        });

        // 4. ToolResult — sanitisiert
        return {
          success: true,
          data: {
            results: todos.map(sanitizeTodoForLLM),
            query: input.query,
            total: todos.length,
          },
        };
      },
    }),

    /**
     * deleteTodo — Todo loeschen
     * Guardrail: dailyLimit 20, requiresApproval: true
     */
    deleteTodo: tool({
      description: "Delete a todo item. Requires user approval.",
      parameters: v.object({
        todoId: v.string(),
      }),
      execute: async (input): Promise<ToolResult> => {
        // 1. Permission Check
        if (!(await deps.checkScope("todos:delete"))) {
          return {
            success: false,
            code: "FORBIDDEN",
            message: "No permission: todos:delete",
          };
        }

        // 2. Guardrail Check
        const guardrail = await deps.checkGuardrail("todos:delete");
        if (!guardrail.allowed) {
          return {
            success: false,
            code: "LIMIT_REACHED",
            message: `Delete limit reached: ${guardrail.used}/${guardrail.max}`,
          };
        }

        // 3. Execute
        const existing = await deps.todoService.getById(
          deps.getTenantId(),
          input.todoId
        );
        if (!existing) {
          return {
            success: false,
            code: "NOT_FOUND",
            message: "Todo not found",
          };
        }

        await deps.todoService.remove(
          deps.getTenantId(),
          input.todoId
        );

        // 4. ToolResult
        return {
          success: true,
          data: {
            deleted: true,
            id: input.todoId,
            title: existing.title,
          },
        };
      },
    }),
  };
}

/**
 * Export: Todos-Tools-Objekt (wird in plugin.ts verwendet).
 * In der echten App werden die Dependencies beim Server-Start injiziert.
 */
export const todosTools = createTodosTools({
  checkScope: async () => true, // Wird vom Framework ueberschrieben
  checkGuardrail: async () => ({ allowed: true, used: 0, max: 100, remaining: 100 }),
  todoService: {
    list: async () => [],
    create: async (_t, input) => ({ id: "placeholder", ...input }),
    update: async () => null,
    remove: async () => true,
    getById: async () => null,
  },
  getTenantId: () => "", // Wird vom Request-Context gesetzt
  getUserId: () => "", // Wird vom Request-Context gesetzt
});
