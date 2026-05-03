import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { KnowledgeHealthPanel } from '../../components/KnowledgeHealthPanel'

describe('KnowledgeHealthPanel', () => {
  it('renders the health report and opens detail panels', async () => {
    const user = userEvent.setup()
    const onOpenDetail = vi.fn()

    render(
      <KnowledgeHealthPanel
        report={{
          score: 50,
          status: 'needs-attention',
          cards: [
            { id: 'missing-links', label: '缺失链接', value: 1, detail: '1 处引用需要处理', severity: 'warning' },
            { id: 'orphan-docs', label: '孤立文档', value: 2, detail: '共 4 个已索引文档', severity: 'info' },
            { id: 'document-issues', label: '当前文档问题', value: 3, detail: '1 个错误', severity: 'error' },
            { id: 'image-warnings', label: '图片问题', value: 2, detail: '1 个未解析本地图片', severity: 'warning' },
          ],
        }}
        onOpenDetail={onOpenDetail}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('需要关注')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '查看缺失链接' }))
    expect(onOpenDetail).toHaveBeenCalledWith('missing-links')

    await user.click(screen.getByRole('button', { name: '查看孤立文档' }))
    expect(onOpenDetail).toHaveBeenCalledWith('orphan-docs')
  })
})
