/**
 * DB IPC handler（db:query / db:exec）
 *
 * 渲染进程通过这两个 channel 让主进程代为执行 SQL。
 * better-sqlite3 是原生模块，只能在主进程加载，故渲染端无法直连数据库。
 *
 * 安全策略：
 * 1. query 通道仅允许以 SELECT 开头的只读语句。收紧到只允许 SELECT
 *    （不允许 WITH/EXPLAIN/VALUES），因为 WITH 开头的 CTE 可包装写语句
 *    （如 WITH x AS (...) INSERT ...），正则前缀校验无法可靠区分。
 *    复杂只读查询（CTE 读）由应用层改写为子查询。
 * 2. exec 通道允许写操作，但禁止 PRAGMA/ATTACH 等破坏连接配置的语句。
 * 3. 参数化绑定（?）防 SQL 注入；不支持 @name 命名占位符。
 *
 * 这是桌面应用（渲染端受信），非 web 服务。阶段 5 会收敛为领域 IPC，
 * 届时渲染端完全不接触原始 SQL。
 */
import { ipcMain } from 'electron'
import type { DbQueryRequest, DbQueryResult, DbExecResult } from '../../shared'
import { IPC_DEFAULT_TIMEOUT, DB_CHANNELS } from '../../shared'
import { createLogger } from '../lib/logger'
import { createTimeoutHandler } from '../lib/ipcGuard'
import { getDatabase } from '../db/connection'
import type { IpcContext } from './context'

const logger = createLogger('ipc.db')

/**
 * db:query 只允许纯 SELECT（收紧：排除 WITH/EXPLAIN/VALUES 等可包装写语句的前缀）。
 * 导出以便单元测试覆盖安全逻辑。
 */
export const READ_ONLY_PREFIX = /^\s*select\b/i
/** exec 禁止的语句前缀（防止破坏连接级配置）。导出以便测试。 */
export const FORBIDDEN_IN_EXEC = /^\s*(pragma|attach|detach|vacuum|reindex)\b/i
/** exec 允许的语句前缀（只允许 DML：INSERT/REPLACE/UPDATE/DELETE）。导出以便测试。 */
export const ALLOWED_EXEC_PREFIX = /^\s*(insert|replace|update|delete)\b/i

/** 判定 SQL 是否被 db:query 接受（只读）。导出供测试。 */
export function isReadOnlyQuery(sql: string): boolean {
  return READ_ONLY_PREFIX.test(sql.trim())
}
/** 判定 SQL 是否被 db:exec 禁止。导出供测试。 */
export function isForbiddenExec(sql: string): boolean {
  return FORBIDDEN_IN_EXEC.test(sql.trim())
}
/** 判定 SQL 是否被 db:exec 接受（仅 DML）。导出供测试。 */
export function isAllowedExec(sql: string): boolean {
  const trimmed = sql.trim()
  return ALLOWED_EXEC_PREFIX.test(trimmed) && !FORBIDDEN_IN_EXEC.test(trimmed)
}

function toBoundParams(params?: unknown[]): unknown[] {
  return Array.isArray(params) ? params : []
}

export function registerDbHandlers(_ctx: IpcContext): void {
  // ---- db:query（只读，返回行数组）----
  ipcMain.handle(
    DB_CHANNELS.DB_QUERY,
    createTimeoutHandler(
      async (_event, request: DbQueryRequest) => {
        try {
          const sql = (request?.sql ?? '').trim()
          if (!sql) return { success: false, error: 'Empty SQL' }
          if (!READ_ONLY_PREFIX.test(sql)) {
            return {
              success: false,
              error: 'db:query only allows SELECT statements (use db:exec for writes)',
            }
          }
          const db = getDatabase()
          const rows = db.prepare(sql).all(...toBoundParams(request.params)) as Record<
            string,
            unknown
          >[]
          const result: DbQueryResult = { success: true, rows }
          return result
        } catch (err) {
          logger.error('db:query failed', { sql: request?.sql, error: String(err) })
          return { success: false, error: String(err) }
        }
      },
      IPC_DEFAULT_TIMEOUT,
      DB_CHANNELS.DB_QUERY
    )
  )

  // ---- db:exec（写入/结构变更，返回 changes/lastInsertRowid）----
  ipcMain.handle(
    DB_CHANNELS.DB_EXEC,
    createTimeoutHandler(
      async (_event, request: DbQueryRequest) => {
        try {
          const sql = (request?.sql ?? '').trim()
          if (!sql) return { success: false, error: 'Empty SQL' }
          if (!isAllowedExec(sql)) {
            return {
              success: false,
              error: 'db:exec only allows INSERT/REPLACE/UPDATE/DELETE statements',
            }
          }
          const db = getDatabase()
          const info = db.prepare(sql).run(...toBoundParams(request.params))
          const result: DbExecResult = {
            success: true,
            changes: info.changes,
            lastInsertRowid:
              typeof info.lastInsertRowid === 'bigint'
                ? Number(info.lastInsertRowid)
                : info.lastInsertRowid,
          }
          return result
        } catch (err) {
          logger.error('db:exec failed', { sql: request?.sql, error: String(err) })
          return { success: false, error: String(err) }
        }
      },
      IPC_DEFAULT_TIMEOUT,
      DB_CHANNELS.DB_EXEC
    )
  )
}
