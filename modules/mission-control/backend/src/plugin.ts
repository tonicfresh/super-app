import type { ModuleConfig, ModulePlugin } from "@super-app/shared";
import { mcSchema } from "./db/schema";
import { createMcRoutes } from "./routes";
import { mcTools } from "./tools";
import { createAgentSessionService } from "./services/agent-session.service";
import { createAuditLogService } from "./services/audit-log.service";

// --- Modul-Konfiguration ---

export const moduleConfig: ModuleConfig = {
  name: "mission-control",
  version: "0.1.0",
  permissions: {
    base: {
      read: "mc:read",
      write: "mc:write",
      update: "mc:update",
      delete: "mc:delete",
    },
    custom: {
      admin: "mc:admin",
    },
  },
  guardrails: {
    // Mission Control Tools haben keine Guardrails — sie sind read-only
    // Nur mc:admin berechtigt, keine taeglichen Limits noetig
  },
};

// --- Modul-Plugin-Export ---

/**
 * Convenience-Export: Alles als ModulePlugin-Objekt.
 * Kann direkt in registry.register(plugin) verwendet werden.
 *
 * Routes nutzen eine Factory (createMcRoutes) weil sie Service-Dependencies brauchen.
 * Der Getter stellt sicher, dass die Routes lazy geladen werden.
 */
export const plugin: ModulePlugin = {
  config: moduleConfig,
  schema: mcSchema,
  get routes() {
    // Adapter: Framework erwartet (app: Hono) => void, aber createMcRoutes
    // braucht McRouteDeps und gibt eine Hono-App zurueck.
    // Wir kapseln die Deps intern und mounten die Sub-App auf die uebergebene App.
    return (app: any) => {
      const agentService = createAgentSessionService({
        insert: async (data) => ({ id: (data.id as string) ?? "stub" }),
        update: async () => {},
        select: async () => [],
        broadcast: () => {},
      });
      const auditService = createAuditLogService({
        insert: async () => {},
        select: async () => [],
      });
      const mcApp = createMcRoutes({
        agentService,
        auditService,
        queryCosts: async () => ({ costs: [], totalUsd: 0 }),
        checkDatabase: async () => true,
        getActiveAgentCount: async () => 0,
      });
      app.route("/", mcApp);
    };
  },
  jobs: [],
  tools: mcTools,
};

export { mcSchema as schema } from "./db/schema";
export { createMcRoutes as routes } from "./routes";
export { mcTools as tools } from "./tools";
