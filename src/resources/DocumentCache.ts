/**
 * 文档正文 LRU 缓存（资源层，不在 React 树内）
 *
 * 取代把 content 塞进 Zustand state 的做法（决策 2）：
 *  - 旧 tabStore 把每个标签的完整 content 存进 state，10 个大文档 = 数百 MB
 *    全在响应式状态树里，任何 tab 变化都触发比较
 *  - 新方案：tabStore 只存元数据，content 由 DocumentCache LRU 管理，容量上限
 *    DOCUMENT_CACHE_CAPACITY（默认 4），超出按 LRU 淘汰，重新访问时从磁盘读
 *
 * 提供同步命中 + 异步回源（磁盘读取）两种取法。useDocument hook 用后者 +
 * Suspense，切换标签时自动回源。
 */
import { DOCUMENT_CACHE_CAPACITY } from '../../shared'

interface CacheEntry {
  content: string
  /** 文件路径（有则可回源；无路径的临时标签不可回源，不淘汰） */
  filePath?: string
}

/** 按 tabId 索引的 LRU 缓存。Map 的迭代顺序 = 插入顺序，删再设即更新最近使用 */
const cache = new Map<string, CacheEntry>()

/** 同步取 content。未命中返回 undefined（调用方决定是否异步回源） */
export function getContent(tabId: string): string | undefined {
  const entry = cache.get(tabId)
  if (entry === undefined) return undefined
  // 命中则移到末尾（标记为最近使用）
  cache.delete(tabId)
  cache.set(tabId, entry)
  return entry.content
}

/** 同步取 content，未命中返回空串（兼容需要非 undefined 的场景） */
export function getContentOrEmpty(tabId: string): string {
  return getContent(tabId) ?? ''
}

/**
 * 写入 content。超出容量时淘汰最久未使用且有 filePath 的条目。
 * @param tabId    标签 id
 * @param content  正文
 * @param filePath 文件路径（无路径的临时标签永不淘汰——无法回源）
 */
export function setContent(tabId: string, content: string, filePath?: string): void {
  // 已存在则先删（保证更新到末尾）
  cache.delete(tabId)
  cache.set(tabId, { content, filePath })

  // 淘汰：从最旧（Map 首部）开始，跳过无 filePath 的条目
  while (cache.size > DOCUMENT_CACHE_CAPACITY) {
    let evicted = false
    for (const [id, entry] of cache) {
      if (id === tabId) continue // 不淘汰刚写入的
      if (entry.filePath) {
        cache.delete(id)
        evicted = true
        break
      }
    }
    // 所有剩余条目都无 filePath（无法淘汰），停止以避免死循环
    if (!evicted) break
  }
}

/**
 * 异步取 content，未命中且有 filePath 时从磁盘回源。
 * @returns content 字符串；回源失败抛错
 */
export async function getContentAsync(tabId: string, filePath?: string): Promise<string> {
  const cached = getContent(tabId)
  if (cached !== undefined) return cached

  if (!filePath || !window.electronAPI) {
    throw new Error(`Cannot load content: tab ${tabId} has no filePath or electronAPI unavailable`)
  }

  const result = await window.electronAPI.readFile(filePath)
  if (!result.success || result.content === undefined) {
    throw new Error(result.error || `Failed to read file: ${filePath}`)
  }

  setContent(tabId, result.content, filePath)
  return result.content
}

/** 更新某标签的 content（编辑后写回）。不改变容量状态。 */
export function updateContent(tabId: string, content: string): void {
  const existing = cache.get(tabId)
  if (existing) {
    cache.set(tabId, { ...existing, content })
  } else {
    cache.set(tabId, { content })
  }
}

/** 删除某标签的缓存（关闭标签时调用） */
export function evict(tabId: string): void {
  cache.delete(tabId)
}

/** 清空全部缓存（测试 / 退出用） */
export function clearDocumentCache(): void {
  cache.clear()
}

/** 当前缓存大小（诊断用） */
export function getCacheSize(): number {
  return cache.size
}

/** 估算缓存占用字节数（诊断用，粗略） */
export function getCacheBytes(): number {
  let bytes = 0
  for (const entry of cache.values()) {
    bytes += entry.content.length * 2 // UTF-16 近似
  }
  return bytes
}
