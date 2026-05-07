import { useEffect, useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FolderKanban,
  HandCoins,
  Landmark,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Plus,
  ReceiptText,
  TrendingUp,
} from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { getBootstrap, getSession, login, logout, mutate } from '@/lib/app-api'
import type {
  BootstrapData,
  CashflowEntry,
  Lead,
  Project,
  ProjectLog,
  SessionUser,
} from '@/types/app'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Painel', href: '/app/dashboard', icon: LayoutDashboard },
  { key: 'commercial', label: 'Comercial', href: '/app/commercial', icon: BriefcaseBusiness },
  { key: 'operations', label: 'Operações', href: '/app/operations', icon: FolderKanban },
  { key: 'financial', label: 'Financeiro', href: '/app/financial', icon: CircleDollarSign },
  { key: 'cashflow', label: 'Fluxo de caixa', href: '/app/cashflow', icon: Landmark },
]

const leadStages = ['incoming', 'proposal', 'negotiation', 'won', 'lost']
const projectStages = ['proposal', 'waiting-files', 'in-progress', 'review', 'delivered', 'closed']
const logTypes = ['pending', 'received_material', 'note', 'delivery', 'revision']
const partners = ['Matheus', 'Luís', 'Letícia']

const LABELS: Record<string, string> = {
  dashboard: 'Painel',
  commercial: 'Comercial',
  operations: 'Operações',
  financial: 'Financeiro',
  cashflow: 'Fluxo de caixa',
  incoming: 'Entrada',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  won: 'Fechado',
  lost: 'Não fechado',
  'waiting-files': 'Aguardando arquivos',
  'in-progress': 'Em andamento',
  review: 'Acompanhamento',
  delivered: 'Entregue',
  closed: 'Concluído',
  pending: 'Pendência',
  received_material: 'Material recebido',
  note: 'Nota',
  delivery: 'Entrega',
  revision: 'Revisão',
  receipt: 'Recebimento',
  expense: 'Despesa',
  payout: 'Repasse',
  open: 'Aberto',
  done: 'Concluído',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value))
}

function stageLabel(value: string) {
  return LABELS[value] || value
}

function stageTone(stage: string) {
  const normalized = stage.toLowerCase()
  if (['won', 'delivered', 'closed', 'done'].includes(normalized)) return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
  if (['lost'].includes(normalized)) return 'bg-rose-500/10 text-rose-700 border-rose-500/20'
  if (['review', 'waiting-files', 'negotiation'].includes(normalized)) return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
  return 'bg-[rgba(15,139,141,0.12)] text-[var(--teal)] border-[rgba(15,139,141,0.18)]'
}

function numericValue(value: unknown) {
  return Number(value || 0)
}

function monthTotals(entries: CashflowEntry[]) {
  const monthKey = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit' }).format(new Date())
  return entries.reduce(
    (acc, entry) => {
      const entryKey = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit' }).format(new Date(entry.entry_date))
      if (entryKey !== monthKey) return acc
      if (entry.entry_type === 'receipt') acc.receipts += numericValue(entry.amount)
      if (entry.entry_type === 'expense') acc.expenses += numericValue(entry.amount)
      if (entry.entry_type === 'payout') acc.payouts += numericValue(entry.amount)
      return acc
    },
    { receipts: 0, expenses: 0, payouts: 0 },
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[28px] border border-[var(--line)] bg-white/75 p-8 text-sm text-[var(--ink-soft)] shadow-[0_20px_60px_rgba(7,19,21,0.05)]">
      <div className="font-semibold text-[var(--ink)]">{title}</div>
      <p className="mt-2 max-w-xl leading-6">{body}</p>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="rounded-[28px] border border-[var(--line)] bg-white/78 p-5 shadow-[0_20px_60px_rgba(7,19,21,0.05)] backdrop-blur-sm md:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[var(--ink-soft)]">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string
  value: string
  helper: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,245,242,0.94))] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]/70">{label}</div>
          <div className="mt-3 text-3xl font-semibold text-[var(--ink)]">{value}</div>
        </div>
        <div className="rounded-2xl border border-[rgba(15,139,141,0.14)] bg-[rgba(15,139,141,0.08)] p-3 text-[var(--teal)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 text-sm text-[var(--ink-soft)]">{helper}</div>
    </div>
  )
}

