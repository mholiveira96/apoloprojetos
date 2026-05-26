import { useMemo, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, HandCoins, Landmark, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { BootstrapData, CashflowEntry } from '@/types/app'
import { expenseCategories, partners } from '@/lib/constants'
import { formatCurrency, formatDate, numericValue, stageLabel } from '@/lib/formatters'
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

const inputClass = 'border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm w-full'
const today = () => new Date().toISOString().slice(0, 10)
const shiftDays = (date: string, days: number) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const PAYOUT_KEY = 'repasse'

export function CashflowPage({ data, submitMutation, mutating }: Props) {
  const [startDate, setStartDate] = useState(() => shiftDays(today(), -30))
  const [endDate, setEndDate] = useState(() => shiftDays(today(), 30))
  const [entryFilter, setEntryFilter] = useState<'all' | 'expense' | 'payout'>('all')
  const [projectFilterId, setProjectFilterId] = useState('')
  const [partnerFilter, setPartnerFilter] = useState('')
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest')

  const [showEntrada, setShowEntrada] = useState(false)
  const [showSaida, setShowSaida] = useState(false)

  const [editingEntry, setEditingEntry] = useState<CashflowEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<CashflowEntry | null>(null)
  const [editForm, setEditForm] = useState({ amount: '', entryDate: '', bankAccount: '', note: '', category: '', projectId: '', vendor: '', partnerName: '' })

  const [receiptForm, setReceiptForm] = useState({ projectId: '', amount: '', bankAccount: '', entryDate: today(), note: '' })
  const [expenseForm, setExpenseForm] = useState({ category: '', projectId: '', amount: '', vendor: '', bankAccount: '', entryDate: today(), note: '' })
  const [payoutForm, setPayoutForm] = useState({ subprojectId: '', partnerName: partners[0], percentage: '', bankAccount: '', entryDate: today(), note: '' })
  const [saidaType, setSaidaType] = useState<string>('')

  const payoutPartnerById = useMemo(
    () => new Map(data.payouts.map((payout) => [payout.id, payout.partner_name])),
    [data.payouts],
  )

  const selectableProjects = useMemo(
    () => data.projects.filter((project) => {
      const stage = String(project.stage || '').trim().toLowerCase()
      const contractAmount = numericValue(project.contract_amount)
      const totalReceived = numericValue(project.total_received)
      const archivedFlag = project.archived === true || project.archived === 1 || project.archived === '1'
      const isCompleted = stage === 'concluído'
      const isFullyReceived = contractAmount > 0 && totalReceived >= contractAmount

      return !archivedFlag && !isCompleted && !isFullyReceived
    }),
    [data.projects],
  )

  const filtered = useMemo(
    () => [...data.cashflow.filter((entry) => {
      if (entry.entry_date < startDate || entry.entry_date > endDate) return false
      if (entryFilter !== 'all' && entry.entry_type !== entryFilter) return false
      if (projectFilterId && entry.project_id !== projectFilterId) return false
      if (partnerFilter) {
        if (entry.entry_type !== 'payout') return false
        return payoutPartnerById.get(entry.id) === partnerFilter
      }
      return true
    })].sort((a, b) => sortOrder === 'oldest'
      ? a.entry_date.localeCompare(b.entry_date)
      : b.entry_date.localeCompare(a.entry_date)),
    [data.cashflow, startDate, endDate, entryFilter, projectFilterId, partnerFilter, payoutPartnerById, sortOrder],
  )

  const metrics = useMemo(
    () =>
      filtered.reduce(
        (acc, e) => {
          if (e.entry_type === 'receipt') acc.receipts += numericValue(e.amount)
          if (e.entry_type === 'expense') acc.expenses += numericValue(e.amount)
          if (e.entry_type === 'payout') acc.payouts += numericValue(e.amount)
          return acc
        },
        { receipts: 0, expenses: 0, payouts: 0 },
      ),
    [filtered],
  )

  const groupedByDay = useMemo(
    () => computeCashflowDayGroups(filtered, sortOrder),
    [filtered, sortOrder],
  )

  // Selected subproject for payout form
  const selectedSubproject = useMemo(
    () => data.subprojects.find((sp) => sp.id === payoutForm.subprojectId) ?? null,
    [data.subprojects, payoutForm.subprojectId],
  )
  const payoutAmount = selectedSubproject && payoutForm.percentage
    ? numericValue(selectedSubproject.amount) * Number(payoutForm.percentage) / 100
    : null

  // Group subprojects by project for the payout project→subproject picker
  const [payoutProjectId, setPayoutProjectId] = useState('')
  const subprojectsForProject = useMemo(
    () => data.subprojects.filter((sp) => sp.project_id === payoutProjectId),
    [data.subprojects, payoutProjectId],
  )

  const resetEntrada = () => setReceiptForm({ projectId: '', amount: '', bankAccount: '', entryDate: today(), note: '' })
  const resetSaida = () => {
    setExpenseForm({ category: '', projectId: '', amount: '', vendor: '', bankAccount: '', entryDate: today(), note: '' })
    setPayoutForm({ subprojectId: '', partnerName: partners[0], percentage: '', bankAccount: '', entryDate: today(), note: '' })
    setPayoutProjectId('')
    setSaidaType('')
  }

  const handleEntradaSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void submitMutation('addReceipt', receiptForm, () => { resetEntrada(); setShowEntrada(false) }, 'Entrada registrada')
  }

  const handleEditOpen = (entry: CashflowEntry) => {
    setEditingEntry(entry)
    if (entry.entry_type === 'receipt') {
      const r = data.receipts.find((r) => r.id === entry.id)
      setEditForm({ amount: String(r?.amount ?? ''), entryDate: (r?.received_at ?? entry.entry_date).slice(0, 10), bankAccount: r?.bank_account ?? '', note: r?.note ?? '', category: '', projectId: '', vendor: '', partnerName: '' })
    } else if (entry.entry_type === 'expense') {
      const ex = data.expenses.find((ex) => ex.id === entry.id)
      setEditForm({ amount: String(ex?.amount ?? ''), entryDate: (ex?.paid_at ?? entry.entry_date).slice(0, 10), bankAccount: ex?.bank_account ?? '', note: ex?.note ?? '', category: ex?.category ?? '', projectId: ex?.project_id ?? '', vendor: ex?.vendor ?? '', partnerName: '' })
    } else {
      const p = data.payouts.find((p) => p.id === entry.id)
      setEditForm({ amount: String(p?.amount ?? ''), entryDate: (p?.paid_at ?? entry.entry_date).slice(0, 10), bankAccount: p?.bank_account ?? '', note: p?.note ?? '', category: '', projectId: '', vendor: '', partnerName: p?.partner_name ?? partners[0] })
    }
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEntry) return
    const type = editingEntry.entry_type
    const action = type === 'receipt' ? 'updateReceipt' : type === 'expense' ? 'updateExpense' : 'updatePayout'
    const payload = type === 'receipt'
      ? { id: editingEntry.id, amount: editForm.amount, bankAccount: editForm.bankAccount, entryDate: editForm.entryDate, note: editForm.note }
      : type === 'expense'
        ? { id: editingEntry.id, amount: editForm.amount, category: editForm.category, vendor: editForm.vendor, bankAccount: editForm.bankAccount, entryDate: editForm.entryDate, note: editForm.note, projectId: editForm.projectId }
        : { id: editingEntry.id, amount: editForm.amount, partnerName: editForm.partnerName, bankAccount: editForm.bankAccount, entryDate: editForm.entryDate, note: editForm.note }
    void submitMutation(action, payload, () => setEditingEntry(null), 'Salvo')
  }

  const handleDeleteConfirm = () => {
    if (!deletingEntry) return
    const action = deletingEntry.entry_type === 'receipt' ? 'deleteReceipt' : deletingEntry.entry_type === 'expense' ? 'deleteExpense' : 'deletePayout'
    void submitMutation(action, { id: deletingEntry.id }, () => setDeletingEntry(null), 'Excluído')
  }

  const handleSaidaSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (saidaType === PAYOUT_KEY) {
      void submitMutation('addPayout', payoutForm, () => { resetSaida(); setShowSaida(false) }, 'Repasse registrado')
    } else {
      void submitMutation('addExpense', { ...expenseForm, category: saidaType }, () => { resetSaida(); setShowSaida(false) }, 'Despesa registrada')
    }
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Entradas" value={formatCurrency(metrics.receipts)} helper={`${startDate} → ${endDate}`} icon={ArrowDownCircle} />
        <MetricCard label="Despesas" value={formatCurrency(metrics.expenses)} helper="Saídas operacionais no período" icon={ArrowUpCircle} />
        <MetricCard label="Repasses" value={formatCurrency(metrics.payouts)} helper="Repasses aos sócios no período" icon={HandCoins} />
        <MetricCard
          label="Net"
          value={formatCurrency(metrics.receipts - metrics.expenses - metrics.payouts)}
          helper="Movimentação líquida no período"
          icon={Landmark}
        />
      </div>

      <Panel
        title="Livro-caixa"
        subtitle="Entradas, despesas e repasses no período selecionado."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" className="rounded-xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-xs text-[var(--ink)]" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span className="text-xs text-[var(--ink-soft)]">→</span>
            <input type="date" className="rounded-xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-xs text-[var(--ink)]" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <button
              type="button"
              onClick={() => setSortOrder((current) => current === 'oldest' ? 'newest' : 'oldest')}
              className="rounded-xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper)]"
            >
              Ordenar: {sortOrder === 'oldest' ? 'mais antigas' : 'mais recentes'}
            </button>
            <button
              onClick={() => setShowEntrada(true)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" /> Entrada
            </button>
            <button
              onClick={() => setShowSaida(true)}
              className="inline-flex items-center gap-1.5 bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700"
            >
              <Plus className="h-3.5 w-3.5" /> Saída
            </button>
          </div>
        }
      >
        <div className="mb-4 grid gap-2 md:grid-cols-3">
          <select
            className="rounded-xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-xs text-[var(--ink)]"
            value={entryFilter}
            onChange={(e) => setEntryFilter(e.target.value as 'all' | 'expense' | 'payout')}
          >
            <option value="all">Todas as movimentações</option>
            <option value="expense">Só despesas</option>
            <option value="payout">Só repasses</option>
          </select>
          <select
            className="rounded-xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-xs text-[var(--ink)]"
            value={projectFilterId}
            onChange={(e) => setProjectFilterId(e.target.value)}
          >
            <option value="">Todos os projetos</option>
            {data.projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <select
            className="rounded-xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-xs text-[var(--ink)]"
            value={partnerFilter}
            onChange={(e) => {
              setPartnerFilter(e.target.value)
              if (e.target.value) setEntryFilter('payout')
            }}
          >
            <option value="">Todos os sócios</option>
            {partners.map((partner) => (
              <option key={partner} value={partner}>{partner}</option>
            ))}
          </select>
        </div>
        {groupedByDay.length ? (
          <div className="divide-y divide-[var(--line)]">
            {groupedByDay.map(({ day, entries, dayNet, runningBalance }) => (
              <div key={day}>
                {/* Day header */}
                <div className="flex items-center justify-between gap-4 bg-[var(--paper)] px-4 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    {formatDate(day)}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-medium ${dayNet >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      {dayNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(dayNet))} no dia
                    </span>
                    <span className="text-xs text-[var(--ink-soft)]">
                      saldo <span className={`font-semibold ${runningBalance >= 0 ? 'text-[var(--ink)]' : 'text-rose-700 dark:text-rose-400'}`}>{formatCurrency(runningBalance)}</span>
                    </span>
                  </div>
                </div>
                {/* Entries for this day */}
                <div className="divide-y divide-[var(--line)]">
                  {entries.map((entry) => (
                    <div key={`${entry.entry_type}-${entry.id}`} className="group flex items-center gap-3 px-4 py-3 hover:bg-[var(--teal-active-bg)]">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-[var(--ink)]">{entry.project_name ?? '—'}</span>
                          {entry.counterpart && <span className="text-xs text-[var(--ink-soft)]">{entry.counterpart}</span>}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-soft)]">
                          <span>{stageLabel(entry.entry_type)}</span>
                          {entry.bank_account && <><span>·</span><span>{entry.bank_account}</span></>}
                        </div>
                      </div>
                      <span className={`shrink-0 text-sm font-semibold tabular-nums ${entry.signed_amount >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {entry.signed_amount >= 0 ? '+' : '−'}{formatCurrency(Math.abs(numericValue(entry.signed_amount)))}
                      </span>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => handleEditOpen(entry)} className="rounded p-1 text-[var(--ink-soft)] hover:bg-[var(--paper)] hover:text-[var(--ink)]">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeletingEntry(entry)} className="rounded p-1 text-[var(--ink-soft)] hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Sem movimentação no período" body="Ajuste o intervalo de datas ou registre entradas e saídas." />
        )}
      </Panel>

      {/* Entrada modal */}
      {showEntrada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md [] border border-[var(--line)] bg-[var(--bg-card-solid)] p-6 shadow-[0_8px_32px_rgba(12,26,26,0.08)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ink)]">Registrar entrada</h3>
              <button onClick={() => { setShowEntrada(false); resetEntrada() }} className="rounded-full p-1 hover:bg-[var(--paper)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="grid gap-4" onSubmit={handleEntradaSubmit}>
              <select required className={inputClass} value={receiptForm.projectId} onChange={(e) => setReceiptForm((c) => ({ ...c, projectId: e.target.value }))}>
                <option value="">Selecione o projeto</option>
                {selectableProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.client_name ? ` · ${p.client_name}` : ''}</option>
                ))}
              </select>
              <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Valor (R$)" value={receiptForm.amount} onChange={(e) => setReceiptForm((c) => ({ ...c, amount: e.target.value }))} />
              <input type="date" required className={inputClass} value={receiptForm.entryDate} onChange={(e) => setReceiptForm((c) => ({ ...c, entryDate: e.target.value }))} />
              <input className={inputClass} placeholder="Conta bancária (opcional)" value={receiptForm.bankAccount} onChange={(e) => setReceiptForm((c) => ({ ...c, bankAccount: e.target.value }))} />
              <textarea className={`${inputClass} min-h-20`} placeholder="Observação (opcional)" value={receiptForm.note} onChange={(e) => setReceiptForm((c) => ({ ...c, note: e.target.value }))} />
              <button type="submit" disabled={mutating} className="bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                Salvar entrada
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md border border-[var(--line)] bg-[var(--bg-card-solid)] p-6 shadow-[0_8px_32px_rgba(12,26,26,0.08)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ink)]">Editar {stageLabel(editingEntry.entry_type)}</h3>
              <button onClick={() => setEditingEntry(null)} className="rounded-full p-1 hover:bg-[var(--paper)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="grid gap-4" onSubmit={handleEditSubmit}>
              {editingEntry.entry_type === 'expense' && (
                <select required className={inputClass} value={editForm.category} onChange={(e) => setEditForm((c) => ({ ...c, category: e.target.value }))}>
                  <option value="">Tipo de despesa</option>
                  {expenseCategories.map((cat) => (
                    <option key={cat} value={cat}>{stageLabel(cat)}</option>
                  ))}
                </select>
              )}
              {editingEntry.entry_type === 'expense' && (
                <select className={inputClass} value={editForm.projectId} onChange={(e) => setEditForm((c) => ({ ...c, projectId: e.target.value }))}>
                  <option value="">Projeto (opcional)</option>
                  {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              {editingEntry.entry_type === 'payout' && (
                <select className={inputClass} value={editForm.partnerName} onChange={(e) => setEditForm((c) => ({ ...c, partnerName: e.target.value }))}>
                  {partners.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
              <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Valor (R$)" value={editForm.amount} onChange={(e) => setEditForm((c) => ({ ...c, amount: e.target.value }))} />
              {editingEntry.entry_type === 'expense' && (
                <input className={inputClass} placeholder="Fornecedor (opcional)" value={editForm.vendor} onChange={(e) => setEditForm((c) => ({ ...c, vendor: e.target.value }))} />
              )}
              <input type="date" required className={inputClass} value={editForm.entryDate} onChange={(e) => setEditForm((c) => ({ ...c, entryDate: e.target.value }))} />
              <input className={inputClass} placeholder="Conta bancária (opcional)" value={editForm.bankAccount} onChange={(e) => setEditForm((c) => ({ ...c, bankAccount: e.target.value }))} />
              <textarea className={`${inputClass} min-h-20`} placeholder="Observação (opcional)" value={editForm.note} onChange={(e) => setEditForm((c) => ({ ...c, note: e.target.value }))} />
              <button type="submit" disabled={mutating} className="bg-[var(--ink)] px-4 py-3 text-sm font-medium text-[var(--bg-card-solid)] hover:opacity-80 disabled:opacity-50">
                Salvar alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm border border-[var(--line)] bg-[var(--bg-card-solid)] p-6 shadow-[0_8px_32px_rgba(12,26,26,0.08)]">
            <h3 className="mb-2 text-lg font-semibold text-[var(--ink)]">Excluir transação?</h3>
            <p className="mb-6 text-sm text-[var(--ink-soft)]">
              {stageLabel(deletingEntry.entry_type)} de <span className="font-medium text-[var(--ink)]">{formatCurrency(Math.abs(numericValue(deletingEntry.signed_amount)))}</span>{deletingEntry.project_name ? ` · ${deletingEntry.project_name}` : ''} em {formatDate(deletingEntry.entry_date)}. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingEntry(null)} className="flex-1 border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--paper)]">
                Cancelar
              </button>
              <button onClick={handleDeleteConfirm} disabled={mutating} className="flex-1 bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saída modal */}
      {showSaida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md [] border border-[var(--line)] bg-[var(--bg-card-solid)] p-6 shadow-[0_8px_32px_rgba(12,26,26,0.08)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ink)]">Registrar saída</h3>
              <button onClick={() => { setShowSaida(false); resetSaida() }} className="rounded-full p-1 hover:bg-[var(--paper)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="grid gap-4" onSubmit={handleSaidaSubmit}>
              <select required className={inputClass} value={saidaType} onChange={(e) => setSaidaType(e.target.value)}>
                <option value="">Tipo de saída</option>
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>{stageLabel(cat)}</option>
                ))}
                <option value={PAYOUT_KEY}>Repasse para sócio</option>
              </select>

              {saidaType === PAYOUT_KEY ? (
                <>
                  <select required className={inputClass} value={payoutProjectId} onChange={(e) => { setPayoutProjectId(e.target.value); setPayoutForm((c) => ({ ...c, subprojectId: '' })) }}>
                    <option value="">Selecione o projeto</option>
                    {selectableProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {payoutProjectId && (
                    <select required className={inputClass} value={payoutForm.subprojectId} onChange={(e) => {
                      const sp = data.subprojects.find((s) => s.id === e.target.value)
                      setPayoutForm((c) => ({ ...c, subprojectId: e.target.value, partnerName: sp?.responsible_partner ?? partners[0] }))
                    }}>
                      <option value="">Selecione a disciplina</option>
                      {subprojectsForProject.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {stageLabel(sp.discipline)} — {formatCurrency(numericValue(sp.amount))}
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedSubproject && (
                    <div className="border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink-soft)]">
                      Valor do subprojeto: <span className="font-semibold text-[var(--ink)]">{formatCurrency(numericValue(selectedSubproject.amount))}</span>
                    </div>
                  )}
                  <select className={inputClass} value={payoutForm.partnerName} onChange={(e) => setPayoutForm((c) => ({ ...c, partnerName: e.target.value }))}>
                    {partners.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <div className="flex items-center gap-3">
                    <input
                      required
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className={inputClass}
                      placeholder="Percentual (%)"
                      value={payoutForm.percentage}
                      onChange={(e) => setPayoutForm((c) => ({ ...c, percentage: e.target.value }))}
                    />
                    {payoutAmount != null && (
                      <span className="shrink-0 text-sm font-semibold text-[var(--ink)]">= {formatCurrency(payoutAmount)}</span>
                    )}
                  </div>
                </>
              ) : saidaType ? (
                <>
                  <select className={inputClass} value={expenseForm.projectId} onChange={(e) => setExpenseForm((c) => ({ ...c, projectId: e.target.value }))}>
                    <option value="">Projeto (opcional)</option>
                    {selectableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Valor (R$)" value={expenseForm.amount} onChange={(e) => setExpenseForm((c) => ({ ...c, amount: e.target.value }))} />
                  <input className={inputClass} placeholder="Fornecedor (opcional)" value={expenseForm.vendor} onChange={(e) => setExpenseForm((c) => ({ ...c, vendor: e.target.value }))} />
                </>
              ) : null}

              {saidaType && (
                <>
                  <input type="date" required className={inputClass} value={saidaType === PAYOUT_KEY ? payoutForm.entryDate : expenseForm.entryDate} onChange={(e) => {
                    if (saidaType === PAYOUT_KEY) setPayoutForm((c) => ({ ...c, entryDate: e.target.value }))
                    else setExpenseForm((c) => ({ ...c, entryDate: e.target.value }))
                  }} />
                  <input className={inputClass} placeholder="Conta bancária (opcional)" value={saidaType === PAYOUT_KEY ? payoutForm.bankAccount : expenseForm.bankAccount} onChange={(e) => {
                    if (saidaType === PAYOUT_KEY) setPayoutForm((c) => ({ ...c, bankAccount: e.target.value }))
                    else setExpenseForm((c) => ({ ...c, bankAccount: e.target.value }))
                  }} />
                  <textarea className={`${inputClass} min-h-20`} placeholder="Observação (opcional)" value={saidaType === PAYOUT_KEY ? payoutForm.note : expenseForm.note} onChange={(e) => {
                    if (saidaType === PAYOUT_KEY) setPayoutForm((c) => ({ ...c, note: e.target.value }))
                    else setExpenseForm((c) => ({ ...c, note: e.target.value }))
                  }} />
                  <button type="submit" disabled={mutating} className="bg-rose-600 px-4 py-3 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50">
                    Salvar saída
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  )
}
