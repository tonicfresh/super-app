import type { GuardrailConfig } from "./types";

// --- Ergebnis-Typ ---

export type GuardrailCheckResult = {
  /** Ob die Aktion erlaubt ist */
  allowed: boolean;
  /** Ob menschliche Bestaetigung noetig ist */
  requiresApproval: boolean;
  /** Grund bei Ablehnung */
  reason?:
    | "DAILY_LIMIT_REACHED"
    | "HOURLY_LIMIT_REACHED"
    | "OUTSIDE_TIME_WINDOW";
  /** Aktuelle Nutzung (bezogen auf den limitierenden Faktor) */
  used?: number;
  /** Maximale Nutzung (bezogen auf den limitierenden Faktor) */
  max?: number;
  /** Verbleibende Nutzung */
  remaining?: number;
};

// --- Dependency Injection ---

export interface GuardrailCheckerDeps {
  /** Laedt die Guardrail-Config fuer eine Aktion aus der DB */
  getConfig: (action: string) => Promise<GuardrailConfig | undefined>;
  /** Laedt die aktuelle Nutzungsanzahl (daily/hourly) aus der DB */
  getUsageCount: (action: string) => Promise<{ daily: number; hourly: number }>;
  /** Optionaler Zeitgeber fuer Testbarkeit */
  getCurrentTime?: () => Date;
}

/**
 * Parst einen Zeitstring "HH:MM" in Minuten seit Mitternacht.
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Prueft ob die aktuelle Zeit innerhalb des erlaubten Fensters liegt.
 */
function isWithinTimeWindow(
  now: Date,
  window: { start: string; end: string }
): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(window.start);
  const endMinutes = parseTimeToMinutes(window.end);

  // Normaler Fall: start < end (z.B. 08:00-18:00)
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Ueber Mitternacht: start > end (z.B. 22:00-06:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

/**
 * Erstellt einen Guardrail-Checker mit injizierten Abhaengigkeiten.
 */
export function createGuardrailChecker(deps: GuardrailCheckerDeps) {
  return {
    /**
     * Prueft Guardrails fuer eine bestimmte Aktion.
     *
     * Reihenfolge: Time Window -> Daily Limit -> Hourly Limit -> Approval
     */
    async check(action: string): Promise<GuardrailCheckResult> {
      const config = await deps.getConfig(action);

      // Keine Guardrails konfiguriert -> alles erlaubt
      if (!config) {
        return { allowed: true, requiresApproval: false };
      }

      const now = deps.getCurrentTime ? deps.getCurrentTime() : new Date();

      // 1. Zeitfenster pruefen
      if (config.allowedTimeWindow) {
        if (!isWithinTimeWindow(now, config.allowedTimeWindow)) {
          return {
            allowed: false,
            requiresApproval: false,
            reason: "OUTSIDE_TIME_WINDOW",
          };
        }
      }

      const usage = await deps.getUsageCount(action);

      // 2. Tageslimit pruefen
      if (config.dailyLimit !== undefined) {
        if (usage.daily >= config.dailyLimit) {
          return {
            allowed: false,
            requiresApproval: false,
            reason: "DAILY_LIMIT_REACHED",
            used: usage.daily,
            max: config.dailyLimit,
            remaining: 0,
          };
        }
      }

      // 3. Stundenlimit pruefen
      if (config.hourlyLimit !== undefined) {
        if (usage.hourly >= config.hourlyLimit) {
          return {
            allowed: false,
            requiresApproval: false,
            reason: "HOURLY_LIMIT_REACHED",
            used: usage.hourly,
            max: config.hourlyLimit,
            remaining: 0,
          };
        }
      }

      // 4. Alles OK — berechne remaining basierend auf dem engsten Limit
      const dailyRemaining =
        config.dailyLimit !== undefined
          ? config.dailyLimit - usage.daily
          : Infinity;
      const hourlyRemaining =
        config.hourlyLimit !== undefined
          ? config.hourlyLimit - usage.hourly
          : Infinity;
      const remaining = Math.min(dailyRemaining, hourlyRemaining);

      return {
        allowed: true,
        requiresApproval: config.requiresApproval ?? false,
        used: config.dailyLimit !== undefined ? usage.daily : usage.hourly,
        max: config.dailyLimit ?? config.hourlyLimit,
        remaining: remaining === Infinity ? undefined : remaining,
      };
    },
  };
}

// --- Globaler Checker ---

let _globalChecker: ReturnType<typeof createGuardrailChecker> | null = null;

/**
 * Initialisiert den globalen Guardrail-Checker.
 * Wird einmal beim Server-Start aufgerufen.
 */
export function initGlobalGuardrailChecker(deps: GuardrailCheckerDeps): void {
  _globalChecker = createGuardrailChecker(deps);
}

/**
 * Globale Convenience-Funktion: Prueft Guardrails fuer eine Aktion.
 * Wenn kein Checker initialisiert ist, wird immer erlaubt.
 */
export async function checkGuardrail(
  action: string
): Promise<GuardrailCheckResult> {
  if (!_globalChecker) {
    console.warn("[guardrails] Kein globaler Checker initialisiert. Alles erlaubt.");
    return { allowed: true, requiresApproval: false };
  }
  return _globalChecker.check(action);
}
