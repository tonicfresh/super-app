import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  createAgentSessionService,
  type AgentSessionServiceDeps,
} from "../src/services/agent-session.service";
import {
  createAuditLogService,
  type AuditLogServiceDeps,
} from "../src/services/audit-log.service";

// --- Agent Session Service Tests ---

describe("AgentSessionService", () => {
  let insertMock: ReturnType<typeof mock>;
  let updateMock: ReturnType<typeof mock>;
  let selectMock: ReturnType<typeof mock>;
  let broadcastMock: ReturnType<typeof mock>;
  let service: ReturnType<typeof createAgentSessionService>;

  beforeEach(() => {
    insertMock = mock(async (data: any) => ({ id: data.id }));
    updateMock = mock(async (_id: string, _data: any) => {});
    selectMock = mock(async (_filter: any) => []);
    broadcastMock = mock((_event: string, _data: any) => {});
    service = createAgentSessionService({
      insert: insertMock,
      update: updateMock,
      select: selectMock,
      broadcast: broadcastMock,
    });
  });

  describe("startSession()", () => {
    it("should insert a new session with status 'running'", async () => {
      const session = await service.startSession({
        agentType: "main",
        moduleName: "mail",
        userId: "user_123",
        channel: "telegram",
      });

      expect(insertMock).toHaveBeenCalledTimes(1);
      const insertArg = insertMock.mock.calls[0][0];
      expect(insertArg.agentType).toBe("main");
      expect(insertArg.moduleName).toBe("mail");
      expect(insertArg.userId).toBe("user_123");
      expect(insertArg.channel).toBe("telegram");
      expect(insertArg.status).toBe("running");
      expect(insertArg.steps).toBe(0);
      expect(insertArg.tokensUsed).toBe(0);
      expect(insertArg.costUsd).toBe(0);
      expect(insertArg.toolCalls).toEqual([]);
      expect(insertArg.id).toBeDefined();
      expect(session.id).toBe(insertArg.id);
    });

    it("should broadcast 'agent:started' via WebSocket", async () => {
      await service.startSession({
        agentType: "sub",
        moduleName: "todos",
        userId: "user_456",
        channel: "pwa",
      });

      expect(broadcastMock).toHaveBeenCalledTimes(1);
      expect(broadcastMock.mock.calls[0][0]).toBe("agent:started");
    });
  });

  describe("recordStep()", () => {
    it("should update session with incremented step count and tool call", async () => {
      await service.recordStep("session_1", {
        tool: "sendMail",
        args: { userId: "user_123" },
        result: "success",
        duration: 350,
      });

      expect(updateMock).toHaveBeenCalledTimes(1);
      const [id, data] = updateMock.mock.calls[0];
      expect(id).toBe("session_1");
      expect(data.toolCall.tool).toBe("sendMail");
      expect(data.toolCall.duration).toBe(350);
    });

    it("should broadcast 'agent:step' via WebSocket", async () => {
      await service.recordStep("session_1", {
        tool: "sendMail",
        args: {},
        result: "success",
        duration: 100,
      });

      expect(broadcastMock).toHaveBeenCalledTimes(1);
      expect(broadcastMock.mock.calls[0][0]).toBe("agent:step");
    });
  });

  describe("completeSession()", () => {
    it("should update session status to 'completed' with final stats", async () => {
      await service.completeSession("session_1", {
        status: "completed",
        tokensUsed: 1500,
        costUsd: 0.012,
      });

      expect(updateMock).toHaveBeenCalledTimes(1);
      const [id, data] = updateMock.mock.calls[0];
      expect(id).toBe("session_1");
      expect(data.status).toBe("completed");
      expect(data.tokensUsed).toBe(1500);
      expect(data.costUsd).toBe(0.012);
      expect(data.completedAt).toBeInstanceOf(Date);
    });

    it("should broadcast 'agent:completed' via WebSocket", async () => {
      await service.completeSession("session_1", {
        status: "completed",
        tokensUsed: 500,
        costUsd: 0.005,
      });

      expect(broadcastMock).toHaveBeenCalledTimes(1);
      expect(broadcastMock.mock.calls[0][0]).toBe("agent:completed");
    });

    it("should support 'failed' and 'timeout' status", async () => {
      await service.completeSession("session_1", {
        status: "failed",
        tokensUsed: 200,
        costUsd: 0.002,
      });

      const data = updateMock.mock.calls[0][1];
      expect(data.status).toBe("failed");
    });
  });

  describe("getRunningAgents()", () => {
    it("should return only sessions with status 'running'", async () => {
      selectMock = mock(async () => [
        { id: "s1", status: "running", agentType: "main" },
        { id: "s2", status: "running", agentType: "sub" },
      ]);
      service = createAgentSessionService({
        insert: insertMock,
        update: updateMock,
        select: selectMock,
        broadcast: broadcastMock,
      });

      const running = await service.getRunningAgents();
      expect(selectMock).toHaveBeenCalledWith({ status: "running" });
      expect(running).toHaveLength(2);
    });
  });

  describe("getRecentSessions()", () => {
    it("should accept limit and offset parameters", async () => {
      await service.getRecentSessions({ limit: 20, offset: 0 });
      expect(selectMock).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    });

    it("should default to limit 50 and offset 0", async () => {
      await service.getRecentSessions();
      expect(selectMock).toHaveBeenCalledWith({ limit: 50, offset: 0 });
    });
  });
});

