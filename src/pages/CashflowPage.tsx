import { useMemo, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, HandCoins, Landmark, Plus, X } from 'lucide-react'
import type { BootstrapData } from '@/types/app'
import { expenseCategories, partners } from '@/lib/constants'
import { formatCurrency, formatDate, numericValue, stageLabel } from '@/lib/formatters'
import { EmptyState, MetricCard, Panel } from '@/components/workspace/ui'

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

const inputClass = 'rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm w-full'
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

  const [showEntrada, setShowEntrada] = useState(false)
  const [showSaida, setShowSaida] = useState(false)

  const [receiptForm, setReceiptForm] = useState({ projectId: '', amount: '', bankAccount: '', entryDate: today(), note: '' })
  const [expenseForm, setExpenseForm] = useState({ category: '', projectId: '', amount: '', vendor: '', bankAccount: '', entryDate: today(), note: '' })
  const [payoutForm, setPayoutForm] = useState({ subprojectId: '', partnerName: partners[0], percentage: '', bankAccount: '', entryDate: today(), note: '' })
  const [saidaType, setSaidaType] = useState<string>('')

  const filtered = useMemo(
    () => data.cashflow.filter((e) => e.entry_date >= startDate && e.entry_date <= endDate),
    [data.cashflow, startDate, endDate],
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
            <input type="date" className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span className="text-xs text-[var(--ink-soft)]">→</span>
            <input type="date" className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <button
              onClick={() => setShowEntrada(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" /> Entrada
            </button>
            <button
              onClick={() => setShowSaida(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700"
            >
              <Plus className="h-3.5 w-3.5" /> Saída
            </button>
          </div>
        }
      >
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--ink-soft)]">
                <tr>
                  <th className="pb-3 pr-4">Data</th>
                  <th className="pb-3 pr-4">Projeto / Origem</th>
                  <th className="pb-3 pr-4">Tipo</th>
                  <th className="pb-3 pr-4">Contraparte</th>
                  <th className="pb-3 pr-4">Conta</th>
                  <th className="pb-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {filtered.map((entry) => (
                  <tr key={`${entry.entry_type}-${entry.id}`}>
                    <td className="py-3 pr-4 text-[var(--ink-soft)]">{formatDate(entry.entry_date)}</td>
                    <td className="py-3 pr-4 font-medium text-[var(--ink)]">{entry.project_name ?? '—'}</td>
                    <td className="py-3 pr-4 text-[var(--ink-soft)]">{stageLabel(entry.entry_type)}</td>
                    <td className="py-3 pr-4 text-[var(--ink-soft)]">{entry.counterpart ?? '—'}</td>
                    <td className="py-3 pr-4 text-[var(--ink-soft)]">{entry.bank_account ?? '—'}</td>
                    <td className={`py-3 text-right font-semibold ${entry.signed_amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {entry.signed_amount >= 0 ? '+' : '−'}{formatCurrency(Math.abs(numericValue(entry.signed_amount)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sem movimentação no período" body="Ajuste o intervalo de datas ou registre entradas e saídas." />
        )}
      </Panel>

      {/* Entrada modal */}
      {showEntrada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[28px] border border-[var(--line)] bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ink)]">Registrar entrada</h3>
              <button onClick={() => { setShowEntrada(false); resetEntrada() }} className="rounded-full p-1 hover:bg-[var(--paper)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="grid gap-4" onSubmit={handleEntradaSubmit}>
              <select required className={inputClass} value={receiptForm.projectId} onChange={(e) => setReceiptForm((c) => ({ ...c, projectId: e.target.value }))}>
                <option value="">Selecione o projeto</option>
                {data.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.client_name ? ` · ${p.client_name}` : ''}</option>
                ))}
              </select>
              <input required type="number" min="0.01" step="0.01" className={inputClass} placeholder="Valor (R$)" value={receiptForm.amount} onChange={(e) => setReceiptForm((c) => ({ ...c, amount: e.target.value }))} />
              <input type="date" required className={inputClass} value={receiptForm.entryDate} onChange={(e) => setReceiptForm((c) => ({ ...c, entryDate: e.target.value }))} />
              <input className={inputClass} placeholder="Conta bancária (opcional)" value={receiptForm.bankAccount} onChange={(e) => setReceiptForm((c) => ({ ...c, bankAccount: e.target.value }))} />
              <textarea className={`${inputClass} min-h-20`} placeholder="Observação (opcional)" value={receiptForm.note} onChange={(e) => setReceiptForm((c) => ({ ...c, note: e.target.value }))} />
              <button type="submit" disabled={mutating} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                Salvar entrada
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Saída modal */}
      {showSaida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[28px] border border-[var(--line)] bg-white p-6 shadow-xl">
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
                    {data.projects.map((p) => (
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
                    <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink-soft)]">
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
                    {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                  <button type="submit" disabled={mutating} className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50">
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
