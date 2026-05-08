import { useMemo } from 'react'
import { AlertCircle, ArrowDownToLine, CircleDollarSign, HandCoins, TrendingUp, Wallet } from 'lucide-react'
import type { BootstrapData } from '@/types/app'
import { partners } from '@/lib/constants'
import { formatCurrency, formatDate, numericValue, stageLabel } from '@/lib/formatters'
import { EmptyState, MetricCard, Panel } from '@/components/workspace/ui'

type Props = { data: BootstrapData }

const labelClass = 'text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70'

export function FinancialPage({ data }: Props) {
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

  // Partner owed: sum of subproject amounts × project.base_partner_split_percent / 100, grouped by responsible_partner
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

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Receita ativa"
          value={formatCurrency(activeContractTotal)}
          helper="Contratos em aberto (excluindo concluídos)"
          icon={TrendingUp}
        />
        <MetricCard
          label="Total recebido"
          value={formatCurrency(totalReceived)}
          helper="Soma de todos os recebimentos registrados"
          icon={ArrowDownToLine}
        />
        <MetricCard
          label="A receber"
          value={formatCurrency(outstandingTotal)}
          helper="Saldo em aberto dos projetos ativos"
          icon={CircleDollarSign}
        />
        <MetricCard
          label="Net caixa"
          value={formatCurrency(netCash)}
          helper="Recebido − despesas − repasses"
          icon={Wallet}
        />
        <MetricCard
          label="Repasses pendentes"
          value={formatCurrency(Math.max(0, partnerPending))}
          helper="Estimativa baseada no split configurado por projeto"
          icon={HandCoins}
        />
        <MetricCard
          label="Inadimplência"
          value={formatCurrency(deliveredUnpaid)}
          helper="Projetos entregues aguardando pagamento final"
          icon={AlertCircle}
        />
      </div>

      <Panel
        title="Resumo por projeto"
        subtitle="Contrato, recebido, saldo, despesas e repasse pendente por projeto."
      >
        {data.projects.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--ink-soft)]">
                <tr>
                  <th className="pb-3 pr-4">Projeto</th>
                  <th className="pb-3 pr-4">Etapa</th>
                  <th className="pb-3 pr-4 text-right">Contrato</th>
                  <th className="pb-3 pr-4 text-right">Recebido</th>
                  <th className="pb-3 pr-4 text-right">Saldo</th>
                  <th className="pb-3 pr-4 text-right">Despesas</th>
                  <th className="pb-3 text-right">Repasse pendente</th>
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
                    <tr key={project.id}>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-[var(--ink)]">{project.name}</div>
                        <div className="text-xs text-[var(--ink-soft)]">{project.client_name ?? '—'}</div>
                      </td>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{stageLabel(project.stage)}</td>
                      <td className="py-3 pr-4 text-right">{formatCurrency(contract)}</td>
                      <td className="py-3 pr-4 text-right text-emerald-700">{formatCurrency(received)}</td>
                      <td className={`py-3 pr-4 text-right font-medium ${outstanding > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {formatCurrency(outstanding)}
                      </td>
                      <td className="py-3 pr-4 text-right text-rose-700">{formatCurrency(expenses)}</td>
                      <td className={`py-3 text-right ${payoutPending > 0.01 ? 'text-amber-700' : 'text-[var(--ink-soft)]'}`}>
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
              <div key={partner} className="rounded-[20px] border border-[var(--line)] bg-white/80 p-5 space-y-4">
                <div className="font-semibold text-[var(--ink)]">{partner}</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className={labelClass}>Gerado</div>
                    <div className="mt-1 text-sm font-semibold">{formatCurrency(owed)}</div>
                  </div>
                  <div>
                    <div className={labelClass}>Pago</div>
                    <div className="mt-1 text-sm font-semibold text-emerald-700">{formatCurrency(paid)}</div>
                  </div>
                  <div>
                    <div className={labelClass}>Pendente</div>
                    <div className={`mt-1 text-sm font-semibold ${balance > 0.01 ? 'text-amber-700' : 'text-[var(--ink-soft)]'}`}>
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
              <thead className="text-[var(--ink-soft)]">
                <tr>
                  <th className="pb-3 pr-4">Data</th>
                  <th className="pb-3 pr-4">Sócio</th>
                  <th className="pb-3 pr-4">Projeto</th>
                  <th className="pb-3 pr-4">Disciplina</th>
                  <th className="pb-3 pr-4 text-right">%</th>
                  <th className="pb-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {data.payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td className="py-3 pr-4 text-[var(--ink-soft)]">{formatDate(payout.paid_at)}</td>
                    <td className="py-3 pr-4 font-medium text-[var(--ink)]">{payout.partner_name}</td>
                    <td className="py-3 pr-4 text-[var(--ink-soft)]">{payout.project_name}</td>
                    <td className="py-3 pr-4 text-[var(--ink-soft)]">
                      {payout.discipline ? stageLabel(payout.discipline) : '—'}
                    </td>
                    <td className="py-3 pr-4 text-right text-[var(--ink-soft)]">
                      {payout.percentage != null ? `${payout.percentage}%` : '—'}
                    </td>
                    <td className="py-3 text-right font-semibold text-rose-700">
                      {formatCurrency(numericValue(payout.amount))}
                    </td>
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
