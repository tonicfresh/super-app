# Codebase Concerns

**Analysis Date:** 2026-04-02

---

## Tech Debt

### 1. Incomplete AI System Initialization

**Issue:** Multiple TODO placeholders in AI system setup prevent full functionality at runtime.

**Files:** `template/backend/src/index.ts` (lines 48-86)

**Impact:** 
- Framework secrets/settings integration not wired → `getSecret`, `getSetting` return null
- Database cost logging not connected → `dbInsert`, `queryDailyTotal`, `queryModuleDaily` are no-ops
- Permission checks completely bypassed → all users get full access
- AI model selection hardcoded as null → main agent cannot execute
- Agent step tracking and approval requests not logged to DB
- User notifications (WebSocket/push) not implemented

**Current State:**
```typescript
// template/backend/src/index.ts:48-90
getSecret: async (_name) => null, // TODO: Echte Framework-Secrets-Funktion
getSetting: async (_key) => null, // TODO: Echte Framework-Settings-Funktion
dbInsert: async (_values) => {
  // TODO: db.insert(mcAiCosts).values(_values)
},
checkModuleAccess: async () => true, // Always returns true
model: null as any, // TODO: Model aus aiContext.providers.registry holen
logAgentStepToDB: async (_step) => {}, // TODO: Insert in mc_agent_sessions
storeApprovalRequest: async (_request) => {}, // TODO: Insert in approval_requests
updateApprovalRequest: async (_id, _update) => {}, // TODO: Update in approval_requests
notifyUser: async (_userId, _data) => {}, // TODO: WebSocket + Push Notification
```

**Fix Approach:**
1. Connect `getSecret`/`getSetting` to Framework's secure storage (Phase 2: Auth & Security)
2. Wire `dbInsert` to Drizzle: `await db.insert(mcAiCosts).values(_values)`
3. Implement real cost queries: `await db.select().from(mcAiCosts).where(...)`
4. Implement `checkModuleAccess` using permissions table (Phase 2)
5. Load default model from `aiContext.providers.registry.models[0]` (Phase 4)
6. Implement approval workflow DB inserts (Phase 5: Mission Control)
7. Implement WebSocket notifications via Mission Control module (Phase 5)

---

### 2. Disabled Permission Check Middleware

**Issue:** The core permission validation middleware is completely disabled with a HACK comment.

**Files:** `template/backend/framework/src/lib/utils/hono-middlewares.ts` (lines 57-68)

**Impact:**
- No path-based authorization enforcement
- All users can access all endpoints regardless of scopes
- Security vulnerability in multi-tenant scenario

**Current State:**
```typescript
export async function checkUserPermission(c: Context, next: Function) {
  // HACK!!!
  await next();
  // const userId = c.get("usersId");
  // const method = c.req.method;
  // const path = c.req.path;
  // const userCanAccess = await hasPermission(userId, method, path);
  // if (!userCanAccess) {
  //   return c.text("Not permitted", 403);
  // }
}
```

**Fix Approach:**
1. Restore permission checking logic against permissions table (Phase 2)
2. Wire to tenant admin routes via `isTenantAdmin` utility (already imported in index.ts)
3. Add permission cache to avoid N+1 queries (leverage existing Redis/Valkey cache in `framework/src/lib/utils/redis-cache.ts`, falls back to in-memory Map)

---

### 3. TypeScript `as any` Type Escapes

**Issue:** 11 instances of `as any` type assertions bypass type safety without documented reason.

**Files:** 
- `template/backend/src/auth/module-auth-middleware.ts` (2×)
- `template/backend/src/ai/index.ts` (1×)
- `template/backend/src/ai/main-agent.ts` (2×)
- `template/backend/src/ai/sub-agent.ts` (4×)
- `template/backend/src/index.ts` (1×: `model: null as any`)
- `template/backend/src/ai/routes/settings.ts` (1×)

**Impact:**
- Silent acceptance of type mismatches in AI model object handling
- Runtime errors if object structure changes
- Difficult to refactor safely

