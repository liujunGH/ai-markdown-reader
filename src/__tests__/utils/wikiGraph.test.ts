import { describe, expect, it } from 'vitest'
import { buildWikiGraph, extractMarkdownFileLinks, extractWikiLinks, findBacklinks, findMissingWikiLinks, resolveWikiTargetFile, suggestMissingWikiLinkTargets } from '../../utils/wikiGraph'

describe('wikiGraph', () => {
  it('extracts wiki links with display text and line numbers', () => {
    expect(extractWikiLinks('Intro\nSee [[Note|Display]] and [[Other]].')).toEqual([
      { target: 'Note', text: 'Display', line: 2 },
      { target: 'Other', text: 'Other', line: 2 },
    ])
  })

  it('finds backlinks to the current document', () => {
    const files = [
      { path: '/docs/a.md', name: 'a.md', content: 'See [[Target]]' },
      { path: '/docs/b.md', name: 'b.md', content: 'No link' },
      { path: '/docs/target.md', name: 'target.md', content: '# Target' },
    ]

    const backlinks = findBacklinks(files, '/docs/target.md', 'target.md')

    expect(backlinks).toEqual([
      {
        sourcePath: '/docs/a.md',
        sourceName: 'a.md',
        line: 1,
        text: 'See [[Target]]',
      },
    ])
  })

  it('finds backlinks from legacy wiki links and markdown file links', () => {
    const files = [
      { path: '/docs/index.md', name: 'index.md', content: 'Open [[产品愿景|01-product-vision]]' },
      { path: '/docs/notes.md', name: 'notes.md', content: 'See [Vision](./01-product-vision.md#intro)' },
      { path: '/docs/01-product-vision.md', name: '01-product-vision.md', content: '# 产品愿景' },
    ]

    expect(findBacklinks(files, '/docs/01-product-vision.md', '01-product-vision.md')).toEqual([
      {
        sourcePath: '/docs/index.md',
        sourceName: 'index.md',
        line: 1,
        text: 'Open [[产品愿景|01-product-vision]]',
      },
      {
        sourcePath: '/docs/notes.md',
        sourceName: 'notes.md',
        line: 1,
        text: 'See [Vision](./01-product-vision.md#intro)',
      },
    ])
  })

  it('extracts markdown file links and ignores external links and images', () => {
    expect(extractMarkdownFileLinks('![Alt](./image.png)\n[Doc](./docs/Note.md#top)\n[Spaced](<./docs/My Note.md>)\n[Site](https://example.com/a.md)')).toEqual([
      { target: './docs/Note.md#top', text: 'Doc', line: 2 },
      { target: './docs/My Note.md', text: 'Spaced', line: 3 },
    ])
  })

  it('resolves wiki targets from indexed workspace files', () => {
    const files = [
      { path: '/docs/notes/Project Notes.md', name: 'Project Notes.md', content: '# Project' },
      { path: '/docs/01-product-vision.md', name: '01-product-vision.md', content: '# Vision' },
    ]

    expect(resolveWikiTargetFile(files, 'notes/Project Notes')?.path).toBe('/docs/notes/Project Notes.md')
    expect(resolveWikiTargetFile(files, '01-product-vision', '产品愿景')?.path).toBe('/docs/01-product-vision.md')
    expect(resolveWikiTargetFile(files, '显示名称', 'Project Notes')?.path).toBe('/docs/notes/Project Notes.md')
  })

  it('finds missing wiki links and groups source references', () => {
    const files = [
      { path: '/docs/index.md', name: 'index.md', content: 'Open [[Missing Note|显示名]] and [[Existing]].' },
      { path: '/docs/legacy.md', name: 'legacy.md', content: 'Open legacy [[旧显示名|Missing Note]].' },
      { path: '/docs/existing.md', name: 'existing.md', content: '# Existing' },
    ]

    expect(findMissingWikiLinks(files)).toEqual([
      {
        target: 'Missing Note',
        normalizedTarget: 'missing note',
        sourceCount: 2,
        references: [
          {
            sourcePath: '/docs/index.md',
            sourceName: 'index.md',
            line: 1,
            text: 'Open [[Missing Note|显示名]] and [[Existing]].',
            displayText: '显示名',
          },
          {
            sourcePath: '/docs/legacy.md',
            sourceName: 'legacy.md',
            line: 1,
            text: 'Open legacy [[旧显示名|Missing Note]].',
            displayText: '旧显示名',
          },
        ],
      },
    ])
  })

  it('suggests likely target files for missing wiki links', () => {
    const files = [
      { path: '/docs/projects/product-roadmap.md', name: 'product-roadmap.md', content: '# Roadmap' },
      { path: '/docs/projects/product-research.md', name: 'product-research.md', content: '# Research' },
      { path: '/docs/random.md', name: 'random.md', content: '# Random' },
    ]

    expect(suggestMissingWikiLinkTargets(files, 'product roadmap')).toEqual([
      expect.objectContaining({ path: '/docs/projects/product-roadmap.md', label: 'product-roadmap', score: 4 }),
      expect.objectContaining({ path: '/docs/projects/product-research.md', label: 'product-research', score: 2 }),
    ])
  })

  it('builds nodes, edges, and orphan nodes', () => {
    const graph = buildWikiGraph([
      { path: '/docs/a.md', name: 'a.md', content: 'See [[B]] and [C](./c.md)' },
      { path: '/docs/b.md', name: 'b.md', content: 'See [[Missing]]' },
      { path: '/docs/c.md', name: 'c.md', content: 'No links' },
    ])

    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'a', to: 'b', line: 1 }),
        expect.objectContaining({ from: 'a', to: 'c', line: 1 }),
        expect.objectContaining({ from: 'b', to: 'missing', line: 1 }),
      ])
    )
    expect(graph.nodes.map(node => node.id)).toEqual(expect.arrayContaining(['a', 'b', 'c', 'missing']))
    expect(graph.orphanNodes.map(node => node.id)).not.toContain('c')
  })
})
