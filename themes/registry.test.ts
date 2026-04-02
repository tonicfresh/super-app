import { describe, it, expect } from "bun:test";
import { parse } from "valibot";
import { ThemeDefinitionSchema } from "@super-app/shared";
import { themeRegistry, getAvailableThemeIds, getThemeMetas } from "./index";

describe("Theme Registry", () => {
  it("should contain at least 'default' and 'cyberpunk'", () => {
    const ids = getAvailableThemeIds();
    expect(ids).toContain("default");
    expect(ids).toContain("cyberpunk");
  });

  it("should have valid ThemeDefinitions for all registered themes", () => {
    for (const [id, theme] of Object.entries(themeRegistry)) {
      const result = parse(ThemeDefinitionSchema, theme);
      expect(result.meta.id).toBe(id);
    }
  });

  it("should return correct theme metas", () => {
    const metas = getThemeMetas();
    expect(metas.length).toBeGreaterThanOrEqual(2);

    const defaultMeta = metas.find((m) => m.id === "default");
    expect(defaultMeta).toBeDefined();
    expect(defaultMeta!.name).toBe("Default");
    expect(defaultMeta!.colorScheme).toBe("light");

    const cyberpunkMeta = metas.find((m) => m.id === "cyberpunk");
    expect(cyberpunkMeta).toBeDefined();
    expect(cyberpunkMeta!.name).toBe("Cyberpunk");
    expect(cyberpunkMeta!.colorScheme).toBe("dark");
  });

  it("should have unique theme IDs", () => {
    const ids = getAvailableThemeIds();
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("should have matching meta.id and registry key for all themes", () => {
    for (const [key, theme] of Object.entries(themeRegistry)) {
      expect(theme.meta.id).toBe(key);
    }
  });
});
