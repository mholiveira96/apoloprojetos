import { createClient } from '@libsql/client'

let clientSingleton = null
let schemaReady = null

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
    project_id TEXT NOT NULL,
    amount REAL NOT NULL,
    bank_account TEXT,
    received_at TEXT NOT NULL,
    note TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL,
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
  `CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_stage ON projects(stage)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_project_logs_project ON project_logs(project_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_receipts_project ON payment_receipts(project_id, received_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_project ON project_expenses(project_id, paid_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_payouts_project ON partner_payouts(project_id, paid_at DESC)`
]

export function getDb() {
  if (clientSingleton) return clientSingleton

  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url || !authToken) {
    throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
  }

  clientSingleton = createClient({ url, authToken })
  return clientSingleton
}

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDb()
      for (const sql of schemaStatements) {
        await db.execute(sql)
      }
      await db.execute({
        sql: `INSERT INTO app_meta (key, value, updated_at)
              VALUES ('schema_version', '1', ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: [new Date().toISOString()],
      })
    })()
  }

  await schemaReady
}

export function createId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

export function nowIso() {
  return new Date().toISOString()
}
