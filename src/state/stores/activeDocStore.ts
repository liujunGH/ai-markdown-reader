/**
 * 活跃文档视图状态（搜索高亮 / 阅读高亮 / 图片预览）
 *
 * 桥接兄弟组件（ReaderSearch/ReadingTools 写 → ReaderPanel 读），
 * 避免 prop drilling。这些都是视图级瞬时状态，不持久化。
 */
import { create } from 'zustand'

interface ActiveDocState {
  /** 文内搜索高亮（DocumentView enhance.searchHighlight 消费） */
  searchHighlight: { query: string; isRegex: boolean } | null
  /** 当前活动匹配序号 */
  currentMatch: number
  /** 总匹配数 */
  matchCount: number
  /** 阅读高亮文本列表（DocumentView enhance.readingHighlights 消费） */
  readingHighlights: string[]
  /** 待预览的图片（onPreviewImage 触发） */
  previewImage: { src: string; alt: string; originalSrc: string } | null

  setSearchHighlight: (q: { query: string; isRegex: boolean } | null) => void
  setSearchMatch: (current: number, total: number) => void
  setReadingHighlights: (texts: string[]) => void
  setPreviewImage: (img: { src: string; alt: string; originalSrc: string } | null) => void
}

export const useActiveDocStore = create<ActiveDocState>((set) => ({
  searchHighlight: null,
  currentMatch: -1,
  matchCount: 0,
  readingHighlights: [],
  previewImage: null,

  setSearchHighlight: (q) => set({ searchHighlight: q }),
  setSearchMatch: (current, total) => set({ currentMatch: current, matchCount: total }),
  setReadingHighlights: (texts) => set({ readingHighlights: texts }),
  setPreviewImage: (img) => set({ previewImage: img }),
}))
