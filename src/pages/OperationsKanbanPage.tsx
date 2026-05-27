import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
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
  CalendarDays,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Search,
  Columns3,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { BootstrapData, ClientTimelineItem, Lead, Project, Subproject, SubprojectComment } from '@/types/app'
import { Panel, EmptyState } from '@/components/workspace/ui'
import { formatCurrency, formatDate, numericValue, stageLabel, toDateInputValue } from '@/lib/formatters'
import { projectStages, subprojectStages, partners, disciplines, LABELS, DISCIPLINE_ALIAS } from '@/lib/constants'
import { buildClientTimeline } from '@/lib/client-timeline'

const OPS_STAGES = subprojectStages
type OpsSortKey = 'latest' | 'updated' | 'deadline' | 'value'
type SortDirection = 'asc' | 'desc'

function disciplineMeta(discipline: string): { Icon: LucideIcon; className: string } {
  const normalized = discipline.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (normalized.includes('eletr') || normalized.includes('telecom')) return { Icon: Zap, className: 'border-[var(--yellow-border)] bg-[var(--yellow-bg)] text-[var(--yellow-text)]' }
  if (normalized.includes('hidr') || normalized.includes('sanit') || normalized.includes('pluv') || normalized.includes('drenagem') || normalized.includes('gas')) return { Icon: Droplets, className: 'border-[var(--sky-border)] bg-[var(--sky-bg)] text-[var(--sky-text)]' }
  if (normalized.includes('incend') || normalized.includes('avcb') || normalized.includes('clcb')) return { Icon: Flame, className: 'border-[var(--rose-border)] bg-[var(--rose-bg)] text-[var(--rose-text)]' }
  if (normalized.includes('estrut')) return { Icon: Building2, className: 'border-[var(--stone-border)] bg-[var(--stone-bg)] text-[var(--stone-text)]' }
  if (normalized.includes('arquitet')) return { Icon: DraftingCompass, className: 'border-[var(--violet-border)] bg-[var(--violet-bg)] text-[var(--violet-text)]' }
  if (normalized.includes('climat') || normalized.includes('avac')) return { Icon: Wind, className: 'border-[var(--cyan-border)] bg-[var(--cyan-bg)] text-[var(--cyan-text)]' }
  if (normalized.includes('sonoriz')) return { Icon: Volume2, className: 'border-[var(--indigo-border)] bg-[var(--indigo-bg)] text-[var(--indigo-text)]' }
  if (normalized.includes('rit') || normalized.includes('legal') || normalized.includes('pgrcc')) return { Icon: Leaf, className: 'border-[var(--emerald-border)] bg-[var(--emerald-bg)] text-[var(--emerald-text)]' }
  if (normalized.includes('lumin')) return { Icon: RadioTower, className: 'border-[var(--amber-border)] bg-[var(--amber-bg)] text-[var(--amber-text)]' }
  return { Icon: Circle, className: 'border-[var(--line)] bg-[var(--bg-card-solid)] text-[var(--ink-soft)]' }
}

function toSystemKey(value: string): string {
  if (!value) return value
  if ((disciplines as readonly string[]).includes(value)) return value
  const lower = value.toLowerCase()
  const match = (disciplines as readonly string[]).find((d) => d.toLowerCase() === lower)
  if (match) return match
  for (const [key, label] of Object.entries(LABELS)) {
    if (label.toLowerCase() === lower) return key
  }
  return value
}

function showDiscipline(value: string): string {
  const key = toSystemKey(value)
  return DISCIPLINE_ALIAS[key] ?? key
}

