import { useState, type FormEvent } from 'react'
import { Banknote, ClipboardList, LoaderCircle, TrendingUp } from 'lucide-react'

export function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isDev = import.meta.env.DEV

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
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="mx-auto grid min-h-screen max-w-[1400px] lg:grid-cols-[1fr_480px]">
        {/* Left — brand statement */}
        <section className="relative flex flex-col justify-between border-b border-[var(--line)] p-8 md:p-12 lg:border-b-0 lg:border-r">
          <div>
            <img src="/logo-apolo.png" alt="Apolo" className="h-10 w-auto object-contain" />
          </div>
          <div className="max-w-lg py-12">
            <div className="mb-4 text-xs uppercase tracking-[0.22em] text-[var(--teal)]">Apolo / App</div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-[var(--ink)] md:text-5xl lg:text-6xl">
              Comercial,<br />operação<br />e caixa<br />no mesmo painel.
            </h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-[var(--ink-soft)]">
              Pipeline, andamento dos projetos, recebimentos e repasses costurados numa única mesa operacional.
            </p>
          </div>
          <div className="grid gap-px border border-[var(--line)] sm:grid-cols-3">
            {[
              { label: 'Comercial', value: 'Pipeline', helper: 'Quem vendeu, quanto vale e em que pé está.', Icon: TrendingUp },
              { label: 'Operações', value: 'Andamento', helper: 'Materiais recebidos, pendências e prazos.', Icon: ClipboardList },
              { label: 'Financeiro', value: 'Caixa', helper: 'Recebimentos, despesas, repasses e fluxo limpo.', Icon: Banknote },
            ].map(({ label, value, helper, Icon }) => (
              <div key={label} className="border-t border-[var(--line)] p-5 sm:border-r sm:border-t-0 last:border-r-0">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</div>
                  <Icon className="h-3.5 w-3.5 text-[var(--teal)]" />
                </div>
                <div className="mt-3 text-xl font-bold tracking-tight text-[var(--ink)]">{value}</div>
                <div className="mt-1 text-xs text-[var(--ink-soft)]">{helper}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Right — login form */}
        <section className="flex items-center p-8 md:p-12">
          <form onSubmit={submit} className="w-full">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--ink)]">Entrar na operação</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">Acesso restrito aos sócios. Credenciais via variáveis de ambiente.</p>

            {isDev ? (
              <div className="mt-5 border border-dashed border-[var(--teal-active-border)] bg-[var(--teal-active-bg)] px-4 py-3 text-sm text-[var(--ink-soft)]">
                Local: <span className="font-medium text-[var(--ink)]">admin@apolo.local</span> / <span className="font-medium text-[var(--ink)]">apolo123</span>
              </div>
            ) : null}

            <div className="mt-8 space-y-5">
              <label className="block">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">Usuário</div>
                <input
                  className="w-full border border-[var(--line)] bg-transparent px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-soft)] focus:border-[var(--teal)]"
                  type="text"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="matheus"
                  required
                />
              </label>
              <label className="block">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">Senha</div>
                <input
                  className="w-full border border-[var(--line)] bg-transparent px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-soft)] focus:border-[var(--teal)]"
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
              className="mt-8 inline-flex w-full items-center justify-center gap-2 bg-[var(--teal)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Entrar
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
