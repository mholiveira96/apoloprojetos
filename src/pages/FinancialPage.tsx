import { useState, useMemo } from 'react'
import { AlertCircle, ArrowDownToLine, CircleDollarSign, HandCoins, TrendingUp, Wallet, X } from 'lucide-react'
import type { BootstrapData, Project, Receipt, Expense, Payout } from '@/types/app'
import { partners } from '@/lib/constants'
import { formatCurrency, formatDate, numericValue, stageLabel } from '@/lib/formatters'
import { EmptyState, MetricCard, Panel } from '@/components/workspace/ui'

type Props = { data: BootstrapData }

const labelClass = 'text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70'

function ProjectHistoryModal({
  project,
  receipts,
  expenses,
  payouts,
  onClose,
}: {
  project: Project | null
  receipts: Receipt[]
  expenses: Expense[]
  payouts: Payout[]
  onClose: () => void
}) {
  if (!project) return null

  const contract = numericValue(project.contract_amount)
  const received = numericValue(project.total_received)
  const expensesTotal = numericValue(project.total_expenses)
  const outstanding = Math.max(0, contract - received)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto [] border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_24px_80px_rgba(12,26,26,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="font-semibold text-[var(--ink)]">{project.name}</div>
            {project.client_name ? (
              <div className="mt-0.5 text-sm text-[var(--ink-soft)]">{project.client_name}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--ink-soft)] transition hover:bg-[var(--paper)] hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* stat cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="[] border border-[var(--line)] bg-[var(--bg-card-80)] px-4 py-3">
            <div className={labelClass}>Contrato</div>
            <div className="mt-1 text-base font-semibold text-[var(--ink)]">{formatCurrency(contract)}</div>
          </div>
          <div className="[] border border-[var(--line)] bg-[var(--bg-card-80)] px-4 py-3">
            <div className={labelClass}>Recebido</div>
            <div className="mt-1 text-base font-semibold text-emerald-600">{formatCurrency(received)}</div>
          </div>
          <div className="[] border border-[var(--line)] bg-[var(--bg-card-80)] px-4 py-3">
            <div className={labelClass}>A receber</div>
            <div className={`mt-1 text-base font-semibold ${outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {formatCurrency(outstanding)}
            </div>
          </div>
          <div className="[] border border-[var(--line)] bg-[var(--bg-card-80)] px-4 py-3">
            <div className={labelClass}>Despesas</div>
            <div className="mt-1 text-base font-semibold text-rose-600">{formatCurrency(expensesTotal)}</div>
          </div>
        </div>

        {/* recebimentos */}
        <div>
          <div className="mb-3 text-sm font-semibold text-[var(--ink)]">
            Recebimentos <span className="font-normal text-[var(--ink-soft)]">({receipts.length})</span>
          </div>
          {receipts.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-[var(--ink-soft)]">
                    <th className="pb-3 pr-4 font-medium">Data</th>
                    <th className="pb-3 pr-4 font-medium">Conta</th>
                    <th className="pb-3 pr-4 font-medium">Nota</th>
                    <th className="pb-3 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {receipts.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{formatDate(r.received_at)}</td>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{r.bank_account || '—'}</td>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{r.note || '—'}</td>
                      <td className="py-3 text-right font-semibold text-emerald-600">{formatCurrency(numericValue(r.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-soft)]">Nenhum recebimento registrado.</p>
          )}
        </div>

        <div className="my-5 border-t border-[var(--line)]" />

        {/* despesas */}
        <div>
          <div className="mb-3 text-sm font-semibold text-[var(--ink)]">
            Despesas <span className="font-normal text-[var(--ink-soft)]">({expenses.length})</span>
          </div>
          {expenses.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-[var(--ink-soft)]">
                    <th className="pb-3 pr-4 font-medium">Data</th>
                    <th className="pb-3 pr-4 font-medium">Categoria</th>
                    <th className="pb-3 pr-4 font-medium">Nota</th>
                    <th className="pb-3 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{formatDate(e.paid_at)}</td>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{e.category || '—'}</td>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{e.note || '—'}</td>
                      <td className="py-3 text-right font-semibold text-rose-600">{formatCurrency(numericValue(e.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-soft)]">Nenhuma despesa registrada.</p>
          )}
        </div>

        <div className="my-5 border-t border-[var(--line)]" />

        {/* repasses */}
        <div>
          <div className="mb-3 text-sm font-semibold text-[var(--ink)]">
            Repasses <span className="font-normal text-[var(--ink-soft)]">({payouts.length})</span>
          </div>
          {payouts.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-[var(--ink-soft)]">
                    <th className="pb-3 pr-4 font-medium">Data</th>
                    <th className="pb-3 pr-4 font-medium">Sócio</th>
                    <th className="pb-3 pr-4 font-medium">Disciplina</th>
                    <th className="pb-3 pr-4 text-right font-medium">%</th>
                    <th className="pb-3 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {payouts.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{formatDate(p.paid_at)}</td>
                      <td className="py-3 pr-4 font-medium text-[var(--ink)]">{p.partner_name}</td>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{p.discipline ? stageLabel(p.discipline) : '—'}</td>
                      <td className="py-3 pr-4 text-right text-[var(--ink-soft)]">{p.percentage != null ? `${p.percentage}%` : '—'}</td>
                      <td className="py-3 text-right font-semibold text-rose-600">{formatCurrency(numericValue(p.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-soft)]">Nenhum repasse registrado.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function FinancialPage({ data }: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const activeProjects = data.projects.filter((p) => p.stage !== 'concluído')
  const activeContractTotal = activeProjects.reduce((s, p) => s + numericValue(p.contract_amount), 0)
  const totalReceived = data.projects.reduce((s, p) => s + numericValue(p.total_received), 0)
  const totalExpenses = data.projects.reduce((s, p) => s + numericValue(p.total_expenses), 0)
  const totalPayouts = data.projects.reduce((s, p) => s + numericValue(p.total_payouts), 0)

  const outstandingTotal = activeProjects.reduce(
    (s, p) => s + Math.max(0, numericValue(p.contract_amount) - numericValue(p.total_received)),
    0,
  )

  const deliveredUnpaid = data.projects
    .filter((p) => p.stage === 'concluído-aguardando-pagamento')
    .reduce((s, p) => s + Math.max(0, numericValue(p.contract_amount) - numericValue(p.total_received)), 0)

  const netCash = totalReceived - totalExpenses - totalPayouts

  const partnerOwed = useMemo(() => {
    const owed: Record<string, number> = {}
    const projectMap = new Map(data.projects.map((p) => [p.id, p]))
    for (const sp of data.subprojects) {
      const project = projectMap.get(sp.project_id)
      if (!project) continue
      const split = numericValue(project.base_partner_split_percent) / 100
      owed[sp.responsible_partner] = (owed[sp.responsible_partner] ?? 0) + numericValue(sp.amount) * split
    }
    return owed
  }, [data.subprojects, data.projects])

  const partnerPaid = useMemo(() => {
    const paid: Record<string, number> = {}
    for (const payout of data.payouts) {
      paid[payout.partner_name] = (paid[payout.partner_name] ?? 0) + numericValue(payout.amount)
    }
    return paid
  }, [data.payouts])

  const totalPartnerOwed = Object.values(partnerOwed).reduce((s, v) => s + v, 0)
  const totalPartnerPaid = Object.values(partnerPaid).reduce((s, v) => s + v, 0)
  const partnerPending = totalPartnerOwed - totalPartnerPaid

  const selectedProject = selectedProjectId ? data.projects.find((p) => p.id === selectedProjectId) ?? null : null
  const selectedReceipts = selectedProjectId ? data.receipts.filter((r) => r.project_id === selectedProjectId) : []
  const selectedExpenses = selectedProjectId ? data.expenses.filter((e) => e.project_id === selectedProjectId) : []
  const selectedPayouts = selectedProjectId ? data.payouts.filter((p) => p.project_id === selectedProjectId) : []

  return (
    <>
      <ProjectHistoryModal
        project={selectedProject}
        receipts={selectedReceipts}
        expenses={selectedExpenses}
        payouts={selectedPayouts}
        onClose={() => setSelectedProjectId(null)}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Receita ativa" value={formatCurrency(activeContractTotal)} helper="Contratos em aberto (excluindo concluídos)" icon={TrendingUp} />
        <MetricCard label="Total recebido" value={formatCurrency(totalReceived)} helper="Soma de todos os recebimentos registrados" icon={ArrowDownToLine} />
        <MetricCard label="A receber" value={formatCurrency(outstandingTotal)} helper="Saldo em aberto dos projetos ativos" icon={CircleDollarSign} />
        <MetricCard label="Net caixa" value={formatCurrency(netCash)} helper="Recebido − despesas − repasses" icon={Wallet} />
        <MetricCard label="Repasses pendentes" value={formatCurrency(Math.max(0, partnerPending))} helper="Estimativa baseada no split configurado por projeto" icon={HandCoins} />
        <MetricCard label="Inadimplência" value={formatCurrency(deliveredUnpaid)} helper="Projetos entregues aguardando pagamento final" icon={AlertCircle} />
      </div>

      <Panel title="Resumo por projeto" subtitle="Clique em um projeto para ver o histórico detalhado.">
        {data.projects.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-[var(--ink-soft)]">
                  <th className="pb-3 pr-4 font-medium">Projeto</th>
                  <th className="pb-3 pr-4 font-medium">Etapa</th>
                  <th className="pb-3 pr-4 text-right font-medium">Contrato</th>
                  <th className="pb-3 pr-4 text-right font-medium">Recebido</th>
                  <th className="pb-3 pr-4 text-right font-medium">Saldo</th>
                  <th className="pb-3 pr-4 text-right font-medium">Despesas</th>
                  <th className="pb-3 text-right font-medium">Repasse pendente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {data.projects.map((project) => {
                  const contract = numericValue(project.contract_amount)
                  const received = numericValue(project.total_received)
                  const expenses = numericValue(project.total_expenses)
                  const payouts = numericValue(project.total_payouts)
                  const outstanding = Math.max(0, contract - received)
                  const projectSps = data.subprojects.filter((sp) => sp.project_id === project.id)
                  const split = numericValue(project.base_partner_split_percent) / 100
                  const partnerPool = projectSps.reduce((s, sp) => s + numericValue(sp.amount) * split, 0)
                  const payoutPending = Math.max(0, partnerPool - payouts)
                  return (
                    <tr
                      key={project.id}
                      className="cursor-pointer transition hover:bg-[var(--paper)]"
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <td className="py-3 pr-4">
                        <div className="font-medium text-[var(--ink)]">{project.name}</div>
                        <div className="text-xs text-[var(--ink-soft)]">{project.client_name ?? '—'}</div>
                      </td>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{stageLabel(project.stage)}</td>
                      <td className="py-3 pr-4 text-right text-[var(--ink)]">{formatCurrency(contract)}</td>
                      <td className="py-3 pr-4 text-right text-emerald-600">{formatCurrency(received)}</td>
                      <td className={`py-3 pr-4 text-right font-medium ${outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {formatCurrency(outstanding)}
                      </td>
                      <td className="py-3 pr-4 text-right text-rose-600">{formatCurrency(expenses)}</td>
                      <td className={`py-3 text-right ${payoutPending > 0.01 ? 'text-amber-600' : 'text-[var(--ink-soft)]'}`}>
                        {formatCurrency(payoutPending)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sem projetos" body="Crie projetos para ver o resumo financeiro aqui." />
        )}
      </Panel>

      <Panel title="Repasses por sócio" subtitle="Estimativa do que foi gerado vs o que foi pago por sócio.">
        <div className="grid gap-4 sm:grid-cols-3">
          {partners.map((partner) => {
            const owed = partnerOwed[partner] ?? 0
            const paid = partnerPaid[partner] ?? 0
            const balance = Math.max(0, owed - paid)
            return (
              <div key={partner} className="[] border border-[var(--line)] bg-[var(--bg-card-80)] p-5 space-y-4">
                <div className="font-semibold text-[var(--ink)]">{partner}</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className={labelClass}>Gerado</div>
                    <div className="mt-1 text-sm font-semibold text-[var(--ink)]">{formatCurrency(owed)}</div>
                  </div>
                  <div>
                    <div className={labelClass}>Pago</div>
                    <div className="mt-1 text-sm font-semibold text-emerald-600">{formatCurrency(paid)}</div>
                  </div>
                  <div>
                    <div className={labelClass}>Pendente</div>
                    <div className={`mt-1 text-sm font-semibold ${balance > 0.01 ? 'text-amber-600' : 'text-[var(--ink-soft)]'}`}>
                      {formatCurrency(balance)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Panel>

      <Panel title="Repasses registrados" subtitle="Histórico completo de repasses aos sócios.">
        {data.payouts.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-[var(--ink-soft)]">
                  <th className="pb-3 pr-4 font-medium">Data</th>
                  <th className="pb-3 pr-4 font-medium">Sócio</th>
                  <th className="pb-3 pr-4 font-medium">Projeto</th>
                  <th className="pb-3 pr-4 font-medium">Disciplina</th>
                  <th className="pb-3 pr-4 text-right font-medium">%</th>
                  <th className="pb-3 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {data.payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td className="py-3 pr-4 text-[var(--ink-soft)]">{formatDate(payout.paid_at)}</td>
                    <td className="py-3 pr-4 font-medium text-[var(--ink)]">{payout.partner_name}</td>
                    <td className="py-3 pr-4 text-[var(--ink-soft)]">{payout.project_name}</td>
                    <td className="py-3 pr-4 text-[var(--ink-soft)]">{payout.discipline ? stageLabel(payout.discipline) : '—'}</td>
                    <td className="py-3 pr-4 text-right text-[var(--ink-soft)]">{payout.percentage != null ? `${payout.percentage}%` : '—'}</td>
                    <td className="py-3 text-right font-semibold text-rose-600">{formatCurrency(numericValue(payout.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sem repasses registrados" body="Registre repasses na página de Fluxo de Caixa." />
        )}
      </Panel>
    </>
  )
}
