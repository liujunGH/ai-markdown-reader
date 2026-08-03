import { describe, expect, it } from 'vitest'
import { computeDocumentStats } from '../../utils/documentStats'

describe('computeDocumentStats', () => {
  it('matches whitespace-delimited word and reading-time semantics', () => {
    expect(computeDocumentStats('  hello\tworld\n你好  ')).toEqual({
      wordCount: 3,
      readingTime: 1,
      lineEnding: 'LF',
    })
  })

  it('handles empty content without allocating split arrays', () => {
    expect(computeDocumentStats('')).toEqual({
      wordCount: 0,
      readingTime: 0,
      lineEnding: 'LF',
    })
  })

  it('recognizes unicode whitespace', () => {
    expect(computeDocumentStats('one\u00a0two\u3000three').wordCount).toBe(3)
  })

  it('reports the dominant line ending in one scan', () => {
    expect(computeDocumentStats('one\r\ntwo\r\nthree\nfour').lineEnding).toBe('CRLF')
    expect(computeDocumentStats('one\r\ntwo\nthree\nfour').lineEnding).toBe('LF')
  })
})
