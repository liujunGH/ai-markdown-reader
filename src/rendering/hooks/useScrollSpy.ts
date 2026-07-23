/**
 * useScrollSpy —— 观察标题可见性，返回当前激活标题 id
 *
 * 在 scroll container 内观察所有 h1-h6 元素，返回最靠上的可见标题 id。
 * 供大纲/Minimap/FloatingTOC 高亮当前阅读位置。
 */
import { useState, useEffect, useRef } from 'react'

export function useScrollSpy(containerSelector: string = 'main'): string | null {
  const [activeId, setActiveId] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const container = document.querySelector(containerSelector)
    if (!container) return

    const headings = container.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')
    if (headings.length === 0) return

    // 用 IntersectionObserver 观察标题可见性
    const visible = new Map<string, number>() // id -> intersectionRatio

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('id')
          if (!id) continue
          if (entry.isIntersecting) {
            visible.set(id, entry.intersectionRatio)
          } else {
            visible.delete(id)
          }
        }
        // 取可见中 ratio 最大的（最完整的可见标题）
        if (visible.size > 0) {
          let bestId: string | null = null
          let bestRatio = -1
          for (const [id, ratio] of visible) {
            if (ratio > bestRatio) {
              bestRatio = ratio
              bestId = id
            }
          }
          if (bestId) setActiveId(bestId)
        }
      },
      {
        root: container,
        rootMargin: '-80px 0px -60% 0px', // 顶部偏移，底部 60% 内才算可见
        threshold: [0, 0.1, 0.5, 1],
      }
    )

    observerRef.current = observer
    headings.forEach((h) => observer.observe(h))

    return () => {
      observer.disconnect()
      observerRef.current = null
    }
  }, [containerSelector])

  return activeId
}
