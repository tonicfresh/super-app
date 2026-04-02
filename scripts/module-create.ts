#!/usr/bin/env bun

/**
 * Module Scaffold Script
 * Usage: bun run module:create <module-name>
 *
 * Erstellt die vollstaendige Boilerplate-Struktur fuer ein neues Super-App-Modul.
 */

import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// --- Konfiguration ---

const MODULE_NAME = process.argv[2]?.trim();
const ROOT_DIR = process.env.SUPER_APP_MODULES_PATH || join(import.meta.dir, "..", "modules");

// --- Validierung ---

if (!MODULE_NAME) {
  console.error("Error: Please provide a module name.\nUsage: bun run module:create <module-name>");
  process.exit(1);
}

if (!/^[a-z][a-z0-9-]*$/.test(MODULE_NAME)) {
  console.error(
    `Error: Module name must be lowercase alphanumeric with optional hyphens (got: "${MODULE_NAME}").`
  );
  process.exit(1);
}

const MODULE_DIR = join(ROOT_DIR, MODULE_NAME);

if (existsSync(MODULE_DIR)) {
  console.error(`Error: Module directory "${MODULE_DIR}" already exists.`);
  process.exit(1);
}

// --- Hilfsfunktionen ---

/** Tabellen-Prefix: "knowledge-base" -> "kb_", "contacts" -> "contacts_", "mail" -> "mail_" */
function getTablePrefix(name: string): string {
  // Sonderfaelle fuer lange Namen
  const abbreviations: Record<string, string> = {
    "knowledge-base": "kb",
    "mission-control": "mc",
  };
  if (abbreviations[name]) return abbreviations[name] + "_";
  // Bindestrich entfernen und als Prefix nutzen
  return name.replace(/-/g, "_") + "_";
}

/** PascalCase: "knowledge-base" -> "KnowledgeBase" */
function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** camelCase: "knowledge-base" -> "knowledgeBase" */
function toCamelCase(name: string): string {
  const pascal = toPascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function writeFile(relativePath: string, content: string): void {
  const fullPath = join(MODULE_DIR, relativePath);
  const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, content);
}

// --- Templates ---

const prefix = getTablePrefix(MODULE_NAME);
const pascal = toPascalCase(MODULE_NAME);
const camel = toCamelCase(MODULE_NAME);

// Backend: plugin.ts
const pluginTs = `import type { ModuleConfig } from "@super-app/shared";

export const moduleConfig: ModuleConfig = {
  name: "${MODULE_NAME}",
  version: "0.1.0",
  permissions: {
    base: {
      read: "${MODULE_NAME}:read",
      write: "${MODULE_NAME}:write",
      update: "${MODULE_NAME}:update",
      delete: "${MODULE_NAME}:delete",
    },
  },
  guardrails: {},
};

export { ${camel}Schema as schema } from "./db/schema";
export { ${camel}Routes as routes } from "./routes";
export { ${camel}Jobs as jobs } from "./jobs";
export { ${camel}Tools as tools } from "./tools";

export const plugin = {
  config: moduleConfig,
  schema: undefined, // Wird beim Import aus schema.ts befuellt
  routes: undefined,
  jobs: undefined,
  tools: undefined,
};
`;

// Backend: index.ts (Standalone)
const indexTs = `import { defineServer } from "@framework/index";
import { ${camel}Schema } from "./db/schema";
import { ${camel}Routes } from "./routes";
import { ${camel}Jobs } from "./jobs";

const server = defineServer({
  port: 3001,
  appName: "${pascal}",
  basePath: "/api/v1",
  loginUrl: "/login.html",
  magicLoginVerifyUrl: "/magic-login-verify.html",
  staticPublicDataPath: "./public",
  staticPrivateDataPath: "./static",
  customDbSchema: {
    ...${camel}Schema,
  },
  customHonoApps: [
    {
      baseRoute: "/${MODULE_NAME}",
      app: ${camel}Routes,
    },
  ],
  jobHandlers: ${camel}Jobs,
});

export default server;
`;

// Backend: tools.ts
const toolsTs = `import type { ToolResult } from "@super-app/shared";

/**
 * AI-Tools fuer das ${pascal}-Modul.
 *
 * Jedes Tool folgt dem Pattern:
 * 1. Permission Check
 * 2. Guardrail Check
 * 3. Execute
 * 4. ToolResult Response (keine sensitiven Daten!)
 */
export const ${camel}Tools = {
  // Beispiel:
  // search${pascal}: tool({
  //   description: "Search ${MODULE_NAME} entries",
  //   inputSchema: v.object({ query: v.string() }),
  //   execute: async ({ query }): Promise<ToolResult> => {
  //     return { success: true, data: { results: [] } };
  //   },
  // }),
};
`;

