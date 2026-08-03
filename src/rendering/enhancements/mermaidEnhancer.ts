/**
 * Mermaid 图表增强（作用于单个块 DOM）
 *
 * 与旧 MarkdownRenderer 一致（index.tsx:412-427 占位替换 + 429 异步渲染 +
 * 261-298 renderMermaidDiagrams + 142-192 buildMermaidContainer）：
 *  - .mermaid-code 占位（base64 data-content）→ .mermaid-wrapper
 *  - 异步 mermaid.render 产出 SVG，注入 + 加导出按钮
 *  - 空图/错误占位
 *
 * 关键改进（对应阶段 2 审查 #4/#16）：
 *  - 主线程懒渲染（Mermaid 必须 DOM，无法进 worker）—— 按可见块渲染
 *  - 渲染后块高度变化，通过 onHeightChange 回调通知虚拟列表重测
 *  - 块滚出视口卸载后再滚回：重新触发渲染（占位 HTML 仍是原始 data-content）
 *    —— 通过幂等标记 + 每次挂载重渲染保证（旧版 MutationObserver 全量重渲改为按块）
 */
import { renderMermaidSvg } from '../../utils/mermaidLoader'
import { decodeBase64, encodeBase64 } from '../pipeline/tokenizer'

export interface MermaidEnhanceOptions {
  /** Mermaid 渲染后块高度变化时通知虚拟列表重测（measureElement 会自动校正） */
  onHeightChange?: () => void
  /** 主题（dark/default），决定 mermaid 初始化主题 */
  theme?: 'dark' | 'default'
}

/** 构建含 SVG 导出按钮的容器（复刻旧 buildMermaidContainer） */
function buildMermaidContainer(svg: string): HTMLDivElement {
  const containerDiv = document.createElement('div')
  containerDiv.className = 'mermaid-container'

  const svgWrapper = document.createElement('div')
  svgWrapper.className = 'mermaid-svg-wrapper'
  svgWrapper.innerHTML = svg

  const btnContainer = document.createElement('div')
  btnContainer.className = 'mermaid-btn-container'

  const svgBtn = document.createElement('button')
  svgBtn.className = 'mermaid-export-btn'
  svgBtn.innerHTML = '📥 SVG'
  svgBtn.onclick = () => {
    downloadFile(svg, 'diagram.svg', 'image/svg+xml')
  }

  const pngBtn = document.createElement('button')
  pngBtn.className = 'mermaid-export-btn'
  pngBtn.innerHTML = '📥 PNG'
  pngBtn.onclick = () => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const img = new Image()
        img.onload = () => {
          canvas.width = img.width * 2
          canvas.height = img.height * 2
          ctx.scale(2, 2)
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)
          downloadFile(canvas.toDataURL('image/png'), 'diagram.png', 'image/png')
        }
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
      }
    } catch (err) {
      console.error('Failed to export PNG:', err)
    }
  }

  btnContainer.appendChild(svgBtn)
  btnContainer.appendChild(pngBtn)
  containerDiv.appendChild(svgWrapper)
  containerDiv.appendChild(btnContainer)
  return containerDiv
}

function downloadFile(data: string, filename: string, mimeType: string): void {
  const blob = mimeType === 'image/png' ? dataToBlob(data, mimeType) : new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function dataToBlob(data: string, mimeType: string): Blob {
  const byteString = atob(data.split(',')[1])
  const arr = new Uint8Array(byteString.length)
  for (let i = 0; i < byteString.length; i++) arr[i] = byteString.charCodeAt(i)
  return new Blob([arr], { type: mimeType })
}

/**
 * 增强块内的 Mermaid 占位。
 * 异步渲染：占位 → mermaid.render → SVG 注入 + 导出按钮。
 * 渲染完成后调 onHeightChange（块变高，虚拟列表需重测）。
 */
export function enhanceMermaid(block: HTMLElement, options: MermaidEnhanceOptions): void {
  const mermaidElements = block.querySelectorAll('.mermaid-code')
  mermaidElements.forEach((el, index) => {
    // 已替换为 wrapper 的跳过（块重挂载时 wrapper 已存在则不重复替换）
    if (el.parentElement?.classList.contains('mermaid-wrapper')) return

    const code = decodeBase64(el.getAttribute('data-content') || '')
    const wrapper = document.createElement('div')
    wrapper.className = 'mermaid-wrapper'
    wrapper.id = `mermaid-${index}`
    wrapper.setAttribute('data-mermaid-code', encodeURIComponent(code))
    if (code.trim()) {
      wrapper.setAttribute('data-mermaid-rendered', 'pending')
      wrapper.innerHTML = `<div class="mermaid" data-code="${encodeURIComponent(code)}"></div>`
    } else {
      wrapper.setAttribute('data-mermaid-rendered', 'empty')
      wrapper.innerHTML = '<div class="mermaid-empty">空 Mermaid 图表</div>'
    }
    el.parentNode?.replaceChild(wrapper, el)
  })

  // 也处理主题切换时已存在的 pending wrapper，而不只处理原始占位。
  void renderPendingMermaid(block, options)
}

/** 渲染块内所有 pending 状态的 mermaid 图 */
async function renderPendingMermaid(block: HTMLElement, options: MermaidEnhanceOptions): Promise<void> {
  const pendingWrappers = block.querySelectorAll('.mermaid-wrapper[data-mermaid-rendered="pending"]')
  if (pendingWrappers.length === 0) return

  for (const wrapper of Array.from(pendingWrappers)) {
    const mermaidEl = wrapper.querySelector('.mermaid[data-code]') as HTMLElement | null
    if (!mermaidEl) continue
    const code = decodeURIComponent(mermaidEl.getAttribute('data-code') || '')
    if (!code.trim()) continue

    try {
      const svg = await renderMermaidSvg(code, { securityLevel: 'strict' })
      // wrapper 可能已被卸载（块滚出视口），检查后再注入
      if (!wrapper.isConnected) continue
      wrapper.innerHTML = ''
      wrapper.setAttribute('data-mermaid-rendered', 'true')
      wrapper.setAttribute('data-mermaid-code', encodeURIComponent(code))
      wrapper.appendChild(buildMermaidContainer(svg))
      // SVG 注入后块变高，通知虚拟列表重测
      options.onHeightChange?.()
    } catch (err) {
      if (!wrapper.isConnected) continue
      wrapper.setAttribute('data-mermaid-rendered', 'error')
      const errMsg = err instanceof Error ? err.message : String(err)
      wrapper.innerHTML = `<div class="mermaid-error">Mermaid 渲染错误: ${escapeHtml(errMsg)}</div>`
      options.onHeightChange?.()
    }
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 重新导出供测试/外部用 */
export { encodeBase64 }
