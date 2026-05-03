import type {
  ReaderMark,
  ReadLaterItem,
  ReadLaterStatus,
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
  onAddHighlight: () => void
  onAddExcerpt: () => void
  onAddReadLater: () => void
  onOpenReadLater: (item: ReadLaterItem) => void
  onUpdateReadLaterStatus: (id: string, status: ReadLaterStatus) => void
  onResume: () => void
  onApplyPreset: (preset: ReadingPreset) => void
  onJumpToLandmark: (landmark: ReadingLandmark) => void
  onSetLayoutMode: (mode: ReadingLayoutMode) => void
  onRemoveMark: (id: string) => void
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
  onAddHighlight,
  onAddExcerpt,
  onAddReadLater,
  onOpenReadLater,
  onUpdateReadLaterStatus,
  onResume,
  onApplyPreset,
  onJumpToLandmark,
  onSetLayoutMode,
  onRemoveMark,
  onClose,
}: Props) {
  const highlights = marks.filter(mark => mark.kind === 'highlight')
  const excerpts = marks.filter(mark => mark.kind === 'excerpt')

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.panel} onClick={event => event.stopPropagation()} aria-label="阅读工具">
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
                  <button type="button" onClick={() => onRemoveMark(mark.id)} aria-label={`删除高亮 ${mark.text}`}>删除</button>
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
                  <button type="button" onClick={() => onRemoveMark(mark.id)} aria-label={`删除摘录 ${mark.text}`}>删除</button>
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
        </div>
      </section>
    </div>
  )
}
