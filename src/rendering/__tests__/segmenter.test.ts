import { describe, expect, it } from 'vitest'
import { countMarkdownLines, extractReferenceDefinitions, segmentMarkdown } from '../pipeline/segmenter'

describe('segmentMarkdown', () => {
  it('splits a large heading-based document and preserves every source byte', () => {
    const content = Array.from(
      { length: 40 },
      (_, index) => `## Section ${index}\n\n${'paragraph '.repeat(20)}\n\n`,
    ).join('')
    const segments = segmentMarkdown(content, 400)

    expect(segments.length).toBeGreaterThan(5)
    expect(segments.map((segment) => segment.content).join('')).toBe(content)
    expect(segments[1].startLineOffset).toBeGreaterThan(0)
  })

  it('never splits inside fenced code even when it contains headings and blank lines', () => {
    const content = `# Start\n\n\`\`\`markdown\n${'# fake heading\n\ntext\n'.repeat(30)}\`\`\`\n\n# End\n`
    const segments = segmentMarkdown(content, 120)
    const fenceSegments = segments.filter((segment) => segment.content.includes('```markdown'))

    expect(fenceSegments).toHaveLength(1)
    expect(fenceSegments[0].content).toContain('```\n')
    expect(segments.map((segment) => segment.content).join('')).toBe(content)
  })

  it('keeps loose list continuation together across blank lines', () => {
    const content = `# List\n\n- first\n\n- second\n\n- third\n\n# Tail\n`
    const segments = segmentMarkdown(content, 12)
    const listSegments = segments.filter((segment) => segment.content.includes('- first'))

    expect(listSegments).toHaveLength(1)
    expect(listSegments[0].content).toContain('- third')
  })

  it('counts LF lines without allocating a split array', () => {
    expect(countMarkdownLines('one\ntwo\nthree')).toBe(3)
    expect(countMarkdownLines('')).toBe(1)
  })

  it('extracts reference definitions including indented titles', () => {
    const content = '[OpenAI][oai]\n\n[oai]: https://openai.com\n  "OpenAI"\n'
    expect(extractReferenceDefinitions(content)).toContain('[oai]: https://openai.com')
    expect(extractReferenceDefinitions(content)).toContain('"OpenAI"')
  })
})
