import { describe, expect, it } from 'vitest'
import {
  applyImageLocalizationReplacements,
  applyRenamePlanToContent,
  buildArchiveReport,
  buildDocumentTemplates,
  buildImageLocalizationPlan,
  buildRenamePlan,
  findUnlinkedMentions,
  renderDocumentTemplate,
} from '../../utils/workspaceActions'

const files = [
  { path: '/docs/Project Plan.md', name: 'Project Plan.md', content: '# Project Plan\n' },
  { path: '/docs/Notes.md', name: 'Notes.md', content: 'See [[Project Plan]] and [plan](Project%20Plan.md). Project Plan is important.' },
  { path: '/docs/Loose.md', name: 'Loose.md', content: 'Project Plan appears here without a link.' },
]

describe('workspaceActions', () => {
  it('renders document templates with context variables', () => {
    const templates = buildDocumentTemplates()
    const daily = templates.find(template => template.id === 'daily-note')

    expect(templates.map(template => template.id)).toEqual(['blank-note', 'daily-note', 'meeting-note', 'book-note', 'project-doc'])
    expect(renderDocumentTemplate(daily!, { title: '今天', date: '2026-05-03', folderName: 'docs' })).toContain('# 今天')
    expect(renderDocumentTemplate(daily!, { title: '今天', date: '2026-05-03', folderName: 'docs' })).toContain('2026-05-03')
  })

  it('builds and applies a rename plan across wiki and markdown links', () => {
    const plan = buildRenamePlan(files, '/docs/Project Plan.md', '/docs/Roadmap.md')

    expect(plan.changedFiles).toEqual([
      expect.objectContaining({ path: '/docs/Notes.md', replacements: 2 }),
    ])
    expect(applyRenamePlanToContent(files[1].content, plan)).toBe('See [[Roadmap]] and [plan](Roadmap.md). Project Plan is important.')
  })

  it('plans image localization and applies markdown replacements', () => {
    const plan = buildImageLocalizationPlan('/docs/Notes.md', [
      { alt: 'hero', src: 'https://example.com/hero.png', line: 4, type: 'remote', warnings: [] },
      { alt: 'local', src: './local.png', line: 5, type: 'local-relative', warnings: [] },
    ])

    expect(plan.assetsDir).toBe('/docs/assets')
    expect(plan.items).toEqual([
      expect.objectContaining({ src: 'https://example.com/hero.png', localMarkdownSrc: './assets/hero.png' }),
    ])
    expect(applyImageLocalizationReplacements('![hero](https://example.com/hero.png)', plan)).toBe('![hero](./assets/hero.png)')
  })

  it('finds filename mentions that are not linked', () => {
    const mentions = findUnlinkedMentions(files, files[2])

    expect(mentions).toEqual([
      expect.objectContaining({ targetPath: '/docs/Project Plan.md', label: 'Project Plan', count: 1 }),
    ])
  })

  it('builds an archive report for a workspace', () => {
    const report = buildArchiveReport({
      files,
      healthScore: 88,
      maintenanceTaskCount: 3,
      remoteImageCount: 1,
      missingLinkCount: 2,
    })

    expect(report).toContain('# 工作区归档报告')
    expect(report).toContain('- 文档数量：3')
    expect(report).toContain('- 健康分数：88')
    expect(report).toContain('| Project Plan.md |')
  })
})
