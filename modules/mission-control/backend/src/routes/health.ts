import { Hono } from "hono";

/**
 * Health-Route: Systemstatus.
 */
export function createHealthRoutes(deps: {
  checkDatabase: () => Promise<boolean>;
  getActiveAgentCount: () => Promise<number>;
}) {
  const app = new Hono();

  // GET / — System-Health
  app.get("/", async (c) => {
    let dbStatus = "disconnected";
    try {
      const ok = await deps.checkDatabase();
      dbStatus = ok ? "connected" : "disconnected";
    } catch {
      dbStatus = "error";
    }

    const activeAgents = await deps.getActiveAgentCount().catch(() => -1);

    return c.json({
      status: dbStatus === "connected" ? "healthy" : "degraded",
      uptime: process.uptime(),
      database: dbStatus,
      activeAgents,
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
