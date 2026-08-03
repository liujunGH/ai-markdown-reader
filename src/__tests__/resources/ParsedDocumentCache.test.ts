import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearParsedDocumentCache,
  getOrParseDocument,
  getParsedDocumentCacheSize,
  getPendingParseCount,
  setParsedDocumentCacheCapacity,
} from '../../resources/ParsedDocumentCache'
import type { ParsedDocument } from '../../rendering/types'

function documentWithLines(totalLines: number): ParsedDocument {
  return { blocks: [], outline: [], totalLines }
}

afterEach(() => {
  clearParsedDocumentCache()
})

describe('ParsedDocumentCache', () => {
  it('deduplicates concurrent parses and reuses the resolved document', async () => {
    let resolveParse!: (document: ParsedDocument) => void
    const parser = vi.fn(() => new Promise<ParsedDocument>((resolve) => {
      resolveParse = resolve
    }))

    const first = getOrParseDocument('tab-1', 'content', parser)
    const second = getOrParseDocument('tab-1', 'content', parser)

    expect(parser).toHaveBeenCalledTimes(1)
    expect(getPendingParseCount()).toBe(1)

    const parsed = documentWithLines(3)
    resolveParse(parsed)
    await expect(first).resolves.toBe(parsed)
    await expect(second).resolves.toBe(parsed)
    await expect(getOrParseDocument('tab-1', 'content', parser)).resolves.toBe(parsed)
    expect(parser).toHaveBeenCalledTimes(1)
    expect(getParsedDocumentCacheSize()).toBe(1)
  })

  it('reparses when a tab content version changes', async () => {
    const parser = vi
      .fn<(content: string) => Promise<ParsedDocument>>()
      .mockResolvedValueOnce(documentWithLines(1))
      .mockResolvedValueOnce(documentWithLines(2))

    await getOrParseDocument('tab-1', 'first', parser)
    const updated = await getOrParseDocument('tab-1', 'second', parser)

    expect(parser).toHaveBeenCalledTimes(2)
    expect(updated.totalLines).toBe(2)
  })

  it('keeps only the current document in single-pane mode', async () => {
    const parser = vi.fn(async (content: string) => documentWithLines(content.length))

    await getOrParseDocument('tab-1', 'one', parser)
    await getOrParseDocument('tab-2', 'two', parser)

    expect(getParsedDocumentCacheSize()).toBe(1)
    await getOrParseDocument('tab-1', 'one', parser)
    expect(parser).toHaveBeenCalledTimes(3)
  })

  it('keeps two parsed documents while split view is enabled', async () => {
    const parser = vi.fn(async (content: string) => documentWithLines(content.length))
    setParsedDocumentCacheCapacity(2)

    await getOrParseDocument('tab-1', 'one', parser)
    await getOrParseDocument('tab-2', 'two', parser)

    expect(getParsedDocumentCacheSize()).toBe(2)
    await getOrParseDocument('tab-1', 'one', parser)
    expect(parser).toHaveBeenCalledTimes(2)
  })

  it('clears a failed request so a later call can retry', async () => {
    const parser = vi
      .fn<(content: string) => Promise<ParsedDocument>>()
      .mockRejectedValueOnce(new Error('parse failed'))
      .mockResolvedValueOnce(documentWithLines(4))

    await expect(getOrParseDocument('tab-1', 'content', parser)).rejects.toThrow('parse failed')
    await expect(getOrParseDocument('tab-1', 'content', parser)).resolves.toEqual(documentWithLines(4))
    expect(parser).toHaveBeenCalledTimes(2)
  })
})
