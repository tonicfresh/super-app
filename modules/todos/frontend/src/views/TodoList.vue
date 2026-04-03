<script setup lang="ts">
/**
 * TodoList — Hauptansicht des Todos-Moduls.
 * Zeigt Todos als Liste oder Kanban-Board.
 * PrimeVue DataTable fuer die Listenansicht.
 */
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useTodosStore } from "../stores/todos";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import TodoFilters from "../components/TodoFilters.vue";
import TodoKanban from "../components/TodoKanban.vue";

const store = useTodosStore();
const router = useRouter();

// --- Dialog State ---
const showCreateDialog = ref(false);
const newTodo = ref({
  title: "",
  description: "",
  priority: "medium" as const,
  dueDate: null as Date | null,
});

const priorityOptions = [
  { label: "Niedrig", value: "low" },
  { label: "Mittel", value: "medium" },
  { label: "Hoch", value: "high" },
  { label: "Dringend", value: "urgent" },
];

// --- Lifecycle ---

onMounted(async () => {
  await Promise.all([store.fetchTodos(), store.fetchLists()]);
});

// --- Actions ---

async function handleCreate() {
  if (!newTodo.value.title.trim()) return;

  await store.createTodo({
    title: newTodo.value.title,
    description: newTodo.value.description || undefined,
    priority: newTodo.value.priority,
    dueDate: newTodo.value.dueDate?.toISOString(),
  });

  showCreateDialog.value = false;
  newTodo.value = { title: "", description: "", priority: "medium", dueDate: null };
}

function handleTodoClick(id: string) {
  router.push(`/todos/${id}`);
}

async function handleStatusChange(id: string, status: string) {
  await store.updateTodo(id, { status: status as "open" | "in_progress" | "done" });
}

async function handleDelete(id: string) {
  if (confirm("Todo wirklich loeschen?")) {
    await store.deleteTodo(id);
  }
}

function statusSeverity(status: string) {
  const map: Record<string, string> = {
    open: "info",
    in_progress: "warn",
    done: "success",
  };
  return map[status] || "info";
}

function prioritySeverity(priority: string) {
  const map: Record<string, string> = {
    urgent: "danger",
    high: "warn",
    medium: "info",
    low: "secondary",
  };
  return map[priority] || "info";
}
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Todos</h1>
      <Button
        label="Neues Todo"
        icon="i-heroicons-plus"
        @click="showCreateDialog = true"
      />
    </div>

    <!-- Filter -->
    <TodoFilters
      :filter="store.filter"
      :view-mode="store.viewMode"
      @update:filter="store.setFilter($event)"
      @update:view-mode="store.setViewMode($event)"
    />

    <!-- Listenansicht -->
    <DataTable
      v-if="store.viewMode === 'list'"
      :value="store.filteredTodos"
      :loading="store.loading"
      striped-rows
      responsive-layout="scroll"
      @row-click="handleTodoClick($event.data.id)"
      class="cursor-pointer"
    >
      <Column field="title" header="Titel" sortable />
      <Column field="status" header="Status" sortable>
        <template #body="{ data }">
          <Tag :value="data.status" :severity="statusSeverity(data.status)" />
        </template>
      </Column>
      <Column field="priority" header="Prioritaet" sortable>
        <template #body="{ data }">
          <Tag
            :value="data.priority"
            :severity="prioritySeverity(data.priority)"
            class="capitalize"
          />
        </template>
      </Column>
      <Column field="dueDate" header="Faellig" sortable>
        <template #body="{ data }">
          <span v-if="data.dueDate">
            {{ new Date(data.dueDate).toLocaleDateString("de-DE") }}
          </span>
          <span v-else class="text-surface-400">&mdash;</span>
        </template>
      </Column>
      <Column header="Aktionen" :exportable="false" style="width: 8rem">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              v-if="data.status !== 'done'"
              icon="i-heroicons-check"
              text
              rounded
              size="small"
              severity="success"
              @click.stop="handleStatusChange(data.id, 'done')"
            />
            <Button
              icon="i-heroicons-trash"
              text
              rounded
              size="small"
              severity="danger"
              @click.stop="handleDelete(data.id)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Kanban-Ansicht -->
    <TodoKanban
      v-else
      :open-todos="store.openTodos"
      :in-progress-todos="store.inProgressTodos"
      :done-todos="store.doneTodos"
      @click="handleTodoClick"
      @status-change="handleStatusChange"
      @delete="handleDelete"
    />

    <!-- Error -->
    <p v-if="store.error" class="text-red-500">{{ store.error }}</p>

    <!-- Create Dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      header="Neues Todo"
      :modal="true"
      class="w-full max-w-lg"
    >
      <div class="flex flex-col gap-4">
        <div>
          <label class="mb-1 block text-sm font-medium">Titel *</label>
          <InputText
            v-model="newTodo.title"
            class="w-full"
            placeholder="Was muss erledigt werden?"
            autofocus
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium">Beschreibung</label>
          <Textarea
            v-model="newTodo.description"
            class="w-full"
            rows="3"
            placeholder="Optionale Details..."
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="mb-1 block text-sm font-medium">Prioritaet</label>
            <Select
              v-model="newTodo.priority"
              :options="priorityOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium">Faellig am</label>
            <DatePicker
              v-model="newTodo.dueDate"
              date-format="dd.mm.yy"
              class="w-full"
              :min-date="new Date()"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <Button
          label="Abbrechen"
          text
          @click="showCreateDialog = false"
        />
        <Button
          label="Erstellen"
          icon="i-heroicons-plus"
          :disabled="!newTodo.title.trim()"
          @click="handleCreate"
        />
      </template>
    </Dialog>
  </div>
</template>
