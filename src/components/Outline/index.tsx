import { OutlineItem } from '../../hooks/useOutline'
import styles from './Outline.module.css'

interface Props {
  items: OutlineItem[]
  onItemClick: (id: string) => void
}

export function Outline({ items, onItemClick }: Props) {
  if (items.length === 0) {
    return <div className={styles.empty}>暂无目录</div>
  }

  return (
    <nav className={styles.outline}>
      <div className={styles.title}>目录</div>
      <ul className={styles.list}>
        {items.map((item, index) => (
          <li
            key={index}
            className={styles.item}
            style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
          >
            <button 
              className={styles.link}
              onClick={() => onItemClick(item.id)}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
