import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { KnowledgeHealthPanel } from '../../components/KnowledgeHealthPanel'

describe('KnowledgeHealthPanel', () => {
  it('renders the health report and opens detail panels', async () => {
    const user = userEvent.setup()
    const onOpenDetail = vi.fn()
    const onOpenFirstIssue = vi.fn()
    const onCopyReport = vi.fn()

    render(
      <KnowledgeHealthPanel
        report={{
          score: 50,
          status: 'needs-attention',
          overview: [
            { label: '索引覆盖率', value: '67%' },
            { label: '下一步', value: '先处理当前文档错误' },
          ],
          cards: [
            { id: 'missing-links', label: '缺失链接', value: 1, detail: '1 处引用需要处理', severity: 'warning' },
            { id: 'orphan-docs', label: '孤立文档', value: 2, detail: '共 4 个已索引文档', severity: 'info' },
            { id: 'document-issues', label: '当前文档问题', value: 3, detail: '1 个错误', severity: 'error' },
            { id: 'image-warnings', label: '图片问题', value: 2, detail: '1 个未解析本地图片', severity: 'warning' },
          ],
        }}
        onOpenDetail={onOpenDetail}
        onOpenFirstIssue={onOpenFirstIssue}
        onCopyReport={onCopyReport}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('需要关注')).toBeInTheDocument()
    expect(screen.getByText('索引覆盖率')).toBeInTheDocument()
    expect(screen.getByText('67%')).toBeInTheDocument()
    expect(screen.getByText('先处理当前文档错误')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '查看缺失链接' }))
    expect(onOpenDetail).toHaveBeenCalledWith('missing-links')

    await user.click(screen.getByRole('button', { name: '查看孤立文档' }))
    expect(onOpenDetail).toHaveBeenCalledWith('orphan-docs')

    await user.click(screen.getByRole('button', { name: '定位首个问题' }))
    expect(onOpenFirstIssue).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '复制 Markdown 报告' }))
    expect(onCopyReport).toHaveBeenCalled()
  })
})
