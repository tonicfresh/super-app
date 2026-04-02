<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useAuditLogStore } from "../stores/audit-log.store";

/**
 * Log Viewer — Echtzeit-Audit-Logs mit Filtern.
 */
const auditStore = useAuditLogStore();
const filterUserId = ref("");
const filterAction = ref("");
const filterResult = ref("");

async function applyFilter() {
  await auditStore.fetchLogs({
    userId: filterUserId.value || undefined,
    action: filterAction.value || undefined,
    result: filterResult.value || undefined,
    limit: 100,
  });
}

onMounted(async () => {
  await auditStore.fetchLogs({ limit: 100 });
});

function resultClass(result: string) {
  switch (result) {
    case "granted": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "denied": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "approval_requested": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    default: return "bg-surface-100 text-surface-800";
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Log Viewer</h1>

    <!-- Filter -->
    <div class="flex flex-wrap gap-3">
      <input
        v-model="filterUserId"
        type="text"
        placeholder="User ID"
        class="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 text-sm"
      />
      <input
        v-model="filterAction"
        type="text"
        placeholder="Action (e.g. mail:send)"
        class="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 text-sm"
      />
      <select
        v-model="filterResult"
        class="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 text-sm"
      >
        <option value="">All Results</option>
        <option value="granted">Granted</option>
        <option value="denied">Denied</option>
        <option value="approval_requested">Approval Requested</option>
      </select>
      <button
        class="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition"
        @click="applyFilter"
      >
        Filter
      </button>
    </div>

    <!-- Log-Tabelle -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-surface-500 border-b border-surface-200 dark:border-surface-700">
            <th class="pb-2">Time</th>
            <th class="pb-2">User</th>
            <th class="pb-2">Action</th>
            <th class="pb-2">Resource</th>
            <th class="pb-2">Result</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in auditStore.entries"
            :key="entry.id"
            class="border-b border-surface-100 dark:border-surface-800"
          >
            <td class="py-2 text-surface-500 font-mono text-xs">
              {{ new Date(entry.timestamp).toLocaleString('de-DE') }}
            </td>
            <td class="py-2">{{ entry.userId }}</td>
            <td class="py-2 font-mono text-xs">{{ entry.action }}</td>
            <td class="py-2">{{ entry.resource }}</td>
            <td class="py-2">
              <span class="px-2 py-0.5 rounded text-xs" :class="resultClass(entry.result)">
                {{ entry.result }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="auditStore.entries.length === 0 && !auditStore.isLoading" class="text-center text-surface-400 py-8">
      Keine Log-Eintraege gefunden.
    </div>
  </div>
</template>