function ProjectStrip({
  project,
  onStageChange,
}: {
  project: Project
  onStageChange: (projectId: string, stage: string) => void
}) {
  const outstanding = numericValue(project.contract_amount) - numericValue(project.total_received)

  return (
    <div className="rounded-[26px] border border-[var(--line)] bg-[rgba(255,255,255,0.78)] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-[var(--ink)]">{project.name}</h3>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${stageTone(project.stage)}`}>
              {stageLabel(project.stage)}
            </span>
          </div>
          <div className="mt-2 text-sm text-[var(--ink-soft)]">
            {project.client_name || 'Cliente não informado'}
            {project.code ? ` · ${project.code}` : ''}
            {project.discipline ? ` · ${project.discipline}` : ''}
          </div>
        </div>

        <label className="text-sm text-[var(--ink-soft)]">
          <span className="mb-2 block text-xs uppercase tracking-[0.16em]">Etapa</span>
          <select
            className="rounded-2xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none"
            value={project.stage}
            onChange={(event) => onStageChange(project.id, event.target.value)}
          >
            {projectStages.map((stage) => (
              <option key={stage} value={stage}>
                {stageLabel(stage)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[rgba(15,139,141,0.12)] bg-[rgba(15,139,141,0.06)] p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/75">Comercial</div>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[var(--ink)]">
            <span>Responsável</span>
            <strong>{project.sales_owner || '—'}</strong>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[var(--ink)]">
            <span>Contrato</span>
            <strong>{formatCurrency(numericValue(project.contract_amount))}</strong>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.85)] p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/75">Operações</div>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[var(--ink)]">
            <span>Pendências</span>
            <strong>{numericValue(project.pending_count)}</strong>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[var(--ink)]">
            <span>Próximo prazo</span>
            <strong>{formatDate(project.next_pending_due || project.deadline)}</strong>
          </div>
        </div>

        <div className="rounded-2xl border border-[rgba(7,19,21,0.08)] bg-[rgba(7,19,21,0.04)] p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/75">Financeiro</div>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[var(--ink)]">
            <span>Recebido</span>
            <strong>{formatCurrency(numericValue(project.total_received))}</strong>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[var(--ink)]">
            <span>Em aberto</span>
            <strong>{formatCurrency(outstanding)}</strong>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[var(--ink)]">
            <span>Repasses</span>
            <strong>{formatCurrency(numericValue(project.total_payouts))}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await onLogin(email, password)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f6f2_0%,#efeee8_100%)] px-4 py-8 text-[var(--ink)] md:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="relative overflow-hidden rounded-[40px] border border-[var(--line)] bg-[radial-gradient(circle_at_top_left,rgba(15,139,141,0.12),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,245,242,0.88))] p-8 shadow-[0_35px_90px_rgba(7,19,21,0.08)] md:p-10">
          <div className="max-w-xl">
            <div className="inline-flex rounded-full border border-[rgba(15,139,141,0.16)] bg-[rgba(15,139,141,0.08)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--teal)]">
              Apolo / App
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-[var(--ink)] md:text-5xl">
              Comercial, operação e caixa no mesmo painel.
            </h1>
            <p className="mt-5 text-base leading-7 text-[var(--ink-soft)]">
              O app mantém a cara da Apolo, mas funciona como uma mesa operacional de verdade: pipeline, andamento dos projetos, recebimentos, despesas e repasses no mesmo lugar.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <MetricCard label="Comercial" value="Pipeline" helper="Quem vendeu, quanto vale e em que pé está." icon={TrendingUp} />
            <MetricCard label="Operações" value="Andamento" helper="Materiais recebidos, pendências e prazos." icon={ClipboardList} />
            <MetricCard label="Financeiro" value="Caixa" helper="Recebimentos, despesas, repasses e fluxo limpo." icon={Banknote} />
          </div>
        </section>

        <section className="flex items-center">
          <form
            onSubmit={submit}
            className="w-full rounded-[32px] border border-[var(--line)] bg-white/85 p-8 shadow-[0_25px_70px_rgba(7,19,21,0.08)] backdrop-blur-sm"
          >
            <h2 className="text-2xl font-semibold">Entrar na operação</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
              Acesso simples só para os sócios por enquanto. As credenciais vêm das variáveis de ambiente.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-[var(--ink)]">
                Usuário
                <input
                  className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 outline-none transition focus:border-[rgba(15,139,141,0.24)]"
                  type="text"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="matheus"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-[var(--ink)]">
                Senha
                <input
                  className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 outline-none transition focus:border-[rgba(15,139,141,0.24)]"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 py-3 font-medium text-white transition hover:bg-[var(--ink-soft)] disabled:opacity-60"
            >
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Entrar no app
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

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
  })
  const [projectForm, setProjectForm] = useState({
    clientName: '',
    name: '',
    code: '',
    discipline: '',
    stage: 'proposal',
    contractAmount: '',
    salesOwner: '',
    deadline: '',
    statusNote: '',
  })
  const [logForm, setLogForm] = useState({
    projectId: '',
    logType: 'pending',
    title: '',
    details: '',
    dueDate: '',
    status: 'open',
  })
  const [receiptForm, setReceiptForm] = useState({ projectId: '', amount: '', bankAccount: '', entryDate: '', note: '' })
  const [expenseForm, setExpenseForm] = useState({
    projectId: '',
    amount: '',
    category: '',
    bankAccount: '',
    vendor: '',
    entryDate: '',
    note: '',
  })
  const [payoutForm, setPayoutForm] = useState({
    projectId: '',
    partnerName: partners[0],
    amount: '',
    bankAccount: '',
    entryDate: '',
    note: '',
  })

  const section = location.pathname.replace('/app/', '').replace('/app', '') || 'dashboard'

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

  const openProjectOptions = data?.projects.map((project) => ({ id: project.id, name: project.name })) || []
  const recentPending = useMemo(
    () => (data?.logs || []).filter((item) => item.log_type === 'pending' && item.status !== 'done').slice(0, 8),
    [data?.logs],
  )
  const monthly = useMemo(() => monthTotals(data?.cashflow || []), [data?.cashflow])

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

  const dashboardProjects = data.projects.slice(0, 5)

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
                <h2 className="mt-2 text-3xl font-semibold capitalize">
                  {stageLabel(section)}
                </h2>
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
                <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
                  <MetricCard label="Contratos" value={formatCurrency(data.summary.contractTotal)} helper="Valor contratado somado dos projetos acompanhados." icon={ReceiptText} />
                  <MetricCard label="Recebido" value={formatCurrency(data.summary.receivedTotal)} helper="Dinheiro efetivamente pago pelos clientes." icon={ArrowDownCircle} />
                  <MetricCard label="Despesas" value={formatCurrency(data.summary.expenseTotal)} helper="Saídas operacionais já registradas." icon={ArrowUpCircle} />
                  <MetricCard label="Em aberto" value={formatCurrency(data.summary.outstandingTotal)} helper="Quanto ainda falta receber sobre os contratos." icon={HandCoins} />
                </div>

                <Panel
                  title="Faixa de projetos"
                  subtitle="Essa é a assinatura do app: cada projeto mostra comercial, operação e financeiro numa faixa só."
                >
                  <div className="space-y-4">
                    {dashboardProjects.length ? (
                      dashboardProjects.map((project) => (
                        <ProjectStrip
                          key={project.id}
                          project={project}
                          onStageChange={(projectId, stage) => {
                            void submitMutation('updateProjectStage', { id: projectId, stage }, undefined, 'Etapa do projeto atualizada')
                          }}
                        />
                      ))
                    ) : (
                      <EmptyState title="Nenhum projeto ainda" body="Crie o primeiro projeto no Comercial e o painel começa a respirar." />
                    )}
                  </div>
                </Panel>

                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <Panel title="Pendências urgentes" subtitle="Pendências abertas e documentos faltando sobem para cá.">
                    <div className="space-y-3">
                      {recentPending.length ? (
                        recentPending.map((item: ProjectLog) => (
                          <div key={item.id} className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="font-medium text-[var(--ink)]">{item.title}</div>
                              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${stageTone(item.status)}`}>
                                {stageLabel(item.status)}
                              </span>
                            </div>
                            <div className="mt-1 text-[var(--ink-soft)]">{item.project_name}</div>
                            {item.details ? <p className="mt-3 leading-6 text-[var(--ink-soft)]">{item.details}</p> : null}
                            <div className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/70">
                              Prazo {formatDate(item.due_date)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState title="Sem pendências críticas" body="Bom sinal. Registre pendências em Operações quando documentos, aprovações ou revisões começarem a acumular." />
                      )}
                    </div>
                  </Panel>

                  <Panel title="Movimentação recente" subtitle="Leitura rápida do que realmente girou no caixa.">
                    <div className="space-y-3">
                      {data.cashflow.slice(0, 8).map((entry) => (
                        <div key={`${entry.entry_type}-${entry.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                          <div>
                            <div className="font-medium text-[var(--ink)]">{entry.project_name}</div>
                            <div className="text-[var(--ink-soft)]">
                              {stageLabel(entry.entry_type)} {entry.counterpart ? `· ${entry.counterpart}` : ''}
                            </div>
                          </div>
                          <div className={`font-semibold ${entry.signed_amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {entry.signed_amount >= 0 ? '+' : '-'}
                            {formatCurrency(Math.abs(numericValue(entry.signed_amount)))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>
              </>
            ) : null}

            {section === 'commercial' ? (
              <>
                <div className="grid gap-6 xl:grid-cols-2">
                  <Panel title="Novo lead" subtitle="Entrada comercial rápida.">
                    <form
                      className="grid gap-4 md:grid-cols-2"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void submitMutation('createLead', leadForm, () => {
                          setLeadForm({ clientName: '', title: '', stage: 'incoming', source: '', estimatedAmount: '', salesOwner: '', notes: '' })
                        }, 'Lead criado')
                      }}
                    >
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Nome do cliente" value={leadForm.clientName} onChange={(event) => setLeadForm((current) => ({ ...current, clientName: event.target.value }))} required />
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Nome do lead" value={leadForm.title} onChange={(event) => setLeadForm((current) => ({ ...current, title: event.target.value }))} required />
                      <select className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={leadForm.stage} onChange={(event) => setLeadForm((current) => ({ ...current, stage: event.target.value }))}>
                        {leadStages.map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}
                      </select>
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Origem" value={leadForm.source} onChange={(event) => setLeadForm((current) => ({ ...current, source: event.target.value }))} />
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Valor estimado" type="number" value={leadForm.estimatedAmount} onChange={(event) => setLeadForm((current) => ({ ...current, estimatedAmount: event.target.value }))} />
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Responsável comercial" value={leadForm.salesOwner} onChange={(event) => setLeadForm((current) => ({ ...current, salesOwner: event.target.value }))} />
                      <textarea className="md:col-span-2 min-h-28 rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Observações" value={leadForm.notes} onChange={(event) => setLeadForm((current) => ({ ...current, notes: event.target.value }))} />
                      <button className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 py-3 text-white" disabled={mutating}>
                        <Plus className="h-4 w-4" /> Adicionar lead
                      </button>
                    </form>
                  </Panel>

                  <Panel title="Novo projeto" subtitle="Use quando um lead virar trabalho de verdade.">
                    <form
                      className="grid gap-4 md:grid-cols-2"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void submitMutation('createProject', projectForm, () => {
                          setProjectForm({ clientName: '', name: '', code: '', discipline: '', stage: 'proposal', contractAmount: '', salesOwner: '', deadline: '', statusNote: '' })
                        }, 'Projeto criado')
                      }}
                    >
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Nome do cliente" value={projectForm.clientName} onChange={(event) => setProjectForm((current) => ({ ...current, clientName: event.target.value }))} required />
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Nome do projeto" value={projectForm.name} onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))} required />
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Código do projeto" value={projectForm.code} onChange={(event) => setProjectForm((current) => ({ ...current, code: event.target.value }))} />
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Disciplina" value={projectForm.discipline} onChange={(event) => setProjectForm((current) => ({ ...current, discipline: event.target.value }))} />
                      <select className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={projectForm.stage} onChange={(event) => setProjectForm((current) => ({ ...current, stage: event.target.value }))}>
                        {projectStages.map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}
                      </select>
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Valor do contrato" type="number" value={projectForm.contractAmount} onChange={(event) => setProjectForm((current) => ({ ...current, contractAmount: event.target.value }))} />
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Responsável comercial" value={projectForm.salesOwner} onChange={(event) => setProjectForm((current) => ({ ...current, salesOwner: event.target.value }))} />
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="date" value={projectForm.deadline} onChange={(event) => setProjectForm((current) => ({ ...current, deadline: event.target.value }))} />
                      <textarea className="md:col-span-2 min-h-28 rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Observação de status" value={projectForm.statusNote} onChange={(event) => setProjectForm((current) => ({ ...current, statusNote: event.target.value }))} />
                      <button className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 py-3 text-white" disabled={mutating}>
                        <Plus className="h-4 w-4" /> Adicionar projeto
                      </button>
                    </form>
                  </Panel>
                </div>

                <Panel title="Pipeline comercial" subtitle="O comercial precisa continuar brutalmente visível.">
                  {data.leads.length ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="text-[var(--ink-soft)]">
                          <tr>
                            <th className="pb-3">Lead</th>
                            <th className="pb-3">Cliente</th>
                            <th className="pb-3">Valor</th>
                            <th className="pb-3">Responsável</th>
                            <th className="pb-3">Etapa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--line)]">
                          {data.leads.map((lead: Lead) => (
                            <tr key={lead.id}>
                              <td className="py-4 font-medium text-[var(--ink)]">{lead.title}</td>
                              <td className="py-4 text-[var(--ink-soft)]">{lead.client_name || '—'}</td>
                              <td className="py-4 text-[var(--ink-soft)]">{formatCurrency(numericValue(lead.estimated_amount))}</td>
                              <td className="py-4 text-[var(--ink-soft)]">{lead.sales_owner || '—'}</td>
                              <td className="py-4">
                                <select
                                  className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-xs"
                                  value={lead.stage}
                                  onChange={(event) => {
                                    void submitMutation('updateLeadStage', { id: lead.id, stage: event.target.value }, undefined, 'Lead atualizado')
                                  }}
                                >
                                  {leadStages.map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState title="Sem leads ainda" body="Use o formulário acima para o comercial parar de viver em conversa solta e resto de Notion." />
                  )}
                </Panel>
              </>
            ) : null}

            {section === 'operations' ? (
              <>
                <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                  <Panel title="Registrar movimentação" subtitle="Material recebido, pendência, revisão — a bagunça real do projeto entra aqui.">
                    <form
                      className="grid gap-4"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void submitMutation('addProjectLog', logForm, () => {
                          setLogForm({ projectId: '', logType: 'pending', title: '', details: '', dueDate: '', status: 'open' })
                        }, 'Movimentação registrada')
                      }}
                    >
                      <select className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={logForm.projectId} onChange={(event) => setLogForm((current) => ({ ...current, projectId: event.target.value }))} required>
                        <option value="">Selecione o projeto</option>
                        {openProjectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                      </select>
                      <div className="grid gap-4 md:grid-cols-2">
                        <select className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={logForm.logType} onChange={(event) => setLogForm((current) => ({ ...current, logType: event.target.value }))}>
                          {logTypes.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}
                        </select>
                        <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="date" value={logForm.dueDate} onChange={(event) => setLogForm((current) => ({ ...current, dueDate: event.target.value }))} />
                      </div>
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Título" value={logForm.title} onChange={(event) => setLogForm((current) => ({ ...current, title: event.target.value }))} required />
                      <textarea className="min-h-28 rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Detalhes" value={logForm.details} onChange={(event) => setLogForm((current) => ({ ...current, details: event.target.value }))} />
                      <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 py-3 text-white" disabled={mutating}>
                        <Plus className="h-4 w-4" /> Adicionar movimentação
                      </button>
                    </form>
                  </Panel>

                  <Panel title="Faixa de projetos" subtitle="A operação fica mais limpa quando cada projeto mostra o pulso num relance.">
                    <div className="space-y-4">
                      {data.projects.length ? (
                        data.projects.map((project) => (
                          <ProjectStrip key={project.id} project={project} onStageChange={(projectId, stage) => {
                            void submitMutation('updateProjectStage', { id: projectId, stage }, undefined, 'Etapa do projeto atualizada')
                          }} />
                        ))
                      ) : (
                        <EmptyState title="Nenhum projeto acompanhado" body="Crie um projeto no Comercial para começar a registrar operação e prazos." />
                      )}
                    </div>
                  </Panel>
                </div>

                <Panel title="Registros operacionais recentes" subtitle="Isso vira o diário do projeto em vez de caçar contexto no WhatsApp e no Notion.">
                  {data.logs.length ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {data.logs.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-medium text-[var(--ink)]">{item.title}</div>
                            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${stageTone(item.status)}`}>
                              {stageLabel(item.log_type)}
                            </span>
                          </div>
                          <div className="mt-1 text-[var(--ink-soft)]">{item.project_name}</div>
                          {item.details ? <p className="mt-3 leading-6 text-[var(--ink-soft)]">{item.details}</p> : null}
                          <div className="mt-3 flex flex-wrap gap-4 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/70">
                            <span>{formatDate(item.created_at)}</span>
                            {item.due_date ? <span>Prazo {formatDate(item.due_date)}</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="Sem movimentação operacional ainda" body="Registre materiais recebidos, pendências e revisões aqui para a execução parar de depender da memória." />
                  )}
                </Panel>
              </>
            ) : null}

            {section === 'financial' ? (
              <>
                <div className="grid gap-6 xl:grid-cols-3">
                  <Panel title="Recebimento de cliente" subtitle="Registre toda entrada, inclusive pagamentos parciais.">
                    <form
                      className="grid gap-4"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void submitMutation('addReceipt', receiptForm, () => {
                          setReceiptForm({ projectId: '', amount: '', bankAccount: '', entryDate: '', note: '' })
                        }, 'Receipt added')
                      }}
                    >
                      <select className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={receiptForm.projectId} onChange={(event) => setReceiptForm((current) => ({ ...current, projectId: event.target.value }))} required>
                        <option value="">Selecione o projeto</option>
                        {openProjectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                      </select>
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="number" placeholder="Valor" value={receiptForm.amount} onChange={(event) => setReceiptForm((current) => ({ ...current, amount: event.target.value }))} required />
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Conta bancária" value={receiptForm.bankAccount} onChange={(event) => setReceiptForm((current) => ({ ...current, bankAccount: event.target.value }))} />
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="date" value={receiptForm.entryDate} onChange={(event) => setReceiptForm((current) => ({ ...current, entryDate: event.target.value }))} />
                      <textarea className="min-h-24 rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Observação" value={receiptForm.note} onChange={(event) => setReceiptForm((current) => ({ ...current, note: event.target.value }))} />
                      <button className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-white" disabled={mutating}>Salvar recebimento</button>
                    </form>
                  </Panel>

                  <Panel title="Despesa do projeto" subtitle="Mantenha as saídas amarradas ao projeto certo.">
                    <form
                      className="grid gap-4"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void submitMutation('addExpense', expenseForm, () => {
                          setExpenseForm({ projectId: '', amount: '', category: '', bankAccount: '', vendor: '', entryDate: '', note: '' })
                        }, 'Expense added')
                      }}
                    >
                      <select className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={expenseForm.projectId} onChange={(event) => setExpenseForm((current) => ({ ...current, projectId: event.target.value }))} required>
                        <option value="">Selecione o projeto</option>
                        {openProjectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                      </select>
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="number" placeholder="Valor" value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} required />
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Categoria" value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))} />
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Fornecedor" value={expenseForm.vendor} onChange={(event) => setExpenseForm((current) => ({ ...current, vendor: event.target.value }))} />
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Conta bancária" value={expenseForm.bankAccount} onChange={(event) => setExpenseForm((current) => ({ ...current, bankAccount: event.target.value }))} />
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="date" value={expenseForm.entryDate} onChange={(event) => setExpenseForm((current) => ({ ...current, entryDate: event.target.value }))} />
                      <textarea className="min-h-24 rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Observação" value={expenseForm.note} onChange={(event) => setExpenseForm((current) => ({ ...current, note: event.target.value }))} />
                      <button className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-white" disabled={mutating}>Salvar despesa</button>
                    </form>
                  </Panel>

                  <Panel title="Repasse para sócio" subtitle="Repasses parciais ficam em logs, não em total fake.">
                    <form
                      className="grid gap-4"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void submitMutation('addPayout', payoutForm, () => {
                          setPayoutForm({ projectId: '', partnerName: partners[0], amount: '', bankAccount: '', entryDate: '', note: '' })
                        }, 'Payout added')
                      }}
                    >
                      <select className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={payoutForm.projectId} onChange={(event) => setPayoutForm((current) => ({ ...current, projectId: event.target.value }))} required>
                        <option value="">Selecione o projeto</option>
                        {openProjectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                      </select>
                      <select className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={payoutForm.partnerName} onChange={(event) => setPayoutForm((current) => ({ ...current, partnerName: event.target.value }))}>
                        {partners.map((partner) => <option key={partner} value={partner}>{partner}</option>)}
                      </select>
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="number" placeholder="Valor" value={payoutForm.amount} onChange={(event) => setPayoutForm((current) => ({ ...current, amount: event.target.value }))} required />
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Conta bancária" value={payoutForm.bankAccount} onChange={(event) => setPayoutForm((current) => ({ ...current, bankAccount: event.target.value }))} />
                      <input className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="date" value={payoutForm.entryDate} onChange={(event) => setPayoutForm((current) => ({ ...current, entryDate: event.target.value }))} />
                      <textarea className="min-h-24 rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" placeholder="Observação" value={payoutForm.note} onChange={(event) => setPayoutForm((current) => ({ ...current, note: event.target.value }))} />
                      <button className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-white" disabled={mutating}>Salvar repasse</button>
                    </form>
                  </Panel>
                </div>

                <Panel title="Resumo financeiro por projeto" subtitle="O financeiro é baseado em logs, mas essa visão resume a obra sem perder os registros de origem.">
                  {data.projects.length ? (
                    <div className="space-y-4">
                      {data.projects.map((project) => {
                        const net = numericValue(project.total_received) - numericValue(project.total_expenses) - numericValue(project.total_payouts)
                        return (
                          <div key={project.id} className="grid gap-4 rounded-[26px] border border-[var(--line)] bg-white/80 p-5 md:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]">
                            <div>
                              <div className="font-semibold text-[var(--ink)]">{project.name}</div>
                              <div className="mt-1 text-sm text-[var(--ink-soft)]">{project.client_name || '—'} · {project.sales_owner || 'Sem responsável comercial'}</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Contrato</div>
                              <div className="mt-2 font-semibold">{formatCurrency(numericValue(project.contract_amount))}</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Recebido</div>
                              <div className="mt-2 font-semibold text-emerald-700">{formatCurrency(numericValue(project.total_received))}</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Despesas</div>
                              <div className="mt-2 font-semibold text-rose-700">{formatCurrency(numericValue(project.total_expenses))}</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Net</div>
                              <div className={`mt-2 font-semibold ${net >= 0 ? 'text-[var(--ink)]' : 'text-rose-700'}`}>{formatCurrency(net)}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <EmptyState title="Sem resumo financeiro ainda" body="Assim que você adicionar projetos e logs, essa página começa a mostrar a anatomia financeira de cada trabalho." />
                  )}
                </Panel>
              </>
            ) : null}

            {section === 'cashflow' ? (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <MetricCard label="Este mês" value={formatCurrency(monthly.receipts)} helper="Dinheiro que entrou dos clientes." icon={ArrowDownCircle} />
                  <MetricCard label="Despesas" value={formatCurrency(monthly.expenses)} helper="Saídas operacionais do mês." icon={ArrowUpCircle} />
                  <MetricCard label="Repasses" value={formatCurrency(monthly.payouts)} helper="Repasses aos sócios neste mês." icon={HandCoins} />
                  <MetricCard label="Net" value={formatCurrency(monthly.receipts - monthly.expenses - monthly.payouts)} helper="Movimentação líquida do mês." icon={Landmark} />
                </div>

                <Panel title="Livro-caixa unificado" subtitle="Recebimentos, despesas e repasses vivem na mesma linha da verdade.">
                  {data.cashflow.length ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="text-[var(--ink-soft)]">
                          <tr>
                            <th className="pb-3">Date</th>
                            <th className="pb-3">Projeto</th>
                            <th className="pb-3">Tipo</th>
                            <th className="pb-3">Contraparte</th>
                            <th className="pb-3">Conta</th>
                            <th className="pb-3 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--line)]">
                          {data.cashflow.map((entry) => (
                            <tr key={`${entry.entry_type}-${entry.id}`}>
                              <td className="py-4 text-[var(--ink-soft)]">{formatDate(entry.entry_date)}</td>
                              <td className="py-4 font-medium text-[var(--ink)]">{entry.project_name}</td>
                              <td className="py-4 text-[var(--ink-soft)]">{stageLabel(entry.entry_type)}</td>
                              <td className="py-4 text-[var(--ink-soft)]">{entry.counterpart || '—'}</td>
                              <td className="py-4 text-[var(--ink-soft)]">{entry.bank_account || '—'}</td>
                              <td className={`py-4 text-right font-semibold ${entry.signed_amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {entry.signed_amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(numericValue(entry.signed_amount)))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState title="Sem fluxo de caixa ainda" body="Registre recebimentos, despesas e repasses no Financeiro e esse livro-caixa vira a página em que você confia." />
                  )}
                </Panel>
              </>
            ) : null}
          </div>
        </main>
      </div>

      <Toaster richColors position="top-right" />
    </div>
  )
}
