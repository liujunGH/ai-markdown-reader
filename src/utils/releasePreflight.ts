import type { KnowledgeHealthStatus } from './knowledgeHealth'

export type ReleasePreflightStatus = 'pass' | 'warning' | 'fail'

export interface ReleasePreflightCheck {
  id: 'health-score' | 'maintenance-queue' | 'index-coverage'
  label: string
  status: ReleasePreflightStatus
  detail: string
}

export interface ReleasePreflightReport {
  status: ReleasePreflightStatus
  checks: ReleasePreflightCheck[]
}

export interface ReleasePreflightInput {
  healthScore: number
  healthStatus: KnowledgeHealthStatus
  maintenanceTaskCount: number
  maintenanceErrorCount: number
  indexedFileCount: number
  indexSkippedCount: number
}

const STATUS_ORDER: Record<ReleasePreflightStatus, number> = {
  pass: 0,
  warning: 1,
  fail: 2,
}

export function buildReleasePreflightReport(input: ReleasePreflightInput): ReleasePreflightReport {
  const totalIndexedCandidates = input.indexedFileCount + input.indexSkippedCount
  const coverage = totalIndexedCandidates > 0 ? Math.round((input.indexedFileCount / totalIndexedCandidates) * 100) : 0
  const checks: ReleasePreflightCheck[] = [
    {
      id: 'health-score',
      label: '知识库健康',
      status: healthStatusFor(input.healthScore, input.healthStatus),
      detail: `健康分数 ${input.healthScore}`,
    },
    {
      id: 'maintenance-queue',
      label: '待处理队列',
      status: input.maintenanceErrorCount > 0 ? 'fail' : input.maintenanceTaskCount > 0 ? 'warning' : 'pass',
      detail: input.maintenanceTaskCount > 0
        ? `${input.maintenanceTaskCount} 项待处理，其中 ${input.maintenanceErrorCount} 项错误`
        : '没有阻塞项',
    },
    {
      id: 'index-coverage',
      label: '索引覆盖率',
      status: coverage >= 90 ? 'pass' : coverage >= 70 ? 'warning' : 'fail',
      detail: totalIndexedCandidates > 0 ? `${coverage}%（${input.indexedFileCount}/${totalIndexedCandidates}）` : '暂无索引数据',
    },
  ]

  return {
    status: checks.reduce<ReleasePreflightStatus>((current, check) => (
      STATUS_ORDER[check.status] > STATUS_ORDER[current] ? check.status : current
    ), 'pass'),
    checks,
  }
}

export function formatReleasePreflightMarkdown(report: ReleasePreflightReport): string {
  return [
    '# 发布前检查',
    '',
    `- 总体状态：${report.status}`,
    '',
    '| 检查项 | 状态 | 说明 |',
    '|---|---|---|',
    ...report.checks.map(check => `| ${check.label} | ${check.status} | ${check.detail} |`),
    '',
  ].join('\n')
}

function healthStatusFor(score: number, status: KnowledgeHealthStatus): ReleasePreflightStatus {
  if (status === 'critical' || score < 50) return 'fail'
  if (status === 'needs-attention' || score < 90) return 'warning'
  return 'pass'
}
