import { Hono } from "hono";
import type { createAuditLogService } from "../services/audit-log.service";

type AuditLogService = ReturnType<typeof createAuditLogService>;

/**
 * Audit-Log-Routes: Filterbare Permission-Logs.
 */
export function createLogRoutes(auditService: AuditLogService) {
  const app = new Hono();

  // GET / — Audit-Log mit Filtern
  app.get("/", async (c) => {
    const userId = c.req.query("userId");
    const action = c.req.query("action");
    const result = c.req.query("result") as any;
    const from = c.req.query("from") ? new Date(c.req.query("from")!) : undefined;
    const to = c.req.query("to") ? new Date(c.req.query("to")!) : undefined;
    const limit = Number(c.req.query("limit") ?? 100);
    const offset = Number(c.req.query("offset") ?? 0);

    const logs = await auditService.query({
      userId,
      action,
      result,
      from,
      to,
      limit,
      offset,
    });

    return c.json({ logs, total: logs.length, limit, offset });
  });

  return app;
}
