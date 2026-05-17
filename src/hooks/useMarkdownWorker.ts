import { useEffect, useRef, useState, useCallback } from 'react'

let workerInstance: Worker | null = null
let messageId = 0
const pending = new Map<number, (response: WorkerResponse) => void>()

type WorkerResponse = {
  id: number
  html: string
  error?: string
}

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL('../workers/markdown.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerInstance.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { id, html, error } = e.data
      if (error) {
        console.error('Markdown worker parse error:', error)
      }
      const resolve = pending.get(id)
      if (resolve) {
        pending.delete(id)
        resolve({ id, html, error })
      }
    }
    workerInstance.onerror = (err) => {
      console.error('Markdown worker error:', err)
    }
  }
  return workerInstance
}

/** Cancel all pending worker operations that are no longer needed */
export function cancelPendingWorkerOperations(): void {
  pending.clear()
}

export function useMarkdownWorker(content: string): { html: string; loading: boolean; error: string | null } {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef<number>(0)
  const mountedRef = useRef(true)

  const cancelCurrentOperation = useCallback(() => {
    if (idRef.current !== 0) {
      pending.delete(idRef.current)
      idRef.current = 0
    }
  }, [])

  const parse = useCallback((text: string) => {
    cancelCurrentOperation()
    setHtml('')
    setError(null)
    setLoading(true)
    const currentId = ++messageId
    idRef.current = currentId

    let worker: Worker
    try {
      worker = getWorker()
      worker.postMessage({ content: text, id: currentId })
    } catch (err) {
      if (mountedRef.current && idRef.current === currentId) {
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      }
      return
    }

    pending.set(currentId, (result: WorkerResponse) => {
      pending.delete(currentId)
      if (mountedRef.current && idRef.current === currentId) {
        setHtml(result.html)
        setError(result.error || null)
        setLoading(false)
      }
    })
  }, [cancelCurrentOperation])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cancelCurrentOperation()
    }
  }, [cancelCurrentOperation])

  useEffect(() => {
    parse(content)
  }, [content, parse])

  return { html, loading, error }
}
