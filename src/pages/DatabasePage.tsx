import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { BootstrapData, Project, Subproject } from '@/types/app'
import {
  projectStages,
  subprojectStages,
  disciplines,
  partners,
  LABELS,
} from '@/lib/constants'
import {
  formatArea,
  formatCurrency,
  formatDate,
  normalizeSearchText,
  stageLabel,
  stageTone,
  toDateInputValue,
} from '@/lib/formatters'

type Props = {
  data: BootstrapData
  submitMutation: (
    action: string,
    payload: Record<string, unknown>,
    onSuccess?: () => void,
    successMsg?: string,
  ) => Promise<void>
  mutating: boolean
}

type NewSubprojectForm = {
  discipline: string
  amount: string
  responsiblePartner: string
  deadline: string
  observacao: string
  areaMode: 'inherit' | 'custom' | 'na'
  area: string
}

function createNewSubprojectForm(project?: Project): NewSubprojectForm {
  return {
    discipline: '',
    amount: '',
    responsiblePartner: project?.sales_owner || '',
    deadline: '',
    observacao: '',
    areaMode: 'inherit',
    area: '',
  }
}

function FieldDisplay({
  children,
  onStart,
  tone = 'default',
}: {
  children: ReactNode
  onStart: () => void
  tone?: 'default' | 'muted'
}) {
  return (
    <button
      type="button"
      onClick={onStart}
      className={`group inline-flex w-full items-center justify-between gap-2 rounded border px-2 py-1 text-left transition ${tone === 'muted'
        ? 'border-transparent text-[var(--ink-soft)] hover:border-[var(--line)] hover:bg-[var(--teal-active-bg)] hover:text-[var(--ink)]'
        : 'border-transparent text-[var(--ink)] hover:border-[var(--line)] hover:bg-[var(--teal-active-bg)]'}`}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-transparent text-[var(--ink-soft)] opacity-0 transition group-hover:border-[var(--line)] group-hover:opacity-100">
        <Pencil className="h-3.5 w-3.5" />
      </span>
    </button>
  )
}

