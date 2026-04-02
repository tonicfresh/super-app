import {
  pgTableCreator,
  text,
  timestamp,
  integer,
  real,
  jsonb,
} from "drizzle-orm/pg-core";

// ============================================================
// Mission Control — Datenbank-Schema
// Jedes Modul erstellt seinen eigenen Table Creator mit Prefix.
// Framework: pgBaseTable (base_*), App: pgAppTable (app_*),
// Module: eigener Creator (mc_*, todos_*, etc.)
// ============================================================

const mcTable = pgTableCreator((name) => `mc_${name}`);

// --- Agent Sessions ---

/**
 * Jede AI-Agent-Ausfuehrung wird hier protokolliert.
 * Wird vom main-agent.ts onStepFinish Callback befuellt.
 */
export const mcAgentSessions = mcTable("agent_sessions", {
  /** Eindeutige Session-ID (UUID) */
  id: text("id").primaryKey(),
  /** Agent-Typ: main, sub, oder dynamic */
  agentType: text("agent_type").notNull(),
  /** Name des ausfuehrenden Moduls (z.B. "mail", "todos") */
  moduleName: text("module_name").notNull(),
  /** User-ID des anfragenden Nutzers */
  userId: text("user_id").notNull(),
  /** Kommunikationskanal */
  channel: text("channel").notNull(),
  /** Aktueller Status der Session */
  status: text("status").notNull().default("running"),
  /** Zeitpunkt des Starts */
  startedAt: timestamp("started_at").notNull().defaultNow(),
  /** Zeitpunkt der Fertigstellung (null = noch laufend) */
  completedAt: timestamp("completed_at"),
  /** Anzahl der bisher ausgefuehrten Steps */
  steps: integer("steps").notNull().default(0),
  /** Verbrauchte Tokens (Input + Output) */
  tokensUsed: integer("tokens_used").notNull().default(0),
  /** Kosten in USD */
  costUsd: real("cost_usd").notNull().default(0),
  /** Array der Tool-Aufrufe mit Details */
  toolCalls: jsonb("tool_calls").notNull().default([]),
});

// --- Audit Log ---

/**
 * Protokolliert jeden Permission-Check (granted/denied/approval).
 * Wichtig fuer Compliance und Debugging.
 */
export const mcAuditLog = mcTable("audit_log", {
  /** Eindeutige Log-ID (UUID) */
  id: text("id").primaryKey(),
  /** Zeitpunkt des Events */
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  /** User-ID des betroffenen Nutzers */
  userId: text("user_id").notNull(),
  /** Agent-Session-ID (Referenz auf mc_agent_sessions) */
  agentId: text("agent_id").notNull(),
  /** Ausgefuehrte Aktion (z.B. "mail:send", "todos:delete") */
  action: text("action").notNull(),
  /** Betroffene Ressource (z.B. Modul- oder Entity-Name) */
  resource: text("resource").notNull(),
  /** Ergebnis des Permission-Checks */
  result: text("result").notNull(),
  /** Zusaetzliche Metadaten (z.B. Grund der Ablehnung, IP, etc.) */
  metadata: jsonb("metadata").notNull().default({}),
});

// --- AI Costs ---

/**
 * KI-Kosten pro API-Call.
 * Grundtabelle existiert seit Phase 4 — hier re-definiert fuer den Schema-Merge.
 */
export const mcAiCosts = mcTable("ai_costs", {
  /** Eindeutige ID (UUID) */
  id: text("id").primaryKey(),
  /** Projektname / Modulname */
  project: text("project").notNull(),
  /** AI-Provider (z.B. "anthropic", "mistral", "openrouter") */
  provider: text("provider").notNull(),
  /** Modellname (z.B. "claude-sonnet-4-5") */
  model: text("model").notNull(),
  /** Eingabe-Tokens */
  tokensInput: integer("tokens_input").notNull(),
  /** Ausgabe-Tokens */
  tokensOutput: integer("tokens_output").notNull(),
  /** Kosten in USD */
  costUsd: real("cost_usd").notNull(),
  /** Zeitpunkt des Eintrags */
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Schema-Export fuer plugin.ts ---

export const mcSchema = {
  mcAgentSessions,
  mcAuditLog,
  mcAiCosts,
};
