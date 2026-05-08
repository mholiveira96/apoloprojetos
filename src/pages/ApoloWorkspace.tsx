
import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  CircleDollarSign,
  FolderKanban,
  LoaderCircle,
  LogOut,
  Plus,
  ReceiptText,
  Search,
  TrendingUp,
} from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { getBootstrap, getSession, login, logout, mutate } from '@/lib/app-api'
import type { BootstrapData, Lead, SessionUser } from '@/types/app'
import type { ConvertProjectForm, LeadDetailForm, ViewMode } from '@/types/forms'
import { NAV_ITEMS, leadStages } from '@/lib/constants'
import {
  formatCurrency,
  formatDate,
  leadFollowUpMeta,
  numericValue,
  stageLabel,
  toDateInputValue,
} from '@/lib/formatters'
import { EmptyState, MetricCard, Panel, ViewSwitch } from '@/components/workspace/ui'
import { DndContext, DragOverlay, closestCenter, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { DroppableLeadColumn, DraggableLeadCard, LeadGhostCard } from '@/components/workspace/kanban'
import { LeadModal, LeadDetailModal, ConvertProjectModal } from '@/components/workspace/commercial-modals'
import { DashboardProjectRow } from '@/components/workspace/project-strip'
import { LoginScreen } from '@/components/workspace/login-screen'
import { OperationsKanbanPage } from '@/pages/OperationsKanbanPage'
import { FinancialPage } from '@/pages/FinancialPage'
import { CashflowPage } from '@/pages/CashflowPage'

export function ApoloWorkspace() {
  const location = useLocation()
  const navigate = useNavigate()
  const [checkingSession, setCheckingSession] = useState(true)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [data, setData] = useState<BootstrapData | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [mutating, setMutating] = useState(false)

  const [leadForm, setLeadForm] = useState({
    clientName: '',
    title: '',
    stage: 'incoming',
    source: '',
    estimatedAmount: '',
    salesOwner: '',
    notes: '',
    inboundAt: new Date().toISOString().slice(0, 10),
    nextFollowUpAt: '',
  })
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [commercialView, setCommercialView] = useState<ViewMode>('list')
  const [leadDetailForm, setLeadDetailForm] = useState<LeadDetailForm>({
    title: '',
    stage: 'incoming',
    source: '',
    estimatedAmount: '',
    salesOwner: '',
    notes: '',
    inboundAt: '',
    firstContactAt: '',
    lastContactAt: '',
    nextFollowUpAt: '',
    proposalSentAt: '',
    closedAt: '',
  })
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [commercialSearch, setCommercialSearch] = useState('')
  const [showWonLost, setShowWonLost] = useState(false)
  const [showSalesBreakdown, setShowSalesBreakdown] = useState(false)
  const [commercialDragId, setCommercialDragId] = useState<string | null>(null)
  const [commercialStageOverrides, setCommercialStageOverrides] = useState<Record<string, string>>({})
  const [convertForm, setConvertForm] = useState<ConvertProjectForm>({
    leadId: '',
    clientName: '',
    name: '',
    contractAmount: '',
    salesOwner: '',
    firstContactAt: '',
    proposalSentAt: '',
    closedAt: '',
    deadline: '',
    subprojects: [],
  })

  const rawSection = location.pathname.replace('/app/', '').replace('/app', '') || 'dashboard'
  const legacySectionMap: Record<string, string> = {
    commercial: 'comercial',
    operations: 'operacoes',
    financial: 'financeiro',
    cashflow: 'fluxo',
  }
  const section = legacySectionMap[rawSection] || rawSection

  const loadBootstrap = async () => {
    setLoadingData(true)
    try {
      const next = await getBootstrap()
      setData(next)
      setUser(next.user)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar o app'
      toast.error(message)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const session = await getSession()
        if (session.user) {
          setUser(session.user)
          await loadBootstrap()
        }
      } finally {
        setCheckingSession(false)
      }
    }

    void init()
  }, [])

  useEffect(() => {
    if (location.pathname === '/app') navigate('/app/dashboard', { replace: true })
    if (legacySectionMap[rawSection]) navigate(`/app/${legacySectionMap[rawSection]}`, { replace: true })
  }, [location.pathname, navigate])

  const submitMutation = async (
    action: string,
    payload: Record<string, unknown>,
    onSuccess?: () => void,
    successMessage?: string,
  ) => {
    setMutating(true)
    try {
      const next = await mutate(action, payload)
      setData(next)
      setUser(next.user)
      onSuccess?.()
      toast.success(successMessage || 'Salvo')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ação falhou')
    } finally {
      setMutating(false)
    }
  }

  const handleLeadDetailChange = (field: keyof LeadDetailForm, value: string) => {
    setLeadDetailForm((current) => ({ ...current, [field]: value }))
  }

  const handleLeadSave = async () => {
    if (!selectedLead) return
    await submitMutation('updateLead', { id: selectedLead.id, ...leadDetailForm }, undefined, 'Lead atualizado')
  }

  const handleLeadTouch = async () => {
    if (!selectedLead) return
    await submitMutation('touchLead', { id: selectedLead.id, nextFollowUpAt: leadDetailForm.nextFollowUpAt || undefined }, undefined, 'Contato registrado')
  }

  const handleLogin = async (email: string, password: string) => {
    try {
      const session = await login(email, password)
      setUser(session.user)
      toast.success(`Bem-vindo, ${session.user.name}`)
      await loadBootstrap()
      navigate('/app/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha no login')
      throw error
    }
  }

  const handleSair = async () => {
    await logout()
    setUser(null)
    setData(null)
    navigate('/app')
  }

  const selectedLead = useMemo(() => data?.leads?.find((lead) => lead.id === selectedLeadId) || null, [data?.leads, selectedLeadId])
  const leadsWithOverrides = useMemo(
    () => (data?.leads || []).map((l) => commercialStageOverrides[l.id] ? { ...l, stage: commercialStageOverrides[l.id] } : l),
    [data?.leads, commercialStageOverrides],
  )
  const commercialKanban = useMemo(
    () => Object.fromEntries(leadStages.map((stage) => [stage, leadsWithOverrides.filter((lead) => lead.stage === stage)])) as Record<string, Lead[]>,
    [leadsWithOverrides],
  )
  const activeDragLead = useMemo(
    () => (commercialDragId ? leadsWithOverrides.find((l) => l.id === commercialDragId) ?? null : null),
    [commercialDragId, leadsWithOverrides],
  )

  const handleCommercialDragStart = useCallback((event: DragStartEvent) => {
    setCommercialDragId(String(event.active.id))
  }, [])

  const handleCommercialDragEnd = useCallback(
    (event: DragEndEvent) => {
      setCommercialDragId(null)
      const leadId = String(event.active.id)
      const targetStage = event.over ? String(event.over.id) : null
      const activeStages = ['incoming', 'qualified', 'proposal', 'negotiation']
      if (!targetStage || !activeStages.includes(targetStage)) return
      const lead = data?.leads.find((l) => l.id === leadId)
      if (!lead || lead.stage === targetStage) return
      setCommercialStageOverrides((prev) => ({ ...prev, [leadId]: targetStage }))
      void submitMutation(
        'updateLeadStage',
        { id: leadId, stage: targetStage },
        () => setCommercialStageOverrides((prev) => { const next = { ...prev }; delete next[leadId]; return next }),
        'Etapa atualizada',
      ).catch(() => {
        setCommercialStageOverrides((prev) => { const next = { ...prev }; delete next[leadId]; return next })
      })
    },
    [data?.leads, submitMutation],
  )
  useEffect(() => {
    if (!data?.leads.length) { setSelectedLeadId(null); return }
    if (selectedLeadId && !data.leads.some((lead) => lead.id === selectedLeadId)) {
      setSelectedLeadId(null)
    }
  }, [data?.leads, selectedLeadId])

  useEffect(() => {
    if (!selectedLead) return
    setLeadDetailForm({
      title: selectedLead.title || '',
      stage: selectedLead.stage || 'incoming',
      source: selectedLead.source || '',
      estimatedAmount: String(selectedLead.estimated_amount || ''),
      salesOwner: selectedLead.sales_owner || '',
      notes: selectedLead.notes || '',
      inboundAt: toDateInputValue(selectedLead.inbound_at || selectedLead.created_at),
      firstContactAt: toDateInputValue(selectedLead.first_contact_at),
      lastContactAt: toDateInputValue(selectedLead.last_contact_at),
      nextFollowUpAt: toDateInputValue(selectedLead.next_follow_up_at),
      proposalSentAt: toDateInputValue(selectedLead.proposal_sent_at),
      closedAt: toDateInputValue(selectedLead.closed_at),
    })
  }, [selectedLead])

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] text-[var(--ink)]">
        <LoaderCircle className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <Toaster richColors position="top-right" />
      </>
    )
  }

  if (loadingData || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] text-[var(--ink)]">
        <div className="inline-flex items-center gap-3 rounded-full border border-[var(--line)] bg-white/80 px-5 py-3 text-sm">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Carregando o app da Apolo…
        </div>
        <Toaster richColors position="top-right" />
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const pipelineLeads = data.leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost')
  const pipelineTotal = pipelineLeads.reduce((s, l) => s + numericValue(l.estimated_amount), 0)
  const incomingLeadsValue = pipelineLeads
    .filter((l) => l.stage === 'incoming')
    .reduce((sum, lead) => sum + numericValue(lead.estimated_amount), 0)
  const proposalLeadsValue = pipelineLeads
    .filter((l) => l.stage === 'proposal')
    .reduce((sum, lead) => sum + numericValue(lead.estimated_amount), 0)
  const pipelineByStage = ['incoming', 'proposal', 'negotiation'].map((stage) => ({
    stage,
    count: pipelineLeads.filter((l) => l.stage === stage).length,
    value: pipelineLeads.filter((l) => l.stage === stage).reduce((s, l) => s + numericValue(l.estimated_amount), 0),
  }))
  const overdueFollowUps = data.leads
    .filter((l) => l.next_follow_up_at && l.next_follow_up_at < today && l.stage !== 'won' && l.stage !== 'lost')
    .sort((a, b) => (a.next_follow_up_at ?? '').localeCompare(b.next_follow_up_at ?? ''))
    .slice(0, 8)
  const currentYear = today.slice(0, 4)
  const currentYearSalesProjects = data.projects
    .filter((project) => (
      numericValue(project.sale_log_count) > 0
      && (project.sale_recorded_at || '').slice(0, 4) === currentYear
    ))
    .sort((a, b) => {
      const aDate = a.sale_recorded_at || ''
      const bDate = b.sale_recorded_at || ''
      return bDate.localeCompare(aDate)
    })
  const currentYearSalesTotal = currentYearSalesProjects.reduce(
    (sum, project) => sum + numericValue(project.contract_amount),
    0,
  )
  const inProgressCount = data.projects.filter((p) => p.stage === 'em-andamento').length
  const activeProjects = data.projects
    .filter((p) => p.stage === 'em-andamento' || p.stage === 'bloqueado')
    .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
    .slice(0, 8)

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f6f2_0%,#efeee8_100%)] text-[var(--ink)]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-[var(--line)] px-5 py-6 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
          <div className="rounded-[28px] border border-[var(--line)] bg-white/70 p-5 shadow-[0_20px_60px_rgba(7,19,21,0.05)]">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--teal)]">Apolo / App</div>
            <h1 className="mt-3 text-2xl font-semibold">Central da Apolo</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
              CRM, andamento dos projetos e dinheiro costurados numa mesma mesa operacional.
            </p>
          </div>

          <nav className="mt-6 space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.key}
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                      isActive
                        ? 'border-[rgba(15,139,141,0.18)] bg-[rgba(15,139,141,0.08)] text-[var(--teal)]'
                        : 'border-transparent text-[var(--ink-soft)] hover:border-[var(--line)] hover:bg-white/70'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>

          <div className="mt-6 rounded-[28px] border border-[var(--line)] bg-white/70 p-5 text-sm shadow-[0_20px_60px_rgba(7,19,21,0.05)]">
            <div className="font-medium text-[var(--ink)]">Sessão ativa</div>
            <div className="mt-2 text-[var(--ink-soft)]">{user.name}</div>
            <div className="text-xs text-[var(--ink-soft)]/80">{user.email}</div>
            <button
              onClick={() => void handleSair()}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)] transition hover:bg-[var(--paper)]"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </aside>

        <main className="px-5 py-6 md:px-8 md:py-8">
          <header className="mb-6 rounded-[32px] border border-[var(--line)] bg-white/70 p-6 shadow-[0_20px_60px_rgba(7,19,21,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]/70">{section}</div>
                <h2 className="mt-2 text-3xl font-semibold capitalize">{stageLabel(section)}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
                  O app foi dividido de propósito em comercial, operações e financeiro para a Apolo enxergar o que entrou, o que está travado e o que realmente girou no caixa.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.85)] px-4 py-3 text-sm">
                  <div className="text-[var(--ink-soft)]">Leads abertos</div>
                  <div className="mt-1 font-semibold">{data.summary.openLeads}</div>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.85)] px-4 py-3 text-sm">
                  <div className="text-[var(--ink-soft)]">Projetos ativos</div>
                  <div className="mt-1 font-semibold">{data.summary.activeProjects}</div>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.85)] px-4 py-3 text-sm">
                  <div className="text-[var(--ink-soft)]">Caixa líquido</div>
                  <div className="mt-1 font-semibold">{formatCurrency(data.summary.netCash)}</div>
                </div>
              </div>
            </div>
          </header>

          <div className="space-y-6">
            {section === 'dashboard' ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Leads no funil" value={String(pipelineLeads.length)} helper={`${formatCurrency(pipelineTotal)} em oportunidades ativas`} icon={TrendingUp} />
                  <MetricCard label="Em andamento" value={String(inProgressCount)} helper="Projetos nas etapas Em andamento e Acompanhamento" icon={FolderKanban} />
                  <MetricCard label="Contratos ativos" value={formatCurrency(data.summary.activeContractTotal)} helper="Valor em contrato ainda em execução" icon={ReceiptText} />
                  <MetricCard label="Vendas no ano" value={formatCurrency(data.summary.currentYearSales)} helper="Valor contratado no ano corrente" icon={CircleDollarSign} />
                </div>

                <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
                  <Panel title="Pipeline comercial" subtitle="Leads ativos por etapa — quantidade e valor estimado.">
                    {pipelineLeads.length === 0 ? (
                      <EmptyState title="Funil vazio" body="Nenhum lead ativo no momento." />
                    ) : (
                      <div className="space-y-5">
                        {pipelineByStage.map(({ stage, count, value }) => {
                          const pct = pipelineTotal > 0 ? Math.round((value / pipelineTotal) * 100) : 0
                          return (
                            <div key={stage}>
                              <div className="mb-2 flex items-center justify-between text-sm">
                                <span className="font-medium text-[var(--ink)]">{stageLabel(stage)}</span>
                                <span className="text-[var(--ink-soft)]">{count} lead{count !== 1 ? 's' : ''} · {formatCurrency(value)}</span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-[rgba(15,139,141,0.1)]">
                                <div className="h-2 rounded-full bg-[var(--teal)] transition-all duration-500" style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }} />
                              </div>
                            </div>
                          )
                        })}
                        <div className="flex items-center justify-between border-t border-[var(--line)] pt-4 text-sm">
                          <span className="text-[var(--ink-soft)]">Total do funil</span>
                          <span className="font-semibold text-[var(--ink)]">{formatCurrency(pipelineTotal)}</span>
                        </div>
                      </div>
                    )}
                  </Panel>

                  <Panel title="Follow-ups vencidos" subtitle="Leads que precisam de ação.">
                    {overdueFollowUps.length === 0 ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Nenhum follow-up em atraso. Boa!</div>
                    ) : (
                      <div className="space-y-2">
                        {overdueFollowUps.map((lead) => {
                          const meta = leadFollowUpMeta(lead)
                          return (
                            <div key={lead.id} className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                              <div className="min-w-0">
                                <div className="truncate font-medium text-[var(--ink)]">{lead.title}</div>
                                <div className="truncate text-xs text-[var(--ink-soft)]">{lead.client_name ?? '—'}</div>
                              </div>
                              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${meta.tone}`}>{meta.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Panel>
                </div>

                <Panel title="Projetos em andamento" subtitle="Em andamento e Acompanhamento — ordenados por número de pendências.">
                  <div className="space-y-2">
                    {activeProjects.length ? (
                      activeProjects.map((project) => <DashboardProjectRow key={project.id} project={project} />)
                    ) : (
                      <EmptyState title="Nenhum projeto em andamento" body="Quando projetos entrarem nas etapas Em andamento ou Acompanhamento eles aparecem aqui." />
                    )}
                  </div>
                </Panel>

                <Panel title="Movimentação recente" subtitle="Leitura rápida do que realmente girou no caixa.">
                  {data.cashflow.length === 0 ? (
                    <EmptyState title="Sem movimentação ainda" body="Registre recebimentos e despesas no Financeiro." />
                  ) : (
                    <div className="space-y-3">
                      {data.cashflow.slice(0, 8).map((entry) => (
                        <div key={`${entry.entry_type}-${entry.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-[var(--ink)]">{entry.project_name}</div>
                            <div className="text-[var(--ink-soft)]">{stageLabel(entry.entry_type)}{entry.counterpart ? ` · ${entry.counterpart}` : ''}</div>
                          </div>
                          <div className={`shrink-0 font-semibold ${entry.signed_amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {entry.signed_amount >= 0 ? '+' : '−'}{formatCurrency(Math.abs(numericValue(entry.signed_amount)))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </>
            ) : null}

            {section === 'comercial' ? (
              <>
                {/* KPI Bar */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Leads no funil" value={String(pipelineLeads.length)} helper={`${formatCurrency(pipelineTotal)} em oportunidades`} icon={TrendingUp} />
                  <MetricCard label="Vendas no ano" value={formatCurrency(currentYearSalesTotal)} helper="Só projetos com Contratação registrada neste ano" icon={CircleDollarSign} onClick={() => setShowSalesBreakdown(!showSalesBreakdown)} />
                  <MetricCard label="Taxa de conversão" value={data.leads.length > 0 ? `${Math.round((data.leads.filter(l => l.stage === 'won').length / data.leads.length) * 100)}%` : '0%'} helper="Leads fechados / total" icon={ReceiptText} />
                  <MetricCard label="Follow-ups vencidos" value={String(overdueFollowUps.length)} helper="Precisam de ação agora" icon={Search} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                  <MetricCard label="Valor em entrada" value={formatCurrency(incomingLeadsValue)} helper="Soma dos leads na etapa Entrada" icon={CircleDollarSign} />
                  <MetricCard label="Valor em proposta" value={formatCurrency(proposalLeadsValue)} helper="Soma dos leads na etapa Proposta" icon={ReceiptText} />
                </div>

                {showSalesBreakdown ? (
                  <Panel title="Composição de vendas no ano" subtitle="Projetos que entram no KPI: somente os com Contratação registrada neste ano.">
                    {currentYearSalesProjects.length ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                          <span className="text-[var(--ink-soft)]">Total conferido nesta lista</span>
                          <span className="font-semibold text-[var(--ink)]">{formatCurrency(currentYearSalesTotal)}</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-left text-sm">
                            <thead className="text-[var(--ink-soft)]">
                              <tr><th className="pb-3">Projeto</th><th className="pb-3">Cliente</th><th className="pb-3">Responsável</th><th className="pb-3">Data considerada</th><th className="pb-3">Origem</th><th className="pb-3 text-right">Contrato</th></tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--line)]">
                              {currentYearSalesProjects.map((project) => {
                                const salesDate = project.sale_recorded_at
                                return (
                                  <tr key={project.id} className="cursor-pointer transition hover:bg-[rgba(15,139,141,0.04)]">
                                    <td className="py-3 font-medium text-[var(--ink)]">{project.name}</td>
                                    <td className="py-3 text-[var(--ink-soft)]">{project.client_name || '—'}</td>
                                    <td className="py-3 text-[var(--ink-soft)]">{project.sales_owner || '—'}</td>
                                    <td className="py-3 text-[var(--ink-soft)]">{formatDate(salesDate)}</td>
                                    <td className="py-3 text-[var(--ink-soft)]">Log de contratação</td>
                                    <td className="py-3 text-right font-semibold text-[var(--ink)]">{formatCurrency(numericValue(project.contract_amount))}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <EmptyState title="Nenhuma venda encontrada" body="Nenhum projeto entrou no cálculo de vendas deste ano com as regras atuais do KPI." />
                    )}
                  </Panel>
                ) : null}

                {/* Toolbar: search + new lead */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-soft)]" />
                    <input className="w-full rounded-2xl border border-[var(--line)] bg-white/80 py-3 pl-10 pr-4 text-sm" placeholder="Buscar leads..." value={commercialSearch} onChange={(e) => setCommercialSearch(e.target.value)} />
                  </div>
                  <button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-[var(--teal)] px-4 py-3 text-sm text-white transition hover:opacity-90" onClick={() => setShowLeadModal(true)}>
                    <Plus className="h-4 w-4" /> Novo lead
                  </button>
                </div>

                {/* Kanban pipeline (active stages only) */}
                <Panel title="Pipeline" subtitle="Arraste mentalmente: cada lead precisa de dono, data e próxima ação." actions={<ViewSwitch value={commercialView} onChange={setCommercialView} />}>
                  {commercialView === 'kanban' ? (
                    <DndContext collisionDetection={closestCenter} onDragStart={handleCommercialDragStart} onDragEnd={handleCommercialDragEnd}>
                      <div className="overflow-x-auto pb-2">
                        <div className="flex gap-4">
                          {(['incoming', 'qualified', 'proposal', 'negotiation'] as const).map((stage) => {
                            const stageLeads = (commercialKanban[stage] || []).filter((l) => {
                              if (!commercialSearch) return true
                              const q = commercialSearch.toLowerCase()
                              return l.title.toLowerCase().includes(q) || (l.client_name || '').toLowerCase().includes(q)
                            })
                            return (
                              <DroppableLeadColumn key={stage} stage={stage} title={stageLabel(stage)} count={stageLeads.length}>
                                {stageLeads.length ? (
                                  stageLeads.map((lead) => (
                                    <DraggableLeadCard key={lead.id} lead={lead} active={selectedLeadId === lead.id} onClick={setSelectedLeadId} />
                                  ))
                                ) : (
                                  <div className="rounded-[20px] border border-dashed border-[var(--line)] bg-white/65 p-4 text-sm text-[var(--ink-soft)]">Nenhum lead aqui.</div>
                                )}
                              </DroppableLeadColumn>
                            )
                          })}
                        </div>
                      </div>
                      <DragOverlay>
                        {activeDragLead ? <LeadGhostCard lead={activeDragLead} /> : null}
                      </DragOverlay>
                    </DndContext>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="text-[var(--ink-soft)]">
                          <tr><th className="pb-3">Lead</th><th className="pb-3">Cliente</th><th className="pb-3">Valor</th><th className="pb-3">Responsável</th><th className="pb-3">Origem</th><th className="pb-3">Próx. follow-up</th><th className="pb-3">Etapa</th></tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--line)]">
                          {pipelineLeads
                            .filter((l) => {
                              if (!commercialSearch) return true
                              const q = commercialSearch.toLowerCase()
                              return l.title.toLowerCase().includes(q) || (l.client_name || '').toLowerCase().includes(q)
                            })
                            .map((lead) => {
                              const followUp = leadFollowUpMeta(lead)
                              return (
                                <tr key={lead.id} className="cursor-pointer transition hover:bg-[rgba(15,139,141,0.04)]" onClick={() => setSelectedLeadId(lead.id)}>
                                  <td className="py-4 font-medium text-[var(--ink)]">{lead.title}</td>
                                  <td className="py-4 text-[var(--ink-soft)]">{lead.client_name || '—'}</td>
                                  <td className="py-4 text-[var(--ink-soft)]">{formatCurrency(numericValue(lead.estimated_amount))}</td>
                                  <td className="py-4 text-[var(--ink-soft)]">{lead.sales_owner || '—'}</td>
                                  <td className="py-4 text-[var(--ink-soft)]">{stageLabel(lead.source || '') || '—'}</td>
                                  <td className="py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${followUp.tone}`}>{formatDate(lead.next_follow_up_at)}</span></td>
                                  <td className="py-4"><span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-medium">{stageLabel(lead.stage)}</span></td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Panel>

                {/* Won/lost history (collapsed) */}
                <div className="rounded-[28px] border border-[var(--line)] bg-white/70">
                  <button type="button" className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-[var(--ink)]" onClick={() => setShowWonLost(!showWonLost)}>
                    <span>Histórico (Fechados / Não fechados)</span>
                    <ChevronDown className={`h-4 w-4 transition ${showWonLost ? 'rotate-180' : ''}`} />
                  </button>
                  {showWonLost && (
                    <div className="border-t border-[var(--line)] px-5 py-4">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="text-[var(--ink-soft)]">
                            <tr><th className="pb-3">Lead</th><th className="pb-3">Cliente</th><th className="pb-3">Valor</th><th className="pb-3">Responsável</th><th className="pb-3">Fechado em</th><th className="pb-3">Resultado</th></tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--line)]">
                            {data.leads
                              .filter((l) => l.stage === 'won' || l.stage === 'lost')
                              .filter((l) => {
                                if (!commercialSearch) return true
                                const q = commercialSearch.toLowerCase()
                                return l.title.toLowerCase().includes(q) || (l.client_name || '').toLowerCase().includes(q)
                              })
                              .map((lead) => (
                                <tr key={lead.id} className="cursor-pointer transition hover:bg-[rgba(15,139,141,0.04)]" onClick={() => setSelectedLeadId(lead.id)}>
                                  <td className="py-3 font-medium text-[var(--ink)]">{lead.title}</td>
                                  <td className="py-3 text-[var(--ink-soft)]">{lead.client_name || '—'}</td>
                                  <td className="py-3 text-[var(--ink-soft)]">{formatCurrency(numericValue(lead.estimated_amount))}</td>
                                  <td className="py-3 text-[var(--ink-soft)]">{lead.sales_owner || '—'}</td>
                                  <td className="py-3 text-[var(--ink-soft)]">{formatDate(lead.closed_at)}</td>
                                  <td className="py-3">
                                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${lead.stage === 'won' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                                      {stageLabel(lead.stage)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modals */}
                <LeadModal
                  open={showLeadModal}
                  onClose={() => setShowLeadModal(false)}
                  form={leadForm}
                  setForm={setLeadForm}
                  onSubmit={() => {
                    void submitMutation('createLead', leadForm, () => {
                      setLeadForm({ clientName: '', title: '', stage: 'incoming', source: '', estimatedAmount: '', salesOwner: '', notes: '', inboundAt: new Date().toISOString().slice(0, 10), nextFollowUpAt: '' })
                      setShowLeadModal(false)
                    }, 'Lead criado')
                  }}
                  mutating={mutating}
                />

                {selectedLead && (
                  <LeadDetailModal
                    open={!!selectedLeadId}
                    onClose={() => setSelectedLeadId(null)}
                    lead={selectedLead}
                    draft={leadDetailForm}
                    onChange={handleLeadDetailChange}
                    onSave={() => void handleLeadSave()}
                    onTouch={() => void handleLeadTouch()}
                    onConvert={() => {
                      setConvertForm({
                        leadId: selectedLead.id,
                        clientName: selectedLead.client_name || '',
                        name: selectedLead.title,
                        contractAmount: String(selectedLead.estimated_amount || ''),
                        salesOwner: selectedLead.sales_owner || '',
                        firstContactAt: toDateInputValue(selectedLead.first_contact_at),
                        proposalSentAt: toDateInputValue(selectedLead.proposal_sent_at),
                        closedAt: toDateInputValue(selectedLead.closed_at) || new Date().toISOString().slice(0, 10),
                        deadline: '',
                        subprojects: [{ discipline: '', amount: String(selectedLead.estimated_amount || ''), responsiblePartner: '' }],
                      })
                      setShowConvertModal(true)
                    }}
                    onStageChange={(stage: string) => {
                      void submitMutation('updateLeadStage', { id: selectedLead.id, stage }, undefined, 'Etapa atualizada')
                    }}
                    mutating={mutating}
                  />
                )}

                <ConvertProjectModal
                  open={showConvertModal}
                  onClose={() => setShowConvertModal(false)}
                  form={convertForm}
                  setForm={setConvertForm}
                  onSubmit={() => {
                    void submitMutation('createProjectFromLead', convertForm, () => {
                      setShowConvertModal(false)
                      setSelectedLeadId(null)
                    }, 'Projeto criado com sucesso')
                  }}
                  mutating={mutating}
                />
              </>
            ) : null}

            {section === 'operacoes' ? (
              <OperationsKanbanPage data={data} submitMutation={submitMutation} mutating={mutating} />
            ) : null}

            {section === 'financeiro' ? (
              <FinancialPage data={data} />
            ) : null}

            {section === 'fluxo' ? (
              <CashflowPage data={data} submitMutation={submitMutation} mutating={mutating} />
            ) : null}
          </div>
        </main>
      </div>

      <Toaster richColors position="top-right" />
    </div>
  )
}
