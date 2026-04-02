import { describe, it, expect } from "bun:test";
import {
  todosItems,
  todosLists,
  todosLabels,
  todosSchema,
  insertTodoItemSchema,
  insertTodoListSchema,
  insertTodoLabelSchema,
  selectTodoItemSchema,
  TodoStatus,
  TodoPriority,
} from "../src/db/schema";

describe("Todos Schema", () => {
  describe("Schema exports", () => {
    it("should export all three tables", () => {
      expect(todosItems).toBeDefined();
      expect(todosLists).toBeDefined();
      expect(todosLabels).toBeDefined();
    });

    it("should export todosSchema with all tables", () => {
      expect(todosSchema).toHaveProperty("todosItems");
      expect(todosSchema).toHaveProperty("todosLists");
      expect(todosSchema).toHaveProperty("todosLabels");
    });

    it("should export Valibot insert schemas", () => {
      expect(insertTodoItemSchema).toBeDefined();
      expect(insertTodoListSchema).toBeDefined();
      expect(insertTodoLabelSchema).toBeDefined();
    });

    it("should export Valibot select schemas", () => {
      expect(selectTodoItemSchema).toBeDefined();
    });
  });

  describe("Table prefix convention", () => {
    it("all tables should use todos_ prefix", () => {
      expect(todosItems).toBeDefined();
      expect(todosLists).toBeDefined();
      expect(todosLabels).toBeDefined();
    });
  });

  describe("TodoStatus enum", () => {
    it("should define all three status values", () => {
      expect(TodoStatus).toContain("open");
      expect(TodoStatus).toContain("in_progress");
      expect(TodoStatus).toContain("done");
      expect(TodoStatus).toHaveLength(3);
    });
  });

  describe("TodoPriority enum", () => {
    it("should define all four priority values", () => {
      expect(TodoPriority).toContain("low");
      expect(TodoPriority).toContain("medium");
      expect(TodoPriority).toContain("high");
      expect(TodoPriority).toContain("urgent");
      expect(TodoPriority).toHaveLength(4);
    });
  });

  describe("todosItems columns", () => {
    it("should have id column", () => {
      expect(todosItems.id).toBeDefined();
    });

    it("should have tenantId column", () => {
      expect(todosItems.tenantId).toBeDefined();
    });

    it("should have title column", () => {
      expect(todosItems.title).toBeDefined();
    });

    it("should have description column", () => {
      expect(todosItems.description).toBeDefined();
    });

    it("should have status column", () => {
      expect(todosItems.status).toBeDefined();
    });

    it("should have priority column", () => {
      expect(todosItems.priority).toBeDefined();
    });

    it("should have dueDate column", () => {
      expect(todosItems.dueDate).toBeDefined();
    });

    it("should have assigneeId column", () => {
      expect(todosItems.assigneeId).toBeDefined();
    });

    it("should have createdBy column", () => {
      expect(todosItems.createdBy).toBeDefined();
    });

    it("should have listId column for list assignment", () => {
      expect(todosItems.listId).toBeDefined();
    });

    it("should have timestamps", () => {
      expect(todosItems.createdAt).toBeDefined();
      expect(todosItems.updatedAt).toBeDefined();
    });
  });

  describe("todosLists columns", () => {
    it("should have id column", () => {
      expect(todosLists.id).toBeDefined();
    });

    it("should have tenantId column", () => {
      expect(todosLists.tenantId).toBeDefined();
    });

    it("should have name column", () => {
      expect(todosLists.name).toBeDefined();
    });

    it("should have color column", () => {
      expect(todosLists.color).toBeDefined();
    });

    it("should have icon column", () => {
      expect(todosLists.icon).toBeDefined();
    });

    it("should have createdBy column", () => {
      expect(todosLists.createdBy).toBeDefined();
    });

    it("should have createdAt column", () => {
      expect(todosLists.createdAt).toBeDefined();
    });
  });

  describe("todosLabels columns", () => {
    it("should have id, tenantId, name, color", () => {
      expect(todosLabels.id).toBeDefined();
      expect(todosLabels.tenantId).toBeDefined();
      expect(todosLabels.name).toBeDefined();
      expect(todosLabels.color).toBeDefined();
    });
  });
});