**Examples:**
```typescript
// main-agent.ts:
const provider = (model as any).provider  // Should use proper LanguageModel type
const modelId = (model as any).modelId    // Type should be defined

// index.ts:
model: null as any, // TODO: Model aus aiContext.providers.registry holen
```

**Fix Approach:**
1. Define proper LanguageModel interface in `@super-app/shared` (Phase 1)
2. Export from Vercel AI SDK's type: `import type { LanguageModel } from "ai"`
3. Create provider registry type with `.provider` and `.modelId` properties
4. Update JWT token parsing to use typed schema

---

### 4. Hardcoded Cost Pricing Table

**Issue:** AI cost estimation uses hardcoded pricing with no update mechanism.

**Files:** `template/backend/src/ai/init.ts` (lines 58-82)

**Impact:**
- Pricing becomes stale as provider rates change
- Manual code change required to update rates
- Inconsistent with cost-tracker external forwarding (which uses live API rates)
- Conservative fallback (Claude Sonnet) may overcharge for other models

**Current State:**
```typescript
const pricing: Record<string, { input: number; output: number }> = {
  "claude-sonnet": { input: 3.0, output: 15.0 },
  "claude-haiku": { input: 0.25, output: 1.25 },
  "mistral-large": { input: 2.0, output: 6.0 },
  // ... hardcoded rates for 2026-04
};
```

**Fix Approach:**
1. Move pricing table to Settings (Phase 2)
2. Fetch at runtime: `await config.getSetting("ai.pricing")`
3. Cache with reasonable TTL (1 day)
4. Fallback to cost-tracker's API for live rates during guardrail checks

---

## Known Bugs

### 1. Module Resolution in Docker Container — Fixed

**Issue:** `Cannot find module '../../modules/mission-control/backend/src/plugin'` in Docker.

**Root Cause:** Relative path imports fail because Docker working directory doesn't match workspace resolution.

**Fix Applied:** Symlink added in Dockerfile:
```dockerfile
RUN ln -s /app/modules /app/template/modules
```

**Status:** ✅ RESOLVED (documented in `/docs/FAILS.md`)

---

### 2. Git Submodule Authentication — Fixed

**Issue:** Submodule cloning fails: `fatal: could not read Username for 'https://github.com'`

**Root Cause:** Absolute HTTPS URLs in `.gitmodules` don't inherit parent repo access token.

**Fix Applied:** Changed to relative URLs:
```diff
- url = https://github.com/tonicfresh/template_fullstack-app-toby.git
+ url = ../template_fullstack-app-toby.git
```

**Status:** ✅ RESOLVED (documented in `/docs/FAILS.md`)

---

### 3. Rolldown Export Resolution — Fixed

**Issue:** `"DefaultChatTransport" is not exported by "../../node_modules/ai/dist/index.mjs"`

**Root Cause:** Vite v7 Rolldown bundler cannot resolve valid ESM exports during tree-shaking.

**Fix Applied:** Inline minimal implementation of `SimpleChatTransport` instead of import.

**Status:** ✅ RESOLVED (documented in `/docs/FAILS.md`)

---

## Security Considerations

### 1. Hanko Token Verification Has No Fallback Error Handling

**Issue:** If Hanko token verification fails in `checkToken`, the error propagates unhandled.

**Files:** `template/backend/framework/src/lib/utils/hono-middlewares.ts` (line 75)

**Risk:** 
- Invalid or expired tokens may leak details in error response
- No graceful degradation to alternative auth method
- Hanko downtime blocks all authentication

**Current State:**
```typescript
const { usersEmail, usersId } = await verifyHankoToken(c);
// If verifyHankoToken throws, error bubbles up without catch
```

**Recommendations:**
1. Wrap in try-catch with proper error response
2. Add fallback to JWT-based auth if Hanko fails
3. Implement circuit breaker for Hanko service availability

---

### 2. Privacy System Allows ID-Only Access

**Issue:** Privacy module prevents LLM from seeing sensitive data but allows access by ID alone.

**Files:** `template/backend/src/ai/privacy.ts` (Phase 3 implementation)

