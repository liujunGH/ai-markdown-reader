import type { MarkdownImageItem } from './imageInventory'
import type { IndexedMarkdownFile } from './wikiGraph'
import { basename, dirname, join } from './path'

export interface DocumentTemplate {
  id: 'blank-note' | 'daily-note' | 'meeting-note' | 'book-note' | 'project-doc'
  name: string
  fileName: string
  body: string
}

export interface TemplateContext {
  title: string
  date: string
  folderName: string
}

export interface RenamePlan {
  oldLabel: string
  newLabel: string
  oldMarkdownTarget: string
  newMarkdownTarget: string
  changedFiles: Array<{ path: string; name: string; replacements: number }>
}

export interface ImageLocalizationItem {
  src: string
  alt: string
  line: number
  fileName: string
  assetPath: string
  localMarkdownSrc: string
}

export interface ImageLocalizationPlan {
  sourceFilePath: string
  assetsDir: string
  items: ImageLocalizationItem[]
}

export interface UnlinkedMention {
  targetPath: string
  label: string
  count: number
}

export function buildDocumentTemplates(): DocumentTemplate[] {
  return [
    {
      id: 'blank-note',
      name: '空白笔记',
      fileName: '{{title}}.md',
      body: '# {{title}}\n\n',
    },
    {
      id: 'daily-note',
      name: '日报',
      fileName: '{{date}}-日报.md',
      body: '# {{title}}\n\n日期：{{date}}\n\n## 今日重点\n\n- \n\n## 记录\n\n',
    },
    {
      id: 'meeting-note',
      name: '会议记录',
      fileName: '{{title}}-会议记录.md',
      body: '# {{title}}\n\n日期：{{date}}\n\n## 参会人\n\n- \n\n## 结论\n\n- \n\n## 待办\n\n- [ ] \n',
    },
    {
      id: 'book-note',
      name: '读书笔记',
      fileName: '{{title}}-读书笔记.md',
      body: '# {{title}}\n\n## 核心观点\n\n## 摘录\n\n## 我的想法\n\n',
    },
    {
      id: 'project-doc',
      name: '项目文档',
      fileName: '{{title}}.md',
      body: '# {{title}}\n\n## 背景\n\n## 目标\n\n## 方案\n\n## 进度\n\n',
    },
  ]
}

export function renderDocumentTemplate(template: DocumentTemplate, context: TemplateContext): string {
  return replaceTemplateVars(template.body, context)
}

export function renderTemplateFileName(template: DocumentTemplate, context: TemplateContext): string {
  return sanitizeFileName(replaceTemplateVars(template.fileName, context))
}

export function buildRenamePlan(files: IndexedMarkdownFile[], oldPath: string, newPath: string): RenamePlan {
  const oldLabel = markdownLabel(oldPath)
  const newLabel = markdownLabel(newPath)
  const oldMarkdownTarget = encodeMarkdownTarget(`${oldLabel}.md`)
  const newMarkdownTarget = encodeMarkdownTarget(`${newLabel}.md`)
  const plan: RenamePlan = {
    oldLabel,
    newLabel,
    oldMarkdownTarget,
    newMarkdownTarget,
    changedFiles: [],
  }

  for (const file of files) {
    const replacements =
      countOccurrences(file.content, `[[${oldLabel}]]`) +
      countOccurrences(file.content, `](${oldMarkdownTarget})`)
    if (replacements > 0) {
      plan.changedFiles.push({ path: file.path, name: file.name, replacements })
    }
  }

  return plan
}

export function applyRenamePlanToContent(content: string, plan: RenamePlan): string {
  return content
    .split(`[[${plan.oldLabel}]]`).join(`[[${plan.newLabel}]]`)
    .split(`](${plan.oldMarkdownTarget})`).join(`](${plan.newMarkdownTarget})`)
}

