/**
 * 图片增强（作用于单个块 DOM）
 *
 * 与旧 MarkdownRenderer 一致（index.tsx:431-464 + buildImageErrorPlaceholder:82-130）：
 *  - 记录 data-original-src
 *  - 本地图片解析路径 → readImageAsDataUrl 转 data URL 注入
 *  - loading=lazy + clickable-image class
 *  - 加载失败显示错误占位（含复制路径/打开链接/Finder 显示）
 *  - 点击触发大图预览回调
 *
 * 改进：只处理当前块的 <img>；图片 data URL 由 ImageCache LRU 缓存（阶段 2 资源层）。
 */
import { resolveLocalImagePath } from '../../utils/imagePaths'
import { readImageAsDataUrl } from '../../ipc/client'

export interface ImageEnhanceOptions {
  /** 当前文档文件路径（解析相对图片路径用） */
  filePath?: string
  /** 点击图片触发大图预览 */
  onPreviewImage?: (info: { src: string; alt: string; originalSrc: string }) => void
}

/** 构建图片加载失败的错误占位（复刻旧 buildImageErrorPlaceholder） */
function buildImageErrorPlaceholder(src: string, alt: string, error?: string): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'image-error-placeholder'

  const title = document.createElement('div')
  title.className = 'image-error-title'
  title.textContent = alt ? `图片加载失败：${alt}` : '图片加载失败'

  const path = document.createElement('div')
  path.className = 'image-error-path'
  path.textContent = src
  path.title = src

  const detail = document.createElement('div')
  detail.className = 'image-error-detail'
  detail.textContent = error || '请检查文件路径、网络连接或图片权限'

  const actions = document.createElement('div')
  actions.className = 'image-error-actions'

  const copyButton = document.createElement('button')
  copyButton.type = 'button'
  copyButton.textContent = '复制路径'
  copyButton.addEventListener('click', () => {
    void navigator.clipboard?.writeText(src)
  })
  actions.appendChild(copyButton)

  if (/^https?:\/\//i.test(src)) {
    const openButton = document.createElement('button')
    openButton.type = 'button'
    openButton.textContent = '打开链接'
    openButton.addEventListener('click', () => {
      window.open(src, '_blank', 'noopener,noreferrer')
    })
    actions.appendChild(openButton)
  } else if (src.startsWith('/') && window.electronAPI?.showInFolder) {
    const revealButton = document.createElement('button')
    revealButton.type = 'button'
    revealButton.textContent = '在 Finder 中显示'
    revealButton.addEventListener('click', () => {
      void window.electronAPI?.showInFolder(src)
    })
    actions.appendChild(revealButton)
  }

  wrapper.append(title, path, detail, actions)
  return wrapper
}

export function enhanceImages(block: HTMLElement, options: ImageEnhanceOptions): void {
  const images = block.querySelectorAll('img')
  images.forEach((img) => {
    // 幂等：已处理的跳过
    if (img.hasAttribute('data-enhanced')) return
    img.setAttribute('data-enhanced', 'true')

    const src = img.getAttribute('src') || ''
    const alt = img.getAttribute('alt') || ''
    img.setAttribute('data-original-src', src)

    const failImage = (displaySrc: string, error?: string) => {
      if (!img.parentNode) return
      img.parentNode.replaceChild(buildImageErrorPlaceholder(displaySrc, alt, error), img)
    }

    const localImagePath = resolveLocalImagePath(src, options.filePath)
    if (localImagePath) {
      void readImageAsDataUrl(localImagePath)
        .then((result) => {
          if (result.success && result.dataUrl) {
            img.setAttribute('src', result.dataUrl)
          } else {
            failImage(localImagePath, result.error)
          }
        })
        .catch((error: unknown) => {
          failImage(localImagePath, error instanceof Error ? error.message : String(error))
        })
    }

    img.loading = 'lazy'
    img.classList.add('clickable-image')
    img.addEventListener('error', () => {
      failImage(localImagePath || src)
    }, { once: true })
    img.addEventListener('click', () => {
      options.onPreviewImage?.({
        src: img.src,
        alt: img.alt,
        originalSrc: img.getAttribute('data-original-src') || img.src,
      })
    })
  })
}
