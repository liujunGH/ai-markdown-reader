import type { ParsedDocument } from '../types'
import { splitIntoBlocks } from './blockModel'
import { countMarkdownLines, extractReferenceDefinitions, segmentMarkdown } from './segmenter'
import {
  createParser,
  loadPrismLanguage,
  scanCodeLanguages,
  stripFrontmatter,
} from './tokenizer'

export interface ParsedDocumentSegment {
  blocks: ParsedDocument['blocks']
  outline: ParsedDocument['outline']
  totalLines: number
  referenceDefinitions?: string
}

interface ParseDocumentSegmentsOptions {
  targetChars?: number
  yieldBetweenSegments?: boolean
  onSegment?: (segment: ParsedDocumentSegment) => void
}

/** 分段 token 化并建立轻量索引；任一时刻只保留当前段的 markdown-it token。 */
export async function parseDocumentInSegments(
  content: string,
  options: ParseDocumentSegmentsOptions = {},
): Promise<ParsedDocument> {
  const body = stripFrontmatter(content)
  const totalLines = countMarkdownLines(body)
  const referenceDefinitions = extractReferenceDefinitions(body)
  const segments = segmentMarkdown(body, options.targetChars)
  const { md, prism } = await createParser()
  const blocks: ParsedDocument['blocks'] = []
  const outline: ParsedDocument['outline'] = []

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    const languages = scanCodeLanguages(segment.content)
    if (languages.length > 0) {
      await Promise.all(languages.map((language) => loadPrismLanguage(prism, language)))
    }

    const parseSource = referenceDefinitions
      ? `${segment.content}\n\n${referenceDefinitions}`
      : segment.content
    const parsed = splitIntoBlocks(md.parse(parseSource, {}), md, segment.content, {
      blockIdOffset: blocks.length,
      lineOffset: segment.startLineOffset,
      totalLines,
    })
    blocks.push(...parsed.blocks)
    outline.push(...parsed.outline)
    options.onSegment?.({
      blocks: parsed.blocks,
      outline: parsed.outline,
      totalLines,
      referenceDefinitions,
    })

    if (options.yieldBetweenSegments && index < segments.length - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
  }

  return { blocks, outline, totalLines, referenceDefinitions }
}
