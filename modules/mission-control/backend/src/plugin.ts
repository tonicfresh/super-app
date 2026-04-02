import type { ModuleConfig, ModulePlugin } from "@super-app/shared";
import { mcSchema } from "./db/schema";
import { createMcRoutes } from "./routes";
import { mcTools } from "./tools";

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
    // Factory-Pattern: Routes brauchen Service-Deps (AgentSession, AuditLog)
    // Das Framework ruft createMcRoutes(deps) auf und mountet die Hono-App
    return createMcRoutes;
  },
  jobs: [],
  tools: mcTools,
};

export { mcSchema as schema } from "./db/schema";
export { createMcRoutes as routes } from "./routes";
export { mcTools as tools } from "./tools";
