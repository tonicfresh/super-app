<script setup lang="ts">
/**
 * TodoSettings — Einstellungen fuer das Todos-Modul.
 * Listen-Verwaltung, Label-Verwaltung.
 */
import { onMounted, ref } from "vue";
import { useTodosStore } from "../stores/todos";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import ColorPicker from "primevue/colorpicker";

const store = useTodosStore();
const newListName = ref("");
const newListColor = ref("3B82F6");

onMounted(async () => {
  await store.fetchLists();
});

async function handleCreateList() {
  if (!newListName.value.trim()) return;
  await store.createList({
    name: newListName.value,
    color: `#${newListColor.value}`,
  });
  newListName.value = "";
  newListColor.value = "3B82F6";
}
</script>

<template>
  <div class="mx-auto max-w-2xl p-4">
    <h1 class="mb-4 text-2xl font-bold">Todo-Einstellungen</h1>

    <!-- Listen-Verwaltung -->
    <section class="mb-8">
      <h2 class="mb-3 text-lg font-semibold">Listen</h2>

      <div class="mb-4 flex items-end gap-3">
        <div class="flex-1">
          <label class="mb-1 block text-sm font-medium">Neue Liste</label>
          <InputText
            v-model="newListName"
            placeholder="Listenname..."
            class="w-full"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium">Farbe</label>
          <ColorPicker v-model="newListColor" />
        </div>
        <Button
          label="Erstellen"
          icon="i-heroicons-plus"
          :disabled="!newListName.trim()"
          @click="handleCreateList"
        />
      </div>

      <DataTable :value="store.lists" striped-rows>
        <Column field="name" header="Name" />
        <Column field="color" header="Farbe">
          <template #body="{ data }">
            <div
              v-if="data.color"
              class="h-5 w-5 rounded"
              :style="{ backgroundColor: data.color }"
            />
            <span v-else class="text-surface-400">&mdash;</span>
          </template>
        </Column>
        <Column field="createdAt" header="Erstellt">
          <template #body="{ data }">
            {{ new Date(data.createdAt).toLocaleDateString("de-DE") }}
          </template>
        </Column>
      </DataTable>
    </section>
  </div>
</template>
