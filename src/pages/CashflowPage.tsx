import { useEffect, useMemo, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronRight, Eye, HandCoins, Landmark, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import type { BootstrapData, CashflowEntry, Subproject } from '@/types/app'
import { expenseCategories, partners } from '@/lib/constants'
import { formatCurrency, formatDate, normalizeSearchText, numericValue, sanitizeCashflowText, stageLabel } from '@/lib/formatters'
import { EmptyState, MetricCard, Panel } from '@/components/workspace/ui'
import { computeCashflowDayGroups } from '@/lib/cashflow'

type SubmitMutation = (
  action: string,
  payload: Record<string, unknown>,
  onSuccess?: () => void,
  successMessage?: string,
) => Promise<void>

type Props = {
  data: BootstrapData
  submitMutation: SubmitMutation
  mutating: boolean
}

type PickerOption = {
  value: string
  label: string
  searchText?: string
}

type TransactionDetails = {
  account: string
  amount: number
  amountLabel: string
  category: string
  client: string
  counterpart: string
  date: string
  discipline: string
  note: string
  partner: string
  project: string
  type: string
  vendor: string
}

const inputClass = 'border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm w-full'
const pickerInputClass = 'w-full rounded-xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-soft)] focus:border-[var(--teal)]'
const today = () => new Date().toISOString().slice(0, 10)
const shiftDays = (date: string, days: number) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const PAYOUT_KEY = 'repasse'

function PickerField({
  disabled = false,
  inputClassName = pickerInputClass,
  onChange,
  options,
  placeholder,
  required = false,
  value,
}: {
  disabled?: boolean
  inputClassName?: string
  onChange: (value: string) => void
  options: PickerOption[]
  placeholder: string
  required?: boolean
  value: string
}) {
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  )
  const [query, setQuery] = useState(selectedOption?.label ?? '')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setQuery(selectedOption?.label ?? '')
  }, [selectedOption?.label])

  const normalizedQuery = normalizeSearchText(query)
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options.slice(0, 40)
    return options
      .filter((option) => normalizeSearchText(`${option.label} ${option.searchText ?? ''}`).includes(normalizedQuery))
      .slice(0, 40)
  }, [normalizedQuery, options])

  const chooseOption = (option: PickerOption) => {
    onChange(option.value)
    setQuery(option.label)
    setOpen(false)
  }

  const commitQuery = () => {
    const trimmed = query.trim()
    if (!trimmed) {
      onChange('')
      setQuery('')
      return
    }

    const exactMatch = options.find((option) => normalizeSearchText(option.label) === normalizeSearchText(trimmed))
    if (exactMatch) {
      chooseOption(exactMatch)
      return
    }

    const startsWithMatch = options.filter((option) => normalizeSearchText(option.label).startsWith(normalizeSearchText(trimmed)))
    if (startsWithMatch.length === 1) {
      chooseOption(startsWithMatch[0])
      return
    }

    setQuery(selectedOption?.label ?? '')
  }

  return (
    <div className="relative">
      {required ? (
        <input
          aria-hidden="true"
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          readOnly
          required
          tabIndex={-1}
          value={value}
        />
      ) : null}
      <input
        autoComplete="off"
        className={inputClassName}
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false)
            commitQuery()
          }, 120)
        }}
        onChange={(event) => {
          const nextQuery = event.target.value
          setQuery(nextQuery)
          if (!nextQuery) onChange('')
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />
      {open && !disabled ? (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-[0_18px_50px_rgba(12,26,26,0.12)]">
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-sm text-[var(--ink)] transition hover:bg-[var(--teal-active-bg)]"
                onMouseDown={(event) => {
                  event.preventDefault()
                  chooseOption(option)
                }}
              >
                <span>{option.label}</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-[var(--ink-soft)]">Nenhum resultado</div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function TransactionDetailModal({
  details,
  entry,
  onClose,
}: {
  details: TransactionDetails | null
  entry: CashflowEntry | null
  onClose: () => void
}) {
  if (!entry || !details) return null

  const rows = [
    { label: 'Tipo', value: details.type },
    { label: 'Projeto', value: details.project },
    { label: 'Cliente', value: details.client },
    { label: 'Parceiro', value: details.partner },
    { label: 'Disciplina', value: details.discipline },
    { label: 'Fornecedor', value: details.vendor },
    { label: 'Categoria', value: details.category },
    { label: 'Conta', value: details.account },
    { label: 'Data', value: details.date },
    { label: 'Contraparte', value: details.counterpart },
    { label: 'Observacao', value: details.note },
  ].filter((row) => row.value)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg border border-[var(--line)] bg-[var(--bg-card-solid)] p-6 shadow-[0_18px_50px_rgba(12,26,26,0.14)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--ink)]">Detalhes da transacao</h3>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{details.amountLabel}</p>
          </div>
          <button type="button" className="rounded-full p-1 hover:bg-[var(--paper)]" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="border border-[var(--line)] bg-[var(--paper)] px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">{row.label}</div>
              <div className="mt-1 text-sm text-[var(--ink)]">{row.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DeleteTransactionModal({
  confirmationText,
  entry,
  mutating,
  onChangeConfirmationText,
  onClose,
  onConfirm,
}: {
  confirmationText: string
  entry: CashflowEntry | null
  mutating: boolean
  onChangeConfirmationText: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}) {
  if (!entry) return null

  const canDelete = normalizeSearchText(confirmationText) === 'deletar'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md border border-[var(--line)] bg-[var(--bg-card-solid)] p-6 shadow-[0_18px_50px_rgba(12,26,26,0.14)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="mb-2 text-lg font-semibold text-[var(--ink)]">Excluir transacao?</h3>
        <p className="mb-4 text-sm text-[var(--ink-soft)]">
          {stageLabel(entry.entry_type)} de <span className="font-medium text-[var(--ink)]">{formatCurrency(Math.abs(numericValue(entry.signed_amount)))}</span>
          {entry.project_name ? ` - ${entry.project_name}` : ''} em {formatDate(entry.entry_date)}.
        </p>
        <p className="mb-3 text-sm text-[var(--ink-soft)]">
          Digite <span className="font-semibold text-[var(--ink)]">deletar</span> para confirmar.
        </p>
        <input
          autoComplete="off"
          className={pickerInputClass}
          placeholder="Digite deletar"
          value={confirmationText}
          onChange={(event) => onChangeConfirmationText(event.target.value)}
        />
        <div className="mt-5 flex gap-3">
          <button type="button" className="flex-1 border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--paper)]" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="flex-1 bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            disabled={!canDelete || mutating}
            onClick={onConfirm}
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

export function CashflowPage({ data, submitMutation, mutating }: Props) {
  const [startDate, setStartDate] = useState(() => shiftDays(today(), -30))
  const [endDate, setEndDate] = useState(() => shiftDays(today(), 30))
  const [entryFilter, setEntryFilter] = useState<'all' | 'expense' | 'payout'>('all')
  const [projectFilterId, setProjectFilterId] = useState('')
  const [partnerFilter, setPartnerFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('newest')

  const [showEntrada, setShowEntrada] = useState(false)
  const [showSaida, setShowSaida] = useState(false)
  const [collapsedDays, setCollapsedDays] = useState<string[]>([])

  const [viewingEntry, setViewingEntry] = useState<CashflowEntry | null>(null)
  const [editingEntry, setEditingEntry] = useState<CashflowEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<CashflowEntry | null>(null)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const [editForm, setEditForm] = useState({ amount: '', entryDate: '', bankAccount: '', note: '', category: '', projectId: '', vendor: '', partnerName: '' })

  const [receiptForm, setReceiptForm] = useState({ projectId: '', amount: '', bankAccount: '', entryDate: today(), note: '' })
  const [expenseForm, setExpenseForm] = useState({ category: '', projectId: '', amount: '', vendor: '', bankAccount: '', entryDate: today(), note: '' })
  const [payoutForm, setPayoutForm] = useState({ projectId: '', subprojectId: '', partnerName: partners[0], percentage: '', bankAccount: '', entryDate: today(), note: '' })
  const [saidaType, setSaidaType] = useState<string>('')

  const receiptsById = useMemo(
    () => new Map(data.receipts.map((receipt) => [receipt.id, receipt])),
    [data.receipts],
  )
  const expensesById = useMemo(
    () => new Map(data.expenses.map((expense) => [expense.id, expense])),
    [data.expenses],
  )
  const payoutsById = useMemo(
    () => new Map(data.payouts.map((payout) => [payout.id, payout])),
    [data.payouts],
  )
  const payoutPartnerById = useMemo(
    () => new Map(data.payouts.map((payout) => [payout.id, payout.partner_name])),
    [data.payouts],
  )
  const projectsById = useMemo(
    () => new Map(data.projects.map((project) => [project.id, project])),
    [data.projects],
  )
  const subprojectsById = useMemo(
    () => new Map(data.subprojects.map((subproject) => [subproject.id, subproject])),
    [data.subprojects],
  )

  const selectableProjects = useMemo(
    () => [...data.projects]
      .filter((project) => !project.archived)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
    [data.projects],
  )
  const projectOptions = useMemo(
    () => selectableProjects.map((project) => ({
      value: project.id,
      label: project.client_name ? `${project.name} - ${project.client_name}` : project.name,
      searchText: `${project.client_name ?? ''} ${project.discipline ?? ''} ${project.code ?? ''}`,
    })),
    [selectableProjects],
  )
  const partnerOptions = useMemo(
    () => partners.map((partner) => ({ value: partner, label: partner })),
    [],
  )
  const normalizedPartnerFilter = normalizeSearchText(partnerFilter)
  const subprojectsForProject = useMemo(
    () => data.subprojects
      .filter((subproject) => subproject.project_id === payoutForm.projectId)
      .sort((a, b) => stageLabel(a.discipline).localeCompare(stageLabel(b.discipline), 'pt-BR', { sensitivity: 'base' })),
    [data.subprojects, payoutForm.projectId],
  )
  const subprojectOptions = useMemo(
    () => subprojectsForProject.map((subproject) => ({
      value: subproject.id,
      label: `${stageLabel(subproject.discipline)} - ${formatCurrency(numericValue(subproject.amount))}`,
      searchText: `${subproject.project_name} ${subproject.responsible_partner}`,
    })),
    [subprojectsForProject],
  )
  const selectedSubproject = useMemo(
    () => (payoutForm.subprojectId ? subprojectsById.get(payoutForm.subprojectId) ?? null : null),
    [payoutForm.subprojectId, subprojectsById],
  )
  const payoutAmount = selectedSubproject && payoutForm.percentage
    ? numericValue(selectedSubproject.amount) * Number(payoutForm.percentage) / 100
    : null

  const normalizedSearchQuery = normalizeSearchText(searchQuery)
  const cashflowSearchIndex = useMemo(
    () => new Map(data.cashflow.map((entry) => {
      const project = entry.project_id ? projectsById.get(entry.project_id) : null
      const receipt = entry.entry_type === 'receipt' ? receiptsById.get(entry.id) : null
      const expense = entry.entry_type === 'expense' ? expensesById.get(entry.id) : null
      const payout = entry.entry_type === 'payout' ? payoutsById.get(entry.id) : null
      const searchableText = normalizeSearchText([
        entry.project_name,
        sanitizeCashflowText(entry.counterpart),
        entry.note,
        entry.bank_account,
        entry.entry_type,
        stageLabel(entry.entry_type),
        project?.client_name,
        project?.discipline,
        receipt?.client_name,
        expense?.vendor,
        expense?.category,
        payout?.partner_name,
        payout?.discipline,
      ].filter(Boolean).join(' '))

      return [`${entry.entry_type}:${entry.id}`, searchableText]
    })),
    [data.cashflow, expensesById, payoutsById, projectsById, receiptsById],
  )

  const filtered = useMemo(
    () => [...data.cashflow.filter((entry) => {
      if (entry.entry_date < startDate || entry.entry_date > endDate) return false
      if (entryFilter !== 'all' && entry.entry_type !== entryFilter) return false
      if (projectFilterId && entry.project_id !== projectFilterId) return false
      if (normalizedSearchQuery) {
        const searchableText = cashflowSearchIndex.get(`${entry.entry_type}:${entry.id}`) ?? ''
        if (!searchableText.includes(normalizedSearchQuery)) return false
      }
      if (partnerFilter) {
        if (entry.entry_type === 'payout') {
          return normalizeSearchText(payoutPartnerById.get(entry.id) ?? '') === normalizedPartnerFilter
        }
        if (entry.entry_type === 'expense') {
          const expense = expensesById.get(entry.id)
          return normalizeSearchText(expense?.category ?? '') === 'ferias'
            && normalizeSearchText(expense?.vendor ?? '') === normalizedPartnerFilter
        }
        return false
      }
      return true
    })].sort((a, b) => sortOrder === 'oldest'
      ? a.entry_date.localeCompare(b.entry_date)
      : b.entry_date.localeCompare(a.entry_date)),
    [cashflowSearchIndex, data.cashflow, entryFilter, expensesById, normalizedPartnerFilter, normalizedSearchQuery, partnerFilter, payoutPartnerById, projectFilterId, sortOrder, startDate, endDate],
  )

  const metrics = useMemo(
    () =>
      filtered.reduce(
        (acc, entry) => {
          if (entry.entry_type === 'receipt') acc.receipts += numericValue(entry.amount)
          if (entry.entry_type === 'expense') acc.expenses += numericValue(entry.amount)
          if (entry.entry_type === 'payout') acc.payouts += numericValue(entry.amount)
          return acc
        },
        { receipts: 0, expenses: 0, payouts: 0 },
      ),
    [filtered],
  )

  const globalBalance = useMemo(
    () => data.cashflow.reduce((sum, entry) => sum + numericValue(entry.signed_amount), 0),
    [data.cashflow],
  )
  const openingBalance = useMemo(
    () => data.cashflow
      .filter((entry) => entry.entry_date < startDate)
      .reduce((sum, entry) => sum + numericValue(entry.signed_amount), 0),
    [data.cashflow, startDate],
  )
  const groupedByDay = useMemo(
    () => computeCashflowDayGroups(filtered, sortOrder, openingBalance),
    [filtered, openingBalance, sortOrder],
  )

  const viewedReceipt = viewingEntry?.entry_type === 'receipt' ? receiptsById.get(viewingEntry.id) ?? null : null
  const viewedExpense = viewingEntry?.entry_type === 'expense' ? expensesById.get(viewingEntry.id) ?? null : null
  const viewedPayout = viewingEntry?.entry_type === 'payout' ? payoutsById.get(viewingEntry.id) ?? null : null
  const viewingDetails = useMemo<TransactionDetails | null>(() => {
    if (!viewingEntry) return null

    return {
      account: viewingEntry.bank_account ?? '',
      amount: numericValue(viewingEntry.amount),
      amountLabel: `${viewingEntry.signed_amount >= 0 ? '+' : '-'}${formatCurrency(Math.abs(numericValue(viewingEntry.signed_amount)))}`,
      category: viewedExpense?.category ? stageLabel(viewedExpense.category) : '',
      client: viewedReceipt?.client_name ?? '',
      counterpart: sanitizeCashflowText(viewingEntry.counterpart),
      date: formatDate(viewingEntry.entry_date),
      discipline: viewedPayout?.discipline ? stageLabel(viewedPayout.discipline) : '',
      note: viewingEntry.note ?? '',
      partner: viewedPayout?.partner_name ?? (normalizeSearchText(viewedExpense?.category ?? '') === 'ferias' ? viewedExpense?.vendor ?? '' : ''),
      project: viewingEntry.project_name ?? '',
      type: stageLabel(viewingEntry.entry_type),
      vendor: viewedExpense?.vendor ?? '',
    }
  }, [viewedExpense?.category, viewedExpense?.vendor, viewedPayout?.discipline, viewedPayout?.partner_name, viewedReceipt?.client_name, viewingEntry])

  const resetEntrada = () => setReceiptForm({ projectId: '', amount: '', bankAccount: '', entryDate: today(), note: '' })
  const resetSaida = () => {
    setExpenseForm({ category: '', projectId: '', amount: '', vendor: '', bankAccount: '', entryDate: today(), note: '' })
    setPayoutForm({ projectId: '', subprojectId: '', partnerName: partners[0], percentage: '', bankAccount: '', entryDate: today(), note: '' })
    setSaidaType('')
  }

  const toggleCollapsedDay = (day: string) => {
    setCollapsedDays((current) => (
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day]
    ))
  }

  const handleEntradaSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    void submitMutation('addReceipt', receiptForm, () => {
      resetEntrada()
      setShowEntrada(false)
    }, 'Entrada registrada')
  }

  const handleEditOpen = (entry: CashflowEntry) => {
    setEditingEntry(entry)
    if (entry.entry_type === 'receipt') {
      const receipt = receiptsById.get(entry.id)
      setEditForm({
        amount: String(receipt?.amount ?? ''),
        entryDate: (receipt?.received_at ?? entry.entry_date).slice(0, 10),
        bankAccount: receipt?.bank_account ?? '',
        note: receipt?.note ?? '',
        category: '',
        projectId: '',
        vendor: '',
        partnerName: '',
      })
      return
    }

    if (entry.entry_type === 'expense') {
      const expense = expensesById.get(entry.id)
      setEditForm({
        amount: String(expense?.amount ?? ''),
        entryDate: (expense?.paid_at ?? entry.entry_date).slice(0, 10),
        bankAccount: expense?.bank_account ?? '',
        note: expense?.note ?? '',
        category: expense?.category ?? '',
        projectId: expense?.project_id ?? '',
        vendor: expense?.vendor ?? '',
        partnerName: '',
      })
      return
    }

    const payout = payoutsById.get(entry.id)
    setEditForm({
      amount: String(payout?.amount ?? ''),
      entryDate: (payout?.paid_at ?? entry.entry_date).slice(0, 10),
      bankAccount: payout?.bank_account ?? '',
      note: payout?.note ?? '',
      category: '',
      projectId: '',
      vendor: '',
      partnerName: payout?.partner_name ?? partners[0],
    })
  }

  const handleEditSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingEntry) return

    const action = editingEntry.entry_type === 'receipt'
      ? 'updateReceipt'
      : editingEntry.entry_type === 'expense'
        ? 'updateExpense'
        : 'updatePayout'

    const payload = editingEntry.entry_type === 'receipt'
      ? {
        id: editingEntry.id,
        amount: editForm.amount,
        bankAccount: editForm.bankAccount,
        entryDate: editForm.entryDate,
        note: editForm.note,
      }
      : editingEntry.entry_type === 'expense'
        ? {
          id: editingEntry.id,
          amount: editForm.amount,
          category: editForm.category,
          vendor: editForm.vendor,
          bankAccount: editForm.bankAccount,
          entryDate: editForm.entryDate,
          note: editForm.note,
          projectId: editForm.projectId,
        }
        : {
          id: editingEntry.id,
          amount: editForm.amount,
          partnerName: editForm.partnerName,
          bankAccount: editForm.bankAccount,
          entryDate: editForm.entryDate,
          note: editForm.note,
        }

    void submitMutation(action, payload, () => setEditingEntry(null), 'Salvo')
  }

  const handleDeleteConfirm = () => {
    if (!deletingEntry || normalizeSearchText(deleteConfirmationText) !== 'deletar') return
    const action = deletingEntry.entry_type === 'receipt' ? 'deleteReceipt' : deletingEntry.entry_type === 'expense' ? 'deleteExpense' : 'deletePayout'
    void submitMutation(action, { id: deletingEntry.id }, () => {
      setDeletingEntry(null)
      setDeleteConfirmationText('')
    }, 'Excluido')
  }

  const handleSaidaSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (saidaType === PAYOUT_KEY) {
      void submitMutation('addPayout', payoutForm, () => {
        resetSaida()
        setShowSaida(false)
      }, 'Repasse registrado')
      return
    }

    void submitMutation('addExpense', { ...expenseForm, category: saidaType }, () => {
      resetSaida()
      setShowSaida(false)
    }, 'Despesa registrada')
  }

  return (
    <>
      <TransactionDetailModal details={viewingDetails} entry={viewingEntry} onClose={() => setViewingEntry(null)} />
      <DeleteTransactionModal
        confirmationText={deleteConfirmationText}
        entry={deletingEntry}
        mutating={mutating}
        onChangeConfirmationText={setDeleteConfirmationText}
        onClose={() => {
          setDeletingEntry(null)
          setDeleteConfirmationText('')
        }}
        onConfirm={handleDeleteConfirm}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Entradas" value={formatCurrency(metrics.receipts)} helper={`${startDate} -> ${endDate}`} icon={ArrowDownCircle} />
        <MetricCard label="Despesas" value={formatCurrency(metrics.expenses)} helper="Saidas operacionais no periodo" icon={ArrowUpCircle} />
        <MetricCard label="Repasses" value={formatCurrency(metrics.payouts)} helper="Repasses aos socios no periodo" icon={HandCoins} />
        <MetricCard label="Saldo global" value={formatCurrency(globalBalance)} helper="Acumulado desde o inicio; filtros so afetam a lista" icon={Landmark} />
      </div>

      <Panel
        title="Livro-caixa"
        subtitle="Entradas, despesas e repasses no periodo selecionado."
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" className="rounded-xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-xs text-[var(--ink)]" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <span className="text-xs text-[var(--ink-soft)]">-></span>
            <input type="date" className="rounded-xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-xs text-[var(--ink)]" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            <button
              type="button"
              className="rounded-xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper)]"
              onClick={() => setSortOrder((current) => current === 'oldest' ? 'newest' : 'oldest')}
            >
              Ordenar: {sortOrder === 'oldest' ? 'mais antigas' : 'mais recentes'}
            </button>
            <button type="button" className="inline-flex items-center gap-1.5 bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700" onClick={() => setShowEntrada(true)}>
              <Plus className="h-3.5 w-3.5" /> Entrada
            </button>
            <button type="button" className="inline-flex items-center gap-1.5 bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700" onClick={() => setShowSaida(true)}>
              <Plus className="h-3.5 w-3.5" /> Saida
            </button>
          </div>
        )}
      >
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-soft)]" />
          <input
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg-card-solid)] py-2.5 pl-10 pr-4 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-soft)] focus:border-[var(--teal)]"
            placeholder="Buscar por projeto, cliente, disciplina, socio, fornecedor, nota ou conta..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="mb-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <select
            className="rounded-xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-xs text-[var(--ink)]"
            value={entryFilter}
            onChange={(event) => setEntryFilter(event.target.value as 'all' | 'expense' | 'payout')}
          >
            <option value="all">Todas as movimentacoes</option>
            <option value="expense">So despesas</option>
            <option value="payout">So repasses</option>
          </select>
          <PickerField
            options={[{ value: '', label: 'Todos os projetos' }, ...projectOptions]}
            placeholder="Filtrar por projeto"
            value={projectFilterId}
            onChange={setProjectFilterId}
          />
          <PickerField
                    options={[{ value: '', label: 'Todos os socios' }, ...partnerOptions]}
                    placeholder="Filtrar por socio"
                    value={partnerFilter}
                    onChange={setPartnerFilter}
                  />
        </div>

        {groupedByDay.length ? (
          <div className="divide-y divide-[var(--line)]">
            {groupedByDay.map(({ day, entries, dayNet, runningBalance }) => {
              const collapsed = collapsedDays.includes(day)

              return (
                <div key={day}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 bg-[var(--paper)] px-4 py-2.5 text-left"
                    onClick={() => toggleCollapsedDay(day)}
                  >
                    <div className="flex items-center gap-3">
                      {collapsed ? <ChevronRight className="h-4 w-4 text-[var(--ink-soft)]" /> : <ChevronDown className="h-4 w-4 text-[var(--ink-soft)]" />}
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        {formatDate(day)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-medium ${dayNet >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {dayNet >= 0 ? '+' : '-'}{formatCurrency(Math.abs(dayNet))} no dia
                      </span>
                      <span className="text-xs text-[var(--ink-soft)]">
                        saldo <span className={`font-semibold ${runningBalance >= 0 ? 'text-[var(--ink)]' : 'text-rose-700 dark:text-rose-400'}`}>{formatCurrency(runningBalance)}</span>
                      </span>
                    </div>
                  </button>

                  {!collapsed ? (
                    <div className="divide-y divide-[var(--line)]">
                      {entries.map((entry) => (
                        <div key={`${entry.entry_type}-${entry.id}`} className="group flex items-center gap-3 px-4 py-3 hover:bg-[var(--teal-active-bg)]">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-[var(--ink)]">{entry.project_name ?? '-'}</span>
                              {sanitizeCashflowText(entry.counterpart) ? <span className="text-xs text-[var(--ink-soft)]">{sanitizeCashflowText(entry.counterpart)}</span> : null}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-soft)]">
                              <span>{stageLabel(entry.entry_type)}</span>
                              {entry.bank_account ? <><span>-</span><span>{entry.bank_account}</span></> : null}
                            </div>
                          </div>
                          <span className={`shrink-0 text-sm font-semibold tabular-nums ${entry.signed_amount >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                            {entry.signed_amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(numericValue(entry.signed_amount)))}
                          </span>
                          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button type="button" className="rounded p-1 text-[var(--ink-soft)] hover:bg-[var(--paper)] hover:text-[var(--ink)]" onClick={() => setViewingEntry(entry)}>
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" className="rounded p-1 text-[var(--ink-soft)] hover:bg-[var(--paper)] hover:text-[var(--ink)]" onClick={() => handleEditOpen(entry)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1 text-[var(--ink-soft)] hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => {
                                setDeletingEntry(entry)
                                setDeleteConfirmationText('')
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState title="Sem movimentacao no periodo" body="Ajuste o intervalo de datas ou registre entradas e saidas." />
        )}
      </Panel>

      {showEntrada ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md border border-[var(--line)] bg-[var(--bg-card-solid)] p-6 shadow-[0_8px_32px_rgba(12,26,26,0.08)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ink)]">Registrar entrada</h3>
              <button type="button" className="rounded-full p-1 hover:bg-[var(--paper)]" onClick={() => { setShowEntrada(false); resetEntrada() }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="grid gap-4" onSubmit={handleEntradaSubmit}>
              <PickerField
                required
                inputClassName={pickerInputClass}
                options={projectOptions}
                placeholder="Selecione o projeto"
                value={receiptForm.projectId}
                onChange={(projectId) => setReceiptForm((current) => ({ ...current, projectId }))}
              />
              <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Valor (R$)" value={receiptForm.amount} onChange={(event) => setReceiptForm((current) => ({ ...current, amount: event.target.value }))} />
              <input required type="date" className={inputClass} value={receiptForm.entryDate} onChange={(event) => setReceiptForm((current) => ({ ...current, entryDate: event.target.value }))} />
              <input className={inputClass} placeholder="Conta bancaria (opcional)" value={receiptForm.bankAccount} onChange={(event) => setReceiptForm((current) => ({ ...current, bankAccount: event.target.value }))} />
              <textarea className={`${inputClass} min-h-20`} placeholder="Observacao (opcional)" value={receiptForm.note} onChange={(event) => setReceiptForm((current) => ({ ...current, note: event.target.value }))} />
              <button type="submit" disabled={mutating} className="bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                Salvar entrada
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {editingEntry ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md border border-[var(--line)] bg-[var(--bg-card-solid)] p-6 shadow-[0_8px_32px_rgba(12,26,26,0.08)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ink)]">Editar {stageLabel(editingEntry.entry_type)}</h3>
              <button type="button" className="rounded-full p-1 hover:bg-[var(--paper)]" onClick={() => setEditingEntry(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="grid gap-4" onSubmit={handleEditSubmit}>
              {editingEntry.entry_type === 'expense' ? (
                <select required className={inputClass} value={editForm.category} onChange={(event) => setEditForm((current) => ({ ...current, category: event.target.value }))}>
                  <option value="">Tipo de despesa</option>
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>{stageLabel(category)}</option>
                  ))}
                </select>
              ) : null}
              {editingEntry.entry_type === 'expense' ? (
                <PickerField
                  inputClassName={pickerInputClass}
                  options={[{ value: '', label: 'Projeto (opcional)' }, ...projectOptions]}
                  placeholder="Projeto (opcional)"
                  value={editForm.projectId}
                  onChange={(projectId) => setEditForm((current) => ({ ...current, projectId }))}
                />
              ) : null}
              {editingEntry.entry_type === 'payout' ? (
                <select className={inputClass} value={editForm.partnerName} onChange={(event) => setEditForm((current) => ({ ...current, partnerName: event.target.value }))}>
                  {partners.map((partner) => <option key={partner} value={partner}>{partner}</option>)}
                </select>
              ) : null}
              <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Valor (R$)" value={editForm.amount} onChange={(event) => setEditForm((current) => ({ ...current, amount: event.target.value }))} />
              {editingEntry.entry_type === 'expense' ? (
                editForm.category === 'ferias' ? (
                  <PickerField
                    inputClassName={pickerInputClass}
                    options={partnerOptions}
                    placeholder="Socio"
                    value={editForm.vendor}
                    onChange={(vendor) => setEditForm((current) => ({ ...current, vendor }))}
                  />
                ) : (
                  <input className={inputClass} placeholder="Fornecedor (opcional)" value={editForm.vendor} onChange={(event) => setEditForm((current) => ({ ...current, vendor: event.target.value }))} />
                )
              ) : null}
              <input required type="date" className={inputClass} value={editForm.entryDate} onChange={(event) => setEditForm((current) => ({ ...current, entryDate: event.target.value }))} />
              <input className={inputClass} placeholder="Conta bancaria (opcional)" value={editForm.bankAccount} onChange={(event) => setEditForm((current) => ({ ...current, bankAccount: event.target.value }))} />
              <textarea className={`${inputClass} min-h-20`} placeholder="Observacao (opcional)" value={editForm.note} onChange={(event) => setEditForm((current) => ({ ...current, note: event.target.value }))} />
              <button type="submit" disabled={mutating} className="bg-[var(--ink)] px-4 py-3 text-sm font-medium text-[var(--bg-card-solid)] hover:opacity-80 disabled:opacity-50">
                Salvar alteracoes
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {showSaida ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md border border-[var(--line)] bg-[var(--bg-card-solid)] p-6 shadow-[0_8px_32px_rgba(12,26,26,0.08)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ink)]">Registrar saida</h3>
              <button type="button" className="rounded-full p-1 hover:bg-[var(--paper)]" onClick={() => { setShowSaida(false); resetSaida() }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="grid gap-4" onSubmit={handleSaidaSubmit}>
              <select required className={inputClass} value={saidaType} onChange={(event) => setSaidaType(event.target.value)}>
                <option value="">Tipo de saida</option>
                {expenseCategories.map((category) => (
                  <option key={category} value={category}>{stageLabel(category)}</option>
                ))}
                <option value={PAYOUT_KEY}>Repasse para socio</option>
              </select>

              {saidaType === PAYOUT_KEY ? (
                <>
                  <PickerField
                    required
                    inputClassName={pickerInputClass}
                    options={projectOptions}
                    placeholder="Selecione o projeto"
                    value={payoutForm.projectId}
                    onChange={(projectId) => setPayoutForm((current) => ({ ...current, projectId, subprojectId: '' }))}
                  />
                  {payoutForm.projectId ? (
                    <PickerField
                      required
                      inputClassName={pickerInputClass}
                      options={subprojectOptions}
                      placeholder="Selecione a disciplina"
                      value={payoutForm.subprojectId}
                      onChange={(subprojectId) => {
                        const subproject = subprojectsById.get(subprojectId) as Subproject | undefined
                        setPayoutForm((current) => ({
                          ...current,
                          subprojectId,
                          partnerName: subproject?.responsible_partner ?? partners[0],
                        }))
                      }}
                    />
                  ) : null}
                  {selectedSubproject ? (
                    <div className="border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink-soft)]">
                      Valor do subprojeto: <span className="font-semibold text-[var(--ink)]">{formatCurrency(numericValue(selectedSubproject.amount))}</span>
                    </div>
                  ) : null}
                  <select className={inputClass} value={payoutForm.partnerName} onChange={(event) => setPayoutForm((current) => ({ ...current, partnerName: event.target.value }))}>
                    {partners.map((partner) => <option key={partner} value={partner}>{partner}</option>)}
                  </select>
                  <div className="flex items-center gap-3">
                    <input required type="number" min="0" max="100" step="0.01" className={inputClass} placeholder="Percentual (%)" value={payoutForm.percentage} onChange={(event) => setPayoutForm((current) => ({ ...current, percentage: event.target.value }))} />
                    {payoutAmount != null ? <span className="shrink-0 text-sm font-semibold text-[var(--ink)]">= {formatCurrency(payoutAmount)}</span> : null}
                  </div>
                </>
              ) : saidaType ? (
                <>
                  <PickerField
                    inputClassName={pickerInputClass}
                    options={[{ value: '', label: 'Projeto (opcional)' }, ...projectOptions]}
                    placeholder="Projeto (opcional)"
                    value={expenseForm.projectId}
                    onChange={(projectId) => setExpenseForm((current) => ({ ...current, projectId }))}
                  />
                  <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Valor (R$)" value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} />
                  {saidaType === 'ferias' ? (
                    <PickerField
                      inputClassName={pickerInputClass}
                      options={partnerOptions}
                      placeholder="Socio"
                      value={expenseForm.vendor}
                      onChange={(vendor) => setExpenseForm((current) => ({ ...current, vendor }))}
                    />
                  ) : (
                    <input className={inputClass} placeholder="Fornecedor (opcional)" value={expenseForm.vendor} onChange={(event) => setExpenseForm((current) => ({ ...current, vendor: event.target.value }))} />
                  )}
                </>
              ) : null}

              {saidaType ? (
                <>
                  <input
                    required
                    type="date"
                    className={inputClass}
                    value={saidaType === PAYOUT_KEY ? payoutForm.entryDate : expenseForm.entryDate}
                    onChange={(event) => {
                      if (saidaType === PAYOUT_KEY) setPayoutForm((current) => ({ ...current, entryDate: event.target.value }))
                      else setExpenseForm((current) => ({ ...current, entryDate: event.target.value }))
                    }}
                  />
                  <input
                    className={inputClass}
                    placeholder="Conta bancaria (opcional)"
                    value={saidaType === PAYOUT_KEY ? payoutForm.bankAccount : expenseForm.bankAccount}
                    onChange={(event) => {
                      if (saidaType === PAYOUT_KEY) setPayoutForm((current) => ({ ...current, bankAccount: event.target.value }))
                      else setExpenseForm((current) => ({ ...current, bankAccount: event.target.value }))
                    }}
                  />
                  <textarea
                    className={`${inputClass} min-h-20`}
                    placeholder="Observacao (opcional)"
                    value={saidaType === PAYOUT_KEY ? payoutForm.note : expenseForm.note}
                    onChange={(event) => {
                      if (saidaType === PAYOUT_KEY) setPayoutForm((current) => ({ ...current, note: event.target.value }))
                      else setExpenseForm((current) => ({ ...current, note: event.target.value }))
                    }}
                  />
                  <button type="submit" disabled={mutating} className="bg-rose-600 px-4 py-3 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50">
                    Salvar saida
                  </button>
                </>
              ) : null}
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
