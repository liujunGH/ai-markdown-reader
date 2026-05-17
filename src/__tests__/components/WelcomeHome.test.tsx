import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { WelcomeHome } from '../../components/WelcomeHome'

describe('WelcomeHome', () => {
  it('shows workspace recovery signals and actions', async () => {
    const user = userEvent.setup()
    const onOpenFolder = vi.fn()
    const onOpenFile = vi.fn()
    const onOpenRecent = vi.fn()
    const onOpenReadingTimeline = vi.fn()
    const onShowGuide = vi.fn()
    const onReindex = vi.fn()

    render(
      <WelcomeHome
        recentFileCount={3}
        readingHistoryCount={2}
        indexedFileCount={12}
        isIndexing={false}
        currentFolderName="docs"
        currentFolderPath="/Users/me/docs"
        latestReadingName="guide.md"
        onOpenFile={onOpenFile}
        onOpenFolder={onOpenFolder}
        onOpenRecent={onOpenRecent}
        onOpenReadingTimeline={onOpenReadingTimeline}
        onShowGuide={onShowGuide}
        onReindex={onReindex}
      />
    )

    expect(screen.getByText('今天想读什么？')).toBeInTheDocument()
    expect(screen.getByText('guide.md')).toBeInTheDocument()
    expect(screen.getByText('docs')).toBeInTheDocument()
    expect(screen.getByText('/Users/me/docs')).toBeInTheDocument()
    expect(screen.getByText('最近文件 (3)')).toBeInTheDocument()
    expect(screen.getByText('2 条阅读记录')).toBeInTheDocument()
    expect(screen.getByText('已索引 12 个文件')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '从欢迎页打开 Markdown 文件' }))
    await user.click(screen.getByRole('button', { name: '从欢迎页选择资料夹' }))
    await user.click(screen.getByRole('button', { name: '最近文件 (3)' }))
    await user.click(screen.getByRole('button', { name: '从欢迎页继续阅读' }))
    await user.click(screen.getByRole('button', { name: '使用提示' }))
    await user.click(screen.getByRole('button', { name: '从欢迎页重建索引' }))

    expect(onOpenFile).toHaveBeenCalled()
    expect(onOpenFolder).toHaveBeenCalled()
    expect(onOpenRecent).toHaveBeenCalled()
    expect(onOpenReadingTimeline).toHaveBeenCalled()
    expect(onShowGuide).toHaveBeenCalled()
    expect(onReindex).toHaveBeenCalled()
  })

  it('handles the no-workspace state', () => {
    render(
      <WelcomeHome
        recentFileCount={0}
        readingHistoryCount={0}
        indexedFileCount={0}
        isIndexing={false}
        currentFolderName=""
        currentFolderPath={null}
        onOpenFile={vi.fn()}
        onOpenFolder={vi.fn()}
        onOpenRecent={vi.fn()}
        onOpenReadingTimeline={vi.fn()}
        onShowGuide={vi.fn()}
        onReindex={vi.fn()}
      />
    )

    expect(screen.getByText('未打开文件夹')).toBeInTheDocument()
    expect(screen.getByText('还没有阅读记录')).toBeInTheDocument()
    expect(screen.getByText('0 条阅读记录')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '从欢迎页重建索引' })).toBeDisabled()
  })

  it('shows indexing progress while indexing', () => {
    render(
      <WelcomeHome
        recentFileCount={0}
        readingHistoryCount={0}
        indexedFileCount={4}
        isIndexing
        indexProgress={{ discoveredFiles: 10, indexedFiles: 4, skippedFiles: 1 }}
        currentFolderName="docs"
        currentFolderPath="/Users/me/docs"
        onOpenFile={vi.fn()}
        onOpenFolder={vi.fn()}
        onOpenRecent={vi.fn()}
        onOpenReadingTimeline={vi.fn()}
        onShowGuide={vi.fn()}
        onReindex={vi.fn()}
      />
    )

    expect(screen.getByText('索引中：发现 10，已处理 4，跳过 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '从欢迎页重建索引' })).toBeDisabled()
  })
})
