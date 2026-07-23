/**
 * SQLite 连接管理（单例）
 *
 * - 数据库文件位于 userData/reader.db
 * - 首次连接时执行 schema（内联常量，无运行时文件依赖）
 * - schema_migrations 表记录已应用的迁移版本，支持后续增量迁移
 *
 * better-sqlite3 是同步 API。渲染进程通过 db:query/db:exec IPC 访问，
 * 不持有连接（sandbox 无法用原生模块）。
 */
import { app } from 'electron'
import path from 'path'
import Database from 'better-sqlite3'
import type { Database as DatabaseType } from 'better-sqlite3'
import { createLogger } from '../lib/logger'
import { SCHEMA_SQL } from './schema'

const logger = createLogger('db')

let dbInstance: DatabaseType | null = null

/**
 * 增量迁移列表。
 * v1 = 初始 schema（全部建表）。后续结构变更 append 新版本，每个 migration.up
 * 只包含该版本的增量 DDL。
 */
const MIGRATIONS: Array<{ version: number; description: string; up: (db: DatabaseType) => void }> = [
  {
    version: 1,
    description: 'initial schema (files, file_index, reading_marks, sessions, chapters, snapshots, bookmarks, read_later, settings)',
    up: (db) => {
      db.exec(SCHEMA_SQL)
    },
  },
]

function runMigrations(db: DatabaseType): void {
  // 先幂等建迁移记录表（避免循环依赖：不能依赖被迁移的 schema 来创建它）
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     INTEGER PRIMARY KEY,
      description TEXT,
      applied_at  INTEGER NOT NULL
    )
  `)
  const appliedRows = db
    .prepare('SELECT version FROM schema_migrations ORDER BY version')
    .all() as Array<{ version: number }>
  const applied = appliedRows.map((r) => r.version)
  const appliedSet = new Set(applied)
  const highest = applied.length ? applied[applied.length - 1] : 0

  for (const migration of MIGRATIONS) {
    if (appliedSet.has(migration.version)) continue
    logger.info(`Applying migration v${migration.version}`, { description: migration.description })
    const tx = db.transaction(() => {
      migration.up(db)
      db.prepare(
        'INSERT INTO schema_migrations (version, description, applied_at) VALUES (?, ?, ?)'
      ).run(migration.version, migration.description, Date.now())
    })
    tx()
  }
  logger.info('DB migrations complete', {
    highestApplied: highest,
    totalMigrations: MIGRATIONS.length,
  })
}

/**
 * 取数据库单例。首次调用时打开连接、执行迁移。
 * 必须在 app.whenReady 之后调用（依赖 app.getPath('userData')）。
 *
 * 迁移失败时关闭并置空连接，避免半初始化的"空壳"连接被后续调用复用。
 */
export function getDatabase(): DatabaseType {
  if (dbInstance) return dbInstance

  const dbPath = path.join(app.getPath('userData'), 'reader.db')
  logger.info('Opening database', { dbPath })

  const db = new Database(dbPath)
  // PRAGMA 在建表事务外设置（journal_mode 切换不能在事务内）
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  try {
    runMigrations(db)
    dbInstance = db
    return dbInstance
  } catch (err) {
    logger.error('DB migration failed', { error: String(err) })
    try {
      db.close()
    } catch {
      // ignore close error during cleanup
    }
    throw err
  }
}

/** 关闭数据库（app before-quit 时调用） */
export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close()
    } catch (err) {
      logger.error('Failed to close database', { error: String(err) })
    }
    dbInstance = null
  }
}

export type { DatabaseType }
