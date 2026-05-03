import { describe, expect, it } from 'vitest'
import { buildKnowledgeHealthReport, formatKnowledgeHealthMarkdown } from '../../utils/knowledgeHealth'

describe('knowledgeHealth', () => {
  it('summarizes workspace and active document health signals', () => {
    const report = buildKnowledgeHealthReport({
      indexedFileCount: 4,
      missingLinks: [
        { target: 'Roadmap', normalizedTarget: 'roadmap', sourceCount: 2, references: [{ sourcePath: '/docs/a.md', sourceName: 'a.md', line: 4, text: '[[Roadmap]]', displayText: 'Roadmap' }] },
      ],
      orphanNodeCount: 2,
      documentIssueCount: 3,
      documentErrorCount: 1,
      imageWarningCount: 2,
      unresolvedImageCount: 1,
      indexSkippedCount: 2,
    })

    expect(report.score).toBe(50)
    expect(report.status).toBe('needs-attention')
    expect(report.cards).toEqual([
      expect.objectContaining({ id: 'missing-links', value: 1, severity: 'warning' }),
      expect.objectContaining({ id: 'orphan-docs', value: 2, severity: 'info' }),
      expect.objectContaining({ id: 'document-issues', value: 3, severity: 'error' }),
      expect.objectContaining({ id: 'image-warnings', value: 2, severity: 'warning' }),
    ])
    expect(report.overview).toEqual([
      { label: '索引覆盖率', value: '67%' },
      { label: '下一步', value: '先处理当前文档错误' },
    ])
  })

  it('marks a clean workspace as healthy', () => {
    const report = buildKnowledgeHealthReport({
      indexedFileCount: 3,
      missingLinks: [],
      orphanNodeCount: 0,
      documentIssueCount: 0,
      documentErrorCount: 0,
      imageWarningCount: 0,
      unresolvedImageCount: 0,
      indexSkippedCount: 0,
    })

    expect(report.score).toBe(100)
    expect(report.status).toBe('healthy')
  })

  it('formats a report as markdown', () => {
    const report = buildKnowledgeHealthReport({
      indexedFileCount: 3,
      missingLinks: [],
      orphanNodeCount: 0,
      documentIssueCount: 0,
      documentErrorCount: 0,
      imageWarningCount: 0,
      unresolvedImageCount: 0,
      indexSkippedCount: 0,
    })

    expect(formatKnowledgeHealthMarkdown(report)).toContain('# 知识库健康报告')
    expect(formatKnowledgeHealthMarkdown(report)).toContain('- 健康分数：100')
    expect(formatKnowledgeHealthMarkdown(report)).toContain('| 缺失链接 | 0 |')
  })
})
