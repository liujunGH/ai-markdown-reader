import { basename } from './path'

export interface IndexedMarkdownFile {
  path: string
  name: string
  content: string
}

export interface WikiLink {
  target: string
  text: string
  line: number
}

export interface Backlink {
  sourcePath: string
  sourceName: string
  line: number
  text: string
}

export interface MissingWikiLinkReference {
  sourcePath: string
  sourceName: string
  line: number
  text: string
  displayText: string
}

export interface MissingWikiLink {
  target: string
  normalizedTarget: string
  sourceCount: number
  references: MissingWikiLinkReference[]
}

export interface MissingWikiLinkSuggestion {
  path: string
  label: string
  score: number
}

export interface WikiGraphNode {
  id: string
  label: string
  filePath?: string
  incoming: number
  outgoing: number
}

export interface WikiGraphEdge {
  from: string
  to: string
  line: number
}

export interface WikiGraph {
  nodes: WikiGraphNode[]
  edges: WikiGraphEdge[]
  orphanNodes: WikiGraphNode[]
}

const WIKI_LINK_RE = /\[\[([^\]\n]+)\]\]/g
const MARKDOWN_LINK_RE = /(?<!!)\[([^\]\n]+)\]\((<[^>\n]+>|[^)\s]+)(?:\s+['"][^'"]*['"])?\)/g

