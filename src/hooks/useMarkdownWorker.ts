import { useEffect, useRef, useState, useCallback } from 'react'

let workerInstance: Worker | null = null
let messageId = 0
const pending = new Map<number, (html: string) => void>()

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL('../workers/markdown.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerInstance.onmessage = (e: MessageEvent<{ id: number; html: string }>) => {
      const { id, html } = e.data
      const resolve = pending.get(id)
      if (resolve) {
        pending.delete(id)
        resolve(html)
      }
    }
    workerInstance.onerror = (err) => {
      console.error('Markdown worker error:', err)
    }
  }
  return workerInstance
}

export function useMarkdownWorker(content: string): { html: string; loading: boolean } {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const contentRef = useRef(content)
  const idRef = useRef<number>(0)

  const parse = useCallback((text: string) => {
    setLoading(true)
    const currentId = ++messageId
    idRef.current = currentId

    const worker = getWorker()
    worker.postMessage({ content: text, id: currentId })

    pending.set(currentId, (result: string) => {
      if (idRef.current === currentId) {
        setHtml(result)
        setLoading(false)
      }
    })
  }, [])

  useEffect(() => {
    if (contentRef.current !== content) {
      contentRef.current = content
      parse(content)
    }
  }, [content, parse])

  return { html, loading }
}
