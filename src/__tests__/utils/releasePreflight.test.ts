import { describe, expect, it } from 'vitest'
import { buildReleasePreflightReport, formatReleasePreflightMarkdown } from '../../utils/releasePreflight'

describe('releasePreflight', () => {
  it('passes when health, tasks, and index coverage are clean', () => {
    const report = buildReleasePreflightReport({
      healthScore: 96,
      healthStatus: 'healthy',
      maintenanceTaskCount: 0,
      maintenanceErrorCount: 0,
      indexedFileCount: 10,
      indexSkippedCount: 0,
    })

    expect(report.status).toBe('pass')
    expect(report.checks.every(check => check.status === 'pass')).toBe(true)
  })

  it('fails when blocking maintenance tasks exist', () => {
    const report = buildReleasePreflightReport({
      healthScore: 42,
      healthStatus: 'critical',
      maintenanceTaskCount: 4,
      maintenanceErrorCount: 1,
      indexedFileCount: 2,
      indexSkippedCount: 8,
    })

    expect(report.status).toBe('fail')
    expect(report.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'health-score', status: 'fail' }),
      expect.objectContaining({ id: 'maintenance-queue', status: 'fail' }),
      expect.objectContaining({ id: 'index-coverage', status: 'fail' }),
    ]))
  })

  it('formats a report as markdown', () => {
    const report = buildReleasePreflightReport({
      healthScore: 80,
      healthStatus: 'needs-attention',
      maintenanceTaskCount: 2,
      maintenanceErrorCount: 0,
      indexedFileCount: 8,
      indexSkippedCount: 2,
    })

    const markdown = formatReleasePreflightMarkdown(report)
    expect(markdown).toContain('# 发布前检查')
    expect(markdown).toContain('- 总体状态：warning')
    expect(markdown).toContain('| 知识库健康 | warning |')
  })
})
