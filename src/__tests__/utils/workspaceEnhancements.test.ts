import { describe, expect, it } from 'vitest'
import {
  applyLinkRenameToContent,
  buildExecutableFixSuggestions,
  buildImageAssetPlan,
  buildLinkRenamePreview,
  buildReadingAssistant,
  buildReleasePackageChecks,
  buildWorkspaceDashboard,
} from '../../utils/workspaceEnhancements'
import type { MaintenanceTask } from '../../utils/maintenanceTasks'

const tasks: MaintenanceTask[] = [
  { id: 'missing-link:roadmap', kind: 'missing-link', title: '缺失链接：Roadmap', detail: '1 处引用', actionLabel: '打开缺失链接', severity: 'warning' },
  { id: 'image-issue:1:https://img.test/a.png', kind: 'image-issue', title: '图片问题：远程图', detail: '网络图片依赖外部访问', line: 1, actionLabel: '打开图片检查', severity: 'info' },
  { id: 'document-issue:empty', kind: 'document-issue', title: '文档问题：图片地址为空', detail: 'empty-image-src', line: 2, actionLabel: '定位问题', severity: 'error' },
]

describe('workspaceEnhancements', () => {
  it('builds executable fix suggestions from maintenance tasks', () => {
    const fixes = buildExecutableFixSuggestions(tasks)

    expect(fixes).toEqual([
      expect.objectContaining({ id: 'create-missing-doc:roadmap', title: '创建缺失文档', action: 'create-missing-doc' }),
      expect.objectContaining({ id: 'localize-image:image-issue:1:https://img.test/a.png', title: '本地化网络图片', action: 'localize-remote-image' }),
      expect.objectContaining({ id: 'edit-document-issue:document-issue:empty', title: '处理文档问题', action: 'open-document-issue' }),
    ])
  })

  it('builds image asset plans for remote, local, and unresolved images', () => {
    const plan = buildImageAssetPlan([
      { alt: 'remote', src: 'https://img.test/a.png', line: 1, type: 'remote', warnings: [] },
      { alt: 'local', src: './assets/a.png', line: 2, type: 'local-relative', resolvedPath: '/docs/assets/a.png', warnings: [] },
      { alt: 'missing', src: './missing.png', line: 3, type: 'local-relative', warnings: [] },
    ])

    expect(plan.summary).toEqual({ total: 3, remote: 1, portable: 1, unresolved: 1 })
    expect(plan.actions.map(action => action.kind)).toEqual(['download-remote', 'verify-local'])
  })

  it('previews and applies markdown/wiki link renames', () => {
    const files = [
      { path: '/docs/a.md', name: 'a.md', content: 'See [[Old Name]] and [old](Old%20Name.md).' },
      { path: '/docs/b.md', name: 'b.md', content: 'No links here.' },
    ]

    const preview = buildLinkRenamePreview(files, '/docs/Old Name.md', '/docs/New Name.md')
    expect(preview.changedFiles).toEqual([
      expect.objectContaining({ path: '/docs/a.md', replacements: 2 }),
    ])
    expect(applyLinkRenameToContent(files[0].content, preview)).toBe('See [[New Name]] and [old](New%20Name.md).')
  })

  it('builds reading assistant suggestions', () => {
    const assistant = buildReadingAssistant({
      activeFilePath: '/docs/current.md',
      activeFileName: 'current.md',
      readingHistory: [
        { filePath: '/docs/older.md', name: 'older.md', progress: 0.5, line: 20, scrollTop: 100, updatedAt: Date.now() - 1000 },
      ],
      readLaterCount: 2,
    })

    expect(assistant.cards).toEqual([
      expect.objectContaining({ id: 'current-progress', value: '当前文档' }),
      expect.objectContaining({ id: 'continue-reading', title: '继续阅读', value: 'older.md' }),
      expect.objectContaining({ id: 'read-later', value: '2' }),
    ])
  })

  it('builds release package checks from preflight and build metadata', () => {
    const checks = buildReleasePackageChecks({
      preflightStatus: 'warning',
      version: '1.5.4',
      hasBuildOutput: true,
      packageHistoryCount: 2,
    })

    expect(checks).toEqual([
      expect.objectContaining({ id: 'preflight', status: 'warning' }),
      expect.objectContaining({ id: 'version', detail: '当前版本 1.5.4' }),
      expect.objectContaining({ id: 'build-output', status: 'pass' }),
      expect.objectContaining({ id: 'package-history', detail: '已记录 2 次本地打包' }),
    ])
  })

  it('combines all signals into dashboard sections', () => {
    const dashboard = buildWorkspaceDashboard({
      healthScore: 82,
      maintenanceTasks: tasks,
      imagePlan: buildImageAssetPlan([]),
      readingAssistant: buildReadingAssistant({ activeFilePath: null, activeFileName: '', readingHistory: [], readLaterCount: 0 }),
      releaseChecks: buildReleasePackageChecks({ preflightStatus: 'pass', version: '1.5.4', hasBuildOutput: false, packageHistoryCount: 0 }),
      linkRenamePreview: buildLinkRenamePreview([], '/docs/Old.md', '/docs/New.md'),
    })

    expect(dashboard.sections.map(section => section.id)).toEqual([
      'quality',
      'fixes',
      'links',
      'images',
      'reading',
      'release',
    ])
    expect(dashboard.sections[0].items[0]).toEqual(expect.objectContaining({ label: '健康分数', value: '82' }))
  })
})
