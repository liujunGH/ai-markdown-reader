import { useState, useRef, useEffect } from 'react'
import { Tab, TabColor } from '../../types/Tab'
import styles from './TabBar.module.css'

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string | null
  onTabSelect: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onTabCloseOthers: (tabId: string) => void
  onTabCloseAll: () => void
  onNewTab: () => void
  onTabReorder: (fromIndex: number, toIndex: number) => void
  onTabPin: (tabId: string) => void
  onTabUnpin: (tabId: string) => void
  onTabColor: (tabId: string, color: TabColor) => void
  onRestoreTab?: () => void
  closedTabsCount?: number
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  tabId: string | null
}



interface ColorPickerState {
  visible: boolean
  x: number
  y: number
  tabId: string | null
}

function formatFileSize(size?: number): string {
  if (size === undefined) return '未知'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(timestamp?: number): string {
  if (timestamp === undefined) return '未知'
  return new Date(timestamp).toLocaleString('zh-CN')
}

function getContentPreview(content: string): string {
  const lines = content.split('\n').slice(0, 3)
  let preview = lines.join('\n')
  if (preview.length > 100) {
    preview = preview.slice(0, 100) + '...'
  }
  return preview
}

export function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabCloseOthers,
  onTabCloseAll,
  onNewTab,
  onTabReorder,
  onTabPin,
  onTabUnpin,
  onTabColor,
  onRestoreTab,
  closedTabsCount = 0
}: TabBarProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    tabId: null
  })
  const [colorPicker, setColorPicker] = useState<ColorPickerState>({
    visible: false,
    x: 0,
    y: 0,
    tabId: null
  })
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const tooltipTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }))
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setColorPicker(prev => ({ ...prev, visible: false }))
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current)
      }
    }
  }, [])

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      tabId
    })
  }

  const handleCopyFileName = () => {
    const tab = tabs.find(t => t.id === contextMenu.tabId)
    if (tab) {
      navigator.clipboard.writeText(tab.name)
    }
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleCopyFilePath = () => {
    const tab = tabs.find(t => t.id === contextMenu.tabId)
    if (tab?.filePath) {
      navigator.clipboard.writeText(tab.filePath)
    }
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleShowInFinder = () => {
    const tab = tabs.find(t => t.id === contextMenu.tabId)
    if (tab?.filePath && window.electronAPI) {
      window.electronAPI.showInFolder(tab.filePath)
    }
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleCloseTab = () => {
    if (contextMenu.tabId) {
      onTabClose(contextMenu.tabId)
    }
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleCloseOtherTabs = () => {
    if (contextMenu.tabId) {
      onTabCloseOthers(contextMenu.tabId)
    }
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleCloseAllTabs = () => {
    onTabCloseAll()
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleRestoreTab = () => {
    onRestoreTab?.()
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handlePin = () => {
    if (contextMenu.tabId) {
      onTabPin(contextMenu.tabId)
    }
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleUnpin = () => {
    if (contextMenu.tabId) {
      onTabUnpin(contextMenu.tabId)
    }
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleShowColorPicker = () => {
    setContextMenu(prev => ({ ...prev, visible: false }))
    setColorPicker({
      visible: true,
      x: contextMenu.x,
      y: contextMenu.y,
      tabId: contextMenu.tabId
    })
  }

  const handleColor = (color: TabColor) => {
    if (colorPicker.tabId) {
      onTabColor?.(colorPicker.tabId, color)
    }
    setColorPicker(prev => ({ ...prev, visible: false }))
  }

  const contextMenuTab = tabs.find(t => t.id === contextMenu.tabId)

  const contextMenuItems = [
    { label: '复制文件名称', onClick: handleCopyFileName },
    { label: '复制文件路径', onClick: handleCopyFilePath, disabled: !contextMenuTab?.filePath },
    { label: '在 Finder 中显示', onClick: handleShowInFinder, disabled: !contextMenuTab?.filePath },
    { type: 'separator' },
    contextMenuTab?.isPinned
      ? { label: '取消固定', onClick: handleUnpin }
      : { label: '固定标签', onClick: handlePin },
    { label: '标记颜色', onClick: handleShowColorPicker },
    { type: 'separator' },
    { label: '关闭该标签', onClick: handleCloseTab },
    { label: '关闭其他标签', onClick: handleCloseOtherTabs, disabled: tabs.length <= 1 },
    { label: '关闭所有标签', onClick: handleCloseAllTabs, disabled: tabs.length <= 1 },
    { type: 'separator' },
    { label: '重新打开关闭的标签', onClick: handleRestoreTab, disabled: closedTabsCount === 0 },
  ]

  const colorOptions: { color: TabColor; label: string; className: string }[] = [
    { color: 'red', label: '红色', className: styles.colorRed },
    { color: 'orange', label: '橙色', className: styles.colorOrange },
    { color: 'yellow', label: '黄色', className: styles.colorYellow },
    { color: 'green', label: '绿色', className: styles.colorGreen },
    { color: 'blue', label: '蓝色', className: styles.colorBlue },
    { color: 'purple', label: '紫色', className: styles.colorPurple },
  ]

  const handleMouseEnter = (tabId: string) => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current)
    }
    tooltipTimerRef.current = window.setTimeout(() => {
      setHoveredTab(tabId)
    }, 300)
  }

  const handleMouseLeave = () => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current)
    }
    setHoveredTab(null)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX + 16, y: e.clientY + 16 })
  }

  const tooltipTab = hoveredTab ? tabs.find(t => t.id === hoveredTab) : null

  return (
    <div className={styles.tabBar} role="tablist" aria-label="文档标签">
      <div className={styles.tabs}>
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            role="tab"
            aria-selected={tab.id === activeTabId}
            aria-label={tab.name}
            tabIndex={tab.id === activeTabId ? 0 : -1}
            className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''} ${tab.isPinned ? styles.pinned : ''} ${draggedIndex === index ? styles.dragging : ''} ${dropTargetIndex === index ? styles.dropTarget : ''} ${tab.color && tab.color !== 'none' ? styles.hasColor : ''}`}
            onClick={() => onTabSelect(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
            draggable
            onDragStart={(e) => {
              setDraggedIndex(index)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => {
              setDraggedIndex(null)
              setDropTargetIndex(null)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              if (draggedIndex !== null && draggedIndex !== index) {
                const draggedTab = tabs[draggedIndex]
                const targetTab = tabs[index]
                if (draggedTab.isPinned !== targetTab.isPinned) {
                  e.dataTransfer.dropEffect = 'none'
                  return
                }
                e.dataTransfer.dropEffect = 'move'
                setDropTargetIndex(index)
              }
            }}
            onDragLeave={() => {
              setDropTargetIndex(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (draggedIndex !== null && draggedIndex !== index) {
                const draggedTab = tabs[draggedIndex]
                const targetTab = tabs[index]
                if (draggedTab.isPinned === targetTab.isPinned) {
                  onTabReorder(draggedIndex, index)
                }
              }
              setDraggedIndex(null)
              setDropTargetIndex(null)
            }}
            onMouseEnter={() => handleMouseEnter(tab.id)}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            title={tab.filePath ? `${tab.name}\n${tab.filePath}` : tab.name}
          >
            {tab.color && tab.color !== 'none' && (
              <span className={`${styles.tabColor} ${styles[`tabColor${tab.color.charAt(0).toUpperCase() + tab.color.slice(1)}`]}`} />
            )}
            {tab.isPinned && (
              <span className={styles.pinIcon}>📌</span>
            )}
            <span className={styles.tabName}>
              {tab.isPinned ? tab.name.slice(0, 4) : tab.name}
            </span>
            {!tab.isPinned && tabs.length > 1 && (
              <button
                className={styles.closeBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  onTabClose(tab.id)
                }}
                title="关闭标签"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <div className={styles.actions}>
        <button
          className={styles.actionBtn}
          onClick={onNewTab}
          title="新建标签 (Ctrl+T)"
          role="tab"
          aria-label="新建标签"
        >
          +
        </button>
        {tabs.length > 1 && (
          <button
            className={styles.actionBtn}
            onClick={onTabCloseAll}
            title="关闭所有标签"
          >
            全部关闭
          </button>
        )}
      </div>

      {contextMenu.visible && (
        <div
          ref={menuRef}
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
        >
          {contextMenuItems.map((item, index) => {
            if (item.type === 'separator') {
              return <div key={index} className={styles.separator} />
            }
            return (
              <div
                key={index}
                className={`${styles.menuItem} ${item.disabled ? styles.disabled : ''}`}
                onClick={item.disabled ? undefined : item.onClick}
                role="menuitem"
              >
                {item.label}
              </div>
            )
          })}
        </div>
      )}

      {colorPicker.visible && (
        <div
          ref={colorPickerRef}
          className={styles.colorPicker}
          style={{ left: colorPicker.x, top: colorPicker.y }}
        >
          <div className={styles.colorPickerTitle}>标记颜色</div>
          <div className={styles.colorGrid}>
            {colorOptions.map(option => (
              <button
                key={option.color}
                className={`${styles.colorOption} ${option.className}`}
                title={option.label}
                onClick={() => handleColor(option.color)}
              />
            ))}
          </div>
          <div className={styles.separator} />
          <button
            className={styles.clearColorBtn}
            onClick={() => handleColor('none')}
          >
            清除颜色
          </button>
        </div>
      )}

      {tooltipTab && (
        <div
          className={styles.tooltip}
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className={styles.tooltipName}>{tooltipTab.name}</div>
          {tooltipTab.filePath && (
            <div className={styles.tooltipPath}>{tooltipTab.filePath}</div>
          )}
          <div className={styles.tooltipMeta}>
            <span>大小: {formatFileSize(tooltipTab.size)}</span>
            <span>修改: {formatDate(tooltipTab.lastModified)}</span>
          </div>
          <div className={styles.tooltipPreview}>
            {getContentPreview(tooltipTab.content)}
          </div>
        </div>
      )}
    </div>
  )
}
