import type { TodoStatus, TodoPriority } from "../db/schema";

// ============================================================
// Todos Service — Geschaeftslogik
// Wird von Routes UND Tools verwendet.
// Dependency Injection fuer Testbarkeit.
// ============================================================

// --- Input-Typen ---

export interface CreateTodoInput {
  title: string;
  description?: string;
  status?: (typeof TodoStatus)[number];
  priority?: (typeof TodoPriority)[number];
  dueDate?: Date | null;
  assigneeId?: string | null;
  listId?: string | null;
  createdBy: string;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string | null;
  status?: (typeof TodoStatus)[number];
  priority?: (typeof TodoPriority)[number];
  dueDate?: Date | null;
  assigneeId?: string | null;
  listId?: string | null;
}

export interface ListTodosFilter {
  status?: (typeof TodoStatus)[number];
  priority?: (typeof TodoPriority)[number];
  assigneeId?: string;
  listId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// --- Todo-Datentyp (aus DB) ---

export interface TodoItem {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  status: (typeof TodoStatus)[number];
  priority: (typeof TodoPriority)[number];
  dueDate: Date | null;
  assigneeId: string | null;
  listId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Dependency Injection ---

export interface TodoServiceDeps {
  findAll: (tenantId: string, filter: ListTodosFilter) => Promise<TodoItem[]>;
  findById: (id: string) => Promise<TodoItem | null>;
  create: (input: TodoItem | Omit<TodoItem, "id" | "createdAt" | "updatedAt">) => Promise<TodoItem>;
  update: (id: string, input: Partial<TodoItem>) => Promise<TodoItem>;
  remove: (id: string) => Promise<boolean>;
  count: (tenantId: string, filter?: ListTodosFilter) => Promise<number>;
}

// --- Validierung ---

function validateTitle(title: string): void {
  if (!title || title.trim().length === 0) {
    throw new Error("Validation: title must not be empty");
  }
  if (title.length > 500) {
    throw new Error("Validation: title must not exceed 500 characters");
  }
}

// --- Service Factory ---

export function createTodoService(deps: TodoServiceDeps) {
  return {
    /**
     * Alle Todos eines Tenants auflisten (mit optionalen Filtern).
     */
    async list(tenantId: string, filter: ListTodosFilter): Promise<TodoItem[]> {
      return deps.findAll(tenantId, filter);
    },

    /**
     * Einzelnes Todo per ID laden.
     * Gibt null zurueck wenn nicht gefunden oder anderer Tenant.
     */
    async getById(tenantId: string, id: string): Promise<TodoItem | null> {
      const todo = await deps.findById(id);
      if (!todo || todo.tenantId !== tenantId) return null;
      return todo;
    },

    /**
     * Neues Todo erstellen.
     * Validiert Titel und setzt Defaults.
     */
    async create(tenantId: string, input: CreateTodoInput): Promise<TodoItem> {
      validateTitle(input.title);

      return deps.create({
        tenantId,
        title: input.title.trim(),
        description: input.description ?? null,
        status: input.status ?? "open",
        priority: input.priority ?? "medium",
        dueDate: input.dueDate ?? null,
        assigneeId: input.assigneeId ?? null,
        listId: input.listId ?? null,
        createdBy: input.createdBy,
      });
    },

    /**
     * Bestehendes Todo aktualisieren.
     * Prueft Tenant-Zugehoerigkeit. Gibt null zurueck bei fremdem Tenant.
     */
    async update(
      tenantId: string,
      id: string,
      input: UpdateTodoInput
    ): Promise<TodoItem | null> {
      const existing = await deps.findById(id);
      if (!existing || existing.tenantId !== tenantId) return null;

      if (input.title !== undefined) {
        validateTitle(input.title);
        input.title = input.title.trim();
      }

      return deps.update(id, input);
    },

    /**
     * Todo loeschen.
     * Prueft Tenant-Zugehoerigkeit. Gibt false zurueck bei fremdem Tenant.
     */
    async remove(tenantId: string, id: string): Promise<boolean> {
      const existing = await deps.findById(id);
      if (!existing || existing.tenantId !== tenantId) return false;
      return deps.remove(id);
    },

    /**
     * Anzahl Todos eines Tenants zaehlen (fuer Pagination).
     */
    async count(tenantId: string, filter?: ListTodosFilter): Promise<number> {
      return deps.count(tenantId, filter);
    },
  };
}
