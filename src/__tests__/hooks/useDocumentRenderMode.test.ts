import { describe, expect, it } from 'vitest'
import { getDocumentRenderMode } from '../../hooks/useDocumentRenderMode'

describe('getDocumentRenderMode', () => {
  it('uses normal rendering for small documents', () => {
    expect(getDocumentRenderMode('# Small\n\nHello')).toEqual({
      mode: 'normal',
      byteLength: 14,
      lineCount: 3,
    })
  })

  it('uses virtual rendering for large byte size', () => {
    const content = 'a'.repeat(300001)

    expect(getDocumentRenderMode(content).mode).toBe('virtual')
  })

  it('uses virtual rendering for many lines', () => {
    const content = Array.from({ length: 5001 }, (_, index) => `line ${index}`).join('\n')

    expect(getDocumentRenderMode(content).mode).toBe('virtual')
  })
})
