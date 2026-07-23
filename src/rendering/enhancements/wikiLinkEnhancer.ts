/**
 * WikiLink 增强（作用于单个块 DOM）
 *
 * 与旧 MarkdownRenderer 一致（index.tsx:611-631）：
 *  - 点击 [[target]] 链接触发 onWikiLinkClick（或兜底 dispatch 全局事件）
 *  - 支持 alt-target（[[target|display]] 的 display 作为备用查找名）
 *
 * 改进：只处理当前块的 a.wikilink。
 */
export interface WikiLinkEnhanceOptions {
  onWikiLinkClick?: (target: string, altTarget?: string) => void
}

export function enhanceWikiLinks(block: HTMLElement, options: WikiLinkEnhanceOptions): void {
  const wikiLinks = block.querySelectorAll('a.wikilink')
  wikiLinks.forEach((link) => {
    // 幂等：已绑定的跳过（用 data-wiki-bound 标记）
    if (link.hasAttribute('data-wiki-bound')) return
    link.setAttribute('data-wiki-bound', 'true')

    link.addEventListener('click', (e) => {
      e.preventDefault()
      const href = link.getAttribute('href')
      if (!href) return
      const target = decodeURIComponent(href.replace('wikilink://', ''))
      const altTargetAttr = link.getAttribute('data-alt-target')
      const altTarget = altTargetAttr ? decodeURIComponent(altTargetAttr) : undefined
      if (options.onWikiLinkClick) {
        options.onWikiLinkClick(target, altTarget)
      } else {
        window.dispatchEvent(
          new CustomEvent('wikilink-click', { detail: { target, altTarget } })
        )
      }
    })
  })
}
