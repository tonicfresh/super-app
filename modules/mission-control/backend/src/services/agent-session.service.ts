import type { AgentType, AgentChannel, AgentStatus } from "@super-app/shared";

// --- Typen ---

export interface ToolCallRecord {
  tool: string;
  args: Record<string, unknown>;
  result: "success" | "error";
  errorCode?: string;
  duration: number;
}

export interface StartSessionInput {
  agentType: AgentType;
  moduleName: string;
  userId: string;
  channel: AgentChannel;
}

export interface CompleteSessionInput {
  status: AgentStatus;
  tokensUsed: number;
  costUsd: number;
}

// --- Dependency Injection ---

export interface AgentSessionServiceDeps {
  /** Insert in mc_agent_sessions */
  insert: (data: Record<string, unknown>) => Promise<{ id: string }>;
  /** Update mc_agent_sessions by ID */
  update: (id: string, data: Record<string, unknown>) => Promise<void>;
  /** Select from mc_agent_sessions mit Filter */
  select: (filter: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
  /** WebSocket-Broadcast an alle verbundenen Clients */
  broadcast: (event: string, data: unknown) => void;
}

/**
 * Erstellt den Agent Session Service.
 * Verwaltet den Lebenszyklus von Agent-Sessions.
 */
export function createAgentSessionService(deps: AgentSessionServiceDeps) {
  return {
    /**
     * Startet eine neue Agent-Session.
     * Wird aufgerufen wenn ein Agent (main/sub/dynamic) gestartet wird.
     */
    async startSession(input: StartSessionInput) {
      const id = crypto.randomUUID();
      const sessionData = {
        id,
        agentType: input.agentType,
        moduleName: input.moduleName,
        userId: input.userId,
        channel: input.channel,
        status: "running" as const,
        startedAt: new Date(),
        completedAt: null,
        steps: 0,
        tokensUsed: 0,
        costUsd: 0,
        toolCalls: [],
      };

      await deps.insert(sessionData);
      deps.broadcast("agent:started", { id, ...input });

      return { id };
    },

    /**
     * Protokolliert einen einzelnen Tool-Call innerhalb einer Session.
     * Wird vom onStepFinish Callback des AI SDK aufgerufen.
     */
    async recordStep(sessionId: string, toolCall: ToolCallRecord) {
      await deps.update(sessionId, { toolCall });
      deps.broadcast("agent:step", { sessionId, toolCall });
    },

    /**
     * Schliesst eine Agent-Session ab (completed/failed/timeout).
     */
    async completeSession(sessionId: string, input: CompleteSessionInput) {
      const updateData = {
        status: input.status,
        tokensUsed: input.tokensUsed,
        costUsd: input.costUsd,
        completedAt: new Date(),
      };

      await deps.update(sessionId, updateData);
      deps.broadcast("agent:completed", { sessionId, ...updateData });
    },

    /**
     * Gibt alle aktuell laufenden Agent-Sessions zurueck.
     */
    async getRunningAgents() {
      return deps.select({ status: "running" });
    },

    /**
     * Gibt die neuesten Sessions zurueck (paginiert).
     */
    async getRecentSessions(opts?: { limit?: number; offset?: number }) {
      const limit = opts?.limit ?? 50;
      const offset = opts?.offset ?? 0;
      return deps.select({ limit, offset });
    },
  };
}
