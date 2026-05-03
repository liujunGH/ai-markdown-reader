import type { DocumentHealthIssue, HealthSeverity } from './documentHealth'
import { getImageRepairSuggestion, type MarkdownImageItem } from './imageInventory'
import { formatIndexSkippedItem, type IndexSkippedItem } from './searchIndex'
import type { MissingWikiLink } from './wikiGraph'

export type MaintenanceTaskKind = 'missing-link' | 'image-issue' | 'index-skip' | 'document-issue'
export type MaintenanceTaskSeverity = HealthSeverity

export interface MaintenanceTask {
  id: string
  kind: MaintenanceTaskKind
  title: string
  detail: string
  sourcePath?: string
  line?: number
  actionLabel: string
  severity: MaintenanceTaskSeverity
}

export interface MaintenanceTaskInput {
  missingLinks: MissingWikiLink[]
  images: MarkdownImageItem[]
  indexSkippedItems: IndexSkippedItem[]
  documentIssues: DocumentHealthIssue[]
}

const SEVERITY_ORDER: Record<MaintenanceTaskSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
}

export function buildMaintenanceTasks(input: MaintenanceTaskInput): MaintenanceTask[] {
  return [
    ...input.documentIssues.map(buildDocumentIssueTask),
    ...input.missingLinks.map(buildMissingLinkTask),
    ...input.images.flatMap(buildImageIssueTask),
    ...input.indexSkippedItems.map(buildIndexSkipTask),
  ].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.title.localeCompare(b.title))
}

export function formatMaintenanceTasksMarkdown(tasks: MaintenanceTask[]): string {
  const rows = tasks.map(task => {
    const line = task.line ? ` · 第 ${task.line} 行` : ''
    const path = task.sourcePath ? ` · ${task.sourcePath}` : ''
    return `- [ ] ${task.severity} · ${task.title}${line}${path}\n  - ${task.detail}`
  })

  return [
    '# 待处理维护清单',
    '',
    `共 ${tasks.length} 项`,
    '',
    ...rows,
    '',
  ].join('\n')
}

function buildDocumentIssueTask(issue: DocumentHealthIssue): MaintenanceTask {
  return {
    id: `document-issue:${issue.id || `${issue.type}:${issue.line}`}`,
    kind: 'document-issue',
    title: `文档问题：${issue.message}`,
    detail: issue.target ? `${issue.type} · ${issue.target}` : issue.type,
    line: issue.line,
    actionLabel: '定位问题',
    severity: issue.severity,
  }
}

function buildMissingLinkTask(link: MissingWikiLink): MaintenanceTask {
  const firstReference = link.references[0]
  return {
    id: `missing-link:${link.normalizedTarget}`,
    kind: 'missing-link',
    title: `缺失链接：${link.target}`,
    detail: `${link.sourceCount} 个文件中的 ${link.references.length} 处引用需要处理`,
    sourcePath: firstReference?.sourcePath,
    line: firstReference?.line,
    actionLabel: '打开缺失链接',
    severity: 'warning',
  }
}

function buildImageIssueTask(image: MarkdownImageItem): MaintenanceTask[] {
  const suggestion = getImageRepairSuggestion(image)
  if (image.warnings.length === 0 && suggestion === '图片引用看起来正常。') return []

  const label = image.alt || image.src || `第 ${image.line} 行图片`
  return [{
    id: `image-issue:${image.line}:${image.src || 'empty-src'}`,
    kind: 'image-issue',
    title: `图片问题：${label}`,
    detail: suggestion,
    sourcePath: image.resolvedPath,
    line: image.line,
    actionLabel: '打开图片检查',
    severity: image.type === 'unknown' || !image.src ? 'warning' : 'info',
  }]
}

function buildIndexSkipTask(item: IndexSkippedItem): MaintenanceTask {
  return {
    id: `index-skip:${item.reason}:${item.path}`,
    kind: 'index-skip',
    title: `索引跳过：${formatIndexSkippedItem(item)}`,
    detail: item.path,
    sourcePath: item.path,
    actionLabel: '打开索引诊断',
    severity: item.reason === 'read-error' ? 'warning' : 'info',
  }
}
