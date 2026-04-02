import { describe, it, expect } from "bun:test";
import { parse } from "valibot";
import type {
  ThemeColorScale,
  ThemeSurfaceTokens,
  ThemeBorderTokens,
  ThemeFontTokens,
  ThemeShadowTokens,
  ThemeSpacingTokens,
  ThemeTokens,
  ThemeMeta,
  ThemeDefinition,
} from "./types";
import { ThemeTokensSchema, ThemeDefinitionSchema } from "./types";

describe("Theme Types", () => {
  describe("ThemeColorScale", () => {
    it("should accept a complete color scale with 50-900", () => {
      const scale: ThemeColorScale = {
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
      };
      expect(scale[500]).toBe("#d946ef");
    });

    it("should accept a partial color scale with only 500", () => {
      const scale: ThemeColorScale = { 500: "#3B82F6" };
      expect(scale[500]).toBe("#3B82F6");
    });
  });

  describe("ThemeSurfaceTokens", () => {
    it("should accept ground, card, and overlay", () => {
      const surface: ThemeSurfaceTokens = {
        ground: "#0a0a0f",
        card: "rgba(255, 255, 255, 0.04)",
        overlay: "#1a1a2e",
      };
      expect(surface.ground).toBe("#0a0a0f");
    });
  });

  describe("ThemeBorderTokens", () => {
    it("should accept radius as string", () => {
      const border: ThemeBorderTokens = { radius: "16px" };
      expect(border.radius).toBe("16px");
    });

    it("should accept optional radiusLg and radiusSm", () => {
      const border: ThemeBorderTokens = {
        radius: "12px",
        radiusLg: "16px",
        radiusSm: "8px",
      };
      expect(border.radiusLg).toBe("16px");
    });
  });

  describe("ThemeFontTokens", () => {
    it("should accept headline and body", () => {
      const font: ThemeFontTokens = {
        headline: "Space Grotesk",
        body: "Inter",
      };
      expect(font.headline).toBe("Space Grotesk");
    });

    it("should accept optional mono", () => {
      const font: ThemeFontTokens = {
        headline: "Space Grotesk",
        body: "Inter",
        mono: "JetBrains Mono",
      };
      expect(font.mono).toBe("JetBrains Mono");
    });
  });

  describe("ThemeShadowTokens", () => {
    it("should accept card and optional overlay", () => {
      const shadow: ThemeShadowTokens = {
        card: "0 8px 32px rgba(0, 0, 0, 0.3)",
      };
      expect(shadow.card).toBeDefined();
    });

    it("should accept card and overlay", () => {
      const shadow: ThemeShadowTokens = {
        card: "0 8px 32px rgba(0, 0, 0, 0.3)",
        overlay: "0 16px 64px rgba(0, 0, 0, 0.5)",
      };
      expect(shadow.overlay).toBeDefined();
    });
  });

  describe("ThemeSpacingTokens", () => {
    it("should accept optional spacing scale", () => {
      const spacing: ThemeSpacingTokens = {
        xs: "0.25rem",
        sm: "0.5rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "2rem",
      };
      expect(spacing.md).toBe("1rem");
    });

    it("should accept a partial spacing definition", () => {
      const spacing: ThemeSpacingTokens = { md: "1rem" };
      expect(spacing.md).toBe("1rem");
    });
  });

  describe("ThemeTokens", () => {
    it("should accept a complete theme tokens object", () => {
      const tokens: ThemeTokens = {
        primary: { 50: "#fdf4ff", 500: "#d946ef", 900: "#4a044e" },
        secondary: { 500: "#06b6d4" },
        surface: {
          ground: "#0a0a0f",
          card: "rgba(255, 255, 255, 0.04)",
          overlay: "#1a1a2e",
        },
        border: { radius: "16px" },
        font: { headline: "Space Grotesk", body: "Inter" },
        shadow: { card: "0 8px 32px rgba(0, 0, 0, 0.3)" },
      };
      expect(tokens.primary[500]).toBe("#d946ef");
      expect(tokens.surface.ground).toBe("#0a0a0f");
    });

    it("should accept optional spacing", () => {
      const tokens: ThemeTokens = {
        primary: { 500: "#3B82F6" },
        secondary: { 500: "#10B981" },
        surface: { ground: "#ffffff", card: "#f8fafc", overlay: "#f1f5f9" },
        border: { radius: "8px" },
        font: { headline: "Inter", body: "Inter" },
        shadow: { card: "0 4px 16px rgba(0, 0, 0, 0.1)" },
        spacing: { xs: "0.25rem", sm: "0.5rem", md: "1rem", lg: "1.5rem", xl: "2rem" },
      };
      expect(tokens.spacing?.md).toBe("1rem");
    });

    it("should accept optional success, warning, danger color scales", () => {
      const tokens: ThemeTokens = {
        primary: { 500: "#3B82F6" },
        secondary: { 500: "#10B981" },
        surface: { ground: "#ffffff", card: "#f8fafc", overlay: "#f1f5f9" },
        border: { radius: "8px" },
        font: { headline: "Inter", body: "Inter" },
        shadow: { card: "0 4px 16px rgba(0, 0, 0, 0.1)" },
        success: { 500: "#22c55e" },
        warning: { 500: "#f59e0b" },
        danger: { 500: "#ef4444" },
      };
      expect(tokens.success?.[500]).toBe("#22c55e");
    });
  });

  describe("ThemeTokensSchema (Valibot)", () => {
    it("should validate a correct theme tokens object", () => {
      const input = {
        primary: { 500: "#d946ef" },
        secondary: { 500: "#06b6d4" },
        surface: {
          ground: "#0a0a0f",
          card: "rgba(255, 255, 255, 0.04)",
          overlay: "#1a1a2e",
        },
        border: { radius: "16px" },
        font: { headline: "Space Grotesk", body: "Inter" },
        shadow: { card: "0 8px 32px rgba(0, 0, 0, 0.3)" },
      };
      const result = parse(ThemeTokensSchema, input);
      expect(result.primary[500]).toBe("#d946ef");
    });

    it("should reject missing required fields", () => {
      const input = { primary: { 500: "#d946ef" } };
      expect(() => parse(ThemeTokensSchema, input)).toThrow();
    });

    it("should reject empty surface.ground", () => {
      const input = {
        primary: { 500: "#d946ef" },
        secondary: { 500: "#06b6d4" },
        surface: { ground: "", card: "#fff", overlay: "#fff" },
        border: { radius: "8px" },
        font: { headline: "Inter", body: "Inter" },
        shadow: { card: "0 0 0 transparent" },
      };
      expect(() => parse(ThemeTokensSchema, input)).toThrow();
    });
  });

  describe("ThemeDefinition", () => {
    it("should accept a complete theme definition with meta + tokens", () => {
      const theme: ThemeDefinition = {
        meta: {
          id: "cyberpunk",
          name: "Cyberpunk",
          description: "Dark, neon, glassmorphism",
          author: "Super App",
          version: "1.0.0",
          colorScheme: "dark",
        },
        tokens: {
          primary: { 500: "#d946ef" },
          secondary: { 500: "#06b6d4" },
          surface: { ground: "#0a0a0f", card: "rgba(255,255,255,0.04)", overlay: "#1a1a2e" },
          border: { radius: "16px" },
          font: { headline: "Space Grotesk", body: "Inter" },
          shadow: { card: "0 8px 32px rgba(0,0,0,0.3)" },
        },
      };
      expect(theme.meta.id).toBe("cyberpunk");
      expect(theme.meta.colorScheme).toBe("dark");
    });

    it("should support light and system color schemes", () => {
      const schemes: ThemeMeta["colorScheme"][] = ["light", "dark", "system"];
      schemes.forEach((scheme) => {
        const meta: ThemeMeta = {
          id: "test",
          name: "Test",
          version: "1.0.0",
          colorScheme: scheme,
        };
        expect(meta.colorScheme).toBe(scheme);
      });
    });
  });

  describe("ThemeDefinitionSchema (Valibot)", () => {
    it("should validate a complete theme definition", () => {
      const input = {
        meta: {
          id: "default",
          name: "Default",
          version: "1.0.0",
          colorScheme: "light",
        },
        tokens: {
          primary: { 500: "#3B82F6" },
          secondary: { 500: "#10B981" },
          surface: { ground: "#ffffff", card: "#f8fafc", overlay: "#f1f5f9" },
          border: { radius: "8px" },
          font: { headline: "Inter", body: "Inter" },
          shadow: { card: "0 4px 16px rgba(0,0,0,0.1)" },
        },
      };
      const result = parse(ThemeDefinitionSchema, input);
      expect(result.meta.id).toBe("default");
    });

    it("should reject invalid color scheme", () => {
      const input = {
        meta: {
          id: "test",
          name: "Test",
          version: "1.0.0",
          colorScheme: "invalid",
        },
        tokens: {
          primary: { 500: "#3B82F6" },
          secondary: { 500: "#10B981" },
          surface: { ground: "#fff", card: "#fff", overlay: "#fff" },
          border: { radius: "8px" },
          font: { headline: "Inter", body: "Inter" },
          shadow: { card: "none" },
        },
      };
      expect(() => parse(ThemeDefinitionSchema, input)).toThrow();
    });

    it("should reject missing meta.id", () => {
      const input = {
        meta: { name: "Test", version: "1.0.0", colorScheme: "light" },
        tokens: {
          primary: { 500: "#3B82F6" },
          secondary: { 500: "#10B981" },
          surface: { ground: "#fff", card: "#fff", overlay: "#fff" },
          border: { radius: "8px" },
          font: { headline: "Inter", body: "Inter" },
          shadow: { card: "none" },
        },
      };
      expect(() => parse(ThemeDefinitionSchema, input)).toThrow();
    });
  });
});
