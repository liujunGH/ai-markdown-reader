import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { WorkspaceDashboardPanel } from '../../components/WorkspaceDashboardPanel'
import type { WorkspaceDashboard } from '../../utils/workspaceEnhancements'

const dashboard: WorkspaceDashboard = {
  sections: [
    {
      id: 'quality',
      title: '工作区质量',
      actionLabel: '打开健康报告',
      items: [{ label: '健康分数', value: '82', detail: '3 项待处理' }],
    },
    {
      id: 'fixes',
      title: '可执行修复',
      actionLabel: '打开待处理队列',
      items: [{ label: '可执行建议', value: '3', detail: '创建缺失文档' }],
    },
    {
      id: 'release',
      title: '发布辅助',
      actionLabel: '打开发布前检查',
      items: [{ label: '发布前检查', value: 'warning', detail: '需要复查', status: 'warning' }],
    },
  ],
}

describe('WorkspaceDashboardPanel', () => {
  it('renders dashboard sections and routes section actions', async () => {
    const user = userEvent.setup()
    const onOpenSection = vi.fn()

    render(
      <WorkspaceDashboardPanel
        dashboard={dashboard}
        onOpenSection={onOpenSection}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('工作区仪表盘')).toBeInTheDocument()
    expect(screen.getByText('工作区质量')).toBeInTheDocument()
    expect(screen.getByText('健康分数')).toBeInTheDocument()
    expect(screen.getByText('82')).toBeInTheDocument()
    expect(screen.getByText('发布辅助')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '打开待处理队列' }))
    expect(onOpenSection).toHaveBeenCalledWith('fixes')
  })
})
