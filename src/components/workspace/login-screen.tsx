import { useState, type FormEvent } from 'react'
import { Banknote, CheckCircle2, ClipboardList, LoaderCircle, TrendingUp } from 'lucide-react'
import { MetricCard } from './ui'

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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f6f2_0%,#efeee8_100%)] px-4 py-8 text-[var(--ink)] md:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="relative overflow-hidden rounded-[40px] border border-[var(--line)] bg-[radial-gradient(circle_at_top_left,rgba(15,139,141,0.12),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,245,242,0.88))] p-8 shadow-[0_35px_90px_rgba(7,19,21,0.08)] md:p-10">
          <div className="max-w-xl">
            <div className="inline-flex rounded-full border border-[rgba(15,139,141,0.16)] bg-[rgba(15,139,141,0.08)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--teal)]">Apolo / App</div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-[var(--ink)] md:text-5xl">Comercial, operação e caixa no mesmo painel.</h1>
            <p className="mt-5 text-base leading-7 text-[var(--ink-soft)]">O app mantém a cara da Apolo, mas funciona como uma mesa operacional de verdade: pipeline, andamento dos projetos, recebimentos, despesas e repasses no mesmo lugar.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <MetricCard label="Comercial" value="Pipeline" helper="Quem vendeu, quanto vale e em que pé está." icon={TrendingUp} />
            <MetricCard label="Operações" value="Andamento" helper="Materiais recebidos, pendências e prazos." icon={ClipboardList} />
            <MetricCard label="Financeiro" value="Caixa" helper="Recebimentos, despesas, repasses e fluxo limpo." icon={Banknote} />
          </div>
        </section>
        <section className="flex items-center">
          <form onSubmit={submit} className="w-full rounded-[32px] border border-[var(--line)] bg-white/85 p-8 shadow-[0_25px_70px_rgba(7,19,21,0.08)] backdrop-blur-sm">
            <h2 className="text-2xl font-semibold">Entrar na operação</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">Acesso simples só para os sócios por enquanto. As credenciais vêm das variáveis de ambiente.</p>
            {isDev ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[rgba(15,139,141,0.22)] bg-[rgba(15,139,141,0.06)] px-4 py-3 text-sm text-[var(--ink-soft)]">
                Local login: <span className="font-medium text-[var(--ink)]">admin@apolo.local</span> / <span className="font-medium text-[var(--ink)]">apolo123</span>
              </div>
            ) : null}
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-[var(--ink)]">
                Usuário
                <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 outline-none transition focus:border-[rgba(15,139,141,0.24)]" type="text" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="matheus" required />
              </label>
              <label className="block text-sm font-medium text-[var(--ink)]">
                Senha
                <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 outline-none transition focus:border-[rgba(15,139,141,0.24)]" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required />
              </label>
            </div>
            <button type="submit" disabled={submitting} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 py-3 font-medium text-white transition hover:bg-[var(--ink-soft)] disabled:opacity-60">
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Entrar no app
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}