/**
 * 链接增强（作用于单个块 DOM）
 *
 * 与旧 MarkdownRenderer 的链接处理一致（index.tsx:394-410）：
 *  - 禁用危险协议（javascript:/data:/file:/vbscript:）：移除 href、划线、title 提示
 *  - http(s) 链接：target=_blank rel=noopener noreferrer
 *
 * 改进：只扫描当前块的 <a>（旧版扫整篇），且无需手动清理事件（块卸载 DOM 回收）。
 */
import { DANGEROUS_PROTOCOLS } from '../../../shared'

export function enhanceLinks(block: HTMLElement): void {
  const links = block.querySelectorAll('a')
  links.forEach((link) => {
    const href = link.getAttribute('href') || ''
    const lower = href.toLowerCase()
    if (DANGEROUS_PROTOCOLS.some((p) => lower.startsWith(p))) {
      link.removeAttribute('href')
      link.style.color = '#888'
      link.style.textDecoration = 'line-through'
      link.title = '已禁用不安全的链接'
      return
    }
    if (href.startsWith('http://') || href.startsWith('https://')) {
      link.setAttribute('target', '_blank')
      link.setAttribute('rel', 'noopener noreferrer')
    }
  })
}
