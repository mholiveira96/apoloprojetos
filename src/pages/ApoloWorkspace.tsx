
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Banknote,
  ChevronDown,
  CircleDollarSign,
  FileText,
  FolderKanban,
  LoaderCircle,
  Menu,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ReceiptText,
  Search,
  Sun,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { getBootstrap, getSession, login, logout, mutate } from '@/lib/app-api'
import type { BootstrapData, Lead, SessionUser, Subproject } from '@/types/app'
import type { ConvertProjectForm, LeadDetailForm, ViewMode } from '@/types/forms'
import { NAV_ITEMS, BOTTOM_NAV_ITEMS, leadStages } from '@/lib/constants'
import {
  formatCurrency,
  formatDate,
  leadFollowUpMeta,
  numericValue,
  parseDateValue,
  sanitizeCashflowText,
  stageLabel,
  toDateInputValue,
} from '@/lib/formatters'
import { EmptyState, MetricCard, Panel, ViewSwitch } from '@/components/workspace/ui'
import { DndContext, DragOverlay, closestCenter, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { DroppableLeadColumn, DraggableLeadCard, LeadGhostCard } from '@/components/workspace/kanban'
import { LeadModal, LeadDetailModal, ConvertProjectModal } from '@/components/workspace/commercial-modals'
import { DashboardProjectRow, DashboardSubprojectRow } from '@/components/workspace/project-strip'
import { LoginScreen } from '@/components/workspace/login-screen'
import { InstallPrompt } from '@/components/workspace/install-prompt'
import { OperationsKanbanPage } from '@/pages/OperationsKanbanPage'
import { FinancialPage } from '@/pages/FinancialPage'
import { CashflowPage } from '@/pages/CashflowPage'
import { RevisoesKanbanPage } from '@/pages/RevisoesKanbanPage'
import DatabasePage from '@/pages/DatabasePage'
import { buildClientTimeline } from '@/lib/client-timeline'
import { useTheme } from '@/lib/theme-context'

export function ApoloWorkspace() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { theme, toggle: toggleTheme } = useTheme()
  const [checkingSession, setCheckingSession] = useState(true)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [data, setData] = useState<BootstrapData | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [subprojectSort, setSubprojectSort] = useState<'recent' | 'stage' | 'partner'>('recent')

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
  const [commercialView, setCommercialView] = useState<ViewMode>('kanban')
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
  const leadIsDirtyRef = useRef(false)
  const [uploadTargetLeadId, setUploadTargetLeadId] = useState<string | null>(null)
  const proposalInputRef = useRef<HTMLInputElement>(null)
  const [convertForm, setConvertForm] = useState<ConvertProjectForm>({
    leadId: '',
    clientName: '',
    name: '',
    area: '',
    contractAmount: '',
    salesOwner: '',
    firstContactAt: '',
    proposalSentAt: '',
    closedAt: '',
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
  const opsView = searchParams.get('view') || 'operacoes'

  const renderOperationsViewSwitch = (compact = false) => (
    <div className={`flex border border-[var(--line)] bg-[var(--bg-card-80)] p-0.5 ${compact ? 'w-full sm:w-auto' : 'w-fit'}`}>
      <button
        type="button"
        onClick={() => setSearchParams({}, { replace: true })}
        className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium transition ${opsView === 'operacoes' ? 'bg-[var(--teal)] text-white' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'} ${compact ? 'flex-1 sm:flex-none' : ''}`}
      >
        <FolderKanban className="h-3.5 w-3.5" />
        Operações
      </button>
      <button
        type="button"
        onClick={() => setSearchParams({ view: 'revisoes' }, { replace: true })}
        className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium transition ${opsView === 'revisoes' ? 'bg-[var(--teal)] text-white' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'} ${compact ? 'flex-1 sm:flex-none' : ''}`}
      >
        Revisões
      </button>
    </div>
  )

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

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

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
      if (successMessage) toast.success(successMessage)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ação falhou')
    } finally {
      setMutating(false)
    }
  }

  const handleLeadDetailChange = (field: keyof LeadDetailForm, value: string) => {
    leadIsDirtyRef.current = true
    setLeadDetailForm((current) => {
      const next = { ...current, [field]: value }
      if (field === 'stage') {
        const today = new Date().toISOString().slice(0, 10)
        if (value === 'proposal' && !next.proposalSentAt) next.proposalSentAt = today
        if ((value === 'won' || value === 'lost') && !next.closedAt) next.closedAt = today
      }
      return next
    })
    if (field === 'stage' && selectedLeadId) {
      setCommercialStageOverrides((prev) => ({ ...prev, [selectedLeadId]: value }))
    }
  }

  const selectLead = (leadId: string | null) => {
    leadIsDirtyRef.current = false
    setSelectedLeadId(leadId)
    if (!leadId) return
    const lead = data?.leads?.find((l) => l.id === leadId)
    if (!lead) return
    setLeadDetailForm({
      title: lead.title || '',
      stage: lead.stage || 'incoming',
      source: lead.source || '',
      estimatedAmount: String(lead.estimated_amount || ''),
      salesOwner: lead.sales_owner || '',
      notes: lead.notes || '',
      inboundAt: toDateInputValue(lead.inbound_at || lead.created_at),
      firstContactAt: toDateInputValue(lead.first_contact_at),
      lastContactAt: toDateInputValue(lead.last_contact_at),
      nextFollowUpAt: toDateInputValue(lead.next_follow_up_at),
      proposalSentAt: toDateInputValue(lead.proposal_sent_at),
      closedAt: toDateInputValue(lead.closed_at),
    })
  }

  const handleLeadTouch = async () => {
    if (!selectedLead) return
    await submitMutation('touchLead', { id: selectedLead.id, nextFollowUpAt: leadDetailForm.nextFollowUpAt || undefined }, undefined, 'Contato registrado')
  }

  const handleProposalUpload = (leadId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 5 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const base64 = dataUrl.split(',')[1]
      void submitMutation('uploadLeadProposal', { leadId, filename: file.name, fileData: base64, size: file.size }, undefined, 'Proposta anexada')
    }
    reader.readAsDataURL(file)
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

  const openDashboardSubprojectCard = (subproject: Subproject) => {
    navigate(`/app/operacoes?project=${encodeURIComponent(subproject.project_id)}&subproject=${encodeURIComponent(subproject.id)}`)
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
    if (!data?.leads.length) { leadIsDirtyRef.current = false; setSelectedLeadId(null); return }
    if (selectedLeadId && !data.leads.some((lead) => lead.id === selectedLeadId)) {
      leadIsDirtyRef.current = false
      setSelectedLeadId(null)
    }
  }, [data?.leads, selectedLeadId])

  useEffect(() => {
    if (!leadIsDirtyRef.current || !selectedLeadId) return
    const capturedLeadId = selectedLeadId
    const capturedForm = leadDetailForm
    const timer = window.setTimeout(() => {
      leadIsDirtyRef.current = false
      void submitMutation(
        'updateLead',
        { id: capturedLeadId, ...capturedForm },
        () => setCommercialStageOverrides((prev) => { const next = { ...prev }; delete next[capturedLeadId]; return next }),
      )
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [leadDetailForm, selectedLeadId])

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
        <div className="inline-flex items-center gap-3 border border-[var(--line)] px-5 py-3 text-sm text-[var(--ink-soft)]">
          <LoaderCircle className="h-4 w-4 animate-spin text-[var(--teal)]" />
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
      (
        numericValue(project.sale_log_count) > 0
        && (project.sale_recorded_at || '').slice(0, 4) === currentYear
      )
      || (
        numericValue(project.sale_log_count) === 0
        && (project.created_at || '').slice(0, 4) === currentYear
      )
    ))
    .sort((a, b) => {
      const aDate = a.sale_recorded_at || a.created_at || ''
      const bDate = b.sale_recorded_at || b.created_at || ''
      return bDate.localeCompare(aDate)
    })
  const currentYearSalesTotal = currentYearSalesProjects.reduce(
    (sum, project) => sum + numericValue(project.contract_amount),
    0,
  )
  const inProgressCount = data.projects.filter((p) => p.stage === 'em-andamento').length
  const stageOrder: Record<string, number> = { 'bloqueado': 0, 'aguardando-revisao': 1, 'em-andamento': 2 }
  const activeSubprojects = data.subprojects
    .filter((sp) => ['em-andamento', 'aguardando-revisao', 'bloqueado'].includes(sp.stage))
    .sort((a, b) => {
      if (subprojectSort === 'stage') return (stageOrder[a.stage] ?? 9) - (stageOrder[b.stage] ?? 9)
      if (subprojectSort === 'partner') return (a.responsible_partner || '').localeCompare(b.responsible_partner || '')
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
    .slice(0, 12)

  const blockedProjects = data.projects
    .filter((p) => p.stage === 'bloqueado')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6)
  const selectedLeadTimeline = selectedLead
    ? buildClientTimeline(data, selectedLead.client_name, { leadId: selectedLead.id })
    : []

  const deliveredUnpaidProjects = data.projects
    .filter((p) => p.stage === 'concluído-aguardando-pagamento')
    .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
  const deliveredUnpaidTotal = deliveredUnpaidProjects.reduce(
    (s, p) => s + numericValue(p.contract_amount) - numericValue(p.total_received),
    0,
  )

  const in30DaysStr = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const activeDeadlineStages = ['em-andamento']
  const upcomingDeadlines = data.subprojects
    .filter((sp) => sp.deadline && sp.deadline <= in30DaysStr && activeDeadlineStages.includes(sp.stage))
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!))
    .slice(0, 8)

  const totalPendingCount = data.projects
    .filter((p) => p.stage === 'em-andamento' || p.stage === 'bloqueado')
    .reduce((s, p) => s + numericValue(p.pending_count), 0)

  const completedProjectIds = new Set(
    data.projects.filter((p) => p.stage === 'concluído').map((p) => p.id),
  )
  const overdueLogs = data.logs
    .filter((log) => log.status !== 'done' && log.due_date && log.due_date < today && !completedProjectIds.has(log.project_id))
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
    .slice(0, 8)

  const currentMonth = today.slice(0, 7)
  const mtdEntries = data.cashflow.filter((e) => e.entry_date.startsWith(currentMonth))
  const mtdReceived = mtdEntries.filter((e) => e.entry_type === 'receipt').reduce((s, e) => s + numericValue(e.signed_amount), 0)
  const mtdExpenses = mtdEntries.filter((e) => e.entry_type === 'expense').reduce((s, e) => s + Math.abs(numericValue(e.signed_amount)), 0)
  const mtdPayouts = mtdEntries.filter((e) => e.entry_type === 'payout').reduce((s, e) => s + Math.abs(numericValue(e.signed_amount)), 0)
  const mtdNet = mtdReceived - mtdExpenses - mtdPayouts
  const mtdLabel = new Date(`${currentMonth}-15`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-[var(--bg-body-workspace)] text-[var(--ink)] transition-colors duration-300">
      <div className={`mx-auto grid max-w-[1600px] transition-[grid-template-columns] duration-300 ${sidebarCollapsed ? 'lg:grid-cols-[64px_minmax(0,1fr)]' : 'lg:grid-cols-[240px_minmax(0,1fr)]'}`}>

        {/* ── Sidebar ── */}
        <aside className={`z-20 flex flex-col overflow-x-hidden border-b border-[var(--line)] transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r`}>

          {/* Mobile bar */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
            <img src={theme === 'dark' ? '/logo-apolo-darkmode.png' : '/logo-apolo.png'} alt="Apolo" className="h-8 w-auto object-contain" />
            <button
              type="button"
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? 'Fechar navegação' : 'Abrir navegação'}
              className="inline-flex items-center gap-2 border border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--paper)]"
              onClick={() => setMobileNavOpen((current) => !current)}
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

          <div className={`flex flex-col gap-0 lg:flex-1 ${mobileNavOpen ? 'block border-t border-[var(--line)]' : 'hidden lg:flex'}`}>

            {/* Logo area */}
            <div className={`relative hidden border-b border-[var(--line)] transition-all duration-300 lg:block ${sidebarCollapsed ? 'p-3' : 'p-4 pr-12'}`}>
              <div className={sidebarCollapsed ? 'flex items-center justify-center' : ''}>
                <img src={theme === 'dark' ? '/logo-apolo-darkmode.png' : '/logo-apolo.png'} alt="Apolo" className={sidebarCollapsed ? 'h-9 w-9 object-contain' : 'w-full h-auto object-contain'} />
              </div>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((c) => !c)}
                className="absolute right-3 top-3 z-30 hidden items-center justify-center border border-[var(--line)] bg-[var(--paper)] p-1 text-[var(--ink-soft)] transition hover:text-[var(--ink)] lg:flex"
                aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
              >
                {sidebarCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Nav */}
            <nav className="py-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.key}
                    to={item.href}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 border-l-2 transition-colors ${
                        sidebarCollapsed ? 'justify-center px-0 py-3' : 'px-4 py-2.5 text-sm'
                      } ${
                        isActive
                          ? 'border-l-[var(--teal)] bg-[var(--teal-active-bg)] text-[var(--teal)]'
                          : 'border-l-transparent text-[var(--ink-soft)] hover:bg-[var(--teal-active-bg)] hover:text-[var(--ink)]'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </NavLink>
                )
              })}
            </nav>

            {/* User / actions — sits right after nav */}
            <div className={`mt-auto border-t border-[var(--line)] transition-all duration-300 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
              {/* Bottom nav */}
              <nav className="py-2">
                {BOTTOM_NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.key}
                      to={item.href}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `flex items-center gap-3 border-l-2 transition-colors ${
                          sidebarCollapsed ? 'justify-center px-0 py-3' : 'px-4 py-2.5 text-sm'
                        } ${
                          isActive
                            ? 'border-l-[var(--teal)] bg-[var(--teal-active-bg)] text-[var(--teal)]'
                            : 'border-l-transparent text-[var(--ink-soft)] hover:bg-[var(--teal-active-bg)] hover:text-[var(--ink)]'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </NavLink>
                  )
                })}
              </nav>

              {/* User info */}
              {!sidebarCollapsed && (
                <div className="mb-3">
                  <div className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">Sessão</div>
                  <div className="mt-1.5 text-sm font-medium text-[var(--ink)]">{user.name}</div>
                  <div className="text-xs text-[var(--ink-soft)]">{user.email}</div>
                </div>
              )}
              <div className={`flex gap-2 ${sidebarCollapsed ? 'flex-col items-center' : ''}`}>
                <button
                  onClick={() => void handleSair()}
                  title="Sair"
                  className={`inline-flex items-center border border-[var(--line)] text-[var(--ink-soft)] transition hover:text-[var(--ink)] ${sidebarCollapsed ? 'justify-center p-2' : 'gap-1.5 px-3 py-1.5 text-xs'}`}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {!sidebarCollapsed && 'Sair'}
                </button>
                <button
                  onClick={toggleTheme}
                  title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                  className={`inline-flex items-center border border-[var(--line)] text-[var(--ink-soft)] transition hover:text-[var(--ink)] ${sidebarCollapsed ? 'justify-center p-2' : 'gap-1.5 px-3 py-1.5 text-xs'}`}
                  aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                >
                  {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  {!sidebarCollapsed && (theme === 'dark' ? 'Claro' : 'Escuro')}
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 min-h-screen">
          {/* Desktop / tablet header — hidden on mobile to avoid a large dead zone before content */}
          <header className="hidden border-b border-[var(--line)] px-6 py-4 md:block md:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-wrap items-center gap-4 text-sm md:gap-6">
                <div>
                  <div className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">Leads abertos</div>
                  <div className="mt-0.5 font-bold text-[var(--ink)]">{data.summary.openLeads}</div>
                </div>
                <div className="hidden h-7 w-px bg-[var(--line)] sm:block" />
                <div>
                  <div className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">Projetos ativos</div>
                  <div className="mt-0.5 font-bold text-[var(--ink)]">{data.summary.activeProjects}</div>
                </div>
                <div className="hidden h-7 w-px bg-[var(--line)] sm:block" />
                <div>
                  <div className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">Caixa líquido</div>
                  <div className="mt-0.5 font-bold text-[var(--ink)]">{formatCurrency(data.summary.netCash)}</div>
                </div>
              </div>
              {section === 'operacoes' ? renderOperationsViewSwitch(true) : null}
            </div>
          </header>

          <div className="space-y-6 px-4 pb-6 pt-3 sm:px-6 md:space-y-8 md:px-8 md:pb-8 md:pt-5">
            {section === 'operacoes' ? (
              <div className="md:hidden">
                {renderOperationsViewSwitch(true)}
              </div>
            ) : null}

            {section === 'dashboard' ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                  <MetricCard label="Leads no funil" value={String(pipelineLeads.length)} helper={`${formatCurrency(pipelineTotal)} em oportunidades ativas`} icon={TrendingUp} />
                  <MetricCard label="Em andamento" value={String(inProgressCount)} helper="Projetos em execução agora" icon={FolderKanban} />
                  <MetricCard label="Concluído aguardando pgto" value={formatCurrency(deliveredUnpaidTotal)} helper="Entregues com saldo ainda em aberto" icon={Banknote} />
                  <MetricCard label="Vendas no ano" value={formatCurrency(data.summary.currentYearSales)} helper="Valor contratado no ano corrente" icon={CircleDollarSign} />
                  <MetricCard label="Pendências abertas" value={String(totalPendingCount)} helper="Soma de pendências nos projetos ativos" icon={AlertTriangle} />
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
                              <div className="h-1.5 w-full overflow-hidden bg-[var(--line)]">
                                <div className="h-1.5 bg-[var(--teal)] transition-all duration-500" style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }} />
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
                      <div className="border border-[var(--line)] px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">Nenhum follow-up em atraso. Boa!</div>
                    ) : (
                      <div>
                        {overdueFollowUps.map((lead) => {
                          const meta = leadFollowUpMeta(lead)
                          return (
                            <div key={lead.id} className="flex items-start justify-between gap-3 border-b border-[var(--line)] py-3 text-sm last:border-b-0">
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

                <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
                  <Panel title="Concluídos aguardando pagamento" subtitle={`Projetos entregues com saldo em aberto — ${formatCurrency(deliveredUnpaidTotal)} a cobrar.`}>
                    <div>
                      {deliveredUnpaidProjects.length ? (
                        deliveredUnpaidProjects.map((project) => <DashboardProjectRow key={project.id} project={project} />)
                      ) : (
                        <div className="border border-[var(--line)] px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                          Nenhum projeto aguardando pagamento.
                        </div>
                      )}
                    </div>
                  </Panel>

                  <Panel title="Prazos nos próximos 30 dias" subtitle="Projetos com deadline se aproximando ou já vencido.">
                    {upcomingDeadlines.length === 0 ? (
                      <div className="border border-dashed border-[var(--line)] px-4 py-3 text-sm text-[var(--ink-soft)]">Nenhum prazo próximo ou vencido.</div>
                    ) : (
                      <div>
                        {upcomingDeadlines.map((sp) => {
                          const deadlineDate = parseDateValue(sp.deadline)
                          const todayDate = parseDateValue(today)
                          const daysLeft = deadlineDate && todayDate
                            ? Math.ceil((deadlineDate.getTime() - todayDate.getTime()) / 86400000)
                            : 0
                          const overdue = daysLeft < 0
                          const urgent = overdue || daysLeft <= 7
                          return (
                            <button
                              key={sp.id}
                              type="button"
                              onClick={() => openDashboardSubprojectCard(sp)}
                              className="flex w-full items-start justify-between gap-3 border-b border-[var(--line)] py-3 text-left text-sm transition hover:bg-[var(--paper)] last:border-b-0"
                            >
                              <div className="min-w-0">
                                <div className="truncate font-medium text-[var(--ink)]">{sp.project_name}</div>
                                <div className="truncate text-xs text-[var(--ink-soft)]">{stageLabel(sp.discipline)}</div>
                              </div>
                              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${urgent ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                                {overdue ? `${Math.abs(daysLeft)}d atrasado` : daysLeft === 0 ? 'hoje' : daysLeft === 1 ? 'amanhã' : `${daysLeft}d`}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </Panel>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <Panel title="Subprojetos ativos" subtitle="Subprojetos em andamento, em acompanhamento ou bloqueados." actions={
                    <div className="inline-flex border border-[var(--line)]">
                      {(['recent', 'stage', 'partner'] as const).map((opt) => (
                        <button key={opt} type="button" onClick={() => setSubprojectSort(opt)}
                          className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition ${subprojectSort === opt ? 'bg-[var(--teal)] text-white' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'}`}>
                          {opt === 'recent' ? 'Recente' : opt === 'stage' ? 'Etapa' : 'Parceiro'}
                        </button>
                      ))}
                    </div>
                  }>
                    <div>
                      {activeSubprojects.length ? (
                        activeSubprojects.map((sp) => <DashboardSubprojectRow key={sp.id} subproject={sp} />)
                      ) : (
                        <EmptyState title="Nenhum subprojeto ativo" body="Quando subprojetos entrarem em execução eles aparecem aqui." />
                      )}
                    </div>
                  </Panel>

                  <Panel title="Projetos bloqueados" subtitle="Fila rápida do que precisa destravar.">
                    <div>
                      {blockedProjects.length ? (
                        blockedProjects.map((project) => <DashboardProjectRow key={project.id} project={project} />)
                      ) : (
                        <div className="border border-[var(--line)] px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                          Nada bloqueado agora.
                        </div>
                      )}
                    </div>
                  </Panel>
                </div>

                {overdueLogs.length > 0 && (
                  <Panel title="Pendências com prazo vencido" subtitle="Tarefas internas com data de entrega passada nos projetos ativos.">
                    <div>
                      {overdueLogs.map((log) => {
                        const daysPast = Math.floor((Date.now() - new Date(log.due_date!).getTime()) / 86400000)
                        return (
                          <div key={log.id} className="flex items-start justify-between gap-3 border-b border-[var(--line)] py-3 text-sm last:border-b-0">
                            <div className="min-w-0">
                              <div className="truncate font-medium text-[var(--ink)]">{log.title || stageLabel(log.log_type)}</div>
                              <div className="truncate text-xs text-[var(--ink-soft)]">{log.project_name}</div>
                            </div>
                            <span className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              {daysPast === 0 ? 'venceu hoje' : `há ${daysPast}d`}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </Panel>
                )}

                <Panel title={`Caixa — ${mtdLabel}`} subtitle="Entradas e saídas do mês corrente.">
                  <div className="mb-5 grid gap-px border border-[var(--line)] sm:grid-cols-3">
                    <div className="border-b border-[var(--line)] px-4 py-3 text-sm sm:border-b-0 sm:border-r">
                      <div className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">Recebido no mês</div>
                      <div className="mt-2 text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(mtdReceived)}</div>
                    </div>
                    <div className="border-b border-[var(--line)] px-4 py-3 text-sm sm:border-b-0 sm:border-r">
                      <div className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">Saídas no mês</div>
                      <div className="mt-2 text-lg font-bold text-rose-600 dark:text-rose-400">{formatCurrency(mtdExpenses + mtdPayouts)}</div>
                    </div>
                    <div className="px-4 py-3 text-sm">
                      <div className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">Líquido do mês</div>
                      <div className={`mt-2 text-lg font-bold ${mtdNet >= 0 ? 'text-[var(--teal)]' : 'text-rose-600 dark:text-rose-400'}`}>{mtdNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(mtdNet))}</div>
                    </div>
                  </div>
                  {data.cashflow.length === 0 ? (
                    <EmptyState title="Sem movimentação ainda" body="Registre recebimentos e despesas no Financeiro." />
                  ) : (
                    <div>
                      {data.cashflow.slice(0, 6).map((entry) => (
                        <div key={`${entry.entry_type}-${entry.id}`} className="flex items-center justify-between gap-3 border-b border-[var(--line)] py-3 text-sm last:border-b-0">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-[var(--ink)]">{entry.project_name}</div>
                            <div className="text-[var(--ink-soft)]">{stageLabel(entry.entry_type)}{sanitizeCashflowText(entry.counterpart) ? ` - ${sanitizeCashflowText(entry.counterpart)}` : ''}</div>
                          </div>
                          <div className={`shrink-0 font-semibold ${entry.signed_amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
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
                        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 text-sm">
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
                                const salesDate = project.sale_recorded_at || project.created_at
                                return (
                                  <tr key={project.id} className="cursor-pointer transition hover:bg-[var(--teal-active-bg)]">
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

                {/* Hidden file input for proposal upload */}
                <input
                  ref={proposalInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && uploadTargetLeadId) handleProposalUpload(uploadTargetLeadId, file)
                    e.target.value = ''
                  }}
                />

                {/* Toolbar: search + new lead */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-soft)]" />
                    <input className="w-full border border-[var(--line)] bg-transparent py-2.5 pl-10 pr-4 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-soft)] focus:border-[var(--teal)]" placeholder="Buscar leads..." value={commercialSearch} onChange={(e) => setCommercialSearch(e.target.value)} />
                  </div>
                  <button type="button" className="inline-flex items-center gap-2 bg-[var(--teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90" onClick={() => setShowLeadModal(true)}>
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
                                    <DraggableLeadCard key={lead.id} lead={lead} active={selectedLeadId === lead.id} onClick={selectLead} />
                                  ))
                                ) : (
                                  <div className="border border-dashed border-[var(--line)] p-4 text-sm text-[var(--ink-soft)]">Nenhum lead aqui.</div>
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
                          <tr><th className="pb-3">Lead</th><th className="pb-3">Cliente</th><th className="pb-3">Valor</th><th className="pb-3">Responsável</th><th className="pb-3">Origem</th><th className="pb-3">Próx. follow-up</th><th className="pb-3">Etapa</th><th className="pb-3">Ações</th></tr>
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
                                <tr key={lead.id} className="cursor-pointer transition hover:bg-[var(--teal-active-bg)]" onClick={() => selectLead(lead.id)}>
                                  <td className="py-4 font-medium text-[var(--ink)]">{lead.title}</td>
                                  <td className="py-4 text-[var(--ink-soft)]">{lead.client_name || '—'}</td>
                                  <td className="py-4 text-[var(--ink-soft)]">{formatCurrency(numericValue(lead.estimated_amount))}</td>
                                  <td className="py-4 text-[var(--ink-soft)]">{lead.sales_owner || '—'}</td>
                                  <td className="py-4 text-[var(--ink-soft)]">{stageLabel(lead.source || '') || '—'}</td>
                                  <td className="py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${followUp.tone}`}>{formatDate(lead.next_follow_up_at)}</span></td>
                                  <td className="py-4"><span className="rounded-full border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-1 text-xs font-medium text-[var(--ink)]">{stageLabel(lead.stage)}</span></td>
                                  <td className="py-4" onClick={(e) => e.stopPropagation()}>
                                    {lead.proposal_filename ? (
                                      <div className="flex items-center gap-1.5">
                                        <a href={`/api/app/proposal?leadId=${lead.id}`} target="_blank" rel="noopener noreferrer" title={lead.proposal_filename} className="inline-flex items-center gap-1 border border-[var(--line)] px-2 py-1 text-xs text-[var(--ink-soft)] transition hover:border-[var(--teal)] hover:text-[var(--teal)]">
                                          <FileText className="h-3.5 w-3.5" /> Ver
                                        </a>
                                        <button type="button" title="Substituir proposta" className="inline-flex items-center gap-1 border border-[var(--line)] px-2 py-1 text-xs text-[var(--ink-soft)] transition hover:border-[var(--teal)] hover:text-[var(--teal)]" onClick={() => { setUploadTargetLeadId(lead.id); proposalInputRef.current?.click() }}>
                                          <Upload className="h-3.5 w-3.5" />
                                        </button>
                                        <button type="button" title="Remover proposta" className="inline-flex items-center gap-1 border border-[var(--line)] px-2 py-1 text-xs text-[var(--ink-soft)] transition hover:border-rose-400 hover:text-rose-500" onClick={() => void submitMutation('deleteLeadProposal', { leadId: lead.id }, undefined, 'Proposta removida')}>
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button type="button" className="inline-flex items-center gap-1 border border-dashed border-[var(--line)] px-2 py-1 text-xs text-[var(--ink-soft)] transition hover:border-[var(--teal)] hover:text-[var(--teal)]" onClick={() => { setUploadTargetLeadId(lead.id); proposalInputRef.current?.click() }}>
                                        <Upload className="h-3.5 w-3.5" /> PDF
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Panel>

                {/* Won/lost history (collapsed) */}
                <div className="border border-[var(--line)]">
                  <button type="button" className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-[var(--ink)]" onClick={() => setShowWonLost(!showWonLost)}>
                    <span>Histórico (Fechados / Não fechados)</span>
                    <ChevronDown className={`h-4 w-4 transition ${showWonLost ? 'rotate-180' : ''}`} />
                  </button>
                  {showWonLost && (
                    <div className="border-t border-[var(--line)] px-5 py-4">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="text-[var(--ink-soft)]">
                            <tr><th className="pb-3">Lead</th><th className="pb-3">Cliente</th><th className="pb-3">Valor</th><th className="pb-3">Responsável</th><th className="pb-3">Fechado em</th><th className="pb-3">Resultado</th><th className="pb-3">Proposta</th></tr>
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
                                <tr key={lead.id} className="cursor-pointer transition hover:bg-[var(--teal-active-bg)]" onClick={() => selectLead(lead.id)}>
                                  <td className="py-3 font-medium text-[var(--ink)]">{lead.title}</td>
                                  <td className="py-3 text-[var(--ink-soft)]">{lead.client_name || '—'}</td>
                                  <td className="py-3 text-[var(--ink-soft)]">{formatCurrency(numericValue(lead.estimated_amount))}</td>
                                  <td className="py-3 text-[var(--ink-soft)]">{lead.sales_owner || '—'}</td>
                                  <td className="py-3 text-[var(--ink-soft)]">{formatDate(lead.closed_at)}</td>
                                  <td className="py-3">
                                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${lead.stage === 'won' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                                      {stageLabel(lead.stage)}
                                    </span>
                                  </td>
                                  <td className="py-3" onClick={(e) => e.stopPropagation()}>
                                    {lead.proposal_filename ? (
                                      <a href={`/api/app/proposal?leadId=${lead.id}`} target="_blank" rel="noopener noreferrer" title={lead.proposal_filename} className="inline-flex items-center gap-1 border border-[var(--line)] px-2 py-1 text-xs text-[var(--ink-soft)] transition hover:border-[var(--teal)] hover:text-[var(--teal)]">
                                        <FileText className="h-3.5 w-3.5" /> Ver
                                      </a>
                                    ) : (
                                      <span className="text-xs text-[var(--ink-soft)]">—</span>
                                    )}
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
                    onClose={() => selectLead(null)}
                    lead={selectedLead}
                    draft={leadDetailForm}
                    onChange={handleLeadDetailChange}
                    onTouch={() => void handleLeadTouch()}
                    onConvert={() => {
                      setConvertForm({
                        leadId: selectedLead.id,
                        clientName: selectedLead.client_name || '',
                        name: selectedLead.title,
                        area: '',
                        contractAmount: String(selectedLead.estimated_amount || ''),
                        salesOwner: selectedLead.sales_owner || '',
                        firstContactAt: toDateInputValue(selectedLead.first_contact_at),
                        proposalSentAt: toDateInputValue(selectedLead.proposal_sent_at),
                        closedAt: toDateInputValue(selectedLead.closed_at) || new Date().toISOString().slice(0, 10),
                        subprojects: [{ discipline: '', amount: String(selectedLead.estimated_amount || ''), responsiblePartner: '', deadline: '' }],
                      })
                      setShowConvertModal(true)
                    }}
                    timelineItems={selectedLeadTimeline}
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
                      selectLead(null)
                    }, 'Projeto criado com sucesso')
                  }}
                  mutating={mutating}
                />
              </>
            ) : null}

            {section === 'operacoes' ? (
              opsView === 'revisoes' ? (
                <RevisoesKanbanPage data={data} submitMutation={submitMutation} mutating={mutating} />
              ) : (
                <OperationsKanbanPage data={data} submitMutation={submitMutation} mutating={mutating} />
              )
            ) : null}

            {section === 'financeiro' ? (
              <FinancialPage data={data} submitMutation={submitMutation} mutating={mutating} />
            ) : null}

            {section === 'fluxo' ? (
              <CashflowPage data={data} submitMutation={submitMutation} mutating={mutating} />
            ) : null}

            {section === 'database' ? (
              <DatabasePage data={data} submitMutation={submitMutation} mutating={mutating} />
            ) : null}
          </div>
        </main>
      </div>

      <Toaster richColors position="top-right" />
      <InstallPrompt />
    </div>
  )
}
