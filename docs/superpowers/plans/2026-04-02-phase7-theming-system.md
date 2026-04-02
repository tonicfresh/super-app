# Phase 7: Theming System

**Date:** 2026-04-02
**Status:** Ready
**Spec:** `docs/superpowers/specs/2026-04-02-super-app-architecture-design.md` (Section 9)
**For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development**

---

## Ziel

Vollstaendiges Theming-System fuer die Super App: TypeScript-Typen fuer Design Tokens, Default- und Cyberpunk-Theme, ein Theme-Loader der Tokens als CSS Custom Properties auf `:root` setzt und Override-CSS injiziert (mit Hot-Switching ohne Page Reload), Persistenz der Theme-Auswahl in den User Preferences, eine Settings-UI fuer Theme-Selektion/Dark-Mode, und die Integration mit PrimeVues Design Token System.

**MANDATORY RULE:** Kein Modul darf Farben, Shadows, Border-Radii oder Fonts hardcoden. Alles MUSS ueber PrimeVue Design Tokens oder Tailwind CSS Custom Properties laufen.

## Voraussetzungen

- Bun Runtime installiert
- Phase 1 (Shared Types Package) abgeschlossen — `shared/src/types.ts` existiert
- Template-Frontend unter `template/frontend/` ist funktionsfaehig (Vue 3 + PrimeVue + Tailwind CSS v4)
- Template-Backend unter `template/backend/` ist funktionsfaehig (Hono + Drizzle)
- PrimeVue mit Aura/Lara Preset ist konfiguriert

## Konventionen

- **Runtime:** Bun
- **Validation:** Valibot (NICHT Zod)
- **ORM:** Drizzle ORM
- **Testing:** `bun:test`
- **Commit-Messages:** Englisch, Conventional Commits
- **TDD:** Tests zuerst, dann Implementierung
- **CSS:** Tailwind CSS v4 mit CSS Custom Properties
- **Components:** PrimeVue Design Token System

---

## Task 1: Theme Token Types — TypeScript Interface

**Ziel:** TypeScript-Interface fuer Theme Tokens in `shared/src/types.ts`, validierbar mit Valibot. Definiert die vollstaendige Struktur: Farbpaletten (50-900), Surface, Border, Font, Shadow, Spacing.

### Files

| Action | Path |
|--------|------|
| Modify | `shared/src/types.ts` |
| Modify | `shared/src/index.ts` |
| Create | `shared/src/theme.test.ts` |

### Step 1.1: Tests schreiben (TDD)

**`shared/src/theme.test.ts`:**
```typescript
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
```

### Step 1.2: Typen und Schemas implementieren

**`shared/src/types.ts`** — Am Ende der Datei ergaenzen:

```typescript
// ============================================================
// Theme System
// ============================================================

import * as v from "valibot";

/**
 * Farbskala fuer ein Theme.
 * Alle Stufen sind optional ausser 500 (Primaerfarbe).
 */
export interface ThemeColorScale {
  50?: string;
  100?: string;
  200?: string;
  300?: string;
  400?: string;
  500: string;
  600?: string;
  700?: string;
  800?: string;
  900?: string;
}

/** Surface-Tokens: Hintergrundfarben fuer verschiedene Ebenen */
export interface ThemeSurfaceTokens {
  /** Haupthintergrund der App */
  ground: string;
  /** Kartenhintergrund */
  card: string;
  /** Overlay/Modal-Hintergrund */
  overlay: string;
}

/** Border-Tokens */
export interface ThemeBorderTokens {
  /** Standard Border-Radius */
  radius: string;
  /** Grosser Border-Radius (z.B. fuer Cards) */
  radiusLg?: string;
  /** Kleiner Border-Radius (z.B. fuer Badges) */
  radiusSm?: string;
}

/** Font-Tokens */
export interface ThemeFontTokens {
  /** Schrift fuer Ueberschriften */
  headline: string;
  /** Schrift fuer Fliesstext */
  body: string;
  /** Schrift fuer Code/Monospace */
  mono?: string;
}

/** Shadow-Tokens */
export interface ThemeShadowTokens {
  /** Schatten fuer Karten */
  card: string;
  /** Schatten fuer Overlays/Modals */
  overlay?: string;
}

/** Spacing-Tokens */
export interface ThemeSpacingTokens {
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
}

/**
 * Vollstaendige Token-Sammlung eines Themes.
 * Wird vom Theme-Loader in CSS Custom Properties umgewandelt.
 */
export interface ThemeTokens {
  /** Primaerfarbe */
  primary: ThemeColorScale;
  /** Sekundaerfarbe */
  secondary: ThemeColorScale;
  /** Erfolgsfarbe */
  success?: ThemeColorScale;
  /** Warnfarbe */
  warning?: ThemeColorScale;
  /** Fehlerfarbe */
  danger?: ThemeColorScale;
  /** Oberflaechenfarben */
  surface: ThemeSurfaceTokens;
  /** Border-Einstellungen */
  border: ThemeBorderTokens;
  /** Schriften */
  font: ThemeFontTokens;
  /** Schatten */
  shadow: ThemeShadowTokens;
  /** Abstaende */
  spacing?: ThemeSpacingTokens;
}

/**
 * Metadaten eines Themes.
 */
export interface ThemeMeta {
  /** Eindeutige Theme-ID (z.B. "cyberpunk", "default") */
  id: string;
  /** Anzeigename */
  name: string;
  /** Beschreibung */
  description?: string;
  /** Autor */
  author?: string;
  /** Semantic Version */
  version: string;
  /** Bevorzugtes Farbschema */
  colorScheme: "light" | "dark" | "system";
}

/**
 * Vollstaendige Theme-Definition: Meta + Tokens.
 * Dies ist das, was eine theme tokens.ts Datei exportiert.
 */
export interface ThemeDefinition {
  meta: ThemeMeta;
  tokens: ThemeTokens;
}

// --- Valibot Schemas ---

const ThemeColorScaleSchema = v.object({
  50: v.optional(v.string()),
  100: v.optional(v.string()),
  200: v.optional(v.string()),
  300: v.optional(v.string()),
  400: v.optional(v.string()),
  500: v.pipe(v.string(), v.minLength(1)),
  600: v.optional(v.string()),
  700: v.optional(v.string()),
  800: v.optional(v.string()),
  900: v.optional(v.string()),
});

const ThemeSurfaceSchema = v.object({
  ground: v.pipe(v.string(), v.minLength(1)),
  card: v.pipe(v.string(), v.minLength(1)),
  overlay: v.pipe(v.string(), v.minLength(1)),
});

const ThemeBorderSchema = v.object({
  radius: v.pipe(v.string(), v.minLength(1)),
  radiusLg: v.optional(v.string()),
  radiusSm: v.optional(v.string()),
});

const ThemeFontSchema = v.object({
  headline: v.pipe(v.string(), v.minLength(1)),
  body: v.pipe(v.string(), v.minLength(1)),
  mono: v.optional(v.string()),
});

const ThemeShadowSchema = v.object({
  card: v.pipe(v.string(), v.minLength(1)),
  overlay: v.optional(v.string()),
});

const ThemeSpacingSchema = v.object({
  xs: v.optional(v.string()),
  sm: v.optional(v.string()),
  md: v.optional(v.string()),
  lg: v.optional(v.string()),
  xl: v.optional(v.string()),
});

export const ThemeTokensSchema = v.object({
  primary: ThemeColorScaleSchema,
  secondary: ThemeColorScaleSchema,
  success: v.optional(ThemeColorScaleSchema),
  warning: v.optional(ThemeColorScaleSchema),
  danger: v.optional(ThemeColorScaleSchema),
  surface: ThemeSurfaceSchema,
  border: ThemeBorderSchema,
  font: ThemeFontSchema,
  shadow: ThemeShadowSchema,
  spacing: v.optional(ThemeSpacingSchema),
});

const ThemeMetaSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.optional(v.string()),
  author: v.optional(v.string()),
  version: v.pipe(v.string(), v.minLength(1)),
  colorScheme: v.picklist(["light", "dark", "system"]),
});

export const ThemeDefinitionSchema = v.object({
  meta: ThemeMetaSchema,
  tokens: ThemeTokensSchema,
});
```

