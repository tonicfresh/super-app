<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useCostsStore } from "../stores/costs.store";
import VueApexCharts from "vue3-apexcharts";
import KpiCard from "../components/KpiCard.vue";

/**
 * Cost Tracker — KI-Kosten pro Modul, Provider und Zeitraum.
 * Visualisierung mit ApexCharts.
 */
const costsStore = useCostsStore();
const selectedGroupBy = ref<"module" | "provider" | "model">("module");

// ApexCharts Konfiguration
const chartOptions = ref({
  chart: {
    type: "bar" as const,
    height: 350,
    toolbar: { show: false },
  },
  colors: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"],
  plotOptions: {
    bar: { borderRadius: 6, horizontal: false },
  },
  xaxis: {
    categories: [] as string[],
  },
  yaxis: {
    title: { text: "Cost (USD)" },
  },
  tooltip: {
    y: { formatter: (val: number) => `$${val.toFixed(4)}` },
  },
});

const chartSeries = ref([{
  name: "Cost (USD)",
  data: [] as number[],
}]);

watch(
  () => costsStore.costGroups,
  (groups) => {
    chartOptions.value.xaxis.categories = groups.map((g) => g.label);
    chartSeries.value = [{
      name: "Cost (USD)",
      data: groups.map((g) => g.totalUsd),
    }];
  },
  { deep: true }
);

async function loadCosts() {
  await costsStore.fetchCosts({ groupBy: selectedGroupBy.value });
}

onMounted(loadCosts);
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Cost Tracker</h1>
      <div class="flex gap-2">
        <button
          v-for="group in (['module', 'provider', 'model'] as const)"
          :key="group"
          class="px-3 py-1.5 rounded-lg text-sm transition"
          :class="selectedGroupBy === group
            ? 'bg-primary-500 text-white'
            : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'"
          @click="selectedGroupBy = group; loadCosts()"
        >
          {{ group.charAt(0).toUpperCase() + group.slice(1) }}
        </button>
      </div>
    </div>

    <!-- KPI Row -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <KpiCard
        label="Total (USD)"
        :value="`$${costsStore.totalUsd.toFixed(4)}`"
        icon="i-heroicons-banknotes"
      />
      <KpiCard
        label="Total (EUR)"
        :value="`EUR ${costsStore.totalEur.toFixed(4)}`"
        icon="i-heroicons-currency-euro"
      />
      <KpiCard
        label="Groups"
        :value="costsStore.costGroups.length"
        icon="i-heroicons-squares-2x2"
      />
    </div>

    <!-- Chart -->
    <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
      <VueApexCharts
        type="bar"
        height="350"
        :options="chartOptions"
        :series="chartSeries"
      />
    </div>

    <!-- Detail-Tabelle -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-surface-500 border-b border-surface-200 dark:border-surface-700">
            <th class="pb-2">{{ selectedGroupBy.charAt(0).toUpperCase() + selectedGroupBy.slice(1) }}</th>
            <th class="pb-2 text-right">Calls</th>
            <th class="pb-2 text-right">Tokens</th>
            <th class="pb-2 text-right">Cost (USD)</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="group in costsStore.costGroups"
            :key="group.label"
            class="border-b border-surface-100 dark:border-surface-800"
          >
            <td class="py-2 font-medium">{{ group.label }}</td>
            <td class="py-2 text-right">{{ group.count }}</td>
            <td class="py-2 text-right">{{ group.totalTokens.toLocaleString() }}</td>
            <td class="py-2 text-right font-mono">${{ group.totalUsd.toFixed(4) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
