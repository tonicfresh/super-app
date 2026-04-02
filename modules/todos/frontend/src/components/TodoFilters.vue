<script setup lang="ts">
/**
 * TodoFilters — Filter-Leiste fuer die Todo-Liste.
 * PrimeVue Dropdown + InputText + ToggleButton.
 */
import Select from "primevue/select";
import InputText from "primevue/inputtext";
import SelectButton from "primevue/selectbutton";
import type { TodosFilter } from "../stores/todos";

const props = defineProps<{
  filter: TodosFilter;
  viewMode: "list" | "kanban";
}>();

const emit = defineEmits<{
  "update:filter": [filter: TodosFilter];
  "update:viewMode": [mode: "list" | "kanban"];
}>();

const statusOptions = [
  { label: "Alle", value: undefined },
  { label: "Offen", value: "open" },
  { label: "In Arbeit", value: "in_progress" },
  { label: "Erledigt", value: "done" },
];

const priorityOptions = [
  { label: "Alle", value: undefined },
  { label: "Dringend", value: "urgent" },
  { label: "Hoch", value: "high" },
  { label: "Mittel", value: "medium" },
  { label: "Niedrig", value: "low" },
];

const viewOptions = [
  { label: "Liste", value: "list" },
  { label: "Kanban", value: "kanban" },
];

function updateFilter(key: keyof TodosFilter, value: any) {
  emit("update:filter", { ...props.filter, [key]: value });
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <InputText
      :model-value="filter.search || ''"
      placeholder="Suchen..."
      class="w-48"
      @update:model-value="updateFilter('search', $event || undefined)"
    />

    <Select
      :model-value="filter.status"
      :options="statusOptions"
      option-label="label"
      option-value="value"
      placeholder="Status"
      class="w-36"
      @update:model-value="updateFilter('status', $event)"
    />

    <Select
      :model-value="filter.priority"
      :options="priorityOptions"
      option-label="label"
      option-value="value"
      placeholder="Prioritaet"
      class="w-36"
      @update:model-value="updateFilter('priority', $event)"
    />

    <div class="ml-auto">
      <SelectButton
        :model-value="viewMode"
        :options="viewOptions"
        option-label="label"
        option-value="value"
        @update:model-value="emit('update:viewMode', $event)"
      />
    </div>
  </div>
</template>
