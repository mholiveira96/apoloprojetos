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

test('ensureSchema adds project drive schema artifacts when schema_version is already current', async () => {
  const dbPath = path.join(os.tmpdir(), `apoloprojetos-drive-schema-${process.pid}-${Date.now()}.sqlite`)
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
    sql: `INSERT INTO app_meta (key, value, updated_at) VALUES ('schema_version', '10', ?)` ,
    args: [new Date().toISOString()],
  })
  await staleDb.execute(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      name TEXT NOT NULL,
      code TEXT,
      area REAL NOT NULL DEFAULT 0,
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
      updated_at TEXT NOT NULL
    )
  `)

  const { ensureSchema, getDb } = await import(`./db.js?case=drive-${Date.now()}`)

  await assert.doesNotReject(async () => {
    await ensureSchema()
  })

  const db = getDb()
  await assert.doesNotReject(async () => {
    await db.execute('SELECT drive_enabled, drive_token, drive_updated_at FROM projects LIMIT 0')
  })
  await assert.doesNotReject(async () => {
    await db.execute('SELECT project_id, subproject_id, blob_url, blob_pathname FROM project_drive_files LIMIT 0')
  })

  await fs.rm(dbPath, { force: true })
  resetDbGlobals()
})
