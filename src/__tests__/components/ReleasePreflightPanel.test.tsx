import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ReleasePreflightPanel } from '../../components/ReleasePreflightPanel'
import type { ReleasePreflightReport } from '../../utils/releasePreflight'

const report: ReleasePreflightReport = {
  status: 'warning',
  checks: [
    { id: 'health-score', label: '知识库健康', status: 'warning', detail: '健康分数 80' },
    { id: 'maintenance-queue', label: '待处理队列', status: 'pass', detail: '没有阻塞项' },
  ],
}

describe('ReleasePreflightPanel', () => {
  it('renders checks and exposes report actions', async () => {
    const user = userEvent.setup()
    const onOpenMaintenance = vi.fn()
    const onCopyReport = vi.fn()

    render(
      <ReleasePreflightPanel
        report={report}
        onOpenMaintenance={onOpenMaintenance}
        onCopyReport={onCopyReport}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('发布前检查')).toBeInTheDocument()
    expect(screen.getByText('需要复查')).toBeInTheDocument()
    expect(screen.getByText('知识库健康')).toBeInTheDocument()
    expect(screen.getByText('健康分数 80')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '打开待处理队列' }))
    expect(onOpenMaintenance).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '复制检查报告' }))
    expect(onCopyReport).toHaveBeenCalled()
  })
})
