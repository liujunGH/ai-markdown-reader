import { describe, it, expect } from 'vitest'
import { basename, dirname, join } from '../utils/path'

describe('path utils (fallback without electronAPI)', () => {
  describe('basename', () => {
    it('returns filename from unix path', () => {
      expect(basename('/home/user/doc.md')).toBe('doc.md')
    })
    it('returns empty string for trailing slash', () => {
      // fallback behavior: replace last slash and everything before it
      expect(basename('/home/user/')).toBe('')
    })
    it('returns full string if no slash', () => {
      expect(basename('doc.md')).toBe('doc.md')
    })
  })

  describe('dirname', () => {
    it('returns parent directory from unix path', () => {
      expect(dirname('/home/user/doc.md')).toBe('/home/user')
    })
    it('returns original string for filename only (no slash to remove)', () => {
      expect(dirname('doc.md')).toBe('doc.md')
    })
  })

  describe('join', () => {
    it('joins unix paths', () => {
      expect(join('/home', 'user', 'doc.md')).toBe('/home/user/doc.md')
    })
    it('handles trailing slash in first part', () => {
      expect(join('/home/', 'user')).toBe('/home//user')
    })
  })
})
