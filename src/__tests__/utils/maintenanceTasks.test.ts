import { describe, expect, it } from 'vitest'
import { buildMaintenanceTasks, formatMaintenanceTasksMarkdown } from '../../utils/maintenanceTasks'

describe('maintenanceTasks', () => {
  it('builds a sorted actionable queue from diagnostics', () => {
    const tasks = buildMaintenanceTasks({
      missingLinks: [
        {
          target: 'Roadmap',
          normalizedTarget: 'roadmap',
          sourceCount: 1,
          references: [
            { sourcePath: '/docs/a.md', sourceName: 'a.md', line: 3, text: '[[Roadmap]]', displayText: 'Roadmap' },
          ],
        },
      ],
      images: [
        { alt: 'Logo', src: './logo.png', line: 8, type: 'local-relative', warnings: [], resolvedPath: undefined },
        { alt: 'Hero', src: 'https://example.com/hero.png', line: 12, type: 'remote', warnings: [] },
      ],
      indexSkippedItems: [
        { path: '/docs/large.md', name: 'large.md', reason: 'large-file', size: 2_000_000, maxSize: 1_000_000 },
      ],
      documentIssues: [
        { type: 'empty-image-src', severity: 'error', line: 5, message: '图片地址为空' },
      ],
    })

    expect(tasks.map(task => task.kind)).toEqual([
      'document-issue',
      'missing-link',
      'image-issue',
      'image-issue',
      'index-skip',
    ])
    expect(tasks[0]).toEqual(expect.objectContaining({
      severity: 'error',
      title: '文档问题：图片地址为空',
      actionLabel: '定位问题',
      line: 5,
    }))
    expect(tasks[1]).toEqual(expect.objectContaining({
      id: 'missing-link:roadmap',
      title: '缺失链接：Roadmap',
      detail: '1 个文件中的 1 处引用需要处理',
      actionLabel: '打开缺失链接',
    }))
    expect(tasks.find(task => task.id === 'image-issue:12:https://example.com/hero.png')).toEqual(expect.objectContaining({
      title: '图片问题：Hero',
      detail: '网络图片依赖外部访问；离线使用时建议下载到本地并改成相对路径。',
    }))
  })

  it('formats tasks as a markdown checklist', () => {
    const markdown = formatMaintenanceTasksMarkdown(buildMaintenanceTasks({
      missingLinks: [],
      images: [],
      indexSkippedItems: [{ path: '/docs/.git', name: '.git', reason: 'ignored-directory' }],
      documentIssues: [{ type: 'empty-link', severity: 'warning', line: 2, message: '链接目标为空' }],
    }))

    expect(markdown).toContain('# 待处理维护清单')
    expect(markdown).toContain('- [ ] warning · 文档问题：链接目标为空')
    expect(markdown).toContain('- [ ] info · 索引跳过：.git：已忽略目录')
  })
})
