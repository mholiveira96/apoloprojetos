tio# Commercial Page Rebuild — Design Plan

## Interview Summary

This document captures all design decisions from the commercial page redesign interview (2025-05-07).

---

## 1. Scope

- **Commercial page = sales pipeline only.** No project creation on this page.
- "Novo projeto" form removed from commercial. Project creation happens via "Convert to project" action on won leads, or in Operations.
- Scope of this task: **rebuild commercial page UI + update data model** so other pages can be updated later.

---

## 2. Lead Stages

```
incoming → qualified → proposal → negotiation → won / lost
```

| Stage | Meaning | Entry Criteria |
|---|---|---|
| `incoming` | Raw lead, client not ready for proposal | Client name + basic info |
| `qualified` | Confirmed real opportunity | They have a project, budget exists |
| `proposal` | Proposal sent | Proposal document/email was sent |
| `negotiation` | Active negotiation / follow-up | Back-and-forth on scope/price/timeline |
| `won` | Deal closed | Contract or verbal agreement |
| `lost` | Deal died | Went elsewhere or canceled |

**Key principle:** Stages represent milestones in the relationship, NOT activity counts. Follow-ups are tracked via dates (`next_follow_up_at`, `last_contact_at`), not numbered steps.

---

## 3. Lead Sources (Fixed Dropdown)

| Key | Label |
|---|---|
| `indicacao` | Indicação |
| `site` | Site |
| `instagram` | Instagram |
| `linkedin` | LinkedIn |
| `repete` | Cliente recorrente |
| `parceiro` | Parceiro comercial |
| `outro` | Outro |

---

## 4. Project Stages (Commercial/Financial Lifecycle)

| Stage | Meaning |
|---|---|
| `aguardar` | Won deal, waiting for operational capacity |
| `em-andamento` | Work has begun (auto when any subproject starts) |
| `concluído-aguardando-pagamento` | Delivered, waiting for final payment |
| `concluído` | Fully complete and paid |

### Auto-transition Logic (forward-only, manual override available)

```
aguardar
  ↓ any subproject moves to em-andamento
em-andamento
  ↓ ALL subprojects are concluído AND total received < contract amount
concluído-aguardando-pagamento
  ↓ total received >= contract amount
concluído
```

Edge case: if all subprojects finish AND payments already match → skip straight to `concluído`.

Auto-transition triggers:
1. A subproject stage changes
2. A new receipt is registered

---

## 5. Subproject Stages (Operational Execution)

| Stage | Meaning |
|---|---|
| `a-fazer` | Not started yet |
| `em-andamento` | Being worked on |
| `aguardando-revisao` | Delivered, waiting for client review |
| `bloqueado` | Stuck, waiting on something |
| `concluído` | Discipline delivered and approved |

---

## 6. Disciplines (Fixed Dropdown)

| Key | Label |
|---|---|
| `estrutural` | Estrutural |
| `arquitetonico` | Arquitetônico |
| `eletrico` | Elétrico |
| `hidraulico` | Hidráulico |
| `incendio` | Combate a incêndio |
| `legalizacao` | Legalização |
| `outro` | Outro |

---

## 7. Data Model — Subprojects (New Table)

```
subprojects
- id TEXT PRIMARY KEY
- project_id TEXT NOT NULL (FK → projects.id)
- discipline TEXT NOT NULL
- amount REAL NOT NULL
- stage TEXT NOT NULL DEFAULT 'a-fazer'
- responsible_partner TEXT NOT NULL
- created_at TEXT NOT NULL
- updated_at TEXT NOT NULL
```

**Hierarchy:**
```
Client (reusable, many projects)
  └── Project (unique per client engagement, sum of subprojects = contract_amount)
        ├── Subproject: Estrutural — R$ 20.000 — Partner: Matheus
        ├── Subproject: Elétrico — R$ 15.000 — Partner: Luís
        └── Subproject: Hidráulico — R$ 10.000 — Partner: Letícia
```

- Each subproject = one discipline, one value, one partner
- Partner payouts happen at the subproject level
- Operations page shows subprojects (not projects)
- `sales_owner` = who brought the client (gets +10% bonus)
- `responsible_partner` = who does the work on each discipline (gets base split)

---

## 8. Sales Owner

Dropdown with the 3 partners: **Matheus, Luís, Letícia** (same `partners` constant used across the app).

---

## 9. Commercial Page Layout

```
┌─────────────────────────────────────────────────────┐
│  [+ Novo Lead]                    🔍 Search bar      │
├─────────────────────────────────────────────────────┤
│  KPI BAR                                            │
│  Leads ativos | Valor no funil | Taxa de conversão  │
│  Follow-ups vencidos | Vendas no mês                │
├─────────────────────────────────────────────────────┤
│  PIPELINE (kanban, full width)                      │
│  ┌──────────┬──────────┬──────────┬──────────┐      │
│  │ Entrada  │ Qualifi- │ Proposta │ Negocia- │      │
│  │          │ cado     │          │ ção      │      │
│  │ [card]   │ [card]   │ [card]   │ [card]   │      │
│  │ [card]   │ [card]   │          │ [card]   │      │
│  └──────────┴──────────┴──────────┴──────────┘      │
├─────────────────────────────────────────────────────┤
│  ▶ Histórico (collapsed)                            │
│    Fechados (12) | Não fechados (5)                 │
│    [expand to see table]                            │
└─────────────────────────────────────────────────────┘
```

