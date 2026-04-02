import { mcSchema } from "./db/schema";
import { createMcRoutes } from "./routes";
import { createAgentSessionService } from "./services/agent-session.service";
import { createAuditLogService } from "./services/audit-log.service";

/**
 * Mission Control — Standalone-Modus.
 * Startet als eigenstaendige App mit eigenem Server + DB.
 *
 * Hinweis: defineServer ist nur im Framework-Kontext verfuegbar.
 * Im Standalone-Modus wird ein einfacher Hono-Server gestartet.
 */

// Services werden mit echten DB-Dependencies initialisiert
// (hier als Platzhalter — die echte Implementierung nutzt Drizzle)
const agentService = createAgentSessionService({
  insert: async (data) => ({ id: data.id as string }),
  update: async () => {},
  select: async () => [],
  broadcast: () => {},
});

const auditService = createAuditLogService({
  insert: async () => {},
  select: async () => [],
});

const mcRoutes = createMcRoutes({
  agentService,
  auditService,
  queryCosts: async () => ({ costs: [], totalUsd: 0 }),
  checkDatabase: async () => true,
  getActiveAgentCount: async () => 0,
});

export { mcSchema, mcRoutes, agentService, auditService };
export { plugin, moduleConfig } from "./plugin";