export function normalizeWikiTarget(value: string): string {
  return value
    .trim()
    .replace(/^<|>$/g, '')
    .replace(/[#?].*$/, '')
    .replace(/^\.\//, '')
    .replace(/\.md$/i, '')
    .replace(/\.markdown$/i, '')
    .toLowerCase()
}

export function displayNameForPath(filePath: string): string {
  const name = basename(filePath) || filePath
  return name.replace(/\.md$/i, '').replace(/\.markdown$/i, '')
}

export function extractWikiLinks(content: string): WikiLink[] {
  const links: WikiLink[] = []
  for (const match of content.matchAll(WIKI_LINK_RE)) {
    const raw = (match[1] || '').trim()
    if (!raw) continue
    const [targetPart, textPart] = raw.split('|')
    const target = targetPart.trim()
    if (!target) continue
    links.push({
      target,
      text: (textPart || target).trim(),
      line: content.slice(0, match.index || 0).split('\n').length,
    })
  }
  return links
}

export function extractMarkdownFileLinks(content: string): WikiLink[] {
  const links: WikiLink[] = []
  for (const match of content.matchAll(MARKDOWN_LINK_RE)) {
    const text = (match[1] || '').trim()
    const rawTarget = (match[2] || '').trim()
    const target = decodeLinkTarget(rawTarget)
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target) || !/\.m(?:d|arkdown)(?:[#?].*)?$/i.test(target)) {
      continue
    }
    links.push({
      target,
      text: text || target,
      line: content.slice(0, match.index || 0).split('\n').length,
    })
  }
  return links
}

function decodeLinkTarget(target: string): string {
  const unwrapped = target.trim().replace(/^<|>$/g, '')
  try {
    return decodeURIComponent(unwrapped)
  } catch {
    return unwrapped
  }
}

function extractDocumentLinks(content: string): WikiLink[] {
  return [
    ...extractWikiLinks(content),
    ...extractMarkdownFileLinks(content),
  ].sort((a, b) => a.line - b.line)
}

function linkReferencesFile(link: WikiLink, filePath: string, currentName?: string): boolean {
  const normalizedPath = normalizeWikiTarget(filePath)
  const normalizedDisplay = normalizeWikiTarget(displayNameForPath(filePath))
  const normalizedName = currentName ? normalizeWikiTarget(currentName) : normalizeWikiTarget(basename(filePath))
  const candidates = [link.target, link.text].map(normalizeWikiTarget).filter(Boolean)

  return candidates.some(candidate => (
    candidate === normalizedPath ||
    candidate === normalizedDisplay ||
    candidate === normalizedName ||
    normalizedPath.endsWith(`/${candidate}`) ||
    candidate.endsWith(`/${normalizedDisplay}`) ||
    candidate.endsWith(`/${normalizedName}`)
  ))
}

export function findBacklinks(files: IndexedMarkdownFile[], currentFilePath: string, currentName?: string): Backlink[] {
  return files.flatMap(file => {
    if (file.path === currentFilePath) return []
    const lines = file.content.split('\n')
    return extractDocumentLinks(file.content)
      .filter(link => linkReferencesFile(link, currentFilePath, currentName))
      .map(link => ({
        sourcePath: file.path,
        sourceName: file.name,
        line: link.line,
        text: lines[link.line - 1]?.trim() || link.text,
      }))
  })
}

export function resolveWikiTargetFile(files: IndexedMarkdownFile[], target: string, altTarget?: string): IndexedMarkdownFile | null {
  const candidates = [target, altTarget].filter((value): value is string => Boolean(value?.trim()))
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeWikiTarget(candidate)
    if (!normalizedCandidate) continue
    const match = files.find(file => {
      const normalizedPath = normalizeWikiTarget(file.path)
      const normalizedName = normalizeWikiTarget(file.name)
      const normalizedDisplay = normalizeWikiTarget(displayNameForPath(file.path))
      return normalizedPath === normalizedCandidate ||
        normalizedPath.endsWith(`/${normalizedCandidate}`) ||
        normalizedName === normalizedCandidate ||
        normalizedDisplay === normalizedCandidate
    })
    if (match) return match
  }
  return null
}

function chooseMissingTarget(link: WikiLink): { target: string; displayText: string } {
  const targetLooksAscii = /^[\w\s./-]+$/.test(link.target)
  const textLooksAscii = /^[\w\s./-]+$/.test(link.text)
  if (link.text !== link.target && textLooksAscii && !targetLooksAscii) {
    return { target: link.text, displayText: link.target }
  }
  return { target: link.target, displayText: link.text }
}

export function findMissingWikiLinks(files: IndexedMarkdownFile[]): MissingWikiLink[] {
  const missingByTarget = new Map<string, MissingWikiLink>()

  for (const file of files) {
    const lines = file.content.split('\n')
    for (const link of extractWikiLinks(file.content)) {
      if (resolveWikiTargetFile(files, link.target, link.text)) continue
      const missing = chooseMissingTarget(link)
      const normalizedTarget = normalizeWikiTarget(missing.target)
      if (!normalizedTarget) continue
      const existing = missingByTarget.get(normalizedTarget) || {
        target: missing.target,
        normalizedTarget,
        sourceCount: 0,
        references: [],
      }
      existing.references.push({
        sourcePath: file.path,
        sourceName: file.name,
        line: link.line,
        text: lines[link.line - 1]?.trim() || link.text,
        displayText: missing.displayText,
      })
      existing.sourceCount = new Set(existing.references.map(reference => reference.sourcePath)).size
      missingByTarget.set(normalizedTarget, existing)
    }
  }

  return Array.from(missingByTarget.values())
    .sort((a, b) => b.references.length - a.references.length || a.target.localeCompare(b.target))
}

export function suggestMissingWikiLinkTargets(files: IndexedMarkdownFile[], target: string, limit = 3): MissingWikiLinkSuggestion[] {
  const targetTokens = tokenizeTarget(target)
  if (targetTokens.length === 0) return []

  return files
    .map(file => {
      const label = displayNameForPath(file.path)
      const candidateTokens = tokenizeTarget(`${file.path} ${file.name} ${label}`)
      const score = targetTokens.reduce((sum, token) => (
        candidateTokens.some(candidate => candidate === token)
          ? sum + 2
          : candidateTokens.some(candidate => candidate.includes(token) || token.includes(candidate))
            ? sum + 1
            : sum
      ), 0)
      return { path: file.path, label, score }
    })
    .filter(suggestion => suggestion.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, limit)
}

function tokenizeTarget(value: string): string[] {
  return normalizeWikiTarget(value)
    .replace(/[-_./]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1)
}

export function buildWikiGraph(files: IndexedMarkdownFile[]): WikiGraph {
  const fileByTarget = new Map<string, IndexedMarkdownFile>()
  for (const file of files) {
    fileByTarget.set(normalizeWikiTarget(file.path), file)
    fileByTarget.set(normalizeWikiTarget(file.name), file)
    fileByTarget.set(normalizeWikiTarget(displayNameForPath(file.path)), file)
  }

  const nodeMap = new Map<string, WikiGraphNode>()
  const edges: WikiGraphEdge[] = []

  const ensureNode = (id: string, label: string, filePath?: string) => {
    const existing = nodeMap.get(id)
    if (existing) return existing
    const node: WikiGraphNode = { id, label, filePath, incoming: 0, outgoing: 0 }
    nodeMap.set(id, node)
    return node
  }

  for (const file of files) {
    const fromId = normalizeWikiTarget(displayNameForPath(file.path))
    const fromNode = ensureNode(fromId, displayNameForPath(file.path), file.path)

    for (const link of extractDocumentLinks(file.content)) {
      const targetFile = resolveWikiTargetFile(files, link.target, link.text)
      const toId = targetFile ? normalizeWikiTarget(displayNameForPath(targetFile.path)) : normalizeWikiTarget(link.target)
      const toNode = ensureNode(toId, targetFile ? displayNameForPath(targetFile.path) : link.target, targetFile?.path)
      fromNode.outgoing += 1
      toNode.incoming += 1
      edges.push({ from: fromNode.id, to: toNode.id, line: link.line })
    }
  }

  const nodes = Array.from(nodeMap.values()).sort((a, b) => a.label.localeCompare(b.label))
  return {
    nodes,
    edges,
    orphanNodes: nodes.filter(node => node.incoming === 0 && node.outgoing === 0),
  }
}
