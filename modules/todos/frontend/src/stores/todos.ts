import { defineStore } from "pinia";
import { ref, computed } from "vue";

// ============================================================
// Todos Store — Pinia Store fuer das Todos-Modul
//
// Verwaltet den State aller Todos, Listen und Filter.
// API-Calls gehen an /api/v1/todos (Backend Routes).
// ============================================================

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
  assigneeId: string | null;
  listId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodoList {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  createdBy: string;
  createdAt: string;
}

export interface TodosFilter {
  status?: Todo["status"];
  priority?: Todo["priority"];
  listId?: string;
  search?: string;
}

export const useTodosStore = defineStore("todos", () => {
  // --- State ---

  const todos = ref<Todo[]>([]);
  const lists = ref<TodoList[]>([]);
  const currentTodo = ref<Todo | null>(null);
  const filter = ref<TodosFilter>({});
  const loading = ref(false);
  const error = ref<string | null>(null);
  const viewMode = ref<"list" | "kanban">("list");

  // --- Computed ---

  const filteredTodos = computed(() => {
    let result = todos.value;
    if (filter.value.status) {
      result = result.filter((t) => t.status === filter.value.status);
    }
    if (filter.value.priority) {
      result = result.filter((t) => t.priority === filter.value.priority);
    }
    if (filter.value.listId) {
      result = result.filter((t) => t.listId === filter.value.listId);
    }
    if (filter.value.search) {
      const q = filter.value.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }
    return result;
  });

  const openTodos = computed(() =>
    filteredTodos.value.filter((t) => t.status === "open")
  );

  const inProgressTodos = computed(() =>
    filteredTodos.value.filter((t) => t.status === "in_progress")
  );

  const doneTodos = computed(() =>
    filteredTodos.value.filter((t) => t.status === "done")
  );

  const todosByPriority = computed(() => {
    const order = { urgent: 0, high: 1, medium: 2, low: 3 };
    return [...filteredTodos.value].sort(
      (a, b) => order[a.priority] - order[b.priority]
    );
  });

  // --- API-Hilfsfunktion ---

  async function api<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const res = await fetch(`/api/v1/todos${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `API Error: ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()).data;
  }

  // --- Actions ---

  async function fetchTodos() {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filter.value.status) params.set("status", filter.value.status);
      if (filter.value.priority) params.set("priority", filter.value.priority);
      if (filter.value.listId) params.set("listId", filter.value.listId);
      if (filter.value.search) params.set("search", filter.value.search);
      const query = params.toString();
      todos.value = await api<Todo[]>(`/${query ? `?${query}` : ""}`);
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchTodo(id: string) {
    loading.value = true;
    error.value = null;
    try {
      currentTodo.value = await api<Todo>(`/${id}`);
    } catch (err: any) {
      error.value = err.message;
      currentTodo.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function createTodo(input: {
    title: string;
    description?: string;
    priority?: Todo["priority"];
    dueDate?: string;
    listId?: string;
  }) {
    error.value = null;
    try {
      const created = await api<Todo>("/", {
        method: "POST",
        body: JSON.stringify(input),
      });
      todos.value.unshift(created);
      return created;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    }
  }

  async function updateTodo(
    id: string,
    input: Partial<Omit<Todo, "id" | "createdBy" | "createdAt" | "updatedAt">>
  ) {
    error.value = null;
    try {
      const updated = await api<Todo>(`/${id}`, {
        method: "PUT",
        body: JSON.stringify(input),
      });
      const idx = todos.value.findIndex((t) => t.id === id);
      if (idx >= 0) todos.value[idx] = updated;
      if (currentTodo.value?.id === id) currentTodo.value = updated;
      return updated;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    }
  }

  async function deleteTodo(id: string) {
    error.value = null;
    try {
      await api(`/${id}`, { method: "DELETE" });
      todos.value = todos.value.filter((t) => t.id !== id);
      if (currentTodo.value?.id === id) currentTodo.value = null;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    }
  }

  async function fetchLists() {
    try {
      lists.value = await api<TodoList[]>("/lists");
    } catch (err: any) {
      error.value = err.message;
    }
  }

  async function createList(input: { name: string; color?: string; icon?: string }) {
    try {
      const created = await api<TodoList>("/lists", {
        method: "POST",
        body: JSON.stringify(input),
      });
      lists.value.push(created);
      return created;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    }
  }

  function setFilter(newFilter: TodosFilter) {
    filter.value = { ...newFilter };
  }

  function setViewMode(mode: "list" | "kanban") {
    viewMode.value = mode;
  }

  return {
    // State
    todos,
    lists,
    currentTodo,
    filter,
    loading,
    error,
    viewMode,
    // Computed
    filteredTodos,
    openTodos,
    inProgressTodos,
    doneTodos,
    todosByPriority,
    // Actions
    fetchTodos,
    fetchTodo,
    createTodo,
    updateTodo,
    deleteTodo,
    fetchLists,
    createList,
    setFilter,
    setViewMode,
  };
});
