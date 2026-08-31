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
  for (const table of ['project_drive_files', 'subproject_comments', 'partner_payouts', 'project_expenses', 'payment_receipts', 'project_logs', 'subprojects', 'projects', 'leads', 'clients']) {
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

test('addPayout splits one payout across two partners by percentage', async () => {
  const lead = await createWonLead({ clientName: 'Cliente Repasse', title: 'Projeto Dividido', estimatedAmount: '1000' })

  await runMutation('createProjectFromLead', {
    leadId: lead.id,
    name: 'Projeto Dividido',
    area: '75',
    discipline: 'eletrico',
    salesOwner: 'Matheus',
    contractAmount: '1000',
  }, 'tester@example.com')

  const created = await getBootstrapData()
  const subproject = created.subprojects[0]

  await runMutation('addPayout', {
    projectId: created.projects[0].id,
    subprojectId: subproject.id,
    bankAccount: 'Inter',
    entryDate: '2026-06-20',
    note: 'Repasse dividido',
    shares: [
      { partnerName: 'Letícia', percentage: '50' },
      { partnerName: 'Luís', percentage: '50' },
    ],
  }, 'tester@example.com')

  const data = await getBootstrapData()
  assert.equal(data.payouts.length, 2)
  assert.deepEqual(
    data.payouts
      .map((payout) => ({ partner: payout.partner_name, amount: payout.amount, percentage: payout.percentage, note: payout.note, bank: payout.bank_account }))
      .sort((a, b) => a.partner.localeCompare(b.partner, 'pt-BR', { sensitivity: 'base' })),
    [
      { partner: 'Letícia', amount: 500, percentage: 50, note: 'Repasse dividido', bank: 'Inter' },
      { partner: 'Luís', amount: 500, percentage: 50, note: 'Repasse dividido', bank: 'Inter' },
    ],
  )
})

test('addPayout rejects split payouts whose percentages exceed 100%', async () => {
  const lead = await createWonLead({ clientName: 'Cliente Limite', title: 'Projeto Percentual', estimatedAmount: '1000' })

  await runMutation('createProjectFromLead', {
    leadId: lead.id,
    name: 'Projeto Percentual',
    area: '55',
    discipline: 'sanitario',
    salesOwner: 'Matheus',
    contractAmount: '1000',
  }, 'tester@example.com')

  const created = await getBootstrapData()
  const subproject = created.subprojects[0]

  await assert.rejects(
    runMutation('addPayout', {
      projectId: created.projects[0].id,
      subprojectId: subproject.id,
      shares: [
        { partnerName: 'Letícia', percentage: '60' },
        { partnerName: 'Luís', percentage: '50' },
      ],
    }, 'tester@example.com'),
    /não pode passar de 100%/i,
  )
})

test('addPayout accepts split payouts entered by absolute amount', async () => {
  const lead = await createWonLead({ clientName: 'Cliente Valor', title: 'Projeto Valor', estimatedAmount: '1000' })

  await runMutation('createProjectFromLead', {
    leadId: lead.id,
    name: 'Projeto Valor',
    area: '60',
    discipline: 'hidraulico',
    salesOwner: 'Matheus',
    contractAmount: '1000',
  }, 'tester@example.com')

  const created = await getBootstrapData()
  const subproject = created.subprojects[0]

  await runMutation('addPayout', {
    projectId: created.projects[0].id,
    subprojectId: subproject.id,
    bankAccount: 'Nubank',
    entryDate: '2026-06-21',
    note: 'Repasse por valor',
    shares: [
      { partnerName: 'Letícia', amount: '300' },
      { partnerName: 'Luís', amount: '200' },
    ],
  }, 'tester@example.com')

  const data = await getBootstrapData()
  assert.equal(data.payouts.length, 2)
  assert.deepEqual(
    data.payouts
      .map((payout) => ({ partner: payout.partner_name, amount: payout.amount, percentage: payout.percentage, note: payout.note, bank: payout.bank_account }))
      .sort((a, b) => a.partner.localeCompare(b.partner, 'pt-BR', { sensitivity: 'base' })),
    [
      { partner: 'Letícia', amount: 300, percentage: null, note: 'Repasse por valor', bank: 'Nubank' },
      { partner: 'Luís', amount: 200, percentage: null, note: 'Repasse por valor', bank: 'Nubank' },
    ],
  )
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

test('setProjectDriveEnabled enables drive and creates a token when missing', async () => {
  const lead = await createWonLead({ clientName: 'Cliente Drive', title: 'Projeto Drive' })

  await runMutation('createProjectFromLead', {
    leadId: lead.id,
    name: 'Projeto Drive',
    area: '110',
    discipline: 'arquitetura',
    salesOwner: 'Matheus',
    contractAmount: '12000',
  }, 'tester@example.com')

  const created = await getBootstrapData()
  const project = created.projects[0]

  await runMutation('setProjectDriveEnabled', {
    projectId: project.id,
    enabled: true,
  }, 'tester@example.com')

  const data = await getBootstrapData()
  assert.equal(data.projects[0].drive_enabled, true)
  assert.ok(data.projects[0].drive_token)
  assert.match(String(data.projects[0].drive_token), /^[A-Za-z0-9]{10}$/)
  assert.ok(data.projects[0].drive_updated_at)
})

test('regenerateProjectDriveToken rotates token without disabling drive', async () => {
  const lead = await createWonLead({ clientName: 'Cliente Token', title: 'Projeto Token' })

  await runMutation('createProjectFromLead', {
    leadId: lead.id,
    name: 'Projeto Token',
    area: '140',
    discipline: 'estrutural',
    salesOwner: 'Letícia',
    contractAmount: '18000',
  }, 'tester@example.com')

  const created = await getBootstrapData()
  const project = created.projects[0]

  await runMutation('setProjectDriveEnabled', {
    projectId: project.id,
    enabled: true,
  }, 'tester@example.com')

  const enabledData = await getBootstrapData()
  const previousToken = enabledData.projects[0].drive_token

  await runMutation('regenerateProjectDriveToken', {
    projectId: project.id,
  }, 'tester@example.com')

  const data = await getBootstrapData()
  assert.equal(data.projects[0].drive_enabled, true)
  assert.ok(data.projects[0].drive_token)
  assert.match(String(data.projects[0].drive_token), /^[A-Za-z0-9]{10}$/)
  assert.notEqual(data.projects[0].drive_token, previousToken)
})

test('bootstrap returns project drive files ordered by newest first', async () => {
  const lead = await createWonLead({ clientName: 'Cliente Files', title: 'Projeto Files' })

  await runMutation('createProjectFromLead', {
    leadId: lead.id,
    name: 'Projeto Files',
    area: '210',
    discipline: 'hidrossanitario',
    salesOwner: 'Matheus',
    contractAmount: '22000',
  }, 'tester@example.com')

  const created = await getBootstrapData()
  const project = created.projects[0]
  const subproject = created.subprojects[0]
  const db = getDb()

  await db.execute({
    sql: `INSERT INTO project_drive_files (
      id, project_id, subproject_id, filename, blob_url, blob_pathname, content_type, size_bytes, uploaded_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ['pdf_older', project.id, subproject.id, 'memorial.pdf', 'https://blob.example/memorial.pdf', 'apolo/projetos/memorial.pdf', 'application/pdf', 1234, 'older@example.com', '2026-06-01T10:00:00.000Z'],
  })
  await db.execute({
    sql: `INSERT INTO project_drive_files (
      id, project_id, subproject_id, filename, blob_url, blob_pathname, content_type, size_bytes, uploaded_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ['img_newer', project.id, null, 'fachada.png', 'https://blob.example/fachada.png', 'apolo/projetos/fachada.png', 'image/png', 4321, 'newer@example.com', '2026-06-02T10:00:00.000Z'],
  })

  const data = await getBootstrapData()
  assert.equal(data.projectDriveFiles.length, 2)
  assert.equal(data.projectDriveFiles[0].id, 'img_newer')
  assert.equal(data.projectDriveFiles[0].project_id, project.id)
  assert.equal(data.projectDriveFiles[1].subproject_id, subproject.id)
})

test('ensureSchema expected-shape check includes subproject area column', async () => {
  const db = getDb()
  const info = await db.execute("PRAGMA table_info(subprojects)")
  const columns = info.rows.map((row) => String(row.name))
  assert.ok(columns.includes('area'))
})

test('createProject persists subproject area modes from the zero-state operations form', async () => {
  await runMutation('createProject', {
    clientName: 'Cliente Projeto Zero',
    name: 'Projeto Zero',
    area: '200',
    discipline: 'arquitetura',
    stage: 'aguardar',
    salesOwner: 'Matheus',
    contractAmount: '50000',
    subprojects: [
      { discipline: 'eletrico', amount: '5000', responsiblePartner: 'Matheus', deadline: '', observacao: '', area: null },
      { discipline: 'hidrossanitario', amount: '3000', responsiblePartner: 'Matheus', deadline: '', observacao: '', area: '50' },
      { discipline: 'incendio', amount: '2000', responsiblePartner: 'Matheus', deadline: '', observacao: '', area: -1 },
    ],
  }, 'tester@example.com')

  const data = await getBootstrapData()
  assert.equal(data.projects.length, 1)

  const subs = data.subprojects.filter((sp) => sp.project_id === data.projects[0].id)
  assert.equal(subs.length, 3)
  assert.equal(subs.find((sp) => sp.discipline === 'eletrico')?.area, null)
  assert.equal(subs.find((sp) => sp.discipline === 'hidrossanitario')?.area, 50)
  assert.equal(subs.find((sp) => sp.discipline === 'incendio')?.area, -1)
})

test('subproject completion requires a date and syncs the parent project', async () => {
  const lead = await createWonLead({ clientName: 'Cliente Conclusão', title: 'Projeto Conclusão' })
  await runMutation('createProjectFromLead', {
    leadId: lead.id,
    name: 'Projeto Conclusão',
    area: '100',
    discipline: 'eletrico',
    salesOwner: 'Matheus',
    contractAmount: '10000',
  }, 'tester@example.com')

  let data = await getBootstrapData()
  const project = data.projects[0]
  const subproject = data.subprojects[0]

  await assert.rejects(
    runMutation('updateSubprojectStage', {
      id: subproject.id,
      projectId: project.id,
      stage: 'concluído',
    }, 'tester@example.com'),
    /data de conclusão é obrigatória/i,
  )

  await runMutation('updateSubprojectStage', {
    id: subproject.id,
    projectId: project.id,
    stage: 'concluído',
    completedAt: '2026-06-30',
  }, 'tester@example.com')

  data = await getBootstrapData()
  assert.equal(data.subprojects[0].stage, 'concluído')
  assert.equal(data.projects[0].stage, 'concluído')
  assert.ok(data.logs.some((log) => log.title === 'Entrega concluída'))
})

test('bootstrap summary excludes completed projects and reports delivered unpaid balance', async () => {
  const lead = await createWonLead({ clientName: 'Cliente KPI', title: 'Projeto KPI' })
  await runMutation('createProjectFromLead', {
    leadId: lead.id,
    name: 'Projeto KPI',
    area: '100',
    discipline: 'eletrico',
    salesOwner: 'Matheus',
    contractAmount: '10000',
  }, 'tester@example.com')

  const data = await getBootstrapData()
  assert.equal(data.summary.activeProjects, 1)

  const project = data.projects[0]
  const subproject = data.subprojects[0]
  await runMutation('updateSubprojectStage', {
    id: subproject.id,
    projectId: project.id,
    stage: 'concluído',
    completedAt: '2026-06-30',
  }, 'tester@example.com')

  const completed = await getBootstrapData()
  assert.equal(completed.summary.activeProjects, 0)
  assert.equal(completed.summary.deliveredUnpaidTotal, 10000)
})

test('deleting a project removes every dependent record', async () => {
  await runMutation('createProject', {
    clientName: 'Cliente Exclusão',
    name: 'Projeto Exclusão',
    area: '100',
    discipline: 'eletrico',
    stage: 'em-andamento',
    salesOwner: 'Matheus',
    contractAmount: '10000',
    subprojects: [
      { discipline: 'eletrico', amount: '10000', responsiblePartner: 'Matheus', deadline: '', observacao: '' },
    ],
  }, 'tester@example.com')

  const created = await getBootstrapData()
  const project = created.projects[0]
  const subproject = created.subprojects[0]
  const db = getDb()
  await db.execute({
    sql: `INSERT INTO partner_payouts (id, project_id, subproject_id, partner_name, amount, paid_at, created_at)
          VALUES (?, ?, NULL, ?, ?, ?, ?)`,
    args: ['payout-orphan-check', project.id, 'Matheus', 100, '2026-06-30', new Date().toISOString()],
  })
  await db.execute({
    sql: `INSERT INTO project_drive_files (id, project_id, subproject_id, filename, blob_url, blob_pathname, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ['drive-delete-check', project.id, subproject.id, 'arquivo.pdf', 'https://blob.example/arquivo.pdf', 'apolo/arquivo.pdf', new Date().toISOString()],
  })
  await db.execute({
    sql: `INSERT INTO revisions (id, client_name, description, project_id, responsible_partner, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: ['revision-delete-check', 'Cliente Exclusão', 'Revisão', project.id, 'Matheus', new Date().toISOString()],
  })

  await runMutation('deleteProject', { projectId: project.id }, 'tester@example.com')

  for (const [table, id] of [
    ['projects', project.id],
    ['subprojects', subproject.id],
    ['partner_payouts', 'payout-orphan-check'],
    ['project_drive_files', 'drive-delete-check'],
    ['revisions', 'revision-delete-check'],
  ]) {
    const result = await db.execute({ sql: `SELECT id FROM ${table} WHERE id = ?`, args: [id] })
    assert.equal(result.rows.length, 0, `${table} row should be deleted`)
  }
})

test('financial mutations reject negative amounts', async () => {
  await assert.rejects(
    runMutation('addExpense', { amount: '-1', entryDate: '2026-06-30' }, 'tester@example.com'),
    /não pode ser negativo/i,
  )
})

test('public questionnaire answers have bounded input sizes', async () => {
  await assert.rejects(
    runMutation('savePremiseQuestionnaire', {
      respondentName: 'Pessoa Teste',
      answers: { neighborhood: 'x'.repeat(4001) },
      status: 'completed',
    }, 'public-questionnaire'),
    /longa demais/i,
  )
})

test('subproject area supports inherit, custom, and N/A', async () => {
  const lead = await createWonLead({ clientName: 'Cliente Area', title: 'Projeto Area' })
  await runMutation('createProjectFromLead', {
    leadId: lead.id,
    name: 'Projeto Area',
    area: '200',
    discipline: 'arquitetura',
    salesOwner: 'Matheus',
    contractAmount: '50000',
  }, 'tester@example.com')

  let data = await getBootstrapData()
  const project = data.projects[0]

  // Create subproject with inherit (area = null)
  await runMutation('createSubproject', {
    projectId: project.id,
    discipline: 'eletrico',
    amount: '5000',
    responsiblePartner: 'Matheus',
    area: null,
  }, 'tester@example.com')

  // Create subproject with custom area
  await runMutation('createSubproject', {
    projectId: project.id,
    discipline: 'hidrossanitario',
    amount: '3000',
    responsiblePartner: 'Matheus',
    area: '50',
  }, 'tester@example.com')

  // Create subproject with N/A (area = -1)
  await runMutation('createSubproject', {
    projectId: project.id,
    discipline: 'incendio',
    amount: '2000',
    responsiblePartner: 'Matheus',
    area: -1,
  }, 'tester@example.com')

  data = await getBootstrapData()
  // createProjectFromLead also creates the initial architecture subproject.
  // Restrict this assertion to the three subprojects created by this test.
  const subs = data.subprojects.filter((sp) => (
    sp.project_id === project.id
    && ['eletrico', 'hidrossanitario', 'incendio'].includes(sp.discipline)
  ))
  assert.equal(subs.length, 3)

  const inherit = subs.find((sp) => sp.discipline === 'eletrico')
  assert.equal(inherit.area, null)

  const custom = subs.find((sp) => sp.discipline === 'hidrossanitario')
  assert.equal(custom.area, 50)

  const na = subs.find((sp) => sp.discipline === 'incendio')
  assert.equal(na.area, -1)

  // Update subproject to change area mode
  await runMutation('updateSubproject', {
    id: inherit.id,
    discipline: 'eletrico',
    amount: '5000',
    responsiblePartner: 'Matheus',
    area: '75',
  }, 'tester@example.com')

  data = await getBootstrapData()
  const updated = data.subprojects.find((sp) => sp.id === inherit.id)
  assert.equal(updated.area, 75)
})
