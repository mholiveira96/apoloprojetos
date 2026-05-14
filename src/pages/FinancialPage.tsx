import { useMemo, useState } from 'react'
import { AlertCircle, Archive, ArchiveRestore, ArrowDownToLine, CircleDollarSign, HandCoins, TrendingUp, Wallet, X } from 'lucide-react'
import type { BootstrapData, Expense, Payout, Project, Receipt } from '@/types/app'
import { partners } from '@/lib/constants'
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
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="font-semibold text-[var(--ink)]">{project.name}</div>
              {project.archived ? (
                <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                  Arquivado
                </span>
              ) : null}
            </div>
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
                  {receipts.map((receipt) => (
                    <tr key={receipt.id}>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{formatDate(receipt.received_at)}</td>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{receipt.bank_account || '—'}</td>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{receipt.note || '—'}</td>
                      <td className="py-3 text-right font-semibold text-emerald-600">{formatCurrency(numericValue(receipt.amount))}</td>
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
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{formatDate(expense.paid_at)}</td>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{expense.category || '—'}</td>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{expense.note || '—'}</td>
                      <td className="py-3 text-right font-semibold text-rose-600">{formatCurrency(numericValue(expense.amount))}</td>
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
                  {payouts.map((payout) => (
                    <tr key={payout.id}>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{formatDate(payout.paid_at)}</td>
                      <td className="py-3 pr-4 font-medium text-[var(--ink)]">{payout.partner_name}</td>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{payout.discipline ? stageLabel(payout.discipline) : '—'}</td>
                      <td className="py-3 pr-4 text-right text-[var(--ink-soft)]">{payout.percentage != null ? `${payout.percentage}%` : '—'}</td>
                      <td className="py-3 text-right font-semibold text-rose-600">{formatCurrency(numericValue(payout.amount))}</td>
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

export function FinancialPage({ data, submitMutation, mutating }: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const trackedProjects = useMemo(
    () => data.projects.filter((project) => !project.archived),
    [data.projects],
  )
  const archivedProjects = useMemo(
    () => data.projects.filter((project) => project.archived),
    [data.projects],
  )
  const visibleProjects = showArchived ? data.projects : trackedProjects
  const trackedProjectIds = useMemo(
    () => new Set(trackedProjects.map((project) => project.id)),
    [trackedProjects],
  )
  const visibleProjectIds = useMemo(
    () => new Set(visibleProjects.map((project) => project.id)),
    [visibleProjects],
  )

  const activeProjects = trackedProjects.filter((project) => project.stage !== 'concluído')
  const activeContractTotal = activeProjects.reduce((sum, project) => sum + numericValue(project.contract_amount), 0)
  const totalReceived = trackedProjects.reduce((sum, project) => sum + numericValue(project.total_received), 0)
  const totalExpenses = trackedProjects.reduce((sum, project) => sum + numericValue(project.total_expenses), 0)
  const totalPayouts = trackedProjects.reduce((sum, project) => sum + numericValue(project.total_payouts), 0)

  const outstandingTotal = activeProjects.reduce(
    (sum, project) => sum + Math.max(0, numericValue(project.contract_amount) - numericValue(project.total_received)),
    0,
  )

  const deliveredUnpaid = trackedProjects
    .filter((project) => project.stage === 'concluído-aguardando-pagamento')
    .reduce((sum, project) => sum + Math.max(0, numericValue(project.contract_amount) - numericValue(project.total_received)), 0)

  const netCash = totalReceived - totalExpenses - totalPayouts

  const partnerOwed = useMemo(() => {
    const owed: Record<string, number> = {}
    const projectMap = new Map(trackedProjects.map((project) => [project.id, project]))
    for (const subproject of data.subprojects) {
      const project = projectMap.get(subproject.project_id)
      if (!project) continue
      const split = numericValue(project.base_partner_split_percent) / 100
      owed[subproject.responsible_partner] = (owed[subproject.responsible_partner] ?? 0) + numericValue(subproject.amount) * split
    }
    return owed
  }, [data.subprojects, trackedProjects])

  const partnerPaid = useMemo(() => {
    const paid: Record<string, number> = {}
    for (const payout of data.payouts) {
      if (!trackedProjectIds.has(payout.project_id)) continue
      paid[payout.partner_name] = (paid[payout.partner_name] ?? 0) + numericValue(payout.amount)
    }
    return paid
  }, [data.payouts, trackedProjectIds])

  const totalPartnerOwed = Object.values(partnerOwed).reduce((sum, value) => sum + value, 0)
  const totalPartnerPaid = Object.values(partnerPaid).reduce((sum, value) => sum + value, 0)
  const partnerPending = totalPartnerOwed - totalPartnerPaid

  const selectedProject = selectedProjectId ? data.projects.find((project) => project.id === selectedProjectId) ?? null : null
  const selectedReceipts = selectedProjectId ? data.receipts.filter((receipt) => receipt.project_id === selectedProjectId) : []
  const selectedExpenses = selectedProjectId ? data.expenses.filter((expense) => expense.project_id === selectedProjectId) : []
  const selectedPayouts = selectedProjectId ? data.payouts.filter((payout) => payout.project_id === selectedProjectId) : []

  const toggleArchive = (project: Project) => {
    void submitMutation(
      'setProjectArchived',
      { id: project.id, archived: !project.archived },
      () => {
        if (selectedProjectId === project.id && !showArchived) setSelectedProjectId(null)
      },
      project.archived ? 'Projeto reativado no financeiro' : 'Projeto arquivado no financeiro',
    )
  }

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
        <MetricCard label="Receita ativa" value={formatCurrency(activeContractTotal)} helper="Contratos em aberto sem os arquivados" icon={TrendingUp} />
        <MetricCard label="Total recebido" value={formatCurrency(totalReceived)} helper="Soma dos recebimentos dos projetos acompanhados" icon={ArrowDownToLine} />
        <MetricCard label="A receber" value={formatCurrency(outstandingTotal)} helper="Saldo em aberto dos projetos ativos acompanhados" icon={CircleDollarSign} />
        <MetricCard label="Net caixa" value={formatCurrency(netCash)} helper="Recebido - despesas - repasses dos projetos acompanhados" icon={Wallet} />
        <MetricCard label="Repasses pendentes" value={formatCurrency(Math.max(0, partnerPending))} helper="Estimativa baseada no split dos projetos acompanhados" icon={HandCoins} />
        <MetricCard label="Inadimplência" value={formatCurrency(deliveredUnpaid)} helper="Projetos entregues acompanhados aguardando pagamento final" icon={AlertCircle} />
      </div>

      <Panel
        title="Resumo por projeto"
        subtitle="Clique em um projeto para ver o histórico detalhado."
        actions={(
          <label className="inline-flex items-center gap-2 text-sm text-[var(--ink-soft)]">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
              className="h-4 w-4 border border-[var(--line)]"
            />
            Mostrar arquivados ({archivedProjects.length})
          </label>
        )}
      >
        {visibleProjects.length ? (
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
                  <th className="pb-3 pr-4 text-right font-medium">Repasses feitos</th>
                  <th className="pb-3 pr-4 text-right font-medium">Repasse pendente</th>
                  <th className="pb-3 text-right font-medium">Arquivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {visibleProjects.map((project) => {
                  const contract = numericValue(project.contract_amount)
                  const received = numericValue(project.total_received)
                  const expenses = numericValue(project.total_expenses)
                  const payouts = numericValue(project.total_payouts)
                  const outstanding = Math.max(0, contract - received)
                  const projectSubprojects = data.subprojects.filter((subproject) => subproject.project_id === project.id)
                  const split = numericValue(project.base_partner_split_percent) / 100
                  const partnerPool = projectSubprojects.reduce((sum, subproject) => sum + numericValue(subproject.amount) * split, 0)
                  const payoutPending = Math.max(0, partnerPool - payouts)

                  return (
                    <tr
                      key={project.id}
                      className={`cursor-pointer transition hover:bg-[var(--paper)] ${project.archived ? 'opacity-70' : ''}`}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-[var(--ink)]">{project.name}</div>
                          {project.archived ? (
                            <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                              Arquivado
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-[var(--ink-soft)]">{project.client_name ?? '—'}</div>
                      </td>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{stageLabel(project.stage)}</td>
                      <td className="py-3 pr-4 text-right text-[var(--ink)]">{formatCurrency(contract)}</td>
                      <td className="py-3 pr-4 text-right text-emerald-600">{formatCurrency(received)}</td>
                      <td className={`py-3 pr-4 text-right font-medium ${outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {formatCurrency(outstanding)}
                      </td>
                      <td className="py-3 pr-4 text-right text-rose-600">{formatCurrency(expenses)}</td>
                      <td className="py-3 pr-4 text-right text-[var(--ink)]">{formatCurrency(payouts)}</td>
                      <td className={`py-3 pr-4 text-right ${payoutPending > 0.01 ? 'text-amber-600' : 'text-[var(--ink-soft)]'}`}>
                        {formatCurrency(payoutPending)}
                      </td>
                      <td className="py-3 text-right" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          disabled={mutating}
                          onClick={() => toggleArchive(project)}
                          className="inline-flex items-center gap-1.5 border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)] transition hover:bg-[var(--paper)] disabled:opacity-60"
                        >
                          {project.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                          {project.archived ? 'Reativar' : 'Arquivar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Sem projetos visíveis"
            body={archivedProjects.length ? 'Todos os projetos desta visão estão arquivados. Ative "Mostrar arquivados" para consultá-los.' : 'Crie projetos para ver o resumo financeiro aqui.'}
          />
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
        {data.payouts.filter((payout) => visibleProjectIds.has(payout.project_id)).length ? (
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
                {data.payouts
                  .filter((payout) => visibleProjectIds.has(payout.project_id))
                  .map((payout) => (
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