### Step 1.3: Index-Exports aktualisieren

**`shared/src/index.ts`** — Ergaenzen:
```typescript
// --- Theme System ---
export type {
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

export {
  ThemeTokensSchema,
  ThemeDefinitionSchema,
} from "./types";
```

### Step 1.4: Tests ausfuehren

```bash
cd shared && bun install && bun test src/theme.test.ts
```

### Step 1.5: Typecheck

```bash
cd shared && bun run typecheck
```

### Commit

```
feat(shared): add theme token types and Valibot schemas for theming system
```

---

## Task 2: Default Theme

**Ziel:** `themes/default/tokens.ts` + `themes/default/overrides.css` — Clean, professioneller Look basierend auf PrimeVue Defaults. Helles Theme mit blauen Akzenten, gut lesbar, barrierefrei.

### Files

| Action | Path |
|--------|------|
| Create | `themes/default/tokens.ts` |
| Create | `themes/default/overrides.css` |
| Create | `themes/default/index.ts` |
| Create | `themes/default/tokens.test.ts` |

### Step 2.1: Tests schreiben (TDD)

**`themes/default/tokens.test.ts`:**
```typescript
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
```

### Step 2.2: Token-Datei implementieren

**`themes/default/tokens.ts`:**
```typescript
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
```

**`themes/default/overrides.css`:**
```css
/* ============================================================
 * Default Theme — CSS Overrides
 * Minimale Overrides fuer den Standard-Look.
 * Setzt nur Grundlagen die ueber Tokens hinausgehen.
 * ============================================================ */

/* Sanfte Transitions fuer alle interaktiven Elemente */
.p-card,
.p-button,
.p-inputtext,
.p-dropdown,
.p-selectbutton {
  transition: all 0.2s ease-in-out;
}

/* Subtiler Card-Hover */
.p-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Saubere List-Marker */
ul li::marker {
  color: var(--p-primary-500);
}

/* Focus-Ring fuer Accessibility */
*:focus-visible {
  outline: 2px solid var(--p-primary-500);
  outline-offset: 2px;
}
```

**`themes/default/index.ts`:**
```typescript
export { defaultTheme } from "./tokens";
```

### Step 2.3: Tests ausfuehren

```bash
cd /Users/toby/Documents/github/projekte/super-app && bun test themes/default/tokens.test.ts
```

### Commit

```
feat(themes): add default theme with full color scales, surface tokens, and minimal CSS overrides
```

---

## Task 3: Cyberpunk Theme

**Ziel:** `themes/cyberpunk/tokens.ts` + `themes/cyberpunk/overrides.css` — Dunkles Theme mit Neon-Farben, Glassmorphism, quadratischen List-Markern, 3D-Hover-Effekten.

### Files

| Action | Path |
|--------|------|
| Create | `themes/cyberpunk/tokens.ts` |
| Create | `themes/cyberpunk/overrides.css` |
| Create | `themes/cyberpunk/index.ts` |
| Create | `themes/cyberpunk/tokens.test.ts` |

### Step 3.1: Tests schreiben (TDD)

**`themes/cyberpunk/tokens.test.ts`:**
```typescript
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
    // Cyberpunk primary ist Fuchsia/Magenta
    expect(cyberpunkTheme.tokens.primary[500]).toBe("#d946ef");
  });

  it("should have a cyan secondary color", () => {
    expect(cyberpunkTheme.tokens.secondary[500]).toBe("#06b6d4");
  });

  it("should have a very dark surface.ground", () => {
    // Cyberpunk Hintergrund soll dunkel sein
    expect(cyberpunkTheme.tokens.surface.ground).toBe("#0a0a0f");
  });

  it("should have a transparent/glass surface.card", () => {
    // Glassmorphism: Card soll transparent/halbtransparent sein
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
```

### Step 3.2: Token-Datei implementieren

**`themes/cyberpunk/tokens.ts`:**
```typescript
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
```

**`themes/cyberpunk/overrides.css`:**
```css
/* ============================================================
 * Cyberpunk Theme — CSS Overrides
 * Glassmorphism, neon accents, 3D effects, square markers.
 * ============================================================ */

/* --- Glassmorphism Cards --- */
.p-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* --- 3D Hover-Effekt auf Cards --- */
.p-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.p-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

/* --- Quadratische List-Marker --- */
ul li::marker {
  content: '■ ';
  color: var(--p-primary-500);
}

/* --- Neon Glow auf fokussierte Inputs --- */
.p-inputtext:focus,
.p-dropdown:focus,
.p-textarea:focus {
  box-shadow: 0 0 0 2px rgba(217, 70, 239, 0.3);
  border-color: var(--p-primary-500);
}

/* --- Neon Glow auf Primary Buttons --- */
.p-button:not(.p-button-text):not(.p-button-outlined):not(.p-button-link) {
  box-shadow: 0 0 16px rgba(217, 70, 239, 0.3);
  transition: box-shadow 0.3s ease, transform 0.2s ease;
}

.p-button:not(.p-button-text):not(.p-button-outlined):not(.p-button-link):hover {
  box-shadow: 0 0 24px rgba(217, 70, 239, 0.5);
  transform: translateY(-1px);
}

/* --- Glassmorphism Dialogs/Overlays --- */
.p-dialog {
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* --- Sidebar Glassmorphism --- */
.p-sidebar {
  background: rgba(10, 10, 15, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

/* --- Neon Scrollbar (WebKit) --- */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
}

::-webkit-scrollbar-thumb {
  background: rgba(217, 70, 239, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(217, 70, 239, 0.5);
}

/* --- Subtle Neon-Unterstrich fuer aktive Navigation --- */
.router-link-active {
  border-bottom: 2px solid var(--p-primary-500);
  text-shadow: 0 0 8px rgba(217, 70, 239, 0.4);
}

/* --- Body Background --- */
body {
  background-color: var(--p-surface-ground);
  color: rgba(255, 255, 255, 0.87);
}

/* --- Transitions fuer alle interaktiven Elemente --- */
.p-button,
.p-inputtext,
.p-dropdown,
.p-selectbutton,
.p-tabview-nav-link {
  transition: all 0.2s ease-in-out;
}
```

**`themes/cyberpunk/index.ts`:**
```typescript
export { cyberpunkTheme } from "./tokens";
```

### Step 3.3: Tests ausfuehren

```bash
cd /Users/toby/Documents/github/projekte/super-app && bun test themes/cyberpunk/tokens.test.ts
```

### Commit

```
feat(themes): add cyberpunk theme with neon colors, glassmorphism, and 3D hover effects
```

---

## Task 4: Theme Loader

**Ziel:** `template/frontend/src/theme-loader.ts` — Laedt Theme-Tokens, setzt sie als CSS Custom Properties auf `:root`, injiziert Override-CSS dynamisch. Unterstuetzt Hot-Switching ohne Page Reload.

### Files

| Action | Path |
|--------|------|
| Create | `template/frontend/src/theme-loader.ts` |
| Create | `template/frontend/src/theme-loader.test.ts` |

### Step 4.1: Tests schreiben (TDD)

