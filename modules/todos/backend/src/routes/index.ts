import * as v from "valibot";
import type { createTodoService } from "../services/index";

// ============================================================
// Todos Routes — CRUD API
//
// Alle Routes sind tenant-scoped:
// - tenantId und userId kommen aus dem Framework-Auth-Middleware-Context.
// - Kein direkter DB-Zugriff in Routes — alles geht ueber den Service.
//
// Antwort-Format: { data: ... } bei Erfolg, { error: ... } bei Fehler.
// ============================================================

// --- Valibot-Schemas fuer Request-Validierung ---

const CreateTodoBody = v.object({
  title: v.pipe(v.string(), v.minLength(1, "Title is required"), v.maxLength(500)),
  description: v.optional(v.string()),
  status: v.optional(v.picklist(["open", "in_progress", "done"])),
  priority: v.optional(v.picklist(["low", "medium", "high", "urgent"])),
  dueDate: v.optional(v.nullable(v.string())),
  assigneeId: v.optional(v.nullable(v.string())),
  listId: v.optional(v.nullable(v.string())),
});

const UpdateTodoBody = v.object({
  title: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(500))),
  description: v.optional(v.nullable(v.string())),
  status: v.optional(v.picklist(["open", "in_progress", "done"])),
  priority: v.optional(v.picklist(["low", "medium", "high", "urgent"])),
  dueDate: v.optional(v.nullable(v.string())),
  assigneeId: v.optional(v.nullable(v.string())),
  listId: v.optional(v.nullable(v.string())),
});

const CreateListBody = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Name is required"), v.maxLength(200)),
  color: v.optional(v.string()),
  icon: v.optional(v.string()),
});

// --- Route-Dependencies (DI) ---

type TodoService = ReturnType<typeof createTodoService>;

export interface TodoListServiceDeps {
  list: (tenantId: string) => Promise<any[]>;
  create: (tenantId: string, input: any) => Promise<any>;
}

export interface TodosRouteDeps {
  todoService: TodoService;
  todoListService: TodoListServiceDeps;
}

/**
 * Factory fuer die Todos-Routes.
 * Nimmt Dependencies als Parameter (Service-Injection).
 */
export function createTodosRoutes(deps: TodosRouteDeps) {
  return (app: any) => {
    // --- Todo Items CRUD ---

    /**
     * GET / — Alle Todos des Tenants mit optionalen Filtern
     */
    app.get("/", async (c: any) => {
      const tenantId = c.get("tenantId");
      const { status, priority, assigneeId, listId, search, limit, offset } =
        c.req.query();

      const todos = await deps.todoService.list(tenantId, {
        status,
        priority,
        assigneeId,
        listId,
        search,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      return c.json({ data: todos });
    });

    /**
     * POST / — Neues Todo erstellen
     */
    app.post("/", async (c: any) => {
      const tenantId = c.get("tenantId");
      const userId = c.get("userId");
      const body = await c.req.json();

      const parsed = v.safeParse(CreateTodoBody, body);
      if (!parsed.success) {
        return c.json(
          { error: "Validation failed", details: parsed.issues },
          400
        );
      }

      try {
        const todo = await deps.todoService.create(tenantId, {
          ...parsed.output,
          dueDate: parsed.output.dueDate
            ? new Date(parsed.output.dueDate)
            : null,
          createdBy: userId,
        });
        return c.json({ data: todo }, 201);
      } catch (err: any) {
        if (err.message?.includes("Validation")) {
          return c.json({ error: err.message }, 400);
        }
        throw err;
      }
    });

    /**
     * GET /lists — Alle Listen des Tenants
     * WICHTIG: Muss VOR /:id stehen, damit "/lists" nicht als ID interpretiert wird
     */
    app.get("/lists", async (c: any) => {
      const tenantId = c.get("tenantId");
      const lists = await deps.todoListService.list(tenantId);
      return c.json({ data: lists });
    });

    /**
     * POST /lists — Neue Liste erstellen
     */
    app.post("/lists", async (c: any) => {
      const tenantId = c.get("tenantId");
      const userId = c.get("userId");
      const body = await c.req.json();

      const parsed = v.safeParse(CreateListBody, body);
      if (!parsed.success) {
        return c.json(
          { error: "Validation failed", details: parsed.issues },
          400
        );
      }

      const list = await deps.todoListService.create(tenantId, {
        ...parsed.output,
        createdBy: userId,
      });

      return c.json({ data: list }, 201);
    });

    /**
     * GET /:id — Einzelnes Todo laden
     */
    app.get("/:id", async (c: any) => {
      const tenantId = c.get("tenantId");
      const id = c.req.param("id");

      const todo = await deps.todoService.getById(tenantId, id);
      if (!todo) {
        return c.json({ error: "Todo not found" }, 404);
      }

      return c.json({ data: todo });
    });

    /**
     * PUT /:id — Todo aktualisieren
     */
    app.put("/:id", async (c: any) => {
      const tenantId = c.get("tenantId");
      const id = c.req.param("id");
      const body = await c.req.json();

      const parsed = v.safeParse(UpdateTodoBody, body);
      if (!parsed.success) {
        return c.json(
          { error: "Validation failed", details: parsed.issues },
          400
        );
      }

      const updated = await deps.todoService.update(tenantId, id, {
        ...parsed.output,
        dueDate: parsed.output.dueDate
          ? new Date(parsed.output.dueDate)
          : parsed.output.dueDate,
      });

      if (!updated) {
        return c.json({ error: "Todo not found" }, 404);
      }

      return c.json({ data: updated });
    });

    /**
     * DELETE /:id — Todo loeschen
     */
    app.delete("/:id", async (c: any) => {
      const tenantId = c.get("tenantId");
      const id = c.req.param("id");

      const deleted = await deps.todoService.remove(tenantId, id);
      if (!deleted) {
        return c.json({ error: "Todo not found" }, 404);
      }

      return c.body(null, 204);
    });
  };
}

// --- Default-Export fuer Plugin-Registrierung ---

/**
 * Statischer Export mit In-Memory-Platzhaltern.
 * Wird im Plugin verwendet und beim Server-Start mit echten Deps ueberschrieben.
 */
export const todosRoutes = createTodosRoutes({
  todoService: {
    list: async () => [],
    getById: async () => null,
    create: async (_t, input) => ({ id: "placeholder", ...input } as any),
    update: async () => null,
    remove: async () => false,
    count: async () => 0,
  },
  todoListService: {
    list: async () => [],
    create: async (_t, input) => ({ id: "placeholder", ...input }),
  },
});
