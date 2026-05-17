import { useMemo } from 'react'

const VIRTUAL_RENDER_BYTE_THRESHOLD = 300_000
const VIRTUAL_RENDER_LINE_THRESHOLD = 5_000

export type DocumentRenderMode = 'normal' | 'virtual'

export interface DocumentRenderModeInfo {
  mode: DocumentRenderMode
  byteLength: number
  lineCount: number
}

export function getDocumentRenderMode(content: string): DocumentRenderModeInfo {
  const lineCount = content ? content.split('\n').length : 0
  const byteLength = content.length
  const mode = byteLength > VIRTUAL_RENDER_BYTE_THRESHOLD || lineCount > VIRTUAL_RENDER_LINE_THRESHOLD
    ? 'virtual'
    : 'normal'

  return { mode, byteLength, lineCount }
}

export function useDocumentRenderMode(content: string): DocumentRenderModeInfo {
  return useMemo(() => getDocumentRenderMode(content), [content])
}
