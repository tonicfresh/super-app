import { defineStore } from "pinia";
import { ref } from "vue";

export interface AuditEntryView {
  id: string;
  timestamp: string;
  userId: string;
  agentId: string;
  action: string;
  resource: string;
  result: "granted" | "denied" | "approval_requested" | "approval_granted" | "approval_denied";
  metadata: Record<string, unknown>;
}

export interface AuditFilter {
  userId?: string;
  action?: string;
  result?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export const useAuditLogStore = defineStore("mc-audit-log", () => {
  const entries = ref<AuditEntryView[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);

  async function fetchLogs(filter: AuditFilter = {}) {
    isLoading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filter.userId) params.set("userId", filter.userId);
      if (filter.action) params.set("action", filter.action);
      if (filter.result) params.set("result", filter.result);
      if (filter.from) params.set("from", filter.from);
      if (filter.to) params.set("to", filter.to);
      if (filter.limit) params.set("limit", String(filter.limit));
      if (filter.offset) params.set("offset", String(filter.offset));

      const res = await fetch(`/api/v1/mission-control/logs?${params}`);
      const data = await res.json();
      entries.value = data.logs;
      total.value = data.total;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      isLoading.value = false;
    }
  }

  return { entries, isLoading, error, total, fetchLogs };
});
