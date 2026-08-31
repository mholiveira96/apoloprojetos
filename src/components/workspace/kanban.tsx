import { type ReactNode } from 'react'
import { GripVertical } from 'lucide-react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Lead } from '@/types/app'
import { formatCurrency, numericValue, leadFollowUpMeta } from '@/lib/formatters'

// ─── DnD-capable lead kanban (commercial pipeline) ───────────────────────────

export function DroppableLeadColumn({ stage, title, count, children }: { stage: string; title: string; count: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[280px] flex-1 border transition-colors duration-150 ${
        isOver ? 'border-[var(--teal-active-border)] bg-[var(--teal-active-bg)]' : 'border-[var(--line)] bg-transparent'
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">{title}</div>
        <div className="border border-[var(--line)] px-2 py-0.5 text-xs font-medium text-[var(--ink)]">{count}</div>
      </div>
      <div className="space-y-px p-3">{children}</div>
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
      className={`select-none border p-4 transition-opacity ${
        active ? 'border-[var(--teal-active-border)] bg-[var(--teal-active-bg)]' : 'border-[var(--line)] bg-transparent'
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
      <div className="mt-2 text-sm text-[var(--ink-soft)]">{lead.sales_owner || 'Sem responsável'}</div>
    </div>
  )
}

export function LeadGhostCard({ lead }: { lead: Lead }) {
  return (
    <div className="border border-[var(--teal-active-border)] bg-[var(--teal-active-bg)] p-4">
      <div className="font-medium text-[var(--ink)]">{lead.title}</div>
      <div className="mt-0.5 text-sm text-[var(--ink-soft)]">{lead.client_name || 'Cliente não informado'}</div>
    </div>
  )
}
