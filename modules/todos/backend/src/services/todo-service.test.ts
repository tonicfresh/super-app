import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  createTodoService,
  type TodoServiceDeps,
  type CreateTodoInput,
  type UpdateTodoInput,
  type ListTodosFilter,
} from "./index";

// --- Mock-Daten ---

const TENANT_ID = "tenant_001";
const USER_ID = "user_001";
const OTHER_TENANT = "tenant_002";

const mockTodo = {
  id: "todo_001",
  tenantId: TENANT_ID,
  title: "Einkaufen gehen",
  description: "Milch, Brot, Eier",
  status: "open" as const,
  priority: "medium" as const,
  dueDate: null,
  assigneeId: null,
  listId: null,
  createdBy: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("TodoService", () => {
  let deps: TodoServiceDeps;
  let service: ReturnType<typeof createTodoService>;

  beforeEach(() => {
    deps = {
      findAll: mock(async () => [mockTodo]),
      findById: mock(async () => mockTodo),
      create: mock(async (input: any) => ({ ...mockTodo, ...input, id: "todo_new" })),
      update: mock(async (id: string, input: any) => ({ ...mockTodo, ...input, id })),
      remove: mock(async () => true),
      count: mock(async () => 1),
    };
    service = createTodoService(deps);
  });

  describe("list()", () => {
    it("should return all todos for a tenant", async () => {
      const result = await service.list(TENANT_ID, {});
      expect(deps.findAll).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe(TENANT_ID);
    });

    it("should pass filter parameters", async () => {
      const filter: ListTodosFilter = { status: "open", priority: "high" };
      await service.list(TENANT_ID, filter);
      expect(deps.findAll).toHaveBeenCalledWith(TENANT_ID, filter);
    });
  });

  describe("getById()", () => {
    it("should return a todo by id", async () => {
      const result = await service.getById(TENANT_ID, "todo_001");
      expect(result).toBeDefined();
      expect(result!.id).toBe("todo_001");
    });

    it("should return null if todo belongs to different tenant", async () => {
      deps.findById = mock(async () => ({ ...mockTodo, tenantId: OTHER_TENANT }));
      service = createTodoService(deps);
      const result = await service.getById(TENANT_ID, "todo_001");
      expect(result).toBeNull();
    });
  });

  describe("create()", () => {
    it("should create a todo with required fields", async () => {
      const input: CreateTodoInput = {
        title: "Neues Todo",
        createdBy: USER_ID,
      };
      const result = await service.create(TENANT_ID, input);
      expect(result.id).toBe("todo_new");
      expect(deps.create).toHaveBeenCalledTimes(1);
    });

    it("should reject empty title", async () => {
      const input: CreateTodoInput = { title: "", createdBy: USER_ID };
      await expect(service.create(TENANT_ID, input)).rejects.toThrow("title");
    });

    it("should reject title longer than 500 characters", async () => {
      const input: CreateTodoInput = { title: "x".repeat(501), createdBy: USER_ID };
      await expect(service.create(TENANT_ID, input)).rejects.toThrow("title");
    });
  });

  describe("update()", () => {
    it("should update an existing todo", async () => {
      const input: UpdateTodoInput = { title: "Aktualisiert" };
      const result = await service.update(TENANT_ID, "todo_001", input);
      expect(result).toBeDefined();
      expect(deps.update).toHaveBeenCalledTimes(1);
    });

    it("should return null if todo not found", async () => {
      deps.findById = mock(async () => null);
      service = createTodoService(deps);
      const result = await service.update(TENANT_ID, "todo_999", { title: "X" });
      expect(result).toBeNull();
    });

    it("should return null if todo belongs to different tenant", async () => {
      deps.findById = mock(async () => ({ ...mockTodo, tenantId: OTHER_TENANT }));
      service = createTodoService(deps);
      const result = await service.update(TENANT_ID, "todo_001", { title: "X" });
      expect(result).toBeNull();
    });
  });

  describe("remove()", () => {
    it("should delete an existing todo", async () => {
      const result = await service.remove(TENANT_ID, "todo_001");
      expect(result).toBe(true);
    });

    it("should return false if todo belongs to different tenant", async () => {
      deps.findById = mock(async () => ({ ...mockTodo, tenantId: OTHER_TENANT }));
      service = createTodoService(deps);
      const result = await service.remove(TENANT_ID, "todo_001");
      expect(result).toBe(false);
    });
  });
});
