import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MaintenanceQueuePanel } from '../../components/MaintenanceQueuePanel'
import type { MaintenanceTask } from '../../utils/maintenanceTasks'

const tasks: MaintenanceTask[] = [
  {
    id: 'document-issue:1',
    kind: 'document-issue',
    title: '文档问题：图片地址为空',
    detail: 'empty-image-src',
    line: 5,
    actionLabel: '定位问题',
    severity: 'error',
  },
  {
    id: 'missing-link:roadmap',
    kind: 'missing-link',
    title: '缺失链接：Roadmap',
    detail: '1 个文件中的 1 处引用需要处理',
    actionLabel: '打开缺失链接',
    severity: 'warning',
  },
]

describe('MaintenanceQueuePanel', () => {
  it('renders task summary and routes task actions', async () => {
    const user = userEvent.setup()
    const onOpenTask = vi.fn()
    const onCopyTasks = vi.fn()

    render(
      <MaintenanceQueuePanel
        tasks={tasks}
        onOpenTask={onOpenTask}
        onCopyTasks={onCopyTasks}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('待处理队列')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1 个错误')).toBeInTheDocument()
    expect(screen.getByText('1 个警告')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '定位问题' }))
    expect(onOpenTask).toHaveBeenCalledWith(tasks[0])

    await user.click(screen.getByRole('button', { name: '复制待处理清单' }))
    expect(onCopyTasks).toHaveBeenCalled()
  })

  it('can hide tasks marked as done locally', async () => {
    const user = userEvent.setup()

    render(
      <MaintenanceQueuePanel
        tasks={tasks}
        onOpenTask={vi.fn()}
        onCopyTasks={vi.fn()}
        onClose={vi.fn()}
      />
    )

    await user.click(screen.getAllByRole('button', { name: '标记已处理' })[0])

    expect(screen.queryByText('文档问题：图片地址为空')).not.toBeInTheDocument()
    expect(screen.getByText('缺失链接：Roadmap')).toBeInTheDocument()
    expect(screen.getByText('已处理 1 项')).toBeInTheDocument()
  })
})
