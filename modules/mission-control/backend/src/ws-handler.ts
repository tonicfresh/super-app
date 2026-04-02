/**
 * WebSocket-Handler fuer Mission Control Echtzeit-Events.
 * Nutzt das org-scoped WebSocket-System des Frameworks.
 *
 * Events:
 * - agent:started   — Neuer Agent gestartet
 * - agent:step      — Agent hat einen Tool-Call ausgefuehrt
 * - agent:completed — Agent-Session abgeschlossen
 */

export interface McWebSocketDeps {
  /** Framework WebSocket-Broadcast-Funktion (org-scoped) */
  broadcast: (channel: string, event: string, data: unknown) => void;
}

/**
 * Erstellt einen Broadcast-Helper fuer Mission Control Events.
 * Sendet Events an den "mission-control" WebSocket-Channel.
 */
export function createMcBroadcaster(deps: McWebSocketDeps) {
  return (event: string, data: unknown) => {
    deps.broadcast("mission-control", event, data);
  };
}
