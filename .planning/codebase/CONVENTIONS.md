# Coding Conventions

**Analysis Date:** 2026-04-02

## Naming Patterns

**Files:**
- Components: `PascalCase.vue` (e.g., `PushSettings.vue`, `Default.vue`)
- Test files: `[name].test.ts` (co-located with source)
- Utilities: `camelCase.ts` (e.g., `fetcher.ts`, `date.ts`)
- Composables: `use[Feature].ts` (e.g., `useTheme.ts`, `usePasskey.ts`)
- Stores (Pinia): `camelCase.ts` (e.g., `authStore.ts`, `main.ts`)
- Schema/Database: `schema.ts`
- Configuration: `[name].config.ts` (e.g., `drizzle.config.ts`)

**Functions:**
- Composable factories: `createUse[Feature]()` — Takes deps object, returns composable interface
- Route handlers: `define[Feature]Routes()` — Takes app, path, deps, returns void
- Service creators: `create[Service]()` — Returns service object/class
- Example: `createUseTheme(deps)`, `defineSettingsRoutes(app, path, deps)`, `createCostTracker(deps)`

**Variables:**
- camelCase for all variables and constants
- UPPERCASE_SNAKE_CASE only for immutable test fixtures (e.g., `TEST_EMAIL`, `TEST_PASSWORD`)
- Single-letter variables avoided; prefer descriptive names
- Private/internal: prefix with underscore in class context

**Types:**
- PascalCase for interfaces and types
- Suffix convention: `[Feature]Deps` for dependency interfaces, `[Feature]Return` for return types
- Example: `UseThemeDeps`, `UseThemeReturn`, `SettingsRouteDeps`, `CostTrackerDeps`

## Code Style

**Formatting:**
- **Frontend:** Prettier 3.6.2
  - Config file: `template/frontend/.prettierrc.json`
  - No semicolons: `semi: false`
  - Single quotes: `singleQuote: true`
  - Line width: 80 characters
  - Run: `bun run format` in frontend directory

- **Backend:** Prettier 3.8.1
  - No linter config file — uses Prettier defaults
  - Consistent with frontend (no semicolons, single quotes)

**Linting:**
- No ESLint or dedicated linter configured
- TypeScript strict mode enforced in all `tsconfig.json`
- Type-checking: `bun run type-check` (Vue)

**Import Organization:**
- Order:
  1. Framework/library imports (e.g., `import { ... } from "bun:test"`)
  2. Package imports (e.g., `import { Hono } from "hono"`)
  3. Internal framework imports (e.g., `import { ... } from "@framework/..."`)
  4. App-specific imports (e.g., `import { ... } from "./..."`)
  5. Type imports grouped with their module

**Example (from test files):**
```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { LocalAuth } from "./index";
import { createDatabaseClient, getDb } from "../db/db-connection";
import type { UsersSelect } from "../db/db-schema";
```

**Path Aliases:**
- `@framework` → `template/backend/framework/src`
- `@super-app/shared` → `shared/src`
- No aliases configured for relative imports — use relative paths

## Error Handling

**Patterns:**
- **Fire-and-forget with try-catch:**
  ```typescript
  // Don't block calling code, log error silently
  try {
    await deps.saveThemePreference(themeId);
  } catch (err) {
    console.error("[useTheme] Could not save preference:", err);
  }
  ```

- **Throw on critical paths:**
  ```typescript
  if (!deps.availableThemes.includes(themeId)) {
    throw new Error(`Theme "${themeId}" is not available`);
  }
  ```

- **Database errors in tests:**
  ```typescript
  // Swallow expected test data errors
  await initTestOrganisations().catch((err) => {
    console.info("Error initialising test tenants", err);
  });
  ```

- **HTTP errors (Hono):**
  ```typescript
  throw new HTTPException(400, { message: "Invalid input" });
  ```

- **Validation errors (Valibot):**
  ```typescript
  const result = parse(RESPONSE_VALIDATORS.SUCCESS, data);
  // If invalid, parse() throws ValiError automatically
  ```

