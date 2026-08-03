import { describe, expect, it } from 'vitest'
import type { DocumentBlock } from '../types'
import { renderBlockSources } from '../pipeline/renderBlockSource'

function block(overrides: Partial<DocumentBlock>): DocumentBlock {
  return {
    id: 0,
    kind: 'paragraph',
    source: 'hello',
    startLine: 1,
    endLine: 1,
    estimatedHeight: 32,
    ...overrides,
  }
}

describe('renderBlockSources', () => {
  it('renders only the supplied blocks and injects heading ids', async () => {
    const result = await renderBlockSources([
      block({
        kind: 'heading',
        source: '# Hello World',
        meta: { headingId: 'hello-world', headingLevel: 1, headingText: 'Hello World' },
      }),
      block({ id: 7, source: 'second paragraph' }),
    ])

    expect(result).toHaveLength(2)
    expect(result[0].html).toContain('<h1 id="hello-world">')
    expect(result[1]).toEqual(expect.objectContaining({ id: 7 }))
  })

  it('preserves table, list and WikiLink rendering from raw block source', async () => {
    const result = await renderBlockSources([
      block({ kind: 'table', source: '| A | B |\n|---|---|\n| 1 | 2 |' }),
      block({ id: 1, kind: 'list', source: '- one\n- two' }),
      block({ id: 2, source: '[[target|label]]' }),
    ])

    expect(result[0].html).toContain('<td>1</td>')
    expect(result[1].html).toContain('<li>one</li>')
    expect(result[2].html).toContain('wikilink://target')
  })
})
