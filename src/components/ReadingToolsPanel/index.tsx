import type {
  ReaderMark,
  ReadLaterItem,
  ReadLaterStatus,
  ChapterProgress,
  ReadingStats,
  ChapterCompletion,
  FocusTimer,
  ReadingAccessibilitySettings,
  ReadingLandmark,
  ReadingLayoutMode,
  ReadingPreset,
  ReadingResumePoint,
} from '../../utils/readingExperience'
import styles from './ReadingToolsPanel.module.css'

interface Props {
  fileName: string
  selectedText: string
  marks: ReaderMark[]
  readLaterItems: ReadLaterItem[]
  resumePoint: ReadingResumePoint | null
  presets: ReadingPreset[]
  activePresetId: ReadingPreset['id']
  landmarks: ReadingLandmark[]
  layoutMode: ReadingLayoutMode
  panelMode?: 'modal' | 'sidebar'
  readingStats?: ReadingStats
  chapterProgress?: ChapterProgress | null
  chapterCompletions?: ChapterCompletion[]
  focusTimer?: FocusTimer | null
  accessibility?: ReadingAccessibilitySettings
  activeSessionMinutes?: number
  onAddHighlight: () => void
  onAddExcerpt: () => void
  onAddReadLater: () => void
  onOpenReadLater: (item: ReadLaterItem) => void
  onUpdateReadLaterStatus: (id: string, status: ReadLaterStatus) => void
  onResume: () => void
  onApplyPreset: (preset: ReadingPreset) => void
  onJumpToLandmark: (landmark: ReadingLandmark) => void
  onJumpToMark: (mark: ReaderMark) => void
  onSetLayoutMode: (mode: ReadingLayoutMode) => void
  onRemoveMark: (id: string) => void
  onExportAnnotations: () => void
  onUpdateMarkMetadata: (id: string, metadata: { color?: ReaderMark['color']; tag?: string }) => void
  onToggleChapterCompletion: () => void
  onStartFocusTimer: (minutes: number) => void
  onStopFocusTimer: () => void
  onOpenMediaGallery: () => void
  onSyncComparison: () => void
  onUpdateAccessibility: (settings: Partial<ReadingAccessibilitySettings>) => void
  onClose: () => void
}