function StageBadge({ stage }: { stage: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${stageTone(stage)}`}>
      {stageLabel(stage)}
    </span>
  )
}

/* ─── Inline editors ─────────────────────────────────────────── */

function EditableText({
  value,
  isEditing,
  onStart,
  onChange,
  onCommit,
  format,
}: {
  value: string
  isEditing: boolean
  onStart: () => void
  onChange: (v: string) => void
  onCommit: () => void
  format?: (v: string) => string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (isEditing && ref.current) {
      ref.current.focus()
      ref.current.select()
    }
  }, [isEditing])

  if (isEditing) {
    return (
      <input
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={e => {
          if (e.key === 'Enter') onCommit()
          if (e.key === 'Escape') onCommit()
        }}
        className="w-full bg-[var(--bg)] border border-[var(--teal)] px-2 py-1 text-sm text-[var(--ink)] outline-none"
      />
    )
  }

  return (
    <FieldDisplay onStart={onStart} tone="default">
      {format ? format(value) : value || '—'}
    </FieldDisplay>
  )
}

function EditableSelect({
  value,
  options,
  isEditing,
  onStart,
  onChange,
  onCommit,
}: {
  value: string
  options: string[]
  isEditing: boolean
  onStart: () => void
  onChange: (v: string) => void
  onCommit: (nextValue?: string) => void
}) {
  const ref = useRef<HTMLSelectElement>(null)
  useEffect(() => {
    if (isEditing && ref.current) ref.current.focus()
  }, [isEditing])

  if (isEditing) {
    return (
      <select
        ref={ref}
        value={value}
        onChange={e => {
          const nextValue = e.target.value
          onChange(nextValue)
          onCommit(nextValue)
        }}
        onBlur={e => onCommit(e.target.value)}
        className="w-full bg-[var(--bg)] border border-[var(--teal)] px-2 py-1 text-sm text-[var(--ink)] outline-none"
      >
        {options.map(opt => (
          <option key={opt} value={opt}>
            {LABELS[opt] || opt}
          </option>
        ))}
      </select>
    )
  }

  return (
    <FieldDisplay onStart={onStart} tone="default">
      {LABELS[value] || value || '—'}
    </FieldDisplay>
  )
}

function EditableCurrency({
  value,
  isEditing,
  onStart,
  onChange,
  onCommit,
  formatValue = formatCurrency,
}: {
  value: number
  isEditing: boolean
  onStart: () => void
  onChange: (v: string) => void
  onCommit: () => void
  formatValue?: (value: number) => string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (isEditing && ref.current) {
      ref.current.focus()
      ref.current.select()
    }
  }, [isEditing])

  if (isEditing) {
    return (
      <input
        ref={ref}
        type="number"
        step="0.01"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={e => {
          if (e.key === 'Enter') onCommit()
          if (e.key === 'Escape') onCommit()
        }}
        className="w-full bg-[var(--bg)] border border-[var(--teal)] px-2 py-1 text-sm text-[var(--ink)] outline-none text-right"
      />
    )
  }

  return (
    <FieldDisplay onStart={onStart} tone="default">
      {formatValue(value)}
    </FieldDisplay>
  )
}

function EditableDate({
  value,
  isEditing,
  onStart,
  onChange,
  onCommit,
}: {
  value: string | null
  isEditing: boolean
  onStart: () => void
  onChange: (v: string) => void
  onCommit: (nextValue?: string) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (isEditing && ref.current) ref.current.focus()
  }, [isEditing])

  if (isEditing) {
    return (
      <input
        ref={ref}
        type="date"
        value={value || ''}
        onChange={e => {
          const nextValue = e.target.value
          onChange(nextValue)
          onCommit(nextValue)
        }}
        onBlur={e => onCommit(e.target.value)}
        className="w-full bg-[var(--bg)] border border-[var(--teal)] px-2 py-1 text-sm text-[var(--ink)] outline-none"
      />
    )
  }

  return (
    <FieldDisplay onStart={onStart} tone="default">
      {value ? formatDate(value) : '—'}
    </FieldDisplay>
  )
}

/* ─── Stage badge ────────────────────────────────────────────── */

/* ─── Confirm modal ──────────────────────────────────────────── */

type ConfirmData = {
  entity: Project | Subproject
  entityType: 'project' | 'subproject'
  field: string
  fieldLabel: string
  oldValue: string
  newValue: string
  newValueRaw: string | number
}

type DeleteModalData =
  | {
    entityType: 'project'
    project: Project
    subprojects: Subproject[]
  }
  | {
    entityType: 'subproject'
    project: Project
    subproject: Subproject
    subprojects: Subproject[]
  }

function ConfirmModal({
  modal,
  onConfirm,
  onCancel,
}: {
  modal: ConfirmData
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="relative z-10 w-full max-w-md border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[var(--motion-shadow-modal)] dark:bg-[#1c1c20]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-[var(--ink)] mb-4">
          Confirmar alteração
        </h2>
        <p className="text-sm text-[var(--ink-soft)] mb-1">
          Alterar <strong>{modal.fieldLabel}</strong> de{' '}
          <strong>{modal.oldValue || '—'}</strong> para{' '}
          <strong>{modal.newValue || '—'}</strong>?
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-[var(--teal)] text-white hover:opacity-90 transition"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmModal({
  modal,
  onCancel,
  onDeleteProject,
  onDeleteSubproject,
  mutating,
}: {
  modal: DeleteModalData
  onCancel: () => void
  onDeleteProject: () => void
  onDeleteSubproject: () => void
  mutating: boolean
}) {
  const project = modal.project
  const allSubprojects = modal.subprojects

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="relative z-10 w-full max-w-md border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[var(--motion-shadow-modal)] dark:bg-[#1c1c20]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/70">Excluir</div>
            <h2 className="mt-1 text-base font-semibold text-[var(--ink)]">{project.name}</h2>
            {project.client_name ? <div className="mt-0.5 text-sm text-[var(--ink-soft)]">{project.client_name}</div> : null}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--line)] p-2 text-[var(--ink-soft)] transition hover:bg-[var(--bg)] hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {modal.entityType === 'subproject' ? (
            <button
              type="button"
              disabled={mutating}
              onClick={onDeleteSubproject}
              className="w-full border border-[var(--line)] bg-[var(--bg)] p-4 text-left transition hover:border-[var(--teal-active-border)] hover:bg-[var(--teal-active-bg)] disabled:opacity-60"
            >
              <div className="text-sm font-semibold text-[var(--ink)]">Excluir apenas esta disciplina</div>
              <div className="mt-1 text-xs text-[var(--ink-soft)]">
                Remove {LABELS[modal.subproject.discipline] || modal.subproject.discipline} deste projeto. As demais {allSubprojects.length - 1} disciplina{allSubprojects.length - 1 !== 1 ? 's' : ''} são mantidas.
              </div>
            </button>
          ) : null}

          <button
            type="button"
            disabled={mutating}
            onClick={onDeleteProject}
            className="w-full border border-rose-200 bg-rose-50 p-4 text-left transition hover:border-rose-400 hover:bg-rose-100 disabled:opacity-60"
          >
            <div className="text-sm font-semibold text-rose-700">
              {modal.entityType === 'project' ? 'Excluir projeto' : 'Excluir o projeto inteiro'}
            </div>
            <div className="mt-1 text-xs text-rose-600/80">
              {allSubprojects.length > 0
                ? `Remove o projeto e todas as ${allSubprojects.length} disciplina${allSubprojects.length !== 1 ? 's' : ''}.`
                : 'Remove o projeto por completo.'}
            </div>
            {allSubprojects.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {allSubprojects.map((subproject) => (
                  <span
                    key={subproject.id}
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      modal.entityType === 'subproject' && subproject.id === modal.subproject.id
                        ? 'border-rose-300 bg-rose-100 text-rose-700 line-through'
                        : 'border-rose-200 bg-[var(--paper)] text-rose-600'
                    }`}
                  >
                    {LABELS[subproject.discipline] || subproject.discipline}
                  </span>
                ))}
              </div>
            ) : null}
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="border border-[var(--line)] px-4 py-2 text-sm text-[var(--ink)] transition hover:bg-[var(--bg)]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────── */

