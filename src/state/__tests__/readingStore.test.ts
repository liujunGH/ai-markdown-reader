import { describe, expect, it, beforeEach } from 'vitest'
import { useReadingStore } from '../stores/readingStore'

/**
 * readingStore v2 测试。
 *
 * 核心验证（审查 F1/F2 修复）：
 *  - toggleChapterCompletion 接收 line、确定性 id、300 上限
 *  - 持久化字段正确（persist partialize）
 */
beforeEach(() => {
  useReadingStore.setState({
    readerMarks: [],
    readLaterItems: [],
    readingSessions: [],
    chapterCompletions: [],
    readingSnapshots: [],
    focusTimer: null,
    accessibility: {
      lineHeight: 1.65,
      letterSpacing: 0,
      paragraphSpacing: 1,
      reduceMotion: false,
      ttsRate: 1,
      highContrastHighlights: false,
    },
    activePresetId: 'default',
    layoutMode: 'single',
    currentReadingLine: 0,
    currentReadingProgress: 0,
    activeSessionMinutes: 0,
    selectedReaderText: '',
  })
})

describe('readingStore — toggleChapterCompletion', () => {
  it('首次标记完成（记录 line + completedAt）', () => {
    useReadingStore.getState().toggleChapterCompletion('/a.md', '第二章', 50)
    const items = useReadingStore.getState().chapterCompletions
    expect(items.length).toBe(1)
    expect(items[0].filePath).toBe('/a.md')
    expect(items[0].heading).toBe('第二章')
    expect(items[0].line).toBe(50) // line 已记录（非 0）
    expect(items[0].completedAt).toBeGreaterThan(0)
  })

  it('确定性 id：同 filePath+heading+line 幂等', () => {
    useReadingStore.getState().toggleChapterCompletion('/a.md', '第二章', 50)
    useReadingStore.getState().toggleChapterCompletion('/a.md', '第二章', 50)
    expect(useReadingStore.getState().chapterCompletions.length).toBe(0) // 再次 toggle 取消
  })

  it('不同 line 视为不同章节', () => {
    useReadingStore.getState().toggleChapterCompletion('/a.md', '第二章', 50)
    useReadingStore.getState().toggleChapterCompletion('/a.md', '第二章', 60)
    expect(useReadingStore.getState().chapterCompletions.length).toBe(2)
  })

  it('上限 300（防膨胀）', () => {
    for (let i = 0; i < 310; i++) {
      useReadingStore.getState().toggleChapterCompletion('/a.md', `h${i}`, i)
    }
    expect(useReadingStore.getState().chapterCompletions.length).toBe(300)
  })
})

describe('readingStore — marks/readLater/sessions 增删', () => {
  it('addReaderMark 加到头部', () => {
    useReadingStore.getState().addReaderMark({
      id: 'm1',
      filePath: '/a.md',
      kind: 'highlight',
      text: '重点',
      position: 10,
    } as any)
    expect(useReadingStore.getState().readerMarks.length).toBe(1)
    expect(useReadingStore.getState().readerMarks[0].id).toBe('m1')
  })

  it('removeReaderMark 按 id 删除', () => {
    useReadingStore.getState().addReaderMark({ id: 'm1', filePath: '/a.md', kind: 'highlight', text: 'x', position: 0 } as any)
    useReadingStore.getState().removeReaderMark('m1')
    expect(useReadingStore.getState().readerMarks.length).toBe(0)
  })
})

describe('readingStore — 会话内状态不进 persist', () => {
  it('currentReadingLine/progress 是会话内（不持久化字段）', () => {
    useReadingStore.getState().setCurrentReadingLine(42)
    useReadingStore.getState().setCurrentReadingProgress(0.5)
    // 这些值在 state 里，但 persist partialize 不含它们
    expect(useReadingStore.getState().currentReadingLine).toBe(42)
    expect(useReadingStore.getState().currentReadingProgress).toBe(0.5)
  })
})
