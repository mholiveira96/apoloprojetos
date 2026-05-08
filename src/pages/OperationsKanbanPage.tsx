import { useState, useMemo, useCallback } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  DndContext,
  useDroppable,
  useDraggable,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  X,
  Plus,
  Eye,
  Pencil,
  GripVertical,
  ArrowUpDown,
  Zap,
  Droplets,
  Flame,
  Building2,
  DraftingCompass,
  Wind,
  RadioTower,
  Volume2,
  Leaf,
  Circle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { BootstrapData, Lead, Project, Subproject } from '@/types/app'
import { Panel, EmptyState } from '@/components/workspace/ui'
import { formatCurrency, formatDate, numericValue, stageLabel, toDateInputValue } from '@/lib/formatters'
import { projectStages, subprojectStages, partners, disciplines, LABELS } from '@/lib/constants'

const OPS_STAGES = subprojectStages
type OpsSortKey = 'latest' | 'updated' | 'deadline' | 'value'
type SortDirection = 'asc' | 'desc'

function disciplineMeta(discipline: string): { Icon: LucideIcon; className: string } {
  const normalized = discipline.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (normalized.includes('eletr') || normalized.includes('telecom')) return { Icon: Zap, className: 'border-yellow-200 bg-yellow-50 text-yellow-700' }
  if (normalized.includes('hidro') || normalized.includes('drenagem') || normalized.includes('gas')) return { Icon: Droplets, className: 'border-sky-200 bg-sky-50 text-sky-700' }
  if (normalized.includes('incend') || normalized.includes('avcb') || normalized.includes('clcb')) return { Icon: Flame, className: 'border-rose-200 bg-rose-50 text-rose-700' }
  if (normalized.includes('estrut')) return { Icon: Building2, className: 'border-stone-200 bg-stone-50 text-stone-700' }
  if (normalized.includes('arquitet')) return { Icon: DraftingCompass, className: 'border-violet-200 bg-violet-50 text-violet-700' }
  if (normalized.includes('climat') || normalized.includes('avac')) return { Icon: Wind, className: 'border-cyan-200 bg-cyan-50 text-cyan-700' }
  if (normalized.includes('sonoriz')) return { Icon: Volume2, className: 'border-indigo-200 bg-indigo-50 text-indigo-700' }
  if (normalized.includes('rit') || normalized.includes('legal') || normalized.includes('pgrcc')) return { Icon: Leaf, className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
  if (normalized.includes('lumin')) return { Icon: RadioTower, className: 'border-amber-200 bg-amber-50 text-amber-700' }
  return { Icon: Circle, className: 'border-[var(--line)] bg-white text-[var(--ink-soft)]' }
}

type SubmitMutation = (
  action: string,
  payload: Record<string, unknown>,
  onSuccess?: () => void,
  successMessage?: string,
) => Promise<void>

interface Props {
  data: BootstrapData
  submitMutation: SubmitMutation
  mutating: boolean
}

// ─── Droppable column ────────────────────────────────────────────────────────

function DroppableColumn({
  id,
  title,
  count,
  children,
}: {
  id: string
  title: string
  count: number
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[280px] flex-1 rounded-[24px] border bg-[rgba(245,245,242,0.8)] p-4 transition-all duration-150 ${
        isOver ? 'border-[rgba(15,139,141,0.35)] bg-[rgba(15,139,141,0.05)]' : 'border-[var(--line)]'
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/75">{title}</div>
        <div className="rounded-full border border-[var(--line)] bg-white/80 px-2.5 py-1 text-xs font-medium text-[var(--ink)]">{count}</div>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  )
}

// ─── Draggable card ───────────────────────────────────────────────────────────

export function DraggableOpsCard({
  project,
  subprojects,
  onClick,
  ghost,
}: {
  project: Project
  subprojects: Subproject[]
  onClick?: () => void
  ghost?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`select-none rounded-[22px] border border-[var(--line)] bg-white/92 p-4 shadow-[0_16px_40px_rgba(7,19,21,0.04)] transition-opacity ${
        isDragging && !ghost ? 'opacity-40' : 'opacity-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={onClick}>
          <div className="truncate text-sm font-semibold text-[var(--ink)]">{project.name}</div>
          <div className="mt-0.5 truncate text-sm text-[var(--ink-soft)]">{project.client_name || 'Cliente não informado'}</div>
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
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {subprojects.length ? (
          subprojects.map((subproject) => (
            <span key={subproject.id} className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[var(--ink-soft)]">
              {subproject.discipline}
            </span>
          ))
        ) : project.discipline ? (
          <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[var(--ink-soft)]">{project.discipline}</span>
        ) : null}
        {project.sales_owner ? (
          <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[var(--ink-soft)]">{project.sales_owner}</span>
        ) : null}
      </div>
      {(project.deadline || project.contract_amount > 0) ? (
        <div className="mt-3 text-xs text-[var(--ink-soft)]">
          {project.contract_amount > 0 ? formatCurrency(numericValue(project.contract_amount)) : null}
          {project.contract_amount > 0 && project.deadline ? ' · ' : null}
          {project.deadline ? `Prazo ${formatDate(project.deadline)}` : null}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onClick}
        className="mt-3 w-full rounded-xl border border-[var(--line)] py-1.5 text-xs font-medium text-[var(--ink)] transition hover:bg-[var(--paper)]"
      >
        Ver detalhes
      </button>
    </div>
  )
}

function DraggableSubprojectCard({
  subproject,
  project,
  onClick,
  ghost,
}: {
  subproject: Subproject
  project: Project
  onClick?: () => void
  ghost?: boolean
}) {
  const { Icon, className } = disciplineMeta(subproject.discipline)
  const hasAmount = numericValue(subproject.amount) > 0
  const hasDeadline = Boolean(project.deadline)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: subproject.id })
  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    willChange: 'transform',
    zIndex: isDragging ? 30 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`select-none rounded-[22px] border border-[var(--line)] bg-white/92 p-4 shadow-[0_16px_40px_rgba(7,19,21,0.04)] transition-opacity ${
        isDragging && !ghost ? 'opacity-40' : 'opacity-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={onClick}>
          <div className="truncate font-medium text-[var(--ink)]">{project.name}</div>
          <div className={`mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{subproject.discipline}</span>
          </div>
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
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {subproject.responsible_partner ? (
          <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 font-medium text-[var(--ink-soft)]">{subproject.responsible_partner}</span>
        ) : null}
        <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[var(--ink-soft)]">{stageLabel(subproject.stage)}</span>
      </div>
      {(hasDeadline || hasAmount) ? (
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]/70">Valor</div>
            <div className="mt-1 truncate text-sm font-semibold text-[var(--ink)]">{hasAmount ? formatCurrency(numericValue(subproject.amount)) : '—'}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]/70">Prazo</div>
            <div className="mt-1 truncate text-sm font-semibold text-[var(--ink)]">{hasDeadline ? formatDate(project.deadline) : '—'}</div>
          </div>
        </div>
      ) : null}
      {false ? (
        <div className="mt-3 text-xs text-[var(--ink-soft)]">
          {subproject.amount > 0 ? formatCurrency(numericValue(subproject.amount)) : null}
          {subproject.amount > 0 && project.deadline ? ' Â· ' : null}
          {project.deadline ? `Prazo ${formatDate(project.deadline)}` : null}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onClick}
        className="mt-3 w-full rounded-xl border border-[var(--line)] py-1.5 text-xs font-medium text-[var(--ink)] transition hover:bg-[var(--paper)]"
      >
        Ver detalhes
      </button>
    </div>
  )
}

export function GhostCard({ project }: { project: Project }) {
  return (
    <div className="rounded-[22px] border border-[rgba(15,139,141,0.25)] bg-[rgba(15,139,141,0.08)] p-4 shadow-[0_24px_60px_rgba(7,19,21,0.12)]">
      <div className="font-medium text-[var(--ink)]">{project.name}</div>
      <div className="mt-0.5 text-sm text-[var(--ink-soft)]">{project.client_name || 'Cliente não informado'}</div>
    </div>
  )
}

// ─── Project detail modal ─────────────────────────────────────────────────────

function CompletionDateModal({
  project,
  subproject,
  value,
  onChange,
  onCancel,
  onConfirm,
  mutating,
}: {
  project: Project
  subproject: Subproject
  value: string
  onChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
  mutating: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-[var(--ink)]/20 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md rounded-[28px] border border-[var(--line)] bg-white p-6 shadow-[0_40px_120px_rgba(7,19,21,0.16)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/70">Conclusão</div>
            <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">{project.name}</h2>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">{subproject.discipline}</div>
          </div>
          <button onClick={onCancel} className="shrink-0 rounded-full border border-[var(--line)] p-2 text-[var(--ink-soft)] transition hover:bg-[var(--paper)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="mt-5 block text-sm font-medium text-[var(--ink)]">
          Data de conclusão
          <input
            className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3"
            type="date"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-2xl border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)] transition hover:bg-[var(--paper)]">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={mutating || !value}
            className="rounded-2xl bg-[var(--ink)] px-5 py-2.5 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  )
}

interface ProjectModalProps {
  project: Project
  onClose: () => void
  onSave: (form: ProjectModalForm) => void
  mutating: boolean
}

interface ProjectModalForm {
  name: string
  code: string
  discipline: string
  stage: string
  contractAmount: string
  salesOwner: string
  deadline: string
  statusNote: string
  notes: string
}

function ProjectDetailModal({ project, onClose, onSave, mutating }: ProjectModalProps) {
  const [form, setForm] = useState<ProjectModalForm>({
    name: project.name || '',
    code: project.code || '',
    discipline: project.discipline || '',
    stage: project.stage || 'backlog',
    contractAmount: String(project.contract_amount || ''),
    salesOwner: project.sales_owner || '',
    deadline: toDateInputValue(project.deadline),
    statusNote: project.status_note || '',
    notes: project.notes || '',
  })
  const [notesTab, setNotesTab] = useState<'edit' | 'preview'>('edit')

  const set = (field: keyof ProjectModalForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--ink)]/20 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[28px] border border-[var(--line)] bg-white shadow-[0_40px_120px_rgba(7,19,21,0.16)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-6">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/70">Projeto</div>
            <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">{project.name}</h2>
            {project.client_name ? <div className="mt-0.5 text-sm text-[var(--ink-soft)]">{project.client_name}</div> : null}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full border border-[var(--line)] p-2 text-[var(--ink-soft)] transition hover:bg-[var(--paper)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Nome</label>
            <input className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Código</label>
            <input className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.code} onChange={set('code')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Disciplina</label>
            <select className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.discipline} onChange={set('discipline')}>
              <option value="">Sem disciplina</option>
              {disciplines.map((d) => <option key={d} value={d}>{LABELS[d]}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Etapa</label>
            <select className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.stage} onChange={set('stage')}>
              {projectStages.map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Responsável</label>
            <select className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.salesOwner} onChange={set('salesOwner')}>
              <option value="">Sem responsável</option>
              {partners.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Valor do contrato</label>
            <input className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" type="number" value={form.contractAmount} onChange={set('contractAmount')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Prazo</label>
            <input className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" type="date" value={form.deadline} onChange={set('deadline')} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Nota de status</label>
            <input className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.statusNote} onChange={set('statusNote')} placeholder="Observação rápida sobre o estado atual" />
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--ink-soft)]">Notas do projeto</label>
              <div className="flex rounded-full border border-[var(--line)] bg-[var(--paper)] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setNotesTab('edit')}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition ${notesTab === 'edit' ? 'bg-white font-medium text-[var(--ink)] shadow-sm' : 'text-[var(--ink-soft)]'}`}
                >
                  <Pencil className="h-3 w-3" /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => setNotesTab('preview')}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition ${notesTab === 'preview' ? 'bg-white font-medium text-[var(--ink)] shadow-sm' : 'text-[var(--ink-soft)]'}`}
                >
                  <Eye className="h-3 w-3" /> Preview
                </button>
              </div>
            </div>
            {notesTab === 'edit' ? (
              <textarea
                className="min-h-[180px] w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 font-mono text-sm"
                placeholder="Suporta Markdown: **negrito**, _itálico_, `código`, tabelas, listas…"
                value={form.notes}
                onChange={set('notes')}
              />
            ) : (
              <div className="prose prose-sm min-h-[180px] max-w-none rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3">
                {form.notes ? (
                  <ReactMarkdown>{form.notes}</ReactMarkdown>
                ) : (
                  <p className="text-[var(--ink-soft)]">Nada escrito ainda.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--line)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)] transition hover:bg-[var(--paper)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={mutating}
            className="rounded-2xl bg-[var(--ink)] px-5 py-2.5 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create from lead modal ───────────────────────────────────────────────────

interface CreateFromLeadModalProps {
  wonLeads: Lead[]
  onClose: () => void
  onCreate: (leadId: string, form: CreateFromLeadForm) => void
  mutating: boolean
}

interface CreateFromLeadForm {
  name: string
  code: string
  discipline: string
  salesOwner: string
  contractAmount: string
  deadline: string
  statusNote: string
}

function CreateFromLeadModal({ wonLeads, onClose, onCreate, mutating }: CreateFromLeadModalProps) {
  const [selectedLeadId, setSelectedLeadId] = useState(wonLeads[0]?.id || '')
  const selectedLead = wonLeads.find((l) => l.id === selectedLeadId)
  const [form, setForm] = useState<CreateFromLeadForm>({
    name: selectedLead?.title || '',
    code: '',
    discipline: '',
    salesOwner: selectedLead?.sales_owner || '',
    contractAmount: String(selectedLead?.estimated_amount || ''),
    deadline: '',
    statusNote: '',
  })

  const handleLeadChange = (leadId: string) => {
    const lead = wonLeads.find((l) => l.id === leadId)
    setSelectedLeadId(leadId)
    setForm((f) => ({
      ...f,
      name: lead?.title || '',
      salesOwner: lead?.sales_owner || '',
      contractAmount: String(lead?.estimated_amount || ''),
    }))
  }

  const set = (field: keyof CreateFromLeadForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--ink)]/20 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg rounded-[28px] border border-[var(--line)] bg-white shadow-[0_40px_120px_rgba(7,19,21,0.16)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-6">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/70">Novo projeto operacional</div>
            <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">Criar de lead fechado</h2>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full border border-[var(--line)] p-2 text-[var(--ink-soft)] transition hover:bg-[var(--paper)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {wonLeads.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Nenhum lead disponível" body="Não há leads fechados sem projeto operacional associado." />
          </div>
        ) : (
          <div className="grid gap-4 p-6">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Lead de origem</label>
              <select
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm"
                value={selectedLeadId}
                onChange={(e) => handleLeadChange(e.target.value)}
              >
                {wonLeads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.title}{lead.client_name ? ` · ${lead.client_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Nome do projeto</label>
              <input className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.name} onChange={set('name')} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Código</label>
                <input className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.code} onChange={set('code')} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Disciplina</label>
                <select className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.discipline} onChange={set('discipline')}>
                  <option value="">Sem disciplina</option>
                  {disciplines.map((d) => <option key={d} value={d}>{LABELS[d]}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Responsável</label>
                <select className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.salesOwner} onChange={set('salesOwner')}>
                  <option value="">Sem responsável</option>
                  {partners.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Valor do contrato</label>
                <input className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" type="number" value={form.contractAmount} onChange={set('contractAmount')} />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Prazo</label>
                <input className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" type="date" value={form.deadline} onChange={set('deadline')} />
              </div>
            </div>
          </div>
        )}

        {wonLeads.length > 0 ? (
          <div className="flex justify-end gap-3 border-t border-[var(--line)] px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-2xl border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)] transition hover:bg-[var(--paper)]">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onCreate(selectedLeadId, form)}
              disabled={mutating || !selectedLeadId || !form.name}
              className="rounded-2xl bg-[var(--ink)] px-5 py-2.5 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
            >
              Criar projeto
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function OperationsKanbanPage({ data, submitMutation, mutating }: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [showCreateFromLead, setShowCreateFromLead] = useState(false)
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({})
  const [sortKey, setSortKey] = useState<OpsSortKey>('updated')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [completionDraft, setCompletionDraft] = useState<{ subprojectId: string; projectId: string } | null>(null)
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10))
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const projectsById = useMemo(
    () => new Map(data.projects.map((project) => [project.id, project])),
    [data.projects],
  )
  const opsSubprojects = useMemo(
    () => data.subprojects.filter((subproject) => OPS_STAGES.includes(subproject.stage as typeof OPS_STAGES[number])),
    [data.subprojects],
  )

  const subprojectsWithOverrides = useMemo(
    () => opsSubprojects.map((subproject) => stageOverrides[subproject.id] ? { ...subproject, stage: stageOverrides[subproject.id] } : subproject),
    [opsSubprojects, stageOverrides],
  )
  const sortedSubprojects = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1
    const dateValue = (value: string | null | undefined) => value ? new Date(value).getTime() || 0 : 0
    return [...subprojectsWithOverrides].sort((a, b) => {
      const projectA = projectsById.get(a.project_id)
      const projectB = projectsById.get(b.project_id)
      let result = 0
      if (sortKey === 'latest') result = dateValue(a.created_at) - dateValue(b.created_at)
      if (sortKey === 'updated') result = dateValue(a.updated_at) - dateValue(b.updated_at)
      if (sortKey === 'deadline') result = dateValue(projectA?.deadline) - dateValue(projectB?.deadline)
      if (sortKey === 'value') result = numericValue(a.amount) - numericValue(b.amount)
      if (result === 0) result = a.discipline.localeCompare(b.discipline)
      return result * direction
    })
  }, [projectsById, sortDirection, sortKey, subprojectsWithOverrides])

  const kanban = useMemo(
    () => Object.fromEntries(OPS_STAGES.map((stage) => [stage, sortedSubprojects.filter((subproject) => subproject.stage === stage)])),
    [sortedSubprojects],
  )

  const wonLeads = useMemo(
    () => data.leads.filter((l) => l.stage === 'won' && !data.projects.some((p) => p.lead_id === l.id)),
    [data.leads, data.projects],
  )

  const selectedProject = useMemo(
    () => data.projects.find((p) => p.id === selectedProjectId) ?? null,
    [data.projects, selectedProjectId],
  )

  const completionSubproject = completionDraft ? data.subprojects.find((item) => item.id === completionDraft.subprojectId) ?? null : null
  const completionProject = completionDraft ? projectsById.get(completionDraft.projectId) ?? null : null

  const toggleSort = useCallback((key: OpsSortKey) => {
    setSortKey((current) => {
      if (current === key) {
        setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')
        return current
      }
      setSortDirection('desc')
      return key
    })
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const subprojectId = String(event.active.id)
      const targetStage = event.over ? String(event.over.id) : null
      if (!targetStage || !OPS_STAGES.includes(targetStage as typeof OPS_STAGES[number])) return
      const subproject = data.subprojects.find((item) => item.id === subprojectId)
      if (!subproject || subproject.stage === targetStage) return

      if (targetStage === 'concluído') {
        setCompletionDraft({ subprojectId, projectId: subproject.project_id })
        setCompletionDate(new Date().toISOString().slice(0, 10))
        return
      }

      setStageOverrides((prev) => ({ ...prev, [subprojectId]: targetStage }))
      window.setTimeout(() => {
        void submitMutation(
          'updateSubprojectStage',
          { id: subprojectId, projectId: subproject.project_id, stage: targetStage },
          () => setStageOverrides((prev) => { const next = { ...prev }; delete next[subprojectId]; return next }),
          'Etapa atualizada',
        ).catch(() => {
          setStageOverrides((prev) => { const next = { ...prev }; delete next[subprojectId]; return next })
        })
      }, 0)
    },
    [data.subprojects, submitMutation],
  )

  const handleConfirmCompletion = useCallback(() => {
    if (!completionDraft || !completionDate) return
    const { subprojectId, projectId } = completionDraft
    setStageOverrides((prev) => ({ ...prev, [subprojectId]: 'concluído' }))
    window.setTimeout(() => {
      void submitMutation(
        'updateSubprojectStage',
        { id: subprojectId, projectId, stage: 'concluído', completedAt: completionDate },
        () => {
          setCompletionDraft(null)
          setStageOverrides((prev) => { const next = { ...prev }; delete next[subprojectId]; return next })
        },
        'Subprojeto concluído',
      ).catch(() => {
        setStageOverrides((prev) => { const next = { ...prev }; delete next[subprojectId]; return next })
      })
    }, 0)
  }, [completionDate, completionDraft, submitMutation])

  const handleProjectSave = useCallback(
    (form: ProjectModalForm) => {
      if (!selectedProject) return
      void submitMutation(
        'updateProject',
        { id: selectedProject.id, ...form },
        () => setSelectedProjectId(null),
        'Projeto atualizado',
      )
    },
    [selectedProject, submitMutation],
  )

  const handleCreateFromLead = useCallback(
    (leadId: string, form: CreateFromLeadForm) => {
      void submitMutation(
        'createProjectFromLead',
        { leadId, ...form },
        () => setShowCreateFromLead(false),
        'Projeto criado',
      )
    },
    [submitMutation],
  )

  return (
    <>
      <Panel
        title="Operações"
        subtitle="Subprojetos em execução — cada disciplina tem responsável, valor e etapa próprios."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {[
              ['latest', 'Mais recentes'],
              ['updated', 'Atualizados'],
              ['deadline', 'Prazo'],
              ['value', 'Valor'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleSort(key as OpsSortKey)}
                className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium transition ${
                  sortKey === key ? 'border-[rgba(15,139,141,0.22)] bg-[rgba(15,139,141,0.08)] text-[var(--teal)]' : 'border-[var(--line)] bg-white/80 text-[var(--ink)] hover:bg-[var(--paper)]'
                }`}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {label} {sortKey === key ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCreateFromLead(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--paper)]"
            >
              <Plus className="h-3.5 w-3.5" />
              De comercial
            </button>
          </div>
        }
      >
        {opsSubprojects.length === 0 ? (
          <EmptyState
            title="Nenhum projeto operacional"
            body='Use "De comercial" para criar um projeto a partir de um lead fechado.'
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4" style={{ minWidth: `${OPS_STAGES.length * 296}px` }}>
                {OPS_STAGES.map((stage) => (
                  <DroppableColumn
                    key={stage}
                    id={stage}
                    title={stageLabel(stage)}
                    count={kanban[stage]?.length ?? 0}
                  >
                    {kanban[stage]?.length ? (
                      kanban[stage].map((subproject) => {
                        const project = projectsById.get(subproject.project_id)
                        if (!project) return null
                        return (
                          <DraggableSubprojectCard
                            key={subproject.id}
                            subproject={subproject}
                            project={project}
                            onClick={() => setSelectedProjectId(project.id)}
                          />
                        )
                      })
                    ) : (
                      <div className="rounded-[20px] border border-dashed border-[var(--line)] bg-white/65 p-4 text-sm text-[var(--ink-soft)]">
                        Coluna vazia.
                      </div>
                    )}
                  </DroppableColumn>
                ))}
              </div>
            </div>
          </DndContext>
        )}
      </Panel>

      {selectedProject ? (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProjectId(null)}
          onSave={handleProjectSave}
          mutating={mutating}
        />
      ) : null}

      {showCreateFromLead ? (
        <CreateFromLeadModal
          wonLeads={wonLeads}
          onClose={() => setShowCreateFromLead(false)}
          onCreate={handleCreateFromLead}
          mutating={mutating}
        />
      ) : null}

      {completionSubproject && completionProject ? (
        <CompletionDateModal
          project={completionProject}
          subproject={completionSubproject}
          value={completionDate}
          onChange={setCompletionDate}
          onCancel={() => setCompletionDraft(null)}
          onConfirm={handleConfirmCompletion}
          mutating={mutating}
        />
      ) : null}
    </>
  )
}
