import type { ThemeDefinition } from "@super-app/shared";

/**
 * Cyberpunk Theme — Dark, Neon, Glassmorphism.
 *
 * Dunkler Hintergrund mit neon-farbenen Akzenten.
 * Fuchsia/Magenta als Primaerfarbe, Cyan als Sekundaerfarbe.
 * Glassmorphism-Cards, quadratische Marker, 3D-Hover-Effekte.
 */
export const cyberpunkTheme: ThemeDefinition = {
  meta: {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "Dark, neon, glassmorphism with 3D hover effects",
    author: "Super App",
    version: "1.0.0",
    colorScheme: "dark",
  },
  tokens: {
    primary: {
      50: "#fdf4ff",
      100: "#fae8ff",
      200: "#f5d0fe",
      300: "#f0abfc",
      400: "#e879f9",
      500: "#d946ef",
      600: "#c026d3",
      700: "#a21caf",
      800: "#86198f",
      900: "#4a044e",
    },
    secondary: {
      50: "#ecfeff",
      100: "#cffafe",
      200: "#a5f3fc",
      300: "#67e8f9",
      400: "#22d3ee",
      500: "#06b6d4",
      600: "#0891b2",
      700: "#0e7490",
      800: "#155e75",
      900: "#164e63",
    },
    success: {
      50: "#f0fdf4",
      500: "#4ade80",
      900: "#14532d",
    },
    warning: {
      50: "#fefce8",
      500: "#facc15",
      900: "#713f12",
    },
    danger: {
      50: "#fef2f2",
      500: "#f87171",
      900: "#7f1d1d",
    },
    surface: {
      ground: "#0a0a0f",
      card: "rgba(255, 255, 255, 0.04)",
      overlay: "#1a1a2e",
    },
    border: {
      radius: "16px",
      radiusLg: "20px",
      radiusSm: "8px",
    },
    font: {
      headline: "Space Grotesk",
      body: "Inter",
      mono: "JetBrains Mono, monospace",
    },
    shadow: {
      card: "0 8px 32px rgba(0, 0, 0, 0.3)",
      overlay: "0 16px 64px rgba(0, 0, 0, 0.5)",
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
