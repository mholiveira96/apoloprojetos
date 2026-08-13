import assert from 'node:assert/strict'
import test from 'node:test'
import { isCalendarSubprojectOverdue, isCalendarDeadlineVisible, isCalendarSubprojectVisible } from './operations-calendar.ts'

test('hides subprojects from completed projects in the calendar', () => {
  assert.equal(
    isCalendarSubprojectVisible(
      { stage: 'em-andamento', deadline: null },
      { stage: 'concluído' },
    ),
    false,
  )
})

test('hides completed subprojects from the calendar even when the project is active', () => {
  assert.equal(
    isCalendarSubprojectVisible(
      { stage: 'concluído', deadline: null },
      { stage: 'em-andamento' },
    ),
    false,
  )
})

test('hides projects awaiting payment because operational work is already finished', () => {
  assert.equal(
    isCalendarSubprojectVisible(
      { stage: 'em-andamento', deadline: null },
      { stage: 'concluído-aguardando-pagamento' },
    ),
    false,
  )
})

test('keeps an active subproject with a future deadline in the calendar', () => {
  assert.equal(
    isCalendarDeadlineVisible(
      { stage: 'em-andamento', deadline: '2026-08-15' },
      { stage: 'em-andamento' },
      '2026-08-13',
    ),
    true,
  )
})

test('classifies an active subproject from a previous day as overdue', () => {
  assert.equal(
    isCalendarSubprojectOverdue(
      { stage: 'em-andamento', deadline: '2026-07-31' },
      { stage: 'em-andamento' },
      '2026-08-13',
    ),
    true,
  )
})

test('does not classify completed work with an old deadline as overdue', () => {
  assert.equal(
    isCalendarSubprojectOverdue(
      { stage: 'concluído', deadline: '2026-07-31' },
      { stage: 'em-andamento' },
      '2026-08-13',
    ),
    false,
  )
})

test('does not keep overdue items in the month calendar', () => {
  assert.equal(
    isCalendarDeadlineVisible(
      { stage: 'em-andamento', deadline: '2026-07-31' },
      { stage: 'em-andamento' },
      '2026-08-13',
    ),
    false,
  )
})

test('does not classify an item due today as overdue', () => {
  assert.equal(
    isCalendarSubprojectOverdue(
      { stage: 'em-andamento', deadline: '2026-08-13' },
      { stage: 'em-andamento' },
      '2026-08-13',
    ),
    false,
  )
})

test('keeps active subprojects without a deadline in the calendar', () => {
  assert.equal(
    isCalendarSubprojectVisible(
      { stage: 'em-andamento', deadline: null },
      { stage: 'em-andamento' },
    ),
    true,
  )
})
