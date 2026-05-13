import { useState } from 'react'
import { X, Plus, ArrowRight } from 'lucide-react'
import type { ClientTimelineItem, Lead } from '@/types/app'
import type { LeadDetailForm, LeadForm, ConvertProjectForm, SubprojectEntry } from '@/types/forms'
import { formatDate, formatCurrency, leadFollowUpMeta, stageLabel, numericValue } from '@/lib/formatters'
import { leadStages, leadSources, partners, disciplines, LABELS } from '@/lib/constants'

function timelineTone(kind: ClientTimelineItem['kind']) {
  if (kind === 'receipt') return 'border-[var(--emerald-border)] bg-[var(--emerald-bg)] text-[var(--emerald-text)]'
  if (kind === 'expense' || kind === 'payout') return 'border-[var(--rose-border)] bg-[var(--rose-bg)] text-[var(--rose-text)]'
  if (kind === 'deadline') return 'border-[var(--amber-border)] bg-[var(--amber-bg)] text-[var(--amber-text)]'
  if (kind === 'log') return 'border-[var(--sky-border)] bg-[var(--sky-bg)] text-[var(--sky-text)]'
  return 'border-[var(--teal-active-border)] bg-[var(--teal-active-bg)] text-[var(--teal)]'
}

/* ─── shared modal shell ─── */
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_24px_80px_rgba(7,19,21,0.12)]" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

/* ─── NEW LEAD MODAL ─── */
export function LeadModal({
  open,
  onClose,
  form,
  setForm,
  onSubmit,
  mutating,
}: {
  open: boolean
  onClose: () => void
  form: LeadForm
  setForm: React.Dispatch<React.SetStateAction<LeadForm>>
  onSubmit: () => void
  mutating: boolean
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--teal)]">Novo lead</div>
          <h3 className="mt-1 text-lg font-semibold text-[var(--ink)]">Capturar oportunidade</h3>
        </div>
        <button type="button" className="rounded-full border border-[var(--line)] p-2 text-[var(--ink-soft)] transition hover:bg-white" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <form
        className="mt-5 grid gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <input className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-3" placeholder="Nome do cliente *" value={form.clientName} onChange={(e) => setForm((c) => ({ ...c, clientName: e.target.value }))} required />
        <input className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-3" placeholder="Título do lead *" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} required />
        <select className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-3" value={form.source} onChange={(e) => setForm((c) => ({ ...c, source: e.target.value }))}>
          <option value="">Origem *</option>
          {leadSources.map((s) => <option key={s} value={s}>{LABELS[s]}</option>)}
        </select>
        <input className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-3" placeholder="Valor estimado *" type="number" value={form.estimatedAmount} onChange={(e) => setForm((c) => ({ ...c, estimatedAmount: e.target.value }))} required />
        <select className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-3" value={form.salesOwner} onChange={(e) => setForm((c) => ({ ...c, salesOwner: e.target.value }))}>
          <option value="">Responsável comercial</option>
          {partners.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-3" type="date" value={form.nextFollowUpAt} onChange={(e) => setForm((c) => ({ ...c, nextFollowUpAt: e.target.value }))} placeholder="Próximo follow-up" />
        <textarea className="md:col-span-2 min-h-24 rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-3" placeholder="Observações" value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} />
        <button className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 py-3 text-white transition hover:bg-[var(--ink-soft)]" disabled={mutating}>
          <Plus className="h-4 w-4" /> Criar lead
        </button>
      </form>
    </Modal>
  )
}

/* ─── EDITABLE FIELD (click to edit) ─── */
function Editable({ label, value, onChange, type = 'text', options }: { label: string; value: string; onChange: (v: string) => void; type?: string; options?: { value: string; label: string }[] }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    if (options) {
      return (
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">{label}</span>
          <select
            className="mt-1 w-full rounded-2xl border border-[var(--teal)] bg-[var(--bg-card-solid)] px-3 py-2 text-sm text-[var(--ink)]"
            value={value}
            onChange={(e) => { onChange(e.target.value); setEditing(false) }}
            onBlur={() => setEditing(false)}
            autoFocus
          >
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      )
    }
    return (
      <label className="block text-sm">
        <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">{label}</span>
        <input
          className="mt-1 w-full rounded-2xl border border-[var(--teal)] bg-[var(--bg-card-solid)] px-3 py-2 text-sm text-[var(--ink)]"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
          autoFocus
        />
      </label>
    )
  }
  return (
    <button type="button" className="block w-full cursor-pointer rounded-2xl border border-[var(--line)] bg-[var(--bg-card-80)] p-3 text-left text-sm transition hover:border-[var(--teal)]" onClick={() => setEditing(true)}>
      <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">{label}</span>
      <div className="mt-1 font-medium text-[var(--ink)]">{value || '—'}</div>
    </button>
  )
}

