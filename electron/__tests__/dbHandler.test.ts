import { describe, expect, it } from 'vitest'
import { isReadOnlyQuery, isForbiddenExec, isAllowedExec } from '../ipc/dbHandler'

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

describe('db:exec allowed guard (isAllowedExec)', () => {
  it('accepts DML statements', () => {
    expect(isAllowedExec('INSERT INTO files VALUES (1)')).toBe(true)
    expect(isAllowedExec('INSERT OR REPLACE INTO files (path) VALUES (?)')).toBe(true)
    expect(isAllowedExec('REPLACE INTO files (path) VALUES (?)')).toBe(true)
    expect(isAllowedExec('UPDATE files SET deleted=1 WHERE path=?')).toBe(true)
    expect(isAllowedExec('DELETE FROM files WHERE path=?')).toBe(true)
  })

  it('rejects DDL and schema-changing statements', () => {
    expect(isAllowedExec('CREATE TABLE foo (id INTEGER)')).toBe(false)
    expect(isAllowedExec('DROP TABLE files')).toBe(false)
    expect(isAllowedExec('ALTER TABLE files ADD COLUMN x TEXT')).toBe(false)
    expect(isAllowedExec('TRUNCATE TABLE files')).toBe(false)
  })

  it('rejects connection-config-breaking statements', () => {
    expect(isAllowedExec('PRAGMA journal_mode=DELETE')).toBe(false)
    expect(isAllowedExec('PRAGMA foreign_keys=OFF')).toBe(false)
    expect(isAllowedExec('ATTACH DATABASE "evil.db" AS evil')).toBe(false)
    expect(isAllowedExec('DETACH evil')).toBe(false)
    expect(isAllowedExec('VACUUM')).toBe(false)
    expect(isAllowedExec('REINDEX')).toBe(false)
  })
})
