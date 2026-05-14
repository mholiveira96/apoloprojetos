import type { Project, Subproject } from '@/types/app'
import { formatCurrency, numericValue, formatDate, stageLabel, stageTone } from '@/lib/formatters'
import { projectStages } from '@/lib/constants'
import { SquarePen } from 'lucide-react'

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export function DashboardSubprojectRow({ subproject }: { subproject: Subproject }) {
  const days = daysSince(subproject.updated_at)
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[var(--ink)]">{subproject.project_name}</span>
          <span className="text-[var(--ink-soft)]">·</span>
          <span className="text-sm text-[var(--ink)]">{stageLabel(subproject.discipline)}</span>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${stageTone(subproject.stage)}`}>{stageLabel(subproject.stage)}</span>
        </div>
        <div className="mt-0.5 truncate text-xs text-[var(--ink-soft)]">{subproject.responsible_partner || '—'} · {formatCurrency(numericValue(subproject.amount))} · {days === 0 ? 'atualizado hoje' : `há ${days}d`}</div>
      </div>
    </div>
  )
}

export function DashboardProjectRow({ project }: { project: Project }) {
  const days = daysSince(project.updated_at)
  const outstanding = numericValue(project.contract_amount) - numericValue(project.total_received)
  const pending = numericValue(project.pending_count)
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[var(--ink)]">{project.name}</span>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${stageTone(project.stage)}`}>{stageLabel(project.stage)}</span>
        </div>
        <div className="mt-0.5 truncate text-xs text-[var(--ink-soft)]">{project.client_name || '—'}{project.discipline ? ` · ${project.discipline}` : ''}</div>
      </div>
      {pending > 0 && <span className="shrink-0 rounded-full border border-[var(--amber-border)] bg-[var(--amber-bg)] px-2.5 py-1 text-xs font-medium text-[var(--amber-text)]">{pending} pendência{pending !== 1 ? 's' : ''}</span>}
      <div className="shrink-0 text-right text-sm">
        <div className="font-semibold text-[var(--ink)]">{formatCurrency(outstanding)} em aberto</div>
        <div className="text-xs text-[var(--ink-soft)]">{days === 0 ? 'atualizado hoje' : `há ${days}d`} · {formatCurrency(numericValue(project.contract_amount))}</div>
      </div>
    </div>
  )
}

export function ProjectStrip({ project, onStageChange, onEdit }: { project: Project; onStageChange: (projectId: string, stage: string) => void; onEdit?: (projectId: string) => void }) {
  const outstanding = numericValue(project.contract_amount) - numericValue(project.total_received)
  return (
    <div className="border border-[var(--line)] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--ink)]">{project.name}</h3>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${stageTone(project.stage)}`}>{stageLabel(project.stage)}</span>
          </div>
          <div className="mt-1.5 text-sm text-[var(--ink-soft)]">{project.client_name || 'Cliente não informado'}{project.code ? ` · ${project.code}` : ''}{project.discipline ? ` · ${project.discipline}` : ''}</div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {onEdit ? (
            <button type="button" className="inline-flex items-center gap-2 border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)] transition hover:bg-[var(--paper)]" onClick={() => onEdit(project.id)}>
              <SquarePen className="h-4 w-4" /> Editar
            </button>
          ) : null}
          <label className="text-sm text-[var(--ink-soft)]">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.16em]">Etapa</span>
            <select className="border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-sm text-[var(--ink)] outline-none" value={project.stage} onChange={(event) => onStageChange(project.id, event.target.value)}>
              {projectStages.map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="mt-4 grid gap-px border border-[var(--line)] md:grid-cols-3">
        <div className="border-b border-[var(--line)] p-4 md:border-b-0 md:border-r">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--teal)]">Comercial</div>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[var(--ink)]"><span>Responsável</span><strong>{project.sales_owner || '—'}</strong></div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[var(--ink)]"><span>Contrato</span><strong>{formatCurrency(numericValue(project.contract_amount))}</strong></div>
        </div>
        <div className="border-b border-[var(--line)] p-4 md:border-b-0 md:border-r">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">Operações</div>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[var(--ink)]"><span>Pendências</span><strong>{numericValue(project.pending_count)}</strong></div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[var(--ink)]"><span>Próximo prazo</span><strong>{formatDate(project.next_pending_due)}</strong></div>
        </div>
        <div className="p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">Financeiro</div>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[var(--ink)]"><span>Recebido</span><strong>{formatCurrency(numericValue(project.total_received))}</strong></div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[var(--ink)]"><span>Em aberto</span><strong>{formatCurrency(outstanding)}</strong></div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[var(--ink)]"><span>Repasses</span><strong>{formatCurrency(numericValue(project.total_payouts))}</strong></div>
        </div>
      </div>
    </div>
  )
}
