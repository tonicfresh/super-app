import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface AgentSessionView {
  id: string;
  agentType: "main" | "sub" | "dynamic";
  moduleName: string;
  userId: string;
  channel: "telegram" | "pwa" | "api";
  status: "running" | "completed" | "failed" | "timeout" | "awaiting_approval";
  startedAt: string;
  completedAt: string | null;
  steps: number;
  tokensUsed: number;
  costUsd: number;
  toolCalls: {
    tool: string;
    args: Record<string, unknown>;
    result: "success" | "error";
    errorCode?: string;
    duration: number;
  }[];
}

export const useAgentSessionsStore = defineStore("mc-agent-sessions", () => {
  // State
  const runningAgents = ref<AgentSessionView[]>([]);
  const recentSessions = ref<AgentSessionView[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const runningCount = computed(() => runningAgents.value.length);
  const todaySessionCount = computed(() => {
    const today = new Date().toISOString().split("T")[0];
    return recentSessions.value.filter(
      (s) => s.startedAt.startsWith(today)
    ).length;
  });

  // Actions
  async function fetchRunningAgents() {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await fetch("/api/v1/mission-control/agents");
      const data = await res.json();
      runningAgents.value = data.agents;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchRecentSessions(limit = 50) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(
        `/api/v1/mission-control/agents/recent?limit=${limit}`
      );
      const data = await res.json();
      recentSessions.value = data.sessions;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      isLoading.value = false;
    }
  }

  /** WebSocket-Updates verarbeiten */
  function handleWsEvent(event: string, data: any) {
    if (event === "agent:started") {
      runningAgents.value.push(data);
    } else if (event === "agent:step") {
      const agent = runningAgents.value.find((a) => a.id === data.sessionId);
      if (agent) {
        agent.steps++;
        agent.toolCalls.push(data.toolCall);
      }
    } else if (event === "agent:completed") {
      const idx = runningAgents.value.findIndex((a) => a.id === data.sessionId);
      if (idx !== -1) {
        const completed = { ...runningAgents.value[idx], ...data };
        runningAgents.value.splice(idx, 1);
        recentSessions.value.unshift(completed);
      }
    }
  }

  return {
    runningAgents,
    recentSessions,
    isLoading,
    error,
    runningCount,
    todaySessionCount,
    fetchRunningAgents,
    fetchRecentSessions,
    handleWsEvent,
  };
});
