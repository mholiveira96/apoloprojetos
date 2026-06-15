import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { BootstrapData, Project, Subproject } from '@/types/app'
import {
  projectStages,
  subprojectStages,
  disciplines,
  partners,
  LABELS,
} from '@/lib/constants'
import { formatCurrency, formatDate, toDateInputValue } from '@/lib/formatters'

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
    <span
      onClick={onStart}
      className="cursor-pointer hover:bg-[var(--teal-active-bg)] px-2 py-1 -mx-2 -my-1 rounded transition"
    >
      {format ? format(value) : value || '—'}
    </span>
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
  onCommit: () => void
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
          onChange(e.target.value)
          onCommit()
        }}
        onBlur={onCommit}
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
    <span
      onClick={onStart}
      className="cursor-pointer hover:bg-[var(--teal-active-bg)] px-2 py-1 -mx-2 -my-1 rounded transition"
    >
      {LABELS[value] || value || '—'}
    </span>
  )
}

function EditableCurrency({
  value,
  isEditing,
  onStart,
  onChange,
  onCommit,
}: {
  value: number
  isEditing: boolean
  onStart: () => void
  onChange: (v: string) => void
  onCommit: () => void
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
    <span
      onClick={onStart}
      className="cursor-pointer hover:bg-[var(--teal-active-bg)] px-2 py-1 -mx-2 -my-1 rounded transition"
    >
      {formatCurrency(value)}
    </span>
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
  onCommit: () => void
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
          onChange(e.target.value)
          onCommit()
        }}
        onBlur={onCommit}
        className="w-full bg-[var(--bg)] border border-[var(--teal)] px-2 py-1 text-sm text-[var(--ink)] outline-none"
      />
    )
  }

  return (
    <span
      onClick={onStart}
      className="cursor-pointer hover:bg-[var(--teal-active-bg)] px-2 py-1 -mx-2 -my-1 rounded transition"
    >
      {value ? formatDate(value) : '—'}
    </span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[var(--bg)] border border-[var(--line)] p-6 max-w-md w-full mx-4 shadow-lg">
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

/* ─── Main component ─────────────────────────────────────────── */

export default function DatabasePage({ data, submitMutation }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [sort, setSort] = useState<{ field: string; dir: 'asc' | 'desc' } | null>(null)
  const [search, setSearch] = useState('')
  const [confirmModal, setConfirmModal] = useState<ConfirmData | null>(null)

  /* ─── Expand / collapse ─────────────────────────── */

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  /* ─── Sorting ───────────────────────────────────── */

  const toggleSort = useCallback((field: string) => {
    setSort(prev => {
      if (prev?.field !== field) return { field, dir: 'asc' }
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
      const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), 'pt-BR')
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [data.projects, sort])

  /* ─── Filtering ─────────────────────────────────── */

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return sortedProjects
    const q = search.toLowerCase()
    return sortedProjects.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.client_name && p.client_name.toLowerCase().includes(q)),
    )
  }, [sortedProjects, search])

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
    ) => {
      setEditing(null)
      const newValueRaw =
        field === 'amount' || field === 'contract_amount'
          ? Number(newValue) || 0
          : newValue
      const oldRaw =
        field === 'amount' || field === 'contract_amount' ? oldValue : String(oldValue)

      if (String(oldRaw) === String(newValueRaw)) return

      setConfirmModal({
        entity,
        entityType,
        field,
        fieldLabel,
        oldValue: String(oldRaw),
        newValue: String(newValueRaw),
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
        stage: p.stage,
        contractAmount: p.contract_amount,
        salesOwner: p.sales_owner,
        statusNote: p.status_note,
        notes: p.notes,
      }
      // Override the changed field
      if (field === 'contract_amount') payload.contractAmount = newValueRaw
      else if (field === 'sales_owner') payload.salesOwner = newValueRaw
      else payload[field] = newValueRaw
    } else {
      const sp = entity as Subproject
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

    setConfirmModal(null)
    try {
      await submitMutation(action, payload)
    } catch {
      toast.error('Erro ao salvar alteração. Valor revertido.')
    }
  }, [confirmModal, submitMutation])

  /* ─── Project subproject lookup ─────────────────── */

  const subprojectsByProject = useMemo(() => {
    const map: Record<string, Subproject[]> = {}
    for (const sp of data.subprojects) {
      if (!map[sp.project_id]) map[sp.project_id] = []
      map[sp.project_id].push(sp)
    }
    return map
  }, [data.subprojects])

  /* ─── Sortable header helper ────────────────────── */

  const SortableHeader = ({
    field,
    label,
    className,
  }: {
    field: string
    label: string
    className?: string
  }) => (
    <th
      onClick={() => toggleSort(field)}
      className={`px-3 py-2 text-left text-xs font-medium text-[var(--ink-soft)] uppercase tracking-wider cursor-pointer hover:text-[var(--ink)] select-none ${className || ''}`}
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
      {/* Search */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-soft)]" />
          <input
            type="text"
            placeholder="Buscar projeto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] outline-none focus:border-[var(--teal)] transition"
          />
        </div>
        <span className="text-xs text-[var(--ink-soft)]">
          {filteredProjects.length} projeto{filteredProjects.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-[var(--line)]">
        <table className="w-full text-sm border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--paper)]">
              <th className="w-10 px-3 py-2" />
              <SortableHeader field="name" label="Nome" />
              <SortableHeader field="code" label="Código" />
              <SortableHeader field="stage" label="Estágio" />
              <SortableHeader field="contract_amount" label="Contrato" className="text-right" />
              <SortableHeader field="sales_owner" label="Responsável" />
              <SortableHeader field="client_name" label="Cliente" />
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map(project => {
              const subs = subprojectsByProject[project.id] || []
              const isExpanded = expanded.has(project.id)
              return (
                <Fragment key={project.id}>
                  {/* Project row */}
                  <tr className="border-b border-[var(--line)] hover:bg-[var(--teal-active-bg)] transition-colors">
                    <td className="px-3 py-2">
                      <button
                        onClick={() => toggleExpand(project.id)}
                        className="text-[var(--ink-soft)] hover:text-[var(--ink)] transition p-1"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-medium text-[var(--ink)] max-w-[200px]">
                      <EditableText
                        value={editing?.id === project.id && editing?.field === 'name' ? editValue : project.name}
                        isEditing={editing?.id === project.id && editing?.field === 'name'}
                        onStart={() => startEdit(project.id, 'name', project.name)}
                        onChange={setEditValue}
                        onCommit={() =>
                          handleCommit(project, 'project', 'name', 'Nome', project.name, editValue)
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-[var(--ink-soft)]">
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
                    <td className="px-3 py-2">
                      <EditableSelect
                        value={editing?.id === project.id && editing?.field === 'stage' ? editValue : project.stage}
                        options={[...projectStages]}
                        isEditing={editing?.id === project.id && editing?.field === 'stage'}
                        onStart={() => startEdit(project.id, 'stage', project.stage)}
                        onChange={setEditValue}
                        onCommit={() =>
                          handleCommit(project, 'project', 'stage', 'Estágio', project.stage, editValue)
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
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
                    </td>
                    <td className="px-3 py-2">
                      <EditableSelect
                        value={editing?.id === project.id && editing?.field === 'sales_owner' ? editValue : (project.sales_owner || '')}
                        options={['', ...partners]}
                        isEditing={editing?.id === project.id && editing?.field === 'sales_owner'}
                        onStart={() => startEdit(project.id, 'sales_owner', project.sales_owner || '')}
                        onChange={setEditValue}
                        onCommit={() =>
                          handleCommit(
                            project,
                            'project',
                            'sales_owner',
                            'Responsável',
                            project.sales_owner || '',
                            editValue,
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-[var(--ink-soft)]">
                      {project.client_name || '—'}
                    </td>
                  </tr>

                  {/* Subproject rows */}
                  {isExpanded &&
                    subs.map(sp => (
                      <tr
                        key={sp.id}
                        className="border-b border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--teal-active-bg)] transition-colors"
                      >
                        <td className="px-3 py-2 pl-10">
                          <span className="inline-block w-4 text-[var(--ink-soft)] text-xs">└</span>
                        </td>
                        <td className="px-3 py-2 pl-10" colSpan={2}>
                          <EditableSelect
                            value={editing?.id === sp.id && editing?.field === 'discipline' ? editValue : sp.discipline}
                            options={[...disciplines]}
                            isEditing={editing?.id === sp.id && editing?.field === 'discipline'}
                            onStart={() => startEdit(sp.id, 'discipline', sp.discipline)}
                            onChange={setEditValue}
                            onCommit={() =>
                              handleCommit(sp, 'subproject', 'discipline', 'Disciplina', sp.discipline, editValue)
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <EditableSelect
                            value={editing?.id === sp.id && editing?.field === 'stage' ? editValue : sp.stage}
                            options={[...subprojectStages]}
                            isEditing={editing?.id === sp.id && editing?.field === 'stage'}
                            onStart={() => startEdit(sp.id, 'stage', sp.stage)}
                            onChange={setEditValue}
                            onCommit={() =>
                              handleCommit(sp, 'subproject', 'stage', 'Estágio', sp.stage, editValue)
                            }
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
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
                        <td className="px-3 py-2">
                          <EditableSelect
                            value={editing?.id === sp.id && editing?.field === 'responsible_partner' ? editValue : sp.responsible_partner}
                            options={[...partners]}
                            isEditing={editing?.id === sp.id && editing?.field === 'responsible_partner'}
                            onStart={() =>
                              startEdit(sp.id, 'responsible_partner', sp.responsible_partner)
                            }
                            onChange={setEditValue}
                            onCommit={() =>
                              handleCommit(
                                sp,
                                'subproject',
                                'responsible_partner',
                                'Parceiro',
                                sp.responsible_partner,
                                editValue,
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <EditableDate
                            value={editing?.id === sp.id && editing?.field === 'deadline' ? editValue : sp.deadline}
                            isEditing={editing?.id === sp.id && editing?.field === 'deadline'}
                            onStart={() =>
                              startEdit(sp.id, 'deadline', toDateInputValue(sp.deadline))
                            }
                            onChange={setEditValue}
                            onCommit={() =>
                              handleCommit(sp, 'subproject', 'deadline', 'Prazo', sp.deadline || '', editValue)
                            }
                          />
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
          Nenhum projeto encontrado.
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
    </div>
  )
}
