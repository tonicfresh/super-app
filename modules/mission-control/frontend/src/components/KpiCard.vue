<script setup lang="ts">
/**
 * KPI-Karte fuer Dashboard-Metriken.
 * Zeigt einen Wert mit Label und optionalem Trend-Indikator.
 */
defineProps<{
  label: string;
  value: string | number;
  icon?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}>();
</script>

<template>
  <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-5">
    <div class="flex items-center justify-between mb-3">
      <span class="text-surface-500 dark:text-surface-400 text-sm font-medium">{{ label }}</span>
      <span v-if="icon" :class="icon" class="text-xl text-primary-500" />
    </div>
    <div class="text-2xl font-bold text-surface-900 dark:text-surface-0">{{ value }}</div>
    <div v-if="trendValue" class="mt-2 text-sm" :class="{
      'text-green-500': trend === 'up',
      'text-red-500': trend === 'down',
      'text-surface-400': trend === 'neutral',
    }">
      {{ trendValue }}
    </div>
  </div>
</template>
