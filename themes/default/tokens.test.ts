import { describe, it, expect } from "bun:test";
import { parse } from "valibot";
import { ThemeDefinitionSchema } from "@super-app/shared";
import { defaultTheme } from "./tokens";

describe("Default Theme", () => {
  it("should export a valid ThemeDefinition", () => {
    const result = parse(ThemeDefinitionSchema, defaultTheme);
    expect(result.meta.id).toBe("default");
  });

  it("should have meta.id 'default'", () => {
    expect(defaultTheme.meta.id).toBe("default");
  });

  it("should have meta.colorScheme 'light'", () => {
    expect(defaultTheme.meta.colorScheme).toBe("light");
  });

  it("should have a primary color scale with at least 500", () => {
    expect(defaultTheme.tokens.primary[500]).toBeDefined();
    expect(typeof defaultTheme.tokens.primary[500]).toBe("string");
  });

  it("should have a secondary color scale with at least 500", () => {
    expect(defaultTheme.tokens.secondary[500]).toBeDefined();
  });

  it("should have all surface tokens defined", () => {
    expect(defaultTheme.tokens.surface.ground).toBeDefined();
    expect(defaultTheme.tokens.surface.card).toBeDefined();
    expect(defaultTheme.tokens.surface.overlay).toBeDefined();
  });

  it("should have font tokens with readable system fonts", () => {
    expect(defaultTheme.tokens.font.headline).toBeDefined();
    expect(defaultTheme.tokens.font.body).toBeDefined();
  });

  it("should have border.radius defined", () => {
    expect(defaultTheme.tokens.border.radius).toBeDefined();
  });

  it("should have shadow.card defined", () => {
    expect(defaultTheme.tokens.shadow.card).toBeDefined();
  });

  it("should have all 10 primary color steps (50-900) for full PrimeVue compatibility", () => {
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
    steps.forEach((step) => {
      expect(defaultTheme.tokens.primary[step]).toBeDefined();
    });
  });
});
