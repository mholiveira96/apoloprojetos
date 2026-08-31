import { useState, useMemo, useCallback } from 'react'
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
  GripVertical,
  CalendarDays,
  Search,
  Trash2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { BootstrapData, Revision, Project } from '@/types/app'
import { Panel, EmptyState } from '@/components/workspace/ui'
import { formatDate, stageLabel } from '@/lib/formatters'
import { revisionStages, partners, LABELS } from '@/lib/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

type SubmitMutation = (
  action: string,
  payload: Record<string, unknown>,
  onSuccess?: () => void,
  successMessage?: string,
  onError?: () => void,
) => Promise<void>

interface Props {
  data: BootstrapData
  submitMutation: SubmitMutation
  mutating: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false
  return deadline < todayISO()
}

// ─── Droppable column ─────────────────────────────────────────────────────────

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

// ─── Draggable revision card ──────────────────────────────────────────────────

function DraggableRevisionCard({
  revision,
  onClick,
}: {
  revision: Revision
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: revision.id })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const overdue = isOverdue(revision.deadline)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`select-none cursor-pointer [] border border-[var(--line)] bg-[var(--bg-card-92)] p-4 shadow-[var(--shadow-panel-xs)] transition-opacity ${
        isDragging ? 'opacity-40' : 'opacity-100'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--ink)]">{revision.client_name}</div>
          <div className="mt-0.5 line-clamp-2 text-sm text-[var(--ink-soft)]">{revision.description}</div>
        </div>
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 shrink-0 cursor-grab touch-none text-[var(--ink-soft)]/50 hover:text-[var(--ink-soft)] active:cursor-grabbing"
          aria-label="Arrastar"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {revision.responsible_partner ? (
          <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 text-[var(--ink-soft)]">
            {revision.responsible_partner}
          </span>
        ) : null}
        {revision.project_name ? (
          <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[var(--ink-soft)]">
            {revision.project_name}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {revision.deadline ? (
          <span className={`inline-flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : 'text-[var(--ink-soft)]'}`}>
            <CalendarDays className="h-3 w-3" />
            {formatDate(revision.deadline)}
            {overdue ? (
              <span className="ml-1 rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                Atrasado
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  )
}

// ─── Completion date modal ────────────────────────────────────────────────────

function CompletionDateModal({
  value,
  onChange,
  onCancel,
  onConfirm,
  mutating,
}: {
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
            <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">Revisão concluída</h2>
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

// ─── Create revision modal ────────────────────────────────────────────────────

type CreateRevisionForm = {
  clientName: string
  description: string
  projectId: string
  responsiblePartner: string
  deadline: string
}

function CreateRevisionModal({
  projects,
  onClose,
  onCreate,
  mutating,
}: {
  projects: Project[]
  onClose: () => void
  onCreate: (form: CreateRevisionForm) => void
  mutating: boolean
}) {
  const [form, setForm] = useState<CreateRevisionForm>({
    clientName: '',
    description: '',
    projectId: '',
    responsiblePartner: '',
    deadline: '',
  })

  const set = (field: keyof CreateRevisionForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--ink)]/20 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto [] border border-[var(--line)] bg-[var(--bg-card-solid)] shadow-[var(--shadow-panel)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-6">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/70">Nova revisão</div>
            <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">Criar revisão</h2>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full border border-[var(--line)] p-2 text-[var(--ink-soft)] transition hover:bg-[var(--paper)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Cliente *</label>
            <input className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.clientName} onChange={set('clientName')} placeholder="Nome do cliente" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Descrição *</label>
            <textarea className="w-full min-h-[80px] border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.description} onChange={set('description')} placeholder="Descreva a revisão" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Projeto</label>
              <select className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.projectId} onChange={set('projectId')}>
                <option value="">Sem projeto</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Responsável *</label>
              <select className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.responsiblePartner} onChange={set('responsiblePartner')}>
                <option value="">Selecione</option>
                {partners.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Prazo</label>
            <input className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" type="date" value={form.deadline} onChange={set('deadline')} />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--line)] px-6 py-4">
          <button type="button" onClick={onClose} className="border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)] transition hover:bg-[var(--paper)]">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onCreate(form)}
            disabled={mutating || !form.clientName.trim() || !form.description.trim() || !form.responsiblePartner}
            className="bg-[var(--ink)] px-5 py-2.5 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Criar revisão
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit revision modal ──────────────────────────────────────────────────────

type EditRevisionForm = {
  clientName: string
  description: string
  projectId: string
  responsiblePartner: string
  deadline: string
  deliveryDate: string
}

function EditRevisionModal({
  revision,
  projects,
  onClose,
  onSave,
  onDelete,
  mutating,
}: {
  revision: Revision
  projects: Project[]
  onClose: () => void
  onSave: (form: EditRevisionForm) => void
  onDelete: () => void
  mutating: boolean
}) {
  const [form, setForm] = useState<EditRevisionForm>({
    clientName: revision.client_name || '',
    description: revision.description || '',
    projectId: revision.project_id || '',
    responsiblePartner: revision.responsible_partner || '',
    deadline: revision.deadline || '',
    deliveryDate: revision.delivery_date || '',
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const set = (field: keyof EditRevisionForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--ink)]/20 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto [] border border-[var(--line)] bg-[var(--bg-card-solid)] shadow-[var(--shadow-panel)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-6">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/70">Revisão</div>
            <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">{revision.client_name}</h2>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">{stageLabel(revision.stage)}</div>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full border border-[var(--line)] p-2 text-[var(--ink-soft)] transition hover:bg-[var(--paper)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Cliente *</label>
            <input className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.clientName} onChange={set('clientName')} placeholder="Nome do cliente" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Descrição *</label>
            <textarea className="w-full min-h-[80px] border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.description} onChange={set('description')} placeholder="Descreva a revisão" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Projeto</label>
              <select className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.projectId} onChange={set('projectId')}>
                <option value="">Sem projeto</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Responsável *</label>
              <select className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" value={form.responsiblePartner} onChange={set('responsiblePartner')}>
                <option value="">Selecione</option>
                {partners.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Prazo</label>
              <input className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" type="date" value={form.deadline} onChange={set('deadline')} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--ink-soft)]">Data de entrega</label>
              <input className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2.5 text-sm" type="date" value={form.deliveryDate} onChange={set('deliveryDate')} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--line)] px-6 py-4">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 text-sm text-red-600 transition hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </button>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)] transition hover:bg-[var(--paper)]">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onSave(form)}
              disabled={mutating || !form.clientName.trim() || !form.description.trim() || !form.responsiblePartner}
              className="bg-[var(--ink)] px-5 py-2.5 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
            >
              Salvar
            </button>
          </div>
        </div>

        {showDeleteConfirm ? (
          <DeleteConfirmModal
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={onDelete}
            mutating={mutating}
          />
        ) : null}
      </div>
    </div>
  )
}

// ─── Delete confirmation modal ────────────────────────────────────────────────

function DeleteConfirmModal({
  onCancel,
  onConfirm,
  mutating,
}: {
  onCancel: () => void
  onConfirm: () => void
  mutating: boolean
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-[var(--ink)]/20 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm [] border border-[var(--line)] bg-[var(--bg-card-solid)] p-6 shadow-[var(--shadow-panel)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/70">Excluir</div>
        <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">Tem certeza?</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">Esta ação não pode ser desfeita.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)] transition hover:bg-[var(--paper)]">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={mutating}
            className="border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-medium text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 disabled:opacity-60"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function RevisoesKanbanPage({ data, submitMutation, mutating }: Props) {
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editRevisionId, setEditRevisionId] = useState<string | null>(null)
  const [completionDraft, setCompletionDraft] = useState<string | null>(null)
  const [completionDate, setCompletionDate] = useState(todayISO())
  const [deleteDraftId, setDeleteDraftId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  // Derived data
  const projectsById = useMemo(
    () => new Map(data.projects.map((project) => [project.id, project])),
    [data.projects],
  )

  const sortedProjects = useMemo(
    () => [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
    [data.projects],
  )

  const revisionsWithOverrides = useMemo(
    () => data.revisions.map((r) => stageOverrides[r.id] ? { ...r, stage: stageOverrides[r.id] } : r),
    [data.revisions, stageOverrides],
  )

  const filteredRevisions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return revisionsWithOverrides
    return revisionsWithOverrides.filter((r) => {
      const project = r.project_id ? projectsById.get(r.project_id) : null
      return (
        r.client_name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.responsible_partner?.toLowerCase().includes(q) ||
        project?.name?.toLowerCase().includes(q)
      )
    })
  }, [revisionsWithOverrides, searchQuery, projectsById])

  const kanban = useMemo(
    () => Object.fromEntries(revisionStages.map((stage) => [stage, filteredRevisions.filter((r) => r.stage === stage)])),
    [filteredRevisions],
  )

  const editRevision = useMemo(
    () => editRevisionId ? data.revisions.find((r) => r.id === editRevisionId) ?? null : null,
    [editRevisionId, data.revisions],
  )

  const completionRevision = completionDraft ? data.revisions.find((r) => r.id === completionDraft) ?? null : null

  const deleteDraftRevision = deleteDraftId ? data.revisions.find((r) => r.id === deleteDraftId) ?? null : null

  // Handlers
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const revisionId = String(event.active.id)
      const targetStage = event.over ? String(event.over.id) : null
      if (!targetStage || !revisionStages.includes(targetStage as typeof revisionStages[number])) return
      const revision = data.revisions.find((r) => r.id === revisionId)
      if (!revision || revision.stage === targetStage) return

      if (targetStage === 'concluída') {
        setCompletionDraft(revisionId)
        setCompletionDate(todayISO())
        return
      }

      setStageOverrides((prev) => ({ ...prev, [revisionId]: targetStage }))
      window.setTimeout(() => {
        void submitMutation(
          'updateRevisionStage',
          { id: revisionId, stage: targetStage },
          () => setStageOverrides((prev) => { const next = { ...prev }; delete next[revisionId]; return next }),
          'Etapa atualizada',
          () => setStageOverrides((prev) => { const next = { ...prev }; delete next[revisionId]; return next }),
        )
      }, 0)
    },
    [data.revisions, submitMutation],
  )

  const handleConfirmCompletion = useCallback(() => {
    if (!completionDraft || !completionDate) return
    const id = completionDraft
    setStageOverrides((prev) => ({ ...prev, [id]: 'concluída' }))
    window.setTimeout(() => {
      void submitMutation(
        'updateRevisionStage',
        { id, stage: 'concluída', deliveryDate: completionDate },
        () => {
          setCompletionDraft(null)
          setStageOverrides((prev) => { const next = { ...prev }; delete next[id]; return next })
        },
        'Revisão concluída',
        () => setStageOverrides((prev) => { const next = { ...prev }; delete next[id]; return next }),
      )
    }, 0)
  }, [completionDate, completionDraft, submitMutation])

  const handleCreate = useCallback(
    (form: CreateRevisionForm) => {
      void submitMutation(
        'createRevision',
        {
          clientName: form.clientName.trim(),
          description: form.description.trim(),
          projectId: form.projectId || null,
          responsiblePartner: form.responsiblePartner,
          deadline: form.deadline || null,
        },
        () => setShowCreateModal(false),
        'Revisão criada',
      )
    },
    [submitMutation],
  )

  const handleSaveEdit = useCallback(
    (form: EditRevisionForm) => {
      if (!editRevisionId) return
      void submitMutation(
        'updateRevision',
        {
          id: editRevisionId,
          clientName: form.clientName.trim(),
          description: form.description.trim(),
          projectId: form.projectId || null,
          responsiblePartner: form.responsiblePartner,
          deadline: form.deadline || null,
          deliveryDate: form.deliveryDate || null,
        },
        () => setEditRevisionId(null),
        'Revisão salva',
      )
    },
    [editRevisionId, submitMutation],
  )

  const handleDelete = useCallback(() => {
    if (!deleteDraftId) return
    const id = deleteDraftId
    void submitMutation(
      'deleteRevision',
      { id },
      () => {
        setDeleteDraftId(null)
        setEditRevisionId(null)
      },
      'Revisão excluída',
    )
  }, [deleteDraftId, submitMutation])

  const hasRevisions = data.revisions.length > 0

  return (
    <>
      <Panel
        title="Revisões"
        subtitle="Acompanhamento de revisões e refazimentos não pagos."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 border border-[var(--line)] bg-[var(--bg-card-80)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--paper)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova revisão
            </button>
          </div>
        }
      >
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-soft)]" />
          <input
            type="text"
            placeholder="Buscar por cliente, descrição, responsável ou projeto…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-[var(--line)] bg-[var(--paper)] py-2.5 pl-9 pr-4 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)]/60 focus:outline-none"
          />
        </div>

        {!hasRevisions ? (
          <EmptyState
            title="Nenhuma revisão"
            body='Use "Nova revisão" para criar a primeira.'
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4 h-[calc(100vh-260px)]" style={{ minWidth: `${revisionStages.length * 296}px` }}>
                {revisionStages.map((stage) => (
                  <DroppableColumn
                    key={stage}
                    id={stage}
                    title={LABELS[stage] || stage}
                    count={kanban[stage]?.length ?? 0}
                  >
                    {kanban[stage]?.length ? (
                      kanban[stage].map((revision) => (
                        <DraggableRevisionCard
                          key={revision.id}
                          revision={revision}
                          onClick={() => setEditRevisionId(revision.id)}
                        />
                      ))
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

      {showCreateModal ? (
        <CreateRevisionModal
          projects={sortedProjects}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
          mutating={mutating}
        />
      ) : null}

      {editRevision ? (
        <EditRevisionModal
          revision={editRevision}
          projects={sortedProjects}
          onClose={() => setEditRevisionId(null)}
          onSave={handleSaveEdit}
          onDelete={() => setDeleteDraftId(editRevision.id)}
          mutating={mutating}
        />
      ) : null}

      {completionRevision ? (
        <CompletionDateModal
          value={completionDate}
          onChange={setCompletionDate}
          onCancel={() => setCompletionDraft(null)}
          onConfirm={handleConfirmCompletion}
          mutating={mutating}
        />
      ) : null}

      {deleteDraftRevision ? (
        <DeleteConfirmModal
          onCancel={() => setDeleteDraftId(null)}
          onConfirm={handleDelete}
          mutating={mutating}
        />
      ) : null}
    </>
  )
}