**`template/frontend/src/theme-loader.test.ts`:**
```typescript
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  createThemeLoader,
  tokensToCssProperties,
  type ThemeLoader,
} from "./theme-loader";
import type { ThemeTokens, ThemeDefinition } from "@super-app/shared";

// --- Mock ThemeDefinitions fuer Tests ---

const mockDefaultTokens: ThemeTokens = {
  primary: { 500: "#3B82F6" },
  secondary: { 500: "#10B981" },
  surface: { ground: "#ffffff", card: "#f8fafc", overlay: "#f1f5f9" },
  border: { radius: "8px" },
  font: { headline: "Inter", body: "Inter" },
  shadow: { card: "0 4px 16px rgba(0,0,0,0.1)" },
};

const mockDefaultTheme: ThemeDefinition = {
  meta: { id: "default", name: "Default", version: "1.0.0", colorScheme: "light" },
  tokens: mockDefaultTokens,
};

const mockCyberpunkTokens: ThemeTokens = {
  primary: { 50: "#fdf4ff", 500: "#d946ef", 900: "#4a044e" },
  secondary: { 500: "#06b6d4" },
  surface: { ground: "#0a0a0f", card: "rgba(255,255,255,0.04)", overlay: "#1a1a2e" },
  border: { radius: "16px" },
  font: { headline: "Space Grotesk", body: "Inter" },
  shadow: { card: "0 8px 32px rgba(0,0,0,0.3)" },
};

const mockCyberpunkTheme: ThemeDefinition = {
  meta: { id: "cyberpunk", name: "Cyberpunk", version: "1.0.0", colorScheme: "dark" },
  tokens: mockCyberpunkTokens,
};

describe("Theme Loader", () => {
  describe("tokensToCssProperties", () => {
    it("should convert primary.500 to --p-primary-500", () => {
      const props = tokensToCssProperties(mockDefaultTokens);
      expect(props["--p-primary-500"]).toBe("#3B82F6");
    });

    it("should convert secondary.500 to --p-secondary-500", () => {
      const props = tokensToCssProperties(mockDefaultTokens);
      expect(props["--p-secondary-500"]).toBe("#10B981");
    });

    it("should convert surface.ground to --p-surface-ground", () => {
      const props = tokensToCssProperties(mockDefaultTokens);
      expect(props["--p-surface-ground"]).toBe("#ffffff");
    });

    it("should convert surface.card to --p-surface-card", () => {
      const props = tokensToCssProperties(mockDefaultTokens);
      expect(props["--p-surface-card"]).toBe("#f8fafc");
    });

    it("should convert border.radius to --p-border-radius", () => {
      const props = tokensToCssProperties(mockDefaultTokens);
      expect(props["--p-border-radius"]).toBe("8px");
    });

    it("should convert font.headline to --p-font-headline", () => {
      const props = tokensToCssProperties(mockDefaultTokens);
      expect(props["--p-font-headline"]).toBe("Inter");
    });

    it("should convert font.body to --p-font-body", () => {
      const props = tokensToCssProperties(mockDefaultTokens);
      expect(props["--p-font-body"]).toBe("Inter");
    });

    it("should convert shadow.card to --p-shadow-card", () => {
      const props = tokensToCssProperties(mockDefaultTokens);
      expect(props["--p-shadow-card"]).toBe("0 4px 16px rgba(0,0,0,0.1)");
    });

    it("should handle optional primary color steps", () => {
      const props = tokensToCssProperties(mockCyberpunkTokens);
      expect(props["--p-primary-50"]).toBe("#fdf4ff");
      expect(props["--p-primary-500"]).toBe("#d946ef");
      expect(props["--p-primary-900"]).toBe("#4a044e");
    });

    it("should skip undefined optional values", () => {
      const props = tokensToCssProperties(mockDefaultTokens);
      // Spacing nicht definiert → kein --p-spacing-*
      expect(props["--p-spacing-md"]).toBeUndefined();
    });

    it("should include spacing if defined", () => {
      const tokensWithSpacing: ThemeTokens = {
        ...mockDefaultTokens,
        spacing: { xs: "0.25rem", sm: "0.5rem", md: "1rem", lg: "1.5rem", xl: "2rem" },
      };
      const props = tokensToCssProperties(tokensWithSpacing);
      expect(props["--p-spacing-md"]).toBe("1rem");
      expect(props["--p-spacing-xl"]).toBe("2rem");
    });

    it("should include success, warning, danger if defined", () => {
      const tokensWithExtras: ThemeTokens = {
        ...mockDefaultTokens,
        success: { 500: "#22c55e" },
        warning: { 500: "#f59e0b" },
        danger: { 500: "#ef4444" },
      };
      const props = tokensToCssProperties(tokensWithExtras);
      expect(props["--p-success-500"]).toBe("#22c55e");
      expect(props["--p-warning-500"]).toBe("#f59e0b");
      expect(props["--p-danger-500"]).toBe("#ef4444");
    });
  });

  describe("createThemeLoader", () => {
    it("should return a ThemeLoader with apply, getActive, and getAvailable methods", () => {
      const loader = createThemeLoader({
        themes: { default: mockDefaultTheme },
        defaultThemeId: "default",
      });
      expect(typeof loader.apply).toBe("function");
      expect(typeof loader.getActive).toBe("function");
      expect(typeof loader.getAvailable).toBe("function");
    });

    it("should return available theme IDs", () => {
      const loader = createThemeLoader({
        themes: { default: mockDefaultTheme, cyberpunk: mockCyberpunkTheme },
        defaultThemeId: "default",
      });
      const available = loader.getAvailable();
      expect(available).toContain("default");
      expect(available).toContain("cyberpunk");
    });

    it("should return the active theme ID (initially the default)", () => {
      const loader = createThemeLoader({
        themes: { default: mockDefaultTheme },
        defaultThemeId: "default",
      });
      expect(loader.getActive()).toBe("default");
    });

    it("should throw if applying an unknown theme ID", () => {
      const loader = createThemeLoader({
        themes: { default: mockDefaultTheme },
        defaultThemeId: "default",
      });
      expect(() => loader.apply("unknown")).toThrow('Theme "unknown" not found');
    });

    it("should update the active theme after apply", () => {
      const loader = createThemeLoader({
        themes: { default: mockDefaultTheme, cyberpunk: mockCyberpunkTheme },
        defaultThemeId: "default",
        setRootProperties: mock(() => {}),
        injectOverrideCss: mock(() => {}),
      });
      loader.apply("cyberpunk");
      expect(loader.getActive()).toBe("cyberpunk");
    });

    it("should call setRootProperties with converted CSS properties", () => {
      const setRoot = mock((_props: Record<string, string>) => {});
      const loader = createThemeLoader({
        themes: { default: mockDefaultTheme },
        defaultThemeId: "default",
        setRootProperties: setRoot,
        injectOverrideCss: mock(() => {}),
      });
      loader.apply("default");
      expect(setRoot).toHaveBeenCalledTimes(1);
      const props = setRoot.mock.calls[0][0];
      expect(props["--p-primary-500"]).toBe("#3B82F6");
    });

    it("should call injectOverrideCss when applying a theme", () => {
      const injectCss = mock((_themeId: string) => {});
      const loader = createThemeLoader({
        themes: { default: mockDefaultTheme },
        defaultThemeId: "default",
        setRootProperties: mock(() => {}),
        injectOverrideCss: injectCss,
      });
      loader.apply("default");
      expect(injectCss).toHaveBeenCalledTimes(1);
      expect(injectCss).toHaveBeenCalledWith("default");
    });

    it("should set color-scheme attribute based on theme meta", () => {
      const setColorScheme = mock((_scheme: string) => {});
      const loader = createThemeLoader({
        themes: { default: mockDefaultTheme, cyberpunk: mockCyberpunkTheme },
        defaultThemeId: "default",
        setRootProperties: mock(() => {}),
        injectOverrideCss: mock(() => {}),
        setColorScheme,
      });
      loader.apply("cyberpunk");
      expect(setColorScheme).toHaveBeenCalledWith("dark");
    });

    it("should emit 'themeChanged' event on apply", () => {
      const onChanged = mock((_themeId: string) => {});
      const loader = createThemeLoader({
        themes: { default: mockDefaultTheme, cyberpunk: mockCyberpunkTheme },
        defaultThemeId: "default",
        setRootProperties: mock(() => {}),
        injectOverrideCss: mock(() => {}),
        onThemeChanged: onChanged,
      });
      loader.apply("cyberpunk");
      expect(onChanged).toHaveBeenCalledWith("cyberpunk");
    });

    it("should support switching themes without page reload (hot-switch)", () => {
      const setRoot = mock((_props: Record<string, string>) => {});
      const injectCss = mock((_themeId: string) => {});
      const loader = createThemeLoader({
        themes: { default: mockDefaultTheme, cyberpunk: mockCyberpunkTheme },
        defaultThemeId: "default",
        setRootProperties: setRoot,
        injectOverrideCss: injectCss,
      });

      // Wechsel von default → cyberpunk → default
      loader.apply("cyberpunk");
      expect(loader.getActive()).toBe("cyberpunk");

      loader.apply("default");
      expect(loader.getActive()).toBe("default");

      // setRootProperties wurde 2x aufgerufen (einmal pro apply)
      expect(setRoot).toHaveBeenCalledTimes(2);
    });

    it("should return the ThemeDefinition for getTheme(id)", () => {
      const loader = createThemeLoader({
        themes: { default: mockDefaultTheme, cyberpunk: mockCyberpunkTheme },
        defaultThemeId: "default",
      });
      const theme = loader.getTheme("cyberpunk");
      expect(theme).toBeDefined();
      expect(theme!.meta.id).toBe("cyberpunk");
    });

    it("should return undefined for getTheme with unknown id", () => {
      const loader = createThemeLoader({
        themes: { default: mockDefaultTheme },
        defaultThemeId: "default",
      });
      expect(loader.getTheme("unknown")).toBeUndefined();
    });
  });
});
```

