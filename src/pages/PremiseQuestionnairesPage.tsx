import { useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  FileDown,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react'
import type { BootstrapData, PremiseQuestionnaire } from '@/types/app'

import { canonicalQuestionnaireAnswer, emptyAnswers, questions, welcomeCopy } from '@/lib/premise-questionnaire'
import { exportPremiseQuestionnairesPdf } from '@/lib/premise-questionnaire-pdf'
import { toast } from 'sonner'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function questionnaireAnswers(record: PremiseQuestionnaire) {
  const answers = { ...emptyAnswers(), ...record.answers }
  return Object.fromEntries(
    questions.map((question) => [question.id, canonicalQuestionnaireAnswer(question, answers[question.id] || '')]),
  )
}

export function PremiseQuestionnairesPage({
  data,
  submitMutation,
  mutating,
}: {
  data: BootstrapData
  submitMutation: (action: string, payload: Record<string, unknown>, onSuccess?: () => void, successMessage?: string) => Promise<void>
  mutating: boolean
}) {
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [step, setStep] = useState(-1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>(emptyAnswers)
  const [identificationNote, setIdentificationNote] = useState('')
  const [error, setError] = useState('')
  const [exportingPdfId, setExportingPdfId] = useState<string | null>(null)

  const activeQuestion = step >= 0 ? questions[step] : null
  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.id]?.trim()).length,
    [answers],
  )

  const startNew = () => {
    setEditingId(null)
    setAnswers(emptyAnswers())
    setIdentificationNote('')
    setError('')
    setStep(-1)
    setMode('form')
  }

  const editQuestionnaire = (record: PremiseQuestionnaire) => {
    setEditingId(record.id)
    setAnswers(questionnaireAnswers(record))
    setIdentificationNote(record.identification_note || '')
    setError('')
    setStep(-1)
    setMode('form')
  }

  const goToList = () => {
    setMode('list')
    setStep(-1)
    setError('')
  }

  const setCurrentAnswer = (value: string) => {
    if (!activeQuestion) return
    setAnswers((current) => ({ ...current, [activeQuestion.id]: value }))
    setError('')
  }

  const saveQuestionnaire = () => {
    void submitMutation(
      'savePremiseQuestionnaire',
      {
        id: editingId,
        respondentName: answers.respondentName,
        contactInfo: answers.contactInfo,
        identificationNote,
        answers,
        status: 'completed',
      },
      () => {
        setMode('list')
        setStep(-1)
        setEditingId(null)
        setAnswers(emptyAnswers())
        setIdentificationNote('')
      },
      editingId ? 'Questionário atualizado' : 'Questionário salvo',
    )
  }

  const handleNext = (event?: FormEvent) => {
    event?.preventDefault()
    if (!activeQuestion) {
      setStep(0)
      return
    }
    if (!answers[activeQuestion.id]?.trim()) {
      setError('Responda esta pergunta para continuar.')
      return
    }
    if (step === questions.length - 1) {
      saveQuestionnaire()
      return
    }
    setStep((current) => current + 1)
    setError('')
  }

  const handlePrevious = () => {
    setError('')
    setStep((current) => current - 1)
  }

  const deleteQuestionnaire = (record: PremiseQuestionnaire) => {
    if (!window.confirm(`Excluir o questionário de ${record.respondent_name || 'identificação sem nome'}?`)) return
    void submitMutation('deletePremiseQuestionnaire', { id: record.id }, undefined, 'Questionário excluído')
  }

  const exportPdf = async (record: PremiseQuestionnaire) => {
    if (exportingPdfId) return
    setExportingPdfId(record.id)
    try {
      await exportPremiseQuestionnairesPdf([record])
      toast.success('PDF exportado com sucesso')
    } catch (exportError) {
      console.error(exportError)
      toast.error('Não foi possível exportar o PDF')
    } finally {
      setExportingPdfId(null)
    }
  }

  if (mode === 'form') {
    const progress = step < 0 ? 0 : Math.round(((step + 1) / questions.length) * 100)
    return (
      <div className="relative isolate min-h-[calc(100vh-7rem)] overflow-hidden rounded-[34px] border border-[var(--line)] bg-[var(--bg-card-solid)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-12 z-[-1] h-[560px] w-[560px] bg-contain bg-center bg-no-repeat opacity-[0.045] grayscale"
          style={{ backgroundImage: "url('/logo-apolo.png')" }}
        />
        <div className="flex min-h-[calc(100vh-7rem)] flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4 sm:px-8">
            <button type="button" onClick={goToList} className="inline-flex items-center gap-2 text-sm text-[var(--ink-soft)] transition hover:text-[var(--ink)]">
              <ArrowLeft className="h-4 w-4" />
              Voltar para questionários
            </button>
            <div className="hidden items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)] sm:flex">
              <ClipboardList className="h-4 w-4 text-[var(--teal)]" />
              {editingId ? 'Editar respostas' : 'Novo questionário'}
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-12 sm:px-10 sm:py-16">
            {step < 0 ? (
              <section className="workspace-appear">
                <div className="mb-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
                  <span className="h-px w-8 bg-[var(--teal)]" />
                  Apolo Projetos Inteligentes
                </div>
                <h1 className="max-w-2xl font-display text-4xl leading-[1.08] tracking-tight text-[var(--ink)] sm:text-6xl">BEM-VINDO</h1>
                <div className="mt-8 max-w-2xl space-y-5 text-base leading-8 text-[var(--ink-paragraph)]">
                  {welcomeCopy.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
                <div className="mt-10 border-l-2 border-[var(--teal)] pl-5 text-sm leading-7 text-[var(--ink-soft)]">
                  <div className="font-semibold text-[var(--ink)]">Apolo Projetos Inteligentes</div>
                  <div>Ed. Plenarium - Lagoa NovaSala 1304</div>
                </div>
                <button type="button" onClick={() => setStep(0)} className="mt-10 inline-flex items-center gap-3 bg-[var(--teal)] px-6 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--teal-bright)]">
                  Começar questionário
                  <ArrowRight className="h-4 w-4" />
                </button>
              </section>
            ) : activeQuestion ? (
              <form onSubmit={handleNext} className="workspace-appear" key={activeQuestion.id}>
                <div className="mb-5 flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                  <span>Pergunta {step + 1} de {questions.length}</span>
                  <span>{answeredCount} respondidas</span>
                </div>
                <div className="mb-12 h-1 w-full bg-[var(--teal-wash)]">
                  <div className="h-1 bg-[var(--teal)] transition-all duration-500" style={{ width: `${Math.max(progress, 4)}%` }} />
                </div>
                <div className="mb-10 max-w-3xl">
                  <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">Premissas da residência</div>
                  <h2 className="font-display text-2xl leading-[1.16] tracking-tight text-[var(--ink)] sm:text-5xl">{activeQuestion.label}</h2>
                </div>

                {activeQuestion.kind === 'choice' ? (
                  <div className="grid gap-3">
                    {activeQuestion.options?.map((option) => {
                      const selected = answers[activeQuestion.id] === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setCurrentAnswer(option)}
                          className={`group flex min-h-14 items-center justify-between gap-4 border px-5 py-4 text-left text-sm leading-6 transition ${selected ? 'border-[var(--teal)] bg-[var(--teal-active-bg)] text-[var(--ink)]' : 'border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--teal-active-border)] hover:bg-[var(--teal-active-bg)] hover:text-[var(--ink)]'}`}
                        >
                          <span>{option}</span>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${selected ? 'border-[var(--teal)] bg-[var(--teal)] text-white' : 'border-[var(--line)] text-transparent group-hover:border-[var(--teal)]'}`}>
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : activeQuestion.kind === 'textarea' ? (
                  <textarea
                    autoFocus
                    value={answers[activeQuestion.id] || ''}
                    onChange={(event) => setCurrentAnswer(event.target.value)}
                    placeholder={activeQuestion.placeholder}
                    rows={5}
                    className="w-full resize-y border-b-2 border-[var(--line)] bg-transparent px-0 py-4 text-xl leading-8 text-[var(--ink)] outline-none transition focus:border-[var(--teal)] placeholder:text-[var(--ink-soft)]"
                  />
                ) : (
                  <input
                    autoFocus
                    value={answers[activeQuestion.id] || ''}
                    onChange={(event) => setCurrentAnswer(event.target.value)}
                    placeholder={activeQuestion.placeholder}
                    className="w-full border-b-2 border-[var(--line)] bg-transparent px-0 py-4 text-2xl text-[var(--ink)] outline-none transition focus:border-[var(--teal)] placeholder:text-[var(--ink-soft)] sm:text-4xl"
                  />
                )}

                {error ? <div className="mt-4 text-sm font-medium text-rose-500">{error}</div> : null}
                <div className="mt-12 flex flex-wrap items-center gap-3">
                  {step > 0 ? (
                    <button type="button" onClick={handlePrevious} className="inline-flex items-center gap-2 border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--ink-soft)] transition hover:border-[var(--teal)] hover:text-[var(--ink)]">
                      <ArrowLeft className="h-4 w-4" /> Voltar
                    </button>
                  ) : null}
                  <button type="submit" disabled={mutating} className="inline-flex items-center gap-3 bg-[var(--teal)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--teal-bright)] disabled:cursor-wait disabled:opacity-50">
                    {step === questions.length - 1 ? (mutating ? 'Salvando…' : 'Concluir questionário') : 'Continuar'}
                    {step === questions.length - 1 ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
            <ClipboardList className="h-4 w-4" />
            Apolo / Premissas
          </div>
          <h1 className="font-display text-4xl tracking-tight text-[var(--ink)] sm:text-5xl">Questionário de premissas</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">Preencha uma residência por vez. As respostas ficam salvas para consulta e edição da equipe.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={startNew} className="inline-flex items-center gap-2 bg-[var(--teal)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--teal-bright)]">
            <Plus className="h-4 w-4" /> Novo questionário
          </button>
        </div>
      </div>

      {data.premiseQuestionnaires.length === 0 ? (
        <div className="relative overflow-hidden rounded-[30px] border border-[var(--line)] bg-[var(--bg-card-80)] p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-16 -top-12 h-72 w-72 bg-contain bg-center bg-no-repeat opacity-[0.05] grayscale" style={{ backgroundImage: "url('/logo-apolo.png')" }} />
          <UserRound className="h-7 w-7 text-[var(--teal)]" />
          <h2 className="mt-5 font-display text-3xl text-[var(--ink)]">Nenhuma residência respondida ainda</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">Comece um novo preenchimento para registrar as necessidades da próxima residência.</p>
          <button type="button" onClick={startNew} className="mt-7 inline-flex items-center gap-2 border border-[var(--teal)] px-5 py-3 text-sm font-semibold text-[var(--teal)] transition hover:bg-[var(--teal-active-bg)]">
            Criar primeiro questionário <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {data.premiseQuestionnaires.map((record) => {
            const recordAnswers = questionnaireAnswers(record)
            return (
              <article key={record.id} className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--bg-card-80)]">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] p-5 sm:p-6">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--teal)]">Questionário concluído</div>
                    <h2 className="mt-2 text-xl font-semibold text-[var(--ink)]">{recordAnswers.respondentName || record.respondent_name || 'Sem nome informado'}</h2>
                    <div className="mt-1 text-sm text-[var(--ink-soft)]">{recordAnswers.contactInfo || record.contact_info || record.identification_note || 'Sem contato informado'}</div>
                    <div className="mt-2 text-xs text-[var(--ink-soft)]">Atualizado em {formatDate(record.updated_at)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-label={`Exportar PDF do questionário de ${record.respondent_name || 'cliente'}`}
                      onClick={() => void exportPdf(record)}
                      disabled={Boolean(exportingPdfId) && exportingPdfId !== record.id}
                      className="inline-flex items-center gap-2 border border-[var(--teal)] px-3 py-2 text-xs font-semibold text-[var(--teal)] transition hover:bg-[var(--teal-active-bg)] disabled:cursor-wait disabled:opacity-40"
                    >
                      <FileDown className="h-3.5 w-3.5" /> {exportingPdfId === record.id ? 'Gerando…' : 'Exportar PDF'}
                    </button>
                    <button type="button" aria-label={`Editar questionário de ${record.respondent_name || 'cliente'}`} onClick={() => editQuestionnaire(record)} className="inline-flex items-center gap-2 border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--ink-soft)] transition hover:border-[var(--teal)] hover:text-[var(--teal)]">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button type="button" aria-label={`Excluir questionário de ${record.respondent_name || 'cliente'}`} onClick={() => deleteQuestionnaire(record)} className="inline-flex items-center justify-center border border-[var(--line)] px-3 py-2 text-[var(--ink-soft)] transition hover:border-rose-400 hover:text-rose-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-[var(--line)] px-5 sm:px-6">
                  {questions.slice(2).map((question) => (
                    <div key={question.id} className="py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">{question.label}</div>
                      <div className="mt-1 text-sm leading-6 text-[var(--ink)]">{recordAnswers[question.id] || '—'}</div>
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
