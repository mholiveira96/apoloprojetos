import { type ReactNode } from 'react'
import { GripVertical, SquarePen } from 'lucide-react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Lead, Project } from '@/types/app'
import { formatCurrency, numericValue, formatDate, stageLabel, leadFollowUpMeta } from '@/lib/formatters'
import { projectStages } from '@/lib/constants'

export function KanbanColumn({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <div className="min-w-[280px] flex-1 rounded-[24px] border border-[var(--line)] bg-[var(--bg-card-80)] p-4">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/75">{title}</div>
        <div className="rounded-full border border-[var(--line)] bg-[var(--bg-card-80)] px-2.5 py-1 text-xs font-medium text-[var(--ink)]">{count}</div>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  )
}

export function LeadKanbanCard({ lead, active, onClick }: { lead: Lead; active: boolean; onClick: (leadId: string) => void }) {
  const followUp = leadFollowUpMeta(lead)
  return (
    <button
      type="button"
      className={`w-full cursor-pointer rounded-[22px] border p-4 text-left shadow-[var(--shadow-panel-xs)] transition hover:shadow-[var(--shadow-panel-sm)] ${active ? 'border-[var(--teal-active-border)] bg-[var(--teal-active-bg)]' : 'border-[var(--line)] bg-[var(--bg-card-92)]'}`}
      onClick={() => onClick(lead.id)}
    >
      <div className="font-medium text-[var(--ink)]">{lead.title}</div>
      <div className="mt-1 text-sm text-[var(--ink-soft)]">{lead.client_name || 'Cliente não informado'}</div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--ink-soft)]">
        <span className="rounded-full border border-[var(--line)] px-2.5 py-1">{formatCurrency(numericValue(lead.estimated_amount))}</span>
        <span className={`rounded-full border px-2.5 py-1 ${followUp.tone}`}>{followUp.label}</span>
      </div>
      <div className="mt-3 text-sm text-[var(--ink-soft)]">{lead.sales_owner || 'Sem responsável'}</div>
    </button>
  )
}

export function ProjectKanbanCard({ project, active, onEdit, onStageChange }: { project: Project; active: boolean; onEdit: (projectId: string) => void; onStageChange: (projectId: string, stage: string) => void }) {
  return (
    <div className={`rounded-[22px] border p-4 shadow-[var(--shadow-panel-xs)] ${active ? 'border-[var(--teal-active-border)] bg-[var(--teal-active-bg)]' : 'border-[var(--line)] bg-[var(--bg-card-92)]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-[var(--ink)]">{project.name}</div>
          <div className="mt-1 text-sm text-[var(--ink-soft)]">{project.client_name || 'Cliente não informado'}</div>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] transition hover:bg-[var(--paper)]" onClick={() => onEdit(project.id)}>
          <SquarePen className="h-3.5 w-3.5" /> Editar
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--ink-soft)]">
        {project.discipline ? <span className="rounded-full border border-[var(--line)] px-2.5 py-1">{project.discipline}</span> : null}
        <span className="rounded-full border border-[var(--line)] px-2.5 py-1">{project.pending_count} pendências</span>
      </div>
      <div className="mt-3 text-sm text-[var(--ink-soft)]">{formatCurrency(numericValue(project.contract_amount))} · prazo {formatDate(project.next_pending_due || project.deadline)}</div>
      <div className="mt-3">
        <select className="w-full rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-sm text-[var(--ink)]" value={project.stage} onChange={(event) => onStageChange(project.id, event.target.value)}>
          {projectStages.map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}
        </select>
      </div>
    </div>
  )
}

// ─── DnD-capable lead kanban (commercial pipeline) ───────────────────────────

export function DroppableLeadColumn({ stage, title, count, children }: { stage: string; title: string; count: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[280px] flex-1 rounded-[24px] border bg-[var(--bg-card-80)] p-4 transition-all duration-150 ${
        isOver ? 'border-[var(--teal-active-border)] bg-[var(--teal-active-bg)]' : 'border-[var(--line)]'
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/75">{title}</div>
        <div className="rounded-full border border-[var(--line)] bg-[var(--bg-card-80)] px-2.5 py-1 text-xs font-medium text-[var(--ink)]">{count}</div>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  )
}

export function DraggableLeadCard({ lead, active, onClick }: { lead: Lead; active: boolean; onClick: (id: string) => void }) {
  const followUp = leadFollowUpMeta(lead)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`select-none rounded-[22px] border p-4 shadow-[var(--shadow-panel-xs)] transition-opacity ${
        active ? 'border-[var(--teal-active-border)] bg-[var(--teal-active-bg)]' : 'border-[var(--line)] bg-[var(--bg-card-92)]'
      } ${isDragging ? 'opacity-40' : 'opacity-100'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onClick(lead.id)}>
          <div className="truncate font-medium text-[var(--ink)]">{lead.title}</div>
          <div className="mt-0.5 truncate text-sm text-[var(--ink-soft)]">{lead.client_name || 'Cliente não informado'}</div>
        </div>
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 shrink-0 cursor-grab touch-none text-[var(--ink-soft)]/50 hover:text-[var(--ink-soft)] active:cursor-grabbing"
          aria-label="Arrastar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--ink-soft)]">
        <span className="rounded-full border border-[var(--line)] px-2.5 py-1">{formatCurrency(numericValue(lead.estimated_amount))}</span>
        <span className={`rounded-full border px-2.5 py-1 ${followUp.tone}`}>{followUp.label}</span>
      </div>
      <div className="mt-3 text-sm text-[var(--ink-soft)]">{lead.sales_owner || 'Sem responsável'}</div>
    </div>
  )
}

export function LeadGhostCard({ lead }: { lead: Lead }) {
  return (
    <div className="rounded-[22px] border border-[var(--teal-active-border)] bg-[var(--teal-active-bg)] p-4 shadow-[var(--shadow-panel)]">
      <div className="font-medium text-[var(--ink)]">{lead.title}</div>
      <div className="mt-0.5 text-sm text-[var(--ink-soft)]">{lead.client_name || 'Cliente não informado'}</div>
    </div>
  )
}