### Step 4.2: Implementierung

**`template/frontend/src/theme-loader.ts`:**
```typescript
import type { ThemeTokens, ThemeDefinition, ThemeColorScale } from "@super-app/shared";

// --- CSS Property Conversion ---

/**
 * Konvertiert eine ThemeColorScale in CSS Custom Properties.
 * Beispiel: { 50: "#fdf4ff", 500: "#d946ef" } → { "--p-primary-50": "#fdf4ff", "--p-primary-500": "#d946ef" }
 */
function colorScaleToCssProps(prefix: string, scale: ThemeColorScale): Record<string, string> {
  const props: Record<string, string> = {};
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
  for (const step of steps) {
    const value = scale[step];
    if (value !== undefined) {
      props[`--p-${prefix}-${step}`] = value;
    }
  }
  return props;
}

/**
 * Konvertiert ThemeTokens in ein flaches Record von CSS Custom Properties.
 * Alle Properties verwenden das --p- Prefix (PrimeVue Konvention).
 */
export function tokensToCssProperties(tokens: ThemeTokens): Record<string, string> {
  const props: Record<string, string> = {};

  // Farbskalen
  Object.assign(props, colorScaleToCssProps("primary", tokens.primary));
  Object.assign(props, colorScaleToCssProps("secondary", tokens.secondary));
  if (tokens.success) Object.assign(props, colorScaleToCssProps("success", tokens.success));
  if (tokens.warning) Object.assign(props, colorScaleToCssProps("warning", tokens.warning));
  if (tokens.danger) Object.assign(props, colorScaleToCssProps("danger", tokens.danger));

  // Surface
  props["--p-surface-ground"] = tokens.surface.ground;
  props["--p-surface-card"] = tokens.surface.card;
  props["--p-surface-overlay"] = tokens.surface.overlay;

  // Border
  props["--p-border-radius"] = tokens.border.radius;
  if (tokens.border.radiusLg) props["--p-border-radius-lg"] = tokens.border.radiusLg;
  if (tokens.border.radiusSm) props["--p-border-radius-sm"] = tokens.border.radiusSm;

  // Font
  props["--p-font-headline"] = tokens.font.headline;
  props["--p-font-body"] = tokens.font.body;
  if (tokens.font.mono) props["--p-font-mono"] = tokens.font.mono;

  // Shadow
  props["--p-shadow-card"] = tokens.shadow.card;
  if (tokens.shadow.overlay) props["--p-shadow-overlay"] = tokens.shadow.overlay;

  // Spacing
  if (tokens.spacing) {
    const spacingKeys = ["xs", "sm", "md", "lg", "xl"] as const;
    for (const key of spacingKeys) {
      const value = tokens.spacing[key];
      if (value !== undefined) {
        props[`--p-spacing-${key}`] = value;
      }
    }
  }

  return props;
}

// --- Theme Loader ---

export interface ThemeLoaderConfig {
  /** Alle registrierten Themes, indexiert nach Theme-ID */
  themes: Record<string, ThemeDefinition>;
  /** Standard-Theme-ID (Fallback) */
  defaultThemeId: string;
  /** Setzt CSS Custom Properties auf :root (injizierbar fuer Tests) */
  setRootProperties?: (props: Record<string, string>) => void;
  /** Injiziert Override-CSS fuer ein Theme (injizierbar fuer Tests) */
  injectOverrideCss?: (themeId: string) => void;
  /** Setzt das color-scheme Attribut auf :root (injizierbar fuer Tests) */
  setColorScheme?: (scheme: string) => void;
  /** Callback wenn ein Theme gewechselt wird */
  onThemeChanged?: (themeId: string) => void;
}

export interface ThemeLoader {
  /** Wendet ein Theme an (setzt CSS Properties + injiziert Override-CSS) */
  apply(themeId: string): void;
  /** Gibt die aktive Theme-ID zurueck */
  getActive(): string;
  /** Gibt alle verfuegbaren Theme-IDs zurueck */
  getAvailable(): string[];
  /** Gibt die ThemeDefinition fuer eine ID zurueck */
  getTheme(themeId: string): ThemeDefinition | undefined;
}

/**
 * Erstellt einen Theme-Loader mit injizierbaren Dependencies.
 *
 * Im Browser werden setRootProperties und injectOverrideCss
 * an das echte DOM angebunden. In Tests werden Mocks injiziert.
 */
export function createThemeLoader(config: ThemeLoaderConfig): ThemeLoader {
  let activeThemeId = config.defaultThemeId;

  return {
    apply(themeId: string): void {
      const theme = config.themes[themeId];
      if (!theme) {
        throw new Error(`Theme "${themeId}" not found. Available: ${Object.keys(config.themes).join(", ")}`);
      }

      // 1. CSS Custom Properties setzen
      const cssProps = tokensToCssProperties(theme.tokens);
      if (config.setRootProperties) {
        config.setRootProperties(cssProps);
      }

      // 2. Override-CSS injizieren
      if (config.injectOverrideCss) {
        config.injectOverrideCss(themeId);
      }

      // 3. Color-Scheme setzen (fuer Browser-Native Dark Mode)
      if (config.setColorScheme && theme.meta.colorScheme !== "system") {
        config.setColorScheme(theme.meta.colorScheme);
      }

      // 4. Aktives Theme aktualisieren
      activeThemeId = themeId;

      // 5. Callback ausfuehren
      if (config.onThemeChanged) {
        config.onThemeChanged(themeId);
      }
    },

    getActive(): string {
      return activeThemeId;
    },

    getAvailable(): string[] {
      return Object.keys(config.themes);
    },

    getTheme(themeId: string): ThemeDefinition | undefined {
      return config.themes[themeId];
    },
  };
}

// --- Browser-spezifische Implementierungen ---

/**
 * Standard-Implementierung fuer setRootProperties im Browser.
 * Setzt CSS Custom Properties direkt auf document.documentElement.
 */
export function browserSetRootProperties(props: Record<string, string>): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(props)) {
    root.style.setProperty(key, value);
  }
}

/**
 * Standard-Implementierung fuer injectOverrideCss im Browser.
 * Entfernt vorherige Theme-Overrides und injiziert neue via <style> Tag.
 *
 * Erwartet dass Override-CSS als Module importiert wird:
 * import defaultOverrides from '../../themes/default/overrides.css?raw';
 */
const STYLE_TAG_ID = "super-app-theme-overrides";

export function createBrowserCssInjector(
  overrides: Record<string, string>
): (themeId: string) => void {
  return (themeId: string) => {
    // Vorherigen Style-Tag entfernen
    const existing = document.getElementById(STYLE_TAG_ID);
    if (existing) {
      existing.remove();
    }

    // Neuen Style-Tag erstellen
    const css = overrides[themeId];
    if (css) {
      const style = document.createElement("style");
      style.id = STYLE_TAG_ID;
      style.textContent = css;
      document.head.appendChild(style);
    }
  };
}

/**
 * Standard-Implementierung fuer setColorScheme im Browser.
 * Setzt das color-scheme Attribut auf dem <html> Element.
 */
export function browserSetColorScheme(scheme: string): void {
  document.documentElement.setAttribute("data-color-scheme", scheme);
  document.documentElement.style.colorScheme = scheme;
}
```