**Risk:**
- If user IDs become predictable or enumerable, tool access is compromised
- No rate limiting per user or per ID
- Enumeration attack possible

**Recommendations:**
1. Add rate limiting per user ID at route level
2. Implement ID obscuration (hash + salt)
3. Add audit logging for all ID-based access
4. Require explicit permission grant per resource access

---

### 3. AI Tool Approval Workflow Not Implemented

**Issue:** Sensitive operations (delete, admin actions) require approval but DB storage is stubbed.

**Files:** `template/backend/src/index.ts` (line 79-83)

**Impact:**
- Approval requests silently ignored
- User expectations misaligned with actual permissions
- No audit trail of sensitive operations

**Fix Approach:** Implement in Phase 5 (Mission Control).

---

## Performance Bottlenecks

### 1. Token Validation Cache TTL

**Issue:** Redis/Valkey cache for validated Hanko tokens uses 1-hour TTL, but JWT tokens may not have matching expiration.

**Files:** `template/backend/framework/src/lib/utils/redis-cache.ts`, `template/backend/framework/src/lib/auth/hanko.ts`

**Note:** Redis cache IS implemented (`redis-cache.ts`) with graceful fallback to in-memory Map. Hanko tokens cached with 1h TTL via `setCachedToken()`.

**Remaining Problem:**
- Token revocation not reflected until TTL expires (1 hour window)
- Cache pollution if many invalid tokens attempted (in-memory fallback has no eviction)

**Improvement Path:**
1. Verify TTL matches actual Hanko token expiration
2. Implement token revocation list for early logout
3. Add max-size limit to in-memory fallback Map

---

### 2. Cost Guardrail Checks Query Database on Every AI Call

**Issue:** `queryDailyTotal()` and `queryModuleDaily()` called for every tool execution.

**Files:** `template/backend/src/ai/cost-guardrails.ts`

**Impact:**
- Database query on critical path for every AI step
- Linear scaling with usage
- No pagination or caching of daily totals

**Improvement Path:**
1. Cache daily totals in Redis with 5-minute TTL
2. Batch update instead of point queries
3. Pre-aggregate costs at module level in scheduled job
4. Consider materialized view for daily totals

---

## Fragile Areas

### 1. AI Model Object Structure Undocumented

**Issue:** `model` object passed through system with no formal interface definition.

**Files:**
- `template/backend/src/index.ts` (line 64)
- `template/backend/src/ai/main-agent.ts` (lines accessing `.provider`, `.modelId`)
- `template/backend/src/ai/sub-agent.ts` (same pattern)

**Why Fragile:**
- Properties accessed with `as any` assertions
- No type checking at assignment
- Refactoring Vercel AI SDK types will break silently
- Tests don't validate object shape

**Safe Modification:**
1. Define and export `LanguageModel` interface in `@super-app/shared`
2. Document required properties: `{ provider: string; modelId: string; ... }`
3. Use strict typing in all references
4. Add runtime validation test

**Test Coverage Gaps:** No tests validate model object properties.

---

### 2. Module Registry Entry Points Not Validated

**Issue:** Module plugins registered without schema validation.

**Files:** `template/backend/src/module-registry.ts`

**Fragility:**
- Missing required exports silently fail
- Runtime errors only when AI attempts to call missing tool
- No registration-time validation

**Current Pattern:**
```typescript
registry.register(missionControlPlugin);
// If missionControlPlugin missing .tools, .config, etc, error happens later
```

**Safe Modification:**
1. Add validation schema to `plugin` type in shared
2. Validate on registration: `validatePlugin(plugin)`
3. Fail fast with clear error message
4. Document required plugin structure

---

### 3. Drizzle Schema Tables Lack Prefix Documentation

**Issue:** Different table prefixes used but no enforcement mechanism.

**Files:** Module schemas (not yet created) will use `<moduleName>_` prefix

**Current Pattern:** 
- Framework tables: `base_*`
- App tables: `app_*`
- Module tables: `<moduleName>_*`

