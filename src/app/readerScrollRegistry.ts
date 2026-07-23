/**
 * ReaderPanel 滚动命令注册表
 *
 * ReaderPanel 挂载时注册 scroll 方法，阅读工具等兄弟组件通过此模块触发滚动，
 * 避免 prop drilling 或 context（ReaderPanel 和 ReaderReadingTools 是兄弟）。
 */
export interface ReaderScrollHandle {
  scrollToHeading: (headingId: string) => void
  scrollToLine: (line: number) => void
}

let handle: ReaderScrollHandle | null = null

export function registerReaderScroll(h: ReaderScrollHandle | null): void {
  handle = h
}

export function scrollToHeading(headingId: string): void {
  handle?.scrollToHeading(headingId)
}

export function scrollToLine(line: number): void {
  handle?.scrollToLine(line)
}
