import { type ReactNode, useMemo, useState, useEffect } from 'react'
import { AlertCircle, Archive, ArchiveRestore, ArrowDownToLine, ChevronDown, ChevronUp, CircleDollarSign, HandCoins, Pencil, TrendingUp, Wallet, X } from 'lucide-react'
import type { BootstrapData, Expense, Payout, Project, Receipt, Subproject } from '@/types/app'
import { partners } from '@/lib/constants'
import { formatArea, formatCurrency, formatDate, numericValue, stageLabel, stageTone } from '@/lib/formatters'
import { EmptyState, MetricCard } from '@/components/workspace/ui'
import { ProjectEditModal } from '@/components/workspace/project-edit-modal'

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
  onRefresh: () => Promise<void>
}

const labelClass = 'text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70'
type ProjectSortKey = 'project' | 'stage' | 'contract' | 'received' | 'outstanding' | 'expenses' | 'payouts' | 'pending'

function isFixedCostExpense(expense: Expense) {
  return !expense.project_id
}

function CollapsiblePanel({
  title,
  subtitle,
  actions,
  children,
  defaultCollapsed = false,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  defaultCollapsed?: boolean
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <section className="workspace-appear workspace-appear-delayed workspace-surface rounded-[28px] border border-[var(--line)] bg-[var(--bg-card-80)] p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-[var(--ink-soft)] transition hover:bg-[var(--paper)] hover:text-[var(--ink)]"
            aria-label={collapsed ? `Expandir ${title}` : `Recolher ${title}`}
            title={collapsed ? 'Expandir seção' : 'Recolher seção'}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-[var(--ink)]">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-[var(--ink-soft)]">{subtitle}</p> : null}
          </div>
        </div>
        {actions}
      </div>
      {!collapsed ? children : null}
    </section>
  )
}

