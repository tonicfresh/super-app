# Testing Patterns

**Analysis Date:** 2026-04-02

## Test Framework

**Runner:**
- Bun built-in test runner (no external test framework)
- Import: `import { describe, it, expect, mock, beforeEach, afterEach, beforeAll } from "bun:test"`
- Native to Bun — no configuration needed

**Assertion Library:**
- Bun's built-in assertions: `expect(value).toBe(expected)`, `expect(fn).toHaveBeenCalled()`, etc.
- No external library (Jest/Vitest compatibility built-in)

**Run Commands:**
```bash
# Backend: Run tests (Bun discovers *.test.ts files)
cd template/backend
bun test

# Frontend: Run tests
cd template/frontend
# No dedicated test command — tests are run via Bun in CI

# Run specific test file
bun test template/backend/src/ai/cost-tracking.test.ts

# Watch mode (not officially documented, but Bun supports --watch)
bun --watch template/backend/src/ai/cost-tracking.test.ts
```

## Test File Organization

**Location:**
- Co-located with source: Same directory as `.ts` file
- Pattern: `[name].ts` → `[name].test.ts`
- Example: `template/frontend/src/composables/useTheme.ts` → `template/frontend/src/composables/useTheme.test.ts`

**Naming:**
- Always `[name].test.ts` (never `.spec.ts`)
- Test files excluded from builds: `tsconfig.json` has `"exclude": ["**/*.test.ts"]`

**Structure:**
```
template/backend/
├── src/
│   ├── ai/
│   │   ├── cost-tracking.ts
│   │   ├── cost-tracking.test.ts
│   │   ├── privacy.ts
│   │   └── privacy.test.ts
│   ├── auth/
│   │   ├── index.ts
│   │   └── index.test.ts
│   └── services/
│       ├── approval.ts
│       └── approval.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

describe("Feature Name", () => {
  // Setup
  let deps: FeatureDeps;
  
  beforeEach(() => {
    deps = {
      externalFunc: mock(async () => ({ data: "mock" })),
      otherFunc: mock(() => "result"),
    };
  });

  describe("Specific Functionality", () => {
    it("should do something specific", async () => {
      // Arrange
      const input = "test";
      
      // Act
      const result = await functionUnderTest(input);
      
      // Assert
      expect(result).toBe("expected");
      expect(deps.externalFunc).toHaveBeenCalledWith(input);
    });

    it("should handle error case", async () => {
      (deps.externalFunc as any).mockImplementation(
        async () => { throw new Error("Network error"); }
      );
      
      await expect(functionUnderTest()).rejects.toThrow("Network error");
    });
  });
});
```

**Patterns:**

1. **Nested `describe()` blocks:** Organize related tests
   ```typescript
   describe("Feature Name", () => {
     describe("Specific Functionality", () => {
       it("should...", () => { ... });
     });
   });
   ```

2. **Setup with `beforeEach()`:** Reset mocks and deps per test
   ```typescript
   beforeEach(() => {
     deps = {
       fetchThemePreference: mock(async () => ({ themeId: "default", source: "fallback" as const })),
       saveThemePreference: mock(async (_themeId: string) => ({ success: true })),
     };
     composable = createUseTheme(deps);
   });
   ```

3. **Cleanup with `afterEach()`:** Reset database state, timers, etc.
   ```typescript
   afterEach(async () => {
     await getDb().delete(users).where(eq(users.email, TEST_EMAIL));
   });
   ```

4. **One-time setup with `beforeAll()`:** Database connection, init test data
   ```typescript
   beforeAll(async () => {
     await createDatabaseClient();
     await waitForDbConnection();
   });
   ```

## Mocking

**Framework:** Bun's built-in `mock()` function

**Patterns:**

1. **Mock async functions:**
   ```typescript
   const fetchMock = mock(async (url: string) => {
     return new Response("OK", { status: 200 });
   });
   ```

2. **Mock with side effects:**
   ```typescript
   const insertMock = mock(async (_values: any) => {});
   ```

3. **Change mock behavior mid-test:**
   ```typescript
   (deps.fetchThemePreference as any).mockImplementation(
     async () => ({ themeId: "cyberpunk", source: "user-preference" })
   );
   ```

4. **Verify calls:**
   ```typescript
   expect(fetchMock).toHaveBeenCalledTimes(1);
   const [url, options] = fetchMock.mock.calls[0];
   expect(url).toBe("https://costs.example.com/api/costs");
   ```

5. **Mock with conditional behavior:**
   ```typescript
   const fetchMock = mock(async (url: string) => {
     if (url.includes("error")) {
       throw new Error("Network error");
     }
     return new Response("OK", { status: 200 });
   });
   ```

**What to Mock:**
- External dependencies (APIs, databases, file system)
- Any `async` function that talks to outside world
- User interactions (in frontend tests)
- Time-dependent functions (could use timers)

**What NOT to Mock:**
- Core validation logic (should test actual behavior)
- Pure functions (no need to mock, test directly)
- Drizzle queries in integration tests (use real test DB)

## Fixtures and Factories

**Test Data:**

1. **Fixed test constants** (at top of file):
   ```typescript
   const TEST_EMAIL = "test-user@example.com";
   const TEST_PASSWORD = "test-password";
   const TEST_INVITATION_CODE = "test-code";
   const TEST_ORGANISATION_1 = {
     id: "00000000-1111-1111-1111-000000000001",
     name: "Test Organisation 1",
   };
   ```

2. **Data factory functions** (for initialization):
   ```typescript
   export const initTestUsers = async () => {
     for (const user of TEST_USERS) {
       const hash = await saltAndHashPassword(user.password);
       await getDb().insert(users).values({ ...user, password: hash });
     }
   };
   ```

