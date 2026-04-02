<script setup lang="ts">
/**
 * TodoCard — Einzelne Todo-Karte.
 * Verwendet PrimeVue Card + Design Tokens.
 * KEINE hardcodierten Farben!
 */
import { computed } from "vue";
import Card from "primevue/card";
import Tag from "primevue/tag";
import Button from "primevue/button";
import type { Todo } from "../stores/todos";

const props = defineProps<{
  todo: Todo;
}>();

const emit = defineEmits<{
  click: [id: string];
  statusChange: [id: string, status: Todo["status"]];
  delete: [id: string];
}>();

const prioritySeverity = computed(() => {
  const map: Record<string, string> = {
    urgent: "danger",
    high: "warn",
    medium: "info",
    low: "secondary",
  };
  return map[props.todo.priority] || "info";
});

const statusSeverity = computed(() => {
  const map: Record<string, string> = {
    open: "info",
    in_progress: "warn",
    done: "success",
  };
  return map[props.todo.status] || "info";
});

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    open: "Offen",
    in_progress: "In Arbeit",
    done: "Erledigt",
  };
  return map[props.todo.status] || props.todo.status;
});

const formattedDueDate = computed(() => {
  if (!props.todo.dueDate) return null;
  return new Date(props.todo.dueDate).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
});

const isOverdue = computed(() => {
  if (!props.todo.dueDate || props.todo.status === "done") return false;
  return new Date(props.todo.dueDate) < new Date();
});
</script>

<template>
  <Card
    class="cursor-pointer transition-shadow hover:shadow-lg"
    :class="{ 'border-l-4 border-l-red-500': isOverdue }"
    @click="emit('click', todo.id)"
  >
    <template #title>
      <div class="flex items-center justify-between gap-2">
        <span
          class="text-sm font-semibold"
          :class="{ 'line-through opacity-50': todo.status === 'done' }"
        >
          {{ todo.title }}
        </span>
        <Tag :value="statusLabel" :severity="statusSeverity" />
      </div>
    </template>

    <template #content>
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <Tag
          :value="todo.priority"
          :severity="prioritySeverity"
          class="capitalize"
        />
        <span v-if="formattedDueDate" class="text-surface-500">
          <i class="i-heroicons-calendar text-xs" />
          {{ formattedDueDate }}
        </span>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center gap-1">
        <Button
          v-if="todo.status !== 'done'"
          icon="i-heroicons-check"
          text
          rounded
          size="small"
          severity="success"
          @click.stop="emit('statusChange', todo.id, 'done')"
          v-tooltip="'Als erledigt markieren'"
        />
        <Button
          icon="i-heroicons-trash"
          text
          rounded
          size="small"
          severity="danger"
          @click.stop="emit('delete', todo.id)"
          v-tooltip="'Loeschen'"
        />
      </div>
    </template>
  </Card>
</template>
