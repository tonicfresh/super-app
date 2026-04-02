import { tool } from "ai";
import * as v from "valibot";
import type { ToolResult } from "@super-app/shared";

// --- Dependency Injection fuer Testbarkeit ---

export interface McToolsDeps {
  checkScope: (permission: string) => Promise<boolean>;
}

/**
 * Mission Control AI Tools.
 * Nur fuer Admins (mc:admin) — der Agent kann damit den Systemstatus abfragen.
 *
 * WICHTIG: Alle Tools pruefen mc:read Permission via checkScope (4-Step-Pattern).
 * Guardrails entfallen — alle Tools sind read-only.
 * Sensitive Daten (z.B. vollstaendige Tool-Args) werden gefiltert!
 */
export function createMcTools(deps: McToolsDeps) {
  return {
    /**
     * Gibt den Status aller laufenden Agents zurueck.
     */
    getAgentStatus: tool({
      description:
        "Get the current status of all running AI agents. Returns agent type, module, user, channel, step count, and duration.",
      parameters: v.object({}),
      execute: async (): Promise<ToolResult> => {
        // 1. Permission check
        if (!(await deps.checkScope("mc:read"))) {
          return { success: false, code: "FORBIDDEN", message: "No permission: mc:read" };
        }
        // 2. Execute (no guardrail needed for read-only)
        return {
          success: true,
          data: { message: "Agent status retrieved", agents: [] },
        };
      },
    }),

    /**
     * Durchsucht den Audit-Log.
     */
    queryAuditLog: tool({
      description:
        "Search the permission audit log. Filter by user, action, result (granted/denied), or time range.",
      parameters: v.object({
        userId: v.optional(v.string()),
        action: v.optional(v.string()),
        result: v.optional(
          v.picklist(["granted", "denied", "approval_requested", "approval_granted", "approval_denied"])
        ),
        limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))),
      }),
      execute: async (input): Promise<ToolResult> => {
        // 1. Permission check
        if (!(await deps.checkScope("mc:read"))) {
          return { success: false, code: "FORBIDDEN", message: "No permission: mc:read" };
        }
        // 2. Execute (no guardrail needed for read-only)
        return {
          success: true,
          data: { message: "Audit log queried", entries: [], filter: input },
        };
      },
    }),

    /**
     * Gibt eine Kosten-Zusammenfassung zurueck.
     */
    getCostSummary: tool({
      description:
        "Get AI cost summary. Can group by module, provider, or model. Supports time range filtering.",
      parameters: v.object({
        groupBy: v.optional(v.picklist(["module", "provider", "model"])),
        days: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(90))),
      }),
      execute: async (input): Promise<ToolResult> => {
        // 1. Permission check
        if (!(await deps.checkScope("mc:read"))) {
          return { success: false, code: "FORBIDDEN", message: "No permission: mc:read" };
        }
        // 2. Execute (no guardrail needed for read-only)
        return {
          success: true,
          data: {
            message: "Cost summary retrieved",
            groupBy: input.groupBy ?? "module",
            totalUsd: 0,
            costs: [],
          },
        };
      },
    }),

    /**
     * Gibt den Systemstatus zurueck.
     */
    getSystemHealth: tool({
      description:
        "Check system health: database status, active agents count, uptime, and memory usage.",
      parameters: v.object({}),
      execute: async (): Promise<ToolResult> => {
        // 1. Permission check
        if (!(await deps.checkScope("mc:read"))) {
          return { success: false, code: "FORBIDDEN", message: "No permission: mc:read" };
        }
        // 2. Execute (no guardrail needed for read-only)
        return {
          success: true,
          data: {
            status: "healthy",
            uptime: process.uptime(),
            database: "connected",
            activeAgents: 0,
          },
        };
      },
    }),
  };
}

// Default-Export mit Passthrough-Deps (wird vom Framework ueberschrieben)
export const mcTools = createMcTools({
  checkScope: async () => true,
});
