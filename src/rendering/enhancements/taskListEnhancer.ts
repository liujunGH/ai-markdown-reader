/**
 * Task list 增强（作用于单个块 DOM）
 *
 * 与旧 MarkdownRenderer 一致（index.tsx:557-599）：
 *  - [ ]/[x] 文本渲染为可勾选 checkbox
 *  - 勾选状态按 task-checks-{contentHash} 持久化（按行索引）
 *
 * 改进：只处理当前块的 <li>。
 */
import { getStorageItem, setStorageItem } from '../../utils/storage'
import { escapeHtml } from '../pipeline/tokenizer'

interface TaskListEnhanceOptions {
  docHash: string
}

export function enhanceTaskLists(block: HTMLElement, options: TaskListEnhanceOptions): void {
  const taskItems = block.querySelectorAll('li')
  taskItems.forEach((li) => {
    // 幂等：已改造的跳过
    if (li.querySelector('input.task-checkbox')) return

    const text = li.textContent || ''
    if (!text.startsWith('[ ] ') && !text.startsWith('[x] ') && !text.startsWith('[X] ')) return

    const checked = text.startsWith('[x]') || text.startsWith('[X]')
    const taskContent = text.slice(4)
    const storageKey = `task-checks-${options.docHash}`
    let checkedLines: number[] = []
    try {
      const stored = getStorageItem(storageKey as `task-checks-${string}`)
      if (stored) checkedLines = JSON.parse(stored)
    } catch {
      // 损坏存储忽略
    }

    const parent = li.parentElement
    let lineIndex = 0
    if (parent) {
      const siblings = Array.from(parent.children)
      lineIndex = siblings.indexOf(li)
    }
    const isChecked = checkedLines.includes(lineIndex) ? true : checked

    li.innerHTML = `<input type="checkbox" class="task-checkbox" data-line="${lineIndex}" ${isChecked ? 'checked' : ''} /> <span>${escapeHtml(taskContent)}</span>`
    li.classList.add('task-list-item')

    const checkbox = li.querySelector('input.task-checkbox') as HTMLInputElement | null
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        const line = parseInt(checkbox.getAttribute('data-line') || '0', 10)
        let lines: number[] = []
        try {
          const stored = getStorageItem(storageKey as `task-checks-${string}`)
          if (stored) lines = JSON.parse(stored)
        } catch {
          // 忽略
        }
        if (checkbox.checked) {
          if (!lines.includes(line)) lines.push(line)
        } else {
          lines = lines.filter((l) => l !== line)
        }
        setStorageItem(storageKey as `task-checks-${string}`, JSON.stringify(lines))
      })
    }
  })
}
