# Technology Stack

**Analysis Date:** 2026-04-02

## Languages

**Primary:**
- TypeScript 5.9.3 - All backend and frontend code
- JavaScript - Package scripts, configuration files

**Secondary:**
- Shell/Bash - Docker compose, build scripts
- SQL - PostgreSQL migrations (via Drizzle Kit)

## Runtime

**Environment:**
- Bun 1.2.10 (pinned in Dockerfile, native TypeScript + bunfig support)

**Package Manager:**
- Bun
- Lockfile: `bun.lock` (present)

## Frameworks

**Backend** (versions from `template/backend/package.json`)**:**
- Hono.js 4.10.1 - Lightweight, edge-computing ready HTTP framework
- hono-openapi 1.1.0 - OpenAPI/Swagger integration for Hono
- @hono/swagger-ui 0.5.2 - Swagger UI middleware

**Frontend** (versions from `template/frontend/package.json`, may differ from backend)**:**
- Vue 3 3.5.31 - Progressive framework with composition API
- Vite (rolldown-vite latest) - Next-gen build tool
- Tailwind CSS 4.2.2 - Utility-first CSS framework
- PrimeVue 4.5.4 - Component library

**ORM & Data Access** (backend: 0.44.6, frontend: ^0.45.2 — versions diverge)**:**
- Drizzle ORM 0.44.6 - Type-safe SQL query builder
- drizzle-kit 0.31.10 - Migration and schema generation CLI
- pg 8.16.3 - PostgreSQL client
- postgres 3.4.7 - Alternative PostgreSQL client
- pgvector 0.2.1 - Vector search/embeddings support

**AI Integration:**
- Vercel AI SDK 6.0.143 - LLM integration framework
- @ai-sdk/anthropic 3.0.64 - Claude/Anthropic provider
- @ai-sdk/mistral 3.0.27 - Mistral provider
- @ai-sdk/vue 3.0.143 - Vue-specific AI SDK bindings
- @openrouter/ai-sdk-provider 2.3.3 - OpenRouter provider

**Validation & Type Safety:**
- Valibot 1.3.1 - Schema validation library (NOT Zod)
- drizzle-valibot 0.4.2 - Valibot-Drizzle integration
- @ai-sdk/valibot 2.0.22 - Valibot integration for AI SDK
- @valibot/to-json-schema 1.6.0 - JSON schema generation from Valibot

**State Management & Routing:**
- Pinia 3.0.4 - Vue state management
- Vue Router 4.6.4 - Client-side routing
- vue-i18n 11.3.0 - Internationalization

**Testing:**
- Bun Test - Native Bun test runner (`.test.ts` files)
- Vitest - For speech module (not installed in main backend)

**Build & Development:**
- TypeScript 5.9.3 - Static type checking
- Prettier 3.8.1 (backend), 3.6.2 (frontend) - Code formatting
- ts-morph 22.0.0 - AST manipulation for code generation
- Rolldown - High-performance bundler (via rolldown-vite)
- unplugin-icons 22.5.0 - Icon system
- unplugin-auto-import 20.3.0 - Auto-import Vue composition APIs
- unplugin-vue-components 30.0.0 - Auto-import Vue components
- @tailwindcss/vite 4.2.2 - Tailwind CSS integration
- vite-plugin-vue-devtools 8.1.1 - Vue DevTools integration

**Utilities:**
- nanoid 5.1.6 - Unique ID generation
- cron 4.3.3 - Cron job scheduling
- csv 6.4.1 - CSV parsing
- jsonwebtoken 9.0.2 - JWT token signing/verification
- nodemailer 7.0.9 - SMTP email delivery
- @aws-sdk/client-s3 3.1022.0 - AWS S3 file operations (included, not actively used)
- @aws-sdk/s3-request-presigner 3.1022.0 - S3 presigned URLs (included, not actively used)
- @hono/standard-validator 0.1.5 - Standard validator middleware
- @hono/valibot-validator 0.5.3 - Valibot validator middleware
- mitt 3.0.1 - Event emitter/pubsub
- tailwind-merge 3.5.0 - Tailwind CSS class merging
- nanoid 5.1.7 - Unique IDs (frontend)

## Configuration

**Environment:**
- `.env.default` (repository, no secrets)
- `.env` (local, never committed - .gitignore)
- POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
- POSTGRES_CA (optional, for SSL connections)
- API Keys: ANTHROPIC_API_KEY, MISTRAL_API_KEY, OPENROUTER_API_KEY (runtime secrets)
- Email: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_SECURE, SMTP_DEFAULT_SENDER
- Encryption: SECRETS_AES_KEY, SECRETS_AES_IV (framework-level data encryption)
- JWT: JWT_PUBLIC_KEY, JWT_PRIVATE_KEY (token signing)
- Debug flags: WRITE_DEBUG_FILES, CRON_LOG, SMTP_DEBUG

**Build Configuration:**
- `tsconfig.json` - TypeScript compiler options (monorepo root)
- `tsconfig.app.json` (frontend) - App-specific TS config
- `tsconfig.node.json` (frontend) - Vite/build tool config
- `vite.config.ts` - Frontend build and dev server config
- `drizzle.config.ts` - Migration settings per workspace (app, framework)
- `.prettierrc.json` - Code formatting rules

**Module Pattern:**
- Monorepo with Bun workspaces
- Workspace definition: `template/backend`, `template/frontend`, `shared`, `modules/*/backend`, `modules/*/frontend`

## Platform Requirements

**Development:**
- Bun >= 1.2.10 (runtime)
- Node 20.19.0 or >= 22.12.0 (frontend engine field only)
- PostgreSQL 17.9 with pgvector extension

**Production:**
- Docker image: `oven/bun:1` as base
- PostgreSQL database with pgvector support
- Bun runtime (built, not requiring source)

## Database

**Type:** PostgreSQL 17.9

**Extensions:**
- pgvector 0.8.2 - Vector embeddings/similarity search

**Access Layers:**
- drizzle-orm with TypeScript first-class support
- Direct postgres client for migrations
- pgadmin container (development only, port 5050)

**Connection String Format:**
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

**Schema Naming Convention:**
- Framework tables: `base_*` prefix (authentication, settings, tenants)
- App tables: `app_*` prefix (super-app specific features)
- Module tables: `<module>_*` prefix (e.g., `mc_*` for mission-control)
- Migrations tracked in `app_migrations` table

---

*Stack analysis: 2026-04-02*
