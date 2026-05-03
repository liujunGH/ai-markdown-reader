import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearSavedIndexDiagnostics,
  formatIndexPolicy,
  loadSavedIndexDiagnostics,
  saveIndexDiagnostics,
} from '../../utils/indexDiagnostics'
import type { IndexSkippedItem } from '../../utils/searchIndex'

describe('indexDiagnostics', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and loads diagnostics for one folder without leaking into another', () => {
    const skippedItems: IndexSkippedItem[] = [
      { path: '/docs/large.md', name: 'large.md', reason: 'large-file', size: 2048, maxSize: 1024 },
    ]

    saveIndexDiagnostics('/docs', skippedItems, 1710000000000)

    expect(loadSavedIndexDiagnostics('/docs')).toEqual({
      folderPath: '/docs',
      skippedItems,
      updatedAt: 1710000000000,
    })
    expect(loadSavedIndexDiagnostics('/other')).toEqual({
      folderPath: '/other',
      skippedItems: [],
      updatedAt: null,
    })
  })

  it('clears saved diagnostics for the selected folder', () => {
    saveIndexDiagnostics('/docs', [
      { path: '/docs/bad.md', name: 'bad.md', reason: 'read-error', detail: '权限不足' },
    ], 1710000000000)

    clearSavedIndexDiagnostics('/docs')

    expect(loadSavedIndexDiagnostics('/docs').skippedItems).toEqual([])
    expect(loadSavedIndexDiagnostics('/docs').updatedAt).toBeNull()
  })

  it('recovers from invalid stored diagnostics', () => {
    localStorage.setItem('index-diagnostics-%2Fdocs', '{broken')

    expect(loadSavedIndexDiagnostics('/docs')).toEqual({
      folderPath: '/docs',
      skippedItems: [],
      updatedAt: null,
    })
  })

  it('trims saved skipped items to the most recent limit', () => {
    const skippedItems = Array.from({ length: 260 }, (_, index): IndexSkippedItem => ({
      path: `/docs/file-${index}.md`,
      name: `file-${index}.md`,
      reason: 'read-error',
      detail: '读取失败',
    }))

    saveIndexDiagnostics('/docs', skippedItems, 1710000000000)

    const loaded = loadSavedIndexDiagnostics('/docs')
    expect(loaded.skippedItems).toHaveLength(200)
    expect(loaded.skippedItems[0].path).toBe('/docs/file-60.md')
    expect(loaded.skippedItems.at(-1)?.path).toBe('/docs/file-259.md')
  })

  it('formats index policy for display', () => {
    expect(formatIndexPolicy({
      maxFileSizeBytes: 50 * 1024 * 1024,
      skipDirectoryNames: ['.git', 'node_modules', 'dist'],
    })).toEqual({
      maxFileSize: '50 MB',
      skippedDirectories: '.git、node_modules、dist',
    })
  })
})
