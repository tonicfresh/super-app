# Super App

> Modulare, skalierbare Applikations-Plattform mit Sub-Repository-Architektur.

## Uebersicht
- **Ziel:** Persoenliche Productivity-Plattform (Mail, Todos, Contacts, Documents, Knowledge Base, etc.)
- **Zielgruppe:** Toby selbst, spaeter andere
- **Status:** In Entwicklung (Phase 1-8 geplant)
- **Prioritaet:** Hoch

## Tech Stack (Stand: 2026-04-02)

### Backend (`template/backend/package.json`)
| Paket | Version |
|-------|---------|
| Bun | 1.2.10 |
| Hono.js | 4.10.1 |
| Drizzle ORM | 0.44.6 |
| Vercel AI SDK | 6.0.143 |
| Valibot | 1.3.1 |
| pg | 8.16.3 |
| drizzle-kit | 0.31.10 |

### Frontend
| Paket | Version |
|-------|---------|
| Vue 3 | 3.5.31 |
| Tailwind CSS | 4.2.2 |
| PrimeVue | 4.5.4 |
| Pinia | 3.0.4 |
| Vue Router | 4.6.4 |
| vue-i18n | 11.3.0 |
| Valibot | 1.3.1 |

### Infrastruktur
| Komponente | Version |
|------------|---------|
| PostgreSQL | 17.9 |
| pgvector | 0.8.2 |
| Docker Image | pgvector/pgvector:pg17 |

## Projektstruktur
```
super-app/
├── template/                   # [Submodule] Fullstack App Template
│   ├── backend/
│   │   ├── framework/          # [Sub-submodule] fullstack-framework
│   │   └── src/                # Super App Backend
│   └── frontend/               # Super App Frontend (Vue 3)
├── modules/                    # Feature-Module (je ein Submodule)
│   ├── speech/                 # TTS & STT
│   └── mission-control/        # Agent Monitoring (mandatory)
├── shared/                     # Shared Types & Utilities (@super-app/shared)
├── themes/                     # Design Tokens + CSS Overrides
├── side-projects/              # Zukunftsideen (z.B. Voice Remote)
└── docs/                       # Architektur-Specs + Implementierungsplaene
```

## Entwicklungsumgebung
```bash
# Backend starten (Port 3100)
cd template/backend
bun run dev

# Frontend starten (Port 5173/5174)
cd template/frontend
bun run dev

# Migrations ausfuehren
cd template/backend
bun run migrate

# Neues Modul-Schema generieren
bun run app:generate
```

## Wichtige Dateien
- `docs/superpowers/specs/2026-04-02-super-app-architecture-design.md` — Architektur-Spec
- `docs/superpowers/plans/2026-04-02-phase*.md` — Implementierungsplaene (Phase 1-8)
- `template/backend/src/index.ts` — Backend Entry Point (defineServer)
- `template/backend/.env` — Umgebungsvariablen (NICHT committen!)

## Architektur-Prinzipien
- **Dual-Mode:** Jedes Modul laeuft standalone ODER integriert
- **Validation:** Valibot (NICHT Zod!)
- **ORM:** Drizzle ORM, NIEMALS raw SQL
- **Table Creator:** `pgTableCreator` pro Modul (Framework: `base_*`, App: `app_*`, Module: `<modul>_*`)
- **AI Tools:** Permission check → Guardrail check → Execute → ToolResult
- **Privacy:** LLM sieht nur IDs und Flags, niemals sensible Daten
- **Theming:** Keine hardcodierten Farben/Schatten/Radien — immer Design Tokens

## Implementierungsphasen
| Phase | Beschreibung | Status |
|-------|-------------|--------|
| 1 | Shared Core (Types, Utils, Registry) | Plan fertig |
| 2 | Auth & Security (Passkey, Permissions) | Plan fertig |
| 3 | AI Agent System (Main Agent, Sub-Agents) | Plan fertig |
| 4 | AI Providers & Cost Tracking | Plan fertig |
| 5 | Mission Control (Monitoring, Audit) | Plan fertig |
| 6 | PWA & Push Notifications | Plan fertig |
| 7 | Theming System | Plan fertig |
| 8 | Reference Module: Todos | Plan fertig |

## Verbindungen
- **Framework:** github.com/tonicfresh/template_fullstack-app-toby
- **Speech-Modul:** github.com/tonicfresh/super-app-speech
- **PostgreSQL:** localhost:5432, DB: superapp, User: pg
- **Backend Port:** 3100 (3000 ist belegt)
