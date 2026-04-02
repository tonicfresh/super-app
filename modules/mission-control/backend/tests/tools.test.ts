import { describe, it, expect, mock } from "bun:test";
import { createMcTools } from "../src/tools";

describe("Mission Control AI Tools", () => {
  // Default-Deps: Permission erlaubt
  const allowedDeps = {
    checkScope: mock(async () => true),
  };
  const mcTools = createMcTools(allowedDeps);

  it("should export getAgentStatus tool", () => {
    expect(mcTools).toHaveProperty("getAgentStatus");
  });

  it("should export queryAuditLog tool", () => {
    expect(mcTools).toHaveProperty("queryAuditLog");
  });

  it("should export getCostSummary tool", () => {
    expect(mcTools).toHaveProperty("getCostSummary");
  });

  it("should export getSystemHealth tool", () => {
    expect(mcTools).toHaveProperty("getSystemHealth");
  });

  it("all tools should have description property", () => {
    for (const [name, toolDef] of Object.entries(mcTools)) {
      expect((toolDef as any).description).toBeDefined();
      expect(typeof (toolDef as any).description).toBe("string");
    }
  });

  describe("Permission checks (mc:read)", () => {
    it("should return FORBIDDEN when mc:read is denied", async () => {
      const deniedTools = createMcTools({
        checkScope: mock(async () => false),
      });

      const result = await (deniedTools.getAgentStatus as any).execute({});
      expect(result.success).toBe(false);
      expect(result.code).toBe("FORBIDDEN");
    });

    it("should succeed when mc:read is granted", async () => {
      const result = await (mcTools.getAgentStatus as any).execute({});
      expect(result.success).toBe(true);
    });

    it("should check mc:read for all tools", async () => {
      const scopeCheck = mock(async () => false);
      const deniedTools = createMcTools({ checkScope: scopeCheck });

      for (const [name, toolDef] of Object.entries(deniedTools)) {
        const result = await (toolDef as any).execute({});
        expect(result.code).toBe("FORBIDDEN");
      }

      // checkScope wurde fuer jedes Tool aufgerufen
      expect(scopeCheck).toHaveBeenCalledTimes(Object.keys(deniedTools).length);
    });
  });
});