**Guidelines:**
- Sensitive operations (auth, payments): throw and let middleware handle
- UI operations (theme, preferences): catch, log, don't block user
- Database operations: catch and log, decide if operation is essential
- External API calls: catch, log, may have fallback behavior

## Logging

**Framework:** `console` (no external logging library)

**Patterns:**
- Prefix with `[module]` for context: `console.warn("[auth] ...")`, `console.error("[useTheme] ...")`
- Log level usage:
  - `console.info()` — Non-critical setup/initialization messages
  - `console.warn()` — Recoverable issues, missing optional data
  - `console.error()` — Actual errors that were caught
- Never log sensitive data (emails, passwords, tokens)
- Always log enough context to debug (function name, operation, error type)

**Example:**
```typescript
console.warn("[useTheme] Could not load preference, falling back to default:", err);
console.error("[useTheme] Could not save preference:", err);
console.info("Error initialising test tenants", err);
```

## Comments

**When to Comment:**
- JSDoc on public functions and types
- Inline comments for non-obvious business logic or workarounds
- Avoid obvious comments (e.g., don't comment `const x = 5;`)
- German comments acceptable for business logic explanations

**JSDoc/TSDoc:**
- Used on public API functions (composables, route handlers, services)
- Parameters documented with `@param`
- Return type documented with `@returns` (though TypeScript handles most)
- Example from codebase:
  ```typescript
  /**
   * useTheme Composable — Theme-Auswahl + Persistenz.
   *
   * Laedt das gespeicherte Theme vom Backend,
   * wendet es ueber den Theme-Loader an,
   * und persistiert Aenderungen.
   */
  ```

## Function Design

**Size:**
- Target: < 50 lines for single-responsibility
- Composables: 30-60 lines typical (setup + getters + methods)
- Test suites: 10-30 lines per test case

**Parameters:**
- Prefer dependency injection objects over multiple parameters
- Example: `createUseTheme(deps)` where `deps: UseThemeDeps` contains all needed functions
- Maximum 3-4 parameters; beyond that use object pattern

**Return Values:**
- Composables return object with getters and async methods
- Services return typed objects (not void)
- Tests use `expect()` — no return values
- Example composable return:
  ```typescript
  return {
    get currentThemeId() { return currentThemeId; },
    get availableThemes() { return [...deps.availableThemes]; },
    async init(): Promise<void> { ... },
    async switchTheme(themeId: string): Promise<void> { ... },
  };
  ```

## Module Design

**Exports:**
- Named exports for types and functions
- Example:
  ```typescript
  export interface UseThemeDeps { ... }
  export function createUseTheme(deps: UseThemeDeps): UseThemeReturn { ... }
  ```
- No default exports in utility/service files

**Barrel Files:**
- Used in framework: `template/backend/framework/src/index.ts` exports core types
- Not used in app-level modules (import from specific files)

**Module Structure (Backend):**
- Feature = Directory with related code
- Each feature directory contains:
  - `schema.ts` — Drizzle table definitions
  - `routes.ts` or `[name].routes.ts` — HTTP endpoints
  - `[name].test.ts` — Tests (co-located)
  - Service files (`[name].ts` with business logic)

**Module Structure (Frontend):**
- Components: `src/components/`
- Composables: `src/composables/`
- Stores: `src/stores/`
- Utils: `src/utils/`
- Each composable/store has co-located `.test.ts` file

## Validation

**Framework:** Valibot (NOT Zod)
- All input validation uses Valibot schemas
- Example: `v.object({ tenantId: v.string() })`
- Route handlers use `@hono/valibot-validator` middleware
- Cost tracking validates numerics: `tokensInput >= 0`, `costUsd >= 0`

## Privacy & Security

**Sensitive Data Handling:**
- LLM context: Never send actual user data, only IDs and flags
- Tool responses: Check with `containsSensitiveData()` before passing to LLM
- Patterns defined in `template/backend/src/ai/privacy.ts` (email, phone, password, API keys)
- Cost tracking: Never log actual email/phone in cost entries

---

*Convention analysis: 2026-04-02*
