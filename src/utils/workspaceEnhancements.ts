import type { MarkdownImageItem } from './imageInventory'
import type { KnowledgeHealthReport } from './knowledgeHealth'
import type { MaintenanceTask } from './maintenanceTasks'
import type { ReleasePreflightStatus } from './releasePreflight'
import type { ReadingHistoryItem } from './readingHistory'
import type { IndexedMarkdownFile } from './wikiGraph'
import { basename } from './path'

export type ExecutableFixAction =
  | 'create-missing-doc'
  | 'localize-remote-image'
  | 'open-document-issue'
  | 'open-index-settings'

export interface ExecutableFixSuggestion {
  id: string
  title: string
  detail: string
  action: ExecutableFixAction
  taskId: string
}

export interface ImageAssetAction {
  kind: 'download-remote' | 'verify-local'
  label: string
  detail: string
  count: number
}

export interface ImageAssetPlan {
  summary: {
    total: number
    remote: number
    portable: number
    unresolved: number
  }
  actions: ImageAssetAction[]
}

export interface LinkRenamePreview {
  oldLabel: string
  newLabel: string
  oldMarkdownTarget: string
  newMarkdownTarget: string
  changedFiles: Array<{ path: string; name: string; replacements: number }>
}

export interface ReadingAssistantInput {
  activeFilePath: string | null
  activeFileName: string
  readingHistory: ReadingHistoryItem[]
  readLaterCount: number
}

export interface ReadingAssistantCard {
  id: 'current-progress' | 'continue-reading' | 'read-later'
  title: string
  value: string
  detail: string
}

export interface ReadingAssistant {
  cards: ReadingAssistantCard[]
}

export interface ReleasePackageCheck {
  id: 'preflight' | 'version' | 'build-output' | 'package-history'
  label: string
  status: ReleasePreflightStatus
  detail: string
}

export interface DashboardSection {
  id: 'quality' | 'fixes' | 'links' | 'images' | 'reading' | 'release'
  title: string
  actionLabel: string
  items: Array<{ label: string; value: string; detail: string; status?: ReleasePreflightStatus }>
}

export interface WorkspaceDashboard {
  sections: DashboardSection[]
}

export function buildExecutableFixSuggestions(tasks: MaintenanceTask[]): ExecutableFixSuggestion[] {
  return tasks.flatMap((task): ExecutableFixSuggestion[] => {
    if (task.kind === 'missing-link') {
      return [{
        id: `create-missing-doc:${task.id.replace(/^missing-link:/, '')}`,
        title: '创建缺失文档',
        detail: task.title,
        action: 'create-missing-doc' as const,
        taskId: task.id,
      }]
    }
    if (task.kind === 'image-issue' && /网络图片|http/i.test(task.detail + task.title)) {
      return [{
        id: `localize-image:${task.id}`,
        title: '本地化网络图片',
        detail: task.detail,
        action: 'localize-remote-image' as const,
        taskId: task.id,
      }]
    }
    if (task.kind === 'document-issue') {
      return [{
        id: `edit-document-issue:${task.id}`,
        title: '处理文档问题',
        detail: task.title,
        action: 'open-document-issue' as const,
        taskId: task.id,
      }]
    }
    if (task.kind === 'index-skip') {
      return [{
        id: `open-index-settings:${task.id}`,
        title: '调整索引设置',
        detail: task.detail,
        action: 'open-index-settings' as const,
        taskId: task.id,
      }]
    }
    return []
  })
}

export function buildImageAssetPlan(images: MarkdownImageItem[]): ImageAssetPlan {
  const remote = images.filter(image => image.type === 'remote').length
  const portable = images.filter(image => image.type === 'local-relative' && Boolean(image.resolvedPath)).length
  const unresolved = images.filter(image => image.type === 'local-relative' && !image.resolvedPath).length
  const actions: ImageAssetAction[] = []

  if (remote > 0) {
    actions.push({
      kind: 'download-remote',
      label: '批量本地化网络图片',
      detail: `${remote} 张网络图片可下载到 assets 目录`,
      count: remote,
    })
  }
  if (unresolved > 0) {
    actions.push({
      kind: 'verify-local',
      label: '核对本地图片路径',
      detail: `${unresolved} 张本地图片未解析到文件`,
      count: unresolved,
    })
  }

  return {
    summary: { total: images.length, remote, portable, unresolved },
    actions,
  }
}

export function buildLinkRenamePreview(
  files: IndexedMarkdownFile[],
  oldPath: string,
  newPath: string,
): LinkRenamePreview {
  const oldLabel = labelForMarkdownPath(oldPath)
  const newLabel = labelForMarkdownPath(newPath)
  const oldMarkdownTarget = encodeMarkdownTarget(`${oldLabel}.md`)
  const newMarkdownTarget = encodeMarkdownTarget(`${newLabel}.md`)
  const preview: LinkRenamePreview = {
    oldLabel,
    newLabel,
    oldMarkdownTarget,
    newMarkdownTarget,
    changedFiles: [],
  }

  for (const file of files) {
    const replacements = countOccurrences(file.content, `[[${oldLabel}]]`) + countOccurrences(file.content, `](${oldMarkdownTarget})`)
    if (replacements > 0) {
      preview.changedFiles.push({ path: file.path, name: file.name, replacements })
    }
  }

  return preview
}

