import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import {
  logAICost,
  createCostTracker,
  type CostTrackerDeps,
} from "./cost-tracking";
import type { AICostEntry } from "./types";

describe("Cost Tracking", () => {
  const sampleEntry: AICostEntry = {
    project: "mail",
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    tokensInput: 1500,
    tokensOutput: 300,
    costUsd: 0.012,
  };

  describe("createCostTracker", () => {
    it("should call the internal logger", async () => {
      const internalLog = mock(async (_entry: AICostEntry) => {});
      const tracker = createCostTracker({
        logInternal: internalLog,
      });

      await tracker.log(sampleEntry);

      expect(internalLog).toHaveBeenCalledTimes(1);
      expect(internalLog).toHaveBeenCalledWith(sampleEntry);
    });

    it("should call the external logger if configured", async () => {
      const internalLog = mock(async (_entry: AICostEntry) => {});
      const externalLog = mock(async (_entry: AICostEntry) => {});
      const tracker = createCostTracker({
        logInternal: internalLog,
        logExternal: externalLog,
      });

      await tracker.log(sampleEntry);

      expect(internalLog).toHaveBeenCalledTimes(1);
      expect(externalLog).toHaveBeenCalledTimes(1);
    });

    it("should not throw if internal logger fails", async () => {
      const internalLog = mock(async () => {
        throw new Error("DB connection lost");
      });
      const tracker = createCostTracker({ logInternal: internalLog });

      // Darf keinen Fehler werfen — fire-and-forget
      await expect(tracker.log(sampleEntry)).resolves.toBeUndefined();
    });

    it("should not throw if external logger fails", async () => {
      const internalLog = mock(async (_entry: AICostEntry) => {});
      const externalLog = mock(async () => {
        throw new Error("External API down");
      });
      const tracker = createCostTracker({
        logInternal: internalLog,
        logExternal: externalLog,
      });

      await expect(tracker.log(sampleEntry)).resolves.toBeUndefined();
    });

    it("should validate entry fields are numbers >= 0", async () => {
      const internalLog = mock(async (_entry: AICostEntry) => {});
      const tracker = createCostTracker({ logInternal: internalLog });

      const invalidEntry: AICostEntry = {
        project: "mail",
        provider: "anthropic",
        model: "claude-sonnet-4-5",
        tokensInput: -1,
        tokensOutput: 300,
        costUsd: 0.01,
      };

      await tracker.log(invalidEntry);
      // Ungueltige Eintraege werden geloggt aber nicht geworfen
      expect(internalLog).toHaveBeenCalledTimes(0);
    });

    it("should validate project and provider are non-empty strings", async () => {
      const internalLog = mock(async (_entry: AICostEntry) => {});
      const tracker = createCostTracker({ logInternal: internalLog });

      const invalidEntry: AICostEntry = {
        project: "",
        provider: "anthropic",
        model: "claude-sonnet-4-5",
        tokensInput: 100,
        tokensOutput: 50,
        costUsd: 0.01,
      };

      await tracker.log(invalidEntry);
      expect(internalLog).toHaveBeenCalledTimes(0);
    });
  });

  describe("logAICost (convenience function)", () => {
    it("should be a fire-and-forget function that never throws", async () => {
      // logAICost ist die globale Convenience-Funktion
      // Sie darf NIEMALS den aufrufenden Code blockieren oder einen Fehler werfen
      await expect(logAICost(sampleEntry)).resolves.toBeUndefined();
    });
  });
});
