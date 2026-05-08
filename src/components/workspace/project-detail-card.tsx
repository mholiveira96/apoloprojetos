import type { Project } from '@/types/app'
import type { ProjectDetailForm } from '@/types/forms'
import { stageLabel, stageTone } from '@/lib/formatters'
import { projectStages } from '@/lib/constants'
import { SquarePen } from 'lucide-react'

export function ProjectDetailCard({ project, draft, onChange, onSave }: { project: Project; draft: ProjectDetailForm; onChange: (field: keyof ProjectDetailForm, value: string) => void; onSave: () => void }) {
  return (
    <div className="rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(245,245,242,0.98))] p-5 shadow-[0_24px_60px_rgba(7,19,21,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--teal)]">Projeto em edição</div>
          <h3 className="mt-2 text-xl font-semibold text-[var(--ink)]">{project.name}</h3>
          <div className="mt-2 text-sm text-[var(--ink-soft)]">{project.client_name || 'Cliente não informado'}</div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${stageTone(project.stage)}`}>{stageLabel(project.stage)}</span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-[var(--ink)]">Nome do projeto <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={draft.name} onChange={(event) => onChange('name', event.target.value)} /></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Código <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={draft.code} onChange={(event) => onChange('code', event.target.value)} /></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Disciplina <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={draft.discipline} onChange={(event) => onChange('discipline', event.target.value)} /></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Etapa <select className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={draft.stage} onChange={(event) => onChange('stage', event.target.value)}>{projectStages.map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}</select></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Valor do contrato <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="number" value={draft.contractAmount} onChange={(event) => onChange('contractAmount', event.target.value)} /></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Responsável comercial <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={draft.salesOwner} onChange={(event) => onChange('salesOwner', event.target.value)} /></label>
        <label className="block text-sm font-medium text-[var(--ink)] md:col-span-2">Prazo <input className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="date" value={draft.deadline} onChange={(event) => onChange('deadline', event.target.value)} /></label>
      </div>
      <label className="mt-4 block text-sm font-medium text-[var(--ink)]">Observação de status <textarea className="mt-2 min-h-28 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={draft.statusNote} onChange={(event) => onChange('statusNote', event.target.value)} /></label>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm text-white transition hover:bg-[var(--ink-soft)]" onClick={onSave}><SquarePen className="h-4 w-4" /> Salvar projeto</button>
      </div>
    </div>
  )
}