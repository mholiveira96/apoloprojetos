# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (also serves API via local plugin)
npm run build      # tsc -b && vite build
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

There is no test runner configured — no `test` script exists.

Data import utilities (run once, not part of normal dev flow):
```bash
npm run import:notion   # Migrate from Notion export
npm run import:csv      # Migrate from CSV export
```

## Architecture Overview

This is a **monorepo CRM + project management system** for an engineering firm (Apolo Engenharia). It has two main surfaces:

1. **Marketing landing page** (`/`) — React sections with Framer Motion animations
2. **App workspace** (`/app/*`) — internal CRM/PM tool behind auth

### Frontend

`src/main.tsx` → `src/App.tsx` (router) → two routes:
- `/` → `MarketingPage`
- `/app/*` → `ApoloWorkspace`

**`src/pages/ApoloWorkspace.tsx`** is the central orchestrator (800+ lines). It owns:
- All global state (`data: BootstrapData`, `user`, UI flags)
- Session bootstrap on mount
- A single `submitMutation(action, payload)` function that calls `/api/app/mutate`, receives a fresh `BootstrapData` in response, and calls `setData()` — this is how **every write operation updates the UI**
- Route-to-component rendering for dashboard, comercial, operacoes, financeiro, fluxo

Sub-pages (`OperationsKanbanPage`, `FinancialPage`, `CashflowPage`) receive props from `ApoloWorkspace` and call back via `submitMutation`. They do not fetch data themselves.

### API Layer

Five serverless-style handler files, each exporting a default `async function(req, res)`:

| Route | File |
|---|---|
| `POST /api/auth/login` | `api/auth/login.js` |
| `POST /api/auth/logout` | `api/auth/logout.js` |
| `GET /api/auth/session` | `api/auth/session.js` |
| `GET /api/app/bootstrap` | `api/app/bootstrap.js` |
| `POST /api/app/mutate` | `api/app/mutate.js` |

All business logic lives in `api/_lib/`:

- **`mutations.js`** — All write operations. Each mutation normalizes inputs, writes to SQLite, then calls `getBootstrapData()` to return a fresh full snapshot. Auto-transitions (e.g. all subprojects done → project done) happen here.
- **`app-data.js`** — Assembles full `BootstrapData` via ~11 parallel SQL queries. Returns summary metrics + all collections (leads, projects, subprojects, logs, receipts, expenses, payouts, cashflow).
- **`db.js`** — Singleton libSQL client + schema creation + migration system. Handles additive column/index migrations and data backfills.
- **`auth.js`** — HMAC-SHA256 signed session cookies (30-day TTL). Users defined via env vars (`APP_USER_1_EMAIL`, `APP_USER_1_PASSWORD`, `APP_USER_1_NAME`, up to 9 users). Dev fallback: `admin@apolo.local` / `apolo123`.
- **`http.js`** — `readJsonBody()`, `json()`, `methodNotAllowed()` helpers.

### Data Flow (Write Path)

```
UI event
  → submitMutation(action, payload)    [ApoloWorkspace]
  → POST /api/app/mutate
  → runMutation(action, payload, actor) [mutations.js]
      → normalize inputs
      → SQL writes + auto-transitions
      → getBootstrapData()              [app-data.js]
  → response: fresh BootstrapData
  → setData(next)                      [ApoloWorkspace]
  → full re-render
```

Every mutation returns a complete data snapshot — there is no partial update pattern.

### Local Dev API Plugin

`vite.config.ts` includes a custom Vite middleware (`localApiPlugin`) that intercepts requests to `/api/*` paths, dynamically imports the corresponding handler file (with cache-busting via `?t=mtime`), and calls it — replicating the Vercel serverless environment locally without needing the Vercel CLI.

### Database

**Turso** (SQLite-compatible cloud DB) via `@libsql/client`.

- **Local dev:** file-based `.apolo-dev.sqlite` (default)
- **Remote dev:** set `APP_USE_REMOTE_DB=true` in `.env.local` to use Turso credentials
- **Production:** always uses `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`

Schema is auto-created and migrated on every cold start via `ensureSchema()` in `db.js`. Migrations are additive only (new columns, indexes, data backfills).

**Tables:** `clients`, `leads`, `projects`, `subprojects`, `project_logs`, `payment_receipts`, `project_expenses`, `partner_payouts`, `app_meta`

### Domain Model

```
Client
  └── Lead (sales pipeline: incoming → qualified → proposal → negotiation → won/lost)
  └── Project (contract: aguardar → em-andamento → bloqueado → concluído-aguardando-pagamento → concluído)
        └── Subproject (discipline unit: a-fazer → em-andamento → aguardando-revisao → bloqueado → concluído-aguardando-pagamento → concluído)
        └── ProjectLog (type: pending | note | delivery | revision | received_material)
        └── PaymentReceipt
        └── ProjectExpense
        └── PartnerPayout
```

Auto-transition logic in `mutations.js`:
- All subprojects `concluído` → project advances to `concluído` or `concluído-aguardando-pagamento` depending on payment
- Project fully paid after delivery → project moves to `concluído`

### Key Source Files

| File | Role |
|---|---|
| `api/_lib/mutations.js` | All 15+ CRUD mutations + business rules |
| `api/_lib/app-data.js` | Financial aggregation + data assembly |
| `api/_lib/db.js` | Schema, migrations, libSQL singleton |
| `src/pages/ApoloWorkspace.tsx` | App state, routing, `submitMutation` |
| `src/lib/constants.ts` | Stage enums, partner names, discipline list, LABELS map |
| `src/lib/formatters.ts` | Currency (BRL), dates, stage badges, follow-up overdue logic |
| `src/lib/client-timeline.ts` | Assembles per-client event history across all collections |
| `src/lib/app-api.ts` | HTTP client (`getSession`, `login`, `logout`, `getBootstrap`, `mutate`) |
| `src/types/app.ts` | All domain TypeScript types (`BootstrapData`, `Lead`, `Project`, etc.) |
| `src/types/forms.ts` | Form state types used across modals and detail cards |

### UI Conventions

- `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge) for conditional classes
- CSS variables for theming — dark/light toggled via `ThemeProvider` (`src/lib/theme-context.tsx`), persisted to `localStorage` under key `apolo-theme`
- Toast notifications via `sonner` (`toast.success` / `toast.error`)
- Drag-and-drop via `@dnd-kit` — see `src/components/workspace/kanban.tsx` and `OperationsKanbanPage`
- Optimistic stage overrides: Kanban drag stores `commercialStageOverrides` locally during in-flight mutation to avoid flicker

### Partners & Config

Partners (`Matheus`, `Luís`, `Letícia`) and disciplines (7 engineering types) are hardcoded in `src/lib/constants.ts`. The `LABELS` map there is the single source of truth for all Portuguese display strings.

### Deployment

Deployed on **Vercel** (`vercel.json` present). API handlers map to Vercel serverless functions. No Docker, no separate backend service.
