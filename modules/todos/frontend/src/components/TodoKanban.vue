<script setup lang="ts">
/**
 * TodoKanban — Kanban-Board mit drei Spalten.
 * Verwendet Design Tokens fuer Farben.
 */
import TodoCard from "./TodoCard.vue";
import type { Todo } from "../stores/todos";

defineProps<{
  openTodos: Todo[];
  inProgressTodos: Todo[];
  doneTodos: Todo[];
}>();

const emit = defineEmits<{
  click: [id: string];
  statusChange: [id: string, status: Todo["status"]];
  delete: [id: string];
}>();

const columns = [
  { key: "open", label: "Offen", prop: "openTodos" },
  { key: "in_progress", label: "In Arbeit", prop: "inProgressTodos" },
  { key: "done", label: "Erledigt", prop: "doneTodos" },
] as const;
</script>

<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
    <div
      v-for="col in columns"
      :key="col.key"
      class="rounded-lg bg-surface-50 p-3 dark:bg-surface-800"
    >
      <h3 class="mb-3 text-sm font-semibold text-surface-600 dark:text-surface-300">
        {{ col.label }}
        <span class="ml-1 text-xs opacity-60">
          ({{ $props[col.prop].length }})
        </span>
      </h3>

      <div class="flex flex-col gap-2">
        <TodoCard
          v-for="todo in $props[col.prop]"
          :key="todo.id"
          :todo="todo"
          @click="emit('click', $event)"
          @status-change="(id, status) => emit('statusChange', id, status)"
          @delete="emit('delete', $event)"
        />

        <p
          v-if="$props[col.prop].length === 0"
          class="py-4 text-center text-xs text-surface-400"
        >
          Keine Eintraege
        </p>
      </div>
    </div>
  </div>
</template>
