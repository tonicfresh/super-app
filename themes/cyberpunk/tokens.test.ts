import { describe, it, expect } from "bun:test";
import { parse } from "valibot";
import { ThemeDefinitionSchema } from "@super-app/shared";
import { cyberpunkTheme } from "./tokens";

describe("Cyberpunk Theme", () => {
  it("should export a valid ThemeDefinition", () => {
    const result = parse(ThemeDefinitionSchema, cyberpunkTheme);
    expect(result.meta.id).toBe("cyberpunk");
  });

  it("should have meta.id 'cyberpunk'", () => {
    expect(cyberpunkTheme.meta.id).toBe("cyberpunk");
  });

  it("should have meta.colorScheme 'dark'", () => {
    expect(cyberpunkTheme.meta.colorScheme).toBe("dark");
  });

  it("should have a neon primary color (fuchsia range)", () => {
    expect(cyberpunkTheme.tokens.primary[500]).toBe("#d946ef");
  });

  it("should have a cyan secondary color", () => {
    expect(cyberpunkTheme.tokens.secondary[500]).toBe("#06b6d4");
  });

  it("should have a very dark surface.ground", () => {
    expect(cyberpunkTheme.tokens.surface.ground).toBe("#0a0a0f");
  });

  it("should have a transparent/glass surface.card", () => {
    expect(cyberpunkTheme.tokens.surface.card).toContain("rgba");
  });

  it("should use Space Grotesk for headlines", () => {
    expect(cyberpunkTheme.tokens.font.headline).toBe("Space Grotesk");
  });

  it("should use Inter for body text", () => {
    expect(cyberpunkTheme.tokens.font.body).toBe("Inter");
  });

  it("should have a larger border radius (16px) for the futuristic look", () => {
    expect(cyberpunkTheme.tokens.border.radius).toBe("16px");
  });

  it("should have a strong card shadow for depth", () => {
    expect(cyberpunkTheme.tokens.shadow.card).toContain("32px");
  });

  it("should have all 10 primary color steps for PrimeVue", () => {
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
    steps.forEach((step) => {
      expect(cyberpunkTheme.tokens.primary[step]).toBeDefined();
    });
  });
});
