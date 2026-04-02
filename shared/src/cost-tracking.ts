import type { AICostEntry } from "./types";

// --- Dependency Injection fuer Testbarkeit ---

export interface CostTrackerDeps {
  /** Internes Logging (z.B. DB-Insert in mc_ai_costs) */
  logInternal: (entry: AICostEntry) => Promise<void>;
  /** Optionales externes Logging (z.B. cost-tracker.fever-context.de) */
  logExternal?: (entry: AICostEntry) => Promise<void>;
}

/**
 * Validiert einen AICostEntry.
 * Gibt true zurueck wenn gueltig, false wenn nicht.
 */
function isValidCostEntry(entry: AICostEntry): boolean {
  if (!entry.project || entry.project.trim() === "") return false;
  if (!entry.provider || entry.provider.trim() === "") return false;
  if (!entry.model || entry.model.trim() === "") return false;
  if (typeof entry.tokensInput !== "number" || entry.tokensInput < 0) return false;
  if (typeof entry.tokensOutput !== "number" || entry.tokensOutput < 0) return false;
  if (typeof entry.costUsd !== "number" || entry.costUsd < 0) return false;
  return true;
}

/**
 * Erstellt einen Cost-Tracker mit injizierten Abhaengigkeiten.
 * Wird im Template-Backend mit echten DB- und HTTP-Funktionen initialisiert.
 */
export function createCostTracker(deps: CostTrackerDeps) {
  return {
    /**
     * Loggt KI-Kosten. Fire-and-forget: wirft niemals Fehler.
     */
    async log(entry: AICostEntry): Promise<void> {
      if (!isValidCostEntry(entry)) {
        console.warn("[cost-tracking] Ungueltiger Eintrag, wird ignoriert:", entry);
        return;
      }

      try {
        await deps.logInternal(entry);
      } catch (err) {
        console.error("[cost-tracking] Internes Logging fehlgeschlagen:", err);
      }

      if (deps.logExternal) {
        try {
          await deps.logExternal(entry);
        } catch (err) {
          console.error("[cost-tracking] Externes Logging fehlgeschlagen:", err);
        }
      }
    },
  };
}

// --- Globaler Tracker (wird beim Server-Start initialisiert) ---

let _globalTracker: ReturnType<typeof createCostTracker> | null = null;

/**
 * Setzt den globalen Cost-Tracker.
 * Wird einmal beim Server-Start aufgerufen mit echten Dependencies.
 */
export function initGlobalCostTracker(deps: CostTrackerDeps): void {
  _globalTracker = createCostTracker(deps);
}

/**
 * Globale Convenience-Funktion: Loggt KI-Kosten.
 * Fire-and-forget — wirft NIEMALS Fehler, blockiert NIEMALS.
 *
 * Wenn kein globaler Tracker initialisiert ist, wird ein Warn-Log ausgegeben.
 */
export async function logAICost(entry: AICostEntry): Promise<void> {
  if (!_globalTracker) {
    console.warn("[cost-tracking] Kein globaler Tracker initialisiert. Eintrag verworfen.");
    return;
  }
  await _globalTracker.log(entry);
}

/**
 * Erstellt eine externe Log-Funktion fuer HTTP-basierte Cost-Tracker.
 * Nutzt fetch fire-and-forget.
 */
export function createExternalCostLogger(url: string, token: string) {
  return async (entry: AICostEntry): Promise<void> => {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(entry),
    });
  };
}
