// ============================================================
// @super-app/shared — Gemeinsame Typen fuer alle Module
// ============================================================

// --- Tool System ---

/**
 * Fehlercodes fuer Tool-Antworten.
 * Jedes Tool MUSS einen dieser Codes bei Fehler zurueckgeben.
 */
export type ToolErrorCode =
  | "FORBIDDEN"
  | "LIMIT_REACHED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "UNAVAILABLE";

/**
 * Standardisierte Antwort fuer ALLE AI-Tools.
 * Discriminated Union: success bestimmt die Struktur.
 */
export type ToolResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; code: ToolErrorCode; message: string };

// --- Guardrails ---

/**
 * Konfiguration fuer Tool-Guardrails.
 * Gespeichert in der DB, konfigurierbar ueber Settings UI.
 */
export interface GuardrailConfig {
  /** Maximale Ausfuehrungen pro Tag */
  dailyLimit?: number;
  /** Maximale Ausfuehrungen pro Stunde */
  hourlyLimit?: number;
  /** Erfordert menschliche Bestaetigung */
  requiresApproval?: boolean;
  /** Erlaubtes Zeitfenster (z.B. nur 08:00-18:00) */
  allowedTimeWindow?: { start: string; end: string };
}

// --- Module Backend Contract ---

/**
 * Backend-Konfiguration eines Moduls.
 * Jedes Modul exportiert dies in plugin.ts.
 */
export interface ModuleConfig {
  /** Eindeutiger Modulname (z.B. "mail", "todos") */
  name: string;
  /** Semantic Version */
  version: string;
  /** Berechtigungen des Moduls */
  permissions: {
    /** Standard-CRUD-Berechtigungen */
    base: {
      read: string;
      write: string;
      update: string;
      delete: string;
    };
    /** Modul-spezifische Berechtigungen */
    custom?: Record<string, string>;
  };
  /** Guardrail-Konfiguration pro Aktion */
  guardrails?: Record<string, GuardrailConfig>;
}

// --- Module Frontend Contract ---

/**
 * Einzelner Routeneintrag fuer ein Frontend-Modul.
 */
export interface RouteRecord {
  /** URL-Pfad (z.B. "/mail/compose") */
  path: string;
  /** Lazy-loaded Komponente */
  component: () => Promise<any>;
}

/**
 * Frontend-Definition eines Moduls.
 * Jedes Modul mit UI exportiert dies in module.ts.
 */
export interface ModuleDefinition {
  /** Eindeutiger Modulname — muss mit ModuleConfig.name uebereinstimmen */
  name: string;
  /** Routen des Moduls */
  routes: RouteRecord[];
  /** Navigations-Konfiguration */
  navigation: {
    /** Anzeigename (z.B. "Mail") */
    label: string;
    /** Iconify Icon-Name */
    icon: string;
    /** Position in der Navigation */
    position: "sidebar" | "topbar" | "hidden";
    /** Sortierreihenfolge (niedrig = oben) */
    order: number;
  };
  /** Erforderliche Berechtigungen zum Anzeigen */
  permissions: string[];
}

// --- Module Plugin (Backend-Export-Contract) ---

/**
 * Alles was ein Modul in seiner plugin.ts exportieren muss/kann.
 * Wird vom module-registry.ts verwendet.
 */
export interface ModulePlugin {
  /** Pflicht: Modul-Konfiguration */
  config: ModuleConfig;
  /** Optional: Drizzle Schema-Objekte */
  schema?: Record<string, unknown>;
  /** Optional: Hono Route-Handler */
  routes?: (app: any) => void;
  /** Optional: Job-Handler */
  jobs?: Array<{ type: string; handler: any }>;
  /** Optional: AI-Tools */
  tools?: Record<string, unknown>;
}

// --- Cost Tracking ---

/**
 * Datenstruktur fuer KI-Kostenlogging.
 */
export interface AICostEntry {
  /** Modulname (z.B. "mail", "todos", "main-agent") */
  project: string;
  /** Provider-Name (z.B. "anthropic", "mistral", "openrouter") */
  provider: string;
  /** Modellname (z.B. "claude-sonnet-4-5", "mistral-large") */
  model: string;
  /** Eingabe-Tokens */
  tokensInput: number;
  /** Ausgabe-Tokens */
  tokensOutput: number;
  /** Kosten in USD */
  costUsd: number;
}

// --- Agent Session (fuer Mission Control) ---

/**
 * Agent-Session-Typen fuer Monitoring.
 */
export type AgentType = "main" | "sub" | "dynamic";
export type AgentChannel = "telegram" | "pwa" | "api";
export type AgentStatus =
  | "running"
  | "completed"
  | "failed"
  | "timeout"
  | "awaiting_approval";

// --- Push Notifications ---

/**
 * Push-Notification Payload.
 * Wird von allen Modulen, Agents und dem System verwendet.
 */
export interface PushNotification {
  /** Empfaenger User-ID */
  userId: string;
  /** Titel der Notification */
  title: string;
  /** Inhalt/Body der Notification */
  body: string;
  /** Absender-Modul (z.B. "mail", "todos", "mission-control") */
  module?: string;
  /** Aktion bei Klick auf die Notification */
  action?: PushNotificationAction;
}

/**
 * Aktion die bei Klick auf eine Push Notification ausgefuehrt wird.
 */
export interface PushNotificationAction {
  /** Art der Aktion */
  type: "approval" | "navigate" | "dismiss";
  /** Deep-Link URL in der PWA (z.B. "/mail/inbox") */
  url?: string;
  /** Agent-Session-ID fuer Approval-Aktionen */
  agentSessionId?: string;
}

/**
 * Web Push Subscription (vom Browser empfangen).
 * Entspricht der PushSubscription Web API.
 */
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
