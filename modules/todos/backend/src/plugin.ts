import type { ModuleConfig, ModulePlugin } from "@super-app/shared";
import { todosSchema } from "./db/schema";
import { todosRoutes } from "./routes/index";
import { todosJobs } from "./jobs/index";
import { todosTools } from "./tools";

// ============================================================
// Todos Module — Backend Contract (plugin.ts)
//
// Dieses File ist der INTEGRIERTE Einstiegspunkt.
// Es exportiert alles was die Super App braucht um das Modul
// in defineServer() einzubinden.
// ============================================================

/**
 * Modul-Konfiguration mit Permissions und Guardrails.
 *
 * Permissions:
 * - base: Standard-CRUD (read, write, update, delete)
 * - custom: admin (voller Zugriff auf Einstellungen)
 *
 * Guardrails:
 * - todos:write → max 100 pro Tag (Spam-Schutz)
 * - todos:delete → max 20 pro Tag, erfordert Bestaetigung
 */
export const moduleConfig: ModuleConfig = {
  name: "todos",
  version: "1.0.0",
  permissions: {
    base: {
      read: "todos:read",
      write: "todos:write",
      update: "todos:update",
      delete: "todos:delete",
    },
    custom: {
      admin: "todos:admin",
    },
  },
  guardrails: {
    "todos:write": { dailyLimit: 100, requiresApproval: false },
    "todos:delete": { dailyLimit: 20, requiresApproval: true },
  },
};

// --- Convenience-Export: Alles als ModulePlugin-Objekt ---

export const plugin: ModulePlugin = {
  config: moduleConfig,
  schema: todosSchema,
  routes: todosRoutes,
  jobs: todosJobs,
  tools: todosTools,
};

// --- Named Exports fuer die Module Registry ---

export { todosSchema as schema } from "./db/schema";
export { todosRoutes as routes } from "./routes/index";
export { todosJobs as jobs } from "./jobs/index";
export { todosTools as tools } from "./tools";
