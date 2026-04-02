import { Hono } from "hono";

/**
 * Cost-Routes: KI-Kosten aggregiert nach Modul, Provider oder Zeitraum.
 * Deps werden per Factory injiziert (Drizzle DB-Zugriff).
 */
export function createCostRoutes(deps: {
  queryCosts: (filter: Record<string, unknown>) => Promise<{
    costs: Record<string, unknown>[];
    totalUsd: number;
  }>;
}) {
  const app = new Hono();

  // GET / — Kosten-Uebersicht
  app.get("/", async (c) => {
    const groupBy = c.req.query("groupBy") ?? "module";
    const from = c.req.query("from");
    const to = c.req.query("to");

    const result = await deps.queryCosts({ groupBy, from, to });
    return c.json({
      costs: result.costs,
      groupBy,
      totalUsd: result.totalUsd,
      filter: { from, to },
    });
  });

  return app;
}
