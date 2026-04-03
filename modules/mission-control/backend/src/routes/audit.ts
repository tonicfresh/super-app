import { Hono } from "hono";
import type { createAuditLogService } from "../services/audit-log.service";
import type { AuditResult } from "../services/audit-log.service";

type AuditLogService = ReturnType<typeof createAuditLogService>;

const VALID_AUDIT_RESULTS: readonly string[] = [
  "granted",
  "denied",
  "approval_requested",
  "approval_granted",
  "approval_denied",
];

/**
 * Audit-Trail-Routes: Permission-Historie.
 */
export function createAuditRoutes(auditService: AuditLogService) {
  const app = new Hono();

  // GET / — Audit-Trail (identisch mit logs, aber fokussiert auf result-Filterung)
  app.get("/", async (c) => {
    const userId = c.req.query("userId");
    const agentId = c.req.query("agentId");
    const resource = c.req.query("resource");
    const resultParam = c.req.query("result");
    const result: AuditResult | undefined =
      resultParam && VALID_AUDIT_RESULTS.includes(resultParam)
        ? (resultParam as AuditResult)
        : undefined;
    const from = c.req.query("from") ? new Date(c.req.query("from")!) : undefined;
    const to = c.req.query("to") ? new Date(c.req.query("to")!) : undefined;
    const limit = Number(c.req.query("limit") ?? 100);
    const offset = Number(c.req.query("offset") ?? 0);

    const logs = await auditService.query({
      userId,
      agentId,
      resource,
      result,
      from,
      to,
      limit,
      offset,
    });

    return c.json({ entries: logs, limit, offset });
  });

  return app;
}