// Backend: db/schema.ts
const schemaTs = `// import { sql } from "drizzle-orm";
// import { pgTable, text, timestamp, boolean, uuid, index } from "drizzle-orm/pg-core";
// import { relations } from "drizzle-orm";
// import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

/**
 * Drizzle Schema fuer das ${pascal}-Modul.
 * Tabellen-Prefix: ${prefix}
 *
 * WICHTIG: Alle Tabellen MUESSEN mit "${prefix}" beginnen!
 * NIEMALS manuell SQL schreiben — immer Drizzle verwenden.
 */

// export const ${camel}Example = pgTable(
//   "${prefix}example",
//   {
//     id: uuid("id").primaryKey().default(sql\`gen_random_uuid()\`),
//     tenantId: text("tenant_id").notNull(),
//     name: text("name").notNull(),
//     createdAt: timestamp("created_at").defaultNow(),
//   },
//   (table) => [index("${prefix}example_tenant_idx").on(table.tenantId)]
// );

export const ${camel}Schema = {};
`;

// Backend: routes/index.ts
const routesTs = `/**
 * Hono Routes fuer das ${pascal}-Modul.
 *
 * Folgt dem Framework-Pattern:
 * - Tenant-scoped Routen: /tenant/[tenantId]/${MODULE_NAME}/...
 * - Permission-Checks via Middleware
 */

export const ${camel}Routes = (app: any) => {
  // app.get("/", async (c: any) => {
  //   return c.json({ module: "${MODULE_NAME}", status: "ok" });
  // });
};
`;

// Backend: jobs/index.ts
const jobsTs = `/**
 * Background-Jobs fuer das ${pascal}-Modul.
 */

export const ${camel}Jobs: Array<{ type: string; handler: any }> = [
  // { type: "${MODULE_NAME}:example-job", handler: { execute: async (metadata: any) => {} } },
];
`;

// Backend: services/index.ts
const servicesTs = `/**
 * Business-Logik fuer das ${pascal}-Modul.
 * Services werden von Routes und Tools verwendet.
 */

export const ${camel}Service = {
  // async getAll(tenantId: string) { ... },
};
`;

// Backend: package.json
const backendPackageJson = `{
  "name": "@super-app/${MODULE_NAME}-backend",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "bun --hot run src/index.ts",
    "test": "bun test",
    "app:generate": "drizzle-kit generate",
    "app:migrate": "drizzle-kit migrate"
  }
}
`;

// Backend: Tests
const routesTestTs = `import { describe, it, expect } from "bun:test";

describe("${pascal} Routes", () => {
  it.todo("GET /${MODULE_NAME} should return module status");
  it.todo("POST /${MODULE_NAME} should create entry");
  it.todo("PUT /${MODULE_NAME}/:id should update entry");
  it.todo("DELETE /${MODULE_NAME}/:id should delete entry");
});
`;

const toolsTestTs = `import { describe, it, expect } from "bun:test";
import type { ToolResult } from "@super-app/shared";

describe("${pascal} Tools", () => {
  it.todo("should return FORBIDDEN without permission");
  it.todo("should return LIMIT_REACHED when guardrail exceeded");
  it.todo("should NEVER return sensitive data in tool responses");
  it.todo("should follow ToolResult contract");
});
`;

const schemaTestTs = `import { describe, it, expect } from "bun:test";

describe("${pascal} Schema", () => {
  it.todo("schema exports should be defined");
  it.todo("all tables should use ${prefix} prefix");
});
`;

const securityTestTs = `import { describe, it, expect } from "bun:test";

describe("${pascal} Security", () => {
  it.todo("should reject unauthenticated requests");
  it.todo("should reject requests without required permission");
  it.todo("should not expose sensitive data in responses");
});
`;

// Frontend: module.ts
const moduleDefTs = `import type { ModuleDefinition } from "@super-app/shared";

export const moduleDefinition: ModuleDefinition = {
  name: "${MODULE_NAME}",
  routes: [
    {
      path: "/${MODULE_NAME}",
      component: () => import("./views/Index.vue"),
    },
  ],
  navigation: {
    label: "${pascal}",
    icon: "i-heroicons-square-3-stack-3d",
    position: "sidebar",
    order: 50,
  },
  permissions: ["${MODULE_NAME}:read"],
};
`;

// Frontend: main.ts (Standalone)
const frontendMainTs = `/**
 * Standalone-Einstiegspunkt fuer das ${pascal}-Modul.
 * Startet eine eigene Vue-App.
 */

import { createApp } from "vue";
// import App from "./App.vue";

// const app = createApp(App);
// app.mount("#app");
`;

// Frontend: package.json
const frontendPackageJson = `{
  "name": "@super-app/${MODULE_NAME}-frontend",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
`;

