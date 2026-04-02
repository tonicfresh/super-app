# ============================================================
# Super App — Produktions-Dockerfile
# Baut Backend + Frontend, fuehrt Migrations aus und startet den Server
# ============================================================

# --- Stage 1: Dependencies installieren ---
FROM oven/bun:1 AS deps
WORKDIR /app

# Root package.json fuer Workspaces
COPY package.json bun.lock ./

# Shared package
COPY shared/package.json shared/

# Backend + Framework
COPY template/backend/package.json template/backend/
COPY template/backend/framework/package.json template/backend/framework/

# Frontend
COPY template/frontend/package.json template/frontend/

# Module packages
COPY modules/mission-control/backend/package.json modules/mission-control/backend/
COPY modules/mission-control/frontend/package.json modules/mission-control/frontend/
COPY modules/todos/backend/package.json modules/todos/backend/
COPY modules/todos/frontend/package.json modules/todos/frontend/

RUN bun install --frozen-lockfile || bun install

# --- Stage 2: Frontend bauen ---
FROM deps AS frontend-build
WORKDIR /app

# Alles kopieren fuer den Build
COPY shared/ shared/
COPY themes/ themes/
COPY template/frontend/ template/frontend/
COPY modules/mission-control/frontend/ modules/mission-control/frontend/
COPY modules/todos/frontend/ modules/todos/frontend/

WORKDIR /app/template/frontend
RUN bun run build-only

# --- Stage 3: Backend bauen ---
FROM deps AS backend-build
WORKDIR /app

COPY shared/ shared/
COPY template/backend/ template/backend/
COPY modules/mission-control/backend/ modules/mission-control/backend/
COPY modules/todos/backend/ modules/todos/backend/

WORKDIR /app/template/backend
RUN bun build ./src/index.ts --outdir ./dist --target bun --minify

# --- Stage 4: Produktion ---
FROM oven/bun:1 AS production
WORKDIR /app

# Drizzle-Kit fuer Migrations
RUN bun i -g drizzle-kit drizzle-orm pg

# Backend-Build kopieren
COPY --from=backend-build /app/template/backend/dist ./dist/
COPY --from=backend-build /app/template/backend/package.json ./
COPY --from=backend-build /app/template/backend/drizzle.config.ts ./
COPY --from=backend-build /app/template/backend/drizzle-sql ./drizzle-sql/
COPY --from=backend-build /app/template/backend/framework/drizzle.config.ts ./framework/drizzle.config.ts
COPY --from=backend-build /app/template/backend/framework/drizzle-sql ./framework/drizzle-sql/

# Frontend-Build als statische Dateien
COPY --from=frontend-build /app/template/frontend/dist ./public/

# Runtime Dependencies
COPY --from=deps /app/node_modules ./node_modules/
COPY --from=deps /app/template/backend/node_modules ./template-node_modules/

# Statische Dateien (optional — nur kopieren wenn vorhanden)
RUN mkdir -p ./static
COPY --from=backend-build /app/template/backend/static ./static/

ENV NODE_ENV=production
ENV PORT=3100
EXPOSE 3100

# Migrations ausfuehren und Server starten
CMD ["sh", "-c", "drizzle-kit migrate --config framework/drizzle.config.ts && drizzle-kit migrate && bun ./dist/index.js"]
