import type { ParsedDocument } from '../rendering/types'

let maxCachedDocuments = 1

interface CachedDocument {
  content: string
  document: ParsedDocument
}

interface PendingDocument {
  content: string
  promise: Promise<ParsedDocument>
}

const cache = new Map<string, CachedDocument>()
const pending = new Map<string, PendingDocument>()

/**
 * 复用同一标签、同一版本内容的解析结果，并合并并发解析请求。
 *
 * 双栏、快速跳转等多个消费者会各自调用 useDocument；这里确保它们共享一份
 * 块模型。单栏缓存一份，分屏时缓存两份，避免大文档 HTML 长期滞留内存。
 */
export function getOrParseDocument(
  tabId: string,
  content: string,
  parse: (content: string) => Promise<ParsedDocument>,
): Promise<ParsedDocument> {
  const cached = cache.get(tabId)
  if (cached?.content === content) {
    cache.delete(tabId)
    cache.set(tabId, cached)
    return Promise.resolve(cached.document)
  }

  const inflight = pending.get(tabId)
  if (inflight?.content === content) return inflight.promise

  const promise = parse(content)
  pending.set(tabId, { content, promise })

  void promise.then(
    (document) => {
      if (pending.get(tabId)?.promise !== promise) return
      pending.delete(tabId)
      cache.delete(tabId)
      cache.set(tabId, { content, document })
      evictOldestDocuments()
    },
    () => {
      if (pending.get(tabId)?.promise === promise) pending.delete(tabId)
    },
  )

  return promise
}

function evictOldestDocuments(): void {
  while (cache.size > maxCachedDocuments) {
    const oldestTabId = cache.keys().next().value as string | undefined
    if (oldestTabId === undefined) return
    cache.delete(oldestTabId)
  }
}

/** 单栏只保留当前文档；分屏开启时允许两个文档块模型同时复用。 */
export function setParsedDocumentCacheCapacity(capacity: 1 | 2): void {
  maxCachedDocuments = capacity
  evictOldestDocuments()
}

/** 测试与会话清理使用；不会终止已经发给 Worker 的请求。 */
export function clearParsedDocumentCache(): void {
  cache.clear()
  pending.clear()
  maxCachedDocuments = 1
}

export function getParsedDocumentCacheSize(): number {
  return cache.size
}

export function getPendingParseCount(): number {
  return pending.size
}
