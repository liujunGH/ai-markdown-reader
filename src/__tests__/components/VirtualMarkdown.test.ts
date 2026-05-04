import { describe, expect, it } from 'vitest'
import { splitMarkdownSections } from '../../components/VirtualMarkdown'

describe('splitMarkdownSections', () => {
  it('splits long headingless documents into bounded virtual chunks', () => {
    const content = Array.from({ length: 260 }, (_, index) => `line ${index + 1}`).join('\n')

    const sections = splitMarkdownSections(content, 100)

    expect(sections).toHaveLength(3)
    expect(sections[0]).toEqual(expect.objectContaining({ startLine: 1, lineCount: 100 }))
    expect(sections[1]).toEqual(expect.objectContaining({ startLine: 101, lineCount: 100 }))
    expect(sections[2]).toEqual(expect.objectContaining({ startLine: 201, lineCount: 60 }))
  })

  it('keeps heading sections and splits oversized sections', () => {
    const content = ['# Intro', ...Array.from({ length: 150 }, (_, index) => `intro ${index + 1}`), '## Next', 'done'].join('\n')

    const sections = splitMarkdownSections(content, 80)

    expect(sections.map(section => section.startLine)).toEqual([1, 81, 152])
    expect(sections[0].content).toContain('# Intro')
    expect(sections[2].content).toContain('## Next')
  })
})
