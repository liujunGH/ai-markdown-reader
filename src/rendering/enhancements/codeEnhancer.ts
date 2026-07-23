/**
 * 代码块增强（作用于单个块 DOM）
 *
 * 与旧 MarkdownRenderer 一致（index.tsx:477-554）：
 *  - 语言标签（.code-lang-label）
 *  - 复制按钮（📋，点击复制代码，2 秒后恢复）
 *  - 代码折叠（>15 行，状态按 code-fold-{contentHash}-{codeHash} 持久化）
 *
 * 改进：只处理当前块的 <pre>，事件监听随块卸载回收。
 */
import { getStorageItem, setStorageItem } from '../../utils/storage'
import { contentHash } from '../pipeline/blockModel'

interface CodeEnhanceOptions {
  /** 文档内容指纹（用于 code-fold / task-checks 持久化 key） */
  docHash: string
}

export function enhanceCodeBlocks(block: HTMLElement, options: CodeEnhanceOptions): void {
  const preElements = block.querySelectorAll('pre')
  preElements.forEach((pre) => {
    // 幂等：已增强过的跳过（避免重复挂载按钮）
    if (pre.querySelector('.copy-button')) return

    const codeEl = pre.querySelector('code')
    if (!codeEl) return

    const code = codeEl.textContent || ''

    // 语言标签
    const langClass = Array.from(codeEl.classList).find((c) => c.startsWith('language-'))
    if (langClass) {
      const lang = langClass.replace('language-', '')
      const langLabel = document.createElement('span')
      langLabel.className = 'code-lang-label'
      langLabel.textContent = lang
      pre.appendChild(langLabel)
    }

    // 复制按钮
    const copyBtn = document.createElement('button')
    copyBtn.className = 'copy-button'
    copyBtn.innerHTML = '📋'
    copyBtn.title = '复制代码'
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code)
        copyBtn.innerHTML = '✓'
        setTimeout(() => {
          copyBtn.innerHTML = '📋'
        }, 2000)
      } catch {
        copyBtn.innerHTML = '✕'
        setTimeout(() => {
          copyBtn.innerHTML = '📋'
        }, 2000)
      }
    })
    pre.style.position = 'relative'
    pre.appendChild(copyBtn)

    // 代码折叠（>15 行）
    const lineCountAttr = pre.getAttribute('data-lines')
    if (lineCountAttr) {
      const lineCount = parseInt(lineCountAttr, 10)
      if (lineCount > 15) {
        const codeHash = pre.getAttribute('data-code-hash') || ''
        const storageKey = `code-fold-${options.docHash}-${codeHash}`
        const isFolded = getStorageItem(storageKey as `code-fold-${string}`) !== 'false'

        const foldBtn = document.createElement('button')
        foldBtn.className = 'code-fold-btn'
        foldBtn.innerHTML = isFolded ? '▸' : '▾'
        foldBtn.title = isFolded ? '展开代码' : '折叠代码'

        if (isFolded) {
          pre.classList.add('code-folded')
        }

        const fade = document.createElement('div')
        fade.className = 'code-fold-fade'
        pre.appendChild(fade)

        foldBtn.addEventListener('click', () => {
          const folded = pre.classList.contains('code-folded')
          if (folded) {
            pre.classList.remove('code-folded')
            foldBtn.innerHTML = '▾'
            foldBtn.title = '折叠代码'
            setStorageItem(storageKey as `code-fold-${string}`, 'false')
          } else {
            pre.classList.add('code-folded')
            foldBtn.innerHTML = '▸'
            foldBtn.title = '展开代码'
            setStorageItem(storageKey as `code-fold-${string}`, 'true')
          }
        })

        pre.appendChild(foldBtn)
      }
    }
  })
}

/** 计算文档内容指纹（供 code-fold / task-checks 持久化 key） */
export function getDocHash(content: string): string {
  return contentHash(content)
}
