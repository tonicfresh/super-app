import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface CostGroupView {
  label: string;
  totalUsd: number;
  totalTokens: number;
  count: number;
}

export const useCostsStore = defineStore("mc-costs", () => {
  const costGroups = ref<CostGroupView[]>([]);
  const totalUsd = ref(0);
  const groupBy = ref<"module" | "provider" | "model">("module");
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getter: EUR-Approximation (1 USD ~ 0.92 EUR)
  const totalEur = computed(() => +(totalUsd.value * 0.92).toFixed(4));

  async function fetchCosts(opts?: {
    groupBy?: "module" | "provider" | "model";
    from?: string;
    to?: string;
  }) {
    isLoading.value = true;
    error.value = null;
    if (opts?.groupBy) groupBy.value = opts.groupBy;

    try {
      const params = new URLSearchParams();
      params.set("groupBy", groupBy.value);
      if (opts?.from) params.set("from", opts.from);
      if (opts?.to) params.set("to", opts.to);

      const res = await fetch(`/api/v1/mission-control/costs?${params}`);
      const data = await res.json();
      costGroups.value = data.costs;
      totalUsd.value = data.totalUsd;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      isLoading.value = false;
    }
  }

  return { costGroups, totalUsd, totalEur, groupBy, isLoading, error, fetchCosts };
});
