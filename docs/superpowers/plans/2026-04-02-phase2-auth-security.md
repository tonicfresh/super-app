# Phase 2: Auth, Security & Passkey

**Date:** 2026-04-02
**Status:** Ready
**Spec:** `docs/superpowers/specs/2026-04-02-super-app-architecture-design.md`
**Depends on:** Phase 1 (Shared Types + Core Backend Foundation)
**For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development**

---

## Ziel

Auth-Infrastruktur des Frameworks in die Super App integrieren: Hanko Passkey-Login, Invitation-Code-System, Permission Groups fuer Module, Settings UI fuer verschluesselte Secrets, Auth-Middleware auf allen Modul-Routen, und ein vollstaendiger Frontend-Auth-Flow mit Passkey-Unterstuetzung.

## Voraussetzungen

- Phase 1 abgeschlossen (shared/ Paket, module-registry, defineServer Integration)
- Bun Runtime installiert
- PostgreSQL laeuft mit Framework-Schema (users, tenants, invitation_codes, secrets, etc.)
- Template-Backend unter `template/` ist funktionsfaehig
- Hanko Cloud Account oder Self-Hosted Hanko vorhanden (HANKO_API_URL in .env)

## Konventionen

- **Runtime:** Bun
- **Validation:** Valibot (NICHT Zod — trotz AI SDK Beispielen in der Spec die `z` verwenden)
- **ORM:** Drizzle ORM
- **Testing:** `bun:test`
- **Commit-Messages:** Englisch, Conventional Commits
- **TDD:** Tests zuerst, dann Implementierung
- **Path-Alias:** `@framework/*` mappt auf `./framework/src/*` (tsconfig im template/backend)
- **Framework NICHT aendern:** Alle Aenderungen in `template/backend/src/` und `template/frontend/src/`, niemals in `template/backend/framework/`

---

## Task 1: Hanko Passkey Configuration

**Ziel:** Hanko WebAuthn in `defineServer()` konfigurieren und den Passkey-Registrierungs- sowie Login-Flow testen.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/auth/hanko-config.ts` |
| Create | `template/backend/src/auth/hanko-config.test.ts` |
| Modify | `template/backend/src/index.ts` |

### Step 1.1: Tests schreiben (TDD)

**`template/backend/src/auth/hanko-config.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  createHankoConfig,
  validateHankoEnv,
  type HankoConfig,
} from "./hanko-config";

