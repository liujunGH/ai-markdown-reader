import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { IndexDiagnosticsPanel } from '../../components/IndexDiagnosticsPanel'
import type { IndexSettings } from '../../utils/indexSettings'

describe('IndexDiagnosticsPanel', () => {
  it('summarizes skipped index items by reason and exposes reindexing', async () => {
    const user = userEvent.setup()
    const onReindex = vi.fn()
    const onClear = vi.fn()
    const writeText = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    window.electronAPI = {
      showInFolder: vi.fn(async () => {}),
    } as unknown as Window['electronAPI']

    render(
      <IndexDiagnosticsPanel
        folderPath="/docs"
        skippedItems={[
          { path: '/docs/node_modules', name: 'node_modules', reason: 'ignored-directory' },
          { path: '/docs/large.md', name: 'large.md', reason: 'large-file', size: 2048, maxSize: 1024 },
          { path: '/docs/private.md', name: 'private.md', reason: 'read-error', detail: '权限不足' },
        ]}
        isIndexing={false}
        policy={{
          maxFileSizeBytes: 50 * 1024 * 1024,
          skipDirectoryNames: ['.git', 'node_modules', 'dist'],
        }}
        settings={{
          maxFileSizeMb: 50,
          extraSkipDirectoryNames: [],
        }}
        updatedAt={1710000000000}
        onReindex={onReindex}
        onClear={onClear}
        onSaveSettings={vi.fn()}
        onResetSettings={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByRole('region', { name: '索引诊断' })).toBeInTheDocument()
    expect(screen.getByText('跳过项')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('索引规则')).toBeInTheDocument()
    expect(screen.getByText('最大文件：50 MB')).toBeInTheDocument()
    expect(screen.getByText('.git、node_modules、dist')).toBeInTheDocument()
    expect(screen.getByText(`上次诊断：${new Date(1710000000000).toLocaleString('zh-CN')}`)).toBeInTheDocument()
    expect(screen.getAllByText('忽略目录').length).toBeGreaterThan(0)
    expect(screen.getAllByText('文件过大').length).toBeGreaterThan(0)
    expect(screen.getAllByText('读取失败').length).toBeGreaterThan(0)
    expect(screen.getByText('large.md：文件过大（2 KB > 1 KB）')).toBeInTheDocument()
    expect(screen.getByText('/docs/private.md')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '重新扫描索引' }))

    expect(onReindex).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '只看文件过大' }))
    expect(screen.getByText('large.md：文件过大（2 KB > 1 KB）')).toBeInTheDocument()
    expect(screen.queryByText('private.md：读取失败（权限不足）')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '复制路径 large.md' }))
    expect(writeText).toHaveBeenCalledWith('/docs/large.md')

    await user.click(screen.getByRole('button', { name: '在 Finder 中显示 large.md' }))
    expect(window.electronAPI!.showInFolder).toHaveBeenCalledWith('/docs/large.md')

    await user.click(screen.getByRole('button', { name: '清空诊断' }))
    expect(onClear).toHaveBeenCalled()
  })

  it('shows a recoverable empty state when there are no skipped items', () => {
    render(
      <IndexDiagnosticsPanel
        folderPath="/docs"
        skippedItems={[]}
        isIndexing={false}
        policy={{
          maxFileSizeBytes: 50 * 1024 * 1024,
          skipDirectoryNames: ['.git', 'node_modules'],
        }}
        settings={{
          maxFileSizeMb: 50,
          extraSkipDirectoryNames: [],
        }}
        updatedAt={null}
        onReindex={vi.fn()}
        onClear={vi.fn()}
        onSaveSettings={vi.fn()}
        onResetSettings={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('没有跳过项')).toBeInTheDocument()
    expect(screen.getByText('最近一次索引没有发现被忽略、过大或读取失败的项目。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '清空诊断' })).toBeDisabled()
  })

  it('edits and resets index settings', async () => {
    const user = userEvent.setup()
    const onSaveSettings = vi.fn()
    const onResetSettings = vi.fn()

    render(
      <IndexDiagnosticsPanel
        folderPath="/docs"
        skippedItems={[]}
        isIndexing={false}
        policy={{
          maxFileSizeBytes: 75 * 1024 * 1024,
          skipDirectoryNames: ['.git', 'node_modules', 'drafts'],
        }}
        settings={{
          maxFileSizeMb: 75,
          extraSkipDirectoryNames: ['drafts'],
        }}
        updatedAt={null}
        onReindex={vi.fn()}
        onClear={vi.fn()}
        onSaveSettings={onSaveSettings}
        onResetSettings={onResetSettings}
        onClose={vi.fn()}
      />
    )

    const maxSizeInput = screen.getByLabelText('最大索引文件大小 MB')
    await user.clear(maxSizeInput)
    await user.type(maxSizeInput, '80')
    await user.clear(screen.getByLabelText('额外忽略目录'))
    await user.type(screen.getByLabelText('额外忽略目录'), 'drafts\nexports')
    await user.click(screen.getByRole('button', { name: '保存索引设置' }))

    expect(onSaveSettings).toHaveBeenCalledWith({
      maxFileSizeMb: 80,
      extraSkipDirectoryNames: ['drafts', 'exports'],
    })

    await user.click(screen.getByRole('button', { name: '恢复默认索引设置' }))
    expect(onResetSettings).toHaveBeenCalled()
  })

  it('syncs setting drafts when saved settings change outside the panel', () => {
    const baseProps = {
      folderPath: '/docs',
      skippedItems: [],
      isIndexing: false,
      policy: {
        maxFileSizeBytes: 75 * 1024 * 1024,
        skipDirectoryNames: ['.git', 'node_modules', 'drafts'],
      },
      updatedAt: null,
      onReindex: vi.fn(),
      onClear: vi.fn(),
      onSaveSettings: vi.fn(),
      onResetSettings: vi.fn(),
      onClose: vi.fn(),
    }
    const initialSettings: IndexSettings = {
      maxFileSizeMb: 75,
      extraSkipDirectoryNames: ['drafts'],
    }
    const { rerender } = render(
      <IndexDiagnosticsPanel
        {...baseProps}
        settings={initialSettings}
      />
    )

    rerender(
      <IndexDiagnosticsPanel
        {...baseProps}
        policy={{
          maxFileSizeBytes: 50 * 1024 * 1024,
          skipDirectoryNames: ['.git', 'node_modules'],
        }}
        settings={{
          maxFileSizeMb: 50,
          extraSkipDirectoryNames: [],
        }}
      />
    )

    expect(screen.getByLabelText('最大索引文件大小 MB')).toHaveValue(50)
    expect(screen.getByLabelText('额外忽略目录')).toHaveValue('')
  })
})