// README.md
const readmeMd = `# ${pascal} Module

> Part of the Super App platform.

## Overview

TODO: Describe what this module does.

## Structure

\`\`\`
${MODULE_NAME}/
\u251c\u2500\u2500 backend/
\u2502   \u251c\u2500\u2500 src/
\u2502   \u2502   \u251c\u2500\u2500 index.ts        # Standalone entry
\u2502   \u2502   \u251c\u2500\u2500 plugin.ts       # Integrated entry (Super App)
\u2502   \u2502   \u251c\u2500\u2500 tools.ts        # AI tools
\u2502   \u2502   \u251c\u2500\u2500 db/schema.ts    # Drizzle schema (prefix: ${prefix})
\u2502   \u2502   \u251c\u2500\u2500 routes/         # Hono routes
\u2502   \u2502   \u251c\u2500\u2500 jobs/           # Background jobs
\u2502   \u2502   \u2514\u2500\u2500 services/       # Business logic
\u2502   \u2514\u2500\u2500 tests/              # Tests (mandatory!)
\u251c\u2500\u2500 frontend/
\u2502   \u251c\u2500\u2500 src/
\u2502   \u2502   \u251c\u2500\u2500 main.ts         # Standalone entry
\u2502   \u2502   \u251c\u2500\u2500 module.ts       # Integrated entry (Super App)
\u2502   \u2502   \u251c\u2500\u2500 views/          # Page components
\u2502   \u2502   \u251c\u2500\u2500 components/     # Reusable components
\u2502   \u2502   \u2514\u2500\u2500 stores/         # Pinia stores
\u251c\u2500\u2500 README.md
\u2514\u2500\u2500 AGENTS.md
\`\`\`

## Development

\`\`\`bash
# Standalone mode
cd backend && bun run dev

# Tests
cd backend && bun test
\`\`\`

## Table Prefix

All database tables use the prefix \`${prefix}\`.
`;

// AGENTS.md
const agentsMd = `# Module: ${pascal}

## Rules
- Table prefix: \`${prefix}\`
- All tools must return \`ToolResult\` type from \`@super-app/shared\`
- No sensitive data in tool responses (IDs and flags only)
- Tests are mandatory for every endpoint and tool
- Schema changes ONLY via Drizzle, NEVER raw SQL

## Files
| File | Purpose |
|------|---------|
| \`backend/src/plugin.ts\` | Integrated entry — export schema, routes, tools here |
| \`backend/src/tools.ts\` | AI tools — follow permission + guardrail + privacy pattern |
| \`backend/src/index.ts\` | Standalone entry — do not modify for Super App integration |
| \`frontend/src/module.ts\` | Frontend module definition — routes, navigation, permissions |

## Shared Types
Import from \`@super-app/shared\`:
- \`ToolResult\` — standardized tool response
- \`ModuleConfig\` — backend module configuration
- \`ModuleDefinition\` — frontend module definition
- \`GuardrailConfig\` — guardrail settings

## Test Commands
\`\`\`bash
bun test                  # Alle Tests
bun run app:generate      # Migration generieren nach Schema-Aenderung
\`\`\`
`;

// --- Dateien schreiben ---

console.log(`Creating module "${MODULE_NAME}" in ${MODULE_DIR}...`);

// Backend
writeFile("backend/src/plugin.ts", pluginTs);
writeFile("backend/src/index.ts", indexTs);
writeFile("backend/src/tools.ts", toolsTs);
writeFile("backend/src/db/schema.ts", schemaTs);
writeFile("backend/src/routes/index.ts", routesTs);
writeFile("backend/src/jobs/index.ts", jobsTs);
writeFile("backend/src/services/index.ts", servicesTs);
writeFile("backend/package.json", backendPackageJson);

// Backend Tests
writeFile("backend/tests/routes.test.ts", routesTestTs);
writeFile("backend/tests/tools.test.ts", toolsTestTs);
writeFile("backend/tests/schema.test.ts", schemaTestTs);
writeFile("backend/tests/security.test.ts", securityTestTs);

// Frontend
writeFile("frontend/src/main.ts", frontendMainTs);
writeFile("frontend/src/module.ts", moduleDefTs);
writeFile("frontend/src/views/.gitkeep", "");
writeFile("frontend/src/components/.gitkeep", "");
writeFile("frontend/src/stores/.gitkeep", "");
writeFile("frontend/package.json", frontendPackageJson);

// Root
writeFile("README.md", readmeMd);
writeFile("AGENTS.md", agentsMd);

console.log(`\nModule "${MODULE_NAME}" created successfully!`);
console.log(`\nNext steps:`);
console.log(`  1. cd modules/${MODULE_NAME}/backend && bun install`);
console.log(`  2. Implement schema in backend/src/db/schema.ts`);
console.log(`  3. Add routes in backend/src/routes/index.ts`);
console.log(`  4. Add AI tools in backend/src/tools.ts`);
console.log(`  5. Register in template/backend/src/index.ts:`);
console.log(`     import { plugin as ${camel}Plugin } from "../../modules/${MODULE_NAME}/backend/src/plugin";`);
console.log(`     registry.register(${camel}Plugin);`);