**Fragility:**
- Easy to accidentally create `app_todos` instead of `todos_*`
- No linter or schema validator
- Conflicts possible if not careful

**Safe Modification:**
1. Create schema validator script: validate all table names match prefixes
2. Add pre-commit hook to run validator
3. Document in migration template with example
4. Add test to validate schema file structure

---

## Scaling Limits

### 1. Single AI Provider Instance

**Issue:** Main agent uses single model instance from registry.

**Current Capacity:** 
- Sequential tool execution (ToolLoopAgent)
- No parallel tool calls
- Single model for all operations

**Scaling Limit:**
- As modules increase, tool loop gets longer
- AI response time increases linearly with tool count
- No ability to parallelize independent operations

**Scaling Path:**
1. Implement sub-agent routing (Phase 3 design includes this)
2. Route tools to specialized agents in parallel
3. Implement request batching for common operations
4. Consider model-per-module for specialized tasks

---

### 2. PostgreSQL Without Read Replicas

**Issue:** Single PostgreSQL instance for reads and writes.

**Current Setup:** `localhost:5432` in development, single Coolify container in production

**Scaling Limit:**
- Heavy reporting queries block transactional queries
- No horizontal read scaling
- Single point of failure

**Scaling Path:**
1. Add read replica for analytics/logging queries
2. Route Mission Control queries to replica
3. Implement query result caching in Redis
4. Consider sharding by tenant if multi-tenant grows

---

### 3. Hardcoded Cost Limits Not Tenant-Aware

**Issue:** Default cost guardrails (`dailyBudgetUsd: 5.0`) applied to all tenants.

**Current Setup:** Single config for entire system

**Scaling Limit:**
- Different tenants have different budgets
- No way to set per-tenant guardrails
- Settings UI not yet built (Phase 2)

**Scaling Path:**
1. Add `tenant_id` to guardrails configuration
2. Load guardrails per-tenant in `initAI`
3. Implement Settings UI with tenant-level controls (Phase 2)

---

## Dependencies at Risk

### 1. Vercel AI SDK Type Instability

**Risk:** AI SDK exports used as `any` types (DefaultChatTransport removal)

**Impact:** 
- Major version updates may break imports
- Workarounds (inline SimpleChatTransport) increase maintenance burden
- Type definitions lag behind runtime API

**Current Status:** `@ai-sdk/*` pinned to specific versions in package.json

**Mitigation:**
1. Keep `as any` assertions documented with Vercel AI SDK issue links
2. Monitor GitHub releases for breaking changes
3. Test with new major versions before upgrading
4. Consider alternative: use `@ai-sdk/core` for more stable types

---

### 2. Rolldown Bundler Unreliable for Sub-module Imports

**Risk:** Build-time bundling fails for cross-module imports.

**Impact:** 
- Cannot use `bun build` in Docker
- Must use `bun run` directly (slower startup)
- Limited dead-code elimination

**Workaround Applied:** Use native TypeScript execution instead of bundler

**Mitigation:**
1. Monitor Rolldown stability
2. Consider Esbuild as alternative bundler
3. Document Docker runtime limitation
4. Benchmark startup time impact

---

### 3. Bun Version Lockfile Incompatibility

**Risk:** Bun lockfiles incompatible across major versions.

**Impact:**
- CI/Docker failures if local Bun version diverges from Docker-pinned version
- Lockfile conflicts if team members use different Bun versions

**Mitigation Applied:** Pin Bun version in Dockerfile (`FROM oven/bun:1.2.10`)

**Ongoing Risk:**
1. Lokale Bun-Version muss mit Docker-Version uebereinstimmen (aktuell 1.2.10)
2. Pre-upgrade testing before major version bumps
3. Document lockfile regeneration process for team

---

## Missing Critical Features

### 1. Approval Workflow Not Implemented

**Feature Gap:** Permission system design complete but DB storage layer stubbed.

**Blocks:**
- Sensitive module operations cannot require authorization
- Admin oversight of user actions not possible
- Compliance/audit requirements cannot be met

