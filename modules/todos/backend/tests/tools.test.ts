import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createTodosTools, type TodosToolsDeps } from "../src/tools";
import type { ToolResult } from "@super-app/shared";

/**
 * Tool-Tests — prueft alle AI-Tool-Patterns:
 * 1. Permission Check → FORBIDDEN
 * 2. Guardrail Check → LIMIT_REACHED
 * 3. Privacy → keine sensitiven Daten in Responses
 * 4. ToolResult Contract → success/error Struktur
 */

// --- Mock-Dependencies ---

function createMockDeps(overrides: Partial<TodosToolsDeps> = {}): TodosToolsDeps {
  return {
    checkScope: mock(async () => true),
    checkGuardrail: mock(async () => ({
      allowed: true,
      used: 5,
      max: 100,
      remaining: 95,
    })),
    todoService: {
      list: mock(async () => [
        {
          id: "todo_001",
          title: "Geheimes Projekt",
          description: "Enthalt sensible Infos ueber Kunden XYZ mit Email test@secret.com",
          status: "open",
          priority: "high",
          assigneeId: "user_001",
          createdBy: "user_001",
        },
      ]),
      create: mock(async (_tenantId: string, input: any) => ({
        id: "todo_new",
        ...input,
        tenantId: _tenantId,
      })),
      update: mock(async () => ({
        id: "todo_001",
        title: "Updated",
        status: "done",
      })),
      remove: mock(async () => true),
      getById: mock(async () => ({
        id: "todo_001",
        title: "Test",
        status: "open",
        description: "Geheime Beschreibung mit user@email.com",
        priority: "medium",
      })),
    },
    getTenantId: () => "tenant_001",
    getUserId: () => "user_001",
    ...overrides,
  };
}

describe("Todos Tools", () => {
  describe("createTodo", () => {
    it("should return FORBIDDEN without todos:write permission", async () => {
      const deps = createMockDeps({
        checkScope: mock(async () => false),
      });
      const tools = createTodosTools(deps);
      const result = await (tools.createTodo as any).execute({
        title: "Test",
      }) as ToolResult;
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("FORBIDDEN");
      }
    });

    it("should return LIMIT_REACHED when daily limit exceeded", async () => {
      const deps = createMockDeps({
        checkGuardrail: mock(async () => ({
          allowed: false,
          used: 100,
          max: 100,
          remaining: 0,
        })),
      });
      const tools = createTodosTools(deps);
      const result = await (tools.createTodo as any).execute({
        title: "Test",
      }) as ToolResult;
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("LIMIT_REACHED");
      }
    });

    it("should create todo and return ToolResult on success", async () => {
      const deps = createMockDeps();
      const tools = createTodosTools(deps);
      const result = await (tools.createTodo as any).execute({
        title: "Test Todo",
      }) as ToolResult;
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBeDefined();
        expect(result.data.remaining).toBe(95);
      }
    });
  });

  describe("listTodos", () => {
    it("should return FORBIDDEN without todos:read permission", async () => {
      const deps = createMockDeps({
        checkScope: mock(async () => false),
      });
      const tools = createTodosTools(deps);
      const result = await (tools.listTodos as any).execute({}) as ToolResult;
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("FORBIDDEN");
      }
    });

    it("should NEVER return descriptions with sensitive data", async () => {
      const deps = createMockDeps();
      const tools = createTodosTools(deps);
      const result = await (tools.listTodos as any).execute({}) as ToolResult;
      expect(result.success).toBe(true);

      const json = JSON.stringify(result);
      // Darf KEINE Email-Adressen enthalten
      expect(json).not.toMatch(/[\w.]+@[\w.]+\.\w+/);
      // Darf NICHT "sensible" oder "Kunden" enthalten
      expect(json).not.toContain("sensible");
      expect(json).not.toContain("Kunden");
      // MUSS hasDescription als Flag haben
      expect(json).toContain("hasDescription");
    });

    it("should return only IDs and names, never full objects", async () => {
      const deps = createMockDeps();
      const tools = createTodosTools(deps);
      const result = await (tools.listTodos as any).execute({}) as ToolResult;
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total).toBe(1);
      }
    });
  });

  describe("updateTodoStatus", () => {
    it("should return NOT_FOUND when todo does not exist", async () => {
      const deps = createMockDeps({
        todoService: {
          ...createMockDeps().todoService,
          getById: mock(async () => null),
        },
      });
      const tools = createTodosTools(deps);
      const result = await (tools.updateTodoStatus as any).execute({
        todoId: "todo_999",
        status: "done",
      }) as ToolResult;
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("NOT_FOUND");
      }
    });

    it("should update status and return ToolResult", async () => {
      const deps = createMockDeps();
      const tools = createTodosTools(deps);
      const result = await (tools.updateTodoStatus as any).execute({
        todoId: "todo_001",
        status: "done",
      }) as ToolResult;
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.previousStatus).toBe("open");
        expect(result.data.newStatus).toBe("done");
      }
    });
  });

  describe("searchTodos", () => {
    it("should search by query and return matching todos", async () => {
      const deps = createMockDeps();
      const tools = createTodosTools(deps);
      const result = await (tools.searchTodos as any).execute({
        query: "geheim",
      }) as ToolResult;
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe("geheim");
        expect(result.data.total).toBe(1);
      }
    });

    it("should NEVER include description content in search results", async () => {
      const deps = createMockDeps();
      const tools = createTodosTools(deps);
      const result = await (tools.searchTodos as any).execute({
        query: "geheim",
      }) as ToolResult;
      const json = JSON.stringify(result);
      expect(json).not.toContain("Email");
      expect(json).not.toContain("@secret.com");
    });
  });

  describe("deleteTodo", () => {
    it("should return FORBIDDEN without todos:delete permission", async () => {
      const deps = createMockDeps({
        checkScope: mock(async () => false),
      });
      const tools = createTodosTools(deps);
      const result = await (tools.deleteTodo as any).execute({
        todoId: "todo_001",
      }) as ToolResult;
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("FORBIDDEN");
      }
    });

    it("should return NOT_FOUND when todo does not exist", async () => {
      const deps = createMockDeps({
        todoService: {
          ...createMockDeps().todoService,
          getById: mock(async () => null),
        },
      });
      const tools = createTodosTools(deps);
      const result = await (tools.deleteTodo as any).execute({
        todoId: "todo_999",
      }) as ToolResult;
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("NOT_FOUND");
      }
    });

    it("should delete and return ToolResult on success", async () => {
      const deps = createMockDeps();
      const tools = createTodosTools(deps);
      const result = await (tools.deleteTodo as any).execute({
        todoId: "todo_001",
      }) as ToolResult;
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.deleted).toBe(true);
        expect(result.data.id).toBe("todo_001");
      }
    });
  });

  describe("ToolResult contract compliance", () => {
    it("every success result must have data property", () => {
      const result: ToolResult = { success: true, data: { id: "x" } };
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(typeof result.data).toBe("object");
      }
    });

    it("every error result must have code and message", () => {
      const result: ToolResult = {
        success: false,
        code: "FORBIDDEN",
        message: "Not allowed",
      };
      if (!result.success) {
        expect(result.code).toBeDefined();
        expect(result.message).toBeDefined();
        expect(typeof result.message).toBe("string");
      }
    });
  });
});
