import { describe, expect, it, beforeEach } from 'vitest'
import {
  getContent,
  getContentOrEmpty,
  setContent,
  updateContent,
  evict,
  clearDocumentCache,
  getCacheSize,
  getCacheBytes,
} from '../../resources/DocumentCache'

/**
 * DocumentCache LRU 测试。
 *
 * 核心验证（对应方案决策 2：content 移出 React 状态树进 LRU）：
 *  - LRU 淘汰：超出容量时淘汰最久未使用且有 filePath 的条目
 *  - 无 filePath 的临时标签不被淘汰（无法回源）
 *  - 命中后移到最近使用（更新 LRU 顺序）
 */
beforeEach(() => {
  clearDocumentCache()
})

describe('DocumentCache — 基本读写', () => {
  it('写入后可同步读取', () => {
    setContent('tab-1', 'hello', '/path/a.md')
    expect(getContent('tab-1')).toBe('hello')
    expect(getContentOrEmpty('tab-1')).toBe('hello')
  })

  it('未命中返回 undefined / 空串', () => {
    expect(getContent('missing')).toBeUndefined()
    expect(getContentOrEmpty('missing')).toBe('')
  })

  it('updateContent 更新已存在条目', () => {
    setContent('tab-1', 'old', '/path/a.md')
    updateContent('tab-1', 'new')
    expect(getContent('tab-1')).toBe('new')
  })

  it('evict 删除条目', () => {
    setContent('tab-1', 'hello', '/path/a.md')
    evict('tab-1')
    expect(getContent('tab-1')).toBeUndefined()
  })
})

describe('DocumentCache — LRU 淘汰', () => {
  it('超出容量时淘汰最久未使用的有路径条目', () => {
    // DOCUMENT_CACHE_CAPACITY = 4
    setContent('tab-1', 'a', '/1.md')
    setContent('tab-2', 'b', '/2.md')
    setContent('tab-3', 'c', '/3.md')
    setContent('tab-4', 'd', '/4.md')
    expect(getCacheSize()).toBe(4)

    // 写入第 5 个，应淘汰 tab-1（最久未使用）
    setContent('tab-5', 'e', '/5.md')
    expect(getCacheSize()).toBe(4)
    expect(getContent('tab-1')).toBeUndefined()
    expect(getContent('tab-5')).toBe('e')
  })

  it('读取（命中）会更新为最近使用，避免被淘汰', () => {
    setContent('tab-1', 'a', '/1.md')
    setContent('tab-2', 'b', '/2.md')
    setContent('tab-3', 'c', '/3.md')
    setContent('tab-4', 'd', '/4.md')

    // 读 tab-1，让它成为最近使用
    getContent('tab-1')

    // 写入第 5 个，应淘汰 tab-2（现在是最久未使用）
    setContent('tab-5', 'e', '/5.md')
    expect(getContent('tab-1')).toBe('a') // 仍存在
    expect(getContent('tab-2')).toBeUndefined() // 被淘汰
  })

  it('无 filePath 的临时标签不被淘汰（无法回源）', () => {
    setContent('temp-1', 'a') // 无路径
    setContent('tab-2', 'b', '/2.md')
    setContent('tab-3', 'c', '/3.md')
    setContent('tab-4', 'd', '/4.md')
    // temp-1 无路径，即使超容也不淘汰它；但会淘汰 tab-2/3/4 中最旧的
    setContent('tab-5', 'e', '/5.md')
    expect(getContent('temp-1')).toBe('a') // 临时标签保留
  })

  it('全部无路径时不会死循环', () => {
    setContent('t1', 'a')
    setContent('t2', 'b')
    setContent('t3', 'c')
    setContent('t4', 'd')
    setContent('t5', 'e') // 全无路径，无法淘汰
    // 不应崩溃，且 t5 已写入
    expect(getContent('t5')).toBe('e')
  })
})

describe('DocumentCache — 诊断', () => {
  it('getCacheBytes 反映占用（UTF-16 近似）', () => {
    setContent('tab-1', 'hello', '/1.md') // 5 字符 × 2 = 10
    expect(getCacheBytes()).toBeGreaterThanOrEqual(10)
  })
})
