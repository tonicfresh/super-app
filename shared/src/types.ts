// ============================================================
// @super-app/shared — Gemeinsame Typen fuer alle Module
// ============================================================

import type { LanguageModelV3 } from "@ai-sdk/provider";
import type { LanguageModel as AILanguageModel } from "ai";

// --- Language Model Types ---

/**
 * Kanonischer LanguageModel-Typ aus dem AI SDK.
 * Re-Export fuer konsistente Nutzung in der gesamten Codebase.
 */
export type LanguageModel = AILanguageModel;

/**
 * LanguageModel mit garantierten Meta-Properties (provider, modelId).
 * Entspricht LanguageModelV3 — hat immer .provider und .modelId.
 * Nutzen: Typ-sichere Unterscheidung wenn Meta-Zugriff noetig ist.
 */
export type LanguageModelWithMeta = LanguageModelV3;

/**
 * Type Guard: Prueft ob ein Wert ein LanguageModel-Objekt mit
 * provider und modelId Properties ist (nicht z.B. ein String).
 */
export function isLanguageModelWithMeta(
  model: unknown
): model is LanguageModelWithMeta {
  return (
    typeof model === "object" &&
    model !== null &&
    "provider" in model &&
    "modelId" in model
  );
}

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

// ============================================================
// Theme System
// ============================================================

import * as v from "valibot";

/**
 * Farbskala fuer ein Theme.
 * Alle Stufen sind optional ausser 500 (Primaerfarbe).
 */
export interface ThemeColorScale {
  50?: string;
  100?: string;
  200?: string;
  300?: string;
  400?: string;
  500: string;
  600?: string;
  700?: string;
  800?: string;
  900?: string;
}

/** Surface-Tokens: Hintergrundfarben fuer verschiedene Ebenen */
export interface ThemeSurfaceTokens {
  /** Haupthintergrund der App */
  ground: string;
  /** Kartenhintergrund */
  card: string;
  /** Overlay/Modal-Hintergrund */
  overlay: string;
}

/** Border-Tokens */
export interface ThemeBorderTokens {
  /** Standard Border-Radius */
  radius: string;
  /** Grosser Border-Radius (z.B. fuer Cards) */
  radiusLg?: string;
  /** Kleiner Border-Radius (z.B. fuer Badges) */
  radiusSm?: string;
}

/** Font-Tokens */
export interface ThemeFontTokens {
  /** Schrift fuer Ueberschriften */
  headline: string;
  /** Schrift fuer Fliesstext */
  body: string;
  /** Schrift fuer Code/Monospace */
  mono?: string;
}

/** Shadow-Tokens */
export interface ThemeShadowTokens {
  /** Schatten fuer Karten */
  card: string;
  /** Schatten fuer Overlays/Modals */
  overlay?: string;
}

/** Spacing-Tokens */
export interface ThemeSpacingTokens {
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
}

/**
 * Vollstaendige Token-Sammlung eines Themes.
 * Wird vom Theme-Loader in CSS Custom Properties umgewandelt.
 */
export interface ThemeTokens {
  /** Primaerfarbe */
  primary: ThemeColorScale;
  /** Sekundaerfarbe */
  secondary: ThemeColorScale;
  /** Erfolgsfarbe */
  success?: ThemeColorScale;
  /** Warnfarbe */
  warning?: ThemeColorScale;
  /** Fehlerfarbe */
  danger?: ThemeColorScale;
  /** Oberflaechenfarben */
  surface: ThemeSurfaceTokens;
  /** Border-Einstellungen */
  border: ThemeBorderTokens;
  /** Schriften */
  font: ThemeFontTokens;
  /** Schatten */
  shadow: ThemeShadowTokens;
  /** Abstaende */
  spacing?: ThemeSpacingTokens;
}

/**
 * Metadaten eines Themes.
 */
