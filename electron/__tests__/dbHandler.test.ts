import { describe, expect, it } from 'vitest'
import { isReadOnlyQuery, isForbiddenExec } from '../ipc/dbHandler'

/**
 * db:query / db:exec 的 SQL 安全校验。
 *
 * 这些是纯函数测试（不依赖真实数据库），验证安全边界：
 * - db:query 必须拒绝所有写语句（含 CTE 包装的写）
 * - db:exec 必须拒绝破坏连接配置的语句
 */
describe('db:query read-only guard (isReadOnlyQuery)', () => {
  it('accepts plain SELECT', () => {
    expect(isReadOnlyQuery('SELECT * FROM files')).toBe(true)
    expect(isReadOnlyQuery('  select 1')).toBe(true)
    expect(isReadOnlyQuery('SELECT count(*) FROM reading_marks WHERE file_path = ?')).toBe(true)
  })

  it('rejects write statements', () => {
    expect(isReadOnlyQuery('INSERT INTO files VALUES (1)')).toBe(false)
    expect(isReadOnlyQuery('UPDATE files SET deleted=1')).toBe(false)
    expect(isReadOnlyQuery('DELETE FROM files')).toBe(false)
    expect(isReadOnlyQuery('DROP TABLE files')).toBe(false)
  })

  it('rejects CTE-wrapped writes (the B1 bypass vector)', () => {
    // 这些以 WITH 开头，但主语句是写——旧正则放过，收紧后必须拒绝
    expect(isReadOnlyQuery('WITH x AS (SELECT 1) INSERT INTO files SELECT * FROM x')).toBe(false)
    expect(isReadOnlyQuery('WITH x AS (...) UPDATE files SET deleted=1')).toBe(false)
    expect(isReadOnlyQuery('WITH x AS (...) DELETE FROM files')).toBe(false)
  })

  it('rejects EXPLAIN/VALUES to close the prefix-loophole', () => {
    expect(isReadOnlyQuery('EXPLAIN SELECT * FROM files')).toBe(false)
    expect(isReadOnlyQuery('VALUES (1),(2)')).toBe(false)
  })

  it('rejects empty / malformed', () => {
    expect(isReadOnlyQuery('')).toBe(false)
    expect(isReadOnlyQuery('   ')).toBe(false)
    expect(isReadOnlyQuery('; DROP TABLE files')).toBe(false)
  })
})

describe('db:exec forbidden guard (isForbiddenExec)', () => {
  it('accepts normal write statements', () => {
    expect(isForbiddenExec('INSERT INTO files VALUES (1)')).toBe(false)
    expect(isForbiddenExec('UPDATE files SET deleted=1 WHERE path=?')).toBe(false)
    expect(isForbiddenExec('DELETE FROM files WHERE path=?')).toBe(false)
    expect(isForbiddenExec('CREATE TABLE foo (id INTEGER)')).toBe(false)
  })

  it('rejects connection-config-breaking statements', () => {
    expect(isForbiddenExec('PRAGMA journal_mode=DELETE')).toBe(true)
    expect(isForbiddenExec('PRAGMA foreign_keys=OFF')).toBe(true)
    expect(isForbiddenExec('ATTACH DATABASE "evil.db" AS evil')).toBe(true)
    expect(isForbiddenExec('DETACH evil')).toBe(true)
    expect(isForbiddenExec('VACUUM')).toBe(true)
    expect(isForbiddenExec('REINDEX')).toBe(true)
  })
})