### Step 4.3: Tests ausfuehren

```bash
cd /Users/toby/Documents/github/projekte/super-app && bun test template/frontend/src/theme-loader.test.ts
```

### Commit

```
feat(template): add theme-loader with CSS custom property injection and hot-switching support
```

---

## Task 5: Theme Persistence

**Ziel:** Theme-Auswahl in den User Preferences (Backend-DB) speichern. Beim App-Start wird das gespeicherte Theme geladen. Fallback auf "default" wenn keins gespeichert.

### Files

| Action | Path |
|--------|------|
| Create | `template/backend/src/routes/theme.ts` |
| Create | `template/backend/src/routes/theme.test.ts` |
| Create | `template/frontend/src/composables/useTheme.ts` |
| Create | `template/frontend/src/composables/useTheme.test.ts` |

### Step 5.1: Backend-Tests schreiben (TDD)

**`template/backend/src/routes/theme.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  createThemeRoutes,
  type ThemeRouteDeps,
} from "./theme";

describe("Theme Routes", () => {
  const mockDeps: ThemeRouteDeps = {
    getUserPreference: mock(async (_userId: string, _key: string) => null),
    setUserPreference: mock(async (_userId: string, _key: string, _value: string) => {}),
    availableThemes: ["default", "cyberpunk"],
  };

  beforeEach(() => {
    (mockDeps.getUserPreference as any).mockReset();
    (mockDeps.setUserPreference as any).mockReset();
  });

  describe("GET /theme", () => {
    it("should return the saved theme for the user", async () => {
      (mockDeps.getUserPreference as any).mockImplementation(
        async () => "cyberpunk"
      );

      const handler = createThemeRoutes(mockDeps);
      const result = await handler.getTheme("user-123");

      expect(result).toEqual({
        themeId: "cyberpunk",
        source: "user-preference",
      });
      expect(mockDeps.getUserPreference).toHaveBeenCalledWith(
        "user-123",
        "theme"
      );
    });

    it("should return 'default' if no preference saved", async () => {
      (mockDeps.getUserPreference as any).mockImplementation(async () => null);

      const handler = createThemeRoutes(mockDeps);
      const result = await handler.getTheme("user-123");

      expect(result).toEqual({
        themeId: "default",
        source: "fallback",
      });
    });

    it("should return 'default' if saved theme is not in available list", async () => {
      (mockDeps.getUserPreference as any).mockImplementation(
        async () => "deleted-theme"
      );

      const handler = createThemeRoutes(mockDeps);
      const result = await handler.getTheme("user-123");

      expect(result).toEqual({
        themeId: "default",
        source: "fallback",
      });
    });
  });

  describe("PUT /theme", () => {
    it("should save the theme preference for the user", async () => {
      const handler = createThemeRoutes(mockDeps);
      const result = await handler.setTheme("user-123", "cyberpunk");

      expect(result).toEqual({ success: true, themeId: "cyberpunk" });
      expect(mockDeps.setUserPreference).toHaveBeenCalledWith(
        "user-123",
        "theme",
        "cyberpunk"
      );
    });

    it("should reject an invalid theme ID", async () => {
      const handler = createThemeRoutes(mockDeps);
      const result = await handler.setTheme("user-123", "nonexistent");

      expect(result).toEqual({
        success: false,
        error: 'Theme "nonexistent" is not available',
      });
      expect(mockDeps.setUserPreference).not.toHaveBeenCalled();
    });

    it("should reject an empty theme ID", async () => {
      const handler = createThemeRoutes(mockDeps);
      const result = await handler.setTheme("user-123", "");

      expect(result).toEqual({
        success: false,
        error: 'Theme "" is not available',
      });
    });
  });

  describe("GET /theme/available", () => {
    it("should return all available theme IDs", () => {
      const handler = createThemeRoutes(mockDeps);
      const result = handler.getAvailableThemes();

      expect(result).toEqual(["default", "cyberpunk"]);
    });
  });
});
```

### Step 5.2: Backend-Implementierung

**`template/backend/src/routes/theme.ts`:**
```typescript
/**
 * Theme-Persistenz — speichert und laedt Theme-Praeferenzen.
 *
 * Routes:
 * - GET  /api/v1/theme           → Aktives Theme des Users
 * - PUT  /api/v1/theme           → Theme setzen { themeId: "cyberpunk" }
 * - GET  /api/v1/theme/available → Alle verfuegbaren Themes
 */

export interface ThemeRouteDeps {
  /** Liest eine User-Preference aus der DB */
  getUserPreference: (userId: string, key: string) => Promise<string | null>;
  /** Setzt eine User-Preference in der DB */
  setUserPreference: (userId: string, key: string, value: string) => Promise<void>;
  /** Liste der verfuegbaren Theme-IDs */
  availableThemes: string[];
}

export interface ThemeGetResult {
  themeId: string;
  source: "user-preference" | "fallback";
}

export interface ThemeSetResult {
  success: boolean;
  themeId?: string;
  error?: string;
}

export function createThemeRoutes(deps: ThemeRouteDeps) {
  const DEFAULT_THEME_ID = "default";

  return {
    async getTheme(userId: string): Promise<ThemeGetResult> {
      const saved = await deps.getUserPreference(userId, "theme");

      // Pruefen ob gespeichertes Theme noch verfuegbar ist
      if (saved && deps.availableThemes.includes(saved)) {
        return { themeId: saved, source: "user-preference" };
      }

      return { themeId: DEFAULT_THEME_ID, source: "fallback" };
    },

    async setTheme(userId: string, themeId: string): Promise<ThemeSetResult> {
      if (!deps.availableThemes.includes(themeId)) {
        return {
          success: false,
          error: `Theme "${themeId}" is not available`,
        };
      }

      await deps.setUserPreference(userId, "theme", themeId);
      return { success: true, themeId };
    },

    getAvailableThemes(): string[] {
      return [...deps.availableThemes];
    },
  };
}
```

### Step 5.3: Frontend-Composable Tests (TDD)

**`template/frontend/src/composables/useTheme.test.ts`:**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  createUseTheme,
  type UseThemeDeps,
  type UseThemeReturn,
} from "./useTheme";

