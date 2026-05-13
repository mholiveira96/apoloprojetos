import { type ComponentType, type ReactNode } from 'react'
import type { ViewMode } from '@/types/forms'

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[28px] border border-[var(--line)] bg-[var(--bg-card-75)] p-5 text-sm text-[var(--ink-soft)] shadow-[var(--shadow-panel)] sm:p-8">
      <div className="font-semibold text-[var(--ink)]">{title}</div>
      <p className="mt-2 max-w-xl leading-6">{body}</p>
    </div>
  )
}

export function Panel({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-[var(--line)] bg-[var(--bg-card-78)] p-4 shadow-[var(--shadow-panel)] backdrop-blur-sm sm:p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[var(--ink-soft)]">{subtitle}</p> : null}
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
      className={`rounded-[24px] border border-[var(--line)] bg-[var(--bg-metric)] p-5 ${onClick ? 'cursor-pointer transition hover:border-[var(--teal)] hover:shadow-[0_8px_24px_rgba(15,139,141,0.1)]' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]/70">{label}</div>
          <div className="mt-3 text-2xl font-semibold text-[var(--ink)] sm:text-3xl">{value}</div>
        </div>
        <div className="shrink-0 rounded-2xl border border-[rgba(15,139,141,0.14)] bg-[rgba(15,139,141,0.08)] p-3 text-[var(--teal)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 text-sm text-[var(--ink-soft)]">{helper}</div>
    </div>
  )
}

export function ViewSwitch({ value, onChange }: { value: ViewMode; onChange: (value: ViewMode) => void }) {
  return (
    <div className="inline-flex w-full rounded-full border border-[var(--line)] bg-[var(--paper)] p-1 sm:w-auto">
      {(['list', 'kanban'] as ViewMode[]).map((option) => (
        <button
          key={option}
          type="button"
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition sm:flex-none ${value === option ? 'bg-[var(--bg-card-solid)] text-[var(--ink)] shadow-[0_6px_18px_rgba(7,19,21,0.08)]' : 'text-[var(--ink-soft)]'}`}
          onClick={() => onChange(option)}
        >
          {option === 'list' ? 'Lista' : 'Kanban'}
        </button>
      ))}
    </div>
  )
}
