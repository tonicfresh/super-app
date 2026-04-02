// ============================================================
// @super-app/shared — Barrel Export
// ============================================================

// --- Typen ---
export type {
  ToolResult,
  ToolErrorCode,
  ModuleConfig,
  GuardrailConfig,
  ModuleDefinition,
  RouteRecord,
  ModulePlugin,
  AICostEntry,
  AgentType,
  AgentChannel,
  AgentStatus,
} from "./types";

// --- Cost Tracking ---
export {
  createCostTracker,
  initGlobalCostTracker,
  logAICost,
  createExternalCostLogger,
  type CostTrackerDeps,
} from "./cost-tracking";

// --- Guardrails ---
export {
  createGuardrailChecker,
  initGlobalGuardrailChecker,
  checkGuardrail,
  type GuardrailCheckResult,
  type GuardrailCheckerDeps,
} from "./guardrails";
