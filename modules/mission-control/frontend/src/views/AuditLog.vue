<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useAuditLogStore } from "../stores/audit-log.store";

/**
 * Audit Log — Permission-Trail.
 * Fokussiert auf granted/denied-Uebersicht fuer Compliance.
 */
const auditStore = useAuditLogStore();
const filterResult = ref("");
const dateFrom = ref("");
const dateTo = ref("");

async function loadAudit() {
  await auditStore.fetchLogs({
    result: filterResult.value || undefined,
    from: dateFrom.value || undefined,
    to: dateTo.value || undefined,
    limit: 100,
  });
}

onMounted(loadAudit);

function resultBadge(result: string) {
  switch (result) {
    case "granted": return { label: "Granted", class: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
    case "denied": return { label: "Denied", class: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
    case "approval_requested": return { label: "Pending", class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };
    case "approval_granted": return { label: "Approved", class: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
    case "approval_denied": return { label: "Rejected", class: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
    default: return { label: result, class: "bg-surface-100 text-surface-800" };
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Audit Log</h1>

    <!-- Filter -->
    <div class="flex flex-wrap gap-3 items-end">
      <div>
        <label class="block text-xs text-surface-500 mb-1">Result</label>
        <select
          v-model="filterResult"
          class="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 text-sm"
        >
          <option value="">All</option>
          <option value="granted">Granted</option>
          <option value="denied">Denied</option>
          <option value="approval_requested">Approval Requested</option>
          <option value="approval_granted">Approval Granted</option>
          <option value="approval_denied">Approval Denied</option>
        </select>
      </div>
      <div>
        <label class="block text-xs text-surface-500 mb-1">From</label>
        <input v-model="dateFrom" type="date" class="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 text-sm" />
      </div>
      <div>
        <label class="block text-xs text-surface-500 mb-1">To</label>
        <input v-model="dateTo" type="date" class="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-0 dark:bg-surface-900 text-sm" />
      </div>
      <button
        class="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition"
        @click="loadAudit"
      >
        Apply
      </button>
    </div>

    <!-- Audit-Tabelle -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-surface-500 border-b border-surface-200 dark:border-surface-700">
            <th class="pb-2">Timestamp</th>
            <th class="pb-2">User</th>
            <th class="pb-2">Agent</th>
            <th class="pb-2">Action</th>
            <th class="pb-2">Resource</th>
            <th class="pb-2">Result</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in auditStore.entries"
            :key="entry.id"
            class="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800"
          >
            <td class="py-2 text-surface-500 font-mono text-xs whitespace-nowrap">
              {{ new Date(entry.timestamp).toLocaleString('de-DE') }}
            </td>
            <td class="py-2 font-mono text-xs">{{ entry.userId }}</td>
            <td class="py-2 font-mono text-xs">{{ entry.agentId }}</td>
            <td class="py-2 font-mono text-xs text-primary-600 dark:text-primary-400">{{ entry.action }}</td>
            <td class="py-2">{{ entry.resource }}</td>
            <td class="py-2">
              <span class="px-2 py-0.5 rounded text-xs" :class="resultBadge(entry.result).class">
                {{ resultBadge(entry.result).label }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="auditStore.entries.length === 0 && !auditStore.isLoading" class="text-center text-surface-400 py-8">
      Keine Audit-Eintraege im gewaehlten Zeitraum.
    </div>
  </div>
</template>
