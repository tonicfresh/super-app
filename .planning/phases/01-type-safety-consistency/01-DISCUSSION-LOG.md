# Phase 1: Type Safety & Consistency - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 01-Type Safety & Consistency
**Areas discussed:** LanguageModel Type, as any Scope, Schema-Prefix Enforcement, Version-Sync Strategie
**Mode:** User delegated all decisions to Claude ("entscheide selbst, langfristig sinnvoll")

---

## Gray Areas Presented

| Area | Description | User Response |
|------|-------------|---------------|
| LanguageModel Type | Re-export from AI SDK vs custom type vs extend | Delegated to Claude |
| as any Scope | Which files count (prod only? tests? framework?) | Delegated to Claude |
| Schema-Prefix Enforcement | How to validate/enforce (runtime, build, lint, test) | Delegated to Claude |
| Version-Sync Strategie | Manual check vs automated validation | Delegated to Claude |

## Claude's Decisions (All Areas)

### LanguageModel Type
- **Decision:** Re-export `LanguageModel` from `"ai"`, create `LanguageModelWithMeta` with .provider/.modelId
- **Rationale:** Uses SDK canonical type as foundation, adds only missing properties. Minimal custom code, maximum SDK compatibility. Long-term safe because it moves WITH the SDK rather than against it.

### as any Scope
- **Decision:** Production code only. Tests and framework excluded.
- **Rationale:** Test mocks with `as any` are idiomatic TypeScript. Framework is a sub-submodule (not changeable). Focus effort where type safety actually prevents bugs.

### Schema-Prefix Enforcement
- **Decision:** Fix push_* to app_*, keep mc_* as-is, add validation test
- **Rationale:** push_* is app-level code misusing module prefix convention. mc_* in ai/db/ logically belongs to mission-control domain. A test catches future violations automatically.

### Version-Sync
- **Decision:** Sync to newer versions (frontend), add automated check
- **Rationale:** Newer versions have bug fixes and type improvements. Automated check prevents drift long-term.

## Deferred Ideas

None — analysis stayed within phase scope.
