# ============================================================
# Super App — Produktions-Dockerfile
# Kopiert Source + Dependencies, fuehrt Migrations aus und startet mit bun run
# ============================================================

# --- Stage 1: Dependencies installieren ---
FROM oven/bun:1.2.10 AS deps
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

RUN bun install

# --- Stage 2: Frontend bauen ---
FROM deps AS frontend-build
WORKDIR /app

COPY shared/ shared/
COPY themes/ themes/
COPY template/frontend/ template/frontend/
COPY modules/mission-control/frontend/ modules/mission-control/frontend/
COPY modules/todos/frontend/ modules/todos/frontend/

WORKDIR /app/template/frontend
RUN bun run build-only

# --- Stage 3: Produktion ---
FROM oven/bun:1.2.10 AS production
WORKDIR /app

# Drizzle-Kit fuer Migrations
RUN bun i -g drizzle-kit drizzle-orm pg

# Dependencies aus Stage 1
COPY --from=deps /app/node_modules ./node_modules/
COPY --from=deps /app/template/backend/node_modules ./template/backend/node_modules/
# shared hat keine eigenen node_modules (Bun Workspace hoisted)

# Root package.json
COPY package.json ./

# Shared Source (wird von Backend importiert)
COPY shared/ shared/

# Backend Source (inkl. Framework)
COPY template/backend/ template/backend/

# Module Source (Backend only)
COPY modules/mission-control/backend/ modules/mission-control/backend/
COPY modules/todos/backend/ modules/todos/backend/

# Frontend-Build als statische Dateien fuer das Backend
COPY --from=frontend-build /app/template/frontend/dist ./template/backend/public/

ENV NODE_ENV=production
ENV PORT=3100
EXPOSE 3100

# Migrations ausfuehren und Server starten
# Bun fuehrt TypeScript nativ aus — kein Build-Schritt noetig
WORKDIR /app/template/backend
CMD ["sh", "-c", "drizzle-kit migrate --config framework/drizzle.config.ts && drizzle-kit migrate && bun run src/index.ts"]