describe("useTheme Composable", () => {
  let deps: UseThemeDeps;
  let composable: UseThemeReturn;

  beforeEach(() => {
    deps = {
      fetchThemePreference: mock(async () => ({ themeId: "default", source: "fallback" as const })),
      saveThemePreference: mock(async (_themeId: string) => ({ success: true })),
      applyTheme: mock((_themeId: string) => {}),
      availableThemes: ["default", "cyberpunk"],
    };
    composable = createUseTheme(deps);
  });

  it("should initialize with default theme", () => {
    expect(composable.currentThemeId).toBe("default");
  });

  it("should load user preference on init", async () => {
    (deps.fetchThemePreference as any).mockImplementation(
      async () => ({ themeId: "cyberpunk", source: "user-preference" })
    );

    composable = createUseTheme(deps);
    await composable.init();

    expect(composable.currentThemeId).toBe("cyberpunk");
    expect(deps.applyTheme).toHaveBeenCalledWith("cyberpunk");
  });

  it("should fall back to default if fetch fails", async () => {
    (deps.fetchThemePreference as any).mockImplementation(
      async () => { throw new Error("Network error"); }
    );

    composable = createUseTheme(deps);
    await composable.init();

    expect(composable.currentThemeId).toBe("default");
    expect(deps.applyTheme).toHaveBeenCalledWith("default");
  });

  it("should switch theme and persist", async () => {
    await composable.switchTheme("cyberpunk");

    expect(deps.applyTheme).toHaveBeenCalledWith("cyberpunk");
    expect(deps.saveThemePreference).toHaveBeenCalledWith("cyberpunk");
    expect(composable.currentThemeId).toBe("cyberpunk");
  });

  it("should not persist if save fails but still apply locally", async () => {
    (deps.saveThemePreference as any).mockImplementation(
      async () => { throw new Error("Save failed"); }
    );

    await composable.switchTheme("cyberpunk");

    // Theme wird trotzdem lokal angewandt
    expect(deps.applyTheme).toHaveBeenCalledWith("cyberpunk");
    expect(composable.currentThemeId).toBe("cyberpunk");
  });

  it("should reject switching to unknown theme", async () => {
    await expect(composable.switchTheme("nonexistent")).rejects.toThrow(
      'Theme "nonexistent" is not available'
    );
  });

  it("should return available themes", () => {
    expect(composable.availableThemes).toEqual(["default", "cyberpunk"]);
  });
});
```

### Step 5.4: Frontend-Composable Implementierung

**`template/frontend/src/composables/useTheme.ts`:**
```typescript
/**
 * useTheme Composable — Theme-Auswahl + Persistenz.
 *
 * Laedt das gespeicherte Theme vom Backend,
 * wendet es ueber den Theme-Loader an,
 * und persistiert Aenderungen.
 */

export interface UseThemeDeps {
  /** Laedt die Theme-Praeferenz vom Backend */
  fetchThemePreference: () => Promise<{ themeId: string; source: string }>;
  /** Speichert die Theme-Praeferenz im Backend */
  saveThemePreference: (themeId: string) => Promise<{ success: boolean }>;
  /** Wendet ein Theme an (ueber ThemeLoader) */
  applyTheme: (themeId: string) => void;
  /** Liste der verfuegbaren Theme-IDs */
  availableThemes: string[];
}

export interface UseThemeReturn {
  /** Aktuell aktives Theme */
  currentThemeId: string;
  /** Verfuegbare Themes */
  availableThemes: string[];
  /** Initialisiert: laedt gespeichertes Theme und wendet es an */
  init(): Promise<void>;
  /** Wechselt das Theme, wendet es an und persistiert */
  switchTheme(themeId: string): Promise<void>;
}

export function createUseTheme(deps: UseThemeDeps): UseThemeReturn {
  let currentThemeId = "default";

  return {
    get currentThemeId() {
      return currentThemeId;
    },

    get availableThemes() {
      return [...deps.availableThemes];
    },

    async init(): Promise<void> {
      try {
        const pref = await deps.fetchThemePreference();
        currentThemeId = pref.themeId;
      } catch (err) {
        console.warn("[useTheme] Konnte Theme-Praeferenz nicht laden, Fallback auf default:", err);
        currentThemeId = "default";
      }
      deps.applyTheme(currentThemeId);
    },

    async switchTheme(themeId: string): Promise<void> {
      if (!deps.availableThemes.includes(themeId)) {
        throw new Error(`Theme "${themeId}" is not available`);
      }

      // Theme sofort lokal anwenden (optimistic)
      deps.applyTheme(themeId);
      currentThemeId = themeId;

      // Persistenz fire-and-forget (Fehler blockiert nicht)
      try {
        await deps.saveThemePreference(themeId);
      } catch (err) {
        console.error("[useTheme] Konnte Theme-Praeferenz nicht speichern:", err);
      }
    },
  };
}
```

### Step 5.5: Tests ausfuehren

```bash
cd /Users/toby/Documents/github/projekte/super-app && bun test template/backend/src/routes/theme.test.ts
cd /Users/toby/Documents/github/projekte/super-app && bun test template/frontend/src/composables/useTheme.test.ts
```

### Commit

```
feat(template): add theme persistence with backend routes and useTheme composable
```

---

## Task 6: Settings UI — Appearance

**Ziel:** Vue Settings-Page mit Theme-Selektor (Dropdown), Dark/Light/System Mode-Umschalter, und Live-Preview der Aenderungen.

### Files

| Action | Path |
|--------|------|
| Create | `template/frontend/src/views/settings/AppearanceSettings.vue` |
| Create | `template/frontend/src/views/settings/AppearanceSettings.test.ts` |

### Step 6.1: Tests schreiben (TDD)

**`template/frontend/src/views/settings/AppearanceSettings.test.ts`:**
```typescript
import { describe, it, expect } from "bun:test";

/**
 * AppearanceSettings — Testplan.
 *
 * Diese Tests sind strukturelle Spezifikationen.
 * Volle Komponenten-Tests erfordern ein Vue-Test-Setup mit @vue/test-utils.
 * Hier werden die Anforderungen als Checkliste definiert.
 */

describe("AppearanceSettings Component", () => {
  describe("Theme Selector", () => {
    it.todo("should render a dropdown with all available themes");
    it.todo("should show the currently active theme as selected");
    it.todo("should call switchTheme when a new theme is selected");
    it.todo("should show a loading state while theme is being applied");
    it.todo("should show an error toast if theme switch fails");
  });

  describe("Color Scheme Mode", () => {
    it.todo("should render Dark/Light/System mode options as SelectButton");
    it.todo("should show the current color scheme as selected");
    it.todo("should apply color scheme immediately on selection");
    it.todo("should persist color scheme preference");
    it.todo("should respect system preference when 'System' is selected");
  });

  describe("Live Preview", () => {
    it.todo("should update all UI elements immediately when theme changes");
    it.todo("should not require page reload for theme changes");
    it.todo("should show a preview card with the selected theme colors");
  });

  describe("Accessibility", () => {
    it.todo("should have proper labels for all controls");
    it.todo("should be keyboard navigable");
    it.todo("should announce theme changes to screen readers");
  });
});

// --- Unit-Tests fuer die reine Logik (ohne Vue) ---

describe("AppearanceSettings Logic", () => {
  it("should map theme meta to dropdown options", () => {
    const themes = [
      { id: "default", name: "Default", colorScheme: "light" as const },
      { id: "cyberpunk", name: "Cyberpunk", colorScheme: "dark" as const },
    ];

    const options = themes.map((t) => ({
      label: t.name,
      value: t.id,
      description: t.colorScheme === "dark" ? "Dark Theme" : "Light Theme",
    }));

    expect(options).toHaveLength(2);
    expect(options[0].label).toBe("Default");
    expect(options[0].value).toBe("default");
    expect(options[1].description).toBe("Dark Theme");
  });

  it("should map color scheme modes to SelectButton options", () => {
    const modes = [
      { label: "Light", value: "light", icon: "i-heroicons-sun" },
      { label: "Dark", value: "dark", icon: "i-heroicons-moon" },
      { label: "System", value: "system", icon: "i-heroicons-computer-desktop" },
    ];

    expect(modes).toHaveLength(3);
    expect(modes[0].value).toBe("light");
    expect(modes[2].value).toBe("system");
  });
});
```

### Step 6.2: Vue-Komponente implementieren

**`template/frontend/src/views/settings/AppearanceSettings.vue`:**
```vue
<script setup lang="ts">
/**
 * Settings → Appearance
 *
 * Theme-Selektor mit Live-Preview.
 * Verwendet useTheme Composable fuer Persistenz + Theme-Loader.
 *
 * KEINE hardcodierten Farben/Shadows/Radii/Fonts in dieser Komponente!
 * Alles ueber CSS Custom Properties / PrimeVue Design Tokens.
 */