/* ─── LEAD DETAIL MODAL ─── */
export function LeadDetailModal({
  open,
  onClose,
  lead,
  draft,
  onChange,
  onSave,
  onTouch,
  onConvert,
  onStageChange,
  timelineItems,
  mutating,
}: {
  open: boolean
  onClose: () => void
  lead: Lead
  draft: LeadDetailForm
  onChange: (field: keyof LeadDetailForm, value: string) => void
  onSave: () => void
  onTouch: () => void
  onConvert: () => void
  onStageChange: (stage: string) => void
  timelineItems: ClientTimelineItem[]
  mutating: boolean
}) {
  const followUp = leadFollowUpMeta(lead)
  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--teal)]">Lead</div>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${followUp.tone}`}>{followUp.label}</span>
          </div>
          <h3 className="mt-2 truncate text-xl font-semibold text-[var(--ink)]">{lead.title}</h3>
          <div className="mt-1 text-sm text-[var(--ink-soft)]">{lead.client_name || 'Cliente não informado'}</div>
        </div>
        <button type="button" className="rounded-full border border-[var(--line)] p-2 text-[var(--ink-soft)] transition hover:bg-white" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Timeline */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {[
          { label: 'Entrada', date: lead.inbound_at || lead.created_at },
          { label: '1º contato', date: lead.first_contact_at },
          { label: 'Proposta', date: lead.proposal_sent_at },
          { label: 'Últ. contato', date: lead.last_contact_at },
          { label: 'Próx. ação', date: lead.next_follow_up_at },
        ].map((step) => (
          <div key={step.label} className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--bg-card-80)] px-3 py-1.5 text-xs">
            <span className="text-[var(--ink-soft)]">{step.label}</span>
            <span className="font-medium text-[var(--ink)]">{step.date ? formatDate(step.date) : '—'}</span>
          </div>
        ))}
      </div>

      {/* Editable fields */}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Editable label="Título" value={draft.title} onChange={(v) => onChange('title', v)} />
        <Editable label="Etapa" value={draft.stage} onChange={(v) => { onChange('stage', v); onStageChange(v) }} options={leadStages.map((s) => ({ value: s, label: stageLabel(s) }))} />
        <Editable label="Origem" value={draft.source} onChange={(v) => onChange('source', v)} options={leadSources.map((s) => ({ value: s, label: LABELS[s] }))} />
        <Editable label="Responsável" value={draft.salesOwner} onChange={(v) => onChange('salesOwner', v)} options={partners.map((p) => ({ value: p, label: p }))} />
        <Editable label="Valor estimado" value={draft.estimatedAmount} onChange={(v) => onChange('estimatedAmount', v)} type="number" />
        <Editable label="Próximo follow-up" value={draft.nextFollowUpAt} onChange={(v) => onChange('nextFollowUpAt', v)} type="date" />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Editable label="Data de entrada" value={draft.inboundAt} onChange={(v) => onChange('inboundAt', v)} type="date" />
        <Editable label="Primeiro contato" value={draft.firstContactAt} onChange={(v) => onChange('firstContactAt', v)} type="date" />
        <Editable label="Proposta enviada" value={draft.proposalSentAt} onChange={(v) => onChange('proposalSentAt', v)} type="date" />
      </div>

      <label className="mt-3 block text-sm">
        <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Observações</span>
        <textarea className="mt-1 min-h-20 w-full rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-sm text-[var(--ink)]" value={draft.notes} onChange={(e) => onChange('notes', e.target.value)} />
      </label>

      <div className="mt-4 rounded-[24px] border border-[var(--line)] bg-[var(--bg-card-70)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Timeline</div>
            <div className="mt-1 text-sm font-medium text-[var(--ink)]">Leituras recentes do cliente</div>
          </div>
          <div className="text-xs text-[var(--ink-soft)]">{timelineItems.length} evento{timelineItems.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="mt-4 space-y-3">
          {timelineItems.slice(0, 12).map((item) => (
            <div key={item.id} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[var(--bg-card-85)] px-3 py-3 text-sm">
              <div className="w-20 shrink-0 text-xs font-medium text-[var(--ink-soft)]">{formatDate(item.date)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[var(--ink)]">{item.title}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${timelineTone(item.kind)}`}>{stageLabel(item.kind)}</span>
                </div>
                <div className="mt-1 text-xs text-[var(--ink-soft)]">{item.detail}</div>
              </div>
            </div>
          ))}
          {timelineItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--bg-card-75)] px-4 py-3 text-sm text-[var(--ink-soft)]">
              Ainda não há histórico suficiente para esse cliente.
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 border-t border-[var(--line)] pt-4">
        <button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--ink)] transition hover:bg-white" onClick={onTouch}>
          📞 Registrar contato hoje
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-[var(--ink)] px-4 py-2.5 text-sm text-white transition hover:bg-[var(--ink-soft)]" disabled={mutating} onClick={onSave}>
          💾 Salvar
        </button>
        {lead.stage === 'won' && (
          <button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-[var(--teal)] px-4 py-2.5 text-sm text-white transition hover:opacity-90" onClick={onConvert}>
            <ArrowRight className="h-4 w-4" /> Converter para projeto
          </button>
        )}
      </div>
    </Modal>
  )
}

