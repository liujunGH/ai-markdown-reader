import type { DocumentBlock } from '../types'
import {
  createParser,
  loadPrismLanguage,
  processWikiLinks,
  scanCodeLanguages,
} from './tokenizer'

export type RenderableBlock = Pick<DocumentBlock, 'id' | 'kind' | 'source' | 'meta'>

/**
 * 批量渲染可见块。调用方只传可见区和预取区的源码，避免整篇文档 HTML 常驻。
 */
export async function renderBlockSources(
  blocks: RenderableBlock[],
  referenceDefinitions = '',
): Promise<Array<{ id: number; html: string }>> {
  const { md, prism } = await createParser()
  const languages = new Set<string>()
  for (const block of blocks) {
    for (const language of scanCodeLanguages(block.source)) languages.add(language)
  }
  if (languages.size > 0) {
    await Promise.all([...languages].map((language) => loadPrismLanguage(prism, language)))
  }

  return blocks.map((block) => {
    const source = referenceDefinitions
      ? `${block.source}\n\n${referenceDefinitions}`
      : block.source
    let html = md.render(source)
    if (block.kind === 'heading' && block.meta?.headingId && block.meta.headingLevel) {
      const tag = `h${block.meta.headingLevel}`
      html = html.replace(new RegExp(`<${tag}>`), `<${tag} id="${block.meta.headingId}">`)
    }
    return { id: block.id, html: processWikiLinks(html) }
  })
}
