import type { ProjectLog } from '@/types/app'
import type { LogDetailForm } from '@/types/forms'
import { stageLabel, stageTone } from '@/lib/formatters'
import { logTypes } from '@/lib/constants'
import { SquarePen } from 'lucide-react'

export function LogDetailCard({ log, draft, projectOptions, onChange, onSave }: { log: ProjectLog; draft: LogDetailForm; projectOptions: Array<{ id: string; name: string }>; onChange: (field: keyof LogDetailForm, value: string) => void; onSave: () => void }) {
  return (
    <div className=" border border-[var(--line)] bg-[var(--bg-card-gradient)] p-5 shadow-[0_24px_60px_rgba(7,19,21,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--teal)]">Movimentação em edição</div>
          <h3 className="mt-2 text-xl font-semibold text-[var(--ink)]">{log.title}</h3>
          <div className="mt-2 text-sm text-[var(--ink-soft)]">{log.project_name}</div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${stageTone(log.status)}`}>{stageLabel(log.log_type)}</span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-[var(--ink)]">Projeto <select className="mt-2 w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={draft.projectId} onChange={(event) => onChange('projectId', event.target.value)}>{projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Tipo <select className="mt-2 w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={draft.logType} onChange={(event) => onChange('logType', event.target.value)}>{logTypes.map((item) => <option key={item} value={item}>{stageLabel(item)}</option>)}</select></label>
        <label className="block text-sm font-medium text-[var(--ink)] md:col-span-2">Título <input className="mt-2 w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={draft.title} onChange={(event) => onChange('title', event.target.value)} /></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Prazo <input className="mt-2 w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3" type="date" value={draft.dueDate} onChange={(event) => onChange('dueDate', event.target.value)} /></label>
        <label className="block text-sm font-medium text-[var(--ink)]">Status <select className="mt-2 w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={draft.status} onChange={(event) => onChange('status', event.target.value)}><option value="open">Aberto</option><option value="done">Concluído</option></select></label>
      </div>
      <label className="mt-4 block text-sm font-medium text-[var(--ink)]">Detalhes <textarea className="mt-2 min-h-28 w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3" value={draft.details} onChange={(event) => onChange('details', event.target.value)} /></label>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="inline-flex items-center gap-2 bg-[var(--ink)] px-4 py-3 text-sm text-white transition hover:bg-[var(--ink-soft)]" onClick={onSave}><SquarePen className="h-4 w-4" /> Salvar movimentação</button>
      </div>
    </div>
  )
}