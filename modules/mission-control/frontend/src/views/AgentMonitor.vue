<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useAgentSessionsStore } from "../stores/agent-sessions.store";
import AgentCard from "../components/AgentCard.vue";

/**
 * Agent Monitor — Echtzeit-Ueberwachung via WebSocket.
 * Zeigt alle laufenden Agents mit Live-Updates.
 */
const agentStore = useAgentSessionsStore();
const wsConnected = ref(false);
let ws: WebSocket | null = null;

function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${window.location.host}/api/v1/ws`);

  ws.onopen = () => {
    wsConnected.value = true;
  };

  ws.onmessage = (event) => {
    try {
      const { type, data } = JSON.parse(event.data);
      agentStore.handleWsEvent(type, data);
    } catch {
      console.warn("[AgentMonitor] Ungueltiges WebSocket-Event:", event.data);
    }
  };

  ws.onclose = () => {
    wsConnected.value = false;
    // Reconnect nach 3 Sekunden
    setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

onMounted(async () => {
  await agentStore.fetchRunningAgents();
  await agentStore.fetchRecentSessions(20);
  connectWebSocket();
});

onUnmounted(() => {
  ws?.close();
  ws = null;
});
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Agent Monitor</h1>
      <span
        class="text-xs px-2 py-1 rounded-full"
        :class="wsConnected
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'"
      >
        {{ wsConnected ? 'Live' : 'Reconnecting...' }}
      </span>
    </div>

    <!-- Laufende Agents -->
    <div>
      <h2 class="text-lg font-semibold text-surface-800 dark:text-surface-100 mb-3">
        Running ({{ agentStore.runningCount }})
      </h2>
      <div v-if="agentStore.runningAgents.length === 0" class="text-surface-400 italic p-4">
        Keine aktiven Agents. Warte auf neue Sessions...
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AgentCard
          v-for="agent in agentStore.runningAgents"
          :key="agent.id"
          :agent="agent"
        />
      </div>
    </div>

    <!-- Letzte Sessions -->
    <div>
      <h2 class="text-lg font-semibold text-surface-800 dark:text-surface-100 mb-3">Recent Sessions</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-surface-500 border-b border-surface-200 dark:border-surface-700">
              <th class="pb-2">Status</th>
              <th class="pb-2">Time</th>
              <th class="pb-2">Agent</th>
              <th class="pb-2">Module</th>
              <th class="pb-2">Steps</th>
              <th class="pb-2">Cost</th>
              <th class="pb-2">Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="session in agentStore.recentSessions"
              :key="session.id"
              class="border-b border-surface-100 dark:border-surface-800"
            >
              <td class="py-2">
                <span class="px-2 py-0.5 rounded text-xs" :class="{
                  'bg-green-100 text-green-800': session.status === 'completed',
                  'bg-red-100 text-red-800': session.status === 'failed',
                  'bg-yellow-100 text-yellow-800': session.status === 'timeout',
                }">{{ session.status }}</span>
              </td>
              <td class="py-2 text-surface-500">{{ new Date(session.startedAt).toLocaleTimeString('de-DE') }}</td>
              <td class="py-2 font-medium">{{ session.agentType }}</td>
              <td class="py-2">{{ session.moduleName }}</td>
              <td class="py-2">{{ session.steps }}</td>
              <td class="py-2">{{ session.costUsd.toFixed(4) }} $</td>
              <td class="py-2 text-surface-400">
                {{ session.completedAt
                  ? `${((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000).toFixed(1)}s`
                  : '--' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