/* ─── CONVERT TO PROJECT MODAL ─── */
export function ConvertProjectModal({
  open,
  onClose,
  form,
  setForm,
  onSubmit,
  mutating,
}: {
  open: boolean
  onClose: () => void
  form: ConvertProjectForm
  setForm: React.Dispatch<React.SetStateAction<ConvertProjectForm>>
  onSubmit: () => void
  mutating: boolean
}) {
  const addSubproject = () => {
    setForm((c) => ({
      ...c,
      subprojects: [...c.subprojects, { discipline: '', amount: '', responsiblePartner: '' }],
    }))
  }
  const removeSubproject = (idx: number) => {
    setForm((c) => ({ ...c, subprojects: c.subprojects.filter((_, i) => i !== idx) }))
  }
  const updateSp = (idx: number, field: keyof SubprojectEntry, value: string) => {
    setForm((c) => ({
      ...c,
      subprojects: c.subprojects.map((sp, i) => (i === idx ? { ...sp, [field]: value } : sp)),
    }))
  }
  const spTotal = form.subprojects.reduce((s, sp) => s + numericValue(sp.amount), 0)
  const contractVal = numericValue(form.contractAmount)
  const matches = spTotal === contractVal && contractVal > 0

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--teal)]">Converter lead em projeto</div>
          <h3 className="mt-1 text-lg font-semibold text-[var(--ink)]">Criar projeto operacional</h3>
        </div>
        <button type="button" className="rounded-full border border-[var(--line)] p-2 text-[var(--ink-soft)] transition hover:bg-white" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card-60)] px-4 py-3 text-sm">
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Cliente</span>
            <div className="mt-1 font-medium text-[var(--ink)]">{form.clientName}</div>
          </div>
          <input className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-3" placeholder="Nome do projeto" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required />
          <input className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-3" placeholder="Valor do contrato *" type="number" value={form.contractAmount} onChange={(e) => setForm((c) => ({ ...c, contractAmount: e.target.value }))} required />
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card-60)] px-4 py-3 text-sm">
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Responsável comercial</span>
            <div className="mt-1 font-medium text-[var(--ink)]">{form.salesOwner}</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">1º contato *</span>
            <input className="mt-1 w-full rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-sm" type="date" value={form.firstContactAt} onChange={(e) => setForm((c) => ({ ...c, firstContactAt: e.target.value }))} required />
          </label>
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Proposta enviada *</span>
            <input className="mt-1 w-full rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-sm" type="date" value={form.proposalSentAt} onChange={(e) => setForm((c) => ({ ...c, proposalSentAt: e.target.value }))} required />
          </label>
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Fechado em *</span>
            <input className="mt-1 w-full rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-sm" type="date" value={form.closedAt} onChange={(e) => setForm((c) => ({ ...c, closedAt: e.target.value }))} required />
          </label>
        </div>

        <div className="border-t border-[var(--line)] pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-[var(--ink)]">Subprojetos</div>
            <button type="button" className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--ink)] transition hover:bg-white" onClick={addSubproject}>
              <Plus className="h-3 w-3" /> Adicionar
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {form.subprojects.map((sp, idx) => (
              <div key={idx} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto] items-end">
                <select className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-sm" value={sp.discipline} onChange={(e) => updateSp(idx, 'discipline', e.target.value)} required>
                  <option value="">Disciplina</option>
                  {disciplines.map((d) => <option key={d} value={d}>{LABELS[d]}</option>)}
                </select>
                <input className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-sm" type="number" placeholder="Valor" value={sp.amount} onChange={(e) => updateSp(idx, 'amount', e.target.value)} required />
                <select className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-3 py-2 text-sm" value={sp.responsiblePartner} onChange={(e) => updateSp(idx, 'responsiblePartner', e.target.value)} required>
                  <option value="">Parceiro responsável</option>
                  {partners.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <button type="button" className="rounded-full border border-[var(--line)] p-2 text-[var(--ink-soft)] transition hover:bg-rose-50 hover:text-rose-600" onClick={() => removeSubproject(idx)}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          {form.subprojects.length > 0 && (
            <div className={`mt-3 rounded-2xl border px-4 py-2 text-sm ${matches ? 'border-[var(--emerald-border)] bg-[var(--emerald-bg)] text-[var(--emerald-text)]' : 'border-[var(--rose-border)] bg-[var(--rose-bg)] text-[var(--rose-text)]'}`}>
              Subprojetos: {formatCurrency(spTotal)} / Contrato: {formatCurrency(contractVal)} {matches ? '✓' : '— valores não conferem'}
            </div>
          )}
        </div>

        <input className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card-solid)] px-4 py-3 text-sm" type="date" value={form.deadline} onChange={(e) => setForm((c) => ({ ...c, deadline: e.target.value }))} placeholder="Prazo" />

        <button className="w-full rounded-2xl bg-[var(--teal)] px-4 py-3 text-white transition hover:opacity-90" disabled={mutating || !matches}>
          <ArrowRight className="mr-2 inline h-4 w-4" /> Criar projeto com subprojetos
        </button>
      </form>
    </Modal>
  )
}
