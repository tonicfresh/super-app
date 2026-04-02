import { Hono } from "hono";
import type { createAgentSessionService } from "../services/agent-session.service";

type AgentSessionService = ReturnType<typeof createAgentSessionService>;

/**
 * Agent-Routes: Laufende Agents, Session-History.
 */
export function createAgentRoutes(agentService: AgentSessionService) {
  const app = new Hono();

  // GET / — Aktuell laufende Agents
  app.get("/", async (c) => {
    const agents = await agentService.getRunningAgents();
    return c.json({ agents, count: agents.length });
  });

  // GET /recent — Letzte Sessions (paginiert)
  app.get("/recent", async (c) => {
    const limit = Number(c.req.query("limit") ?? 50);
    const offset = Number(c.req.query("offset") ?? 0);
    const sessions = await agentService.getRecentSessions({ limit, offset });
    return c.json({ sessions, limit, offset });
  });

  return app;
}