3. **Global init function:**
   ```typescript
   export const initTests = async () => {
     await createDatabaseClient();
     await waitForDbConnection();
     await initTestOrganisations().catch(err => console.info("Error", err));
     await initTestUsers().catch(err => console.info("Error", err));
     // ...return tokens for auth
     return { user1Token, user2Token, adminToken, password };
   };
   ```

**Location:**
- Global fixtures: `template/backend/framework/src/test/init.test.ts` — Exported for import in other tests
- Example import: `import { TEST_ORG1_USER_1, initTests } from "../test/init.test"`
- Fixture exports are used in multiple test files across the codebase

## Coverage

**Requirements:** Not enforced (no coverage thresholds configured)

**Current Status:** No coverage reports generated

**View Coverage:**
- No official command documented in package.json
- To add coverage: Would need to configure Bun's test runner with `--coverage` flag (requires Bun >= 1.x)

## Test Types

**Unit Tests:**
- **Scope:** Single function or composable in isolation
- **Approach:** Mock all external dependencies
- **Example:** `useTheme.test.ts` — Tests composable factory, mocks all backend calls
  ```typescript
  describe("useTheme Composable", () => {
    it("should initialize with default theme", () => { ... });
    it("should load user preference on init", async () => { ... });
  });
  ```

**Integration Tests:**
- **Scope:** Multiple components working together (e.g., service + database)
- **Approach:** Use real test database, real fixtures, mocked external APIs
- **Example:** `framework/src/lib/auth/index.test.ts` — Tests LocalAuth with real DB
  ```typescript
  beforeAll(async () => {
    await createDatabaseClient();
    await waitForDbConnection();
  });
  
  describe("LocalAuth", async () => {
    it("should register and authorize", async () => {
      const user = await LocalAuth.register(email, password, false, { invitationCode });
      expect(user.email).toBe(email);
    });
  });
  ```

**E2E Tests:**
- **Framework:** Not used
- **Status:** No end-to-end test suite configured
- **Note:** Could be added via Playwright/Cypress if needed

## Common Patterns

**Async Testing:**
```typescript
// Using async/await
it("should load preference and apply theme", async () => {
  composable = createUseTheme(deps);
  await composable.init();
  expect(composable.currentThemeId).toBe("cyberpunk");
});

// Using expect().resolves
await expect(composable.switchTheme("cyberpunk")).resolves.toBeUndefined();

// Testing rejection
await expect(composable.switchTheme("nonexistent")).rejects.toThrow(
  'Theme "nonexistent" is not available'
);
```

**Error Testing:**
```typescript
// Mock function to throw
(deps.fetchThemePreference as any).mockImplementation(
  async () => { throw new Error("Network error"); }
);

// Test graceful handling
await composable.init();
expect(composable.currentThemeId).toBe("default"); // Falls back

// Test error is re-thrown
await expect(someFunction()).rejects.toThrow("Expected message");
```

**Fire-and-forget Operations:**
```typescript
// Validate that operation doesn't throw even if internal logging fails
const internalLog = mock(async () => {
  throw new Error("DB connection lost");
});
const tracker = createCostTracker({ logInternal: internalLog });

// Should NOT throw
await expect(tracker.log(sampleEntry)).resolves.toBeUndefined();
```

**Testing Middleware & HTTP Routes:**
```typescript
// Create test Hono app with dependencies
function createTestApp(deps: ChatRouteDeps = mockDeps) {
  const app = new Hono();
  defineChatRoutes(app, "/api/v1", deps);
  return app;
}

// Test endpoint
const app = createTestApp();
const res = await app.request("/api/v1/ai/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "hello" }),
});

expect(res.status).toBe(200);
const body = await res.json();
expect(body.success).toBe(true);
```

**Testing Validation (Valibot):**
```typescript
import { parse } from "valibot";

it("should validate correct data", () => {
  const validData = { success: true };
  const result = parse(RESPONSE_VALIDATORS.SUCCESS, validData);
  expect(result).toEqual(validData);
});

it("should reject invalid data", () => {
  const invalidData = { success: "not-a-boolean" };
  try {
    parse(RESPONSE_VALIDATORS.SUCCESS, invalidData);
    throw new Error("Should have thrown");
  } catch (e: any) {
    expect(e).toBeInstanceOf(Error);
  }
});
```

## Test Statistics

- **Total test files:** ~123
- **Backend framework tests:** ~63 test files (auth, database, knowledge, jobs, routes, etc.) — **Hinweis: Framework ist ein Sub-Submodule, diese Tests gehoeren nicht zur Super-App selbst**
- **Backend app tests:** ~32 test files (AI system, cost tracking, module registry, auth, settings)
- **Module tests:** ~10 test files (todos, mission-control)
- **Frontend tests:** ~10 test files (composables, routes, stores, theme)
- **Shared tests:** ~8 test files (cost tracking, types, guardrails)

**Wichtig:** Ueber die Haelfte der Tests (63 von 123) stammen aus dem Framework-Submodule, nicht aus der Super-App. Die Super-App selbst hat ~60 eigene Testdateien.

## Test Quality Observations

**Strengths:**
- Excellent async/error handling testing
- Dependency injection makes testing straightforward
- Fire-and-forget patterns properly validated (don't throw)
- Database tests properly isolated (beforeAll/beforeEach cleanup)
- Mock-based composable testing is thorough

**Gaps:**
- No E2E tests (browser automation)
- No coverage reporting configured
- Minimal frontend component testing (mostly composables/utilities)
- No snapshot testing

---

*Testing analysis: 2026-04-02*
