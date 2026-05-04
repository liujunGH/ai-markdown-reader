import { beforeEach, describe, expect, it } from 'vitest'
import { applyReadingDataBackup, createReadingDataBackup, READING_DATA_BACKUP_VERSION } from '../../utils/readingDataBackup'

describe('readingDataBackup', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('exports only known reader data keys with metadata', () => {
    localStorage.setItem('theme', 'sepia')
    localStorage.setItem('reader-marks', '[{"id":"m1"}]')
    localStorage.setItem('scroll-position-/docs/a.md', '{"top":120}')
    localStorage.setItem('unrelated-secret', 'keep-out')

    const backup = createReadingDataBackup()

    expect(backup.version).toBe(READING_DATA_BACKUP_VERSION)
    expect(backup.createdAt).toEqual(expect.any(String))
    expect(backup.items).toEqual(expect.objectContaining({
      theme: 'sepia',
      'reader-marks': '[{"id":"m1"}]',
      'scroll-position-/docs/a.md': '{"top":120}',
    }))
    expect(backup.items).not.toHaveProperty('unrelated-secret')
  })

  it('imports a valid backup and rejects unknown keys', () => {
    const result = applyReadingDataBackup(JSON.stringify({
      version: READING_DATA_BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      items: {
        theme: 'dark',
        'reader-layout': 'columns',
        'workspace-session-/docs': '{"active":"/docs/a.md"}',
        '../bad': 'nope',
      },
    }))

    expect(result).toEqual({ success: true, imported: 3, skipped: 1 })
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(localStorage.getItem('reader-layout')).toBe('columns')
    expect(localStorage.getItem('workspace-session-/docs')).toBe('{"active":"/docs/a.md"}')
    expect(localStorage.getItem('../bad')).toBeNull()
  })
})
