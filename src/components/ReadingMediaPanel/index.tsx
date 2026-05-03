import { useMemo, useState } from 'react'
import type { ReadingMediaItem } from '../../utils/readingExperience'
import styles from './ReadingMediaPanel.module.css'

interface Props {
  items: ReadingMediaItem[]
  activeId?: string | null
  onJumpToLine: (line: number) => void
  onCopy: (text: string, label: string) => void
  onClose: () => void
}

export function ReadingMediaPanel({ items, activeId, onJumpToLine, onCopy, onClose }: Props) {
  const initialIndex = Math.max(0, items.findIndex(item => item.id === activeId))
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const activeItem = items[activeIndex] || items[0]
  const tableRows = useMemo(() => (
    activeItem?.type === 'table' ? parseMarkdownTable(activeItem.markdown || '') : []
  ), [activeItem])

  const move = (offset: number) => {
    if (items.length === 0) return
    setActiveIndex(index => (index + offset + items.length) % items.length)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.panel} onClick={event => event.stopPropagation()} aria-label="图片和表格阅读">
        <header className={styles.header}>
          <div>
            <h3>{activeItem?.type === 'table' ? '表格全屏阅读' : '图片序列'}</h3>
            <p>{items.length} 个媒体项 · {activeItem ? `行 ${activeItem.line}` : '暂无媒体'}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={styles.toolbar}>
          <button type="button" onClick={() => move(-1)} disabled={items.length <= 1}>上一项</button>
          <button type="button" onClick={() => move(1)} disabled={items.length <= 1}>下一项</button>
          <button type="button" onClick={() => activeItem && onJumpToLine(activeItem.line)} disabled={!activeItem}>定位正文</button>
          {activeItem?.type === 'image' && activeItem.src && (
            <button type="button" onClick={() => onCopy(activeItem.src || '', '图片地址已复制')}>复制路径</button>
          )}
          {activeItem?.type === 'table' && (
            <>
              <button type="button" onClick={() => onCopy(activeItem.markdown || '', 'Markdown 表格已复制')}>复制 Markdown</button>
              <button type="button" onClick={() => onCopy(activeItem.csv || '', 'CSV 已复制')}>复制 CSV</button>
            </>
          )}
        </div>

        <div className={styles.content}>
          {!activeItem ? (
            <div className={styles.empty}>当前文档没有图片或表格</div>
          ) : activeItem.type === 'image' ? (
            <figure className={styles.imageStage}>
              <img src={activeItem.src} alt={activeItem.alt || activeItem.label} />
              <figcaption>{activeItem.label}</figcaption>
            </figure>
          ) : (
            <div className={styles.tableStage}>
              <table>
                <tbody>
                  {tableRows.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      {row.map((cell, cellIndex) => rowIndex === 0 ? (
                        <th key={`cell-${rowIndex}-${cellIndex}`}>{cell}</th>
                      ) : (
                        <td key={`cell-${rowIndex}-${cellIndex}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function parseMarkdownTable(markdown: string): string[][] {
  return markdown.split('\n')
    .map(line => line.trim())
    .filter((line, index) => line && (index !== 1 || !/^\|\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(line)))
    .map(line => line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim()))
}
