import { describe, it, expect, mock } from "bun:test";
import {
  checkGuardrail,
  createGuardrailChecker,
  type GuardrailCheckResult,
  type GuardrailCheckerDeps,
} from "./guardrails";
import type { GuardrailConfig } from "./types";

describe("Guardrail Checker", () => {
  describe("createGuardrailChecker", () => {
    it("should return allowed when no guardrail is configured", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => undefined,
        getUsageCount: async () => ({ daily: 0, hourly: 0 }),
      });

      const result = await checker.check("mail:send");
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it("should return allowed when under daily limit", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => ({ dailyLimit: 50 }),
        getUsageCount: async () => ({ daily: 10, hourly: 5 }),
      });

      const result = await checker.check("mail:send");
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(10);
      expect(result.max).toBe(50);
      expect(result.remaining).toBe(40);
    });

    it("should return not allowed when daily limit reached", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => ({ dailyLimit: 50 }),
        getUsageCount: async () => ({ daily: 50, hourly: 10 }),
      });

      const result = await checker.check("mail:send");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("DAILY_LIMIT_REACHED");
      expect(result.used).toBe(50);
      expect(result.max).toBe(50);
    });

    it("should return not allowed when hourly limit reached", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => ({ hourlyLimit: 10 }),
        getUsageCount: async () => ({ daily: 20, hourly: 10 }),
      });

      const result = await checker.check("mail:send");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("HOURLY_LIMIT_REACHED");
    });

    it("should check daily limit before hourly limit", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => ({ dailyLimit: 5, hourlyLimit: 10 }),
        getUsageCount: async () => ({ daily: 5, hourly: 10 }),
      });

      const result = await checker.check("mail:send");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("DAILY_LIMIT_REACHED");
    });

    it("should flag requiresApproval when configured", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => ({ requiresApproval: true, dailyLimit: 100 }),
        getUsageCount: async () => ({ daily: 5, hourly: 2 }),
      });

      const result = await checker.check("mail:delete");
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(true);
    });

    it("should reject outside allowed time window", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => ({
          allowedTimeWindow: { start: "08:00", end: "18:00" },
        }),
        getUsageCount: async () => ({ daily: 0, hourly: 0 }),
        getCurrentTime: () => new Date("2026-04-02T20:30:00"), // 20:30 — ausserhalb
      });

      const result = await checker.check("mail:send");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("OUTSIDE_TIME_WINDOW");
    });

    it("should allow inside allowed time window", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => ({
          allowedTimeWindow: { start: "08:00", end: "18:00" },
        }),
        getUsageCount: async () => ({ daily: 0, hourly: 0 }),
        getCurrentTime: () => new Date("2026-04-02T12:00:00"), // 12:00 — innerhalb
      });

      const result = await checker.check("mail:send");
      expect(result.allowed).toBe(true);
    });

    it("should handle combined guardrails correctly", async () => {
      const checker = createGuardrailChecker({
        getConfig: async () => ({
          dailyLimit: 50,
          hourlyLimit: 10,
          requiresApproval: true,
          allowedTimeWindow: { start: "08:00", end: "22:00" },
        }),
        getUsageCount: async () => ({ daily: 5, hourly: 2 }),
        getCurrentTime: () => new Date("2026-04-02T14:00:00"),
      });

      const result = await checker.check("mail:send");
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(true);
      expect(result.remaining).toBe(8); // min(dailyLimit - daily, hourlyLimit - hourly) = min(45, 8)
    });
  });
});
