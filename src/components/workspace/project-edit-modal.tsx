import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Pencil, X } from 'lucide-react'
import type { Project } from '@/types/app'
import { disciplines, LABELS, partners, projectStages } from '@/lib/constants'
import { formatCurrency, numericValue, stageLabel } from '@/lib/formatters'

type ProjectEditForm = {
  name: string
  code: string
  area: string
  discipline: string
  stage: string
  contractAmount: string
  salesOwner: string
  statusNote: string
  notes: string
}

function CurrencyInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [focused, setFocused] = useState(false)
  const display = focused || !numericValue(value) ? value : formatCurrency(numericValue(value))

  return (
    <input
      className="w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)]"
      inputMode="decimal"
      value={display}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(event) => onChange(event.target.value.replace(/[^\d.,-]/g, ''))}
      placeholder="0,00"
    />
  )
}

export function ProjectEditModal({
  project,
  mutating,
  onClose,
  onSave,
}: {
  project: Project | null
  mutating: boolean
  onClose: () => void
  onSave: (form: ProjectEditForm) => void
}) {
  const initialForm = useMemo<ProjectEditForm>(() => ({
    name: project?.name || '',
    code: project?.code || '',
    area: project?.area != null ? String(project.area) : '',
    discipline: project?.discipline || '',
    stage: project?.stage || projectStages[0],
    contractAmount: project?.contract_amount != null ? String(project.contract_amount) : '',
    salesOwner: project?.sales_owner || '',
    statusNote: project?.status_note || '',
    notes: project?.notes || '',
  }), [project])

  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    setForm(initialForm)
  }, [initialForm])

  if (!project) return null

  const setField =
    (field: keyof ProjectEditForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }))
    }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-[var(--line)] bg-[var(--paper)] shadow-[var(--shadow-panel)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-6">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--teal)]">Editar projeto</div>
            <h2 className="mt-2 text-xl font-semibold text-[var(--ink)]">{project.name}</h2>
            <div className="mt-1 text-sm text-[var(--ink-soft)]">{project.client_name || 'Cliente não informado'}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--line)] p-2 text-[var(--ink-soft)] transition hover:bg-[var(--paper)] hover:text-[var(--ink)]"
            aria-label="Fechar edição"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <section className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-[var(--ink)]">Cadastro</div>
              <div className="text-xs text-[var(--ink-soft)]">Atualize os dados principais do projeto no financeiro.</div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-[var(--ink)]">
                Nome do projeto
                <input className="mt-2 w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm" value={form.name} onChange={setField('name')} />
              </label>
              <label className="block text-sm font-medium text-[var(--ink)]">
                Código
                <input className="mt-2 w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm" value={form.code} onChange={setField('code')} placeholder="Ex.: AP-2026-014" />
              </label>
              <label className="block text-sm font-medium text-[var(--ink)]">
                Área (m²)
                <input className="mt-2 w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm" type="number" min="0" step="0.01" value={form.area} onChange={setField('area')} />
              </label>
              <label className="block text-sm font-medium text-[var(--ink)]">
                Disciplina principal
                <select className="mt-2 w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm" value={form.discipline} onChange={setField('discipline')}>
                  <option value="">Sem disciplina</option>
                  {disciplines.map((discipline) => (
                    <option key={discipline} value={discipline}>
                      {LABELS[discipline]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="space-y-4 border-t border-[var(--line)] pt-6">
            <div>
              <div className="text-sm font-semibold text-[var(--ink)]">Operação e comercial</div>
              <div className="text-xs text-[var(--ink-soft)]">Ajuste etapa, contrato e responsável sem sair do financeiro.</div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-[var(--ink)]">
                Etapa
                <select className="mt-2 w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm" value={form.stage} onChange={setField('stage')}>
                  {projectStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {stageLabel(stage)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-[var(--ink)]">
                Responsável comercial
                <select className="mt-2 w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm" value={form.salesOwner} onChange={setField('salesOwner')}>
                  <option value="">Sem responsável</option>
                  {partners.map((partner) => (
                    <option key={partner} value={partner}>
                      {partner}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-[var(--ink)] md:col-span-2">
                Valor do contrato
                <div className="mt-2">
                  <CurrencyInput value={form.contractAmount} onChange={(contractAmount) => setForm((current) => ({ ...current, contractAmount }))} />
                </div>
              </label>
            </div>
          </section>

          <section className="space-y-4 border-t border-[var(--line)] pt-6">
            <div>
              <div className="text-sm font-semibold text-[var(--ink)]">Anotações</div>
              <div className="text-xs text-[var(--ink-soft)]">Separe o status rápido das notas internas mais longas.</div>
            </div>
            <div className="grid gap-4">
              <label className="block text-sm font-medium text-[var(--ink)]">
                Observação de status
                <textarea className="mt-2 min-h-24 w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm" value={form.statusNote} onChange={setField('statusNote')} placeholder="Ex.: aguardando retorno do cliente" />
              </label>
              <label className="block text-sm font-medium text-[var(--ink)]">
                Notas internas
                <textarea className="mt-2 min-h-32 w-full border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm" value={form.notes} onChange={setField('notes')} placeholder="Contexto interno, próximos passos, observações do projeto..." />
              </label>
            </div>
          </section>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-[var(--ink-soft)]">As alterações salvam no cadastro do projeto e refletem nas outras páginas.</div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center border border-[var(--line)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--paper)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={mutating}
              onClick={() => onSave(form)}
              className="inline-flex items-center justify-center gap-2 bg-[var(--ink)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--ink-soft)] disabled:opacity-60"
            >
              <Pencil className="h-4 w-4" />
              Salvar projeto
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
