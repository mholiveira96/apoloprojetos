import { createClient } from '@libsql/client'

// Survive Vite hot-module re-imports (cache-busting appends ?t=mtime each request)
let clientSingleton = globalThis.__apoloDb ?? null
let schemaReady = globalThis.__apoloSchemaReady ?? null
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const LOCAL_DB_URL = process.env.APP_LOCAL_DB_URL || 'file:.apolo-dev.sqlite'
const USE_REMOTE_DB_IN_DEV = process.env.APP_USE_REMOTE_DB === 'true'

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    title TEXT NOT NULL,
    stage TEXT NOT NULL,
    source TEXT,
    estimated_amount REAL DEFAULT 0,
    sales_owner TEXT,
    notes TEXT,
    inbound_at TEXT,
    first_contact_at TEXT,
    last_contact_at TEXT,
    next_follow_up_at TEXT,
    proposal_sent_at TEXT,
    closed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    name TEXT NOT NULL,
    code TEXT,
    discipline TEXT,
    stage TEXT NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0,
    contract_amount REAL DEFAULT 0,
    sales_owner TEXT,
    sales_bonus_percent REAL DEFAULT 10,
    base_partner_split_percent REAL DEFAULT 50,
    deadline TEXT,
    status_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )`,
  `CREATE TABLE IF NOT EXISTS project_logs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    log_type TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_by TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`,
  `CREATE TABLE IF NOT EXISTS payment_receipts (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    project_id TEXT,
    amount REAL NOT NULL,
    bank_account TEXT,
    received_at TEXT NOT NULL,
    note TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`,
  `CREATE TABLE IF NOT EXISTS project_expenses (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT,
    bank_account TEXT,
    paid_at TEXT NOT NULL,
    vendor TEXT,
    note TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`,
  `CREATE TABLE IF NOT EXISTS partner_payouts (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    partner_name TEXT NOT NULL,
    amount REAL NOT NULL,
    bank_account TEXT,
    paid_at TEXT NOT NULL,
    note TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`,
  `CREATE TABLE IF NOT EXISTS subprojects (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    discipline TEXT NOT NULL,
    amount REAL NOT NULL,
    stage TEXT NOT NULL DEFAULT 'a-fazer',
    responsible_partner TEXT NOT NULL,
    deadline TEXT,
    observacao TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`,
  `CREATE TABLE IF NOT EXISTS lead_proposals (
    lead_id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_data TEXT NOT NULL,
    size INTEGER,
    uploaded_at TEXT NOT NULL,
    uploaded_by TEXT,
    FOREIGN KEY (lead_id) REFERENCES leads(id)
  )`,
  `CREATE TABLE IF NOT EXISTS subproject_comments (
    id TEXT PRIMARY KEY,
    subproject_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_by TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (subproject_id) REFERENCES subprojects(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_stage ON projects(stage)`,
  `CREATE INDEX IF NOT EXISTS idx_project_logs_project ON project_logs(project_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_receipts_project ON payment_receipts(project_id, received_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_project ON project_expenses(project_id, paid_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_payouts_project ON partner_payouts(project_id, paid_at DESC)`
]

export function getDb() {
  if (clientSingleton) return clientSingleton

  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (IS_PRODUCTION && (!url || !authToken)) {
    throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
  }

  if ((IS_PRODUCTION || USE_REMOTE_DB_IN_DEV) && url && authToken) {
    clientSingleton = createClient({ url, authToken })
  } else {
    clientSingleton = createClient({ url: LOCAL_DB_URL })
  }
  globalThis.__apoloDb = clientSingleton
  return clientSingleton
}

async function ensureColumn(tableName, columnName, columnSql) {
  const db = getDb()
  try {
    await db.execute(`SELECT ${columnName} FROM ${tableName} LIMIT 0`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('no such column') || msg.includes('SQL_INPUT_ERROR')) {
      await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnSql}`)
    } else {
      throw err
    }
  }
}

async function runLeadSchemaMigrations() {
  const db = getDb()
  await ensureColumn('leads', 'client_id', 'client_id TEXT REFERENCES clients(id)')
  await ensureColumn('leads', 'inbound_at', 'inbound_at TEXT')
  await ensureColumn('leads', 'first_contact_at', 'first_contact_at TEXT')
  await ensureColumn('leads', 'last_contact_at', 'last_contact_at TEXT')
  await ensureColumn('leads', 'next_follow_up_at', 'next_follow_up_at TEXT')
  await ensureColumn('leads', 'proposal_sent_at', 'proposal_sent_at TEXT')
  await ensureColumn('leads', 'closed_at', 'closed_at TEXT')
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON leads(next_follow_up_at)`)
  await db.execute(`UPDATE leads SET inbound_at = COALESCE(inbound_at, substr(created_at, 1, 10)) WHERE inbound_at IS NULL`)
}

async function runProjectSchemaMigrations() {
  const db = getDb()
  await ensureColumn('projects', 'client_id', 'client_id TEXT REFERENCES clients(id)')
  await ensureColumn('projects', 'lead_id', 'lead_id TEXT REFERENCES leads(id)')
  await ensureColumn('projects', 'notes', 'notes TEXT')
  await ensureColumn('projects', 'archived', 'archived INTEGER NOT NULL DEFAULT 0')
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id)`)
  await db.execute(`
    UPDATE projects
    SET client_id = (
      SELECT client_id
      FROM leads
      WHERE leads.id = projects.lead_id
    )
    WHERE client_id IS NULL AND lead_id IS NOT NULL
  `)
  // Migrate old stage values to new project lifecycle stages
  await db.execute(`UPDATE projects SET stage = 'aguardar' WHERE stage IN ('proposal', 'backlog')`)
  await db.execute(`UPDATE projects SET stage = 'em-andamento' WHERE stage IN ('in-progress', 'waiting-files')`)
  await db.execute(`UPDATE projects SET stage = 'em-andamento' WHERE stage IN ('bloqueado', 'review')`)
  await db.execute(`UPDATE projects SET stage = 'concluído-aguardando-pagamento' WHERE stage IN ('delivered')`)
  await db.execute(`UPDATE projects SET stage = 'concluído' WHERE stage IN ('closed')`)
  // Migrate Notion "aguardando terceiros" leads → they were actually projects (run once)
  const migrationFlag = await db.execute(`SELECT value FROM app_meta WHERE key = 'migration_notion_orphan_leads'`)
  if (migrationFlag.rows.length === 0) {
    const orphanLeads = await db.execute(`SELECT * FROM leads WHERE stage = 'negotiation'`)
    for (const lead of orphanLeads.rows) {
    const projectId = `proj_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
    await db.execute({
      sql: `INSERT OR IGNORE INTO projects (id, name, stage, contract_amount, sales_owner, status_note, notes, created_at, updated_at)
            VALUES (?, ?, 'em-andamento', ?, ?, 'Migrado do Notion (aguardando terceiros)', ?, ?, ?)`,
      args: [
        projectId,
        String(lead.title || 'Projeto migrado'),
        Number(lead.estimated_amount) || 0,
        String(lead.sales_owner || ''),
        String(lead.notes || ''),
        String(lead.created_at),
        new Date().toISOString(),
      ],
    })
      // Delete the lead from the pipeline
      await db.execute({ sql: `DELETE FROM leads WHERE id = ?`, args: [String(lead.id)] })
    }
    await db.execute({
      sql: `INSERT INTO app_meta (key, value, updated_at) VALUES ('migration_notion_orphan_leads', 'done', ?)`,
      args: [new Date().toISOString()],
    })
  }
  // Ensure subproject index exists
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_subprojects_project ON subprojects(project_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_subprojects_stage ON subprojects(stage)`)
}

function mapLegacyProjectStageToSubprojectStage(stage) {
  const normalized = String(stage || '').trim()
  if (normalized === 'em-andamento') return 'em-andamento'
  if (normalized === 'concluído' || normalized === 'concluído-aguardando-pagamento') return 'concluído'
  return 'a-fazer'
}

async function runSubprojectSchemaMigrations() {
  const db = getDb()
  await ensureColumn('subprojects', 'contracted_at', 'contracted_at TEXT')
  await ensureColumn('subprojects', 'deadline', 'deadline TEXT')
  await db.execute(`
    UPDATE subprojects
    SET deadline = (SELECT deadline FROM projects WHERE projects.id = subprojects.project_id)
    WHERE subprojects.deadline IS NULL
      AND EXISTS (SELECT 1 FROM projects WHERE projects.id = subprojects.project_id AND deadline IS NOT NULL)
  `)
  await ensureColumn('subprojects', 'observacao', 'observacao TEXT')
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_subprojects_project ON subprojects(project_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_subprojects_stage ON subprojects(stage)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_subprojects_contracted_at ON subprojects(contracted_at)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_subproject_comments_subproject ON subproject_comments(subproject_id, created_at DESC)`)

  const migrationFlag = await db.execute(`SELECT value FROM app_meta WHERE key = 'migration_projects_to_subprojects_v1'`)
  if (migrationFlag.rows.length > 0) return

  const legacyProjects = await db.execute(`
    SELECT
      projects.id,
      projects.discipline,
      projects.contract_amount,
      projects.stage,
      projects.sales_owner,
      projects.created_at,
      projects.updated_at,
      (
        SELECT MIN(COALESCE(project_logs.due_date, project_logs.created_at))
        FROM project_logs
        WHERE project_logs.project_id = projects.id
          AND project_logs.title = 'Contratação registrada'
      ) AS contracted_at
    FROM projects
    WHERE NOT EXISTS (
      SELECT 1
      FROM subprojects
      WHERE subprojects.project_id = projects.id
    )
  `)

  for (const project of legacyProjects.rows) {
    await db.execute({
      sql: `INSERT INTO subprojects (
              id, project_id, discipline, amount, stage, responsible_partner, contracted_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        createId('sp'),
        String(project.id),
        String(project.discipline || 'geral'),
        Number(project.contract_amount) || 0,
        mapLegacyProjectStageToSubprojectStage(project.stage),
        String(project.sales_owner || 'A definir'),
        project.contracted_at ? String(project.contracted_at) : null,
        String(project.created_at || nowIso()),
        String(project.updated_at || nowIso()),
      ],
    })
  }

  await db.execute({
    sql: `INSERT INTO app_meta (key, value, updated_at) VALUES ('migration_projects_to_subprojects_v1', 'done', ?)`,
    args: [new Date().toISOString()],
  })
}

async function runProposalSchemaMigrations() {
  await ensureColumn('leads', 'proposal_filename', 'proposal_filename TEXT')
}

async function runReceiptSchemaMigrations() {
  const db = getDb()
  await ensureColumn('payment_receipts', 'client_id', 'client_id TEXT REFERENCES clients(id)')
  // Backfill client_id from existing project relationships
  await db.execute(`
    UPDATE payment_receipts
    SET client_id = (SELECT client_id FROM projects WHERE projects.id = payment_receipts.project_id)
    WHERE client_id IS NULL AND project_id IS NOT NULL
  `)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_receipts_client ON payment_receipts(client_id, received_at DESC)`)
}

async function runPayoutSchemaMigrations() {
  const db = getDb()
  await ensureColumn('partner_payouts', 'subproject_id', 'subproject_id TEXT REFERENCES subprojects(id)')
  await ensureColumn('partner_payouts', 'percentage', 'percentage REAL')
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_payouts_subproject ON partner_payouts(subproject_id, paid_at DESC)`)
}

async function runExpenseSchemaMigrations() {
  const db = getDb()
  const info = await db.execute(`PRAGMA table_info(project_expenses)`)
  const col = info.rows.find((r) => String(r.name) === 'project_id')
  if (col && Number(col.notnull) === 1) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS _project_expenses_new (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        amount REAL NOT NULL,
        category TEXT,
        bank_account TEXT,
        paid_at TEXT NOT NULL,
        vendor TEXT,
        note TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `)
    await db.execute(`INSERT OR IGNORE INTO _project_expenses_new SELECT * FROM project_expenses`)
    await db.execute(`DROP TABLE project_expenses`)
    await db.execute(`ALTER TABLE _project_expenses_new RENAME TO project_expenses`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_expenses_project ON project_expenses(project_id, paid_at DESC)`)
  }
}

const SCHEMA_VERSION = '8'

async function hasExpectedSchemaShape(db) {
  try {
    await db.execute(`SELECT lead_id FROM projects LIMIT 0`)
    await db.execute(`SELECT observacao FROM subprojects LIMIT 0`)
    await db.execute(`SELECT 1 FROM subproject_comments LIMIT 0`)
    return true
  } catch {
    return false
  }
}

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDb()
      // Fast-path: if schema is already at current version, skip all migrations
      try {
        const meta = await db.execute(`SELECT value FROM app_meta WHERE key = 'schema_version' LIMIT 1`)
        if (String(meta.rows[0]?.value) === SCHEMA_VERSION && await hasExpectedSchemaShape(db)) return
      } catch { /* app_meta doesn't exist yet — proceed with full migration */ }

      for (const sql of schemaStatements) {
        await db.execute(sql)
      }
      await runLeadSchemaMigrations()
      await runProjectSchemaMigrations()
      await runSubprojectSchemaMigrations()
      await runReceiptSchemaMigrations()
      await runExpenseSchemaMigrations()
      await runPayoutSchemaMigrations()
      await runProposalSchemaMigrations()
      await db.execute({
        sql: `INSERT INTO app_meta (key, value, updated_at)
              VALUES ('schema_version', ?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: [SCHEMA_VERSION, new Date().toISOString()],
      })
    })().catch((err) => {
      schemaReady = null
      globalThis.__apoloSchemaReady = null
      throw err
    })
    globalThis.__apoloSchemaReady = schemaReady
  }

  await schemaReady
}

export function createId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

export function nowIso() {
  return new Date().toISOString()
}
