import type { CashflowEntry, Lead } from '@/types/app'
import { LABELS } from './constants'

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

export function parseDateValue(value: string | null | undefined) {
  if (!value) return null
  const text = String(value)
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00` : text
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | null | undefined) {
  const date = parseDateValue(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date)
}

export function toDateInputValue(value: string | null | undefined) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

export function stageLabel(value: string) {
  return LABELS[value] || value
}

export function stageTone(stage: string) {
  const normalized = stage.toLowerCase()
  if (['won', 'concluído', 'done'].includes(normalized)) return 'bg-[var(--emerald-bg)] text-[var(--emerald-text)] border-[var(--emerald-border)]'
  if (['lost', 'bloqueado'].includes(normalized)) return 'bg-[var(--rose-bg)] text-[var(--rose-text)] border-[var(--rose-border)]'
  if (['backlog', 'negotiation'].includes(normalized)) return 'bg-[var(--paper)] text-[var(--ink-soft)] border-[var(--line)]'
  if (['em-andamento', 'review', 'waiting-files', 'aguardando-revisao'].includes(normalized)) return 'bg-[var(--amber-bg)] text-[var(--amber-text)] border-[var(--amber-border)]'
  return 'bg-[var(--teal-active-bg)] text-[var(--teal)] border-[var(--teal-active-border)]'
}

export function numericValue(value: unknown) {
  return Number(value || 0)
}

export function monthTotals(entries: CashflowEntry[]) {
  const monthKey = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit' }).format(new Date())
  return entries.reduce(
    (acc, entry) => {
      const entryKey = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit' }).format(new Date(entry.entry_date))
      if (entryKey !== monthKey) return acc
      if (entry.entry_type === 'receipt') acc.receipts += numericValue(entry.amount)
      if (entry.entry_type === 'expense') acc.expenses += numericValue(entry.amount)
      if (entry.entry_type === 'payout') acc.payouts += numericValue(entry.amount)
      return acc
    },
    { receipts: 0, expenses: 0, payouts: 0 },
  )
}

export function leadFollowUpMeta(lead: Lead) {
  if (!lead.next_follow_up_at) {
    return { label: 'Sem follow-up', tone: 'border-[var(--line)] text-[var(--ink-soft)]' }
  }
  const followUpDate = parseDateValue(lead.next_follow_up_at)
  const today = parseDateValue(new Date().toISOString().slice(0, 10))
  if (!followUpDate || !today) {
    return { label: formatDate(lead.next_follow_up_at), tone: 'border-[var(--line)] text-[var(--ink-soft)]' }
  }
  const diffDays = Math.round((followUpDate.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d em atraso`, tone: 'border-[var(--rose-border)] bg-[var(--rose-bg)] text-[var(--rose-text)]' }
  if (diffDays === 0) return { label: 'Vence hoje', tone: 'border-[var(--amber-border)] bg-[var(--amber-bg)] text-[var(--amber-text)]' }
  if (diffDays <= 2) return { label: `${diffDays}d para agir`, tone: 'border-[var(--teal-active-border)] bg-[var(--teal-active-bg)] text-[var(--teal)]' }
  return { label: `Próximo em ${diffDays}d`, tone: 'border-[var(--line)] text-[var(--ink-soft)]' }
}