function CurrencyInput({ value, onChange, className }: { value: string; onChange: (v: string) => void; className: string }) {
  const [focused, setFocused] = useState(false)
  const display = focused || !numericValue(value) ? value : formatCurrency(numericValue(value))
  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      value={display}
      placeholder="R$ 0,00"
      onFocus={(e) => { setFocused(true); e.target.select() }}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(e.target.value.replace(',', '.'))}
    />
  )
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
      className={`min-w-[280px] flex-1 flex flex-col [] border bg-[var(--bg-card-80)] p-4 transition-all duration-150 ${
        isOver ? 'border-[var(--teal-active-border)] bg-[var(--teal-active-bg)]' : 'border-[var(--line)]'
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/75">{title}</div>
        <div className="rounded-full border border-[var(--line)] bg-[var(--bg-card-80)] px-2.5 py-1 text-xs font-medium text-[var(--ink)]">{count}</div>
      </div>
      <div className="mt-4 flex-1 overflow-y-auto space-y-3">{children}</div>
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
      className={`select-none [] border border-[var(--line)] bg-[var(--bg-card-92)] p-4 shadow-[var(--shadow-panel-xs)] transition-opacity ${
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
              {showDiscipline(subproject.discipline)}
            </span>
          ))
        ) : project.discipline ? (
          <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[var(--ink-soft)]">{showDiscipline(project.discipline)}</span>
        ) : null}
        {project.sales_owner ? (
          <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[var(--ink-soft)]">{project.sales_owner}</span>
        ) : null}
      </div>
      {(project.next_pending_due || project.contract_amount > 0) ? (
        <div className="mt-3 text-xs text-[var(--ink-soft)]">
          {project.contract_amount > 0 ? formatCurrency(numericValue(project.contract_amount)) : null}
          {project.contract_amount > 0 && project.next_pending_due ? ' · ' : null}
          {project.next_pending_due ? `Prazo ${formatDate(project.next_pending_due)}` : null}
        </div>
      ) : null}
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
  const hasContractAmount = numericValue(project.contract_amount) > 0
  const hasDeadline = Boolean(subproject.deadline)
  const observationPreview = subproject.observacao?.trim()
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
      className={`select-none cursor-pointer [] border border-[var(--line)] bg-[var(--bg-card-92)] transition-all hover:border-[var(--teal-active-border)] hover:bg-[var(--teal-active-bg)] ${
        isDragging && !ghost ? 'opacity-40' : 'opacity-100'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2">
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
          <Icon className="h-3 w-3 shrink-0" />
          <span>{showDiscipline(subproject.discipline)}</span>
        </div>
        <button
          {...listeners}
          {...attributes}
          className="shrink-0 cursor-grab touch-none text-[var(--ink-soft)]/30 hover:text-[var(--ink-soft)] active:cursor-grabbing"
          aria-label="Arrastar"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-3 py-3">
        <div className="text-sm font-semibold leading-snug text-[var(--ink)]">{project.name}</div>
        {project.client_name ? (
          <div className="mt-0.5 truncate text-xs text-[var(--ink-soft)]">{project.client_name}</div>
        ) : null}

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {subproject.responsible_partner ? (
            <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 text-xs text-[var(--ink-soft)]">
              {subproject.responsible_partner}
            </span>
          ) : null}
          <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--ink-soft)]">
            {stageLabel(subproject.stage)}
          </span>
        </div>

        {observationPreview ? (
          <div className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--ink-soft)]">
            {observationPreview}
          </div>
        ) : null}
      </div>

      {(hasAmount || hasContractAmount || hasDeadline) ? (
        <div className="flex flex-wrap items-center gap-4 border-t border-[var(--line)] px-3 py-2 text-xs">
          {hasAmount ? (
            <span className="font-semibold text-[var(--ink)]">Subprojeto {formatCurrency(numericValue(subproject.amount))}</span>
          ) : null}
          {hasContractAmount ? (
            <span className="text-[var(--ink-soft)]">Contrato {formatCurrency(numericValue(project.contract_amount))}</span>
          ) : null}
          {hasDeadline ? (
            <span className="text-[var(--ink-soft)]">{formatDate(subproject.deadline)}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function GhostCard({ project }: { project: Project }) {
  return (
    <div className="[] border border-[var(--teal-active-border)] bg-[var(--teal-active-bg)] p-4 shadow-[0_24px_60px_rgba(12,26,26,0.08)]">
      <div className="font-medium text-[var(--ink)]">{project.name}</div>
      <div className="mt-0.5 text-sm text-[var(--ink-soft)]">{project.client_name || 'Cliente não informado'}</div>
    </div>
  )
}

// ─── Calendar view ────────────────────────────────────────────────────────────

function CalendarView({ subprojects, projectsById, onCardClick }: {
  subprojects: Subproject[]
  projectsById: Map<string, Project>
  onCardClick: (projectId: string, subprojectId: string) => void
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const deadlinesByDay = useMemo(() => {
    const map = new Map<number, Subproject[]>()
    for (const sp of subprojects) {
      const deadline = sp.deadline
      if (!deadline) continue
      const d = new Date(deadline + 'T00:00:00')
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (!map.has(day)) map.set(day, [])
        map.get(day)!.push(sp)
      }
    }
    return map
  }, [subprojects, year, month])

  const noDeadline = useMemo(
    () => subprojects.filter((sp) => !sp.deadline),
    [subprojects],
  )

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: Array<{ day: number; current: boolean; isToday: boolean }> = []
  for (let i = firstWeekday - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, current: false, isToday: false })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      current: true,
      isToday: d === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
    })
  }
  const tail = (7 - (cells.length % 7)) % 7
  for (let d = 1; d <= tail; d++) cells.push({ day: d, current: false, isToday: false })

  const weekRows: Array<typeof cells> = []
  for (let i = 0; i < cells.length; i += 7) weekRows.push(cells.slice(i, i + 7))

  const prevMonth = () => { if (month === 0) { setYear((y) => y - 1); setMonth(11) } else setMonth((m) => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear((y) => y + 1); setMonth(0) } else setMonth((m) => m + 1) }
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()) }

  const monthLabel = new Date(year, month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-full border border-[var(--line)] p-1.5 text-[var(--ink-soft)] transition hover:bg-[var(--paper)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-full border border-[var(--line)] p-1.5 text-[var(--ink-soft)] transition hover:bg-[var(--paper)]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <span className="font-semibold text-[var(--ink)] capitalize">{monthLabel}</span>
        <button
          type="button"
          onClick={goToday}
          className="ml-1 border border-[var(--line)] px-3 py-1 text-xs font-medium text-[var(--ink-soft)] transition hover:bg-[var(--paper)]"
        >
          Hoje
        </button>
      </div>

      <div className="overflow-hidden [] border border-[var(--line)]">
        <div className="grid grid-cols-7 border-b border-[var(--line)] bg-[var(--paper)]">
          {dayLabels.map((d) => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">{d}</div>
          ))}
        </div>
        {weekRows.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x divide-[var(--line)] border-b border-[var(--line)] last:border-b-0">
            {week.map((cell, di) => {
              const items = cell.current ? (deadlinesByDay.get(cell.day) ?? []) : []
              return (
                <div
                  key={di}
                  className={`min-h-[100px] p-2 ${cell.current ? 'bg-[var(--bg-card-solid)]' : 'bg-[var(--paper)]'}`}
                >
                  <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    cell.isToday ? 'bg-[var(--teal)] text-white' : cell.current ? 'text-[var(--ink)]' : 'text-[var(--ink-soft)]/30'
                  }`}>
                    {cell.day}
                  </div>
                  <div className="space-y-1">
                    {items.map((sp) => {
                      const project = projectsById.get(sp.project_id)
                      if (!project) return null
                      const { className: chipClass } = disciplineMeta(sp.discipline)
                      return (
                        <button
                          key={sp.id}
                          type="button"
                          className={`w-full cursor-pointer rounded-lg border px-1.5 py-1 text-left text-[10px] leading-tight transition hover:opacity-80 ${chipClass}`}
                          onClick={() => onCardClick(project.id, sp.id)}
                        >
                          <div className="truncate font-semibold">{project.name}</div>
                          <div className="truncate opacity-70">{showDiscipline(sp.discipline)}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {noDeadline.length > 0 && (
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">Sem prazo</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {noDeadline.map((sp) => {
              const project = projectsById.get(sp.project_id)
              if (!project) return null
              const { Icon, className: chipClass } = disciplineMeta(sp.discipline)
              return (
                <div
                  key={sp.id}
                  className="cursor-pointer [] border border-[var(--line)] bg-[var(--bg-card-solid)] p-4 transition hover:shadow-[var(--shadow-panel-xs)]"
                  onClick={() => onCardClick(project.id, sp.id)}
                >
                  <div className="truncate font-medium text-[var(--ink)]">{project.name}</div>
                  <div className="mt-0.5 truncate text-xs text-[var(--ink-soft)]">{project.client_name || ''}</div>
                  <div className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${chipClass}`}>
                    <Icon className="h-3 w-3 shrink-0" />
                    {showDiscipline(sp.discipline)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
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
        className="relative z-10 w-full max-w-md [] border border-[var(--line)] bg-[var(--bg-card-solid)] p-6 shadow-[var(--shadow-panel)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/70">Conclusão</div>
            <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">{project.name}</h2>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">{showDiscipline(subproject.discipline)}</div>
          </div>
          <button onClick={onCancel} className="shrink-0 rounded-full border border-[var(--line)] p-2 text-[var(--ink-soft)] transition hover:bg-[var(--paper)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="mt-5 block text-sm font-medium text-[var(--ink)]">
          Data de conclusão
          <input
            className="mt-2 w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3"
            type="date"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)] transition hover:bg-[var(--paper)]">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={mutating || !value}
            className="bg-[var(--ink)] px-5 py-2.5 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
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
  subproject: Subproject | null
  comments: SubprojectComment[]
  timelineItems: ClientTimelineItem[]
  onClose: () => void
  onAutoSave: (form: ProjectModalForm) => void
  onSubprojectStageChange?: (stage: string) => void
  onAddComment: (body: string) => void
  mutating: boolean
}

interface ProjectModalForm {
  name: string
  code: string
  discipline: string
  stage: string
  contractAmount: string
  subprojectAmount: string
  salesOwner: string
  statusNote: string
  subprojectDeadline: string
  observacao: string
}

function timelineTone(kind: ClientTimelineItem['kind']) {
  if (kind === 'receipt') return 'border-[var(--emerald-border)] bg-[var(--emerald-bg)] text-[var(--emerald-text)]'
  if (kind === 'expense' || kind === 'payout') return 'border-[var(--rose-border)] bg-[var(--rose-bg)] text-[var(--rose-text)]'
  if (kind === 'deadline') return 'border-[var(--amber-border)] bg-[var(--amber-bg)] text-[var(--amber-text)]'
  if (kind === 'log') return 'border-[var(--sky-border)] bg-[var(--sky-bg)] text-[var(--sky-text)]'
  return 'border-[var(--teal-active-border)] bg-[var(--teal-active-bg)] text-[var(--teal)]'
}

function ProjectDetailModal({ project, subproject, comments, timelineItems, onClose, onAutoSave, onSubprojectStageChange, onAddComment, mutating }: ProjectModalProps) {
  const [form, setForm] = useState<ProjectModalForm>({
    name: project.name || '',
    code: project.code || '',
    discipline: toSystemKey(subproject?.discipline || project.discipline || ''),
    stage: project.stage || 'backlog',
    contractAmount: String(project.contract_amount || ''),
    subprojectAmount: String(subproject?.amount || ''),
    salesOwner: subproject?.responsible_partner || project.sales_owner || '',
    statusNote: project.status_note || '',
    subprojectDeadline: toDateInputValue(subproject?.deadline),
    observacao: subproject?.observacao || '',
  })
  const [localSubprojectStage, setLocalSubprojectStage] = useState(subproject?.stage ?? '')
  const [notesTab, setNotesTab] = useState<'edit' | 'preview'>('edit')
  const firstRender = useRef(true)
  const onAutoSaveRef = useRef(onAutoSave)
  const formFingerprint = useMemo(() => JSON.stringify(form), [form])
  const [lastSavedFingerprint, setLastSavedFingerprint] = useState(formFingerprint)
  const saveStatus = lastSavedFingerprint === formFingerprint ? 'saved' : 'idle'

  useEffect(() => { onAutoSaveRef.current = onAutoSave }, [onAutoSave])

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    const t = window.setTimeout(() => {
      onAutoSaveRef.current(form)
      setLastSavedFingerprint(formFingerprint)
    }, 1000)
    return () => window.clearTimeout(t)
  }, [form, formFingerprint])
  const [commentDraft, setCommentDraft] = useState('')

  const set = (field: keyof ProjectModalForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--ink)]/20 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto [] border border-[var(--line)] bg-[var(--bg-card-solid)] shadow-[var(--shadow-panel)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-6">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/70">Projeto</div>
            <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">{project.name}</h2>
            {project.client_name ? <div className="mt-0.5 text-sm text-[var(--ink-soft)]">{project.client_name}</div> : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                alterações salvas
              </span>
            )}
            <button onClick={onClose} className="rounded-full border border-[var(--line)] p-2 text-[var(--ink-soft)] transition hover:bg-[var(--paper)]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Nome</label>
            <input className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Disciplina</label>
            <select className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.discipline} onChange={set('discipline')}>
              <option value="">Sem disciplina</option>
              {disciplines.map((d) => <option key={d} value={d}>{LABELS[d]}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Observação</label>
            <input className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.statusNote} onChange={set('statusNote')} placeholder="Observação rápida sobre o estado atual" />
          </div>
          {!subproject ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Etapa</label>
              <select className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.stage} onChange={set('stage')}>
                {projectStages.map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
              </select>
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Responsável</label>
            <select className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.salesOwner} onChange={set('salesOwner')}>
              <option value="">Sem responsável</option>
              {partners.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Valor do contrato</label>
            <CurrencyInput className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.contractAmount} onChange={(v) => setForm((f) => ({ ...f, contractAmount: v }))} />
          </div>
          {subproject ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Valor do subprojeto</label>
              <CurrencyInput className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.subprojectAmount} onChange={(v) => setForm((f) => ({ ...f, subprojectAmount: v }))} />
            </div>
          ) : null}
          {subproject ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Etapa da disciplina</label>
                <select
                  className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm"
                  value={localSubprojectStage}
                  onChange={(e) => {
                    const s = e.target.value
                    if (s !== 'concluído') setLocalSubprojectStage(s)
                    onSubprojectStageChange?.(s)
                  }}
                >
                  {subprojectStages.map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Prazo da disciplina</label>
                <input
                  className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm"
                  type="date"
                  value={form.subprojectDeadline}
                  onChange={set('subprojectDeadline')}
                />
              </div>
            </>
          ) : null}
          <div className="md:col-span-2 [] border border-[var(--line)] bg-[var(--bg-card-82)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Timeline</div>
                <div className="mt-1 text-sm font-medium text-[var(--ink)]">Histórico comercial, operacional e financeiro</div>
              </div>
              <div className="text-xs text-[var(--ink-soft)]">{timelineItems.length} evento{timelineItems.length !== 1 ? 's' : ''}</div>
            </div>
            <div className="mt-4 space-y-3">
              {timelineItems.slice(0, 12).map((item) => (
                <div key={item.id} className="flex gap-3 border border-[var(--line)] bg-[var(--bg-card-85)] px-3 py-3 text-sm">
                  <div className="w-20 shrink-0 text-xs font-medium text-[var(--ink-soft)]">{formatDate(item.date)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-[var(--ink)]">{item.title}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${timelineTone(item.kind)}`}>{stageLabel(item.kind)}</span>
                    </div>
                    <div className="mt-1 text-xs text-[var(--ink-soft)]">{item.detail}</div>
                  </div>
                </div>
              ))}
              {timelineItems.length === 0 ? (
                <div className="border border-dashed border-[var(--line)] bg-[var(--bg-card-75)] px-4 py-3 text-sm text-[var(--ink-soft)]">
                  Ainda não há histórico suficiente para esse projeto.
                </div>
              ) : null}
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <label className="text-xs font-medium text-[var(--ink-soft)]">Observação do subprojeto</label>
                {subproject ? <div className="mt-1 text-xs text-[var(--ink-soft)]">{subproject.discipline} · {subproject.responsible_partner || 'Sem responsável operacional'}</div> : null}
              </div>
              <div className="flex rounded-full border border-[var(--line)] bg-[var(--paper)] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setNotesTab('edit')}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition ${notesTab === 'edit' ? 'bg-[var(--bg-card-solid)] font-medium text-[var(--ink)] shadow-sm' : 'text-[var(--ink-soft)]'}`}
                >
                  <Pencil className="h-3 w-3" /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => setNotesTab('preview')}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition ${notesTab === 'preview' ? 'bg-[var(--bg-card-solid)] font-medium text-[var(--ink)] shadow-sm' : 'text-[var(--ink-soft)]'}`}
                >
                  <Eye className="h-3 w-3" /> Preview
                </button>
              </div>
            </div>
            {notesTab === 'edit' ? (
              <textarea
                className="min-h-[140px] w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm"
                placeholder="Ex.: PGRCC, RITUR, memorial, licença, tipo de documento..."
                value={form.observacao}
                onChange={set('observacao')}
              />
            ) : (
              <div className="min-h-[140px] rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)]">
                {form.observacao ? (
                  <ReactMarkdown>{form.observacao}</ReactMarkdown>
                ) : (
                  <p className="text-[var(--ink-soft)]">Nenhuma observação definida para este subprojeto.</p>
                )}
              </div>
            )}
          </div>

          <div className="md:col-span-2 rounded-[24px] border border-[var(--line)] bg-[rgba(255,255,255,0.82)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Comentários</div>
                <div className="mt-1 text-sm font-medium text-[var(--ink)]">Notas com autor e horário</div>
              </div>
              <div className="text-xs text-[var(--ink-soft)]">{comments.length} comentário{comments.length !== 1 ? 's' : ''}</div>
            </div>
            <div className="mt-4 space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-[var(--ink-soft)]">
                    <span className="font-medium text-[var(--ink)]">{comment.created_by || 'Equipe Apolo'}</span>
                    <span>{formatDate(comment.created_at)}</span>
                  </div>
                  <div className="mt-2 text-sm text-[var(--ink)]">{comment.body}</div>
                </div>
              ))}
              {comments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/75 px-4 py-3 text-sm text-[var(--ink-soft)]">
                  Ainda não há comentários para esse subprojeto.
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <textarea
                className="min-h-[100px] w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm"
                placeholder="Escreva um comentário para registrar contexto, revisão, pendência..."
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={mutating || !commentDraft.trim() || !subproject}
                  onClick={() => {
                    onAddComment(commentDraft)
                    setCommentDraft('')
                  }}
                  className="rounded-2xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--paper)] disabled:opacity-60"
                >
                  Adicionar comentário
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Create project modal ─────────────────────────────────────────────────────

type CreateProjectForm = {
  clientName: string
  name: string
  code: string
  salesOwner: string
  contractAmount: string
  subprojects: Array<{ discipline: string; amount: string; responsiblePartner: string; deadline: string; observacao: string }>
}

function CreateProjectModal({ onClose, onCreate, mutating }: {
  onClose: () => void
  onCreate: (form: CreateProjectForm) => void
  mutating: boolean
}) {
  const [form, setForm] = useState<CreateProjectForm>({
    clientName: '',
    name: '',
    code: '',
    salesOwner: '',
    contractAmount: '',
    subprojects: [{ discipline: '', amount: '', responsiblePartner: '', deadline: '', observacao: '' }],
  })

  const set = (field: keyof Omit<CreateProjectForm, 'subprojects'>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const setSp = (idx: number, field: 'discipline' | 'amount' | 'responsiblePartner' | 'deadline' | 'observacao') =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => {
        const subprojects = [...f.subprojects]
        subprojects[idx] = { ...subprojects[idx], [field]: e.target.value }
        return { ...f, subprojects }
      })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--ink)]/20 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto [] border border-[var(--line)] bg-[var(--bg-card-solid)] shadow-[var(--shadow-panel)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-6">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/70">Novo projeto operacional</div>
            <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">Criar projeto do zero</h2>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full border border-[var(--line)] p-2 text-[var(--ink-soft)] transition hover:bg-[var(--paper)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Cliente</label>
            <input className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.clientName} onChange={set('clientName')} placeholder="Nome do cliente" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Nome do projeto *</label>
            <input className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.name} onChange={set('name')} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Código</label>
              <input className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.code} onChange={set('code')} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Responsável</label>
              <select className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.salesOwner} onChange={set('salesOwner')}>
                <option value="">—</option>
                {partners.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Valor do contrato</label>
              <input className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" type="number" value={form.contractAmount} onChange={set('contractAmount')} />
            </div>
          </div>

          <div className="border-t border-[var(--line)] pt-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--ink-soft)]">Disciplinas</span>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, subprojects: [...f.subprojects, { discipline: '', amount: '', responsiblePartner: '', deadline: '', observacao: '' }] }))}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--line)] px-3 py-1 text-xs text-[var(--ink)] transition hover:bg-[var(--paper)]"
              >
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {form.subprojects.map((sp, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 border border-[var(--line)] bg-[var(--paper)] p-3">
                  <select className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs" value={sp.discipline} onChange={setSp(idx, 'discipline')}>
                    <option value="">Disciplina</option>
                    {disciplines.map((d) => <option key={d} value={d}>{LABELS[d]}</option>)}
                  </select>
                  <select className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs" value={sp.responsiblePartner} onChange={setSp(idx, 'responsiblePartner')}>
                    <option value="">Responsável</option>
                    {partners.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs" type="number" placeholder="Valor" value={sp.amount} onChange={setSp(idx, 'amount')} />
                  <input className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs" type="date" placeholder="Prazo" value={sp.deadline} onChange={setSp(idx, 'deadline')} />
                  {form.subprojects.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, subprojects: f.subprojects.filter((_, i) => i !== idx) }))}
                      className="flex items-center justify-center rounded-xl border border-[var(--line)] p-2 text-[var(--ink-soft)] transition hover:text-rose-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : <div />}
                  <textarea
                    className="col-span-5 min-h-[72px] rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs"
                    placeholder="Observação do subprojeto"
                    value={sp.observacao}
                    onChange={setSp(idx, 'observacao')}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--line)] px-6 py-4">
          <button type="button" onClick={onClose} className="border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)] transition hover:bg-[var(--paper)]">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onCreate(form)}
            disabled={mutating || !form.name.trim()}
            className="bg-[var(--ink)] px-5 py-2.5 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Criar projeto
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
  statusNote: string
  observacao: string
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
    statusNote: '',
    observacao: '',
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

  const set = (field: keyof CreateFromLeadForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--ink)]/20 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg [] border border-[var(--line)] bg-[var(--bg-card-solid)] shadow-[var(--shadow-panel)]"
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
                className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm"
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
              <input className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.name} onChange={set('name')} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Código</label>
                <input className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.code} onChange={set('code')} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Disciplina</label>
                <select className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.discipline} onChange={set('discipline')}>
                  <option value="">Sem disciplina</option>
                  {disciplines.map((d) => <option key={d} value={d}>{LABELS[d]}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Responsável</label>
                <select className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.salesOwner} onChange={set('salesOwner')}>
                  <option value="">Sem responsável</option>
                  {partners.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Valor do contrato</label>
                <input className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" type="number" value={form.contractAmount} onChange={set('contractAmount')} />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Observação do subprojeto</label>
                <textarea
                  className="min-h-[96px] w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm"
                  value={form.observacao}
                  onChange={set('observacao')}
                  placeholder="Ex.: PGRCC, RITUR, licença, tipo de documento..."
                />
              </div>
            </div>
          </div>
        )}

        {wonLeads.length > 0 ? (
          <div className="flex justify-end gap-3 border-t border-[var(--line)] px-6 py-4">
            <button type="button" onClick={onClose} className="border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)] transition hover:bg-[var(--paper)]">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onCreate(selectedLeadId, form)}
              disabled={mutating || !selectedLeadId || !form.name}
              className="bg-[var(--ink)] px-5 py-2.5 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
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
  const [selectedSubprojectId, setSelectedSubprojectId] = useState<string | null>(null)
  const [showCreateFromLead, setShowCreateFromLead] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [viewMode, setViewMode] = useState<'kanban' | 'calendar'>('kanban')
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({})
  const [sortKey, setSortKey] = useState<OpsSortKey>('updated')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [completionDraft, setCompletionDraft] = useState<{ subprojectId: string; projectId: string } | null>(null)
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10))
  const [searchQuery, setSearchQuery] = useState('')
  const [hiddenStages, setHiddenStages] = useState<Set<string>>(new Set())
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const columnPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showColumnPicker) return
    const handler = (e: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) {
        setShowColumnPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColumnPicker])

  const toggleStageVisibility = (stage: string) => {
    setHiddenStages((prev) => {
      const next = new Set(prev)
      if (next.has(stage)) next.delete(stage)
      else next.add(stage)
      return next
    })
  }
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
      let result = 0
      if (sortKey === 'latest') result = dateValue(a.created_at) - dateValue(b.created_at)
      if (sortKey === 'updated') result = dateValue(a.updated_at) - dateValue(b.updated_at)
      if (sortKey === 'deadline') result = dateValue(a.deadline) - dateValue(b.deadline)
      if (sortKey === 'value') result = numericValue(a.amount) - numericValue(b.amount)
      if (result === 0) result = a.discipline.localeCompare(b.discipline)
      return result * direction
    })
  }, [sortDirection, sortKey, subprojectsWithOverrides])

  const filteredSubprojects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sortedSubprojects
    return sortedSubprojects.filter((sp) => {
      const project = projectsById.get(sp.project_id)
      return (
        project?.name?.toLowerCase().includes(q) ||
        project?.client_name?.toLowerCase().includes(q) ||
        sp.discipline?.toLowerCase().includes(q) ||
        sp.responsible_partner?.toLowerCase().includes(q)
      )
    })
  }, [sortedSubprojects, searchQuery, projectsById])

  const kanban = useMemo(
    () => Object.fromEntries(OPS_STAGES.map((stage) => [stage, filteredSubprojects.filter((subproject) => subproject.stage === stage)])),
    [filteredSubprojects],
  )

  const wonLeads = useMemo(
    () => data.leads.filter((l) => l.stage === 'won' && !data.projects.some((p) => p.lead_id === l.id)),
    [data.leads, data.projects],
  )

  const selectedProject = useMemo(
    () => data.projects.find((p) => p.id === selectedProjectId) ?? null,
    [data.projects, selectedProjectId],
  )
  const selectedSubproject = useMemo(
    () => selectedSubprojectId ? (subprojectsWithOverrides.find((s) => s.id === selectedSubprojectId) ?? null) : null,
    [selectedSubprojectId, subprojectsWithOverrides],
  )
  const selectedSubprojectComments = useMemo(
    () => selectedSubproject
      ? data.subprojectComments
        .filter((comment) => comment.subproject_id === selectedSubproject.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      : [],
    [data.subprojectComments, selectedSubproject],
  )
  const selectedProjectTimeline = useMemo(
    () => selectedProject ? buildClientTimeline(data, selectedProject.client_name, { projectId: selectedProject.id }) : [],
    [data, selectedProject],
  )

  const visibleStages = useMemo(() => OPS_STAGES.filter((s) => !hiddenStages.has(s)), [hiddenStages])

  const completionSubproject = completionDraft ? subprojectsWithOverrides.find((item) => item.id === completionDraft.subprojectId) ?? null : null
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

  const handleProjectAutoSave = useCallback(
    (form: ProjectModalForm) => {
      if (!selectedProject) return
      void submitMutation(
        'updateProject',
        { id: selectedProject.id, ...form },
        selectedSubproject
          ? () => void submitMutation('updateSubproject', {
              id: selectedSubproject.id,
              discipline: form.discipline,
              responsiblePartner: form.salesOwner,
              amount: form.subprojectAmount,
              deadline: form.subprojectDeadline || null,
              observacao: form.observacao,
            })
          : undefined,
      )
    },
    [selectedProject, selectedSubproject, submitMutation],
  )

  const handleSubprojectStageChangeFromModal = useCallback(
    (stage: string) => {
      if (!selectedSubproject) return
      if (stage === 'concluído') {
        setCompletionDraft({ subprojectId: selectedSubproject.id, projectId: selectedSubproject.project_id })
        setCompletionDate(new Date().toISOString().slice(0, 10))
        return
      }
      const id = selectedSubproject.id
      const projectId = selectedSubproject.project_id
      setStageOverrides((prev) => ({ ...prev, [id]: stage }))
      void submitMutation(
        'updateSubprojectStage',
        { id, projectId, stage },
        () => setStageOverrides((prev) => { const next = { ...prev }; delete next[id]; return next }),
        'Etapa atualizada',
      ).catch(() => {
        setStageOverrides((prev) => { const next = { ...prev }; delete next[id]; return next })
      })
    },
    [selectedSubproject, submitMutation],
  )

  const handleAddSubprojectComment = useCallback(
    (body: string) => {
      if (!selectedSubproject) return
      void submitMutation(
        'addSubprojectComment',
        { subprojectId: selectedSubproject.id, body },
        undefined,
        'Comentário adicionado',
      )
    },
    [selectedSubproject, submitMutation],
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

  const handleCreateProject = useCallback(
    (form: CreateProjectForm) => {
      void submitMutation(
        'createProject',
        { ...form, subprojects: form.subprojects.filter((sp) => sp.discipline) },
        () => setShowCreateProject(false),
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
            <div className="flex border border-[var(--line)] bg-[var(--bg-card-80)] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${viewMode === 'kanban' ? 'bg-[var(--teal)] text-white' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Kanban
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${viewMode === 'calendar' ? 'bg-[var(--teal)] text-white' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'}`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Calendário
              </button>
            </div>
            {viewMode === 'kanban' ? [
              ['latest', 'Mais recentes'],
              ['updated', 'Atualizados'],
              ['deadline', 'Prazo'],
              ['value', 'Valor'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleSort(key as OpsSortKey)}
                className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-medium transition ${
                  sortKey === key ? 'border-[var(--teal-active-border)] bg-[var(--teal-active-bg)] text-[var(--teal)]' : 'border-[var(--line)] bg-[var(--bg-card-80)] text-[var(--ink)] hover:bg-[var(--paper)]'
                }`}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {label} {sortKey === key ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
              </button>
            )) : null}
            {viewMode === 'kanban' ? (
              <div ref={columnPickerRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowColumnPicker((v) => !v)}
                  className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-medium transition ${
                    showColumnPicker || hiddenStages.size > 0
                      ? 'border-[var(--teal-active-border)] bg-[var(--teal-active-bg)] text-[var(--teal)]'
                      : 'border-[var(--line)] bg-[var(--bg-card-80)] text-[var(--ink)] hover:bg-[var(--paper)]'
                  }`}
                >
                  <Columns3 className="h-3.5 w-3.5" />
                  Colunas{hiddenStages.size > 0 ? ` (${OPS_STAGES.length - hiddenStages.size}/${OPS_STAGES.length})` : ''}
                </button>
                {showColumnPicker ? (
                  <div className="absolute right-0 top-full z-50 mt-1 w-52 border border-[var(--line)] bg-[var(--bg-card-solid)] shadow-[var(--shadow-panel)] py-1">
                    {OPS_STAGES.map((stage) => {
                      const visible = !hiddenStages.has(stage)
                      return (
                        <button
                          key={stage}
                          type="button"
                          onClick={() => toggleStageVisibility(stage)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-xs text-[var(--ink)] hover:bg-[var(--bg-card-80)] transition"
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center border ${visible ? 'border-[var(--teal)] bg-[var(--teal)]' : 'border-[var(--line)]'}`}>
                            {visible ? <X className="h-2.5 w-2.5 text-white" /> : null}
                          </span>
                          {stageLabel(stage)}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setShowCreateProject(true)}
              className="inline-flex items-center gap-2 border border-[var(--line)] bg-[var(--bg-card-80)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--paper)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo projeto
            </button>
            <button
              type="button"
              onClick={() => setShowCreateFromLead(true)}
              className="inline-flex items-center gap-2 border border-[var(--line)] bg-[var(--bg-card-80)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--paper)]"
            >
              <Plus className="h-3.5 w-3.5" />
              De comercial
            </button>
          </div>
        }
      >
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-soft)]" />
          <input
            type="text"
            placeholder="Buscar por projeto, cliente, disciplina ou responsável…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-[var(--line)] bg-[var(--paper)] py-2.5 pl-9 pr-4 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)]/60 focus:outline-none"
          />
        </div>
        {viewMode === 'calendar' ? (
          <CalendarView
            subprojects={filteredSubprojects}
            projectsById={projectsById}
            onCardClick={(projectId, subprojectId) => { setSelectedProjectId(projectId); setSelectedSubprojectId(subprojectId) }}
          />
        ) : opsSubprojects.length === 0 ? (
          <EmptyState
            title="Nenhum projeto operacional"
            body='Use "Novo projeto" ou "De comercial" para criar um projeto.'
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4 h-[calc(100vh-260px)]" style={{ minWidth: `${visibleStages.length * 296}px` }}>
                {visibleStages.map((stage) => (
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
                            onClick={() => {
                              setSelectedProjectId(project.id)
                              setSelectedSubprojectId(subproject.id)
                            }}
                          />
                        )
                      })
                    ) : (
                      <div className="[] border border-dashed border-[var(--line)] bg-[var(--bg-card-65)] p-4 text-sm text-[var(--ink-soft)]">
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
          key={`${selectedProject.id}:${selectedSubproject?.id ?? 'none'}`}
          project={selectedProject}
          subproject={selectedSubproject}
          comments={selectedSubprojectComments}
          timelineItems={selectedProjectTimeline}
          onClose={() => { setSelectedProjectId(null); setSelectedSubprojectId(null) }}
          onAutoSave={handleProjectAutoSave}
          onSubprojectStageChange={handleSubprojectStageChangeFromModal}
          onAddComment={handleAddSubprojectComment}
          mutating={mutating}
        />
      ) : null}

      {showCreateProject ? (
        <CreateProjectModal
          onClose={() => setShowCreateProject(false)}
          onCreate={handleCreateProject}
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