describe("Hanko Configuration", () => {
  describe("validateHankoEnv", () => {
    it("should return valid when HANKO_API_URL is set", () => {
      const result = validateHankoEnv("https://hanko.example.com");
      expect(result.valid).toBe(true);
      expect(result.url).toBe("https://hanko.example.com");
    });

    it("should return invalid when HANKO_API_URL is empty", () => {
      const result = validateHankoEnv("");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return invalid when HANKO_API_URL is undefined", () => {
      const result = validateHankoEnv(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should strip trailing slash from URL", () => {
      const result = validateHankoEnv("https://hanko.example.com/");
      expect(result.valid).toBe(true);
      expect(result.url).toBe("https://hanko.example.com");
    });
  });

  describe("createHankoConfig", () => {
    it("should return config with correct authType", () => {
      const config = createHankoConfig("https://hanko.example.com");
      expect(config.authType).toBe("hanko");
    });

    it("should include hankoApiUrl in config", () => {
      const config = createHankoConfig("https://hanko.example.com");
      expect(config.hankoApiUrl).toBe("https://hanko.example.com");
    });

    it("should set loginUrl to /login", () => {
      const config = createHankoConfig("https://hanko.example.com");
      expect(config.loginUrl).toBe("/login");
    });

    it("should enable invitationCodeRequired by default", () => {
      const config = createHankoConfig("https://hanko.example.com");
      expect(config.invitationCodeRequired).toBe(true);
    });

    it("should allow overriding invitationCodeRequired", () => {
      const config = createHankoConfig("https://hanko.example.com", {
        invitationCodeRequired: false,
      });
      expect(config.invitationCodeRequired).toBe(false);
    });
  });
});
```

### Step 1.2: Implementierung

**`template/backend/src/auth/hanko-config.ts`:**
```typescript
// ============================================================
// Hanko Passkey-Konfiguration fuer die Super App
// ============================================================

/**
 * Validiert die HANKO_API_URL Umgebungsvariable.
 */
export function validateHankoEnv(hankoApiUrl: string | undefined): {
  valid: boolean;
  url?: string;
  error?: string;
} {
  if (!hankoApiUrl || hankoApiUrl.trim() === "") {
    return {
      valid: false,
      error: "HANKO_API_URL ist nicht gesetzt. Passkey-Auth ist deaktiviert.",
    };
  }

  const url = hankoApiUrl.replace(/\/+$/, "");
  return { valid: true, url };
}

export interface HankoConfig {
  authType: "hanko";
  hankoApiUrl: string;
  loginUrl: string;
  invitationCodeRequired: boolean;
}

export interface HankoConfigOptions {
  invitationCodeRequired?: boolean;
}

/**
 * Erstellt die Hanko-spezifische Server-Konfiguration.
 * Wird in defineServer() als Teil der ServerSpecificConfig verwendet.
 */
export function createHankoConfig(
  hankoApiUrl: string,
  options?: HankoConfigOptions
): HankoConfig {
  return {
    authType: "hanko",
    hankoApiUrl,
    loginUrl: "/login",
    invitationCodeRequired: options?.invitationCodeRequired ?? true,
  };
}
```

### Step 1.3: defineServer() Integration

**`template/backend/src/index.ts`** — Hanko-Config in defineServer() einbinden:
```typescript
import { defineServer } from "@framework/index";
import { createHankoConfig, validateHankoEnv } from "./auth/hanko-config";

const hankoEnv = validateHankoEnv(process.env.HANKO_API_URL);
if (!hankoEnv.valid) {
  console.warn(`[auth] ${hankoEnv.error}`);
}

const hankoConfig = hankoEnv.valid
  ? createHankoConfig(hankoEnv.url!, {
      invitationCodeRequired: true,
    })
  : undefined;

const server = defineServer({
  port: Number(process.env.PORT) || 3000,
  appName: "Super App",
  ...(hankoConfig ?? { authType: "local" }),
  // ... weitere Config aus Phase 1 (customDbSchema, customHonoApps, etc.)
});
```

### Step 1.4: Tests ausfuehren

```bash
cd template/backend && bun test src/auth/hanko-config.test.ts
```

### Commit

```
feat(auth): add Hanko Passkey configuration with env validation and defineServer integration
```

---

## Task 2: Invitation Code System

**Ziel:** Admin-Routen zum Verwalten von Invitation Codes (erstellen, auflisten, deaktivieren). Das Framework hat bereits die `invitationCodes` Tabelle und `checkGeneralInvitationCode()` — hier werden die Admin-Management-Routen gebaut.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/auth/invitation-codes.ts` |
| Create | `template/backend/src/auth/invitation-codes.test.ts` |
| Create | `template/backend/src/auth/invitation-codes.routes.ts` |
| Create | `template/backend/src/auth/invitation-codes.routes.test.ts` |

### Step 2.1: Service-Tests schreiben (TDD)

**`template/backend/src/auth/invitation-codes.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  createInvitationCodeService,
  generateInvitationCode,
  type InvitationCodeServiceDeps,
} from "./invitation-codes";

describe("Invitation Code Service", () => {
  describe("generateInvitationCode", () => {
    it("should generate a code with 8 characters", () => {
      const code = generateInvitationCode();
      expect(code).toHaveLength(8);
    });

    it("should generate uppercase alphanumeric codes", () => {
      const code = generateInvitationCode();
      expect(code).toMatch(/^[A-Z0-9]{8}$/);
    });

    it("should generate unique codes on successive calls", () => {
      const codes = new Set(Array.from({ length: 100 }, () => generateInvitationCode()));
      expect(codes.size).toBe(100);
    });

    it("should accept custom length", () => {
      const code = generateInvitationCode(12);
      expect(code).toHaveLength(12);
    });
  });

  describe("createInvitationCodeService", () => {
    let deps: InvitationCodeServiceDeps;

    beforeEach(() => {
      deps = {
        insert: mock(async (data: any) => ({
          id: "code-1",
          code: data.code,
          tenantId: data.tenantId,
          isActive: true,
          maxUses: data.maxUses ?? -1,
          usedCount: 0,
          createdAt: new Date().toISOString(),
          expiresAt: data.expiresAt ?? null,
        })),
        findAll: mock(async (tenantId: string) => [
          {
            id: "code-1",
            code: "ABCD1234",
            tenantId,
            isActive: true,
            maxUses: -1,
            usedCount: 3,
            createdAt: new Date().toISOString(),
            expiresAt: null,
          },
        ]),
        deactivate: mock(async (id: string) => ({ id, isActive: false })),
        deleteCode: mock(async (id: string) => undefined),
      };
    });

    it("should create a new invitation code for a tenant", async () => {
      const service = createInvitationCodeService(deps);
      const result = await service.create({
        tenantId: "tenant-1",
      });

      expect(result.code).toBeDefined();
      expect(result.code).toHaveLength(8);
      expect(result.tenantId).toBe("tenant-1");
      expect(deps.insert).toHaveBeenCalledTimes(1);
    });

    it("should create a code with custom expiration", async () => {
      const service = createInvitationCodeService(deps);
      const expiresAt = new Date("2026-12-31").toISOString();
      const result = await service.create({
        tenantId: "tenant-1",
        expiresAt,
      });

      expect(result).toBeDefined();
      const callArgs = (deps.insert as any).mock.calls[0][0];
      expect(callArgs.expiresAt).toBe(expiresAt);
    });

    it("should create a code with max uses", async () => {
      const service = createInvitationCodeService(deps);
      const result = await service.create({
        tenantId: "tenant-1",
        maxUses: 10,
      });

      expect(result).toBeDefined();
      const callArgs = (deps.insert as any).mock.calls[0][0];
      expect(callArgs.maxUses).toBe(10);
    });

    it("should list all codes for a tenant", async () => {
      const service = createInvitationCodeService(deps);
      const codes = await service.listByTenant("tenant-1");

      expect(codes).toHaveLength(1);
      expect(codes[0].code).toBe("ABCD1234");
      expect(deps.findAll).toHaveBeenCalledWith("tenant-1");
    });

    it("should deactivate a code", async () => {
      const service = createInvitationCodeService(deps);
      const result = await service.deactivate("code-1");

      expect(result.isActive).toBe(false);
      expect(deps.deactivate).toHaveBeenCalledWith("code-1");
    });

    it("should delete a code", async () => {
      const service = createInvitationCodeService(deps);
      await service.deleteCode("code-1");

      expect(deps.deleteCode).toHaveBeenCalledWith("code-1");
    });
  });
});
```

### Step 2.2: Service implementieren

**`template/backend/src/auth/invitation-codes.ts`:**
```typescript
// ============================================================
// Invitation Code Service — Admin-Verwaltung von Einladungscodes
// ============================================================

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Ohne I, O, 0, 1 (Verwechslungsgefahr)

/**
 * Generiert einen zufaelligen Invitation Code.
 * Standard: 8 Zeichen, Grossbuchstaben + Ziffern (ohne verwechselbare Zeichen).
 */
export function generateInvitationCode(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => CHARSET[b % CHARSET.length])
    .join("");
}

// --- Dependency Injection ---

export interface InvitationCodeRecord {
  id: string;
  code: string;
  tenantId: string | null;
  isActive: boolean;
  maxUses: number;
  usedCount: number;
  createdAt: string;
  expiresAt: string | null;
}

export interface InvitationCodeServiceDeps {
  insert: (data: {
    code: string;
    tenantId: string | null;
    maxUses: number;
    expiresAt: string | null;
  }) => Promise<InvitationCodeRecord>;
  findAll: (tenantId: string) => Promise<InvitationCodeRecord[]>;
  deactivate: (id: string) => Promise<{ id: string; isActive: boolean }>;
  deleteCode: (id: string) => Promise<void>;
}

export interface CreateCodeInput {
  tenantId: string | null;
  maxUses?: number;
  expiresAt?: string;
}

/**
 * Erstellt den Invitation Code Service mit injizierten DB-Abhaengigkeiten.
 */
export function createInvitationCodeService(deps: InvitationCodeServiceDeps) {
  return {
    /**
     * Erstellt einen neuen Invitation Code.
     */
    async create(input: CreateCodeInput): Promise<InvitationCodeRecord> {
      const code = generateInvitationCode();
      return deps.insert({
        code,
        tenantId: input.tenantId,
        maxUses: input.maxUses ?? -1,
        expiresAt: input.expiresAt ?? null,
      });
    },

    /**
     * Listet alle Codes eines Tenants.
     */
    async listByTenant(tenantId: string): Promise<InvitationCodeRecord[]> {
      return deps.findAll(tenantId);
    },

    /**
     * Deaktiviert einen Code (bleibt in DB, aber nicht mehr nutzbar).
     */
    async deactivate(id: string): Promise<{ id: string; isActive: boolean }> {
      return deps.deactivate(id);
    },

    /**
     * Loescht einen Code endgueltig.
     */
    async deleteCode(id: string): Promise<void> {
      return deps.deleteCode(id);
    },
  };
}
```

### Step 2.3: Route-Tests schreiben (TDD)

**`template/backend/src/auth/invitation-codes.routes.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import { defineInvitationCodeRoutes } from "./invitation-codes.routes";

describe("Invitation Code Routes", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    // Mock-Middleware: simuliert authentifizierten Admin
    app.use("*", async (c, next) => {
      c.set("usersId", "admin-user-1");
      c.set("tenantId", "tenant-1");
      await next();
    });

    defineInvitationCodeRoutes(app as any, "/api/v1", {
      insert: mock(async (data: any) => ({
        id: "new-code-1",
        code: data.code ?? "TESTCODE",
        tenantId: data.tenantId,
        isActive: true,
        maxUses: data.maxUses ?? -1,
        usedCount: 0,
        createdAt: new Date().toISOString(),
        expiresAt: data.expiresAt ?? null,
      })),
      findAll: mock(async () => [
        {
          id: "code-1",
          code: "ABCD1234",
          tenantId: "tenant-1",
          isActive: true,
          maxUses: -1,
          usedCount: 3,
          createdAt: "2026-04-01T00:00:00.000Z",
          expiresAt: null,
        },
      ]),
      deactivate: mock(async (id: string) => ({ id, isActive: false })),
      deleteCode: mock(async () => undefined),
    });
  });

  it("POST /invitation-codes should create a new code", async () => {
    const res = await app.request("/api/v1/tenant/tenant-1/invitation-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: "tenant-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBeDefined();
    expect(body.tenantId).toBe("tenant-1");
  });

  it("GET /invitation-codes should list all codes", async () => {
    const res = await app.request("/api/v1/tenant/tenant-1/invitation-codes", {
      method: "GET",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].code).toBe("ABCD1234");
  });

  it("PUT /invitation-codes/:id/deactivate should deactivate a code", async () => {
    const res = await app.request(
      "/api/v1/tenant/tenant-1/invitation-codes/code-1/deactivate",
      { method: "PUT" }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isActive).toBe(false);
  });

  it("DELETE /invitation-codes/:id should delete a code", async () => {
    const res = await app.request(
      "/api/v1/tenant/tenant-1/invitation-codes/code-1",
      { method: "DELETE" }
    );
    expect(res.status).toBe(200);
  });
});
```

### Step 2.4: Routes implementieren

**`template/backend/src/auth/invitation-codes.routes.ts`:**
```typescript
import type { FrameworkHonoApp } from "@framework/types";
import { HTTPException } from "hono/http-exception";
import {
  authAndSetUsersInfo,
  checkUserPermission,
} from "@framework/lib/utils/hono-middlewares";
import { validateScope } from "@framework/lib/utils/validate-scope";
import { isTenantAdmin } from "@framework/routes/tenant";
import * as v from "valibot";
import { validator } from "hono-openapi";
import { describeRoute, resolver } from "hono-openapi";
import {
  createInvitationCodeService,
  type InvitationCodeServiceDeps,
} from "./invitation-codes";

const createCodeSchema = v.object({
  tenantId: v.string(),
  maxUses: v.optional(v.number()),
  expiresAt: v.optional(v.string()),
});

const codeResponseSchema = v.object({
  id: v.string(),
  code: v.string(),
  tenantId: v.nullable(v.string()),
  isActive: v.boolean(),
  maxUses: v.number(),
  usedCount: v.number(),
  createdAt: v.string(),
  expiresAt: v.nullable(v.string()),
});

/**
 * Definiert Admin-Routen fuer Invitation Codes.
 * Alle Routen erfordern Tenant-Admin-Berechtigung.
 */
export function defineInvitationCodeRoutes(
  app: FrameworkHonoApp,
  API_BASE_PATH: string,
  deps: InvitationCodeServiceDeps
) {
  const service = createInvitationCodeService(deps);

  // POST — Neuen Code erstellen
  app.post(
    API_BASE_PATH + "/tenant/:tenantId/invitation-codes",
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["invitation-codes"],
      summary: "Create a new invitation code",
      responses: {
        200: {
          description: "Invitation code created",
          content: {
            "application/json": { schema: resolver(codeResponseSchema) },
          },
        },
      },
    }),
    validateScope("tenants:write"),
    validator("json", createCodeSchema),
    validator("param", v.object({ tenantId: v.string() })),
    isTenantAdmin,
    async (c) => {
      try {
        const data = c.req.valid("json");
        const result = await service.create({
          tenantId: data.tenantId,
          maxUses: data.maxUses,
          expiresAt: data.expiresAt,
        });
        return c.json(result);
      } catch (err) {
        throw new HTTPException(500, {
          message: "Error creating invitation code: " + err,
        });
      }
    }
  );

  // GET — Alle Codes eines Tenants auflisten
  app.get(
    API_BASE_PATH + "/tenant/:tenantId/invitation-codes",
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["invitation-codes"],
      summary: "List all invitation codes for a tenant",
      responses: {
        200: {
          description: "List of invitation codes",
          content: {
            "application/json": {
              schema: resolver(v.array(codeResponseSchema)),
            },
          },
        },
      },
    }),
    validateScope("tenants:read"),
    validator("param", v.object({ tenantId: v.string() })),
    isTenantAdmin,
    async (c) => {
      try {
        const { tenantId } = c.req.valid("param");
        const codes = await service.listByTenant(tenantId);
        return c.json(codes);
      } catch (err) {
        throw new HTTPException(500, {
          message: "Error listing invitation codes: " + err,
        });
      }
    }
  );

  // PUT — Code deaktivieren
  app.put(
    API_BASE_PATH + "/tenant/:tenantId/invitation-codes/:id/deactivate",
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["invitation-codes"],
      summary: "Deactivate an invitation code",
      responses: {
        200: {
          description: "Code deactivated",
          content: {
            "application/json": {
              schema: resolver(v.object({ id: v.string(), isActive: v.boolean() })),
            },
          },
        },
      },
    }),
    validateScope("tenants:write"),
    validator("param", v.object({ tenantId: v.string(), id: v.string() })),
    isTenantAdmin,
    async (c) => {
      try {
        const { id } = c.req.valid("param");
        const result = await service.deactivate(id);
        return c.json(result);
      } catch (err) {
        throw new HTTPException(500, {
          message: "Error deactivating invitation code: " + err,
        });
      }
    }
  );

  // DELETE — Code loeschen
  app.delete(
    API_BASE_PATH + "/tenant/:tenantId/invitation-codes/:id",
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["invitation-codes"],
      summary: "Delete an invitation code",
      responses: {
        200: { description: "Code deleted" },
      },
    }),
    validateScope("tenants:write"),
    validator("param", v.object({ tenantId: v.string(), id: v.string() })),
    isTenantAdmin,
    async (c) => {
      try {
        const { id } = c.req.valid("param");
        await service.deleteCode(id);
        return c.json({ success: true });
      } catch (err) {
        throw new HTTPException(500, {
          message: "Error deleting invitation code: " + err,
        });
      }
    }
  );
}
```

### Step 2.5: DB-Dependencies erstellen

**`template/backend/src/auth/invitation-codes.db.ts`:**
```typescript
import { eq } from "drizzle-orm";
import { getDb } from "@framework/lib/db/db-connection";
import { invitationCodes } from "@framework/lib/db/db-schema";
import type { InvitationCodeServiceDeps } from "./invitation-codes";

/**
 * Erstellt die echten DB-Dependencies fuer den InvitationCodeService.
 * Verwendet die Framework-Tabelle `invitation_codes`.
 */
export function createInvitationCodeDbDeps(): InvitationCodeServiceDeps {
  return {
    async insert(data) {
      const [result] = await getDb()
        .insert(invitationCodes)
        .values({
          code: data.code,
          tenantId: data.tenantId,
          maxUses: data.maxUses,
          expiresAt: data.expiresAt,
          isActive: true,
        })
        .returning();

      if (!result) {
        throw new Error("Failed to insert invitation code");
      }

      return {
        id: result.id,
        code: result.code,
        tenantId: result.tenantId,
        isActive: result.isActive,
        maxUses: result.maxUses,
        usedCount: result.usedCount,
        createdAt: result.createdAt,
        expiresAt: result.expiresAt,
      };
    },

    async findAll(tenantId) {
      const results = await getDb()
        .select()
        .from(invitationCodes)
        .where(eq(invitationCodes.tenantId, tenantId));

      return results.map((r) => ({
        id: r.id,
        code: r.code,
        tenantId: r.tenantId,
        isActive: r.isActive,
        maxUses: r.maxUses,
        usedCount: r.usedCount,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
      }));
    },

    async deactivate(id) {
      const [result] = await getDb()
        .update(invitationCodes)
        .set({ isActive: false })
        .where(eq(invitationCodes.id, id))
        .returning({ id: invitationCodes.id, isActive: invitationCodes.isActive });

      if (!result) {
        throw new Error("Invitation code not found");
      }
      return result;
    },

    async deleteCode(id) {
      await getDb()
        .delete(invitationCodes)
        .where(eq(invitationCodes.id, id));
    },
  };
}
```

### Step 2.6: Tests ausfuehren

```bash
cd template/backend && bun test src/auth/invitation-codes.test.ts src/auth/invitation-codes.routes.test.ts
```

### Commit

```
feat(auth): add invitation code admin service with CRUD routes and DB integration
```

---

## Task 3: Permission Groups Setup

**Ziel:** Default-Permission-Groups fuer die Super App erstellen (Admin, User, Reader). Modul-Permissions aus `plugin.ts` automatisch in pathPermissions eintragen. Seed-Script fuer initiale Gruppen.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/auth/permission-setup.ts` |
| Create | `template/backend/src/auth/permission-setup.test.ts` |
| Create | `template/backend/src/auth/seed-permissions.ts` |

### Step 3.1: Tests schreiben (TDD)

**`template/backend/src/auth/permission-setup.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  buildModulePermissions,
  buildDefaultGroups,
  type PermissionEntry,
  type PermissionGroup,
  type PermissionSetupDeps,
  createPermissionSetup,
} from "./permission-setup";
import type { ModuleConfig } from "@super-app/shared";

const mailConfig: ModuleConfig = {
  name: "mail",
  version: "1.0.0",
  permissions: {
    base: { read: "mail:read", write: "mail:write", update: "mail:update", delete: "mail:delete" },
    custom: { send: "mail:send", settings: "mail:settings" },
  },
};

const todosConfig: ModuleConfig = {
  name: "todos",
  version: "1.0.0",
  permissions: {
    base: { read: "todos:read", write: "todos:write", update: "todos:update", delete: "todos:delete" },
  },
};

