import type { BlockRenderRequest, BlockRenderResponse, DocumentBlock } from './types'
import { renderBlockSources } from './pipeline/renderBlockSource'

type RenderableBlock = Pick<DocumentBlock, 'id' | 'kind' | 'source' | 'meta'>

interface PendingRender {
  resolve: (blocks: Array<{ id: number; html: string }>) => void
  reject: (error: Error) => void
}

let workerInstance: Worker | null = null
let idleTimer: number | null = null
let requestCounter = 0
const pending = new Map<number, PendingRender>()

// 5MB 文档完成增量索引后，用户通常还会继续搜索或跳转。短时间保留已经装配好
// markdown-it / Prism / KaTeX 的 Worker，避免尾部首次渲染重新支付模块初始化成本。
export const BLOCK_RENDER_WORKER_IDLE_MS = 15_000

function cancelIdleShutdown(): void {
  if (idleTimer === null) return
  window.clearTimeout(idleTimer)
  idleTimer = null
}

function scheduleIdleShutdown(): void {
  if (!workerInstance || pending.size > 0) return
  cancelIdleShutdown()
  idleTimer = window.setTimeout(() => {
    workerInstance?.terminate()
    workerInstance = null
    idleTimer = null
  }, BLOCK_RENDER_WORKER_IDLE_MS)
}

function rejectAll(error: Error): void {
  for (const entry of pending.values()) entry.reject(error)
  pending.clear()
}

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  if (workerInstance) {
    cancelIdleShutdown()
    return workerInstance
  }
  try {
    workerInstance = new Worker(new URL('./workers/block-render.worker.ts', import.meta.url), {
      type: 'module',
    })
    workerInstance.onmessage = (event: MessageEvent<BlockRenderResponse>) => {
      const { id, blocks, error } = event.data
      const entry = pending.get(id)
      if (!entry) return
      pending.delete(id)
      if (error) entry.reject(new Error(error))
      else entry.resolve(blocks)
      scheduleIdleShutdown()
    }
    workerInstance.onerror = () => {
      cancelIdleShutdown()
      workerInstance?.terminate()
      workerInstance = null
      rejectAll(new Error('Block render worker crashed'))
    }
    return workerInstance
  } catch {
    workerInstance = null
    return null
  }
}

export function renderBlocksAsync(
  blocks: RenderableBlock[],
  referenceDefinitions = '',
): Promise<Array<{ id: number; html: string }>> {
  if (blocks.length === 0) return Promise.resolve([])
  const worker = getWorker()
  if (!worker) return renderBlockSources(blocks, referenceDefinitions)

  const id = ++requestCounter
  const request: BlockRenderRequest = { id, blocks, referenceDefinitions }
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    worker.postMessage(request)
  })
}
