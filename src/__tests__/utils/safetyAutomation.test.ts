import { describe, expect, it } from 'vitest'
import {
  buildBatchMovePlan,
  buildImageAssetAudit,
  buildOperationPreview,
  buildReleaseAutomationPlan,
  buildStaticSiteExportPlan,
  buildWorkspaceHome,
  createOperationSnapshot,
  createWorkspaceTemplate,
  formatOperationPreviewMarkdown,
} from '../../utils/safetyAutomation'

const files = [
  { path: '/docs/a.md', name: 'a.md', content: '# A\n\n![x](./assets/x.png)\n' },
  { path: '/docs/b.md', name: 'b.md', content: 'See [[a]] and [A](a.md).\n' },
]

describe('safetyAutomation', () => {
  it('builds operation previews and undo snapshots', () => {
    const preview = buildOperationPreview({
      id: 'rename-a',
      title: '重命名 a',
      changes: [
        { path: '/docs/b.md', before: 'See [[a]]', after: 'See [[A]]' },
      ],
    })

    expect(preview.summary).toEqual({ files: 1, additions: 1, removals: 1 })
    expect(formatOperationPreviewMarkdown(preview)).toContain('## 重命名 a')
    expect(formatOperationPreviewMarkdown(preview)).toContain('```diff')
    expect(createOperationSnapshot(preview).files[0]).toEqual({ path: '/docs/b.md', content: 'See [[a]]' })
  })

  it('audits image assets for unused, duplicate, and remote images', () => {
    const audit = buildImageAssetAudit({
      files,
      imageFiles: ['/docs/assets/x.png', '/docs/assets/unused.png', '/docs/assets/copy-x.png'],
      duplicateGroups: [['/docs/assets/x.png', '/docs/assets/copy-x.png']],
      remoteImageCount: 2,
    })

    expect(audit.unused).toEqual(['/docs/assets/unused.png', '/docs/assets/copy-x.png'])
    expect(audit.duplicateGroups).toHaveLength(1)
    expect(audit.summary).toEqual({ totalAssets: 3, used: 1, unused: 2, duplicateGroups: 1, remote: 2 })
  })

  it('creates configurable workspace templates', () => {
    const template = createWorkspaceTemplate({
      name: '周报',
      fileName: '{{date}}-周报.md',
      body: '# {{title}}\n\n{{selection}}\n',
    }, { title: '本周', date: '2026-05-03', folderName: 'docs', selection: '重点' })

    expect(template.fileName).toBe('2026-05-03-周报.md')
    expect(template.body).toContain('# 本周')
    expect(template.body).toContain('重点')
  })

  it('builds batch move plans and static site export plans', () => {
    const movePlan = buildBatchMovePlan(files, '/docs/archive')
    expect(movePlan.operations).toEqual([
      expect.objectContaining({ from: '/docs/a.md', to: '/docs/archive/a.md' }),
      expect.objectContaining({ from: '/docs/b.md', to: '/docs/archive/b.md' }),
    ])
    expect(movePlan.affectedLinks).toBe(2)

    const exportPlan = buildStaticSiteExportPlan(files, '/docs/site')
    expect(exportPlan.outputDir).toBe('/docs/site')
    expect(exportPlan.pages.map(page => page.outputPath)).toEqual(['/docs/site/a.html', '/docs/site/b.html'])
  })

  it('builds workspace home cards and release automation commands', () => {
    const home = buildWorkspaceHome({
      recentFileName: 'a.md',
      healthScore: 91,
      taskCount: 2,
      modifiedCount: 3,
      unlinkedMentionCount: 1,
    })
    expect(home.cards.map(card => card.label)).toEqual(['最近阅读', '健康分数', '待处理', '最近修改', '未链接提及'])

    const release = buildReleaseAutomationPlan('1.5.6', 'docs/releases/v1.5.6.md')
    expect(release.commands).toContain('npm run lint')
    expect(release.commands).toContain('gh release create v1.5.6 --notes-file docs/releases/v1.5.6.md')
  })
})
