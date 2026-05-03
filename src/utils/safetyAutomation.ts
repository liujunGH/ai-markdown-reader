import type { IndexedMarkdownFile } from './wikiGraph'
import { basename, join } from './path'

export interface OperationChange {
  path: string
  before: string
  after: string
}

export interface OperationPreview {
  id: string
  title: string
  changes: OperationChange[]
  summary: {
    files: number
    additions: number
    removals: number
  }
}

export interface OperationSnapshot {
  id: string
  title: string
  createdAt: number
  files: Array<{ path: string; content: string }>
}

export interface ImageAssetAudit {
  summary: {
    totalAssets: number
    used: number
    unused: number
    duplicateGroups: number
    remote: number
  }
  unused: string[]
  duplicateGroups: string[][]
}

export interface WorkspaceTemplateDefinition {
  name: string
  fileName: string
  body: string
}

export interface WorkspaceTemplateContext {
  title: string
  date: string
  folderName: string
  selection?: string
}

export interface RenderedWorkspaceTemplate {
  fileName: string
  body: string
}

export interface BatchMovePlan {
  targetDir: string
  operations: Array<{ from: string; to: string }>
  affectedLinks: number
}

export interface StaticSiteExportPlan {
  outputDir: string
  pages: Array<{ sourcePath: string; outputPath: string; title: string }>
}

export interface WorkspaceHomeCard {
  id: 'recent' | 'health' | 'tasks' | 'modified' | 'mentions'
  label: string
  value: string
  detail: string
}

export interface ReleaseAutomationPlan {
  version: string
  notesFile: string
  commands: string[]
}

export function buildOperationPreview(input: { id: string; title: string; changes: OperationChange[] }): OperationPreview {
  return {
    ...input,
    summary: {
      files: new Set(input.changes.map(change => change.path)).size,
      additions: input.changes.filter(change => change.after !== change.before).length,
      removals: input.changes.filter(change => change.before !== change.after).length,
    },
  }
}

export function formatOperationPreviewMarkdown(preview: OperationPreview): string {
  const sections = preview.changes.map(change => [
    `### ${change.path}`,
    '',
    '```diff',
    ...diffLines(change.before, change.after),
    '```',
  ].join('\n'))

  return [
    `## ${preview.title}`,
    '',
    `- 影响文件：${preview.summary.files}`,
    `- 新增变更：${preview.summary.additions}`,
    `- 移除变更：${preview.summary.removals}`,
    '',
    ...sections,
    '',
  ].join('\n')
}

export function createOperationSnapshot(preview: OperationPreview, createdAt = Date.now()): OperationSnapshot {
  return {
    id: preview.id,
    title: preview.title,
    createdAt,
    files: preview.changes.map(change => ({ path: change.path, content: change.before })),
  }
}

export function buildImageAssetAudit(input: {
  files: IndexedMarkdownFile[]
  imageFiles: string[]
  duplicateGroups: string[][]
  remoteImageCount: number
}): ImageAssetAudit {
  const referenced = new Set<string>()
  for (const file of input.files) {
    for (const imagePath of input.imageFiles) {
      if (file.content.includes(`./assets/${basename(imagePath)}`) || file.content.includes(`assets/${basename(imagePath)}`)) {
        referenced.add(imagePath)
      }
    }
  }
  const unused = input.imageFiles.filter(file => !referenced.has(file))
  return {
    summary: {
      totalAssets: input.imageFiles.length,
      used: referenced.size,
      unused: unused.length,
      duplicateGroups: input.duplicateGroups.length,
      remote: input.remoteImageCount,
    },
    unused,
    duplicateGroups: input.duplicateGroups,
  }
}

export function createWorkspaceTemplate(definition: WorkspaceTemplateDefinition, context: WorkspaceTemplateContext): RenderedWorkspaceTemplate {
  return {
    fileName: renderTemplate(definition.fileName, context).replace(/[\\/:*?"<>|]/g, '-'),
    body: renderTemplate(definition.body, context),
  }
}

export function buildBatchMovePlan(files: IndexedMarkdownFile[], targetDir: string): BatchMovePlan {
  const operations = files.map(file => ({ from: file.path, to: join(targetDir, basename(file.path)) }))
  const affectedLinks = files.reduce((sum, file) => sum + countLinks(file.content), 0)
  return { targetDir, operations, affectedLinks }
}

export function buildStaticSiteExportPlan(files: IndexedMarkdownFile[], outputDir: string): StaticSiteExportPlan {
  return {
    outputDir,
    pages: files.map(file => ({
      sourcePath: file.path,
      outputPath: join(outputDir, `${basename(file.path).replace(/\.(md|markdown)$/i, '')}.html`),
      title: basename(file.path).replace(/\.(md|markdown)$/i, ''),
    })),
  }
}

export function buildWorkspaceHome(input: {
  recentFileName: string
  healthScore: number
  taskCount: number
  modifiedCount: number
  unlinkedMentionCount: number
}): { cards: WorkspaceHomeCard[] } {
  return {
    cards: [
      { id: 'recent', label: '最近阅读', value: input.recentFileName || '暂无', detail: '继续上次阅读位置' },
      { id: 'health', label: '健康分数', value: String(input.healthScore), detail: '来自知识库健康报告' },
      { id: 'tasks', label: '待处理', value: String(input.taskCount), detail: '维护队列任务' },
      { id: 'modified', label: '最近修改', value: String(input.modifiedCount), detail: '当前索引中的文档' },
      { id: 'mentions', label: '未链接提及', value: String(input.unlinkedMentionCount), detail: '可补充双链' },
    ],
  }
}

export function buildReleaseAutomationPlan(version: string, notesFile: string): ReleaseAutomationPlan {
  const tag = version.startsWith('v') ? version : `v${version}`
  return {
    version,
    notesFile,
    commands: [
      'npm run lint',
      'npm test',
      'npm run build',
      'npm run e2e',
      'npm run electron:build:mac',
      `git tag -a ${tag} -m "${tag}"`,
      `git push origin main && git push origin ${tag}`,
      `gh release create ${tag} --notes-file ${notesFile}`,
    ],
  }
}

function diffLines(before: string, after: string): string[] {
  if (before === after) return [` ${before}`]
  return [
    ...before.split('\n').filter(Boolean).map(line => `-${line}`),
    ...after.split('\n').filter(Boolean).map(line => `+${line}`),
  ]
}

function renderTemplate(value: string, context: WorkspaceTemplateContext): string {
  return value
    .split('{{title}}').join(context.title)
    .split('{{date}}').join(context.date)
    .split('{{folderName}}').join(context.folderName)
    .split('{{selection}}').join(context.selection || '')
}

function countLinks(content: string): number {
  return (content.match(/\[\[[^\]]+\]\]/g) || []).length + (content.match(/(?<!!)\[[^\]]+\]\([^)]+\)/g) || []).length
}