export function ReadingToolsPanel({
  fileName,
  selectedText,
  marks,
  readLaterItems,
  resumePoint,
  presets,
  activePresetId,
  landmarks,
  layoutMode,
  panelMode = 'modal',
  readingStats,
  chapterProgress,
  chapterCompletions = [],
  focusTimer,
  accessibility,
  activeSessionMinutes = 0,
  onAddHighlight,
  onAddExcerpt,
  onAddReadLater,
  onOpenReadLater,
  onUpdateReadLaterStatus,
  onResume,
  onApplyPreset,
  onJumpToLandmark,
  onJumpToMark,
  onSetLayoutMode,
  onRemoveMark,
  onExportAnnotations,
  onUpdateMarkMetadata,
  onToggleChapterCompletion,
  onStartFocusTimer,
  onStopFocusTimer,
  onOpenMediaGallery,
  onSyncComparison,
  onUpdateAccessibility,
  onClose,
}: Props) {
  const highlights = marks.filter(mark => mark.kind === 'highlight')
  const excerpts = marks.filter(mark => mark.kind === 'excerpt')
  const firstHighlight = highlights[0]

  return (
    <div className={panelMode === 'sidebar' ? styles.sidebarShell : styles.overlay} onClick={panelMode === 'modal' ? onClose : undefined}>
      <section
        className={`${styles.panel} ${panelMode === 'sidebar' ? styles.sidebarPanel : ''}`}
        onClick={event => event.stopPropagation()}
        aria-label={panelMode === 'sidebar' ? '阅读工具侧栏' : '阅读工具'}
      >
        <header className={styles.header}>
          <div>
            <h3>阅读工具</h3>
            <p>{fileName} · {selectedText ? `已选中 ${selectedText.length} 字` : '选中文字后可保存标注或摘录'}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={styles.grid}>
          <section className={styles.section}>
            <h4>标注 / 高亮</h4>
            <p>{selectedText || '选中正文后保存为高亮'}</p>
            <button type="button" onClick={onAddHighlight} disabled={!selectedText}>保存高亮</button>
            <div className={styles.list}>
              {highlights.slice(0, 4).map(mark => (
                <article key={mark.id} className={styles.item}>
                  <span>{mark.text}</span>
                  <div className={styles.rowActions}>
                    <button type="button" onClick={() => onJumpToMark(mark)} aria-label={`跳到高亮 ${mark.text}`}>跳到</button>
                    <button type="button" onClick={() => onRemoveMark(mark.id)} aria-label={`删除高亮 ${mark.text}`}>删除</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h4>稍后读</h4>
            <p>{readLaterItems.length > 0 ? `${readLaterItems.length} 个阅读项` : '把当前文档加入阅读队列'}</p>
            <button type="button" onClick={onAddReadLater}>加入稍后读</button>
            <div className={styles.list}>
              {readLaterItems.slice(0, 4).map(item => (
                <article key={item.id} className={styles.item}>
                  <span>{item.fileName}{item.heading ? ` · ${item.heading}` : ''}</span>
                  <div className={styles.rowActions}>
                    <button type="button" onClick={() => onOpenReadLater(item)}>打开 {item.fileName}</button>
                    <button type="button" onClick={() => onUpdateReadLaterStatus(item.id, 'done')}>标记已读</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h4>继续阅读</h4>
            <p>{resumePoint ? resumePoint.label : '当前文档暂无阅读位置'}</p>
            <button type="button" onClick={onResume} disabled={!resumePoint}>从上次位置继续</button>
          </section>

          <section className={styles.section}>
            <h4>章节进度</h4>
            <p>{chapterProgress ? `${chapterProgress.currentHeading} · ${chapterProgress.percent}%` : '当前章节暂无进度'}</p>
            {chapterProgress && <strong>第 {chapterProgress.currentIndex} / {chapterProgress.totalChapters} 节</strong>}
          </section>

          <section className={styles.section}>
            <h4>章节完成</h4>
            <p>{chapterCompletions.length} 个章节已完成</p>
            <button type="button" onClick={onToggleChapterCompletion} disabled={!chapterProgress}>切换当前章节完成</button>
          </section>

          <section className={styles.section}>
            <h4>阅读会话</h4>
            <p>本次已读 {activeSessionMinutes} 分钟</p>
            <strong>J/K 滚动 · H/L 跳章节 · M 稍后读 · B 书签</strong>
          </section>

          <section className={styles.section}>
            <h4>防打扰</h4>
            <p>{focusTimer ? `专注到 ${new Date(focusTimer.endsAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '开启 25 分钟阅读计时'}</p>
            <div className={styles.rowActions}>
              <button type="button" onClick={() => onStartFocusTimer(25)}>开始 25 分钟</button>
              <button type="button" onClick={onStopFocusTimer} disabled={!focusTimer}>停止</button>
            </div>
          </section>

          <section className={styles.section}>
            <h4>阅读统计</h4>
            <p>{readingStats ? `今日 ${readingStats.todayMinutes} 分钟 · 累计 ${readingStats.totalMinutes} 分钟` : '暂无阅读统计'}</p>
            {readingStats && <strong>{readingStats.documentsRead} 篇文档 · {readingStats.totalWords} 字</strong>}
          </section>

          <section className={styles.section}>
            <h4>批注导出</h4>
            <p>导出当前文档的高亮、摘录、完成章节和进度</p>
            <button type="button" onClick={onExportAnnotations}>导出批注</button>
          </section>

          <section className={styles.section}>
            <h4>颜色与标签</h4>
            <p>{firstHighlight ? '为最近高亮添加颜色和标签' : '暂无高亮可设置'}</p>
            <div className={styles.list}>
              {highlights.slice(0, 3).map(mark => (
                <article key={`metadata-${mark.id}`} className={styles.item}>
                  <span>{mark.tag ? `#${mark.tag} · ` : ''}{mark.text}</span>
                  <div className={styles.rowActions}>
                    <button type="button" onClick={() => onUpdateMarkMetadata(mark.id, { color: 'green', tag: '重点' })}>重点</button>
                    <button type="button" onClick={() => onUpdateMarkMetadata(mark.id, { color: 'blue', tag: '疑问' })}>疑问</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h4>阅读预设</h4>
            <p>切换字体、行宽、行距和目录显示</p>
            <div className={styles.segmented}>
              {presets.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  className={preset.id === activePresetId ? styles.activeSegment : ''}
                  onClick={() => onApplyPreset(preset)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h4>快速导航</h4>
            <p>章节、段落、图片、代码块和表格</p>
            <div className={styles.list}>
              {landmarks.slice(0, 8).map(landmark => (
                <button key={landmark.id} type="button" onClick={() => onJumpToLandmark(landmark)}>
                  跳到 {landmark.label}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h4>摘录</h4>
            <p>{selectedText || '保存关键段落为文档摘录'}</p>
            <button type="button" onClick={onAddExcerpt} disabled={!selectedText}>保存摘录</button>
            <div className={styles.list}>
              {excerpts.slice(0, 4).map(mark => (
                <article key={mark.id} className={styles.item}>
                  <span>{mark.text}</span>
                  <div className={styles.rowActions}>
                    <button type="button" onClick={() => onJumpToMark(mark)} aria-label={`跳到摘录 ${mark.text}`}>跳到</button>
                    <button type="button" onClick={() => onRemoveMark(mark.id)} aria-label={`删除摘录 ${mark.text}`}>删除</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h4>分栏阅读</h4>
            <p>当前：{layoutMode === 'columns' ? '双页' : layoutMode === 'split' ? '分屏' : '单页'}</p>
            <div className={styles.segmented}>
              <button className={layoutMode === 'single' ? styles.activeSegment : ''} type="button" onClick={() => onSetLayoutMode('single')}>单页</button>
              <button className={layoutMode === 'columns' ? styles.activeSegment : ''} type="button" onClick={() => onSetLayoutMode('columns')}>双页</button>
              <button className={layoutMode === 'split' ? styles.activeSegment : ''} type="button" onClick={() => onSetLayoutMode('split')}>分屏</button>
            </div>
          </section>

          <section className={styles.section}>
            <h4>图片/表格</h4>
            <p>集中跳转图片、表格，也可配合图片预览查看</p>
            <button type="button" onClick={onOpenMediaGallery}>打开图片/表格导航</button>
          </section>

          <section className={styles.section}>
            <h4>对比阅读</h4>
            <p>把右侧文档同步到接近当前阅读进度的位置</p>
            <button type="button" onClick={onSyncComparison}>同步对比位置</button>
          </section>

          <section className={styles.section}>
            <h4>无障碍</h4>
            <p>朗读 {accessibility?.ttsRate ?? 1}x · 行距 {accessibility?.lineHeight ?? 1.65} · {accessibility?.reduceMotion ? '减少动画' : '标准动画'}</p>
            <div className={styles.rowActions}>
              <button type="button" onClick={() => onUpdateAccessibility({ ttsRate: Math.min(1.8, (accessibility?.ttsRate ?? 1) + 0.1) })}>提高朗读速度</button>
              <button type="button" onClick={() => onUpdateAccessibility({ lineHeight: Math.min(2.4, (accessibility?.lineHeight ?? 1.65) + 0.1) })}>增加行距</button>
              <button type="button" onClick={() => onUpdateAccessibility({ paragraphSpacing: Math.min(2.2, (accessibility?.paragraphSpacing ?? 1) + 0.1) })}>增加段距</button>
              <button type="button" onClick={() => onUpdateAccessibility({ reduceMotion: !accessibility?.reduceMotion })}>切换减少动画</button>
              <button type="button" onClick={() => onUpdateAccessibility({ highContrastHighlights: !accessibility?.highContrastHighlights })}>切换高对比高亮</button>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}