describe("Permission Setup", () => {
  describe("buildModulePermissions", () => {
    it("should create path permissions for base CRUD of a module", () => {
      const perms = buildModulePermissions(mailConfig);
      expect(perms).toHaveLength(6); // 4 base + 2 custom

      const readPerm = perms.find((p) => p.name === "mail:read");
      expect(readPerm).toBeDefined();
      expect(readPerm!.method).toBe("GET");
      expect(readPerm!.pathExpression).toBe("^/api/v1/mail/.*$");
      expect(readPerm!.category).toBe("mail");
    });

    it("should map write to POST", () => {
      const perms = buildModulePermissions(mailConfig);
      const writePerm = perms.find((p) => p.name === "mail:write");
      expect(writePerm!.method).toBe("POST");
    });

    it("should map update to PUT", () => {
      const perms = buildModulePermissions(mailConfig);
      const updatePerm = perms.find((p) => p.name === "mail:update");
      expect(updatePerm!.method).toBe("PUT");
    });

    it("should map delete to DELETE", () => {
      const perms = buildModulePermissions(mailConfig);
      const deletePerm = perms.find((p) => p.name === "mail:delete");
      expect(deletePerm!.method).toBe("DELETE");
    });

    it("should map custom permissions to POST by default", () => {
      const perms = buildModulePermissions(mailConfig);
      const sendPerm = perms.find((p) => p.name === "mail:send");
      expect(sendPerm).toBeDefined();
      expect(sendPerm!.method).toBe("POST");
      expect(sendPerm!.pathExpression).toBe("^/api/v1/mail/.*$");
    });
  });

  describe("buildDefaultGroups", () => {
    it("should create Admin, User, Reader groups", () => {
      const groups = buildDefaultGroups([mailConfig, todosConfig]);
      expect(groups).toHaveLength(3);
      expect(groups.map((g) => g.name)).toEqual(["Admin", "User", "Reader"]);
    });

    it("should assign all permissions to Admin group", () => {
      const groups = buildDefaultGroups([mailConfig, todosConfig]);
      const admin = groups.find((g) => g.name === "Admin")!;
      // Admin: alle Modul-Permissions + Admin-Pfade
      expect(admin.permissions.length).toBeGreaterThan(0);
      // Admin hat /api/v1/.* fuer alle Methoden
      expect(admin.permissions.some((p) => p.pathExpression === "^/api/v1/.*$")).toBe(true);
    });

    it("should assign read+write to User group, not delete", () => {
      const groups = buildDefaultGroups([mailConfig, todosConfig]);
      const user = groups.find((g) => g.name === "User")!;
      const permNames = user.permissions.map((p) => p.name);
      expect(permNames).toContain("mail:read");
      expect(permNames).toContain("mail:write");
      expect(permNames).toContain("mail:send");
      expect(permNames).not.toContain("mail:delete");
    });

    it("should assign only read to Reader group", () => {
      const groups = buildDefaultGroups([mailConfig, todosConfig]);
      const reader = groups.find((g) => g.name === "Reader")!;
      const permNames = reader.permissions.map((p) => p.name);
      expect(permNames).toContain("mail:read");
      expect(permNames).toContain("todos:read");
      expect(permNames).not.toContain("mail:write");
      expect(permNames).not.toContain("mail:send");
    });
  });

  describe("createPermissionSetup", () => {
    let deps: PermissionSetupDeps;

    beforeEach(() => {
      deps = {
        upsertPathPermission: mock(async (perm: PermissionEntry) => ({
          id: `perm-${perm.name}`,
          ...perm,
        })),
        upsertPermissionGroup: mock(async (name: string, tenantId: string) => ({
          id: `group-${name}`,
          name,
          tenantId,
        })),
        assignPermissionToGroup: mock(async (groupId: string, permissionId: string) => undefined),
      };
    });

    it("should seed permissions for all modules", async () => {
      const setup = createPermissionSetup(deps);
      await setup.seedForTenant("tenant-1", [mailConfig, todosConfig]);

      // 6 mail + 4 todos = 10 Permissions
      expect(deps.upsertPathPermission).toHaveBeenCalledTimes(10);
    });

    it("should create 3 default groups per tenant", async () => {
      const setup = createPermissionSetup(deps);
      await setup.seedForTenant("tenant-1", [mailConfig, todosConfig]);

      expect(deps.upsertPermissionGroup).toHaveBeenCalledTimes(3);
    });

    it("should assign permissions to groups", async () => {
      const setup = createPermissionSetup(deps);
      await setup.seedForTenant("tenant-1", [mailConfig, todosConfig]);

      // Admin bekommt mindestens 4 Methoden x /api/v1/.*
      expect((deps.assignPermissionToGroup as any).mock.calls.length).toBeGreaterThan(0);
    });
  });
});
```

### Step 3.2: Implementierung

**`template/backend/src/auth/permission-setup.ts`:**
```typescript
import type { ModuleConfig } from "@super-app/shared";

// ============================================================
// Permission Setup — Generiert pathPermissions + Groups aus ModuleConfigs
// ============================================================

// --- Typen ---

export interface PermissionEntry {
  name: string;
  category: string;
  method: string;
  pathExpression: string;
  type: "regex";
  description: string;
}

export interface PermissionGroup {
  name: string;
  permissions: PermissionEntry[];
}

// --- Permission-Methoden-Mapping ---

const BASE_METHOD_MAP: Record<string, string> = {
  read: "GET",
  write: "POST",
  update: "PUT",
  delete: "DELETE",
};

/**
 * Erstellt pathPermission-Eintraege aus einer ModuleConfig.
 * Jede base-Permission wird auf eine HTTP-Methode + Pfad-Regex gemappt.
 * Custom-Permissions werden standardmaessig auf POST gemappt.
 */
export function buildModulePermissions(config: ModuleConfig): PermissionEntry[] {
  const permissions: PermissionEntry[] = [];
  const basePath = `^/api/v1/${config.name}/.*$`;

  // Base CRUD Permissions
  for (const [action, permName] of Object.entries(config.permissions.base)) {
    permissions.push({
      name: permName,
      category: config.name,
      method: BASE_METHOD_MAP[action] || "GET",
      pathExpression: basePath,
      type: "regex",
      description: `${config.name} ${action} permission`,
    });
  }

  // Custom Permissions
  if (config.permissions.custom) {
    for (const [action, permName] of Object.entries(config.permissions.custom)) {
      permissions.push({
        name: permName,
        category: config.name,
        method: "POST", // Custom Actions sind i.d.R. POST
        pathExpression: basePath,
        type: "regex",
        description: `${config.name} ${action} permission`,
      });
    }
  }

  return permissions;
}

/**
 * Erstellt die drei Standard-Permission-Groups (Admin, User, Reader)
 * basierend auf allen registrierten ModuleConfigs.
 */
export function buildDefaultGroups(configs: ModuleConfig[]): PermissionGroup[] {
  const allPermissions = configs.flatMap(buildModulePermissions);

  // Admin: Vollzugriff auf alles
  const adminPermissions: PermissionEntry[] = [
    {
      name: "admin:all:get",
      category: "admin",
      method: "GET",
      pathExpression: "^/api/v1/.*$",
      type: "regex",
      description: "Admin full GET access",
    },
    {
      name: "admin:all:post",
      category: "admin",
      method: "POST",
      pathExpression: "^/api/v1/.*$",
      type: "regex",
      description: "Admin full POST access",
    },
    {
      name: "admin:all:put",
      category: "admin",
      method: "PUT",
      pathExpression: "^/api/v1/.*$",
      type: "regex",
      description: "Admin full PUT access",
    },
    {
      name: "admin:all:delete",
      category: "admin",
      method: "DELETE",
      pathExpression: "^/api/v1/.*$",
      type: "regex",
      description: "Admin full DELETE access",
    },
  ];

  // User: Lesen + Schreiben + Custom, kein Delete
  const userPermissions = allPermissions.filter(
    (p) => p.method !== "DELETE"
  );

  // Reader: Nur Lesen
  const readerPermissions = allPermissions.filter(
    (p) => p.method === "GET"
  );

  return [
    { name: "Admin", permissions: adminPermissions },
    { name: "User", permissions: userPermissions },
    { name: "Reader", permissions: readerPermissions },
  ];
}

// --- Dependency Injection ---

export interface PermissionSetupDeps {
  upsertPathPermission: (perm: PermissionEntry) => Promise<{ id: string }>;
  upsertPermissionGroup: (
    name: string,
    tenantId: string
  ) => Promise<{ id: string; name: string }>;
  assignPermissionToGroup: (
    groupId: string,
    permissionId: string
  ) => Promise<void>;
}

/**
 * Erstellt den Permission-Setup-Service.
 * Seeded Permissions und Groups fuer einen Tenant.
 */
export function createPermissionSetup(deps: PermissionSetupDeps) {
  return {
    /**
     * Seeded alle Module-Permissions und Default-Groups fuer einen Tenant.
     */
    async seedForTenant(
      tenantId: string,
      moduleConfigs: ModuleConfig[]
    ): Promise<void> {
      // 1. Alle Modul-Permissions in DB upserten
      const allPermissions = moduleConfigs.flatMap(buildModulePermissions);
      const permissionIdMap: Record<string, string> = {};

      for (const perm of allPermissions) {
        const result = await deps.upsertPathPermission(perm);
        permissionIdMap[perm.name] = result.id;
      }

      // 2. Default-Groups erstellen
      const groups = buildDefaultGroups(moduleConfigs);

      for (const group of groups) {
        const dbGroup = await deps.upsertPermissionGroup(group.name, tenantId);

        // 3. Permissions den Groups zuweisen
        for (const perm of group.permissions) {
          // Admin-Permissions separat upserten (sind nicht in allPermissions)
          let permId = permissionIdMap[perm.name];
          if (!permId) {
            const result = await deps.upsertPathPermission(perm);
            permId = result.id;
            permissionIdMap[perm.name] = permId;
          }
          await deps.assignPermissionToGroup(dbGroup.id, permId);
        }
      }
    },
  };
}
```

### Step 3.3: Seed-Script

**`template/backend/src/auth/seed-permissions.ts`:**
```typescript
import { getDb } from "@framework/lib/db/db-connection";
import {
  pathPermissions,
  userPermissionGroups,
  groupPermissions,
} from "@framework/lib/db/db-schema";
import { eq, and } from "drizzle-orm";
import { createPermissionSetup, type PermissionEntry } from "./permission-setup";
import type { ModuleConfig } from "@super-app/shared";
import log from "@framework/lib/log";

/**
 * Erstellt die echten DB-Dependencies fuer den Permission Setup.
 */
function createPermissionSetupDbDeps() {
  return {
    async upsertPathPermission(perm: PermissionEntry) {
      const [result] = await getDb()
        .insert(pathPermissions)
        .values({
          name: perm.name,
          category: perm.category,
          method: perm.method,
          pathExpression: perm.pathExpression,
          type: perm.type,
          description: perm.description,
        })
        .onConflictDoUpdate({
          target: [pathPermissions.category, pathPermissions.name],
          set: {
            method: perm.method,
            pathExpression: perm.pathExpression,
            description: perm.description,
          },
        })
        .returning({ id: pathPermissions.id });

      if (!result) throw new Error(`Failed to upsert permission: ${perm.name}`);
      return result;
    },

    async upsertPermissionGroup(name: string, tenantId: string) {
      // Pruefen ob Gruppe bereits existiert
      const existing = await getDb()
        .select({ id: userPermissionGroups.id, name: userPermissionGroups.name })
        .from(userPermissionGroups)
        .where(
          and(
            eq(userPermissionGroups.name, name),
            eq(userPermissionGroups.tenantId, tenantId)
          )
        )
        .limit(1);

      if (existing[0]) {
        return existing[0];
      }

      const [result] = await getDb()
        .insert(userPermissionGroups)
        .values({ name, tenantId })
        .returning({ id: userPermissionGroups.id, name: userPermissionGroups.name });

      if (!result) throw new Error(`Failed to create permission group: ${name}`);
      return result;
    },

    async assignPermissionToGroup(groupId: string, permissionId: string) {
      await getDb()
        .insert(groupPermissions)
        .values({ groupId, permissionId })
        .onConflictDoNothing();
    },
  };
}

/**
 * Seeded alle Permissions und Default-Groups fuer einen Tenant.
 * Wird beim ersten Start oder ueber Admin-Route aufgerufen.
 */
export async function seedPermissionsForTenant(
  tenantId: string,
  moduleConfigs: ModuleConfig[]
): Promise<void> {
  log.info(`[permissions] Seeding permissions for tenant ${tenantId}...`);
  const setup = createPermissionSetup(createPermissionSetupDbDeps());
  await setup.seedForTenant(tenantId, moduleConfigs);
  log.info(`[permissions] Seeding complete for tenant ${tenantId}`);
}
```

### Step 3.4: Tests ausfuehren

```bash
cd template/backend && bun test src/auth/permission-setup.test.ts
```

### Commit

```
feat(auth): add permission groups setup with module-based CRUD mapping and seed script
```

---

## Task 4: Settings UI for Secrets

**Ziel:** Backend-Routen zum Verwalten verschluesselter Secrets (API-Keys, SMTP-Config, etc.) ueber das Framework's `secrets`-Table. Das Framework hat bereits `defineManageSecretsRoutes` — hier wird ein Super-App-spezifischer Wrapper mit vordefiniertem Schema fuer benoetigte Settings gebaut, plus Frontend-Settings-View.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/settings/settings-schema.ts` |
| Create | `template/backend/src/settings/settings-schema.test.ts` |
| Create | `template/backend/src/settings/settings.routes.ts` |
| Create | `template/backend/src/settings/settings.routes.test.ts` |
| Create | `template/frontend/src/views/settings/index.vue` |
| Create | `template/frontend/src/views/settings/SecretsManager.vue` |

