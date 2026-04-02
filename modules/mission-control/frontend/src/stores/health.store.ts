import { defineStore } from "pinia";
import { ref } from "vue";

export interface HealthStatus {
  status: "healthy" | "degraded" | "down";
  uptime: number;
  database: "connected" | "disconnected" | "error";
  activeAgents: number;
  timestamp: string;
}

export const useHealthStore = defineStore("mc-health", () => {
  const health = ref<HealthStatus | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchHealth() {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await fetch("/api/v1/mission-control/health");
      health.value = await res.json();
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      isLoading.value = false;
    }
  }

  return { health, isLoading, error, fetchHealth };
});