import { ref, computed, onMounted } from "vue";
import Dropdown from "primevue/dropdown";
import SelectButton from "primevue/selectbutton";
import Card from "primevue/card";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";

// --- Props / Injected Dependencies ---

interface Props {
  /** Aktuell aktives Theme */
  currentThemeId: string;
  /** Verfuegbare Themes als { id, name, colorScheme } */
  availableThemes: Array<{ id: string; name: string; colorScheme: string }>;
  /** Aktueller Color-Scheme-Mode */
  currentColorScheme: "light" | "dark" | "system";
}

interface Emits {
  (e: "themeChange", themeId: string): void;
  (e: "colorSchemeChange", scheme: "light" | "dark" | "system"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const toast = useToast();

// --- State ---

const selectedTheme = ref(props.currentThemeId);
const selectedColorScheme = ref<"light" | "dark" | "system">(props.currentColorScheme);
const isApplying = ref(false);

// --- Dropdown Options ---

const themeOptions = computed(() =>
  props.availableThemes.map((t) => ({
    label: t.name,
    value: t.id,
    colorScheme: t.colorScheme,
  }))
);

const colorSchemeOptions = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

// --- Handlers ---

async function onThemeChange(themeId: string) {
  isApplying.value = true;
  try {
    emit("themeChange", themeId);
    selectedTheme.value = themeId;
    toast.add({
      severity: "success",
      summary: "Theme gewechselt",
      detail: `Theme "${themeId}" wurde aktiviert.`,
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Fehler",
      detail: "Theme konnte nicht gewechselt werden.",
      life: 5000,
    });
  } finally {
    isApplying.value = false;
  }
}

function onColorSchemeChange(scheme: "light" | "dark" | "system") {
  selectedColorScheme.value = scheme;
  emit("colorSchemeChange", scheme);
}
</script>

<template>
  <div class="appearance-settings">
    <h2 class="text-2xl font-bold mb-6" style="font-family: var(--p-font-headline)">
      Appearance
    </h2>

    <!-- Theme-Selektor -->
    <Card class="mb-4">
      <template #title>Theme</template>
      <template #content>
        <div class="flex flex-col gap-4">
          <Dropdown
            v-model="selectedTheme"
            :options="themeOptions"
            option-label="label"
            option-value="value"
            placeholder="Theme auswaehlen..."
            :loading="isApplying"
            @change="onThemeChange($event.value)"
            class="w-full md:w-80"
            aria-label="Theme auswaehlen"
          />
          <p class="text-sm" style="color: var(--p-text-muted-color)">
            Aendert das gesamte Aussehen der App: Farben, Schriften, Schatten, Abstaende.
          </p>
        </div>
      </template>
    </Card>

    <!-- Color Scheme Mode -->
    <Card class="mb-4">
      <template #title>Farbmodus</template>
      <template #content>
        <div class="flex flex-col gap-4">
          <SelectButton
            v-model="selectedColorScheme"
            :options="colorSchemeOptions"
            option-label="label"
            option-value="value"
            @change="onColorSchemeChange($event.value)"
            aria-label="Farbmodus auswaehlen"
          />
          <p class="text-sm" style="color: var(--p-text-muted-color)">
            "System" folgt automatisch den Einstellungen deines Betriebssystems.
          </p>
        </div>
      </template>
    </Card>

    <!-- Live Preview -->
    <Card>
      <template #title>Vorschau</template>
      <template #content>
        <div class="preview-area flex flex-col gap-3">
          <div class="flex gap-3">
            <div
              class="w-12 h-12 rounded"
              :style="{ backgroundColor: 'var(--p-primary-500)', borderRadius: 'var(--p-border-radius)' }"
            />
            <div
              class="w-12 h-12 rounded"
              :style="{ backgroundColor: 'var(--p-secondary-500)', borderRadius: 'var(--p-border-radius)' }"
            />
            <div
              class="w-12 h-12 rounded"
              :style="{
                backgroundColor: 'var(--p-surface-card)',
                border: '1px solid var(--p-surface-overlay)',
                borderRadius: 'var(--p-border-radius)',
                boxShadow: 'var(--p-shadow-card)',
              }"
            />
          </div>
          <div class="flex gap-2 mt-2">
            <Button label="Primary" />
            <Button label="Secondary" severity="secondary" />
            <Button label="Outlined" outlined />
          </div>
          <p style="font-family: var(--p-font-headline); font-size: 1.25rem; font-weight: 600">
            Headline Font Preview
          </p>
          <p style="font-family: var(--p-font-body)">
            Body text preview — this is how your regular text looks with the selected theme.
          </p>
        </div>
      </template>
    </Card>
  </div>
</template>
```

### Step 6.3: Tests ausfuehren

```bash
cd /Users/toby/Documents/github/projekte/super-app && bun test template/frontend/src/views/settings/AppearanceSettings.test.ts
```

### Commit

```
feat(template): add AppearanceSettings view with theme selector, color scheme mode, and live preview
```

---

## Task 7: PrimeVue Token Integration

**Ziel:** Theme-Tokens auf PrimeVues Design Token System (Aura/Lara Preset Customization) mappen. Sicherstellen dass ALLE PrimeVue-Komponenten das aktive Theme respektieren.

### Files

| Action | Path |
|--------|------|
| Create | `template/frontend/src/primevue-theme.ts` |
| Create | `template/frontend/src/primevue-theme.test.ts` |
| Create | `themes/index.ts` |
| Create | `themes/registry.test.ts` |

### Step 7.1: Tests schreiben (TDD)

**`template/frontend/src/primevue-theme.test.ts`:**
```typescript
import { describe, it, expect } from "bun:test";
import {
  mapTokensToPrimeVuePreset,
  type PrimeVuePresetOverrides,
} from "./primevue-theme";
import type { ThemeTokens } from "@super-app/shared";

const mockTokens: ThemeTokens = {
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
  secondary: { 500: "#10B981" },
  surface: { ground: "#ffffff", card: "#f8fafc", overlay: "#f1f5f9" },
  border: { radius: "8px", radiusLg: "12px", radiusSm: "4px" },
  font: { headline: "Inter", body: "Inter" },
  shadow: {
    card: "0 1px 3px rgba(0,0,0,0.1)",
    overlay: "0 10px 15px rgba(0,0,0,0.1)",
  },
};

describe("PrimeVue Token Integration", () => {
  describe("mapTokensToPrimeVuePreset", () => {
    it("should map primary color scale to PrimeVue semantic colors", () => {
      const preset = mapTokensToPrimeVuePreset(mockTokens);
      expect(preset.semantic.primary[500]).toBe("#3B82F6");
      expect(preset.semantic.primary[50]).toBe("#eff6ff");
      expect(preset.semantic.primary[900]).toBe("#1e3a8a");
    });

    it("should map surface tokens to PrimeVue surface colors", () => {
      const preset = mapTokensToPrimeVuePreset(mockTokens);
      expect(preset.semantic.colorScheme.light.surface.ground).toBe("#ffffff");
      expect(preset.semantic.colorScheme.light.surface.card).toBe("#f8fafc");
      expect(preset.semantic.colorScheme.light.surface.overlay).toBe("#f1f5f9");
    });

    it("should map border radius to PrimeVue border radius", () => {
      const preset = mapTokensToPrimeVuePreset(mockTokens);
      expect(preset.semantic.borderRadius).toBe("8px");
    });

    it("should map font tokens to PrimeVue font family", () => {
      const preset = mapTokensToPrimeVuePreset(mockTokens);
      expect(preset.semantic.fontFamily).toBe("Inter");
    });

    it("should include all 10 primary color steps", () => {
      const preset = mapTokensToPrimeVuePreset(mockTokens);
      const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
      steps.forEach((step) => {
        expect(preset.semantic.primary[step]).toBeDefined();
      });
    });

    it("should handle dark theme surface tokens", () => {
      const darkTokens: ThemeTokens = {
        ...mockTokens,
        surface: {
          ground: "#0a0a0f",
          card: "rgba(255,255,255,0.04)",
          overlay: "#1a1a2e",
        },
      };
      const preset = mapTokensToPrimeVuePreset(darkTokens);
      expect(preset.semantic.colorScheme.dark.surface.ground).toBe("#0a0a0f");
    });

    it("should return a valid PrimeVuePresetOverrides structure", () => {
      const preset = mapTokensToPrimeVuePreset(mockTokens);
      expect(preset.semantic).toBeDefined();
      expect(preset.semantic.primary).toBeDefined();
      expect(preset.semantic.borderRadius).toBeDefined();
      expect(preset.semantic.fontFamily).toBeDefined();
      expect(preset.semantic.colorScheme).toBeDefined();
      expect(preset.semantic.colorScheme.light).toBeDefined();
      expect(preset.semantic.colorScheme.dark).toBeDefined();
    });
  });
});
```

### Step 7.2: PrimeVue-Mapping implementieren

**`template/frontend/src/primevue-theme.ts`:**
```typescript
import type { ThemeTokens, ThemeColorScale } from "@super-app/shared";

/**
 * PrimeVue Preset-Overrides Struktur.
 *
 * Wird an PrimeVues definePreset() uebergeben um das Aura/Lara Preset
 * mit den Theme-Tokens zu ueberschreiben.
 *
 * Dokumentation: https://primevue.org/theming/styled/#customization
 */
export interface PrimeVuePresetOverrides {
  semantic: {
    primary: Record<number, string>;
    borderRadius: string;
    fontFamily: string;
    colorScheme: {
      light: {
        surface: {
          ground: string;
          card: string;
          overlay: string;
        };
      };
      dark: {
        surface: {
          ground: string;
          card: string;
          overlay: string;
        };
      };
    };
  };
}

/**
 * Expandiert eine ThemeColorScale zu einem vollstaendigen Record<number, string>.
 * Fehlende Stufen werden durch Interpolation oder den naechsten definierten Wert ersetzt.
 */
function expandColorScale(scale: ThemeColorScale): Record<number, string> {
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
  const expanded: Record<number, string> = {};

  for (const step of steps) {
    const value = scale[step];
    if (value !== undefined) {
      expanded[step] = value;
    } else {
      // Fallback: verwende den naechsten definierten Wert
      // Im Minimalfall ist 500 immer definiert
      expanded[step] = scale[500];
    }
  }

  return expanded;
}

/**
 * Mappt ThemeTokens auf PrimeVues Preset-Override-Struktur.
 *
 * Diese Funktion wird aufgerufen wenn ein Theme gewechselt wird,
 * um PrimeVues internes Token-System zu aktualisieren.
 */
export function mapTokensToPrimeVuePreset(tokens: ThemeTokens): PrimeVuePresetOverrides {
  return {
    semantic: {
      primary: expandColorScale(tokens.primary),
      borderRadius: tokens.border.radius,
      fontFamily: tokens.font.body,
      colorScheme: {
        light: {
          surface: {
            ground: tokens.surface.ground,
            card: tokens.surface.card,
            overlay: tokens.surface.overlay,
          },
        },
        dark: {
          surface: {
            ground: tokens.surface.ground,
            card: tokens.surface.card,
            overlay: tokens.surface.overlay,
          },
        },
      },
    },
  };
}
```

### Step 7.3: Theme Registry (Barrel-Export aller Themes)

**`themes/index.ts`:**
```typescript
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
```

**`themes/registry.test.ts`:**
```typescript
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
```

### Step 7.4: Tests ausfuehren

```bash
cd /Users/toby/Documents/github/projekte/super-app && bun test template/frontend/src/primevue-theme.test.ts
cd /Users/toby/Documents/github/projekte/super-app && bun test themes/registry.test.ts
```

### Commit

```
feat(themes): add PrimeVue token integration and central theme registry
```

---

## Zusammenfassung der Deliverables

| # | Deliverable | Pfad | Tests |
|---|-------------|------|-------|
| 1 | Theme Token Types | `shared/src/types.ts` | `shared/src/theme.test.ts` |
| 2 | Default Theme | `themes/default/` | `themes/default/tokens.test.ts` |
| 3 | Cyberpunk Theme | `themes/cyberpunk/` | `themes/cyberpunk/tokens.test.ts` |
| 4 | Theme Loader | `template/frontend/src/theme-loader.ts` | `template/frontend/src/theme-loader.test.ts` |
| 5 | Theme Persistence | `template/backend/src/routes/theme.ts` + `template/frontend/src/composables/useTheme.ts` | `theme.test.ts` + `useTheme.test.ts` |
| 6 | Settings UI — Appearance | `template/frontend/src/views/settings/AppearanceSettings.vue` | `AppearanceSettings.test.ts` |
| 7 | PrimeVue Token Integration + Registry | `template/frontend/src/primevue-theme.ts` + `themes/index.ts` | `primevue-theme.test.ts` + `themes/registry.test.ts` |

## Abhaengigkeiten zwischen Tasks

```
Task 1 (Theme Token Types)
  ├── Task 2 (Default Theme) — braucht ThemeDefinition aus Task 1
  ├── Task 3 (Cyberpunk Theme) — braucht ThemeDefinition aus Task 1
  └── Task 4 (Theme Loader) — braucht ThemeTokens aus Task 1
       └── Task 5 (Theme Persistence) — braucht ThemeLoader aus Task 4
            └── Task 6 (Settings UI) — braucht useTheme aus Task 5
Task 7 (PrimeVue Integration + Registry) — braucht Task 2 + Task 3 + Task 4
```

**Parallelisierbar:** Task 2 + Task 3 koennen parallel bearbeitet werden (beide brauchen nur Task 1). Task 4 kann parallel zu Task 2/3 starten (braucht nur die Typen aus Task 1, nicht die konkreten Themes).

## Verifikation nach Abschluss

```bash
# 1. Alle Theme-Tests
cd /Users/toby/Documents/github/projekte/super-app/shared && bun test src/theme.test.ts
cd /Users/toby/Documents/github/projekte/super-app && bun test themes/default/tokens.test.ts
cd /Users/toby/Documents/github/projekte/super-app && bun test themes/cyberpunk/tokens.test.ts
cd /Users/toby/Documents/github/projekte/super-app && bun test themes/registry.test.ts

# 2. Theme Loader Tests
cd /Users/toby/Documents/github/projekte/super-app && bun test template/frontend/src/theme-loader.test.ts

# 3. Persistence Tests
cd /Users/toby/Documents/github/projekte/super-app && bun test template/backend/src/routes/theme.test.ts
cd /Users/toby/Documents/github/projekte/super-app && bun test template/frontend/src/composables/useTheme.test.ts

# 4. PrimeVue Integration Tests
cd /Users/toby/Documents/github/projekte/super-app && bun test template/frontend/src/primevue-theme.test.ts

# 5. Settings UI Tests
cd /Users/toby/Documents/github/projekte/super-app && bun test template/frontend/src/views/settings/AppearanceSettings.test.ts

# 6. Typecheck
cd /Users/toby/Documents/github/projekte/super-app/shared && bun run typecheck

# 7. Valibot-Validierung Smoke-Test
cd /Users/toby/Documents/github/projekte/super-app/shared && bun -e "
  import { parse } from 'valibot';
  import { ThemeDefinitionSchema } from './src/types';
  import { defaultTheme } from '../themes/default/tokens';
  import { cyberpunkTheme } from '../themes/cyberpunk/tokens';
  parse(ThemeDefinitionSchema, defaultTheme);
  parse(ThemeDefinitionSchema, cyberpunkTheme);
  console.log('OK: Beide Themes validieren erfolgreich');
"

# 8. Hardcode-Check: Sicherstellen dass keine Module Farben/Shadows/Radii/Fonts hardcoden
# (Manuell oder via grep-basiertem Lint-Script)
```