### Step 4.1: Schema-Tests schreiben (TDD)

**`template/backend/src/settings/settings-schema.test.ts`:**
```typescript
import { describe, it, expect } from "bun:test";
import {
  SETTINGS_DEFINITIONS,
  validateSettingValue,
  getSettingsByCategory,
  type SettingDefinition,
} from "./settings-schema";

describe("Settings Schema", () => {
  describe("SETTINGS_DEFINITIONS", () => {
    it("should define SMTP settings", () => {
      const smtp = SETTINGS_DEFINITIONS.filter((s) => s.category === "smtp");
      expect(smtp.length).toBeGreaterThan(0);
      expect(smtp.map((s) => s.name)).toContain("SMTP_HOST");
      expect(smtp.map((s) => s.name)).toContain("SMTP_PORT");
      expect(smtp.map((s) => s.name)).toContain("SMTP_USER");
      expect(smtp.map((s) => s.name)).toContain("SMTP_PASSWORD");
      expect(smtp.map((s) => s.name)).toContain("SMTP_FROM");
    });

    it("should define AI provider settings", () => {
      const ai = SETTINGS_DEFINITIONS.filter((s) => s.category === "ai");
      expect(ai.length).toBeGreaterThan(0);
      expect(ai.map((s) => s.name)).toContain("ANTHROPIC_API_KEY");
      expect(ai.map((s) => s.name)).toContain("MISTRAL_API_KEY");
    });

    it("should define Telegram settings", () => {
      const telegram = SETTINGS_DEFINITIONS.filter(
        (s) => s.category === "telegram"
      );
      expect(telegram.map((s) => s.name)).toContain("TELEGRAM_BOT_TOKEN");
    });

    it("should mark sensitive settings as secret", () => {
      const passwords = SETTINGS_DEFINITIONS.filter((s) =>
        s.name.includes("PASSWORD") || s.name.includes("API_KEY") || s.name.includes("TOKEN")
      );
      passwords.forEach((s) => {
        expect(s.isSecret).toBe(true);
      });
    });
  });

  describe("validateSettingValue", () => {
    it("should validate a non-empty string value", () => {
      const result = validateSettingValue("SMTP_HOST", "smtp.example.com");
      expect(result.valid).toBe(true);
    });

    it("should reject an empty value for required settings", () => {
      const result = validateSettingValue("SMTP_HOST", "");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should validate SMTP_PORT as a number string", () => {
      const result = validateSettingValue("SMTP_PORT", "587");
      expect(result.valid).toBe(true);
    });

    it("should reject non-numeric SMTP_PORT", () => {
      const result = validateSettingValue("SMTP_PORT", "abc");
      expect(result.valid).toBe(false);
    });

    it("should reject unknown setting names", () => {
      const result = validateSettingValue("UNKNOWN_SETTING", "value");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unknown setting");
    });
  });

  describe("getSettingsByCategory", () => {
    it("should group settings by category", () => {
      const grouped = getSettingsByCategory();
      expect(grouped).toHaveProperty("smtp");
      expect(grouped).toHaveProperty("ai");
      expect(grouped.smtp.length).toBeGreaterThan(0);
    });

    it("should return all categories", () => {
      const grouped = getSettingsByCategory();
      const categories = Object.keys(grouped);
      expect(categories).toContain("smtp");
      expect(categories).toContain("ai");
      expect(categories).toContain("telegram");
    });
  });
});
```

### Step 4.2: Schema implementieren

**`template/backend/src/settings/settings-schema.ts`:**
```typescript
// ============================================================
// Settings Schema — Vordefinierte Settings fuer die Super App
// ============================================================

export interface SettingDefinition {
  /** DB-Name (uppercase, underscores) */
  name: string;
  /** Anzeige-Label im Frontend */
  label: string;
  /** Kategorie fuer Gruppierung */
  category: string;
  /** Ob der Wert verschluesselt gespeichert wird */
  isSecret: boolean;
  /** Beschreibung fuer das Frontend */
  description: string;
  /** Optionaler Standard-Wert */
  defaultValue?: string;
  /** Validierungstyp */
  valueType: "string" | "number" | "boolean" | "email" | "url";
}

/**
 * Alle vordefinierten Settings der Super App.
 * Werden ueber die Settings UI verwaltet und verschluesselt in der DB gespeichert.
 */
export const SETTINGS_DEFINITIONS: SettingDefinition[] = [
  // --- SMTP ---
  {
    name: "SMTP_HOST",
    label: "SMTP Host",
    category: "smtp",
    isSecret: false,
    description: "SMTP server hostname",
    valueType: "string",
  },
  {
    name: "SMTP_PORT",
    label: "SMTP Port",
    category: "smtp",
    isSecret: false,
    description: "SMTP server port (e.g. 587, 465)",
    defaultValue: "587",
    valueType: "number",
  },
  {
    name: "SMTP_USER",
    label: "SMTP Username",
    category: "smtp",
    isSecret: false,
    description: "SMTP authentication username",
    valueType: "string",
  },
  {
    name: "SMTP_PASSWORD",
    label: "SMTP Password",
    category: "smtp",
    isSecret: true,
    description: "SMTP authentication password",
    valueType: "string",
  },
  {
    name: "SMTP_FROM",
    label: "SMTP From Address",
    category: "smtp",
    isSecret: false,
    description: "Default sender email address",
    valueType: "email",
  },
  {
    name: "SMTP_SECURE",
    label: "SMTP Use TLS",
    category: "smtp",
    isSecret: false,
    description: "Use TLS for SMTP connection",
    defaultValue: "true",
    valueType: "boolean",
  },

  // --- AI Providers ---
  {
    name: "ANTHROPIC_API_KEY",
    label: "Anthropic API Key",
    category: "ai",
    isSecret: true,
    description: "API key for Claude models",
    valueType: "string",
  },
  {
    name: "MISTRAL_API_KEY",
    label: "Mistral API Key",
    category: "ai",
    isSecret: true,
    description: "API key for Mistral models",
    valueType: "string",
  },
  {
    name: "OPENROUTER_API_KEY",
    label: "OpenRouter API Key",
    category: "ai",
    isSecret: true,
    description: "API key for OpenRouter",
    valueType: "string",
  },
  {
    name: "AI_DEFAULT_MODEL",
    label: "Default AI Model",
    category: "ai",
    isSecret: false,
    description: "Default model for chat/agent tasks (e.g. claude-sonnet-4-5)",
    defaultValue: "claude-sonnet-4-5",
    valueType: "string",
  },
  {
    name: "AI_DAILY_COST_LIMIT_USD",
    label: "Daily AI Cost Limit (USD)",
    category: "ai",
    isSecret: false,
    description: "Maximum daily AI spending in USD",
    defaultValue: "5.00",
    valueType: "number",
  },

  // --- Telegram ---
  {
    name: "TELEGRAM_BOT_TOKEN",
    label: "Telegram Bot Token",
    category: "telegram",
    isSecret: true,
    description: "Bot token from @BotFather",
    valueType: "string",
  },
  {
    name: "TELEGRAM_ALLOWED_CHAT_IDS",
    label: "Allowed Chat IDs",
    category: "telegram",
    isSecret: false,
    description: "Comma-separated list of allowed Telegram chat IDs",
    valueType: "string",
  },

  // --- Cost Tracking (external) ---
  {
    name: "COST_TRACKER_URL",
    label: "External Cost Tracker URL",
    category: "cost-tracking",
    isSecret: false,
    description: "URL of external cost tracking service (optional)",
    valueType: "url",
  },
  {
    name: "COST_TRACKER_TOKEN",
    label: "Cost Tracker Auth Token",
    category: "cost-tracking",
    isSecret: true,
    description: "Bearer token for external cost tracker",
    valueType: "string",
  },
];

/**
 * Validiert einen Setting-Wert gegen seine Definition.
 */
export function validateSettingValue(
  name: string,
  value: string
): { valid: boolean; error?: string } {
  const def = SETTINGS_DEFINITIONS.find((s) => s.name === name);
  if (!def) {
    return { valid: false, error: `Unknown setting: ${name}` };
  }

  if (!value || value.trim() === "") {
    return { valid: false, error: `${name} darf nicht leer sein` };
  }

  switch (def.valueType) {
    case "number": {
      const num = Number(value);
      if (isNaN(num)) {
        return { valid: false, error: `${name} muss eine Zahl sein` };
      }
      break;
    }
    case "boolean": {
      if (value !== "true" && value !== "false") {
        return { valid: false, error: `${name} muss "true" oder "false" sein` };
      }
      break;
    }
    case "email": {
      if (!value.includes("@")) {
        return { valid: false, error: `${name} muss eine gueltige E-Mail sein` };
      }
      break;
    }
    case "url": {
      try {
        new URL(value);
      } catch {
        return { valid: false, error: `${name} muss eine gueltige URL sein` };
      }
      break;
    }
  }

  return { valid: true };
}

/**
 * Gruppiert Settings nach Kategorie.
 */
export function getSettingsByCategory(): Record<string, SettingDefinition[]> {
  const grouped: Record<string, SettingDefinition[]> = {};
  for (const def of SETTINGS_DEFINITIONS) {
    if (!grouped[def.category]) {
      grouped[def.category] = [];
    }
    grouped[def.category].push(def);
  }
  return grouped;
}
```

### Step 4.3: Routes-Tests schreiben (TDD)

**`template/backend/src/settings/settings.routes.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import { defineSettingsRoutes } from "./settings.routes";

describe("Settings Routes", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.use("*", async (c, next) => {
      c.set("usersId", "admin-user-1");
      c.set("tenantId", "tenant-1");
      await next();
    });

    defineSettingsRoutes(app as any, "/api/v1", {
      getSecret: mock(async (name: string, tenantId: string) => "decrypted-value"),
      setSecret: mock(async (data: any) => ({
        id: "secret-1",
        name: data.name,
        createdAt: new Date().toISOString(),
      })),
      getSecrets: mock(async (tenantId: string) => [
        { id: "s-1", name: "SMTP_HOST", createdAt: "2026-04-01T00:00:00Z" },
        { id: "s-2", name: "ANTHROPIC_API_KEY", createdAt: "2026-04-01T00:00:00Z" },
      ]),
      deleteSecret: mock(async (name: string, tenantId: string) => undefined),
    });
  });

  it("GET /settings/schema should return settings definitions grouped by category", async () => {
    const res = await app.request("/api/v1/tenant/tenant-1/settings/schema", {
      method: "GET",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("smtp");
    expect(body).toHaveProperty("ai");
  });

  it("GET /settings/values should return stored settings without secret values", async () => {
    const res = await app.request("/api/v1/tenant/tenant-1/settings/values", {
      method: "GET",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    // Secret-Werte sollten maskiert sein
    const apiKey = body.find((s: any) => s.name === "ANTHROPIC_API_KEY");
    expect(apiKey).toBeDefined();
  });

  it("POST /settings should save a setting value", async () => {
    const res = await app.request("/api/v1/tenant/tenant-1/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "SMTP_HOST", value: "smtp.example.com" }),
    });
    expect(res.status).toBe(200);
  });

  it("POST /settings should reject unknown setting names", async () => {
    const res = await app.request("/api/v1/tenant/tenant-1/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "UNKNOWN", value: "test" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /settings should validate SMTP_PORT as number", async () => {
    const res = await app.request("/api/v1/tenant/tenant-1/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "SMTP_PORT", value: "abc" }),
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /settings/:name should delete a setting", async () => {
    const res = await app.request("/api/v1/tenant/tenant-1/settings/SMTP_HOST", {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
  });
});
```

### Step 4.4: Routes implementieren

