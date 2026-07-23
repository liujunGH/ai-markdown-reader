/**
 * KaTeX tooltip 增强（作用于单个块 DOM）
 *
 * 与旧 MarkdownRenderer 一致（index.tsx:601-609）：
 *  - 为 .katex 元素加 data-latex（原始 LaTeX）便于悬停查看
 *
 * 改进：只扫描当前块。
 */
export function enhanceKatex(block: HTMLElement): void {
  const mathElements = block.querySelectorAll('.katex')
  mathElements.forEach((el) => {
    // 幂等
    if (el.classList.contains('katex-tooltip')) return
    const annotation = el.querySelector('annotation[encoding="application/x-tex"]')
    if (annotation) {
      el.setAttribute('data-latex', annotation.textContent || '')
      el.classList.add('katex-tooltip')
    }
  })
}
