import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, ClipboardList } from 'lucide-react'
import { emptyAnswers, questions, welcomeCopy } from '@/lib/premise-questionnaire'

async function submitPublicQuestionnaire(payload: Record<string, unknown>) {
  const response = await fetch('/api/app/mutate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'savePremiseQuestionnaire', public: true, payload }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Não foi possível enviar o questionário')
}

export function PublicPremiseQuestionnairePage() {
  const [step, setStep] = useState(-1)
  const [answers, setAnswers] = useState<Record<string, string>>(emptyAnswers)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const activeQuestion = step >= 0 ? questions[step] : null
  const progress = step < 0 ? 0 : Math.round(((step + 1) / questions.length) * 100)

  const setCurrentAnswer = (value: string) => {
    if (!activeQuestion) return
    setAnswers((current) => ({ ...current, [activeQuestion.id]: value }))
    setError('')
  }

  const handleNext = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!activeQuestion) {
      setStep(0)
      return
    }
    if (!answers[activeQuestion.id]?.trim()) {
      setError('Responda esta pergunta para continuar.')
      return
    }
    if (step < questions.length - 1) {
      setStep((current) => current + 1)
      setError('')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await submitPublicQuestionnaire({
        respondentName: answers.respondentName,
        contactInfo: answers.contactInfo,
        answers,
      })
      setSubmitted(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível enviar o questionário')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--paper)] px-5 py-12 text-[var(--ink)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-contain bg-center bg-no-repeat opacity-[0.035] grayscale" style={{ backgroundImage: "url('/logo-apolo.png')" }} />
        <section className="relative w-full max-w-2xl rounded-[34px] border border-[var(--line)] bg-[var(--bg-card-solid)] p-8 text-center sm:p-14">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--teal)] text-white"><Check className="h-8 w-8" /></div>
          <div className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">Apolo Projetos Inteligentes</div>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-[var(--ink)] sm:text-5xl">Obrigado!</h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-8 text-[var(--ink-paragraph)]">Recebemos suas respostas. Elas nos ajudarão a elaborar os projetos da sua residência com mais clareza e segurança.</p>
          <p className="mt-8 text-sm text-[var(--ink-soft)]">Você já pode fechar esta página.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-24 z-[-1] h-[720px] w-[720px] bg-contain bg-center bg-no-repeat opacity-[0.045] grayscale" style={{ backgroundImage: "url('/logo-apolo.png')" }} />
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
          <img src="/logo-apolo.png" alt="Apolo Projetos Inteligentes" className="h-9 w-auto object-contain sm:h-11" />
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]"><ClipboardList className="h-4 w-4 text-[var(--teal)]" /> Premissas</div>
        </header>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-10 sm:px-10 sm:py-16">
          {step < 0 ? (
            <section className="workspace-appear">
              <div className="mb-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]"><span className="h-px w-8 bg-[var(--teal)]" /> Questionário de premissas</div>
              <h1 className="font-display text-5xl leading-[1.08] tracking-tight text-[var(--ink)] sm:text-7xl">BEM-VINDO</h1>
              <div className="mt-8 max-w-2xl space-y-5 text-base leading-8 text-[var(--ink-paragraph)]">
                {welcomeCopy.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              <div className="mt-10 border-l-2 border-[var(--teal)] pl-5 text-sm leading-7 text-[var(--ink-soft)]">
                <div className="font-semibold text-[var(--ink)]">Apolo Projetos Inteligentes</div>
                <div>Ed. Plenarium - Lagoa NovaSala 1304</div>
              </div>
              <button type="button" onClick={() => setStep(0)} className="mt-10 inline-flex items-center gap-3 bg-[var(--teal)] px-6 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--teal-bright)]">Começar questionário <ArrowRight className="h-4 w-4" /></button>
            </section>
          ) : activeQuestion ? (
            <form onSubmit={handleNext} className="workspace-appear" key={activeQuestion.id}>
              <div className="mb-5 flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]"><span>Pergunta {step + 1} de {questions.length}</span><span>{progress}%</span></div>
              <div className="mb-12 h-1 w-full bg-[var(--teal-wash)]"><div className="h-1 bg-[var(--teal)] transition-all duration-500" style={{ width: `${Math.max(progress, 4)}%` }} /></div>
              <div className="mb-10 max-w-3xl"><div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">Premissas da residência</div><h2 className="font-display text-2xl leading-[1.16] tracking-tight text-[var(--ink)] sm:text-5xl">{activeQuestion.label}</h2></div>

              {activeQuestion.kind === 'choice' ? (
                <div className="grid gap-3">
                  {activeQuestion.options?.map((option) => {
                    const selected = answers[activeQuestion.id] === option
                    return <button key={option} type="button" onClick={() => setCurrentAnswer(option)} className={`group flex min-h-14 items-center justify-between gap-4 border px-5 py-4 text-left text-sm leading-6 transition ${selected ? 'border-[var(--teal)] bg-[var(--teal-active-bg)] text-[var(--ink)]' : 'border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--teal-active-border)] hover:bg-[var(--teal-active-bg)] hover:text-[var(--ink)]'}`}><span>{option}</span><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-[var(--teal)] bg-[var(--teal)] text-white' : 'border-[var(--line)] text-transparent group-hover:border-[var(--teal)]'}`}><Check className="h-3.5 w-3.5" /></span></button>
                  })}
                </div>
              ) : activeQuestion.kind === 'textarea' ? (
                <textarea autoFocus value={answers[activeQuestion.id] || ''} onChange={(event) => setCurrentAnswer(event.target.value)} placeholder={activeQuestion.placeholder} rows={5} className="w-full resize-y border-b-2 border-[var(--line)] bg-transparent px-0 py-4 text-xl leading-8 text-[var(--ink)] outline-none transition focus:border-[var(--teal)] placeholder:text-[var(--ink-soft)]" />
              ) : (
                <input autoFocus value={answers[activeQuestion.id] || ''} onChange={(event) => setCurrentAnswer(event.target.value)} placeholder={activeQuestion.placeholder} className="w-full border-b-2 border-[var(--line)] bg-transparent px-0 py-4 text-2xl text-[var(--ink)] outline-none transition focus:border-[var(--teal)] placeholder:text-[var(--ink-soft)] sm:text-4xl" />
              )}

              {error ? <div className="mt-4 text-sm font-medium text-rose-500">{error}</div> : null}
              <div className="mt-12 flex flex-wrap items-center gap-3">
                {step > 0 ? <button type="button" onClick={() => { setError(''); setStep((current) => current - 1) }} className="inline-flex items-center gap-2 border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--ink-soft)] transition hover:border-[var(--teal)] hover:text-[var(--ink)]"><ArrowLeft className="h-4 w-4" /> Voltar</button> : null}
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-3 bg-[var(--teal)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--teal-bright)] disabled:cursor-wait disabled:opacity-50">{step === questions.length - 1 ? (submitting ? 'Enviando…' : 'Enviar respostas') : 'Continuar'}{step === questions.length - 1 ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</button>
              </div>
            </form>
          ) : null}
        </div>

        <footer className="px-5 py-6 text-center text-xs text-[var(--ink-soft)] sm:px-8 lg:px-12">Apolo Projetos Inteligentes · Ed. Plenarium - Lagoa NovaSala 1304</footer>
      </div>
    </main>
  )
}