**`template/backend/src/settings/settings.routes.ts`:**
```typescript
import type { FrameworkHonoApp } from "@framework/types";
import { HTTPException } from "hono/http-exception";
import {
  authAndSetUsersInfo,
  checkUserPermission,
} from "@framework/lib/utils/hono-middlewares";
import { validateScope } from "@framework/lib/utils/validate-scope";
import { isTenantAdmin } from "@framework/routes/tenant";
import * as v from "valibot";
import { validator } from "hono-openapi";
import { describeRoute, resolver } from "hono-openapi";
import {
  SETTINGS_DEFINITIONS,
  getSettingsByCategory,
  validateSettingValue,
} from "./settings-schema";

// --- Dependency Injection fuer Framework Secrets ---

export interface SettingsRouteDeps {
  getSecret: (name: string, tenantId: string) => Promise<string | null>;
  setSecret: (data: {
    name: string;
    value: string;
    tenantId: string;
  }) => Promise<{ id: string; name: string; createdAt: string }>;
  getSecrets: (
    tenantId: string
  ) => Promise<Array<{ id: string; name: string; createdAt: string }>>;
  deleteSecret: (name: string, tenantId: string) => Promise<void>;
}

const setSettingSchema = v.object({
  name: v.string(),
  value: v.string(),
});

/**
 * Definiert Settings-Routen fuer die Super App.
 * Baut auf dem Framework's Secrets-System auf, aber mit validiertem Schema.
 */
export function defineSettingsRoutes(
  app: FrameworkHonoApp,
  API_BASE_PATH: string,
  deps: SettingsRouteDeps
) {
  // GET /settings/schema — Liefert das Settings-Schema (was konfiguriert werden kann)
  app.get(
    API_BASE_PATH + "/tenant/:tenantId/settings/schema",
    authAndSetUsersInfo,
    checkUserPermission,
    validateScope("secrets:read"),
    validator("param", v.object({ tenantId: v.string() })),
    isTenantAdmin,
    async (c) => {
      const grouped = getSettingsByCategory();
      return c.json(grouped);
    }
  );

  // GET /settings/values — Liefert gespeicherte Settings (Secrets maskiert)
  app.get(
    API_BASE_PATH + "/tenant/:tenantId/settings/values",
    authAndSetUsersInfo,
    checkUserPermission,
    validateScope("secrets:read"),
    validator("param", v.object({ tenantId: v.string() })),
    isTenantAdmin,
    async (c) => {
      try {
        const { tenantId } = c.req.valid("param");
        const stored = await deps.getSecrets(tenantId);

        // Enriche mit Schema-Infos, maskiere Secret-Werte
        const enriched = stored.map((s) => {
          const def = SETTINGS_DEFINITIONS.find((d) => d.name === s.name);
          return {
            ...s,
            label: def?.label ?? s.name,
            category: def?.category ?? "unknown",
            isSecret: def?.isSecret ?? false,
            isConfigured: true,
          };
        });

        return c.json(enriched);
      } catch (err) {
        throw new HTTPException(500, {
          message: "Error loading settings: " + err,
        });
      }
    }
  );

  // POST /settings — Setting speichern (validiert gegen Schema)
  app.post(
    API_BASE_PATH + "/tenant/:tenantId/settings",
    authAndSetUsersInfo,
    checkUserPermission,
    validateScope("secrets:write"),
    validator("json", setSettingSchema),
    validator("param", v.object({ tenantId: v.string() })),
    isTenantAdmin,
    async (c) => {
      const { tenantId } = c.req.valid("param");
      const { name, value } = c.req.valid("json");

      // Validierung gegen Settings-Schema
      const validation = validateSettingValue(name, value);
      if (!validation.valid) {
        throw new HTTPException(400, {
          message: validation.error!,
        });
      }

      try {
        const result = await deps.setSecret({ name, value, tenantId });
        return c.json(result);
      } catch (err) {
        throw new HTTPException(500, {
          message: "Error saving setting: " + err,
        });
      }
    }
  );

  // DELETE /settings/:name — Setting loeschen
  app.delete(
    API_BASE_PATH + "/tenant/:tenantId/settings/:name",
    authAndSetUsersInfo,
    checkUserPermission,
    validateScope("secrets:write"),
    validator("param", v.object({ tenantId: v.string(), name: v.string() })),
    isTenantAdmin,
    async (c) => {
      const { tenantId, name } = c.req.valid("param");
      try {
        await deps.deleteSecret(name, tenantId);
        return c.json({ success: true });
      } catch (err) {
        throw new HTTPException(500, {
          message: "Error deleting setting: " + err,
        });
      }
    }
  );
}
```

### Step 4.5: Frontend — Settings View

**`template/frontend/src/views/settings/index.vue`:**
```vue
<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import SecretsManager from "./SecretsManager.vue";

interface SettingDefinition {
  name: string;
  label: string;
  category: string;
  isSecret: boolean;
  description: string;
  defaultValue?: string;
  valueType: string;
}

interface StoredSetting {
  id: string;
  name: string;
  label: string;
  category: string;
  isSecret: boolean;
  isConfigured: boolean;
  createdAt: string;
}

const schema = ref<Record<string, SettingDefinition[]>>({});
const storedValues = ref<StoredSetting[]>([]);
const loading = ref(true);
const activeCategory = ref("smtp");

const categories = computed(() => Object.keys(schema.value));

async function loadSettings(tenantId: string) {
  loading.value = true;
  try {
    const [schemaRes, valuesRes] = await Promise.all([
      fetch(`/api/v1/tenant/${tenantId}/settings/schema`),
      fetch(`/api/v1/tenant/${tenantId}/settings/values`),
    ]);
    schema.value = await schemaRes.json();
    storedValues.value = await valuesRes.json();
  } catch (err) {
    console.error("Failed to load settings:", err);
  } finally {
    loading.value = false;
  }
}

function isConfigured(name: string): boolean {
  return storedValues.value.some((s) => s.name === name);
}

onMounted(() => {
  // tenantId wird aus dem Router oder Store bezogen
  const tenantId = "default"; // TODO: aus authStore/route holen
  loadSettings(tenantId);
});
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">Settings</h1>

    <div v-if="loading" class="text-center py-8">
      <i class="pi pi-spin pi-spinner text-2xl"></i>
    </div>

    <div v-else class="flex gap-6">
      <!-- Kategorie-Navigation -->
      <nav class="w-48 shrink-0">
        <ul class="space-y-1">
          <li
            v-for="cat in categories"
            :key="cat"
            @click="activeCategory = cat"
            class="px-3 py-2 rounded cursor-pointer capitalize"
            :class="{
              'bg-primary text-white': activeCategory === cat,
              'hover:bg-surface-100': activeCategory !== cat,
            }"
          >
            {{ cat }}
          </li>
        </ul>
      </nav>

      <!-- Settings-Formulare -->
      <div class="flex-1">
        <SecretsManager
          v-if="schema[activeCategory]"
          :category="activeCategory"
          :definitions="schema[activeCategory]"
          :stored-values="storedValues.filter((s) => s.category === activeCategory)"
          @saved="(tenantId: string) => loadSettings(tenantId)"
        />
      </div>
    </div>
  </div>
</template>
```

### Step 4.6: Frontend — SecretsManager Component

**`template/frontend/src/views/settings/SecretsManager.vue`:**
```vue
<script setup lang="ts">
import { ref, computed } from "vue";

interface SettingDefinition {
  name: string;
  label: string;
  category: string;
  isSecret: boolean;
  description: string;
  defaultValue?: string;
  valueType: string;
}

interface StoredSetting {
  id: string;
  name: string;
  label: string;
  category: string;
  isSecret: boolean;
  isConfigured: boolean;
  createdAt: string;
}

const props = defineProps<{
  category: string;
  definitions: SettingDefinition[];
  storedValues: StoredSetting[];
}>();

const emit = defineEmits<{
  saved: [tenantId: string];
}>();

const editingValues = ref<Record<string, string>>({});
const savingKey = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

function isConfigured(name: string): boolean {
  return props.storedValues.some((s) => s.name === name);
}

async function saveSetting(name: string) {
  const value = editingValues.value[name];
  if (!value || value.trim() === "") return;

  savingKey.value = name;
  errorMessage.value = null;

  try {
    const tenantId = "default"; // TODO: aus authStore/route holen
    const res = await fetch(`/api/v1/tenant/${tenantId}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, value }),
    });

    if (!res.ok) {
      const err = await res.json();
      errorMessage.value = err.message || "Failed to save";
      return;
    }

    editingValues.value[name] = "";
    emit("saved", tenantId);
  } catch (err) {
    errorMessage.value = "Network error";
  } finally {
    savingKey.value = null;
  }
}

async function deleteSetting(name: string) {
  const tenantId = "default"; // TODO: aus authStore/route holen
  try {
    await fetch(`/api/v1/tenant/${tenantId}/settings/${name}`, {
      method: "DELETE",
    });
    emit("saved", tenantId);
  } catch (err) {
    errorMessage.value = "Failed to delete";
  }
}
</script>

<template>
  <div>
    <h2 class="text-xl font-semibold capitalize mb-4">{{ category }}</h2>

    <div v-if="errorMessage" class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
      {{ errorMessage }}
    </div>

    <div class="space-y-4">
      <div
        v-for="def in definitions"
        :key="def.name"
        class="border rounded-lg p-4"
      >
        <div class="flex items-center justify-between mb-2">
          <div>
            <label class="font-medium">{{ def.label }}</label>
            <p class="text-sm text-surface-500">{{ def.description }}</p>
          </div>
          <span
            v-if="isConfigured(def.name)"
            class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded"
          >
            Configured
          </span>
          <span v-else class="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
            Not set
          </span>
        </div>

        <div class="flex gap-2">
          <input
            v-model="editingValues[def.name]"
            :type="def.isSecret ? 'password' : 'text'"
            :placeholder="def.defaultValue || `Enter ${def.label}...`"
            class="flex-1 border rounded px-3 py-2 text-sm"
          />
          <button
            @click="saveSetting(def.name)"
            :disabled="savingKey === def.name"
            class="px-4 py-2 bg-primary text-white rounded text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {{ savingKey === def.name ? "Saving..." : "Save" }}
          </button>
          <button
            v-if="isConfigured(def.name)"
            @click="deleteSetting(def.name)"
            class="px-3 py-2 text-red-600 border border-red-200 rounded text-sm hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

### Step 4.7: Tests ausfuehren

```bash
cd template/backend && bun test src/settings/settings-schema.test.ts src/settings/settings.routes.test.ts
```

### Commit

```
feat(settings): add settings schema, validated routes, and Vue settings UI for encrypted secrets management
```

---

## Task 5: Auth Middleware Integration

**Ziel:** Sicherstellen, dass alle Modul-Routen durch das Framework's Auth-Middleware laufen. Die `checkUserPermission` Middleware im Framework ist aktuell ein HACK (laesst alles durch) — hier wird die Super App so konfiguriert, dass sie die Permission-Pruefung korrekt nutzt. Tests: unauthenticated → 401, wrong permissions → 403, correct → 200.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/auth/module-auth-middleware.ts` |
| Create | `template/backend/src/auth/module-auth-middleware.test.ts` |

### Step 5.1: Tests schreiben (TDD)

**`template/backend/src/auth/module-auth-middleware.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import {
  createModuleAuthMiddleware,
  type ModuleAuthMiddlewareDeps,
} from "./module-auth-middleware";

describe("Module Auth Middleware", () => {
  let app: Hono;
  let deps: ModuleAuthMiddlewareDeps;

  beforeEach(() => {
    app = new Hono();
    deps = {
      verifyToken: mock(async (authHeader: string | undefined) => {
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return null;
        }
        const token = authHeader.split(" ")[1];
        if (token === "valid-token") {
          return { usersId: "user-1", usersEmail: "user@test.com" };
        }
        if (token === "admin-token") {
          return { usersId: "admin-1", usersEmail: "admin@test.com" };
        }
        return null;
      }),
      hasPermission: mock(async (userId: string, method: string, path: string) => {
        // Admin hat alles
        if (userId === "admin-1") return true;
        // User hat nur GET
        if (userId === "user-1" && method === "GET") return true;
        return false;
      }),
    };

    const middleware = createModuleAuthMiddleware(deps);

    // Geschuetzte Route
    app.use("/api/v1/mail/*", middleware);
    app.get("/api/v1/mail/inbox", (c) => c.json({ messages: [] }));
    app.post("/api/v1/mail/send", (c) => c.json({ sent: true }));
    app.delete("/api/v1/mail/1", (c) => c.json({ deleted: true }));
  });

  it("should return 401 when no token is provided", async () => {
    const res = await app.request("/api/v1/mail/inbox", { method: "GET" });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("should return 401 when token is invalid", async () => {
    const res = await app.request("/api/v1/mail/inbox", {
      method: "GET",
      headers: { Authorization: "Bearer invalid-token" },
    });
    expect(res.status).toBe(401);
  });

  it("should return 200 when token is valid and user has GET permission", async () => {
    const res = await app.request("/api/v1/mail/inbox", {
      method: "GET",
      headers: { Authorization: "Bearer valid-token" },
    });
    expect(res.status).toBe(200);
  });

  it("should return 403 when user lacks POST permission", async () => {
    const res = await app.request("/api/v1/mail/send", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("should return 403 when user lacks DELETE permission", async () => {
    const res = await app.request("/api/v1/mail/1", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token" },
    });
    expect(res.status).toBe(403);
  });

  it("should return 200 when admin has full permissions", async () => {
    const res = await app.request("/api/v1/mail/send", {
      method: "POST",
      headers: { Authorization: "Bearer admin-token" },
    });
    expect(res.status).toBe(200);
  });

  it("should set usersId in context on success", async () => {
    let capturedUserId: string | null = null;
    app.get("/api/v1/mail/test-ctx", (c) => {
      capturedUserId = c.get("usersId");
      return c.json({ ok: true });
    });

    await app.request("/api/v1/mail/test-ctx", {
      method: "GET",
      headers: { Authorization: "Bearer valid-token" },
    });
    expect(capturedUserId).toBe("user-1");
  });

  it("should set usersEmail in context on success", async () => {
    let capturedEmail: string | null = null;
    app.get("/api/v1/mail/test-email", (c) => {
      capturedEmail = c.get("usersEmail");
      return c.json({ ok: true });
    });

    await app.request("/api/v1/mail/test-email", {
      method: "GET",
      headers: { Authorization: "Bearer valid-token" },
    });
    expect(capturedEmail).toBe("user@test.com");
  });
});
```

