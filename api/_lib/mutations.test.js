import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const dbPath = path.join(os.tmpdir(), `apoloprojetos-mutations-${process.pid}.sqlite`)
process.env.APP_LOCAL_DB_URL = `file:${dbPath}`
process.env.NODE_ENV = 'test'

const { getDb, ensureSchema } = await import('./db.js')
const { runMutation } = await import('./mutations.js')
const { getBootstrapData } = await import('./app-data.js')

async function resetData() {
  const db = getDb()
  await ensureSchema()
  for (const table of ['subproject_comments', 'partner_payouts', 'project_expenses', 'payment_receipts', 'project_logs', 'subprojects', 'projects', 'leads', 'clients']) {
    await db.execute(`DELETE FROM ${table}`)
  }
}

test.before(async () => {
  await fs.rm(dbPath, { force: true })
  await ensureSchema()
})

test.after(async () => {
  await fs.rm(dbPath, { force: true })
})

test.beforeEach(async () => {
  await resetData()
})

async function createWonLead(overrides = {}) {
  await runMutation('createLead', {
    clientName: 'Cliente Teste',
    title: 'Projeto Base',
    stage: 'won',
    estimatedAmount: '12500',
    salesOwner: 'Luís',
    ...overrides,
  }, 'tester@example.com')

  const initial = await getBootstrapData()
  const lead = initial.leads[0]
  assert.ok(lead, 'lead should exist')
  return lead
}

test('createProjectFromLead creates an operational subproject with responsible partner and observacao', async () => {
  const lead = await createWonLead({ clientName: 'Cliente Ops', title: 'Projeto Eletrico' })

  await runMutation('createProjectFromLead', {
    leadId: lead.id,
    name: 'Projeto Eletrico',
    area: '145.5',
    discipline: 'eletrico',
    salesOwner: 'Matheus',
    contractAmount: '12500',
    deadline: '2026-05-30',
    statusNote: 'Kickoff',
    observacao: 'PGRCC',
  }, 'tester@example.com')

  const data = await getBootstrapData()
  assert.equal(data.projects.length, 1)
  assert.equal(data.projects[0].area, 145.5)
  assert.equal(data.subprojects.length, 1)
  assert.equal(data.subprojects[0].discipline, 'eletrico')
  assert.equal(data.subprojects[0].responsible_partner, 'Matheus')
  assert.equal(data.subprojects[0].amount, 12500)
  assert.equal(data.subprojects[0].observacao, 'PGRCC')
})

test('updateProject updates observacao on selected subproject instead of parent project notes', async () => {
  const lead = await createWonLead({ clientName: 'Cliente Observacao', title: 'Projeto Legalizacao', estimatedAmount: '8000', salesOwner: 'Letícia' })

  await runMutation('createProjectFromLead', {
    leadId: lead.id,
    name: 'Projeto Legalizacao',
    area: '80',
    discipline: 'legalizacao',
    salesOwner: 'Letícia',
    contractAmount: '8000',
  }, 'tester@example.com')

  const created = await getBootstrapData()
  const project = created.projects[0]
  const subproject = created.subprojects[0]

  await runMutation('updateProject', {
    id: project.id,
    name: project.name,
    code: project.code,
    area: '120',
    discipline: project.discipline,
    stage: project.stage,
    contractAmount: String(project.contract_amount),
    salesOwner: 'Matheus',
    deadline: project.deadline,
    statusNote: project.status_note,
    subprojectId: subproject.id,
    subprojectObservacao: 'RITUR',
  }, 'tester@example.com')

  const data = await getBootstrapData()
  assert.equal(data.projects[0].area, 120)
  assert.equal(data.projects[0].notes ?? null, null)
  assert.equal(data.subprojects[0].observacao, 'RITUR')
  assert.equal(data.subprojects[0].responsible_partner, 'Matheus')
})

test('updateSubproject updates deadline and observacao without SQL placeholder mismatch', async () => {
  const lead = await createWonLead({ clientName: 'Cliente Prazo', title: 'Projeto Hidrossanitario', estimatedAmount: '7000' })

  await runMutation('createProjectFromLead', {
    leadId: lead.id,
    name: 'Projeto Hidrossanitario',
    area: '95',
    discipline: 'hidrossanitario',
    salesOwner: 'Matheus',
    contractAmount: '7000',
  }, 'tester@example.com')

  const created = await getBootstrapData()
  const subproject = created.subprojects[0]

  await runMutation('updateSubproject', {
    id: subproject.id,
    discipline: subproject.discipline,
    responsiblePartner: 'Letícia',
    amount: String(subproject.amount),
    deadline: '2026-06-15',
    observacao: 'Compatibilizar com arquitetura',
  }, 'tester@example.com')

  const data = await getBootstrapData()
  assert.equal(data.subprojects[0].deadline, '2026-06-15')
  assert.equal(data.subprojects[0].observacao, 'Compatibilizar com arquitetura')
  assert.equal(data.subprojects[0].responsible_partner, 'Letícia')
})

test('addSubprojectComment stores comment with author and timestamp', async () => {
  const lead = await createWonLead({ clientName: 'Cliente Comments', title: 'Projeto Estrutural', estimatedAmount: '9000' })

  await runMutation('createProjectFromLead', {
    leadId: lead.id,
    name: 'Projeto Estrutural',
    area: '200',
    discipline: 'estrutural',
    salesOwner: 'Matheus',
    contractAmount: '9000',
  }, 'matheus@apolo.com')

  const created = await getBootstrapData()
  const subproject = created.subprojects[0]

  await runMutation('addSubprojectComment', {
    subprojectId: subproject.id,
    body: 'Primeira revisão enviada para o cliente.',
  }, 'matheus@apolo.com')

  const data = await getBootstrapData()
  assert.equal(data.subprojectComments.length, 1)
  assert.equal(data.subprojectComments[0].subproject_id, subproject.id)
  assert.equal(data.subprojectComments[0].body, 'Primeira revisão enviada para o cliente.')
  assert.equal(data.subprojectComments[0].created_by, 'matheus@apolo.com')
  assert.ok(data.subprojectComments[0].created_at)
})