export interface ThemeMeta {
  /** Eindeutige Theme-ID (z.B. "cyberpunk", "default") */
  id: string;
  /** Anzeigename */
  name: string;
  /** Beschreibung */
  description?: string;
  /** Autor */
  author?: string;
  /** Semantic Version */
  version: string;
  /** Bevorzugtes Farbschema */
  colorScheme: "light" | "dark" | "system";
}

/**
 * Vollstaendige Theme-Definition: Meta + Tokens.
 * Dies ist das, was eine theme tokens.ts Datei exportiert.
 */
export interface ThemeDefinition {
  meta: ThemeMeta;
  tokens: ThemeTokens;
}

// --- Valibot Schemas ---

const ThemeColorScaleSchema = v.object({
  50: v.optional(v.string()),
  100: v.optional(v.string()),
  200: v.optional(v.string()),
  300: v.optional(v.string()),
  400: v.optional(v.string()),
  500: v.pipe(v.string(), v.minLength(1)),
  600: v.optional(v.string()),
  700: v.optional(v.string()),
  800: v.optional(v.string()),
  900: v.optional(v.string()),
});

const ThemeSurfaceSchema = v.object({
  ground: v.pipe(v.string(), v.minLength(1)),
  card: v.pipe(v.string(), v.minLength(1)),
  overlay: v.pipe(v.string(), v.minLength(1)),
});

const ThemeBorderSchema = v.object({
  radius: v.pipe(v.string(), v.minLength(1)),
  radiusLg: v.optional(v.string()),
  radiusSm: v.optional(v.string()),
});

const ThemeFontSchema = v.object({
  headline: v.pipe(v.string(), v.minLength(1)),
  body: v.pipe(v.string(), v.minLength(1)),
  mono: v.optional(v.string()),
});

const ThemeShadowSchema = v.object({
  card: v.pipe(v.string(), v.minLength(1)),
  overlay: v.optional(v.string()),
});

const ThemeSpacingSchema = v.object({
  xs: v.optional(v.string()),
  sm: v.optional(v.string()),
  md: v.optional(v.string()),
  lg: v.optional(v.string()),
  xl: v.optional(v.string()),
});

export const ThemeTokensSchema = v.object({
  primary: ThemeColorScaleSchema,
  secondary: ThemeColorScaleSchema,
  success: v.optional(ThemeColorScaleSchema),
  warning: v.optional(ThemeColorScaleSchema),
  danger: v.optional(ThemeColorScaleSchema),
  surface: ThemeSurfaceSchema,
  border: ThemeBorderSchema,
  font: ThemeFontSchema,
  shadow: ThemeShadowSchema,
  spacing: v.optional(ThemeSpacingSchema),
});

const ThemeMetaSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.optional(v.string()),
  author: v.optional(v.string()),
  version: v.pipe(v.string(), v.minLength(1)),
  colorScheme: v.picklist(["light", "dark", "system"]),
});

export const ThemeDefinitionSchema = v.object({
  meta: ThemeMetaSchema,
  tokens: ThemeTokensSchema,
});

// --- Module Plugin Validation Schema ---

/**
 * Valibot-Schema zur Validierung der ModulePlugin-Struktur.
 * Wird vom Module Registry bei der Registrierung verwendet (fail-fast).
 */
export const ModulePluginSchema = v.object({
  config: v.object({
    name: v.pipe(v.string(), v.minLength(1)),
    version: v.pipe(v.string(), v.minLength(1)),
    permissions: v.object({
      base: v.object({
        read: v.string(),
        write: v.string(),
        update: v.string(),
        delete: v.string(),
      }),
      custom: v.optional(v.record(v.string(), v.string())),
    }),
    guardrails: v.optional(v.record(v.string(), v.any())),
  }),
  schema: v.optional(v.record(v.string(), v.unknown())),
  routes: v.optional(
    v.custom<(app: any) => void>((val) => typeof val === "function")
  ),
  jobs: v.optional(
    v.array(v.object({ type: v.string(), handler: v.any() }))
  ),
  tools: v.optional(v.record(v.string(), v.unknown())),
});
