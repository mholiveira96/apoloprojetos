import test from 'node:test'
import assert from 'node:assert/strict'

import { computeCashflowDayGroups } from './cashflow.ts'

test('computeCashflowDayGroups keeps running balances anchored to chronological order even when displayed newest first', () => {
  const entries = [
    { id: 'r1', entry_date: '2026-01-01', signed_amount: 1000 },
    { id: 'e1', entry_date: '2026-01-02', signed_amount: -200 },
    { id: 'r2', entry_date: '2026-01-03', signed_amount: 300 },
  ]

  const groups = computeCashflowDayGroups(entries, 'newest')

  assert.deepEqual(
    groups.map((group) => ({
      day: group.day,
      dayNet: group.dayNet,
      runningBalance: group.runningBalance,
    })),
    [
      { day: '2026-01-03', dayNet: 300, runningBalance: 1100 },
      { day: '2026-01-02', dayNet: -200, runningBalance: 800 },
      { day: '2026-01-01', dayNet: 1000, runningBalance: 1000 },
    ],
  )
})

test('computeCashflowDayGroups applies opening balance before filtered entries', () => {
  const entries = [
    { id: 'e1', entry_date: '2026-01-10', signed_amount: -200 },
    { id: 'r2', entry_date: '2026-01-12', signed_amount: 300 },
  ]

  const groups = computeCashflowDayGroups(entries, 'oldest', 1000)

  assert.deepEqual(
    groups.map((group) => ({
      day: group.day,
      runningBalance: group.runningBalance,
    })),
    [
      { day: '2026-01-10', runningBalance: 800 },
      { day: '2026-01-12', runningBalance: 1100 },
    ],
  )
})
