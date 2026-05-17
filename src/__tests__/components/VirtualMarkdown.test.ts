import { describe, expect, it } from 'vitest'
import { getSectionSearchState, splitMarkdownSections } from '../../components/VirtualMarkdown'

describe('splitMarkdownSections', () => {
  it('splits long headingless documents into bounded virtual chunks', () => {
    const content = Array.from({ length: 260 }, (_, index) => `line ${index + 1}`).join('\n')

    const sections = splitMarkdownSections(content, 100)

    expect(sections).toHaveLength(3)
    expect(sections[0]).toEqual(expect.objectContaining({ startLine: 1, lineCount: 100 }))
    expect(sections[1]).toEqual(expect.objectContaining({ startLine: 101, lineCount: 100 }))
    expect(sections[2]).toEqual(expect.objectContaining({ startLine: 201, lineCount: 60 }))
    expect(sections[0]).toEqual(expect.objectContaining({ startIndex: 0 }))
    expect(sections[1].startIndex).toBeGreaterThan(sections[0].endIndex)
  })

  it('keeps heading sections and splits oversized sections', () => {
    const content = ['# Intro', ...Array.from({ length: 150 }, (_, index) => `intro ${index + 1}`), '## Next', 'done'].join('\n')

    const sections = splitMarkdownSections(content, 80)

    expect(sections.map(section => section.startLine)).toEqual([1, 81, 152])
    expect(sections[0].content).toContain('# Intro')
    expect(sections[2].content).toContain('## Next')
  })

  it('groups many tiny heading sections into bounded chunks', () => {
    const content = Array.from({ length: 100 }, (_, index) => [
      `## Section ${index + 1}`,
      '',
      `paragraph ${index + 1}`,
    ].join('\n')).join('\n')

    const sections = splitMarkdownSections(content, 40)

    expect(sections.length).toBeLessThan(20)
    expect(Math.max(...sections.map(section => section.lineCount))).toBeLessThanOrEqual(40)
    expect(sections[0].content).toContain('## Section 1')
    expect(sections.at(-1)?.content).toContain('## Section 100')
  })

  it('maps global search matches to section-local active match indexes', () => {
    const content = [
      '# First',
      'alpha one',
      'alpha two',
      '# Second',
      'alpha three',
    ].join('\n')
    const sections = splitMarkdownSections(content, 3)
    const matches = [
      { index: content.indexOf('alpha one'), length: 5, text: 'alpha one' },
      { index: content.indexOf('alpha two'), length: 5, text: 'alpha two' },
      { index: content.indexOf('alpha three'), length: 5, text: 'alpha three' },
    ]

    expect(getSectionSearchState(sections[0], matches, 1)).toEqual({
      containsActiveMatch: true,
      localCurrentMatch: 1,
      localMatchCount: 2,
    })
    expect(getSectionSearchState(sections[1], matches, 2)).toEqual({
      containsActiveMatch: true,
      localCurrentMatch: 0,
      localMatchCount: 1,
    })
  })
})
