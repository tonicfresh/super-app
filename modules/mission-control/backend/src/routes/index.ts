import { Hono } from "hono";
import { createAgentRoutes } from "./agents";
import { createLogRoutes } from "./logs";
import { createCostRoutes } from "./costs";
import { createAuditRoutes } from "./audit";
import { createHealthRoutes } from "./health";
import type { createAgentSessionService } from "../services/agent-session.service";
import type { createAuditLogService } from "../services/audit-log.service";

type AgentSessionService = ReturnType<typeof createAgentSessionService>;
type AuditLogService = ReturnType<typeof createAuditLogService>;

export interface McRouteDeps {
  agentService: AgentSessionService;
  auditService: AuditLogService;
  queryCosts: (filter: Record<string, unknown>) => Promise<{
    costs: Record<string, unknown>[];
    totalUsd: number;
  }>;
  checkDatabase: () => Promise<boolean>;
  getActiveAgentCount: () => Promise<number>;
}

/**
 * Erstellt alle Mission Control Routes und mountet sie unter einem Hono-App.
 *
 * Gemountet unter: /api/v1/mission-control/
 *   /agents   — Laufende Agents
 *   /logs     — Audit-Log (filterbar)
 *   /costs    — Kosten-Dashboard
 *   /audit    — Permission-Trail
 *   /health   — System-Health
 */
export function createMcRoutes(deps: McRouteDeps) {
  const app = new Hono();

  app.route("/agents", createAgentRoutes(deps.agentService));
  app.route("/logs", createLogRoutes(deps.auditService));
  app.route("/costs", createCostRoutes({ queryCosts: deps.queryCosts }));
  app.route("/audit", createAuditRoutes(deps.auditService));
  app.route("/health", createHealthRoutes({
    checkDatabase: deps.checkDatabase,
    getActiveAgentCount: deps.getActiveAgentCount,
  }));

  return app;
}

export { createAgentRoutes } from "./agents";
export { createLogRoutes } from "./logs";
export { createCostRoutes } from "./costs";
export { createAuditRoutes } from "./audit";
export { createHealthRoutes } from "./health";
