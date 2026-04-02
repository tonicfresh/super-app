import { describe, it, expect } from "bun:test";
import type {
  ToolResult,
  ToolErrorCode,
  ModuleConfig,
  GuardrailConfig,
  ModuleDefinition,
  RouteRecord,
  ModulePlugin,
} from "./types";

describe("Shared Types", () => {
  describe("ToolResult", () => {
    it("should accept a successful result with data", () => {
      const result: ToolResult = {
        success: true,
        data: { sentTo: "Toby", remaining: 49 },
      };
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.sentTo).toBe("Toby");
      }
    });

    it("should accept a failed result with error code and message", () => {
      const result: ToolResult = {
        success: false,
        code: "FORBIDDEN",
        message: "No permission to send mail",
      };
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("FORBIDDEN");
        expect(result.message).toBeDefined();
      }
    });

    it("should support all ToolErrorCode values", () => {
      const codes: ToolErrorCode[] = [
        "FORBIDDEN",
        "LIMIT_REACHED",
        "NOT_FOUND",
        "VALIDATION_ERROR",
        "UNAVAILABLE",
      ];
      codes.forEach((code) => {
        const result: ToolResult = { success: false, code, message: `Error: ${code}` };
        expect(result.success).toBe(false);
      });
    });
  });

  describe("ModuleConfig", () => {
    it("should accept a complete module config with base permissions", () => {
      const config: ModuleConfig = {
        name: "mail",
        version: "1.0.0",
        permissions: {
          base: {
            read: "mail:read",
            write: "mail:write",
            update: "mail:update",
            delete: "mail:delete",
          },
        },
      };
      expect(config.name).toBe("mail");
      expect(config.permissions.base.read).toBe("mail:read");
    });

    it("should accept custom permissions", () => {
      const config: ModuleConfig = {
        name: "mail",
        version: "1.0.0",
        permissions: {
          base: {
            read: "mail:read",
            write: "mail:write",
            update: "mail:update",
            delete: "mail:delete",
          },
          custom: {
            send: "mail:send",
            settings: "mail:settings",
          },
        },
      };
      expect(config.permissions.custom?.send).toBe("mail:send");
    });

    it("should accept guardrails configuration", () => {
      const config: ModuleConfig = {
        name: "mail",
        version: "1.0.0",
        permissions: {
          base: {
            read: "mail:read",
            write: "mail:write",
            update: "mail:update",
            delete: "mail:delete",
          },
        },
        guardrails: {
          "mail:send": { dailyLimit: 50, requiresApproval: false },
          "mail:delete": { dailyLimit: 20, requiresApproval: true },
        },
      };
      expect(config.guardrails?.["mail:send"]?.dailyLimit).toBe(50);
      expect(config.guardrails?.["mail:delete"]?.requiresApproval).toBe(true);
    });
  });

  describe("GuardrailConfig", () => {
    it("should accept all optional fields", () => {
      const guardrail: GuardrailConfig = {
        dailyLimit: 100,
        hourlyLimit: 20,
        requiresApproval: true,
        allowedTimeWindow: { start: "08:00", end: "18:00" },
      };
      expect(guardrail.dailyLimit).toBe(100);
      expect(guardrail.hourlyLimit).toBe(20);
      expect(guardrail.allowedTimeWindow?.start).toBe("08:00");
    });

    it("should accept an empty guardrail config", () => {
      const guardrail: GuardrailConfig = {};
      expect(guardrail.dailyLimit).toBeUndefined();
    });
  });

  describe("ModuleDefinition", () => {
    it("should accept a complete frontend module definition", () => {
      const def: ModuleDefinition = {
        name: "mail",
        routes: [
          { path: "/mail", component: () => Promise.resolve({}) },
          { path: "/mail/compose", component: () => Promise.resolve({}) },
        ],
        navigation: {
          label: "Mail",
          icon: "i-heroicons-envelope",
          position: "sidebar",
          order: 10,
        },
        permissions: ["mail:read"],
      };
      expect(def.name).toBe("mail");
      expect(def.routes).toHaveLength(2);
      expect(def.navigation.position).toBe("sidebar");
    });

    it("should support all navigation positions", () => {
      const positions: ModuleDefinition["navigation"]["position"][] = [
        "sidebar",
        "topbar",
        "hidden",
      ];
      positions.forEach((pos) => {
        const def: ModuleDefinition = {
          name: "test",
          routes: [],
          navigation: { label: "Test", icon: "test", position: pos, order: 1 },
          permissions: [],
        };
        expect(def.navigation.position).toBe(pos);
      });
    });
  });

  describe("ModulePlugin", () => {
    it("should accept a minimal plugin with only config", () => {
      const plugin: ModulePlugin = {
        config: {
          name: "test",
          version: "0.1.0",
          permissions: {
            base: { read: "test:read", write: "test:write", update: "test:update", delete: "test:delete" },
          },
        },
      };
      expect(plugin.config.name).toBe("test");
      expect(plugin.schema).toBeUndefined();
    });

    it("should accept a full plugin with all exports", () => {
      const plugin: ModulePlugin = {
        config: {
          name: "mail",
          version: "1.0.0",
          permissions: {
            base: { read: "mail:read", write: "mail:write", update: "mail:update", delete: "mail:delete" },
          },
        },
        schema: { mailAccounts: {} as any },
        routes: (() => {}) as any,
        jobs: [],
        tools: { sendMail: {} as any },
      };
      expect(plugin.config.name).toBe("mail");
      expect(plugin.tools?.sendMail).toBeDefined();
    });
  });
});
