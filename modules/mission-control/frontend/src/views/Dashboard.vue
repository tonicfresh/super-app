<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useAgentSessionsStore } from "../stores/agent-sessions.store";
import { useCostsStore } from "../stores/costs.store";
import { useHealthStore } from "../stores/health.store";
import KpiCard from "../components/KpiCard.vue";
import AgentCard from "../components/AgentCard.vue";

/**
 * Mission Control Dashboard — Uebersichtsseite.
 * Zeigt KPIs, laufende Agents und letzte Sessions.
 */
const agentStore = useAgentSessionsStore();
const costsStore = useCostsStore();
const healthStore = useHealthStore();

let refreshInterval: ReturnType<typeof setInterval>;

onMounted(async () => {
  await Promise.all([
    agentStore.fetchRunningAgents(),
    agentStore.fetchRecentSessions(10),
    costsStore.fetchCosts({ from: new Date().toISOString().split("T")[0] }),
    healthStore.fetchHealth(),
  ]);

  // Auto-Refresh alle 10 Sekunden
  refreshInterval = setInterval(() => {
    agentStore.fetchRunningAgents();
    healthStore.fetchHealth();
  }, 10_000);
});

onUnmounted(() => {
  clearInterval(refreshInterval);
});

function statusIcon(status: string): string {
  switch (status) {
    case "completed": return "check";
    case "failed": return "x";
    case "timeout": return "clock";
    case "awaiting_approval": return "pause";
    default: return "refresh";
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Mission Control</h1>

    <!-- KPI Row -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Active Agents"
        :value="agentStore.runningCount"
        icon="i-heroicons-cpu-chip"
      />
      <KpiCard
        label="Sessions Today"
        :value="agentStore.todaySessionCount"
        icon="i-heroicons-chart-bar"
      />
      <KpiCard
        label="Cost Today"
        :value="`EUR ${costsStore.totalEur.toFixed(2)}`"
        icon="i-heroicons-currency-euro"
      />
      <KpiCard
        label="System"
        :value="healthStore.health?.status ?? 'unknown'"
        icon="i-heroicons-heart"
      />
    </div>

    <!-- Live Agents -->
    <div>
      <h2 class="text-lg font-semibold text-surface-800 dark:text-surface-100 mb-3">Live Agents</h2>
      <div v-if="agentStore.runningAgents.length === 0" class="text-surface-400 italic">
        Keine aktiven Agents.
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AgentCard
          v-for="agent in agentStore.runningAgents"
          :key="agent.id"
          :agent="agent"
        />
      </div>
    </div>

    <!-- Recent Sessions -->
    <div>
      <h2 class="text-lg font-semibold text-surface-800 dark:text-surface-100 mb-3">Recent Sessions</h2>
      <div class="space-y-2">
        <div
          v-for="session in agentStore.recentSessions"
          :key="session.id"
          class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-lg text-sm"
        >
          <span>{{ statusIcon(session.status) }}</span>
          <span class="text-surface-500 w-14">{{ new Date(session.startedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) }}</span>
          <span class="font-medium text-surface-800 dark:text-surface-200">{{ session.moduleName }}</span>
          <span class="text-surface-400">{{ session.steps }} Steps</span>
          <span class="text-surface-400">EUR {{ (session.costUsd * 0.92).toFixed(4) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
