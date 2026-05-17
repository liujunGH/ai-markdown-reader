import { useEffect, useRef, useState } from 'react'
import type { PanelName } from '../../stores'
import styles from './ToolsMenu.module.css'

interface ToolItem {
  id?: PanelName
  label: string
  icon: string
  action?: ToolAction
  active?: boolean
}

interface ToolSection {
  title: string
  items: ToolItem[]
}

interface Props {
  isActive: boolean
  buttonClassName: string
  activeButtonClassName: string
  onOpenPanel: (panel: PanelName) => void
  showSource: boolean
  showFocusMode: boolean
  fontSize: number
  onToggleSource: () => void
  onToggleFocusMode: () => void
  onZoomIn: () => void
  onZoomOut: () => void
}

type ToolAction = 'toggleSource' | 'toggleFocusMode' | 'zoomIn' | 'zoomOut'

function buildSections(showSource: boolean, showFocusMode: boolean): ToolSection[] {
  return [
  {
    title: '阅读',
    items: [
      { id: 'readingTools', label: '阅读工具', icon: '◫' },
      { id: 'readingTimeline', label: '阅读时间线', icon: '◷' },
      { label: '专注模式', icon: '🎯', action: 'toggleFocusMode', active: showFocusMode },
      { label: '放大字体', icon: 'A+', action: 'zoomIn' },
      { label: '缩小字体', icon: 'A-', action: 'zoomOut' },
    ],
  },
  {
    title: '查找与导航',
    items: [
      { id: 'search', label: '文内搜索', icon: '⌕' },
      { id: 'globalSearch', label: '全局搜索', icon: '⌕' },
      { id: 'quickJump', label: '快速跳转', icon: '↗' },
      { id: 'indexDiagnostics', label: '索引诊断', icon: '!' },
    ],
  },
  {
    title: '视图与导出',
    items: [
      { label: showSource ? '返回阅读视图' : '源码视图', icon: '📄', action: 'toggleSource', active: showSource },
      { id: 'exportPanel', label: '导出', icon: '📤' },
      { id: 'fileInfo', label: '文件信息', icon: 'ℹ' },
    ],
  },
]
}

export function ToolsMenu({
  isActive,
  buttonClassName,
  activeButtonClassName,
  onOpenPanel,
  showSource,
  showFocusMode,
  fontSize,
  onToggleSource,
  onToggleFocusMode,
  onZoomIn,
  onZoomOut,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const sections = buildSections(showSource, showFocusMode)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  const openTool = (panel: PanelName) => {
    onOpenPanel(panel)
    setIsOpen(false)
  }

  const runAction = (action: ToolAction) => {
    if (action === 'toggleSource') onToggleSource()
    if (action === 'toggleFocusMode') onToggleFocusMode()
    if (action === 'zoomIn') onZoomIn()
    if (action === 'zoomOut') onZoomOut()
    setIsOpen(false)
  }

  return (
    <div className={styles.menu} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        className={`${buttonClassName} ${isActive ? activeButtonClassName : ''}`}
        aria-label="工具"
        aria-expanded={isOpen}
        data-guide="tools"
        data-tooltip="工具"
      >
        🧰
      </button>
      {isOpen && (
        <div className={styles.dropdown} role="menu">
          <div className={styles.fontStatus}>字号 {fontSize}</div>
          {sections.map(section => (
            <section className={styles.section} key={section.title} aria-label={section.title}>
              <div className={styles.sectionTitle}>{section.title}</div>
              {section.items.map(item => (
                <button
                  key={item.id || item.action || item.label}
                  type="button"
                  role="menuitem"
                  className={item.active ? styles.activeItem : undefined}
                  onClick={() => item.action ? runAction(item.action) : item.id && openTool(item.id)}
                >
                  <span className={styles.icon}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
