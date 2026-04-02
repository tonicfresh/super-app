<script setup lang="ts">
import type { AgentSessionView } from "../stores/agent-sessions.store";

/**
 * Karte fuer einen laufenden Agent.
 * Zeigt Typ, Modul, Steps, Kosten und aktuelle Tool-Calls.
 */
defineProps<{
  agent: AgentSessionView;
}>();

function formatDuration(startedAt: string): string {
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function lastToolCall(agent: AgentSessionView) {
  return agent.toolCalls.length > 0
    ? agent.toolCalls[agent.toolCalls.length - 1]
    : null;
}
</script>

<template>
  <div class="bg-surface-0 dark:bg-surface-900 rounded-xl border border-primary-200 dark:border-primary-800 p-4">
    <div class="flex items-center justify-between mb-2">
      <span class="font-semibold text-surface-900 dark:text-surface-0">
        {{ agent.agentType === 'main' ? 'Main Agent' : `${agent.moduleName} Agent` }}
      </span>
      <span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        {{ agent.status }}
      </span>
    </div>
    <div class="text-sm text-surface-500 dark:text-surface-400 space-y-1">
      <div>Step {{ agent.steps }}/30 | {{ agent.costUsd.toFixed(4) }} USD | {{ formatDuration(agent.startedAt) }}</div>
      <div>{{ agent.channel }} -> {{ agent.userId }}</div>
      <div v-if="lastToolCall(agent)" class="text-primary-600 dark:text-primary-400 font-mono text-xs mt-1">
        -> {{ lastToolCall(agent)!.tool }}({{ Object.keys(lastToolCall(agent)!.args).join(', ') }})
      </div>
    </div>
  </div>
</template>
