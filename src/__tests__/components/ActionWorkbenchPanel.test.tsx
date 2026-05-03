import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ActionWorkbenchPanel } from '../../components/ActionWorkbenchPanel'
import type { DocumentTemplate, ImageLocalizationPlan, RenamePlan, UnlinkedMention } from '../../utils/workspaceActions'
import type { ExecutableFixSuggestion } from '../../utils/workspaceEnhancements'
import type { BatchMovePlan, ImageAssetAudit, OperationPreview, ReleaseAutomationPlan, StaticSiteExportPlan, WorkspaceHomeCard } from '../../utils/safetyAutomation'

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

const operationPreview: OperationPreview = {
  id: 'rename',
  title: '重命名预览',
  changes: [{ path: '/docs/a.md', before: 'old', after: 'new' }],
  summary: { files: 1, additions: 1, removals: 1 },
}

const imageAudit: ImageAssetAudit = {
  summary: { totalAssets: 3, used: 1, unused: 2, duplicateGroups: 1, remote: 1 },
  unused: ['/docs/assets/unused.png'],
  duplicateGroups: [['/docs/assets/a.png', '/docs/assets/b.png']],
}

const batchMovePlan: BatchMovePlan = {
  targetDir: '/docs/archive',
  operations: [{ from: '/docs/a.md', to: '/docs/archive/a.md' }],
  affectedLinks: 2,
}

const workspaceHome: WorkspaceHomeCard[] = [
  { id: 'recent', label: '最近阅读', value: 'a.md', detail: '继续阅读' },
]

const staticSitePlan: StaticSiteExportPlan = {
  outputDir: '/docs/site',
  pages: [{ sourcePath: '/docs/a.md', outputPath: '/docs/site/a.html', title: 'a' }],
}

const releasePlan: ReleaseAutomationPlan = {
  version: '1.5.6',
  notesFile: 'docs/releases/v1.5.6.md',
  commands: ['npm run lint', 'gh release create v1.5.6 --notes-file docs/releases/v1.5.6.md'],
}

describe('ActionWorkbenchPanel', () => {
  it('renders six action sections and calls handlers', async () => {
    const user = userEvent.setup()
    const onExecuteFix = vi.fn()
    const onApplyRename = vi.fn()
    const onLocalizeImages = vi.fn()
    const onCreateFromTemplate = vi.fn()
    const onOpenMention = vi.fn()
    const onCopyArchive = vi.fn()
    const onCopyPreview = vi.fn()
    const onUndoLast = vi.fn()
    const onCopyBatchMove = vi.fn()
    const onCopyStaticSite = vi.fn()
    const onCopyReleaseCommands = vi.fn()

    render(
      <ActionWorkbenchPanel
        fixes={fixes}
        templates={templates}
        renamePlan={renamePlan}
        imagePlan={imagePlan}
        unlinkedMentions={mentions}
        archiveReport="# 工作区归档报告"
        operationPreview={operationPreview}
        imageAudit={imageAudit}
        batchMovePlan={batchMovePlan}
        workspaceHomeCards={workspaceHome}
        staticSitePlan={staticSitePlan}
        releasePlan={releasePlan}
        onExecuteFix={onExecuteFix}
        onApplyRename={onApplyRename}
        onLocalizeImages={onLocalizeImages}
        onCreateFromTemplate={onCreateFromTemplate}
        onOpenMention={onOpenMention}
        onCopyArchive={onCopyArchive}
        onCopyPreview={onCopyPreview}
        onUndoLast={onUndoLast}
        onCopyBatchMove={onCopyBatchMove}
        onCopyStaticSite={onCopyStaticSite}
        onCopyReleaseCommands={onCopyReleaseCommands}
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
    expect(screen.getByText('预览与撤销')).toBeInTheDocument()
    expect(screen.getByText('图片资产审计')).toBeInTheDocument()
    expect(screen.getByText('批量移动/重命名')).toBeInTheDocument()
    expect(screen.getByText('工作区首页')).toBeInTheDocument()
    expect(screen.getByText('静态站点导出')).toBeInTheDocument()
    expect(screen.getByText('Release 自动化')).toBeInTheDocument()

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

    await user.click(screen.getByRole('button', { name: '复制 diff 预览' }))
    expect(onCopyPreview).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '撤销最近操作' }))
    expect(onUndoLast).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '复制批量整理计划' }))
    expect(onCopyBatchMove).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '复制静态站点计划' }))
    expect(onCopyStaticSite).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '复制 Release 命令' }))
    expect(onCopyReleaseCommands).toHaveBeenCalled()
  })
})