export function buildImageLocalizationPlan(filePath: string, images: MarkdownImageItem[]): ImageLocalizationPlan {
  const dir = dirname(filePath)
  const assetsDir = join(dir, 'assets')
  const usedNames = new Set<string>()
  const items = images
    .filter(image => image.type === 'remote' && /^https?:\/\//i.test(image.src))
    .map(image => {
      const fileName = uniqueAssetName(fileNameForRemoteImage(image.src, image.alt), usedNames)
      return {
        src: image.src,
        alt: image.alt,
        line: image.line,
        fileName,
        assetPath: join(assetsDir, fileName),
        localMarkdownSrc: `./assets/${fileName}`,
      }
    })

  return { sourceFilePath: filePath, assetsDir, items }
}

export function applyImageLocalizationReplacements(content: string, plan: ImageLocalizationPlan): string {
  return plan.items.reduce((next, item) => next.split(item.src).join(item.localMarkdownSrc), content)
}

export function findUnlinkedMentions(files: IndexedMarkdownFile[], currentFile: IndexedMarkdownFile): UnlinkedMention[] {
  return files
    .filter(file => file.path !== currentFile.path)
    .map(file => {
      const label = markdownLabel(file.path)
      if (!label || currentFile.content.includes(`[[${label}]]`) || currentFile.content.includes(`](${encodeMarkdownTarget(`${label}.md`)})`)) {
        return null
      }
      const count = countPhrase(currentFile.content, label)
      return count > 0 ? { targetPath: file.path, label, count } : null
    })
    .filter((item): item is UnlinkedMention => Boolean(item))
}

export function buildArchiveReport(input: {
  files: IndexedMarkdownFile[]
  healthScore: number
  maintenanceTaskCount: number
  remoteImageCount: number
  missingLinkCount: number
}): string {
  const rows = input.files.map(file => `| ${file.name} | ${file.content.split('\n').length} | ${file.path} |`)
  return [
    '# 工作区归档报告',
    '',
    `- 文档数量：${input.files.length}`,
    `- 健康分数：${input.healthScore}`,
    `- 待处理任务：${input.maintenanceTaskCount}`,
    `- 缺失链接：${input.missingLinkCount}`,
    `- 网络图片：${input.remoteImageCount}`,
    '',
    '| 文档 | 行数 | 路径 |',
    '|---|---:|---|',
    ...rows,
    '',
  ].join('\n')
}

function replaceTemplateVars(value: string, context: TemplateContext): string {
  return value
    .split('{{title}}').join(context.title)
    .split('{{date}}').join(context.date)
    .split('{{folderName}}').join(context.folderName)
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim() || 'Untitled.md'
}

function markdownLabel(filePath: string): string {
  return basename(filePath).replace(/\.(md|markdown)$/i, '')
}

function encodeMarkdownTarget(target: string): string {
  return encodeURIComponent(target).replace(/%2F/g, '/')
}

function countOccurrences(content: string, needle: string): number {
  if (!needle) return 0
  return content.split(needle).length - 1
}

function countPhrase(content: string, phrase: string): number {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return [...content.matchAll(new RegExp(escaped, 'g'))].length
}

function fileNameForRemoteImage(src: string, alt: string): string {
  let name = ''
  try {
    name = basename(new URL(src).pathname)
  } catch {
    name = ''
  }
  if (!name || !/\.[a-z0-9]{2,5}$/i.test(name)) {
    name = `${sanitizeFileName(alt || 'image')}.png`
  }
  return sanitizeFileName(name)
}

function uniqueAssetName(fileName: string, usedNames: Set<string>): string {
  if (!usedNames.has(fileName)) {
    usedNames.add(fileName)
    return fileName
  }
  const dot = fileName.lastIndexOf('.')
  const base = dot > 0 ? fileName.slice(0, dot) : fileName
  const ext = dot > 0 ? fileName.slice(dot) : ''
  let index = 2
  while (usedNames.has(`${base}-${index}${ext}`)) index += 1
  const next = `${base}-${index}${ext}`
  usedNames.add(next)
  return next
}
