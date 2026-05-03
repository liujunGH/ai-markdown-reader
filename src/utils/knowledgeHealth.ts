import type { MissingWikiLink } from './wikiGraph'

export type KnowledgeHealthStatus = 'healthy' | 'needs-attention' | 'critical'
export type KnowledgeHealthSeverity = 'good' | 'info' | 'warning' | 'error'

export interface KnowledgeHealthInput {
  indexedFileCount: number
  missingLinks: MissingWikiLink[]
  orphanNodeCount: number
  documentIssueCount: number
  documentErrorCount: number
  imageWarningCount: number
  unresolvedImageCount: number
}

export interface KnowledgeHealthCard {
  id: 'missing-links' | 'orphan-docs' | 'document-issues' | 'image-warnings'
  label: string
  value: number
  detail: string
  severity: KnowledgeHealthSeverity
}

export interface KnowledgeHealthReport {
  score: number
  status: KnowledgeHealthStatus
  cards: KnowledgeHealthCard[]
}

export function buildKnowledgeHealthReport(input: KnowledgeHealthInput): KnowledgeHealthReport {
  const missingReferenceCount = input.missingLinks.reduce((sum, link) => sum + link.references.length, 0)
  const penalty =
    input.documentErrorCount * 14 +
    Math.max(0, input.documentIssueCount - input.documentErrorCount) * 5 +
    input.missingLinks.length * 8 +
    missingReferenceCount * 2 +
    input.unresolvedImageCount * 6 +
    Math.max(0, input.imageWarningCount - input.unresolvedImageCount) * 2 +
    input.orphanNodeCount * 4
  const score = Math.max(0, Math.min(100, 100 - penalty))

  return {
    score,
    status: score >= 90 ? 'healthy' : score >= 50 ? 'needs-attention' : 'critical',
    cards: [
      {
        id: 'missing-links',
        label: '缺失链接',
        value: input.missingLinks.length,
        detail: `${missingReferenceCount} 处引用需要处理`,
        severity: input.missingLinks.length > 0 ? 'warning' : 'good',
      },
      {
        id: 'orphan-docs',
        label: '孤立文档',
        value: input.orphanNodeCount,
        detail: input.indexedFileCount > 0 ? `共 ${input.indexedFileCount} 个已索引文档` : '还没有建立工作区索引',
        severity: input.orphanNodeCount > 0 ? 'info' : 'good',
      },
      {
        id: 'document-issues',
        label: '当前文档问题',
        value: input.documentIssueCount,
        detail: `${input.documentErrorCount} 个错误`,
        severity: input.documentErrorCount > 0 ? 'error' : input.documentIssueCount > 0 ? 'warning' : 'good',
      },
      {
        id: 'image-warnings',
        label: '图片问题',
        value: input.imageWarningCount,
        detail: `${input.unresolvedImageCount} 个未解析本地图片`,
        severity: input.unresolvedImageCount > 0 ? 'warning' : input.imageWarningCount > 0 ? 'info' : 'good',
      },
    ],
  }
}

export function formatKnowledgeHealthMarkdown(report: KnowledgeHealthReport): string {
  const statusLabel: Record<KnowledgeHealthStatus, string> = {
    healthy: '健康',
    'needs-attention': '需要关注',
    critical: '需要处理',
  }
  const rows = report.cards.map(card => `| ${card.label} | ${card.value} | ${card.detail} | ${card.severity} |`)

  return [
    '# 知识库健康报告',
    '',
    `- 健康分数：${report.score}`,
    `- 状态：${statusLabel[report.status]}`,
    '',
    '| 项目 | 数量 | 说明 | 级别 |',
    '|---|---:|---|---|',
    ...rows,
    '',
  ].join('\n')
}
