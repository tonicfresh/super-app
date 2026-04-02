import { describe, it, expect } from "bun:test";
import { moduleConfig } from "../src/plugin";

describe("Mission Control Security", () => {
  describe("Permissions", () => {
    it("should require mc:read for base read access", () => {
      expect(moduleConfig.permissions.base.read).toBe("mc:read");
    });

    it("should have mc:admin as custom permission", () => {
      expect(moduleConfig.permissions.custom?.admin).toBe("mc:admin");
    });

    it("should define all base CRUD permissions with mc: prefix", () => {
      const { base } = moduleConfig.permissions;
      expect(base.read).toMatch(/^mc:/);
      expect(base.write).toMatch(/^mc:/);
      expect(base.update).toMatch(/^mc:/);
      expect(base.delete).toMatch(/^mc:/);
    });
  });

  describe("Module Config", () => {
    it("should be named 'mission-control'", () => {
      expect(moduleConfig.name).toBe("mission-control");
    });

    it("should have a version", () => {
      expect(moduleConfig.version).toBeDefined();
      expect(moduleConfig.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
