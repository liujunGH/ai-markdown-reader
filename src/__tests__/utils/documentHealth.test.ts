import { describe, expect, it } from 'vitest'
import { analyzeDocumentHealth } from '../../utils/documentHealth'

describe('analyzeDocumentHealth', () => {
  it('reports duplicate heading slugs', () => {
    const result = analyzeDocumentHealth('# Intro\n\n## Intro\n\n### Intro!')

    expect(result.summary.totalIssues).toBe(2)
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'duplicate-heading-slug',
          severity: 'warning',
          line: 3,
          target: 'intro'
        }),
        expect.objectContaining({
          type: 'duplicate-heading-slug',
          severity: 'warning',
          line: 5,
          target: 'intro'
        })
      ])
    )
  })

  it('reports dangerous link protocols', () => {
    const result = analyzeDocumentHealth('[run](javascript:alert(1))\n\n[open](vbscript:msgbox(1))')

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'dangerous-link-protocol',
          severity: 'error',
          line: 1,
          target: 'javascript:alert(1)'
        }),
        expect.objectContaining({
          type: 'dangerous-link-protocol',
          severity: 'error',
          line: 3,
          target: 'vbscript:msgbox(1)'
        })
      ])
    )
  })

  it('reports empty links', () => {
    const result = analyzeDocumentHealth('[missing]()\n\n<a href=\"\">empty</a>')

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'empty-link',
          severity: 'warning',
          line: 1
        }),
        expect.objectContaining({
          type: 'empty-link',
          severity: 'warning',
          line: 3
        })
      ])
    )
  })

  it('reports image reference issues and oversized dimensions', () => {
    const result = analyzeDocumentHealth([
      '![]()',
      '![bad](ftp://example.com/a.png)',
      '<img src=\"\" alt=\"empty\">',
      '<img src=\"./huge.png\" width=\"5000\" height=\"200\">'
    ].join('\n'))

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'empty-image-src',
          severity: 'error',
          line: 1
        }),
        expect.objectContaining({
          type: 'suspicious-image-src',
          severity: 'warning',
          line: 2,
          target: 'ftp://example.com/a.png'
        }),
        expect.objectContaining({
          type: 'empty-image-src',
          severity: 'error',
          line: 3
        }),
        expect.objectContaining({
          type: 'oversized-image-dimension',
          severity: 'info',
          line: 4,
          target: './huge.png'
        })
      ])
    )
  })

  it('reports mismatched KaTeX block delimiters', () => {
    const result = analyzeDocumentHealth('Text\n$$\na + b\n\nMore text')

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'mismatched-katex-block-delimiter',
          severity: 'error',
          line: 2,
          target: '$$'
        })
      ])
    )
  })

  it('ignores links and images inside fenced code blocks and inline code', () => {
    const result = analyzeDocumentHealth([
      '```js',
      '![Img](code.png)',
      '[Link](javascript:alert(1))',
      '<img src="code.png">',
      '<a href="javascript:alert(1)">x</a>',
      '```',
      'text `![Inline](inline.png)` and `[Link](javascript:alert(1))`',
      '![]()',
      '[Empty]()',
      '![Bad](ftp://bad.png)',
      '[Bad](javascript:bad)'
    ].join('\n'))

    // Should find real issues outside code regions
    const realIssues = result.issues.filter(i =>
      i.line === 8 || i.line === 9 || i.line === 10 || i.line === 11
    )
    expect(realIssues).toHaveLength(4)
    expect(realIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'empty-image-src', line: 8 }),
        expect.objectContaining({ type: 'empty-link', line: 9 }),
        expect.objectContaining({ type: 'suspicious-image-src', line: 10 }),
        expect.objectContaining({ type: 'dangerous-link-protocol', line: 11 }),
      ])
    )

    // Should not report anything inside code blocks or inline code
    const codeIssues = result.issues.filter(i => i.line <= 7)
    expect(codeIssues).toHaveLength(0)
  })
})
