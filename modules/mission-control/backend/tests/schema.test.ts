import { describe, it, expect } from "bun:test";
import {
  mcAgentSessions,
  mcAuditLog,
  mcAiCosts,
} from "../src/db/schema";

describe("Mission Control Schema", () => {
  describe("mc_agent_sessions", () => {
    it("should be a pgTable named 'mc_agent_sessions'", () => {
      // Drizzle pgTable-Objekte haben einen internen Tabellennamen
      expect(mcAgentSessions[Symbol.for("drizzle:Name")]).toBe("mc_agent_sessions");
    });

    it("should have required columns", () => {
      const columns = Object.keys(mcAgentSessions);
      expect(columns).toContain("id");
      expect(columns).toContain("agentType");
      expect(columns).toContain("moduleName");
      expect(columns).toContain("userId");
      expect(columns).toContain("channel");
      expect(columns).toContain("status");
      expect(columns).toContain("startedAt");
      expect(columns).toContain("completedAt");
      expect(columns).toContain("steps");
      expect(columns).toContain("tokensUsed");
      expect(columns).toContain("costUsd");
      expect(columns).toContain("toolCalls");
    });
  });

  describe("mc_audit_log", () => {
    it("should be a pgTable named 'mc_audit_log'", () => {
      expect(mcAuditLog[Symbol.for("drizzle:Name")]).toBe("mc_audit_log");
    });

    it("should have required columns", () => {
      const columns = Object.keys(mcAuditLog);
      expect(columns).toContain("id");
      expect(columns).toContain("timestamp");
      expect(columns).toContain("userId");
      expect(columns).toContain("agentId");
      expect(columns).toContain("action");
      expect(columns).toContain("resource");
      expect(columns).toContain("result");
      expect(columns).toContain("metadata");
    });
  });

  describe("mc_ai_costs", () => {
    it("should be a pgTable named 'mc_ai_costs'", () => {
      expect(mcAiCosts[Symbol.for("drizzle:Name")]).toBe("mc_ai_costs");
    });

    it("should have required columns", () => {
      const columns = Object.keys(mcAiCosts);
      expect(columns).toContain("id");
      expect(columns).toContain("project");
      expect(columns).toContain("provider");
      expect(columns).toContain("model");
      expect(columns).toContain("tokensInput");
      expect(columns).toContain("tokensOutput");
      expect(columns).toContain("costUsd");
      expect(columns).toContain("createdAt");
    });
  });
});
