import { describe, expect, it } from 'vitest'
import { parseDocumentInSegments } from '../pipeline/parseDocumentSegments'
import { renderBlockSources } from '../pipeline/renderBlockSource'

describe('parseDocumentInSegments', () => {
  it('emits incremental batches with global ids and line offsets', async () => {
    const content = Array.from(
      { length: 20 },
      (_, index) => `## Section ${index}\n\nparagraph ${index} ${'text '.repeat(20)}\n\n`,
    ).join('')
    const batches: number[] = []
    const result = await parseDocumentInSegments(content, {
      targetChars: 240,
      onSegment: (segment) => batches.push(segment.blocks.length),
    })

    expect(batches.length).toBeGreaterThan(2)
    expect(result.blocks.map((block) => block.id)).toEqual(
      result.blocks.map((_, index) => index),
    )
    expect(result.outline.at(-1)?.text).toBe('Section 19')
    expect(result.outline.at(-1)?.line).toBeGreaterThan(60)
  })

  it('keeps fenced code intact and renders final lazy blocks correctly', async () => {
    const content = `# Start\n\n\`\`\`typescript\n${'const x = 1\n'.repeat(50)}\`\`\`\n\n# End\n`
    const result = await parseDocumentInSegments(content, { targetChars: 100 })
    const code = result.blocks.find((block) => block.kind === 'code')
    const rendered = await renderBlockSources(result.blocks)

    expect(code?.meta?.codeLines).toBe(50)
    expect(rendered.some((block) => block.html.includes('language-typescript'))).toBe(true)
    expect(rendered.some((block) => block.html.includes('id="end"'))).toBe(true)
  })

  it('resolves reference links defined in another segment', async () => {
    const content = `# Links\n\n[OpenAI][oai]\n\n${'padding text\n\n'.repeat(30)}[oai]: https://openai.com\n`
    const result = await parseDocumentInSegments(content, { targetChars: 100 })
    const linkBlock = result.blocks.find((block) => block.source.includes('[OpenAI][oai]'))
    const rendered = await renderBlockSources(
      linkBlock ? [linkBlock] : [],
      result.referenceDefinitions,
    )

    expect(rendered[0]?.html).toContain('href="https://openai.com"')
  })
})
