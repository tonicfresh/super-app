# External Integrations

**Analysis Date:** 2026-04-02

## APIs & External Services

**AI Providers:**
- Anthropic (Claude) - Default chat provider
  - SDK: `@ai-sdk/anthropic`
  - Auth: `ANTHROPIC_API_KEY` environment variable
  - Default model: `claude-sonnet-4-5`
  - Configured via `template/backend/src/ai/providers.ts`

- Mistral - Alternative chat and embedding provider
  - SDK: `@ai-sdk/mistral`
  - Auth: `MISTRAL_API_KEY` environment variable
  - Default models: `mistral-large-latest` (chat), `mistral-embed` (embeddings)

- OpenRouter - Multi-model provider proxy
  - SDK: `@openrouter/ai-sdk-provider`
  - Auth: `OPENROUTER_API_KEY` environment variable
  - Default model: `deepseek/deepseek-coder` (code analysis)

**Provider Selection:**
- Runtime configuration via `template/backend/src/ai/providers.ts:createProviders()`
- Models mapped by task type: chat, summarization, code-analysis, embeddings
- Fallback: API keys checked at startup; missing providers are silently disabled
- Settings schema: `template/backend/src/settings/settings-schema.ts` (ANTHROPIC_API_KEY, MISTRAL_API_KEY, OPENROUTER_API_KEY)

## Data Storage

**Databases:**

**Primary: PostgreSQL 17.9 (production & development)**
- Connection: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`
- Environment vars: POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
- Client: `pg` (PostgreSQL Node.js driver)
- ORM: Drizzle ORM with full TypeScript support

**Docker Image (development):** `pgvector/pgvector:pg17`
- Includes pgvector extension pre-installed
- Healthcheck via `pg_isready`
- Persistence: `pg_data` Docker volume
- pgAdmin available at `localhost:5050` (dev only)

**SSL/TLS Support:**
- Optional: POSTGRES_CA environment variable for certificate-pinned connections
- `POSTGRES_USE_SSL` flag auto-enabled when CA certificate provided
- Fallback: `ssl: false` for local development without certificates

**File Storage:**
- AWS S3 SDK included (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- Not currently integrated into core application
- No presigned URL generation observed in templates

**In-Memory/Cache:**
- No Redis or external cache detected
- State persisted to PostgreSQL only

## Authentication & Identity

**Auth Provider:**
- Custom implementation via fullstack-framework
- Location: `template/backend/framework/src/lib/auth/`
- JWT-based: JWT_PUBLIC_KEY, JWT_PRIVATE_KEY environment variables
- Tenant-scoped: Authentication middleware in `template/backend/src/auth/`

**Features:**
- Module-level auth middleware (`template/backend/src/auth/module-auth-middleware.ts`)
- Tenant isolation in request context
- Email validation via Valibot
- Credentials stored encrypted in database (SECRETS_AES_KEY, SECRETS_AES_IV for encryption)

**Password/Key Management:**
- API keys stored as settings in encrypted `base_settings` table
- No plain-text secrets in codebase (all injected via environment)

## Email & Messaging

**SMTP Integration:**
- Service: Nodemailer
- Location: `template/backend/framework/src/lib/email/index.ts`
- Configuration:
  - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
  - SMTP_SECURE (TLS/SSL flag), SMTP_DEFAULT_SENDER
  - SMTP_DEBUG flag for logging

**Features:**
- Console mode: Set `SMTP_HOST=console.localhost` to log emails to console (development)
- Real SMTP: Sends via configured server with 3-attempt retry (15-minute intervals)
- Email validation: Valibot schema enforcement
- HTML-to-plain-text conversion for console logs
- Test endpoint: `sendTestMail()` for configuration verification

**Email Classes:**
- `SMTPService` singleton managing transporter lifecycle

## Monitoring & Observability

**Error Tracking:**
- No dedicated error tracking service detected (Sentry, Rollbar, etc.)
- Console-based logging in place

**Logs:**
- Custom logger in `template/backend/framework/src/lib/log`
- WRITE_DEBUG_FILES flag controls file output (development)
- CRON_LOG enables cron job logging
- SMTP_DEBUG enables email service logging

**Cost Tracking:**
- Cost logging system: `@super-app/shared/cost-tracking.ts`
- Integration point: `template/backend/src/ai/cost-tracking.ts`
- Cost entries recorded per AI call with provider, model, tokens, USD cost
- Likely reports to external cost-tracker service (per Toby's architecture docs)

## CI/CD & Deployment

**Hosting:**
- Docker container deployment (Bun-based)
- GitHub Actions for builds (Dockerfile present: `template/Dockerfile`)

**Build Process:**
- Backend: `bun build ./src/index.ts --outdir ./dist --target bun --minify`
- Frontend: `vite build` with Rolldown bundler
- Migrations run at container startup:
  - Framework: `drizzle-kit migrate --config framework/drizzle.config.ts`
  - App: `drizzle-kit migrate`

**Docker Image:**
- Base: `oven/bun:1` (lightweight)
- Includes drizzle-kit globally
- Entry point: Runs migrations + starts `./dist/index.js`
- Port exposed: 3000 (configurable via BASE_URL)

## Environment Configuration

**Required env vars (critical):**
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` - Database connection
- `JWT_PUBLIC_KEY`, `JWT_PRIVATE_KEY` - Token signing/verification
- `SECRETS_AES_KEY`, `SECRETS_AES_IV` - API key encryption
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email delivery (optional if SMTP_HOST=console.localhost)

**Optional env vars:**
- `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY` - AI provider keys
- `POSTGRES_CA` - SSL certificate for database
- `WRITE_DEBUG_FILES`, `CRON_LOG`, `SMTP_DEBUG` - Debug flags
- `ALLOWED_ORIGINS` - CORS policy
- `BASE_URL` - Application base URL
- `VITE_DEV_API_URL` - Frontend dev server proxy target

**Secrets location:**
- `.env` file (development, .gitignore)
- Container environment variables (production)
- Encrypted in-database: `base_settings` table via AES encryption

**Development defaults:**
- POSTGRES_HOST=localhost, PORT=5432
- SMTP_HOST=console.localhost (fake SMTP for development)
- Encryption keys: Empty (must be set)

## Webhooks & Callbacks

**Incoming:**
- None detected in codebase

**Outgoing:**
- Potential cost reporting to external service (non-blocking fire-and-forget pattern implied by `@super-app/shared/cost-tracking.ts`)
- No explicit webhook endpoints found

## Module Architecture

**Pluggable Modules:**
Each module (`speech`, `todos`, `mission-control`) is independently deployable with its own:
- Backend: Express-like plugin system via Hono
- Database: Isolated table prefix (e.g., `mc_*` for mission-control)
- API: Mounted routes at `/api/v1/:tenantId/:module`
- Authentication: Tenant and module-level permission checks

**Module Registry:**
- `template/backend/src/module-registry.ts` - Central plugin loader
- Modules registered as plugin imports and merged into main Hono app

---

*Integration audit: 2026-04-02*
