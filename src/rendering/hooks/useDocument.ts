/**
 * useDocument —— 取文档块模型的 hook
 *
 * 连接资源层（DocumentCache）与渲染层（parse.worker）：
 *  1. 从 DocumentCache 取 content（同步命中优先，否则异步回源磁盘）
 *  2. 把 content 发给 parse.worker 解析成 ParsedDocument（块模型）
 *  3. 返回 { document, loading, error, reload }
 *
 * 取消策略：切换标签时只作废「当前 hook 实例」发出的请求（按 reqId 标记过期），
 * 不清空全局 pending Map——避免双视图下误杀另一实例的合法请求。
 * 被作废的请求在 worker 响应时 resolve（Promise 正常 settle，无悬挂），
 * 只是 fetchAndParse 因 reqId 不匹配而丢弃结果。
 *
 * Worker 失败 fallback：若 worker 整体不可用（创建失败/消息错误），降级到
 * 主线程 createParser + splitIntoBlocks 同步解析（与 worker 路径同源，结果一致）。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getContent, getContentAsync, updateContent } from '../../resources/DocumentCache'
import { getOrParseDocument } from '../../resources/ParsedDocumentCache'
import { parseDocumentInSegments, type ParsedDocumentSegment } from '../pipeline/parseDocumentSegments'
import type { ParseResponse, ParsedDocument } from '../types'

let workerInstance: Worker | null = null
let workerFailed = false
let workerIdleTimer: number | null = null
const pending = new Map<number, {
  resolve: (d: ParsedDocument) => void
  reject: (e: Error) => void
  onProgress?: (segment: ParsedDocumentSegment) => void
  blocks: ParsedDocument['blocks']
  outline: ParsedDocument['outline']
  totalLines: number
  referenceDefinitions?: string
}>()
let requestCounter = 0

function cancelWorkerIdleShutdown(): void {
  if (workerIdleTimer === null) return
  window.clearTimeout(workerIdleTimer)
  workerIdleTimer = null
}

function scheduleWorkerIdleShutdown(): void {
  if (!workerInstance || pending.size > 0) return
  cancelWorkerIdleShutdown()
  workerIdleTimer = window.setTimeout(() => {
    workerInstance?.terminate()
    workerInstance = null
    workerIdleTimer = null
  }, 500)
}

function getWorker(): Worker | null {
  if (workerFailed) return null
  if (workerInstance) {
    cancelWorkerIdleShutdown()
    return workerInstance
  }
  try {
    workerInstance = new Worker(new URL('../workers/parse.worker.ts', import.meta.url), {
      type: 'module',
    })
    workerInstance.onmessage = (e: MessageEvent<ParseResponse>) => {
      const { id, blocks, outline, totalLines, referenceDefinitions, done, error } = e.data
      const entry = pending.get(id)
      if (!entry) return
      if (error) {
        pending.delete(id)
        entry.reject(new Error(error || 'Parse failed'))
        scheduleWorkerIdleShutdown()
        return
      }
      if (blocks) entry.blocks.push(...blocks)
      if (outline) entry.outline.push(...outline)
      if (totalLines !== undefined) entry.totalLines = totalLines
      if (referenceDefinitions !== undefined) entry.referenceDefinitions = referenceDefinitions
      if (blocks && blocks.length > 0) {
        entry.onProgress?.({
          blocks,
          outline: outline ?? [],
          totalLines: entry.totalLines,
          referenceDefinitions: entry.referenceDefinitions,
        })
      }
      if (done) {
        pending.delete(id)
        entry.resolve({
          blocks: entry.blocks,
          outline: entry.outline,
          totalLines: entry.totalLines,
          referenceDefinitions: entry.referenceDefinitions,
        })
        scheduleWorkerIdleShutdown()
      }
    }
    workerInstance.onerror = () => {
      // worker 创建后出错：标记失败，后续走主线程 fallback
      workerFailed = true
      cancelWorkerIdleShutdown()
      workerInstance?.terminate()
      workerInstance = null
      // reject 所有 pending
      for (const entry of pending.values()) entry.reject(new Error('Worker crashed'))
      pending.clear()
    }
    return workerInstance
  } catch {
    workerFailed = true
    return null
  }
}

/** 发送解析请求到 worker；worker 不可用时走主线程 fallback */
async function parseContent(
  content: string,
  onProgress?: (segment: ParsedDocumentSegment) => void,
): Promise<ParsedDocument> {
  const worker = getWorker()
  if (worker) {
    const id = ++requestCounter
    return new Promise<ParsedDocument>((resolve, reject) => {
      pending.set(id, {
        resolve,
        reject,
        onProgress,
        blocks: [],
        outline: [],
        totalLines: 0,
      })
      worker.postMessage({ id, content })
    })
  }
  // Fallback：主线程同步解析（与 worker 同源，结果一致）
  return parseInMainThread(content, onProgress)
}

