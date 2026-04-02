import { sql } from "drizzle-orm";
import {
  pgTableCreator,
  text,
  timestamp,
  uuid,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-valibot";

// ============================================================
// Todos-Modul — Drizzle Schema
// Jedes Modul erstellt seinen eigenen Table Creator mit Prefix.
// Framework: pgBaseTable (base_*), App: pgAppTable (app_*),
// Module: eigener Creator (todos_*, mc_*, push_*, etc.)
// NIEMALS manuell SQL schreiben — immer Drizzle verwenden!
// ============================================================

const todosTable = pgTableCreator((name) => `todos_${name}`);

// --- Enums ---

export const TodoStatus = ["open", "in_progress", "done"] as const;
export const TodoPriority = ["low", "medium", "high", "urgent"] as const;

export const todosStatusEnum = pgEnum("todos_status", TodoStatus);
export const todosPriorityEnum = pgEnum("todos_priority", TodoPriority);

// --- Tables ---

/**
 * Haupt-Tabelle fuer Todo-Eintraege.
 * Jeder Eintrag gehoert zu einem Tenant und optional zu einer Liste.
 */
export const todosItems = todosTable(
  "items",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: text("tenant_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: todosStatusEnum("status").notNull().default("open"),
    priority: todosPriorityEnum("priority").notNull().default("medium"),
    dueDate: timestamp("due_date"),
    assigneeId: text("assignee_id"),
    listId: uuid("list_id"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("todos_items_tenant_idx").on(table.tenantId),
    index("todos_items_status_idx").on(table.tenantId, table.status),
    index("todos_items_assignee_idx").on(table.tenantId, table.assigneeId),
    index("todos_items_list_idx").on(table.listId),
    index("todos_items_due_date_idx").on(table.tenantId, table.dueDate),
  ]
);

/**
 * Todo-Listen (Sammlungen/Kategorien).
 * Jeder Tenant kann beliebig viele Listen erstellen.
 */
export const todosLists = todosTable(
  "lists",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: text("tenant_id").notNull(),
    name: text("name").notNull(),
    color: text("color"),
    icon: text("icon"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("todos_lists_tenant_idx").on(table.tenantId)]
);

/**
 * Labels/Tags fuer Todos.
 * Jeder Tenant kann eigene Labels definieren.
 */
export const todosLabels = todosTable(
  "labels",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: text("tenant_id").notNull(),
    name: text("name").notNull(),
    color: text("color"),
  },
  (table) => [index("todos_labels_tenant_idx").on(table.tenantId)]
);

/**
 * Many-to-Many: Todos zu Labels.
 */
export const todosItemsToLabels = todosTable(
  "items_to_labels",
  {
    todoId: uuid("todo_id")
      .notNull()
      .references(() => todosItems.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => todosLabels.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("todos_items_labels_todo_idx").on(table.todoId),
    index("todos_items_labels_label_idx").on(table.labelId),
  ]
);

// --- Relations ---

export const todosItemsRelations = relations(todosItems, ({ one, many }) => ({
  list: one(todosLists, {
    fields: [todosItems.listId],
    references: [todosLists.id],
  }),
  labels: many(todosItemsToLabels),
}));

export const todosListsRelations = relations(todosLists, ({ many }) => ({
  items: many(todosItems),
}));

export const todosItemsToLabelsRelations = relations(
  todosItemsToLabels,
  ({ one }) => ({
    todo: one(todosItems, {
      fields: [todosItemsToLabels.todoId],
      references: [todosItems.id],
    }),
    label: one(todosLabels, {
      fields: [todosItemsToLabels.labelId],
      references: [todosLabels.id],
    }),
  })
);

// --- Valibot Schemas ---

export const insertTodoItemSchema = createInsertSchema(todosItems);
export const selectTodoItemSchema = createSelectSchema(todosItems);
export const updateTodoItemSchema = createUpdateSchema(todosItems);

export const insertTodoListSchema = createInsertSchema(todosLists);
export const selectTodoListSchema = createSelectSchema(todosLists);

export const insertTodoLabelSchema = createInsertSchema(todosLabels);
export const selectTodoLabelSchema = createSelectSchema(todosLabels);

// --- Combined Schema Export ---

export const todosSchema = {
  todosItems,
  todosLists,
  todosLabels,
  todosItemsToLabels,
  todosItemsRelations,
  todosListsRelations,
  todosItemsToLabelsRelations,
};
