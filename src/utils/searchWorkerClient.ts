import { findSearchMatches, type SearchMatch } from './search'
import type {
  SearchWorkerRequest,
  SearchWorkerResponse,
} from '../rendering/workers/search.worker'

const SEARCH_TIMEOUT_MS = 2_000

interface PendingSearch {
  resolve: (matches: SearchMatch[]) => void
  reject: (error: Error) => void
  timeoutId: number
}

let workerInstance: Worker | null = null
let requestCounter = 0
const pending = new Map<number, PendingSearch>()

function rejectAll(error: Error): void {
  for (const entry of pending.values()) {
    window.clearTimeout(entry.timeoutId)
    entry.reject(error)
  }
  pending.clear()
}

function resetWorker(error: Error): void {
  workerInstance?.terminate()
  workerInstance = null
  rejectAll(error)
}

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  if (workerInstance) return workerInstance

  try {
    workerInstance = new Worker(new URL('../rendering/workers/search.worker.ts', import.meta.url), {
      type: 'module',
    })
    workerInstance.onmessage = (event: MessageEvent<SearchWorkerResponse>) => {
      const { id, matches, error } = event.data
      const entry = pending.get(id)
      if (!entry) return
      pending.delete(id)
      window.clearTimeout(entry.timeoutId)
      if (error) entry.reject(new Error(error))
      else entry.resolve(matches)
    }
    workerInstance.onerror = () => resetWorker(new Error('Search worker crashed'))
    return workerInstance
  } catch {
    workerInstance = null
    return null
  }
}

/** 长文档搜索走独立 Worker；非浏览器测试环境保持等价的同步 fallback。 */
export function searchContentAsync(
  content: string,
  query: string,
  isRegex: boolean,
): Promise<SearchMatch[]> {
  const worker = getWorker()
  if (!worker) return Promise.resolve(findSearchMatches(content, query, isRegex))

  const id = ++requestCounter
  const request: SearchWorkerRequest = { id, content, query, isRegex }

  return new Promise<SearchMatch[]>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      resetWorker(new Error('Search timed out'))
    }, SEARCH_TIMEOUT_MS)
    pending.set(id, { resolve, reject, timeoutId })
    worker.postMessage(request)
  })
}