/** 主线程 fallback 解析（worker 不可用时） */
async function parseInMainThread(
  content: string,
  onProgress?: (segment: ParsedDocumentSegment) => void,
): Promise<ParsedDocument> {
  return parseDocumentInSegments(content, {
    yieldBetweenSegments: true,
    onSegment: onProgress,
  })
}

interface UseDocumentResult {
  document: ParsedDocument | null
  loading: boolean
  indexing: boolean
  error: string | null
  /** 重新解析（内容变更后） */
  reload: () => void
}

/**
 * 取文档块模型。
 * @param tabId    标签 id
 * @param filePath 文件路径（回源用）
 */
export function useDocument(tabId: string, filePath?: string): UseDocumentResult {
  const [document, setDocument] = useState<ParsedDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [indexing, setIndexing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const currentRequestRef = useRef<number>(0)

  const fetchAndParse = useCallback(async () => {
    const reqId = ++currentRequestRef.current
    setLoading(true)
    setIndexing(true)
    setError(null)

    try {
      // 1. 取 content（同步命中优先，否则异步回源）
      let content = getContent(tabId)
      if (content === undefined) {
        // 无 filePath 的标签（如欢迎页）无法回源，视为空文档
        if (!filePath) {
          if (reqId !== currentRequestRef.current || !mountedRef.current) return
          setDocument(null)
          setLoading(false)
          setIndexing(false)
          return
        }
        content = await getContentAsync(tabId, filePath)
      }
      // 回源期间可能已切换标签
      if (reqId !== currentRequestRef.current || !mountedRef.current) return

      // 2. 发给 worker 解析（或主线程 fallback）
      let firstSegmentShown = false
      const parsed = await getOrParseDocument(tabId, content, (source) => parseContent(source, (segment) => {
        if (firstSegmentShown || segment.blocks.length === 0) return
        if (reqId !== currentRequestRef.current || !mountedRef.current) return
        firstSegmentShown = true
        setDocument({
          blocks: segment.blocks,
          outline: segment.outline,
          totalLines: segment.totalLines,
          referenceDefinitions: segment.referenceDefinitions,
        })
        setLoading(false)
      }))
      if (reqId !== currentRequestRef.current || !mountedRef.current) return

      setDocument(parsed)
      setLoading(false)
      setIndexing(false)
    } catch (err) {
      if (reqId !== currentRequestRef.current || !mountedRef.current) return
      console.error('[useDocument] fetch/parse error:', err)
      setError(err instanceof Error ? `${err.message}` : String(err))
      setLoading(false)
      setIndexing(false)
    }
  }, [tabId, filePath])

  useEffect(() => {
    mountedRef.current = true
    fetchAndParse()
    return () => {
      mountedRef.current = false
    }
  }, [fetchAndParse])

  const reload = useCallback(() => {
    fetchAndParse()
  }, [fetchAndParse])

  return { document, loading, indexing, error, reload }
}

/** 编辑后更新缓存并触发重新解析 */
export function updateDocumentContent(tabId: string, content: string): void {
  updateContent(tabId, content)
}
