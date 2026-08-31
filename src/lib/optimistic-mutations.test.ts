import assert from 'node:assert/strict'
import test from 'node:test'
import { applyOptimisticMutation, replayOptimisticMutations } from './optimistic-mutations.ts'
import type { BootstrapData } from '../types/app.ts'

const baseData = (): BootstrapData => ({
  user: { email: 'test@example.com', name: 'Test' },
  summary: { openLeads: 1, activeProjects: 1, contractTotal: 1000, receivedTotal: 0, expenseTotal: 0, payoutTotal: 0, netCash: 0, outstandingTotal: 1000, activeContractTotal: 1000, currentYearSales: 1000, deliveredUnpaidTotal: 0 },
  leads: [{ id: 'lead-1', title: 'Lead antigo', stage: 'incoming', source: null, estimated_amount: 0, sales_owner: null, notes: null, inbound_at: null, first_contact_at: null, last_contact_at: null, next_follow_up_at: null, proposal_sent_at: null, closed_at: null, created_at: '2026-01-01', proposal_filename: null, client_name: 'Cliente', subprojects: [] }],
  projects: [{ id: 'project-1', name: 'Projeto antigo', code: null, area: 0, discipline: null, stage: 'em_andamento', archived: false, contract_amount: 1000, sales_owner: null, sales_bonus_percent: 0, base_partner_split_percent: 0, deadline: null, drive_enabled: false, drive_token: null, drive_updated_at: null, status_note: null, notes: null, lead_id: null, created_at: '2026-01-01', updated_at: '2026-01-01', client_name: 'Cliente', sale_log_count: 0, sale_recorded_at: null, latest_subproject_completed_at: null, total_received: 0, total_expenses: 0, total_payouts: 0, pending_count: 0, next_pending_due: null }],
  logs: [], receipts: [], expenses: [], payouts: [], cashflow: [], subprojects: [], subprojectComments: [], projectDriveFiles: [], revisions: [], premiseQuestionnaires: [],
})

test('applies project and lead edits before the API responds', () => {
  const data = baseData()
  const next = applyOptimisticMutation(data, 'updateProject', { id: 'project-1', name: 'Projeto novo', stage: 'concluído' })
  const leadNext = applyOptimisticMutation(next, 'updateLead', { id: 'lead-1', title: 'Lead novo', stage: 'proposal' })

  assert.equal(next.projects[0].name, 'Projeto novo')
  assert.equal(next.projects[0].stage, 'concluído')
  assert.equal(leadNext.leads[0].title, 'Lead novo')
  assert.equal(leadNext.leads[0].stage, 'proposal')
})

test('applies archive and subproject stage changes without changing unrelated collections', () => {
  const data = baseData()
  const next = applyOptimisticMutation(data, 'setProjectArchived', { id: 'project-1', archived: true })

  assert.equal(next.projects[0].archived, true)
  assert.strictEqual(next.leads, data.leads)
  assert.strictEqual(next.cashflow, data.cashflow)
  assert.strictEqual(applyOptimisticMutation(data, 'unknownAction', {}), data)
})

test('reconciles project stages when a subproject stage changes optimistically', () => {
  const data = baseData()
  const withSubprojects = {
    ...data,
    projects: [{ ...data.projects[0], stage: 'em-andamento' }],
    subprojects: [
      {
        id: 'subproject-1',
        project_id: 'project-1',
        discipline: 'eletrico',
        amount: 1000,
        stage: 'em-andamento',
        responsible_partner: 'Matheus',
        deadline: null,
        observacao: null,
        area: null,
        contracted_at: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        project_name: 'Projeto antigo',
      },
    ],
  }

  const next = applyOptimisticMutation(withSubprojects, 'updateSubprojectStage', {
    id: 'subproject-1',
    projectId: 'project-1',
    stage: 'concluído',
  })

  assert.equal(next.subprojects[0].stage, 'concluído')
  assert.equal(next.projects[0].stage, 'concluído')
})

test('applies project and revision stage/edit patches', () => {
  const data = {
    ...baseData(),
    revisions: [{
      id: 'revision-1',
      client_name: 'Cliente antigo',
      description: 'Descrição antiga',
      project_id: null,
      responsible_partner: 'Matheus',
      deadline: null,
      delivery_date: null,
      stage: 'a-fazer',
      created_at: '2026-01-01',
      project_name: null,
    }],
  }

  const projectNext = applyOptimisticMutation(data, 'updateProjectStage', { id: 'project-1', stage: 'bloqueado' })
  const revisionNext = applyOptimisticMutation(projectNext, 'updateRevision', {
    id: 'revision-1',
    clientName: 'Cliente novo',
    description: 'Descrição nova',
    projectId: 'project-1',
    responsiblePartner: 'Luís',
    deadline: '2026-07-01',
  })
  const stagedRevision = applyOptimisticMutation(revisionNext, 'updateRevisionStage', {
    id: 'revision-1',
    stage: 'concluída',
    deliveryDate: '2026-07-02',
  })

  assert.equal(projectNext.projects[0].stage, 'bloqueado')
  assert.equal(stagedRevision.revisions[0].client_name, 'Cliente novo')
  assert.equal(stagedRevision.revisions[0].stage, 'concluída')
  assert.equal(stagedRevision.revisions[0].delivery_date, '2026-07-02')
})

test('replays optimistic operations in insertion order', () => {
  const data = baseData()
  const next = replayOptimisticMutations(data, [
    { action: 'updateProject', payload: { id: 'project-1', name: 'Primeiro nome' } },
    { action: 'updateProject', payload: { id: 'project-1', name: 'Nome final' } },
  ])

  assert.equal(next.projects[0].name, 'Nome final')
})
