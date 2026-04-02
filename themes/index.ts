import type { ThemeDefinition } from "@super-app/shared";
import { defaultTheme } from "./default";
import { cyberpunkTheme } from "./cyberpunk";

/**
 * Zentrale Theme Registry.
 *
 * Alle verfuegbaren Themes werden hier registriert.
 * Neue Themes: Import + Eintrag in themeRegistry hinzufuegen.
 */
export const themeRegistry: Record<string, ThemeDefinition> = {
  default: defaultTheme,
  cyberpunk: cyberpunkTheme,
};

/**
 * Gibt alle verfuegbaren Theme-IDs zurueck.
 */
export function getAvailableThemeIds(): string[] {
  return Object.keys(themeRegistry);
}

/**
 * Gibt die Theme-Metadaten aller Themes zurueck (fuer UI-Dropdowns).
 */
export function getThemeMetas(): Array<{ id: string; name: string; colorScheme: string }> {
  return Object.values(themeRegistry).map((t) => ({
    id: t.meta.id,
    name: t.meta.name,
    colorScheme: t.meta.colorScheme,
  }));
}

// Re-Exports
export { defaultTheme } from "./default";
export { cyberpunkTheme } from "./cyberpunk";
