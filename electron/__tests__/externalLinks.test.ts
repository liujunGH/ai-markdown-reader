import { describe, expect, it } from 'vitest'
import { isExternalUrl } from '../lib/externalLinks'

describe('isExternalUrl', () => {
  it('allows common external protocols', () => {
    expect(isExternalUrl('https://example.com/docs')).toBe(true)
    expect(isExternalUrl('http://example.com/docs')).toBe(true)
    expect(isExternalUrl('mailto:hello@example.com')).toBe(true)
    expect(isExternalUrl('tel:+123456789')).toBe(true)
  })

  it('rejects app-local and unsafe protocols', () => {
    expect(isExternalUrl('file:///Users/me/readme.md')).toBe(false)
    expect(isExternalUrl('wikilink://Note')).toBe(false)
    expect(isExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isExternalUrl('/relative/path')).toBe(false)
  })
})