### Step 5.2: Implementierung

**`template/backend/src/auth/module-auth-middleware.ts`:**
```typescript
import type { Context, Next } from "hono";

// ============================================================
// Module Auth Middleware — JWT + Permission Check fuer alle Modul-Routen
// ============================================================

export interface ModuleAuthMiddlewareDeps {
  /** Verifiziert den Token und gibt User-Infos zurueck. Null bei ungueltigem Token. */
  verifyToken: (
    authHeader: string | undefined
  ) => Promise<{ usersId: string; usersEmail: string } | null>;
  /** Prueft ob ein User Zugriff auf einen Pfad mit einer Methode hat. */
  hasPermission: (
    userId: string,
    method: string,
    path: string
  ) => Promise<boolean>;
}

/**
 * Erstellt eine Hono-Middleware die:
 * 1. Token verifiziert (JWT oder Hanko) → 401 bei Fehler
 * 2. Path-basierte Permissions prueft → 403 bei Fehler
 * 3. usersId und usersEmail im Context setzt bei Erfolg
 */
export function createModuleAuthMiddleware(deps: ModuleAuthMiddlewareDeps) {
  return async (c: Context, next: Next) => {
    // 1. Token verifizieren
    const authHeader = c.req.header("Authorization");
    const userInfo = await deps.verifyToken(authHeader);

    if (!userInfo) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // 2. Permission pruefen
    const method = c.req.method;
    const path = new URL(c.req.url).pathname;

    const hasAccess = await deps.hasPermission(userInfo.usersId, method, path);
    if (!hasAccess) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // 3. User-Infos im Context setzen
    c.set("usersId", userInfo.usersId);
    c.set("usersEmail", userInfo.usersEmail);

    await next();
  };
}

/**
 * Erstellt die Middleware mit den echten Framework-Dependencies.
 * Nutzt die vorhandenen Framework-Funktionen fuer Token-Verifikation und Permission-Check.
 */
export function createModuleAuthMiddlewareFromFramework() {
  // Lazy-Import um zirkulaere Abhaengigkeiten zu vermeiden
  return createModuleAuthMiddleware({
    async verifyToken(authHeader) {
      const { checkToken } = await import(
        "@framework/lib/utils/hono-middlewares"
      );
      try {
        // checkToken erwartet einen Hono Context — wir bauen einen minimalen
        // Stattdessen nutzen wir die direkte Token-Extraktion
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return null;
        }
        const token = authHeader.split(" ")[1];
        if (!token) return null;

        // JWT oder Hanko Verifikation je nach Konfiguration
        const { _GLOBAL_SERVER_CONFIG } = await import("@framework/store");

        if (_GLOBAL_SERVER_CONFIG.authType === "hanko") {
          // Hanko: Token ueber API validieren
          const HANKO_API_URL = process.env.HANKO_API_URL ?? "";
          const res = await fetch(`${HANKO_API_URL}/sessions/validate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_token: token }),
          });

          if (!res.ok) return null;
          const data = await res.json();
          if (!data.is_valid) return null;

          return {
            usersId: data.user_id ?? data.claims?.subject ?? "",
            usersEmail: data.claims?.email?.address ?? "",
          };
        } else {
          // JWT: Token verifizieren
          const jwtlib = (await import("jsonwebtoken")).default;
          const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY || "";
          const decoded = jwtlib.verify(token, JWT_PUBLIC_KEY) as any;

          return {
            usersId: decoded.sub ?? "",
            usersEmail: decoded.email ?? "",
          };
        }
      } catch {
        return null;
      }
    },

    async hasPermission(userId, method, path) {
      const { hasPermission } = await import(
        "@framework/lib/auth/permissions"
      );
      return hasPermission(userId, method, path);
    },
  });
}
```

### Step 5.3: Tests ausfuehren

```bash
cd template/backend && bun test src/auth/module-auth-middleware.test.ts
```

### Commit

```
feat(auth): add module auth middleware with JWT/Hanko verification and path-based permission checks
```

---

## Task 6: Frontend Auth Flow

**Ziel:** Vue Login-Seite mit Passkey-Unterstuetzung, Registrierung mit Invitation Code, und permission-basierte Modul-Sichtbarkeit im module-loader.

### Files

| Action | Path |
|--------|------|
| Create | `template/frontend/src/views/auth/Login.vue` |
| Create | `template/frontend/src/views/auth/Register.vue` |
| Create | `template/frontend/src/composables/usePasskey.ts` |
| Create | `template/frontend/src/composables/usePasskey.test.ts` |
| Modify | `template/frontend/src/stores/authStore.ts` |
| Create | `template/frontend/src/auth/module-visibility.ts` |
| Create | `template/frontend/src/auth/module-visibility.test.ts` |
| Modify | `template/frontend/src/router/index.ts` |

### Step 6.1: Module Visibility Tests schreiben (TDD)

**`template/frontend/src/auth/module-visibility.test.ts`:**
```typescript
import { describe, it, expect } from "bun:test";
import {
  filterVisibleModules,
  type UserPermissions,
  type ModuleVisibilityEntry,
} from "./module-visibility";

describe("Module Visibility", () => {
  const modules: ModuleVisibilityEntry[] = [
    {
      name: "mail",
      requiredPermissions: ["mail:read"],
      navigation: {
        label: "Mail",
        icon: "i-heroicons-envelope",
        position: "sidebar",
        order: 10,
      },
    },
    {
      name: "todos",
      requiredPermissions: ["todos:read"],
      navigation: {
        label: "Todos",
        icon: "i-heroicons-check-circle",
        position: "sidebar",
        order: 20,
      },
    },
    {
      name: "admin",
      requiredPermissions: ["admin:all:get"],
      navigation: {
        label: "Admin",
        icon: "i-heroicons-cog",
        position: "sidebar",
        order: 99,
      },
    },
  ];

  it("should return all modules for admin with all permissions", () => {
    const userPerms: UserPermissions = {
      permissions: ["admin:all:get", "mail:read", "todos:read"],
    };
    const visible = filterVisibleModules(modules, userPerms);
    expect(visible).toHaveLength(3);
  });

  it("should return only modules the user has permissions for", () => {
    const userPerms: UserPermissions = {
      permissions: ["mail:read"],
    };
    const visible = filterVisibleModules(modules, userPerms);
    expect(visible).toHaveLength(1);
    expect(visible[0].name).toBe("mail");
  });

  it("should return empty array when user has no matching permissions", () => {
    const userPerms: UserPermissions = {
      permissions: ["contacts:read"],
    };
    const visible = filterVisibleModules(modules, userPerms);
    expect(visible).toHaveLength(0);
  });

  it("should sort modules by navigation order", () => {
    const userPerms: UserPermissions = {
      permissions: ["mail:read", "todos:read", "admin:all:get"],
    };
    const visible = filterVisibleModules(modules, userPerms);
    expect(visible[0].name).toBe("mail");
    expect(visible[1].name).toBe("todos");
    expect(visible[2].name).toBe("admin");
  });

  it("should handle modules with multiple required permissions", () => {
    const modulesWithMulti: ModuleVisibilityEntry[] = [
      {
        name: "settings",
        requiredPermissions: ["secrets:read", "secrets:write"],
        navigation: {
          label: "Settings",
          icon: "i-heroicons-cog",
          position: "sidebar",
          order: 50,
        },
      },
    ];

    // Nur eine Permission → nicht sichtbar
    const partialPerms: UserPermissions = { permissions: ["secrets:read"] };
    expect(filterVisibleModules(modulesWithMulti, partialPerms)).toHaveLength(0);

    // Beide Permissions → sichtbar
    const fullPerms: UserPermissions = {
      permissions: ["secrets:read", "secrets:write"],
    };
    expect(filterVisibleModules(modulesWithMulti, fullPerms)).toHaveLength(1);
  });

  it("should filter out modules with position 'hidden'", () => {
    const modulesWithHidden: ModuleVisibilityEntry[] = [
      {
        name: "internal",
        requiredPermissions: ["internal:read"],
        navigation: {
          label: "Internal",
          icon: "internal",
          position: "hidden",
          order: 1,
        },
      },
    ];
    const userPerms: UserPermissions = { permissions: ["internal:read"] };
    const visible = filterVisibleModules(modulesWithHidden, userPerms);
    expect(visible).toHaveLength(0);
  });
});
```

### Step 6.2: Module Visibility implementieren

**`template/frontend/src/auth/module-visibility.ts`:**
```typescript
// ============================================================
// Module Visibility — Permission-basierte Modul-Sichtbarkeit
// ============================================================

export interface UserPermissions {
  permissions: string[];
}

export interface ModuleVisibilityEntry {
  name: string;
  requiredPermissions: string[];
  navigation: {
    label: string;
    icon: string;
    position: "sidebar" | "topbar" | "hidden";
    order: number;
  };
}

/**
 * Filtert Module basierend auf User-Permissions.
 * - Nur Module mit allen erforderlichen Permissions werden angezeigt.
 * - Module mit position "hidden" werden immer ausgeblendet.
 * - Ergebnis ist nach navigation.order sortiert.
 */
export function filterVisibleModules(
  modules: ModuleVisibilityEntry[],
  userPermissions: UserPermissions
): ModuleVisibilityEntry[] {
  return modules
    .filter((mod) => {
      // Hidden Module nicht anzeigen
      if (mod.navigation.position === "hidden") return false;

      // Alle erforderlichen Permissions muessen vorhanden sein
      return mod.requiredPermissions.every((perm) =>
        userPermissions.permissions.includes(perm)
      );
    })
    .sort((a, b) => a.navigation.order - b.navigation.order);
}
```

### Step 6.3: Passkey Composable Tests schreiben (TDD)

**`template/frontend/src/composables/usePasskey.test.ts`:**
```typescript
import { describe, it, expect, mock } from "bun:test";
import { createPasskeyActions, type PasskeyDeps } from "./usePasskey";

describe("usePasskey", () => {
  describe("createPasskeyActions", () => {
    let deps: PasskeyDeps;

    beforeEach(() => {
      deps = {
        hankoApiUrl: "https://hanko.example.com",
        fetchFn: mock(async (url: string, opts?: any) => {
          if (url.includes("/sessions/validate") && opts?.body) {
            return new Response(
              JSON.stringify({
                is_valid: true,
                user_id: "hanko-user-1",
                claims: {
                  email: { address: "user@test.com", is_verified: true },
                  subject: "hanko-user-1",
                },
              }),
              { status: 200 }
            );
          }
          return new Response("Not found", { status: 404 });
        }),
        onLoginSuccess: mock(async (token: string) => {}),
        onLoginError: mock((error: string) => {}),
      };
    });

    it("should validate a session token", async () => {
      const actions = createPasskeyActions(deps);
      const result = await actions.validateSession("valid-token");
      expect(result.valid).toBe(true);
      expect(result.userId).toBe("hanko-user-1");
      expect(result.email).toBe("user@test.com");
    });

    it("should return invalid for failed validation", async () => {
      deps.fetchFn = mock(async () => new Response("", { status: 401 }));
      const actions = createPasskeyActions(deps);
      const result = await actions.validateSession("invalid-token");
      expect(result.valid).toBe(false);
    });

    it("should call onLoginSuccess after successful validation", async () => {
      const actions = createPasskeyActions(deps);
      await actions.handlePostLogin("valid-token");
      expect(deps.onLoginSuccess).toHaveBeenCalledWith("valid-token");
    });

    it("should call onLoginError for failed validation", async () => {
      deps.fetchFn = mock(async () => new Response("", { status: 401 }));
      const actions = createPasskeyActions(deps);
      await actions.handlePostLogin("invalid-token");
      expect(deps.onLoginError).toHaveBeenCalled();
    });
  });
});
```

### Step 6.4: Passkey Composable implementieren

**`template/frontend/src/composables/usePasskey.ts`:**
```typescript
import { ref } from "vue";

