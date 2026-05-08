import type { Lead } from '@/types/app'
import type { LeadDetailForm } from '@/types/forms'
import { formatDate, leadFollowUpMeta, stageLabel } from '@/lib/formatters'
import { leadStages } from '@/lib/constants'

export function LeadDetailCard({ lead, draft, onChange, onSave, onTouch }: { lead: Lead; draft: LeadDetailForm; onChange: (field: keyof LeadDetailForm, value: string) => void; onSave: () => void; onTouch: () => void }) {
  const followUp = leadFollowUpMeta(lead)
  return (
    <div className="rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(245,245,242,0.98))] p-5 shadow-[0_24px_60px_rgba(7,19,21,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--teal)]">Lead aberto</div>
          <h3 className="mt-2 text-xl font-semibold text-[var(--ink)]">{lead.title}</h3>
          <div className="mt-2 text-sm text-[var(--ink-soft)]">{lead.client_name || 'Cliente não informado'}</div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-medium ${followUp.tone}`}>{followUp.label}</div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 text-sm">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Entrada</div>
          <div className="mt-2 font-medium text-[var(--ink)]">{formatDate(lead.inbound_at || lead.created_at)}</div>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 text-sm">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">Próxima ação</div>
          <div className="mt-2 font-medium text-[var(--ink)]">{formatDate(lead.next_follow_up_at)}</div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-[var(--ink)]">Lead <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={draft.title} onChange={(event) => onChange('title', event.target.value)} /></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Etapa <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={draft.stage} onChange={(event) => onChange('stage', event.target.value)}>{leadStages.map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}</select></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Origem <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={draft.source} onChange={(event) => onChange('source', event.target.value)} /></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Responsável comercial <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={draft.salesOwner} onChange={(event) => onChange('salesOwner', event.target.value)} /></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Valor estimado <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="number" value={draft.estimatedAmount} onChange={(event) => onChange('estimatedAmount', event.target.value)} /></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Próximo follow-up <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="date" value={draft.nextFollowUpAt} onChange={(event) => onChange('nextFollowUpAt', event.target.value)} /></label>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="block text-sm font-medium text-[var(--ink)]">Data de entrada <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="date" value={draft.inboundAt} onChange={(event) => onChange('inboundAt', event.target.value)} /></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Primeiro contato <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="date" value={draft.firstContactAt} onChange={(event) => onChange('firstContactAt', event.target.value)} /></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Último contato <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="date" value={draft.lastContactAt} onChange={(event) => onChange('lastContactAt', event.target.value)} /></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Proposta enviada <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="date" value={draft.proposalSentAt} onChange={(event) => onChange('proposalSentAt', event.target.value)} /></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Fechamento <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="date" value={draft.closedAt} onChange={(event) => onChange('closedAt', event.target.value)} /></label>
      </div>
      <label className="mt-4 block text-sm font-medium text-[var(--ink)]">Observações <textarea className="mt-2 min-h-28 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={draft.notes} onChange={(event) => onChange('notes', event.target.value)} /></label>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="inline-flex items-center justify-center rounded-2xl border border-[var(--line)] px-4 py-3 text-sm text-[var(--ink)] transition hover:bg-white" onClick={onTouch}>Registrar contato hoje</button>
        <button type="button" className="inline-flex items-center justify-center rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm text-white transition hover:bg-[var(--ink-soft)]" onClick={onSave}>Salvar lead</button>
      </div>
    </div>
  )
}