**Status:** Planned for Phase 5 (Mission Control)

---

### 2. User Notifications Not Implemented

**Feature Gap:** System can detect need for approval but cannot notify user.

**Blocks:**
- PWA cannot push notifications about pending tasks
- Approval decisions cannot be communicated back
- Real-time updates not possible

**Status:** Planned for Phase 6 (PWA & Push Notifications)

---

### 3. Settings Persistence Not Implemented

**Feature Gap:** AI guardrails, preferences, permissions all hardcoded or stubbed.

**Blocks:**
- Users cannot customize behavior
- Operators cannot adjust cost limits
- Admin features cannot be configured

**Status:** Planned for Phase 2 (Auth & Security)

---

## Test Coverage Gaps

### 1. E2E Module Integration Not Tested

**Untested Area:** Full flow of module registration → AI tool creation → permission check → execution

**Files:** No integration tests for `module-registry.ts` → `main-agent.ts` → module tools

**Risk:** Silent failure if:
- Module exports wrong shape
- Tool permissions not properly enforced
- Privacy system misconfigured

**Priority:** High (core system)

**Coverage Path:**
1. Create integration test scaffold
2. Mock module plugin with all required exports
3. Test full AI tool execution flow
4. Test permission denials

---

### 2. Hanko Authentication Flow Not Tested

**Untested Area:** WebAuthn token generation, JWT caching, token refresh

**Files:** `template/backend/framework/src/lib/utils/hono-middlewares.ts`, `verifyHankoToken`

**Risk:** 
- Token validation bypasses silently
- Expired tokens accepted
- Cache invalidation issues

**Priority:** High (security-critical)

**Coverage Path:**
1. Test valid token acceptance
2. Test expired token rejection
3. Test cache hit/miss
4. Test malformed token handling

---

### 3. Cost Guardrail Enforcement Not Tested

**Untested Area:** Guardrail checker blocks tools when limits exceeded

**Files:** `template/backend/src/ai/cost-guardrails.ts` (has tests but no integration with main-agent)

**Risk:** 
- Guardrails might be bypassed in real agent execution
- Daily limits not actually enforced

**Priority:** High (financial control)

**Coverage Path:**
1. Test guardrail blocks AI tool execution
2. Test per-module limits
3. Test daily budget reset at midnight
4. Test guardrail notification

---

### 4. Privacy System Not Integration-Tested

**Untested Area:** Privacy mask applied correctly during tool execution

**Files:** `template/backend/src/ai/privacy.ts` and `privacy-integration.test.ts`

**Risk:** 
- Sensitive data might leak to LLM
- Privacy mask not applied in all code paths

**Priority:** High (data protection)

**Current State:** Unit tests exist but no full AI call integration test

**Coverage Path:**
1. Execute AI tool that accesses sensitive resource
2. Verify LLM context contains only masked data
3. Test multiple sensitive resource types

---

## Summary: Priority Map

| Category | Issue | Priority | Phase |
|----------|-------|----------|-------|
| Tech Debt | Incomplete AI init (7 TODOs) | **CRITICAL** | 2-5 |
| Tech Debt | Disabled permission middleware | **CRITICAL** | 2 |
| Tech Debt | TypeScript `as any` escapes | High | 1 |
| Tech Debt | Hardcoded cost pricing | High | 2 |
| Security | Hanko error handling | **CRITICAL** | 2 |
| Security | Privacy ID enumeration risk | Medium | 3 |
| Perf | JWT cache TTL | Medium | 2 |
| Perf | Cost guardrail DB queries | Medium | 4 |
| Fragility | AI model type undefined | High | 1 |
| Fragility | Module registry not validated | High | 3 |
| Fragility | Schema prefix enforcement | Medium | 3 |
| Tests | E2E module integration | High | 3 |
| Tests | Hanko auth flow | **CRITICAL** | 2 |
| Tests | Cost guardrail enforcement | **CRITICAL** | 4 |
| Tests | Privacy integration | **CRITICAL** | 3 |

---

*Concerns audit: 2026-04-02*
