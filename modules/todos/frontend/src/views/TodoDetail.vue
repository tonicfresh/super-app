<script setup lang="ts">
/**
 * TodoDetail — Einzelansicht eines Todos mit Bearbeitungsmoeglichkeit.
 */
import { onMounted, ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTodosStore } from "../stores/todos";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Tag from "primevue/tag";

const route = useRoute();
const router = useRouter();
const store = useTodosStore();

const isEditing = ref(false);
const editForm = ref({
  title: "",
  description: "",
  status: "" as string,
  priority: "" as string,
  dueDate: null as Date | null,
});

const statusOptions = [
  { label: "Offen", value: "open" },
  { label: "In Arbeit", value: "in_progress" },
  { label: "Erledigt", value: "done" },
];

const priorityOptions = [
  { label: "Niedrig", value: "low" },
  { label: "Mittel", value: "medium" },
  { label: "Hoch", value: "high" },
  { label: "Dringend", value: "urgent" },
];

const todoId = computed(() => route.params.id as string);

onMounted(async () => {
  await store.fetchTodo(todoId.value);
  if (store.currentTodo) {
    editForm.value = {
      title: store.currentTodo.title,
      description: store.currentTodo.description || "",
      status: store.currentTodo.status,
      priority: store.currentTodo.priority,
      dueDate: store.currentTodo.dueDate
        ? new Date(store.currentTodo.dueDate)
        : null,
    };
  }
});

function startEditing() {
  if (!store.currentTodo) return;
  editForm.value = {
    title: store.currentTodo.title,
    description: store.currentTodo.description || "",
    status: store.currentTodo.status,
    priority: store.currentTodo.priority,
    dueDate: store.currentTodo.dueDate
      ? new Date(store.currentTodo.dueDate)
      : null,
  };
  isEditing.value = true;
}

async function saveChanges() {
  await store.updateTodo(todoId.value, {
    title: editForm.value.title,
    description: editForm.value.description || null,
    status: editForm.value.status as any,
    priority: editForm.value.priority as any,
    dueDate: editForm.value.dueDate?.toISOString() || null,
  });
  isEditing.value = false;
}

async function handleDelete() {
  if (confirm("Todo wirklich loeschen?")) {
    await store.deleteTodo(todoId.value);
    router.push("/todos");
  }
}

function goBack() {
  router.push("/todos");
}
</script>

<template>
  <div class="mx-auto max-w-2xl p-4">
    <!-- Zurueck-Button -->
    <Button
      icon="i-heroicons-arrow-left"
      text
      rounded
      class="mb-4"
      @click="goBack"
      label="Zurueck"
    />

    <!-- Loading -->
    <div v-if="store.loading" class="py-8 text-center text-surface-400">
      Laden...
    </div>

    <!-- Not Found -->
    <div v-else-if="!store.currentTodo" class="py-8 text-center text-surface-400">
      Todo nicht gefunden.
    </div>

    <!-- Todo Detail -->
    <div v-else class="flex flex-col gap-4">
      <!-- View Mode -->
      <template v-if="!isEditing">
        <div class="flex items-start justify-between">
          <h1 class="text-2xl font-bold">{{ store.currentTodo.title }}</h1>
          <div class="flex gap-2">
            <Button
              icon="i-heroicons-pencil"
              text
              rounded
              @click="startEditing"
              v-tooltip="'Bearbeiten'"
            />
            <Button
              icon="i-heroicons-trash"
              text
              rounded
              severity="danger"
              @click="handleDelete"
              v-tooltip="'Loeschen'"
            />
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <Tag :value="store.currentTodo.status" />
          <Tag :value="store.currentTodo.priority" class="capitalize" />
          <Tag
            v-if="store.currentTodo.dueDate"
            :value="new Date(store.currentTodo.dueDate).toLocaleDateString('de-DE')"
            icon="i-heroicons-calendar"
          />
        </div>

        <p
          v-if="store.currentTodo.description"
          class="whitespace-pre-wrap text-surface-600 dark:text-surface-300"
        >
          {{ store.currentTodo.description }}
        </p>
        <p v-else class="text-surface-400 italic">Keine Beschreibung</p>

        <div class="text-xs text-surface-400">
          Erstellt: {{ new Date(store.currentTodo.createdAt).toLocaleString("de-DE") }}
          <br />
          Aktualisiert: {{ new Date(store.currentTodo.updatedAt).toLocaleString("de-DE") }}
        </div>
      </template>

      <!-- Edit Mode -->
      <template v-else>
        <h2 class="text-lg font-semibold">Todo bearbeiten</h2>

        <div>
          <label class="mb-1 block text-sm font-medium">Titel</label>
          <InputText v-model="editForm.title" class="w-full" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium">Beschreibung</label>
          <Textarea v-model="editForm.description" class="w-full" rows="4" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="mb-1 block text-sm font-medium">Status</label>
            <Select
              v-model="editForm.status"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium">Prioritaet</label>
            <Select
              v-model="editForm.priority"
              :options="priorityOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium">Faellig am</label>
          <DatePicker
            v-model="editForm.dueDate"
            date-format="dd.mm.yy"
            class="w-full"
          />
        </div>

        <div class="flex gap-2">
          <Button label="Speichern" icon="i-heroicons-check" @click="saveChanges" />
          <Button
            label="Abbrechen"
            text
            @click="isEditing = false"
          />
        </div>
      </template>
    </div>

    <!-- Error -->
    <p v-if="store.error" class="mt-4 text-red-500">{{ store.error }}</p>
  </div>
</template>