- Kanban as **default view**, table available as toggle
- **Search bar** filters leads by title, client name, or sales owner
- Won/lost in collapsible "Histórico" section below pipeline

---

## 10. New Lead Modal

**Required fields:**
- Nome do cliente (text, auto-matches existing)
- Título do lead (text)
- Origem (dropdown)
- Valor estimado (number)

**Optional fields:**
- Responsável comercial (dropdown: Matheus, Luís, Letícia)
- Próximo follow-up (date, defaults to 7 days from now)
- Observações (textarea)

**Auto-set:**
- Stage → `incoming`
- Data de entrada → today

---

## 11. Kanban Card

```
┌─────────────────────┐
│ Lead Title           │
│ Cliente: Name        │
│ R$ 45.000           │
│ 👤 Matheus          │
│ 📅 15/01 (vencido)  │
└─────────────────────┘
```

- Whole card is clickable → opens lead detail modal
- Follow-up date color-coded: green=upcoming, yellow=due today, red=overdue

---

## 12. Lead Detail Modal

- **Read mode by default** — click a field to turn it into an editable input
- Timeline view of dates: `inbound_at` → `first_contact_at` → `proposal_sent_at` → `last_contact_at` → `next_follow_up_at`
- "Registrar contato" button (stamps `last_contact_at = today`)
- "Converter para projeto" button — only visible when lead is `won`
- "Reabrir" button — visible when lead is `lost` (moves to `negotiation`)

---

## 13. Convert to Project Modal (from won lead)

**Pre-filled from lead:**
- Client name (read-only)
- Project name (from lead title, editable)
- Contract amount (from estimated amount, editable)
- Sales owner (read-only)

**Required date fields (for conversion analytics):**
- `first_contact_at` — when you first reached out
- `proposal_sent_at` — when proposal went out
- `closed_at` — when deal closed (defaults to today)

**Subprojects list (dynamic, at least 1 required):**
- Discipline (dropdown)
- Value (number)
- Responsible partner (dropdown)
- [+ Add subproject] button
- Validation: sum of subprojects must equal contract amount

**Optional:**
- Deadline (date)
- Project stage defaults to `aguardar`

---

## 14. KPI Bar Metrics

| KPI | Calculation |
|---|---|
| Leads ativos | Count in `incoming` + `qualified` + `proposal` + `negotiation` |
| Valor no funil | Sum of estimated amounts from active leads |
| Taxa de conversão | Won ÷ (won + lost) total |
| Follow-ups vencidos | Leads where `next_follow_up_at` < today and stage is active |
| Vendas no mês | Sum of estimated amounts for leads moved to `won` this month |

---

## 15. Data Cleanup (Notion Import)

| Notion Status | Current Lead Stage | Should Be | Current Project Stage | Should Be |
|---|---|---|---|---|
| Backlog de projetos | `incoming` | `incoming` ✅ | `backlog` → delete project | Remove project, keep as lead only |
| Propostas Enviadas | `proposal` | `proposal` ✅ | `backlog` → delete project | Remove project, keep as lead only |
| Aguardando disponibilidade | `incoming` ❌ | `won` | `backlog` | `aguardar` |
| Acompanhamentos | `negotiation` | `negotiation` ✅ | `bloqueado` | Keep as project |
| Em andamento | — | — | `em-andamento` ✅ | `em-andamento` ✅ |
| Concluído | — | — | `concluído` ✅ | `concluído` ✅ |

---

## Files Affected

### Backend
| File | Changes |
|---|---|
| `api/_lib/db.js` | Add `subprojects` table, update project stage migrations, add `aguardar` stage |
| `api/_lib/mutations.js` | Update `createProjectFromLead` with subprojects, add `updateSubprojectStage` with auto-transition, add `qualified` to lead stages |
| `api/_lib/app-data.js` | Query subprojects in bootstrap data |

### Frontend — Types & Constants
| File | Changes |
|---|---|
| `src/types/app.ts` | Add `Subproject` type, update `Lead` stage type, update `Project` stage type |
| `src/types/forms.ts` | Update form types for new fields |
| `src/lib/constants.ts` | New stages, sources, disciplines constants |
| `src/lib/formatters.ts` | New labels for all new stages/sources |

### Frontend — Pages & Components
| File | Changes |
|---|---|
| `src/pages/ApoloWorkspace.tsx` | Major rewrite of commercial section |
| `src/components/workspace/kanban.tsx` | Updated kanban for new stages |
| `src/components/workspace/lead-detail-card.tsx` | Rewrite as modal with click-to-edit |
| New: `src/components/workspace/lead-modal.tsx` | New lead creation modal |
| New: `src/components/workspace/convert-project-modal.tsx` | Lead → project conversion with subprojects |

### Scripts
| File | Changes |
|---|---|
| `scripts/import-apolo-notion.mjs` | Fix "Aguardando disponibilidade" mapping, remove project creation for backlog leads |

---

## Cross-Page Impact (Not This Task)

- **Operations**: Must show subprojects instead of projects. Kanban of subprojects grouped by project.
- **Financial**: Partner payouts tie to subprojects. Receipts stay at project level.
- **Dashboard**: Project strip needs to reflect subprojects. Pipeline section uses new stages.
- **Cashflow**: No structural change (stays at project level).