export default function DatabasePage({ data, submitMutation, mutating }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [sort, setSort] = useState<{ field: string; dir: 'asc' | 'desc' } | null>({ field: 'code', dir: 'desc' })
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'with-deadline' | 'overdue'>('all')
  const [confirmModal, setConfirmModal] = useState<ConfirmData | null>(null)
  const [deleteModal, setDeleteModal] = useState<DeleteModalData | null>(null)
  const [creatingSubprojectFor, setCreatingSubprojectFor] = useState<string | null>(null)
  const [newSubprojectForm, setNewSubprojectForm] = useState<NewSubprojectForm>(createNewSubprojectForm())

  /* ─── Expand / collapse ─────────────────────────── */

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  /* ─── Sorting ───────────────────────────────────── */

  const toggleSort = useCallback((field: string) => {
    setSort(prev => {
      if (prev?.field !== field) return { field, dir: field === 'code' ? 'desc' : 'asc' }
      if (prev.dir === 'asc') return { field, dir: 'desc' }
      return null
    })
  }, [])

  const sortedProjects = useMemo(() => {
    const list = [...data.projects]
    if (!sort) return list
    return list.sort((a, b) => {
      const aVal = a[sort.field as keyof Project]
      const bVal = b[sort.field as keyof Project]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sort.dir === 'asc' ? aVal - bVal : bVal - aVal
      }
      const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), 'pt-BR', { numeric: true, sensitivity: 'base' })
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [data.projects, sort])

  const subprojectsByProject = useMemo(() => {
    const map: Record<string, Subproject[]> = {}
    for (const sp of data.subprojects) {
      if (!map[sp.project_id]) map[sp.project_id] = []
      map[sp.project_id].push(sp)
    }
    return map
  }, [data.subprojects])

  const projectMetaById = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return Object.fromEntries(
      data.projects.map(project => {
        const subs = subprojectsByProject[project.id] || []
        const completed = subs.filter(sp => sp.stage === 'concluído').length
        const active = subs.filter(sp => ['em-andamento', 'aguardando-revisao', 'bloqueado'].includes(sp.stage)).length
        const nextDeadline = [...subs]
          .filter(sp => sp.deadline)
          .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))[0]?.deadline ?? null
        const overdueCount = subs.filter(sp => sp.deadline && sp.deadline < today && sp.stage !== 'concluído').length
        return [
          project.id,
          {
            total: subs.length,
            completed,
            active,
            nextDeadline,
            overdueCount,
            outstanding: Math.max(0, Number(project.contract_amount || 0) - Number(project.total_received || 0)),
          },
        ]
      }),
    )
  }, [data.projects, subprojectsByProject])

  const ownerOptions = useMemo(
    () => ['all', ...new Set(sortedProjects.map(project => project.sales_owner || '').filter(Boolean))],
    [sortedProjects],
  )

  /* ─── Filtering ─────────────────────────────────── */

  const filteredProjects = useMemo(() => {
    const q = normalizeSearchText(search)
    return sortedProjects.filter(project => {
      const matchesSearch =
        !q ||
        normalizeSearchText(project.name).includes(q) ||
        normalizeSearchText(project.code || '').includes(q) ||
        normalizeSearchText(project.client_name || '').includes(q)

      const matchesStage = stageFilter === 'all' || project.stage === stageFilter
      const matchesOwner = ownerFilter === 'all' || (project.sales_owner || '') === ownerFilter

      const meta = projectMetaById[project.id]
      const matchesDeadline =
        deadlineFilter === 'all' ||
        (deadlineFilter === 'with-deadline' && Boolean(meta?.nextDeadline)) ||
        (deadlineFilter === 'overdue' && Boolean(meta?.overdueCount))

      return matchesSearch && matchesStage && matchesOwner && matchesDeadline
    })
  }, [deadlineFilter, ownerFilter, projectMetaById, search, sortedProjects, stageFilter])

  /* ─── Editing helpers ───────────────────────────── */

  const startEdit = useCallback((id: string, field: string, value: string) => {
    setEditing({ id, field })
    setEditValue(value)
  }, [])

  const handleCommit = useCallback(
    (
      entity: Project | Subproject,
      entityType: 'project' | 'subproject',
      field: string,
      fieldLabel: string,
      oldValue: string | number,
      newValue: string,
      committedValue?: string,
    ) => {
      setEditing(null)
      const effectiveValue = committedValue ?? newValue
      const newValueRaw =
        field === 'amount' || field === 'contract_amount' || field === 'area'
          ? Number(effectiveValue) || 0
          : effectiveValue
      const oldRaw =
        field === 'amount' || field === 'contract_amount' || field === 'area' ? oldValue : String(oldValue)

      if (String(oldRaw) === String(newValueRaw)) return

      setConfirmModal({
        entity,
        entityType,
        field,
        fieldLabel,
        oldValue: field === 'area' ? formatArea(Number(oldRaw) || 0) : String(oldRaw),
        newValue: field === 'area' ? formatArea(Number(newValueRaw) || 0) : String(newValueRaw),
        newValueRaw,
      })
    },
    [],
  )

  const handleConfirm = useCallback(async () => {
    if (!confirmModal) return
    const { entity, entityType, field, newValueRaw } = confirmModal

    let action: string
    let payload: Record<string, unknown>

    if (entityType === 'project') {
      const p = entity as Project
      action = 'updateProject'
      payload = {
        id: p.id,
        name: p.name,
        code: p.code,
        area: p.area,
        stage: p.stage,
        contractAmount: p.contract_amount,
        salesOwner: p.sales_owner,
        clientName: p.client_name,
        statusNote: p.status_note,
        notes: p.notes,
      }
      // Override the changed field
      if (field === 'contract_amount') payload.contractAmount = newValueRaw
      else if (field === 'area') payload.area = newValueRaw
      else if (field === 'sales_owner') payload.salesOwner = newValueRaw
      else if (field === 'client_name') payload.clientName = newValueRaw
      else payload[field] = newValueRaw
    } else {
      const sp = entity as Subproject
      if (field === 'stage') {
        action = 'updateSubprojectStage'
        payload = {
          id: sp.id,
          projectId: sp.project_id,
          stage: newValueRaw,
          completedAt: newValueRaw === 'concluído' ? new Date().toISOString().slice(0, 10) : undefined,
        }
      } else {
        action = 'updateSubproject'
        payload = {
          id: sp.id,
          discipline: sp.discipline,
          amount: sp.amount,
          responsiblePartner: sp.responsible_partner,
          deadline: sp.deadline,
          observacao: sp.observacao,
        }
        // Override the changed field
        if (field === 'responsible_partner') payload.responsiblePartner = newValueRaw
        else payload[field] = newValueRaw
      }
    }

    setConfirmModal(null)
    try {
      await submitMutation(action, payload)
    } catch {
      toast.error('Erro ao salvar alteração. Valor revertido.')
    }
  }, [confirmModal, submitMutation])

  const handleDeleteProject = useCallback(async () => {
    if (!deleteModal) return

    setDeleteModal(null)
    try {
      await submitMutation('deleteProject', { projectId: deleteModal.project.id })
    } catch {
      toast.error('Erro ao excluir projeto.')
    }
  }, [deleteModal, submitMutation])

  const handleDeleteSubproject = useCallback(async () => {
    if (!deleteModal || deleteModal.entityType !== 'subproject') return

    setDeleteModal(null)
    try {
      await submitMutation('deleteSubproject', { id: deleteModal.subproject.id })
    } catch {
      toast.error('Erro ao excluir disciplina.')
    }
  }, [deleteModal, submitMutation])

  const openCreateSubproject = useCallback((project: Project) => {
    setCreatingSubprojectFor(project.id)
    setNewSubprojectForm(createNewSubprojectForm(project))
  }, [])

  const closeCreateSubproject = useCallback(() => {
    setCreatingSubprojectFor(null)
    setNewSubprojectForm(createNewSubprojectForm())
  }, [])

  const handleCreateSubproject = useCallback(async (project: Project) => {
    if (!newSubprojectForm.discipline) {
      toast.error('Selecione a disciplina.')
      return
    }

    try {
      await submitMutation(
        'createSubproject',
        {
          projectId: project.id,
          discipline: newSubprojectForm.discipline,
          amount: newSubprojectForm.amount,
          responsiblePartner: newSubprojectForm.responsiblePartner,
          deadline: newSubprojectForm.deadline || null,
          observacao: newSubprojectForm.observacao,
          area: newSubprojectForm.areaMode === 'na' ? -1 : (newSubprojectForm.areaMode === 'custom' ? (newSubprojectForm.area || null) : null),
        },
        () => {
          setCreatingSubprojectFor(null)
          setNewSubprojectForm(createNewSubprojectForm(project))
        },
        'Disciplina adicionada',
      )
    } catch {
      toast.error('Erro ao adicionar disciplina.')
    }
  }, [newSubprojectForm, submitMutation])

  const hasActiveFilters = Boolean(search.trim()) || stageFilter !== 'all' || ownerFilter !== 'all' || deadlineFilter !== 'all'

  /* ─── Sortable header helper ────────────────────── */

  const renderSortableHeader = (field: string, label: string, className?: string) => (
    <th
      onClick={() => toggleSort(field)}
      className={`sticky top-0 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none hover:text-[var(--ink)] ${sort?.field === field ? 'text-[var(--ink)]' : 'text-[var(--ink-soft)]'} ${className || ''}`}
    >
      {label}
      {sort?.field === field && (
        <span className="ml-1">{sort.dir === 'asc' ? '↑' : '↓'}</span>
      )}
    </th>
  )

  /* ─── Render ────────────────────────────────────── */

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-soft)]" />
            <input
              type="text"
              placeholder="Buscar projeto, código ou cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded border border-[var(--line)] bg-[var(--bg)] pl-9 pr-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--teal)] transition"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
            <span>{filteredProjects.length} projeto{filteredProjects.length !== 1 ? 's' : ''}</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setStageFilter('all')
                  setOwnerFilter('all')
                  setDeadlineFilter('all')
                }}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-2 py-1 text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
              >
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--teal)]"
          >
            <option value="all">Todos os estágios</option>
            {projectStages.map(stage => (
              <option key={stage} value={stage}>
                {stageLabel(stage)}
              </option>
            ))}
          </select>

          <select
            value={ownerFilter}
            onChange={e => setOwnerFilter(e.target.value)}
            className="rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--teal)]"
          >
            <option value="all">Todos os responsáveis</option>
            {ownerOptions.filter(Boolean).map(owner => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'with-deadline', label: 'Com prazo' },
              { id: 'overdue', label: 'Atrasados' },
            ].map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDeadlineFilter(option.id as 'all' | 'with-deadline' | 'overdue')}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${deadlineFilter === option.id
                  ? 'border-[var(--teal-active-border)] bg-[var(--teal-active-bg)] text-[var(--teal)]'
                  : 'border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)]'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-[var(--line)]">
        <table className="w-full min-w-[1160px] border-collapse text-sm leading-tight">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--paper)]">
              <th className="sticky top-0 left-0 z-30 w-12 bg-[var(--paper)] px-3 py-2" />
              {renderSortableHeader('name', 'Nome', 'sticky left-12 z-30 bg-[var(--paper)] min-w-[260px]')}
              {renderSortableHeader('code', 'Código', 'sticky left-[272px] z-30 bg-[var(--paper)] min-w-[120px]')}
              {renderSortableHeader('area', 'Área', 'text-right')}
              {renderSortableHeader('stage', 'Estágio')}
              {renderSortableHeader('contract_amount', 'Contrato', 'text-right')}
              {renderSortableHeader('sales_owner', 'Responsável')}
              {renderSortableHeader('client_name', 'Cliente')}
              <th className="sticky top-0 z-20 bg-[var(--paper)] px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-[var(--ink-soft)]">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map(project => {
              const subs = subprojectsByProject[project.id] || []
              const isExpanded = expanded.has(project.id)
              return (
                <Fragment key={project.id}>
                  {/* Project row */}
                  <tr className="border-b border-[var(--line)] bg-[var(--bg-card-60)] hover:bg-[var(--teal-active-bg)] transition-colors">
                    <td className="sticky left-0 z-20 bg-[var(--bg-card-solid)] px-3 py-2 align-top">
                      <button
                        onClick={() => toggleExpand(project.id)}
                        className="inline-flex items-center gap-1.5 rounded border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="text-xs">{isExpanded ? 'Ocultar' : 'Abrir'}</span>
                      </button>
                    </td>
                    <td className="sticky left-12 z-20 min-w-[260px] bg-[var(--bg-card-solid)] px-3 py-2 align-top">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 font-medium text-[var(--ink-soft)]">
                            Projeto
                          </span>
                          <StageBadge stage={project.stage} />
                          <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[var(--ink-soft)]">
                            {projectMetaById[project.id]?.total ?? 0} disciplina{(projectMetaById[project.id]?.total ?? 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <EditableText
                          value={editing?.id === project.id && editing?.field === 'name' ? editValue : project.name}
                          isEditing={editing?.id === project.id && editing?.field === 'name'}
                          onStart={() => startEdit(project.id, 'name', project.name)}
                          onChange={setEditValue}
                          onCommit={() =>
                            handleCommit(project, 'project', 'name', 'Nome', project.name, editValue)
                          }
                        />
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--ink-soft)]">
                          <span>{projectMetaById[project.id]?.completed ?? 0} concluídas</span>
                          <span>{projectMetaById[project.id]?.active ?? 0} ativas</span>
                          {projectMetaById[project.id]?.nextDeadline && (
                            <span>Próx. prazo: {formatDate(projectMetaById[project.id]?.nextDeadline)}</span>
                          )}
                          {Boolean(projectMetaById[project.id]?.overdueCount) && (
                            <span className="text-[var(--rose-text)]">
                              {projectMetaById[project.id]?.overdueCount} atrasada{projectMetaById[project.id]?.overdueCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="sticky left-[272px] z-20 bg-[var(--bg-card-solid)] px-3 py-2 align-top text-[var(--ink-soft)]">
                      <EditableText
                        value={editing?.id === project.id && editing?.field === 'code' ? editValue : (project.code || '')}
                        isEditing={editing?.id === project.id && editing?.field === 'code'}
                        onStart={() => startEdit(project.id, 'code', project.code || '')}
                        onChange={setEditValue}
                        onCommit={() =>
                          handleCommit(project, 'project', 'code', 'Código', project.code || '', editValue)
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      <EditableCurrency
                        value={editing?.id === project.id && editing?.field === 'area' ? Number(editValue) : project.area}
                        isEditing={editing?.id === project.id && editing?.field === 'area'}
                        onStart={() => startEdit(project.id, 'area', String(project.area ?? 0))}
                        onChange={setEditValue}
                        onCommit={() =>
                          handleCommit(project, 'project', 'area', 'Área', project.area, editValue)
                        }
                        formatValue={formatArea}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <EditableSelect
                        value={editing?.id === project.id && editing?.field === 'stage' ? editValue : project.stage}
                        options={[...projectStages]}
                        isEditing={editing?.id === project.id && editing?.field === 'stage'}
                        onStart={() => startEdit(project.id, 'stage', project.stage)}
                        onChange={setEditValue}
                        onCommit={(nextValue) =>
                          handleCommit(project, 'project', 'stage', 'Estágio', project.stage, editValue, nextValue)
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      <div className="space-y-1.5">
                        <EditableCurrency
                          value={editing?.id === project.id && editing?.field === 'contract_amount' ? Number(editValue) : project.contract_amount}
                          isEditing={editing?.id === project.id && editing?.field === 'contract_amount'}
                          onStart={() =>
                            startEdit(project.id, 'contract_amount', String(project.contract_amount))
                          }
                          onChange={setEditValue}
                          onCommit={() =>
                            handleCommit(
                              project,
                              'project',
                              'contract_amount',
                              'Contrato',
                              project.contract_amount,
                              editValue,
                            )
                          }
                        />
                        <div className="text-xs text-[var(--ink-soft)]">
                          Saldo: {formatCurrency(projectMetaById[project.id]?.outstanding ?? 0)}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <EditableSelect
                        value={editing?.id === project.id && editing?.field === 'sales_owner' ? editValue : (project.sales_owner || '')}
                        options={['', ...partners]}
                        isEditing={editing?.id === project.id && editing?.field === 'sales_owner'}
                        onStart={() => startEdit(project.id, 'sales_owner', project.sales_owner || '')}
                        onChange={setEditValue}
                        onCommit={(nextValue) =>
                          handleCommit(
                            project,
                            'project',
                            'sales_owner',
                            'Responsável',
                            project.sales_owner || '',
                            editValue,
                            nextValue,
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2 align-top text-[var(--ink-soft)]">
                      <EditableText
                        value={editing?.id === project.id && editing?.field === 'client_name' ? editValue : (project.client_name || '')}
                        isEditing={editing?.id === project.id && editing?.field === 'client_name'}
                        onStart={() => startEdit(project.id, 'client_name', project.client_name || '')}
                        onChange={setEditValue}
                        onCommit={() =>
                          handleCommit(project, 'project', 'client_name', 'Cliente', project.client_name || '', editValue)
                        }
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex justify-end">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Adicionar disciplina em ${project.name}`}
                            disabled={mutating}
                            onClick={() => {
                              if (!expanded.has(project.id)) toggleExpand(project.id)
                              openCreateSubproject(project)
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--line)] text-[var(--ink)] transition hover:bg-[var(--paper)] disabled:opacity-60"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Excluir projeto ${project.name}`}
                            disabled={mutating}
                            onClick={() => setDeleteModal({ entityType: 'project', project, subprojects: subs })}
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {isExpanded && creatingSubprojectFor === project.id && (
                    <tr className="border-b border-[var(--line)] bg-[var(--bg)]">
                      <td className="sticky left-0 z-10 bg-[var(--bg)] px-3 py-3 align-top" />
                      <td className="sticky left-12 z-10 bg-[var(--bg)] px-3 py-3 align-top" colSpan={8}>
                        <div className="rounded border border-[var(--line)] bg-[var(--bg-card-solid)] p-3 shadow-sm">
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Novo subprojeto</div>
                                <div className="mt-1 text-sm font-medium text-[var(--ink)]">Adicionar disciplina em {project.name}</div>
                              </div>
                              <button
                                type="button"
                                onClick={closeCreateSubproject}
                                className="inline-flex items-center gap-1 self-start rounded border border-[var(--line)] px-2.5 py-1.5 text-xs text-[var(--ink-soft)] transition hover:text-[var(--ink)]"
                              >
                                <X className="h-3.5 w-3.5" /> Cancelar
                              </button>
                            </div>

                            <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                              <select
                                className="min-w-0 rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                                value={newSubprojectForm.discipline}
                                onChange={e => setNewSubprojectForm(current => ({ ...current, discipline: e.target.value }))}
                              >
                                <option value="">Disciplina</option>
                                {disciplines.map(discipline => (
                                  <option key={discipline} value={discipline}>
                                    {LABELS[discipline] || discipline}
                                  </option>
                                ))}
                              </select>

                              <select
                                className="min-w-0 rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                                value={newSubprojectForm.responsiblePartner}
                                onChange={e => setNewSubprojectForm(current => ({ ...current, responsiblePartner: e.target.value }))}
                              >
                                <option value="">Parceiro responsável</option>
                                {partners.map(partner => (
                                  <option key={partner} value={partner}>
                                    {partner}
                                  </option>
                                ))}
                              </select>

                              <input
                                className="min-w-0 rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Valor"
                                value={newSubprojectForm.amount}
                                onChange={e => setNewSubprojectForm(current => ({ ...current, amount: e.target.value }))}
                              />

                              <input
                                className="min-w-0 rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                                type="date"
                                value={newSubprojectForm.deadline}
                                onChange={e => setNewSubprojectForm(current => ({ ...current, deadline: e.target.value }))}
                              />
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--ink)]">
                              <span className="text-[var(--ink-soft)]">Área:</span>
                              <label className="inline-flex items-center gap-1.5">
                                <input
                                  type="radio"
                                  name="databaseNewSubprojectAreaMode"
                                  checked={newSubprojectForm.areaMode === 'inherit'}
                                  onChange={() => setNewSubprojectForm(current => ({ ...current, areaMode: 'inherit', area: '' }))}
                                />
                                Herdar do projeto ({formatArea(project.area)})
                              </label>
                              <label className="inline-flex items-center gap-1.5">
                                <input
                                  type="radio"
                                  name="databaseNewSubprojectAreaMode"
                                  checked={newSubprojectForm.areaMode === 'custom'}
                                  onChange={() => setNewSubprojectForm(current => ({ ...current, areaMode: 'custom' }))}
                                />
                                Área própria
                              </label>
                              <label className="inline-flex items-center gap-1.5">
                                <input
                                  type="radio"
                                  name="databaseNewSubprojectAreaMode"
                                  checked={newSubprojectForm.areaMode === 'na'}
                                  onChange={() => setNewSubprojectForm(current => ({ ...current, areaMode: 'na', area: '' }))}
                                />
                                N/A
                              </label>
                              {newSubprojectForm.areaMode === 'custom' ? (
                                <input
                                  className="min-w-0 rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Área em m²"
                                  value={newSubprojectForm.area}
                                  onChange={e => setNewSubprojectForm(current => ({ ...current, area: e.target.value }))}
                                />
                              ) : null}
                            </div>

                            <input
                              className="min-w-0 rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                              placeholder="Observação do subprojeto"
                              value={newSubprojectForm.observacao}
                              onChange={e => setNewSubprojectForm(current => ({ ...current, observacao: e.target.value }))}
                            />

                            <div className="flex justify-end">
                              <button
                                type="button"
                                disabled={mutating || !newSubprojectForm.discipline}
                                onClick={() => void handleCreateSubproject(project)}
                                className="inline-flex items-center gap-2 rounded bg-[var(--ink)] px-4 py-2 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
                              >
                                <Plus className="h-3.5 w-3.5" /> Salvar disciplina
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Subproject rows */}
                  {isExpanded &&
                    subs.map(sp => (
                      <tr
                        key={sp.id}
                        className="border-b border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-active-bg)] transition-colors"
                      >
                        <td className="sticky left-0 z-10 bg-[var(--paper)] px-3 py-2 pl-4 align-top">
                          <span className="inline-flex rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--ink-soft)]">
                            Disciplina
                          </span>
                        </td>
                        <td className="sticky left-12 z-10 min-w-[260px] bg-[var(--paper)] px-3 py-2 align-top" colSpan={1}>
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <StageBadge stage={sp.stage} />
                              {sp.deadline && <span className="text-[var(--ink-soft)]">Prazo: {formatDate(sp.deadline)}</span>}
                            </div>
                            <EditableSelect
                              value={editing?.id === sp.id && editing?.field === 'discipline' ? editValue : sp.discipline}
                              options={[...disciplines]}
                              isEditing={editing?.id === sp.id && editing?.field === 'discipline'}
                              onStart={() => startEdit(sp.id, 'discipline', sp.discipline)}
                              onChange={setEditValue}
                              onCommit={(nextValue) =>
                                handleCommit(sp, 'subproject', 'discipline', 'Disciplina', sp.discipline, editValue, nextValue)
                              }
                            />
                          </div>
                        </td>
                        <td className="sticky left-[272px] z-10 bg-[var(--paper)] px-3 py-2 align-top text-[var(--ink-soft)]">
                          {project.code || '—'}
                        </td>
                        <td className="px-3 py-2 align-top text-sm text-[var(--ink-soft)]">
                          <EditableDate
                            value={editing?.id === sp.id && editing?.field === 'deadline' ? editValue : sp.deadline}
                            isEditing={editing?.id === sp.id && editing?.field === 'deadline'}
                            onStart={() =>
                              startEdit(sp.id, 'deadline', toDateInputValue(sp.deadline))
                            }
                            onChange={setEditValue}
                            onCommit={(nextValue) =>
                              handleCommit(sp, 'subproject', 'deadline', 'Prazo', sp.deadline || '', editValue, nextValue)
                            }
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <EditableSelect
                            value={editing?.id === sp.id && editing?.field === 'stage' ? editValue : sp.stage}
                            options={[...subprojectStages]}
                            isEditing={editing?.id === sp.id && editing?.field === 'stage'}
                            onStart={() => startEdit(sp.id, 'stage', sp.stage)}
                            onChange={setEditValue}
                            onCommit={(nextValue) =>
                              handleCommit(sp, 'subproject', 'stage', 'Estágio', sp.stage, editValue, nextValue)
                            }
                          />
                        </td>
                        <td className="px-3 py-2 text-right align-top">
                          <EditableCurrency
                            value={editing?.id === sp.id && editing?.field === 'amount' ? Number(editValue) : sp.amount}
                            isEditing={editing?.id === sp.id && editing?.field === 'amount'}
                            onStart={() => startEdit(sp.id, 'amount', String(sp.amount))}
                            onChange={setEditValue}
                            onCommit={() =>
                              handleCommit(sp, 'subproject', 'amount', 'Valor', sp.amount, editValue)
                            }
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <EditableSelect
                            value={editing?.id === sp.id && editing?.field === 'responsible_partner' ? editValue : sp.responsible_partner}
                            options={[...partners]}
                            isEditing={editing?.id === sp.id && editing?.field === 'responsible_partner'}
                            onStart={() =>
                              startEdit(sp.id, 'responsible_partner', sp.responsible_partner)
                            }
                            onChange={setEditValue}
                            onCommit={(nextValue) =>
                              handleCommit(
                                sp,
                                'subproject',
                                'responsible_partner',
                                'Parceiro',
                                sp.responsible_partner,
                                editValue,
                                nextValue,
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2 align-top text-[var(--ink-soft)]">
                          {project.client_name || '—'}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              aria-label={`Excluir disciplina ${LABELS[sp.discipline] || sp.discipline} de ${project.name}`}
                              disabled={mutating}
                              onClick={() => setDeleteModal({ entityType: 'subproject', project, subproject: sp, subprojects: subs })}
                              className="inline-flex h-8 w-8 items-center justify-center rounded border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {filteredProjects.length === 0 && (
        <div className="text-center py-12 text-[var(--ink-soft)] text-sm">
          <div>Nenhum projeto encontrado.</div>
          {hasActiveFilters && <div className="mt-1">Tente limpar ou ajustar os filtros aplicados.</div>}
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <ConfirmModal
          modal={confirmModal}
          onConfirm={() => void handleConfirm()}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {deleteModal && (
        <DeleteConfirmModal
          modal={deleteModal}
          mutating={mutating}
          onCancel={() => setDeleteModal(null)}
          onDeleteProject={() => void handleDeleteProject()}
          onDeleteSubproject={() => void handleDeleteSubproject()}
        />
      )}
    </div>
  )
}
