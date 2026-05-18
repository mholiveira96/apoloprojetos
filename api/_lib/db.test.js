import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createClient } from '@libsql/client'

function resetDbGlobals() {
  globalThis.__apoloDb = null
  globalThis.__apoloSchemaReady = null
}

test('ensureSchema repairs missing subproject artifacts even when schema_version is already current', async () => {
  const dbPath = path.join(os.tmpdir(), `apoloprojetos-schema-${process.pid}-${Date.now()}.sqlite`)
  process.env.APP_LOCAL_DB_URL = `file:${dbPath}`
  process.env.NODE_ENV = 'test'
  resetDbGlobals()

  const staleDb = createClient({ url: `file:${dbPath}` })
  await staleDb.execute(`
    CREATE TABLE app_meta (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await staleDb.execute({
    sql: `INSERT INTO app_meta (key, value, updated_at) VALUES ('schema_version', '8', ?)` ,
    args: [new Date().toISOString()],
  })
  await staleDb.execute(`
    CREATE TABLE subprojects (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      discipline TEXT NOT NULL,
      amount REAL NOT NULL,
      stage TEXT NOT NULL DEFAULT 'a-fazer',
      responsible_partner TEXT NOT NULL,
      deadline TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  const { ensureSchema, getDb } = await import(`./db.js?case=${Date.now()}`)

  await assert.doesNotReject(async () => {
    await ensureSchema()
  })

  const db = getDb()
  await assert.doesNotReject(async () => {
    await db.execute('SELECT observacao FROM subprojects LIMIT 0')
  })
  await assert.doesNotReject(async () => {
    await db.execute('SELECT 1 FROM subproject_comments LIMIT 0')
  })

  await fs.rm(dbPath, { force: true })
  resetDbGlobals()
})
