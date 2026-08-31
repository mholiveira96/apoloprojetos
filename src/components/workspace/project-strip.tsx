import type { Project, Subproject } from '@/types/app'
import { formatCurrency, numericValue, stageLabel, stageTone } from '@/lib/formatters'

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