function ProjectHistoryModal({
  project,
  subprojects,
  receipts,
  expenses,
  payouts,
  onClose,
}: {
  project: Project | null
  subprojects: Subproject[]
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
  const subprojectsTotal = subprojects.reduce((sum, subproject) => sum + numericValue(subproject.amount), 0)
  const subprojectAreaTotal = subprojects.reduce((sum, subproject) => sum + numericValue(subproject.area), 0)
  const lastSubprojectUpdate = subprojects.length
    ? subprojects.reduce((latest, subproject) => (latest > subproject.updated_at ? latest : subproject.updated_at), subprojects[0].updated_at)
    : null

  return (
    <div
      className="workspace-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="workspace-modal-panel max-h-[90vh] w-full max-w-3xl overflow-y-auto [] border border-[var(--line)] bg-[var(--paper)] p-6"
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
          <div className="workspace-surface rounded-2xl [] border border-[var(--line)] bg-[var(--bg-card-80)] px-4 py-3">
            <div className={labelClass}>Contrato</div>
            <div className="mt-1 text-base font-semibold text-[var(--ink)]">{formatCurrency(contract)}</div>
          </div>
          <div className="workspace-surface rounded-2xl [] border border-[var(--line)] bg-[var(--bg-card-80)] px-4 py-3">
            <div className={labelClass}>Recebido</div>
            <div className="mt-1 text-base font-semibold text-emerald-600">{formatCurrency(received)}</div>
          </div>
          <div className="workspace-surface rounded-2xl [] border border-[var(--line)] bg-[var(--bg-card-80)] px-4 py-3">
            <div className={labelClass}>A receber</div>
            <div className={`mt-1 text-base font-semibold ${outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {formatCurrency(outstanding)}
            </div>
          </div>
          <div className="workspace-surface rounded-2xl [] border border-[var(--line)] bg-[var(--bg-card-80)] px-4 py-3">
            <div className={labelClass}>Despesas</div>
            <div className="mt-1 text-base font-semibold text-rose-600">{formatCurrency(expensesTotal)}</div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="workspace-surface rounded-2xl border border-[var(--line)] bg-[var(--bg-card-80)] p-5">
            <div className="mb-3 text-sm font-semibold text-[var(--ink)]">Resumo do projeto</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className={labelClass}>Etapa</div>
                <div className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${stageTone(project.stage)}`}>
                  {stageLabel(project.stage)}
                </div>
              </div>
              <div>
                <div className={labelClass}>Código</div>
                <div className="mt-1 text-sm font-medium text-[var(--ink)]">{project.code || '—'}</div>
              </div>
              <div>
                <div className={labelClass}>Disciplina principal</div>
                <div className="mt-1 text-sm font-medium text-[var(--ink)]">{project.discipline ? stageLabel(project.discipline) : '—'}</div>
              </div>
              <div>
                <div className={labelClass}>Área do projeto</div>
                <div className="mt-1 text-sm font-medium text-[var(--ink)]">{project.area ? formatArea(project.area) : '—'}</div>
              </div>
              <div>
                <div className={labelClass}>Responsável comercial</div>
                <div className="mt-1 text-sm font-medium text-[var(--ink)]">{project.sales_owner || '—'}</div>
              </div>
              <div>
                <div className={labelClass}>Criado em</div>
                <div className="mt-1 text-sm font-medium text-[var(--ink)]">{formatDate(project.created_at)}</div>
              </div>
            </div>
            {project.status_note || project.notes ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className={labelClass}>Status</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-[var(--ink)]">{project.status_note || '—'}</div>
                </div>
                <div>
                  <div className={labelClass}>Observações</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-[var(--ink)]">{project.notes || '—'}</div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="workspace-surface rounded-2xl border border-[var(--line)] bg-[var(--bg-card-80)] p-5">
            <div className="mb-3 text-sm font-semibold text-[var(--ink)]">Subprojetos</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <div className={labelClass}>Qtd.</div>
                <div className="mt-1 text-sm font-semibold text-[var(--ink)]">{subprojects.length}</div>
              </div>
              <div>
                <div className={labelClass}>Valor total</div>
                <div className="mt-1 text-sm font-semibold text-[var(--ink)]">{formatCurrency(subprojectsTotal)}</div>
              </div>
              <div>
                <div className={labelClass}>Área total</div>
                <div className="mt-1 text-sm font-semibold text-[var(--ink)]">{subprojectAreaTotal > 0 ? formatArea(subprojectAreaTotal) : '—'}</div>
              </div>
              <div>
                <div className={labelClass}>Atualizado em</div>
                <div className="mt-1 text-sm font-semibold text-[var(--ink)]">{lastSubprojectUpdate ? formatDate(lastSubprojectUpdate) : '—'}</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 text-sm font-semibold text-[var(--ink)]">
            Disciplinas / subprojetos <span className="font-normal text-[var(--ink-soft)]">({subprojects.length})</span>
          </div>
          {subprojects.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-[var(--ink-soft)]">
                    <th className="pb-3 pr-4 font-medium">Disciplina</th>
                    <th className="pb-3 pr-4 font-medium">Etapa</th>
                    <th className="pb-3 pr-4 font-medium">Sócio</th>
                    <th className="pb-3 pr-4 font-medium">Prazo</th>
                    <th className="pb-3 pr-4 text-right font-medium">Área</th>
                    <th className="pb-3 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {subprojects.map((subproject) => (
                    <tr key={subproject.id}>
                      <td className="py-3 pr-4 font-medium text-[var(--ink)]">{stageLabel(subproject.discipline)}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${stageTone(subproject.stage)}`}>
                          {stageLabel(subproject.stage)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{subproject.responsible_partner || '—'}</td>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{formatDate(subproject.deadline)}</td>
                      <td className="py-3 pr-4 text-right text-[var(--ink-soft)]">{subproject.area ? formatArea(subproject.area) : '—'}</td>
                      <td className="py-3 text-right font-semibold text-[var(--ink)]">{formatCurrency(numericValue(subproject.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-soft)]">Nenhum subprojeto registrado.</p>
          )}
        </div>

        <div className="my-5 border-t border-[var(--line)]" />

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

export function FinancialPage({ data, submitMutation, mutating, onRefresh }: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [projectSort, setProjectSort] = useState<{ direction: 'asc' | 'desc'; key: ProjectSortKey }>({
    direction: 'asc',
    key: 'project',
  })

  useEffect(() => {
    if (selectedProjectId) void onRefresh()
  }, [onRefresh, selectedProjectId])

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
  const subprojectsByProjectId = useMemo(() => {
    const map = new Map<string, Subproject[]>()
    for (const subproject of data.subprojects) {
      const current = map.get(subproject.project_id) ?? []
      current.push(subproject)
      map.set(subproject.project_id, current)
    }
    return map
  }, [data.subprojects])

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
  const fixedCostMonthlyRows = useMemo(() => {
    const now = new Date()
    const monthStarts = Array.from({ length: 6 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - (5 - index), 1))
    const totals = new Map(monthStarts.map((date) => [date.toISOString().slice(0, 7), 0]))

    for (const expense of data.expenses) {
      if (!isFixedCostExpense(expense)) continue
      const paidAt = new Date(expense.paid_at)
      if (Number.isNaN(paidAt.getTime())) continue
      const key = `${paidAt.getFullYear()}-${String(paidAt.getMonth() + 1).padStart(2, '0')}`
      if (!totals.has(key)) continue
      totals.set(key, (totals.get(key) ?? 0) + numericValue(expense.amount))
    }

    return monthStarts.map((date) => {
      const key = date.toISOString().slice(0, 7)
      return {
        key,
        label: new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(date),
        total: totals.get(key) ?? 0,
      }
    })
  }, [data.expenses])
  const fixedCostTotal6Months = fixedCostMonthlyRows.reduce((sum, month) => sum + month.total, 0)

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
  const editingProject = editingProjectId ? data.projects.find((project) => project.id === editingProjectId) ?? null : null
  const selectedSubprojects = selectedProjectId ? subprojectsByProjectId.get(selectedProjectId) ?? [] : []
  const selectedReceipts = selectedProjectId ? data.receipts.filter((receipt) => receipt.project_id === selectedProjectId) : []
  const selectedExpenses = selectedProjectId ? data.expenses.filter((expense) => expense.project_id === selectedProjectId) : []
  const selectedPayouts = selectedProjectId ? data.payouts.filter((payout) => payout.project_id === selectedProjectId) : []
  const projectRows = useMemo(() => {
    const rows = visibleProjects.map((project) => {
      const contract = numericValue(project.contract_amount)
      const received = numericValue(project.total_received)
      const expenses = numericValue(project.total_expenses)
      const payouts = numericValue(project.total_payouts)
      const outstanding = Math.max(0, contract - received)
      const projectSubprojects = subprojectsByProjectId.get(project.id) ?? []
      const split = numericValue(project.base_partner_split_percent) / 100
      const partnerPool = projectSubprojects.reduce((sum, subproject) => sum + numericValue(subproject.amount) * split, 0)
      const payoutPending = Math.max(0, partnerPool - payouts)

      return {
        contract,
        expenses,
        outstanding,
        payoutPending,
        payouts,
        project,
        received,
        stage: stageLabel(project.stage),
      }
    })

    const compareText = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    const compareNumber = (a: number, b: number) => a - b

    rows.sort((a, b) => {
      let result = 0
      switch (projectSort.key) {
        case 'project':
          result = compareText(a.project.name, b.project.name)
          if (result === 0) result = compareText(a.project.client_name ?? '', b.project.client_name ?? '')
          break
        case 'stage':
          result = compareText(a.stage, b.stage)
          break
        case 'contract':
          result = compareNumber(a.contract, b.contract)
          break
        case 'received':
          result = compareNumber(a.received, b.received)
          break
        case 'outstanding':
          result = compareNumber(a.outstanding, b.outstanding)
          break
        case 'expenses':
          result = compareNumber(a.expenses, b.expenses)
          break
        case 'payouts':
          result = compareNumber(a.payouts, b.payouts)
          break
        case 'pending':
          result = compareNumber(a.payoutPending, b.payoutPending)
          break
      }

      return projectSort.direction === 'asc' ? result : result * -1
    })

    return rows
  }, [projectSort, subprojectsByProjectId, visibleProjects])
  const archivedProjectRows = useMemo(() => (
    archivedProjects
      .map((project) => {
        const contract = numericValue(project.contract_amount)
        const expenses = numericValue(project.total_expenses)
        const payouts = numericValue(project.total_payouts)
        const profit = numericValue(project.total_received) - expenses - payouts

        return {
          project,
          archivedAt: project.latest_subproject_completed_at || project.updated_at,
          contract,
          expenses,
          payouts,
          profit,
        }
      })
      .sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime())
  ), [archivedProjects])

  const partnerMonthlyPayouts = useMemo(() => {
    const now = new Date()
    const monthStarts = Array.from({ length: 6 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - (5 - index), 1))
    const monthKeys = monthStarts.map((d) => ({ key: d.toISOString().slice(0, 7), label: new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(d) }))

    const totals = new Map<string, Record<string, number>>()
    for (const partner of partners) totals.set(partner, Object.fromEntries(monthKeys.map((m) => [m.key, 0])))

    for (const payout of data.payouts) {
      if (!trackedProjectIds.has(payout.project_id)) continue
      const paidAt = new Date(payout.paid_at)
      if (Number.isNaN(paidAt.getTime())) continue
      const key = `${paidAt.getFullYear()}-${String(paidAt.getMonth() + 1).padStart(2, '0')}`
      const partnerRow = totals.get(payout.partner_name)
      if (!partnerRow || !(key in partnerRow)) continue
      partnerRow[key] += numericValue(payout.amount)
    }

    return { monthKeys, rows: partners.map((partner) => ({ partner, months: totals.get(partner) ?? {} })) }
  }, [data.payouts, trackedProjectIds])

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
  const toggleProjectSort = (key: ProjectSortKey) => {
    setProjectSort((current) => (
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'project' || key === 'stage' ? 'asc' : 'desc' }
    ))
  }
  const projectSortMarker = (key: ProjectSortKey) => {
    if (projectSort.key !== key) return '↕'
    return projectSort.direction === 'asc' ? '↑' : '↓'
  }

  const handleEditProject = (project: Project) => {
    setEditingProjectId(project.id)
  }

  const handleSaveProject = (project: Project, form: {
    name: string
    code: string
    area: string
    discipline: string
    stage: string
    contractAmount: string
    salesOwner: string
    statusNote: string
    notes: string
  }) => {
    void submitMutation(
      'updateProject',
      {
        id: project.id,
        ...form,
      },
      () => setEditingProjectId(null),
      'Projeto atualizado',
    )
  }

  return (
    <>
      <ProjectEditModal
        project={editingProject}
        mutating={mutating}
        onClose={() => setEditingProjectId(null)}
        onSave={(form) => editingProject ? handleSaveProject(editingProject, form) : undefined}
      />

      <ProjectHistoryModal
        project={selectedProject}
        subprojects={selectedSubprojects}
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

      <CollapsiblePanel
        title="Projetos ativos"
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
        {projectRows.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-[var(--ink-soft)]">
                  <th className="pb-3 pr-4 font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-[var(--ink)]" onClick={() => toggleProjectSort('project')}>
                      Projeto <span className="text-[10px]">{projectSortMarker('project')}</span>
                    </button>
                  </th>
                  <th className="pb-3 pr-4 font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-[var(--ink)]" onClick={() => toggleProjectSort('stage')}>
                      Etapa <span className="text-[10px]">{projectSortMarker('stage')}</span>
                    </button>
                  </th>
                  <th className="pb-3 pr-4 text-right font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-[var(--ink)]" onClick={() => toggleProjectSort('contract')}>
                      Contrato <span className="text-[10px]">{projectSortMarker('contract')}</span>
                    </button>
                  </th>
                  <th className="pb-3 pr-4 text-right font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-[var(--ink)]" onClick={() => toggleProjectSort('received')}>
                      Recebido <span className="text-[10px]">{projectSortMarker('received')}</span>
                    </button>
                  </th>
                  <th className="pb-3 pr-4 text-right font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-[var(--ink)]" onClick={() => toggleProjectSort('outstanding')}>
                      Saldo <span className="text-[10px]">{projectSortMarker('outstanding')}</span>
                    </button>
                  </th>
                  <th className="pb-3 pr-4 text-right font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-[var(--ink)]" onClick={() => toggleProjectSort('expenses')}>
                      Despesas <span className="text-[10px]">{projectSortMarker('expenses')}</span>
                    </button>
                  </th>
                  <th className="pb-3 pr-4 text-right font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-[var(--ink)]" onClick={() => toggleProjectSort('payouts')}>
                      Repasses feitos <span className="text-[10px]">{projectSortMarker('payouts')}</span>
                    </button>
                  </th>
                  <th className="pb-3 pr-4 text-right font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-[var(--ink)]" onClick={() => toggleProjectSort('pending')}>
                      Repasse pendente <span className="text-[10px]">{projectSortMarker('pending')}</span>
                    </button>
                  </th>
                  <th className="pb-3 text-right font-medium">Arquivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {projectRows.map(({ contract, expenses, outstanding, payoutPending, payouts, project, received, stage }) => {
                  return (
                    <tr
                      key={project.id}
                      className={`group workspace-row cursor-pointer hover:bg-[var(--paper)] ${project.archived ? 'opacity-70' : ''}`}
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
                        <div className="mt-1 flex items-center gap-2 text-xs text-[var(--ink-soft)]">
                          <span>{project.client_name ?? '—'}</span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleEditProject(project)
                            }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded border border-transparent text-[var(--ink-soft)] opacity-100 transition hover:border-[var(--line)] hover:bg-[var(--paper)] hover:text-[var(--ink)] md:opacity-0 md:group-hover:opacity-100"
                            aria-label={`Editar ${project.name}`}
                            title="Editar projeto"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-[var(--ink-soft)]">{stage}</td>
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
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Custo fixo mensal"
        subtitle={`Despesas sem projeto vinculado nos últimos 6 meses. Total do período: ${formatCurrency(fixedCostTotal6Months)}.`}
        defaultCollapsed={true}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {fixedCostMonthlyRows.map((month) => (
            <div key={month.key} className="workspace-surface workspace-card-pop rounded-[24px] border border-[var(--line)] bg-[var(--bg-card-80)] p-5">
              <div className={labelClass}>{month.label}</div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-[var(--ink)]">{formatCurrency(month.total)}</div>
              <div className="mt-2 text-sm text-[var(--ink-soft)]">Despesas sem projeto vinculado.</div>
            </div>
          ))}
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel title="Projetos arquivados" subtitle="Lista ordenada pela data mais recente de conclusão dos subprojetos.">
        {archivedProjectRows.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-[var(--ink-soft)]">
                  <th className="pb-3 pr-4 font-medium">Projeto</th>
                  <th className="pb-3 pr-4 font-medium">Arquivado em</th>
                  <th className="pb-3 pr-4 text-right font-medium">Receita total</th>
                  <th className="pb-3 pr-4 text-right font-medium">Repasses</th>
                  <th className="pb-3 pr-4 text-right font-medium">Despesas</th>
                  <th className="pb-3 text-right font-medium">Lucro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {archivedProjectRows.map(({ archivedAt, contract, expenses, payouts, profit, project }) => (
                  <tr key={project.id} className="workspace-row cursor-pointer hover:bg-[var(--paper)]" onClick={() => setSelectedProjectId(project.id)}>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-[var(--ink)]">{project.name}</div>
                      <div className="mt-1 text-xs text-[var(--ink-soft)]">{project.client_name ?? '—'}</div>
                    </td>
                    <td className="py-3 pr-4 text-[var(--ink-soft)]">{formatDate(archivedAt)}</td>
                    <td className="py-3 pr-4 text-right text-[var(--ink)]">{formatCurrency(contract)}</td>
                    <td className="py-3 pr-4 text-right text-[var(--ink)]">{formatCurrency(payouts)}</td>
                    <td className="py-3 pr-4 text-right text-rose-600">{formatCurrency(expenses)}</td>
                    <td className={`py-3 text-right font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sem projetos arquivados" body="Arquive projetos concluídos para acompanhar margem e histórico aqui." />
        )}
      </CollapsiblePanel>

      <CollapsiblePanel title="Repasses por sócio" subtitle="Valor pago por sócio nos últimos 6 meses." defaultCollapsed={true}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-[var(--ink-soft)]">
                <th className="pb-3 pr-4 font-medium">Sócio</th>
                {partnerMonthlyPayouts.monthKeys.map((month) => (
                  <th key={month.key} className="pb-3 pr-4 text-right font-medium">{month.label}</th>
                ))}
                <th className="pb-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {partnerMonthlyPayouts.rows.map(({ partner, months }) => {
                const total = Object.values(months).reduce((sum, value) => sum + value, 0)
                return (
                  <tr key={partner}>
                    <td className="py-3 pr-4 font-medium text-[var(--ink)]">{partner}</td>
                    {partnerMonthlyPayouts.monthKeys.map((month) => (
                      <td key={month.key} className="py-3 pr-4 text-right text-rose-600">{formatCurrency(months[month.key] ?? 0)}</td>
                    ))}
                    <td className="py-3 text-right font-semibold text-rose-600">{formatCurrency(total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel title="Repasses registrados" subtitle="Histórico completo de repasses aos sócios." defaultCollapsed={true}>
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
      </CollapsiblePanel>
    </>
  )
}
