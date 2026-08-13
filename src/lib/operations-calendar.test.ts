import assert from 'node:assert/strict'
import test from 'node:test'
import { isCalendarSubprojectVisible } from './operations-calendar.ts'

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

test('keeps active subprojects without a deadline in the calendar', () => {
  assert.equal(
    isCalendarSubprojectVisible(
      { stage: 'em-andamento', deadline: null },
      { stage: 'em-andamento' },
    ),
    true,
  )
})