// --- Audit Log Service Tests ---

describe("AuditLogService", () => {
  let insertMock: ReturnType<typeof mock>;
  let selectMock: ReturnType<typeof mock>;
  let service: ReturnType<typeof createAuditLogService>;

  beforeEach(() => {
    insertMock = mock(async (_data: any) => {});
    selectMock = mock(async (_filter: any) => []);
    service = createAuditLogService({
      insert: insertMock,
      select: selectMock,
    });
  });

  describe("log()", () => {
    it("should insert an audit entry with all required fields", async () => {
      await service.log({
        userId: "user_123",
        agentId: "session_1",
        action: "mail:send",
        resource: "mail",
        result: "granted",
      });

      expect(insertMock).toHaveBeenCalledTimes(1);
      const data = insertMock.mock.calls[0][0];
      expect(data.userId).toBe("user_123");
      expect(data.agentId).toBe("session_1");
      expect(data.action).toBe("mail:send");
      expect(data.resource).toBe("mail");
      expect(data.result).toBe("granted");
      expect(data.id).toBeDefined();
      expect(data.timestamp).toBeInstanceOf(Date);
    });

    it("should support optional metadata", async () => {
      await service.log({
        userId: "user_123",
        agentId: "session_1",
        action: "mail:delete",
        resource: "mail",
        result: "denied",
        metadata: { reason: "No permission", ip: "192.168.1.1" },
      });

      const data = insertMock.mock.calls[0][0];
      expect(data.metadata.reason).toBe("No permission");
    });

    it("should default metadata to empty object", async () => {
      await service.log({
        userId: "user_123",
        agentId: "session_1",
        action: "todos:write",
        resource: "todos",
        result: "granted",
      });

      const data = insertMock.mock.calls[0][0];
      expect(data.metadata).toEqual({});
    });
  });

  describe("query()", () => {
    it("should filter by userId", async () => {
      await service.query({ userId: "user_123" });
      expect(selectMock).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_123" })
      );
    });

    it("should filter by action", async () => {
      await service.query({ action: "mail:send" });
      expect(selectMock).toHaveBeenCalledWith(
        expect.objectContaining({ action: "mail:send" })
      );
    });

    it("should filter by result", async () => {
      await service.query({ result: "denied" });
      expect(selectMock).toHaveBeenCalledWith(
        expect.objectContaining({ result: "denied" })
      );
    });

    it("should filter by time range", async () => {
      const from = new Date("2026-04-01T00:00:00Z");
      const to = new Date("2026-04-02T23:59:59Z");
      await service.query({ from, to });
      expect(selectMock).toHaveBeenCalledWith(
        expect.objectContaining({ from, to })
      );
    });

    it("should support pagination", async () => {
      await service.query({ limit: 25, offset: 50 });
      expect(selectMock).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25, offset: 50 })
      );
    });

    it("should default to limit 100 and offset 0", async () => {
      await service.query({});
      expect(selectMock).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100, offset: 0 })
      );
    });
  });
});
