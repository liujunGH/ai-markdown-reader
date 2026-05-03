import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ActionWorkbenchPanel } from '../../components/ActionWorkbenchPanel'
import type { DocumentTemplate, ImageLocalizationPlan, RenamePlan, UnlinkedMention } from '../../utils/workspaceActions'
import type { ExecutableFixSuggestion } from '../../utils/workspaceEnhancements'

const fixes: ExecutableFixSuggestion[] = [
  { id: 'create-missing-doc:roadmap', title: '创建缺失文档', detail: '缺失链接：Roadmap', action: 'create-missing-doc', taskId: 'missing-link:roadmap' },
]

const templates: DocumentTemplate[] = [
  { id: 'blank-note', name: '空白笔记', fileName: '{{title}}.md', body: '# {{title}}\n\n' },
]

const renamePlan: RenamePlan = {
  oldLabel: 'Old',
  newLabel: 'New',
  oldMarkdownTarget: 'Old.md',
  newMarkdownTarget: 'New.md',
  changedFiles: [{ path: '/docs/a.md', name: 'a.md', replacements: 2 }],
}

const imagePlan: ImageLocalizationPlan = {
  sourceFilePath: '/docs/a.md',
  assetsDir: '/docs/assets',
  items: [{ src: 'https://example.com/a.png', alt: 'a', line: 3, fileName: 'a.png', assetPath: '/docs/assets/a.png', localMarkdownSrc: './assets/a.png' }],
}

const mentions: UnlinkedMention[] = [
  { targetPath: '/docs/Topic.md', label: 'Topic', count: 2 },
]

describe('ActionWorkbenchPanel', () => {
  it('renders six action sections and calls handlers', async () => {
    const user = userEvent.setup()
    const onExecuteFix = vi.fn()
    const onApplyRename = vi.fn()
    const onLocalizeImages = vi.fn()
    const onCreateFromTemplate = vi.fn()
    const onOpenMention = vi.fn()
    const onCopyArchive = vi.fn()

    render(
      <ActionWorkbenchPanel
        fixes={fixes}
        templates={templates}
        renamePlan={renamePlan}
        imagePlan={imagePlan}
        unlinkedMentions={mentions}
        archiveReport="# 工作区归档报告"
        onExecuteFix={onExecuteFix}
        onApplyRename={onApplyRename}
        onLocalizeImages={onLocalizeImages}
        onCreateFromTemplate={onCreateFromTemplate}
        onOpenMention={onOpenMention}
        onCopyArchive={onCopyArchive}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('增强操作台')).toBeInTheDocument()
    expect(screen.getByText('一键修复')).toBeInTheDocument()
    expect(screen.getByText('重命名安全更新')).toBeInTheDocument()
    expect(screen.getByText('图片资产本地化')).toBeInTheDocument()
    expect(screen.getByText('文档模板')).toBeInTheDocument()
    expect(screen.getByText('双链提示')).toBeInTheDocument()
    expect(screen.getByText('发布归档')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '执行：创建缺失文档' }))
    expect(onExecuteFix).toHaveBeenCalledWith(fixes[0])

    await user.click(screen.getByRole('button', { name: '应用重命名更新' }))
    expect(onApplyRename).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '本地化 1 张图片' }))
    expect(onLocalizeImages).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '用空白笔记新建' }))
    expect(onCreateFromTemplate).toHaveBeenCalledWith(templates[0])

    await user.click(screen.getByRole('button', { name: '打开 Topic' }))
    expect(onOpenMention).toHaveBeenCalledWith(mentions[0])

    await user.click(screen.getByRole('button', { name: '复制归档报告' }))
    expect(onCopyArchive).toHaveBeenCalled()
  })
})
