import { describe, expect, it } from 'vitest'
import { buildKnowledgeHealthReport } from '../../utils/knowledgeHealth'

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
    })

    expect(report.score).toBe(50)
    expect(report.status).toBe('needs-attention')
    expect(report.cards).toEqual([
      expect.objectContaining({ id: 'missing-links', value: 1, severity: 'warning' }),
      expect.objectContaining({ id: 'orphan-docs', value: 2, severity: 'info' }),
      expect.objectContaining({ id: 'document-issues', value: 3, severity: 'error' }),
      expect.objectContaining({ id: 'image-warnings', value: 2, severity: 'warning' }),
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
    })

    expect(report.score).toBe(100)
    expect(report.status).toBe('healthy')
  })
})
