import type { ThemeDefinition } from "@super-app/shared";

/**
 * Default Theme — Clean, professioneller Look.
 *
 * Basiert auf PrimeVue Aura Preset Defaults.
 * Blaue Primaerfarbe, neutrale Oberflaechen, gut lesbare Schriften.
 * Alle 10 Farbstufen (50-900) fuer volle PrimeVue-Kompatibilitaet.
 */
export const defaultTheme: ThemeDefinition = {
  meta: {
    id: "default",
    name: "Default",
    description: "Clean, professional look with PrimeVue defaults",
    author: "Super App",
    version: "1.0.0",
    colorScheme: "light",
  },
  tokens: {
    primary: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3B82F6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
    },
    secondary: {
      50: "#ecfdf5",
      100: "#d1fae5",
      200: "#a7f3d0",
      300: "#6ee7b7",
      400: "#34d399",
      500: "#10B981",
      600: "#059669",
      700: "#047857",
      800: "#065f46",
      900: "#064e3b",
    },
    success: {
      50: "#f0fdf4",
      500: "#22c55e",
      900: "#14532d",
    },
    warning: {
      50: "#fffbeb",
      500: "#f59e0b",
      900: "#78350f",
    },
    danger: {
      50: "#fef2f2",
      500: "#ef4444",
      900: "#7f1d1d",
    },
    surface: {
      ground: "#ffffff",
      card: "#f8fafc",
      overlay: "#f1f5f9",
    },
    border: {
      radius: "8px",
      radiusLg: "12px",
      radiusSm: "4px",
    },
    font: {
      headline: "Inter",
      body: "Inter",
      mono: "JetBrains Mono, monospace",
    },
    shadow: {
      card: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
      overlay: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    },
    spacing: {
      xs: "0.25rem",
      sm: "0.5rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
    },
  },
};
