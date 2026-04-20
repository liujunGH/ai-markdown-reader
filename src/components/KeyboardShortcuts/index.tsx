import { useEffect, useRef } from 'react'
import styles from './KeyboardShortcuts.module.css'

interface KeyboardShortcutsProps {
  onClose: () => void
}

const shortcuts = [
  {
    category: '导航',
    items: [
      { keys: ['Ctrl', 'F'], description: '搜索' },
      { keys: ['Ctrl', 'S'], description: '切换源码视图' },
      { keys: ['Ctrl', 'G'], description: '快速跳转' },
      { keys: ['↑', '↓'], description: '搜索结果导航' },
      { keys: ['Enter'], description: '下一个搜索结果' },
      { keys: ['Shift', 'Enter'], description: '上一个搜索结果' },
    ],
  },
  {
    category: '视图',
    items: [
      { keys: ['Ctrl', '='], description: '放大字体' },
      { keys: ['Ctrl', '-'], description: '缩小字体' },
      { keys: ['F11'], description: '切换全屏' },
      { keys: ['Ctrl', 'P'], description: '打印' },
      { keys: ['Ctrl', 'O'], description: '打开文件' },
    ],
  },
  {
    category: '专注模式',
    items: [
      { keys: ['Ctrl', '.'], description: '开启/关闭专注模式' },
      { keys: ['Esc'], description: '退出专注模式' },
    ],
  },
  {
    category: '其他',
    items: [
      { keys: ['Ctrl', '/'], description: '显示快捷键面板' },
      { keys: ['Esc'], description: '关闭弹窗' },
    ],
  },
]

function KeyboardShortcuts({ onClose }: KeyboardShortcutsProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const formatKey = (key: string) => {
    const keyMap: Record<string, string> = {
      'Ctrl': '⌃',
      'Shift': '⇧',
      'Alt': '⌥',
      'Enter': '↵',
      'Esc': 'Esc',
      '↑': '↑',
      '↓': '↓',
    }
    return keyMap[key] || key
  }

  return (
    <div className={styles.overlay}>
      <div ref={modalRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
        <div className={styles.header}>
          <h2 id="shortcuts-title" className={styles.title}>键盘快捷键</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭快捷键面板">×</button>
        </div>
        <div className={styles.content}>
          {shortcuts.map((section) => (
            <div key={section.category} className={styles.section}>
              <h3 className={styles.sectionTitle}>{section.category}</h3>
              <div className={styles.list}>
                {section.items.map((item, index) => (
                  <div key={index} className={styles.item}>
                    <div className={styles.keys}>
                      {item.keys.map((key, i) => (
                        <span key={i}>
                          <kbd className={styles.key}>{formatKey(key)}</kbd>
                          {i < item.keys.length - 1 && <span className={styles.plus}>+</span>}
                        </span>
                      ))}
                    </div>
                    <span className={styles.description}>{item.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default KeyboardShortcuts
