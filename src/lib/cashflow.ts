export type CashflowLikeEntry = {
  id: string
  entry_date: string
  signed_amount: number
}

export type CashflowDayGroup<TEntry extends CashflowLikeEntry> = {
  day: string
  entries: TEntry[]
  dayNet: number
  runningBalance: number
}

export function computeCashflowDayGroups<TEntry extends CashflowLikeEntry>(
  entries: TEntry[],
  sortOrder: 'oldest' | 'newest',
  openingBalance = 0,
): CashflowDayGroup<TEntry>[] {
  const byDay = new Map<string, TEntry[]>()

  for (const entry of [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date))) {
    const day = entry.entry_date.slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(entry)
  }

  let running = openingBalance
  const chronologicalGroups = Array.from(byDay.entries()).map(([day, dayEntries]) => {
    const dayNet = dayEntries.reduce((sum, entry) => sum + Number(entry.signed_amount), 0)
    running += dayNet
    return {
      day,
      entries: dayEntries,
      dayNet,
      runningBalance: running,
    }
  })

  return sortOrder === 'oldest' ? chronologicalGroups : [...chronologicalGroups].reverse()
}
