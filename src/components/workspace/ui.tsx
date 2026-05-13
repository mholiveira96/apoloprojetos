import { type ComponentType, type ReactNode } from 'react'
import type { ViewMode } from '@/types/forms'

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-dashed border-[var(--line)] px-5 py-4 text-sm text-[var(--ink-soft)]">
      <div className="font-semibold text-[var(--ink)]">{title}</div>
      <p className="mt-1.5 max-w-xl leading-6">{body}</p>
    </div>
  )
}

export function Panel({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-[var(--ink)]">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-[var(--ink-soft)]">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

export function MetricCard({ label, value, helper, icon: Icon, onClick }: { label: string; value: string; helper: string; icon: ComponentType<{ className?: string }>; onClick?: () => void }) {
  return (
    <div
      className={`border-t-2 border-[var(--teal)] pt-4 ${onClick ? 'cursor-pointer transition-colors hover:border-[var(--teal-bright)]' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</div>
        <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--teal)]" />
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">{value}</div>
      <div className="mt-2 text-sm text-[var(--ink-soft)]">{helper}</div>
    </div>
  )
}

export function ViewSwitch({ value, onChange }: { value: ViewMode; onChange: (value: ViewMode) => void }) {
  return (
    <div className="inline-flex border border-[var(--line)]">
      {(['list', 'kanban'] as ViewMode[]).map((option) => (
        <button
          key={option}
          type="button"
          className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${value === option ? 'bg-[var(--teal)] text-white' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'}`}
          onClick={() => onChange(option)}
        >
          {option === 'list' ? 'Lista' : 'Kanban'}
        </button>
      ))}
    </div>
  )
}
