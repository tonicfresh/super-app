import { describe, it, expect, beforeEach } from "bun:test";
import { Hono } from "hono";
import { createTodosRoutes } from "../src/routes/index";
import { createTodoService } from "../src/services/index";
import type { TodoItem } from "../src/services/index";

// --- Mock-Daten ---

const TENANT_ID = "tenant_001";
const USER_ID = "user_001";

const mockTodo: TodoItem = {
  id: "todo_001",
  tenantId: TENANT_ID,
  title: "Test Todo",
  description: "Test Beschreibung",
  status: "open",
  priority: "medium",
  dueDate: null,
  assigneeId: null,
  listId: null,
  createdBy: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockList = {
  id: "list_001",
  tenantId: TENANT_ID,
  name: "Arbeit",
  color: "#3B82F6",
  icon: null,
  createdBy: USER_ID,
  createdAt: new Date(),
};

// --- Test-Hilfsfunktionen ---

function createTestDeps() {
  // In-Memory-Storage fuer Tests
  const todos: TodoItem[] = [{ ...mockTodo }];
  const lists: any[] = [{ ...mockList }];

  const todoService = createTodoService({
    findAll: async (_tenantId, _filter) =>
      todos.filter((t) => t.tenantId === _tenantId),
    findById: async (id) => todos.find((t) => t.id === id) ?? null,
    create: async (input) => {
      const newTodo = {
        id: `todo_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...input,
      } as TodoItem;
      todos.push(newTodo);
      return newTodo;
    },
    update: async (id, input) => {
      const idx = todos.findIndex((t) => t.id === id);
      if (idx < 0) return todos[0]; // Fallback
      todos[idx] = { ...todos[idx], ...input, updatedAt: new Date() };
      return todos[idx];
    },
    remove: async (id) => {
      const idx = todos.findIndex((t) => t.id === id);
      if (idx < 0) return false;
      todos.splice(idx, 1);
      return true;
    },
    count: async (_tenantId) =>
      todos.filter((t) => t.tenantId === _tenantId).length,
  });

  return {
    todoService,
    todoListService: {
      list: async (_tenantId: string) =>
        lists.filter((l) => l.tenantId === _tenantId),
      create: async (_tenantId: string, input: any) => {
        const newList = {
          id: `list_${Date.now()}`,
          tenantId: _tenantId,
          createdAt: new Date(),
          ...input,
        };
        lists.push(newList);
        return newList;
      },
    },
  };
}

function createTestApp() {
  const app = new Hono();

  // Mock-Middleware: simuliert Auth-Context
  app.use("*", async (c, next) => {
    c.set("userId", USER_ID);
    c.set("tenantId", TENANT_ID);
    await next();
  });

  // Routes einbinden
  const deps = createTestDeps();
  const routes = createTodosRoutes(deps);
  routes(app);

  return app;
}

describe("Todos Routes", () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  describe("GET /", () => {
    it("should return 200 with an array of todos", async () => {
      const res = await app.request("/");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("should support status filter query param", async () => {
      const res = await app.request("/?status=open");
      expect(res.status).toBe(200);
    });

    it("should support priority filter query param", async () => {
      const res = await app.request("/?priority=high");
      expect(res.status).toBe(200);
    });

    it("should support pagination with limit and offset", async () => {
      const res = await app.request("/?limit=10&offset=0");
      expect(res.status).toBe(200);
    });
  });

  describe("POST /", () => {
    it("should return 201 on successful create", async () => {
      const res = await app.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Neues Todo" }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.title).toBe("Neues Todo");
    });

    it("should return 400 when title is missing", async () => {
      const res = await app.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it("should return 400 when title is empty string", async () => {
      const res = await app.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /:id", () => {
    it("should return 200 with the todo", async () => {
      const res = await app.request("/todo_001");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe("todo_001");
    });

    it("should return 404 when todo not found", async () => {
      const res = await app.request("/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /:id", () => {
    it("should return 200 on successful update", async () => {
      const res = await app.request("/todo_001", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Aktualisiert" }),
      });
      expect(res.status).toBe(200);
    });

    it("should return 404 when todo not found", async () => {
      const res = await app.request("/nonexistent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "X" }),
      });
      expect(res.status).toBe(404);
    });

    it("should support partial updates", async () => {
      const res = await app.request("/todo_001", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      expect(res.status).toBe(200);
    });
  });

  describe("DELETE /:id", () => {
    it("should return 204 on successful delete", async () => {
      const res = await app.request("/todo_001", { method: "DELETE" });
      expect(res.status).toBe(204);
    });

    it("should return 404 when todo not found", async () => {
      const res = await app.request("/nonexistent", { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /lists", () => {
    it("should return 200 with an array of lists", async () => {
      const res = await app.request("/lists");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("POST /lists", () => {
    it("should return 201 on successful list creation", async () => {
      const res = await app.request("/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Arbeit" }),
      });
      expect(res.status).toBe(201);
    });

    it("should return 400 when name is missing", async () => {
      const res = await app.request("/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });
});
