import { OutlineItem } from '../../hooks/useOutline'
import styles from './Minimap.module.css'

interface MinimapProps {
  outlineItems: OutlineItem[]
  activeHeadingId: string | null
  onNavigate: (id: string) => void
  contentLength: number
}

export function Minimap({ outlineItems, activeHeadingId, onNavigate, contentLength }: MinimapProps) {
  if (outlineItems.length === 0) return null

  const total = Math.max(contentLength, 1)

  const sections = outlineItems.map((item, i) => {
    const start = item.position
    const end = i + 1 < outlineItems.length ? outlineItems[i + 1].position : contentLength
    const length = Math.max(end - start, 0)
    const heightPercent = (length / total) * 100
    const isActive = item.id === activeHeadingId
    return { item, heightPercent, isActive }
  })

  const activeItem = outlineItems.find(i => i.id === activeHeadingId)
  const indicatorTop = activeItem ? (activeItem.position / total) * 100 : 0

  return (
    <div className={styles.minimap}>
      {sections.map(({ item, heightPercent, isActive }, i) => (
        <button
          key={`${item.id}-${i}`}
          type="button"
          className={`${styles.block} ${isActive ? styles.active : ''}`}
          style={{ height: `${heightPercent}%` }}
          onClick={() => onNavigate(item.id)}
          title={item.text}
        />
      ))}
      <div className={styles.indicator} style={{ top: `${indicatorTop}%` }} />
    </div>
  )
}
