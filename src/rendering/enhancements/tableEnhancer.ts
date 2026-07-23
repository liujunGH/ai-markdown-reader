/**
 * 表格增强（作用于单个块 DOM）
 *
 * 与旧 MarkdownRenderer 一致（index.tsx:466-475）：给 <table> 包裹
 * .table-reader-wrapper（可滚动区域 + aria-label）。
 *
 * 改进：跳过已包裹的（幂等），只处理当前块。
 */
export function enhanceTables(block: HTMLElement): void {
  const tables = block.querySelectorAll('table')
  tables.forEach((table, index) => {
    if (table.parentElement?.classList.contains('table-reader-wrapper')) return
    const wrapper = document.createElement('div')
    wrapper.className = 'table-reader-wrapper'
    wrapper.setAttribute('role', 'region')
    wrapper.setAttribute('aria-label', `表格 ${index + 1}`)
    table.parentNode?.insertBefore(wrapper, table)
    wrapper.appendChild(table)
  })
}
