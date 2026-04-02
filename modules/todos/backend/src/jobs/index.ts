/**
 * Background-Jobs fuer das Todos-Modul.
 *
 * Moegliche Jobs:
 * - todos:cleanup — abgelaufene/erledigte Todos archivieren
 * - todos:reminder — Erinnerungen fuer faellige Todos senden
 */

export const todosJobs: Array<{ type: string; handler: any }> = [
  // {
  //   type: "todos:cleanup",
  //   handler: {
  //     execute: async (metadata: any) => {
  //       // Archiviere Todos die seit 30 Tagen "done" sind
  //     },
  //   },
  // },
];