export function applyLinkRenameToContent(content: string, preview: LinkRenamePreview): string {
  return content
    .split(`[[${preview.oldLabel}]]`).join(`[[${preview.newLabel}]]`)
    .split(`](${preview.oldMarkdownTarget})`).join(`](${preview.newMarkdownTarget})`)
}

export function buildReadingAssistant(input: ReadingAssistantInput): ReadingAssistant {
  const latestOther = input.readingHistory.find(item => item.filePath !== input.activeFilePath)
  return {
    cards: [
      {
        id: 'current-progress',
        title: '当前阅读',
        value: input.activeFilePath ? '当前文档' : '未打开文档',
        detail: input.activeFileName || '打开文档后可记录阅读进度',
      },
      {
        id: 'continue-reading',
        title: '继续阅读',
        value: latestOther?.name || '暂无记录',
        detail: latestOther ? `上次读到约 ${Math.round(latestOther.progress * 100)}%` : '阅读历史为空',
      },
      {
        id: 'read-later',
        title: '稍后读',
        value: String(input.readLaterCount),
        detail: input.readLaterCount > 0 ? '已加入稍后读列表' : '当前没有稍后读文档',
      },
    ],
  }
}

export function buildReleasePackageChecks(input: {
  preflightStatus: ReleasePreflightStatus
  version: string
  hasBuildOutput: boolean
  packageHistoryCount: number
}): ReleasePackageCheck[] {
  return [
    {
      id: 'preflight',
      label: '发布前检查',
      status: input.preflightStatus,
      detail: input.preflightStatus === 'pass' ? '没有阻塞项' : '需要先复查待处理项',
    },
    {
      id: 'version',
      label: '版本号',
      status: input.version ? 'pass' : 'warning',
      detail: input.version ? `当前版本 ${input.version}` : '未读取到版本号',
    },
    {
      id: 'build-output',
      label: '构建产物',
      status: input.hasBuildOutput ? 'pass' : 'warning',
      detail: input.hasBuildOutput ? '已存在 dist 构建产物' : '打包前需要重新构建',
    },
    {
      id: 'package-history',
      label: '打包记录',
      status: input.packageHistoryCount > 0 ? 'pass' : 'warning',
      detail: `已记录 ${input.packageHistoryCount} 次本地打包`,
    },
  ]
}

export function buildWorkspaceDashboard(input: {
  healthScore: KnowledgeHealthReport['score']
  maintenanceTasks: MaintenanceTask[]
  imagePlan: ImageAssetPlan
  readingAssistant: ReadingAssistant
  releaseChecks: ReleasePackageCheck[]
  linkRenamePreview: LinkRenamePreview
}): WorkspaceDashboard {
  const fixes = buildExecutableFixSuggestions(input.maintenanceTasks)
  return {
    sections: [
      {
        id: 'quality',
        title: '工作区质量',
        actionLabel: '打开健康报告',
        items: [
          { label: '健康分数', value: String(input.healthScore), detail: `${input.maintenanceTasks.length} 项待处理` },
          { label: '阻塞问题', value: String(input.maintenanceTasks.filter(task => task.severity === 'error').length), detail: '错误级任务优先处理' },
        ],
      },
      {
        id: 'fixes',
        title: '可执行修复',
        actionLabel: '打开待处理队列',
        items: [
          { label: '可执行建议', value: String(fixes.length), detail: fixes[0]?.title || '暂无可执行建议' },
        ],
      },
      {
        id: 'links',
        title: '链接重命名安全',
        actionLabel: '打开文档图谱',
        items: [
          { label: '受影响文件', value: String(input.linkRenamePreview.changedFiles.length), detail: `${input.linkRenamePreview.oldLabel} → ${input.linkRenamePreview.newLabel}` },
        ],
      },
      {
        id: 'images',
        title: '图片资产',
        actionLabel: '打开图片检查',
        items: [
          { label: '网络图片', value: String(input.imagePlan.summary.remote), detail: '可本地化到 assets 目录' },
          { label: '未解析图片', value: String(input.imagePlan.summary.unresolved), detail: '需要核对路径' },
        ],
      },
      {
        id: 'reading',
        title: '阅读助手',
        actionLabel: '打开阅读时间线',
        items: input.readingAssistant.cards.map(card => ({ label: card.title, value: card.value, detail: card.detail })),
      },
      {
        id: 'release',
        title: '发布辅助',
        actionLabel: '打开发布前检查',
        items: input.releaseChecks.map(check => ({ label: check.label, value: check.status, detail: check.detail, status: check.status })),
      },
    ],
  }
}

function labelForMarkdownPath(filePath: string): string {
  return basename(filePath).replace(/\.(md|markdown)$/i, '')
}

function encodeMarkdownTarget(target: string): string {
  return encodeURIComponent(target).replace(/%2F/g, '/')
}

function countOccurrences(content: string, needle: string): number {
  if (!needle) return 0
  return content.split(needle).length - 1
}