// ============================================================
// Passkey Composable — Hanko WebAuthn Integration fuer Vue
// ============================================================

export interface PasskeyDeps {
  hankoApiUrl: string;
  fetchFn: typeof fetch;
  onLoginSuccess: (token: string) => Promise<void>;
  onLoginError: (error: string) => void;
}

export interface SessionValidationResult {
  valid: boolean;
  userId?: string;
  email?: string;
}

/**
 * Erstellt Passkey-Aktionen mit injizierten Dependencies.
 * Testbar ohne Browser-APIs.
 */
export function createPasskeyActions(deps: PasskeyDeps) {
  return {
    /**
     * Validiert ein Hanko-Session-Token gegen die Hanko API.
     */
    async validateSession(token: string): Promise<SessionValidationResult> {
      try {
        const res = await deps.fetchFn(
          `${deps.hankoApiUrl}/sessions/validate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_token: token }),
          }
        );

        if (!res.ok) {
          return { valid: false };
        }

        const data = await res.json();
        if (!data.is_valid) {
          return { valid: false };
        }

        return {
          valid: true,
          userId: data.user_id ?? data.claims?.subject,
          email: data.claims?.email?.address,
        };
      } catch {
        return { valid: false };
      }
    },

    /**
     * Handler nach erfolgreichem Hanko-Login.
     * Validiert den Token und ruft onLoginSuccess/onLoginError auf.
     */
    async handlePostLogin(token: string): Promise<void> {
      const result = await this.validateSession(token);
      if (result.valid) {
        await deps.onLoginSuccess(token);
      } else {
        deps.onLoginError("Session validation failed");
      }
    },
  };
}

/**
 * Vue Composable fuer Passkey-Auth.
 * Nutzt die Hanko Web Components im Browser.
 */
export function usePasskey(hankoApiUrl: string) {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isAuthenticated = ref(false);

  const actions = createPasskeyActions({
    hankoApiUrl,
    fetchFn: fetch.bind(globalThis),
    onLoginSuccess: async (token) => {
      // Token als Cookie setzen fuer das Backend
      document.cookie = `hanko=${token}; path=/; secure; samesite=strict`;
      isAuthenticated.value = true;
      error.value = null;
    },
    onLoginError: (err) => {
      error.value = err;
      isAuthenticated.value = false;
    },
  });

  return {
    isLoading,
    error,
    isAuthenticated,
    actions,
  };
}
```

### Step 6.5: Auth Store erweitern

**`template/frontend/src/stores/authStore.ts`:**
```typescript
import { defineStore } from "pinia";

interface UserInfo {
  id: string;
  email: string;
  permissions: string[];
  tenantId: string | null;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    isLoading: false,
    user: null as UserInfo | null,
    authType: "local" as "local" | "hanko",
  }),

  getters: {
    /**
     * Prueft ob ein JWT- oder Hanko-Token in den Cookies existiert.
     */
    hasExistingToken(): boolean {
      const cookies = document.cookie.split(";");
      const jwtCookie = cookies.find((cookie) =>
        cookie.trim().startsWith("jwt=")
      );
      const hankoCookie = cookies.find((cookie) =>
        cookie.trim().startsWith("hanko=")
      );

      if (jwtCookie) {
        const token = jwtCookie.split("=")[1];
        return !!token;
      }
      if (hankoCookie) {
        const token = hankoCookie.split("=")[1];
        return !!token;
      }
      return false;
    },

    /**
     * Prueft ob der User eine bestimmte Permission hat.
     */
    hasPermission(): (permission: string) => boolean {
      return (permission: string) => {
        return this.user?.permissions.includes(permission) ?? false;
      };
    },

    /**
     * Prueft ob der User Admin ist.
     */
    isAdmin(): boolean {
      return (
        this.user?.permissions.some((p) => p.startsWith("admin:all:")) ?? false
      );
    },
  },

  actions: {
    /**
     * Laedt User-Infos vom Backend (nach Login).
     */
    async fetchUserInfo() {
      this.isLoading = true;
      try {
        const res = await fetch("/api/v1/user/me");
        if (!res.ok) {
          this.user = null;
          return;
        }
        const data = await res.json();
        this.user = {
          id: data.id,
          email: data.email,
          permissions: data.permissions ?? [],
          tenantId: data.lastTenantId ?? null,
        };
      } catch {
        this.user = null;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Logout — loescht alle Auth-Cookies und leitet zum Login weiter.
     */
    logout() {
      document.cookie =
        "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=strict";
      document.cookie =
        "hanko=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=strict";
      this.user = null;
      window.location.href = "/login";
    },

    /**
     * Setzt den Auth-Typ (wird beim App-Start konfiguriert).
     */
    setAuthType(type: "local" | "hanko") {
      this.authType = type;
    },
  },
});
```

### Step 6.6: Login View

**`template/frontend/src/views/auth/Login.vue`:**
```vue
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/authStore";

const router = useRouter();
const authStore = useAuthStore();

const email = ref("");
const password = ref("");
const error = ref<string | null>(null);
const isLoading = ref(false);
const showPasskeyOption = ref(false);

// Hanko API URL wird vom Backend konfiguriert
const hankoApiUrl = ref("");

onMounted(async () => {
  // Auth-Config vom Backend laden
  try {
    const res = await fetch("/api/v1/auth/config");
    if (res.ok) {
      const config = await res.json();
      hankoApiUrl.value = config.hankoApiUrl ?? "";
      authStore.setAuthType(config.authType ?? "local");
      showPasskeyOption.value = config.authType === "hanko";
    }
  } catch {
    // Fallback: local auth
  }
});

async function loginWithPassword() {
  isLoading.value = true;
  error.value = null;

  try {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      error.value = data.message || "Login failed";
      return;
    }

    const data = await res.json();
    // Token als Cookie setzen
    document.cookie = `jwt=${data.token}; path=/; secure; samesite=strict; max-age=${60 * 60 * 24}`;

    // User-Infos laden
    await authStore.fetchUserInfo();

    // Weiterleitung
    router.push({ name: "Home" });
  } catch {
    error.value = "Network error";
  } finally {
    isLoading.value = false;
  }
}

function navigateToRegister() {
  router.push({ name: "Register" });
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface-50">
    <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
      <h1 class="text-2xl font-bold text-center mb-6">Super App</h1>

      <!-- Hanko Passkey Login -->
      <div v-if="showPasskeyOption && hankoApiUrl" class="mb-6">
        <p class="text-sm text-surface-500 text-center mb-4">
          Sign in with Passkey
        </p>
        <!-- Hanko Web Component -->
        <div id="hanko-auth"></div>
        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-surface-200"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-surface-500">or</span>
          </div>
        </div>
      </div>

      <!-- E-Mail + Passwort Login -->
      <form @submit.prevent="loginWithPassword" class="space-y-4">
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {{ error }}
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">E-Mail</label>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="w-full border rounded-lg px-3 py-2"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="w-full border rounded-lg px-3 py-2"
            placeholder="********"
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {{ isLoading ? "Signing in..." : "Sign in" }}
        </button>
      </form>

      <p class="text-sm text-center mt-4 text-surface-500">
        Don't have an account?
        <a
          @click.prevent="navigateToRegister"
          class="text-primary cursor-pointer hover:underline"
        >
          Register
        </a>
      </p>
    </div>
  </div>
</template>
```

### Step 6.7: Register View

**`template/frontend/src/views/auth/Register.vue`:**
```vue
<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const email = ref("");
const password = ref("");
const passwordConfirm = ref("");
const invitationCode = ref("");
const error = ref<string | null>(null);
const success = ref(false);
const isLoading = ref(false);

async function register() {
  error.value = null;

  // Client-seitige Validierung
  if (password.value !== passwordConfirm.value) {
    error.value = "Passwords do not match";
    return;
  }

  if (password.value.length < 8) {
    error.value = "Password must be at least 8 characters";
    return;
  }

  if (!invitationCode.value.trim()) {
    error.value = "Invitation code is required";
    return;
  }

  isLoading.value = true;

  try {
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
        invitationCode: invitationCode.value,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      error.value = data.message || "Registration failed";
      return;
    }

    success.value = true;
  } catch {
    error.value = "Network error";
  } finally {
    isLoading.value = false;
  }
}

function navigateToLogin() {
  router.push({ name: "Login" });
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface-50">
    <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
      <h1 class="text-2xl font-bold text-center mb-6">Register</h1>

      <!-- Erfolgs-Meldung -->
      <div v-if="success" class="text-center">
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          Registration successful! Please check your email to verify your account.
        </div>
        <a
          @click.prevent="navigateToLogin"
          class="text-primary cursor-pointer hover:underline"
        >
          Back to Login
        </a>
      </div>

      <!-- Registrierungsformular -->
      <form v-else @submit.prevent="register" class="space-y-4">
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {{ error }}
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Invitation Code</label>
          <input
            v-model="invitationCode"
            type="text"
            required
            class="w-full border rounded-lg px-3 py-2 font-mono tracking-wider"
            placeholder="ABCD1234"
            maxlength="12"
          />
          <p class="text-xs text-surface-400 mt-1">
            Required. Ask your admin for an invitation code.
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">E-Mail</label>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="w-full border rounded-lg px-3 py-2"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="new-password"
            class="w-full border rounded-lg px-3 py-2"
            placeholder="Min. 8 characters"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Confirm Password</label>
          <input
            v-model="passwordConfirm"
            type="password"
            required
            autocomplete="new-password"
            class="w-full border rounded-lg px-3 py-2"
            placeholder="Repeat password"
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {{ isLoading ? "Registering..." : "Register" }}
        </button>
      </form>

      <p v-if="!success" class="text-sm text-center mt-4 text-surface-500">
        Already have an account?
        <a
          @click.prevent="navigateToLogin"
          class="text-primary cursor-pointer hover:underline"
        >
          Sign in
        </a>
      </p>
    </div>
  </div>
</template>
```

### Step 6.8: Router aktualisieren

**`template/frontend/src/router/index.ts`:**
```typescript
import { createRouter, createWebHashHistory } from "vue-router";
import DefaultLayout from "../components/layout/Default.vue";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    // Auth Routes (ungeschuetzt)
    {
      path: "/login",
      name: "Login",
      component: () => import("../views/auth/Login.vue"),
      meta: { public: true },
    },
    {
      path: "/register",
      name: "Register",
      component: () => import("../views/auth/Register.vue"),
      meta: { public: true },
    },

    // Geschuetzte Routes
    {
      path: "/",
      name: "home",
      component: DefaultLayout,
      children: [
        {
          path: "",
          name: "Home",
          component: () => import("../views/index.vue"),
        },
        {
          path: "tenant/:tenantId/chat",
          name: "Chat",
          component: () => import("../views/chat/index.vue"),
        },
        {
          path: "settings",
          name: "Settings",
          component: () => import("../views/settings/index.vue"),
          meta: { requiresAdmin: true },
        },
      ],
    },

    // 404
    {
      path: "/:pathMatch(.*)*",
      name: "404",
      component: () => import("../views/404.vue"),
      meta: { public: true },
    },
  ],
});

const isAuthenticated = (): boolean => {
  return document.cookie
    .split(";")
    .some(
      (item) =>
        item.trim().startsWith("jwt=") || item.trim().startsWith("hanko=")
    );
};

/**
 * Navigation Guard — schuetzt alle Routes ausser public
 */
router.beforeEach((to, from, next) => {
  // Oeffentliche Routes immer erlauben
  if (to.meta.public) {
    // Wenn bereits eingeloggt und Login-Seite → weiterleiten
    if (isAuthenticated() && (to.name === "Login" || to.name === "Register")) {
      next({ name: "Home" });
      return;
    }
    next();
    return;
  }

  // Geschuetzte Routes: Token pruefen
  if (!isAuthenticated()) {
    next({ name: "Login" });
    return;
  }

  next();
});

/**
 * Navigate to a route
 */
export const goto = (data: { name?: string; url?: string }) => {
  if (data.name) {
    router.push({ name: data.name });
  } else if (data.url) {
    window.location.href = data.url;
  }
};

export default router;
```

### Step 6.9: Tests ausfuehren

```bash
cd template/frontend && bun test src/auth/module-visibility.test.ts
cd template/backend && bun test src/auth/hanko-config.test.ts
```

### Commit

```
feat(auth): add frontend auth flow with Login, Register, Passkey composable, and permission-based module visibility
```

---

## Task 7: Integration & Verifikation

**Ziel:** Alle Teile zusammenfuegen, defineServer() mit Auth-Config aufrufen, Routes registrieren, End-to-End Smoke-Tests.

### Files

| Action | Path |
|--------|------|
| Modify | `template/backend/src/index.ts` |
| Create | `template/backend/src/auth/index.ts` |
| Create | `template/backend/src/auth/auth-config.routes.ts` |
| Create | `template/backend/src/auth/auth-config.routes.test.ts` |

### Step 7.1: Auth Barrel Export

**`template/backend/src/auth/index.ts`:**
```typescript
// ============================================================
// Auth — Barrel Export fuer alle Auth-Komponenten
// ============================================================

// Hanko Konfiguration
export { createHankoConfig, validateHankoEnv, type HankoConfig } from "./hanko-config";

// Invitation Codes
export {
  createInvitationCodeService,
  generateInvitationCode,
  type InvitationCodeServiceDeps,
} from "./invitation-codes";
export { defineInvitationCodeRoutes } from "./invitation-codes.routes";
export { createInvitationCodeDbDeps } from "./invitation-codes.db";

// Permission Setup
export {
  buildModulePermissions,
  buildDefaultGroups,
  createPermissionSetup,
  type PermissionEntry,
  type PermissionGroup,
  type PermissionSetupDeps,
} from "./permission-setup";
export { seedPermissionsForTenant } from "./seed-permissions";

// Auth Middleware
export {
  createModuleAuthMiddleware,
  createModuleAuthMiddlewareFromFramework,
  type ModuleAuthMiddlewareDeps,
} from "./module-auth-middleware";
```

### Step 7.2: Auth Config Route Tests (TDD)

**`template/backend/src/auth/auth-config.routes.test.ts`:**
```typescript
import { describe, it, expect, beforeEach } from "bun:test";
import { Hono } from "hono";
import { defineAuthConfigRoutes } from "./auth-config.routes";

describe("Auth Config Routes", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    defineAuthConfigRoutes(app as any, "/api/v1", {
      authType: "hanko",
      hankoApiUrl: "https://hanko.example.com",
      invitationCodeRequired: true,
    });
  });

  it("GET /auth/config should return auth configuration (public)", async () => {
    const res = await app.request("/api/v1/auth/config", { method: "GET" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authType).toBe("hanko");
    expect(body.hankoApiUrl).toBe("https://hanko.example.com");
    expect(body.invitationCodeRequired).toBe(true);
  });

  it("should not expose sensitive information", async () => {
    const res = await app.request("/api/v1/auth/config", { method: "GET" });
    const body = await res.json();
    // Kein JWT_PRIVATE_KEY, kein ENCRYPTION_KEY
    expect(body).not.toHaveProperty("jwtPrivateKey");
    expect(body).not.toHaveProperty("encryptionKey");
  });
});
```

### Step 7.3: Auth Config Route implementieren

**`template/backend/src/auth/auth-config.routes.ts`:**
```typescript
import type { FrameworkHonoApp } from "@framework/types";
import { describeRoute } from "hono-openapi";

interface AuthPublicConfig {
  authType: "local" | "hanko";
  hankoApiUrl?: string;
  invitationCodeRequired: boolean;
}

/**
 * Oeffentliche Route die dem Frontend die Auth-Konfiguration liefert.
 * Keine Authentifizierung erforderlich — das Frontend braucht diese Info VOR dem Login.
 */
export function defineAuthConfigRoutes(
  app: FrameworkHonoApp,
  API_BASE_PATH: string,
  config: AuthPublicConfig
) {
  app.get(
    API_BASE_PATH + "/auth/config",
    describeRoute({
      tags: ["auth"],
      summary: "Get public auth configuration",
      responses: {
        200: { description: "Auth configuration" },
      },
    }),
    async (c) => {
      return c.json({
        authType: config.authType,
        hankoApiUrl: config.authType === "hanko" ? config.hankoApiUrl : undefined,
        invitationCodeRequired: config.invitationCodeRequired,
      });
    }
  );
}
```

### Step 7.4: defineServer() vollstaendig konfigurieren

**`template/backend/src/index.ts`** — Vollstaendige Integration:
```typescript
import { defineServer } from "@framework/index";
import {
  createHankoConfig,
  validateHankoEnv,
  defineInvitationCodeRoutes,
  createInvitationCodeDbDeps,
  createModuleAuthMiddlewareFromFramework,
  seedPermissionsForTenant,
} from "./auth";
import { defineAuthConfigRoutes } from "./auth/auth-config.routes";
import { defineSettingsRoutes, type SettingsRouteDeps } from "./settings/settings.routes";
import { getSecret, setSecret, getSecrets, deleteSecret } from "@framework/lib/crypt";
// Module-Registry aus Phase 1
// import { moduleRegistry } from "./module-registry";

// --- Hanko Konfiguration ---
const hankoEnv = validateHankoEnv(process.env.HANKO_API_URL);
if (!hankoEnv.valid) {
  console.warn(`[auth] ${hankoEnv.error}`);
}

const hankoConfig = hankoEnv.valid
  ? createHankoConfig(hankoEnv.url!)
  : undefined;

// --- Server starten ---
const server = defineServer({
  port: Number(process.env.PORT) || 3000,
  appName: "Super App",
  ...(hankoConfig ?? { authType: "local" }),

  customHonoApps: [
    // Auth Config (oeffentlich)
    {
      baseRoute: "",
      app: (app: any) => {
        defineAuthConfigRoutes(app, "/api/v1", {
          authType: hankoConfig ? "hanko" : "local",
          hankoApiUrl: hankoConfig?.hankoApiUrl,
          invitationCodeRequired: hankoConfig?.invitationCodeRequired ?? true,
        });
      },
    },
    // Invitation Codes (Admin)
    {
      baseRoute: "",
      app: (app: any) => {
        defineInvitationCodeRoutes(
          app,
          "/api/v1",
          createInvitationCodeDbDeps()
        );
      },
    },
    // Settings (Admin)
    {
      baseRoute: "",
      app: (app: any) => {
        const settingsDeps: SettingsRouteDeps = {
          getSecret: (name, tenantId) => getSecret(name, tenantId),
          setSecret: (data) => setSecret(data).then((s) => ({
            id: s.id,
            name: s.name,
            createdAt: s.createdAt,
          })),
          getSecrets: (tenantId) => getSecrets(tenantId).then((secrets) =>
            secrets.map((s) => ({ id: s.id, name: s.name, createdAt: s.createdAt }))
          ),
          deleteSecret: (name, tenantId) => deleteSecret(name, tenantId),
        };
        defineSettingsRoutes(app, "/api/v1", settingsDeps);
      },
    },
    // Module Routes kommen hier aus dem Module-Registry (Phase 1)
    // ...moduleRegistry.getMergedRoutes(),
  ],
});
```

### Step 7.5: Tests ausfuehren

```bash
cd template/backend && bun test src/auth/auth-config.routes.test.ts
```

### Step 7.6: Alle Auth-Tests ausfuehren

```bash
# Backend Auth Tests
cd template/backend && bun test src/auth/

# Backend Settings Tests
cd template/backend && bun test src/settings/

# Frontend Auth Tests
cd template/frontend && bun test src/auth/ src/composables/
```

### Commit

```
feat(auth): integrate auth config routes, settings, and invitation codes into defineServer
```

---

## Zusammenfassung der Deliverables

| # | Deliverable | Pfad | Tests |
|---|-------------|------|-------|
| 1 | Hanko Passkey Configuration | `template/backend/src/auth/hanko-config.ts` | `template/backend/src/auth/hanko-config.test.ts` |
| 2 | Invitation Code System | `template/backend/src/auth/invitation-codes.ts` | `template/backend/src/auth/invitation-codes.test.ts` |
| 2b | Invitation Code Routes | `template/backend/src/auth/invitation-codes.routes.ts` | `template/backend/src/auth/invitation-codes.routes.test.ts` |
| 2c | Invitation Code DB | `template/backend/src/auth/invitation-codes.db.ts` | (via Route-Tests) |
| 3 | Permission Groups Setup | `template/backend/src/auth/permission-setup.ts` | `template/backend/src/auth/permission-setup.test.ts` |
| 3b | Permission Seed Script | `template/backend/src/auth/seed-permissions.ts` | (via permission-setup Tests) |
| 4 | Settings Schema | `template/backend/src/settings/settings-schema.ts` | `template/backend/src/settings/settings-schema.test.ts` |
| 4b | Settings Routes | `template/backend/src/settings/settings.routes.ts` | `template/backend/src/settings/settings.routes.test.ts` |
| 4c | Settings UI | `template/frontend/src/views/settings/index.vue` | (manuell) |
| 5 | Auth Middleware | `template/backend/src/auth/module-auth-middleware.ts` | `template/backend/src/auth/module-auth-middleware.test.ts` |
| 6 | Frontend Auth Flow | `template/frontend/src/views/auth/Login.vue` | (manuell) |
| 6b | Module Visibility | `template/frontend/src/auth/module-visibility.ts` | `template/frontend/src/auth/module-visibility.test.ts` |
| 6c | Passkey Composable | `template/frontend/src/composables/usePasskey.ts` | `template/frontend/src/composables/usePasskey.test.ts` |
| 6d | Auth Store | `template/frontend/src/stores/authStore.ts` | (via module-visibility Tests) |
| 7 | Auth Config Route | `template/backend/src/auth/auth-config.routes.ts` | `template/backend/src/auth/auth-config.routes.test.ts` |
| 7b | Auth Barrel Export | `template/backend/src/auth/index.ts` | (via alle Tests) |

## Abhaengigkeiten zwischen Tasks

```
Task 1 (Hanko Config)
  └── Task 7 (Integration) — braucht Hanko Config

Task 2 (Invitation Codes)
  └── Task 7 (Integration) — braucht Routes + DB-Deps

Task 3 (Permission Groups)
  └── Task 5 (Auth Middleware) — braucht Permission-System
  └── Task 6 (Frontend Auth) — braucht Permissions fuer Visibility

Task 4 (Settings UI)
  └── Task 7 (Integration) — braucht Settings Routes

Task 5 (Auth Middleware) — braucht Task 3
  └── Task 7 (Integration) — braucht Middleware

Task 6 (Frontend Auth) — braucht Task 3
  └── Task 7 (Integration) — braucht Router + Store
```

**Parallelisierbar:** Task 1 + Task 2 + Task 4 koennen parallel bearbeitet werden (keine gegenseitigen Abhaengigkeiten). Task 3 ist Voraussetzung fuer Task 5 und Task 6.

## Verifikation nach Abschluss

```bash
# 1. Alle Backend Auth Tests
cd /Users/toby/Documents/github/projekte/super-app/template/backend && bun test src/auth/

# 2. Alle Backend Settings Tests
cd /Users/toby/Documents/github/projekte/super-app/template/backend && bun test src/settings/

# 3. Alle Frontend Auth Tests
cd /Users/toby/Documents/github/projekte/super-app/template/frontend && bun test src/auth/ src/composables/

# 4. Import-Check: Auth-Exports korrekt
cd /Users/toby/Documents/github/projekte/super-app/template/backend && bun -e "import { createHankoConfig, createInvitationCodeService, createPermissionSetup, createModuleAuthMiddleware } from './src/auth'; console.log('Auth imports OK')"

# 5. Manueller Test: Auth-Config-Route antwortet
curl -s http://localhost:3000/api/v1/auth/config | jq .

# 6. Manueller Test: Unauthenticated Request → 401
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/mail/inbox
# Erwartung: 401

# 7. Manueller Test: Settings Schema abrufbar (mit Admin-Token)
curl -s -H "Authorization: Bearer <admin-token>" http://localhost:3000/api/v1/tenant/<tenantId>/settings/schema | jq .
```
