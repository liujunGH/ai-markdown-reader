/**
 * TabBar v2 —— 标签栏（直接订阅 tabStore）
 *
 * 与旧 TabBar（src/components/TabBar）的迁移差异：
 *  - 旧版接收 13 个 props（tabs + 11 回调）；v2 直接从 tabStore 订阅状态 + 调 action
 *  - 旧版依赖 Tab.content（tooltip 内容预览）；v2 从 DocumentCache 取 content（LRU 资源层）
 *  - 这是后续组件迁移的模板：组件自治，不通过 props 接收 store 状态
 *
 * 视觉/交互/右键菜单/拖拽排序/固定/颜色 完全复刻旧版（复用 TabBar.module.css）。
 */
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { TabColor } from '../../types/Tab'
import { useTabStore } from '../../state'
import { getContent } from '../../resources/DocumentCache'
import styles from '../../components/TabBar/TabBar.module.css'

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

function formatFileSize(size?: number, t?: (key: string) => string): string {
  if (size === undefined) return t ? t('common.unknown') : 'Unknown'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(timestamp?: number): string {
  if (timestamp === undefined) return ''
  return new Date(timestamp).toLocaleString('zh-CN')
}

function getContentPreview(content: string | undefined): string {
  if (!content) return ''
  const lines = content.split('\n').slice(0, 3)
  let preview = lines.join('\n')
  if (preview.length > 100) {
    preview = preview.slice(0, 100) + '...'
  }
  return preview
}

export function TabBar() {
  const { t } = useTranslation()
  // 直接从 store 订阅（selector：tabs/activeTabId/closedTabs 变化才重渲染）
  const tabs = useTabStore((s) => s.tabs)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const closedTabsCount = useTabStore((s) => s.closedTabs.length)

  // actions（getState 取，避免重渲染）
  const selectTab = useTabStore((s) => s.selectTab)
  const closeTab = useTabStore((s) => s.closeTab)
  const closeOtherTabs = useTabStore((s) => s.closeOtherTabs)
  const closeAllTabs = useTabStore((s) => s.closeAllTabs)
  const newTab = useTabStore((s) => s.newTab)
  const reorderTabs = useTabStore((s) => s.reorderTabs)
  const pinTab = useTabStore((s) => s.pinTab)
  const unpinTab = useTabStore((s) => s.unpinTab)
  const setTabColor = useTabStore((s) => s.setTabColor)
  const restoreTab = useTabStore((s) => s.restoreTab)

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    tabId: null,
  })
  const [colorPicker, setColorPicker] = useState<ColorPickerState>({
    visible: false,
    x: 0,
    y: 0,
    tabId: null,
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
        setContextMenu((prev) => ({ ...prev, visible: false }))
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setColorPicker((prev) => ({ ...prev, visible: false }))
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
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, tabId })
  }

  const handleCopyFileName = () => {
    const tab = tabs.find((tb) => tb.id === contextMenu.tabId)
    if (tab) navigator.clipboard.writeText(tab.name)
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  const handleCopyFilePath = () => {
    const tab = tabs.find((tb) => tb.id === contextMenu.tabId)
    if (tab?.filePath) navigator.clipboard.writeText(tab.filePath)
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  const handleShowInFinder = () => {
    const tab = tabs.find((tb) => tb.id === contextMenu.tabId)
    if (tab?.filePath && window.electronAPI) {
      void window.electronAPI.showInFolder(tab.filePath)
    }
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  const handleCloseTab = () => {
    if (contextMenu.tabId) closeTab(contextMenu.tabId)
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }
  const handleCloseOtherTabs = () => {
    if (contextMenu.tabId) closeOtherTabs(contextMenu.tabId)
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }
  const handleCloseAllTabs = () => {
    closeAllTabs()
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }
  const handleRestoreTab = () => {
    restoreTab()
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }
  const handlePin = () => {
    if (contextMenu.tabId) pinTab(contextMenu.tabId)
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }
  const handleUnpin = () => {
    if (contextMenu.tabId) unpinTab(contextMenu.tabId)
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }
  const handleShowColorPicker = () => {
    setContextMenu((prev) => ({ ...prev, visible: false }))
    setColorPicker({
      visible: true,
      x: contextMenu.x,
      y: contextMenu.y,
      tabId: contextMenu.tabId,
    })
  }
  const handleColor = (color: TabColor) => {
    if (colorPicker.tabId) setTabColor(colorPicker.tabId, color)
    setColorPicker((prev) => ({ ...prev, visible: false }))
  }

  const contextMenuTab = tabs.find((tb) => tb.id === contextMenu.tabId)
  const contextMenuItems = [
    { label: t('tabBar.copyFileName'), onClick: handleCopyFileName },
    { label: t('tabBar.copyFilePath'), onClick: handleCopyFilePath, disabled: !contextMenuTab?.filePath },
    { label: t('tabBar.showInFinder'), onClick: handleShowInFinder, disabled: !contextMenuTab?.filePath },
    { type: 'separator' as const },
    contextMenuTab?.isPinned
      ? { label: t('tabBar.unpin'), onClick: handleUnpin }
      : { label: t('tabBar.pin'), onClick: handlePin },
    { label: t('tabBar.markColor'), onClick: handleShowColorPicker },
    { type: 'separator' as const },
    { label: t('tabBar.closeThisTab'), onClick: handleCloseTab },
    { label: t('tabBar.closeOtherTabs'), onClick: handleCloseOtherTabs, disabled: tabs.length <= 1 },
    { label: t('tabBar.closeAllTabs'), onClick: handleCloseAllTabs, disabled: tabs.length <= 1 },
    { type: 'separator' as const },
    { label: t('tabBar.reopenClosedTab'), onClick: handleRestoreTab, disabled: closedTabsCount === 0 },
  ]

  const colorOptions: { color: TabColor; label: string; className: string }[] = [
    { color: 'red', label: t('colors.red'), className: styles.colorRed },
    { color: 'orange', label: t('colors.orange'), className: styles.colorOrange },
    { color: 'yellow', label: t('colors.yellow'), className: styles.colorYellow },
    { color: 'green', label: t('colors.green'), className: styles.colorGreen },
    { color: 'blue', label: t('colors.blue'), className: styles.colorBlue },
    { color: 'purple', label: t('colors.purple'), className: styles.colorPurple },
  ]

  const handleMouseEnter = (tabId: string) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    tooltipTimerRef.current = window.setTimeout(() => {
      setHoveredTab(tabId)
    }, 300)
  }
  const handleMouseLeave = () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    setHoveredTab(null)
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX + 16, y: e.clientY + 16 })
  }

  // v2: content preview 从 DocumentCache 取（不在 store）
  const tooltipTab = hoveredTab ? tabs.find((tb) => tb.id === hoveredTab) : null
  const tooltipPreview = tooltipTab ? getContentPreview(getContent(tooltipTab.id)) : ''

  return (
    <div className={styles.tabBar} role="tablist" aria-label={t('tabBar.ariaLabel')}>
      <div className={styles.tabs}>
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            role="tab"
            aria-selected={tab.id === activeTabId}
            aria-label={tab.name}
            tabIndex={tab.id === activeTabId ? 0 : -1}
            className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''} ${tab.isPinned ? styles.pinned : ''} ${draggedIndex === index ? styles.dragging : ''} ${dropTargetIndex === index ? styles.dropTarget : ''} ${tab.color ? styles.hasColor : ''}`}
            onClick={() => selectTab(tab.id)}
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
            onDragLeave={() => setDropTargetIndex(null)}
            onDrop={(e) => {
              e.preventDefault()
              if (draggedIndex !== null && draggedIndex !== index) {
                const draggedTab = tabs[draggedIndex]
                const targetTab = tabs[index]
                if (draggedTab.isPinned === targetTab.isPinned) {
                  reorderTabs(draggedIndex, index)
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
            {tab.color && (
              <span className={`${styles.tabColor} ${styles[`tabColor${tab.color.charAt(0).toUpperCase() + tab.color.slice(1)}`]}`} />
            )}
            {tab.isPinned && <span className={styles.pinIcon}>📌</span>}
            <span className={styles.tabName}>
              {tab.isPinned ? tab.name.slice(0, 4) : tab.name}
            </span>
            {!tab.isPinned && tabs.length > 1 && (
              <button
                className={styles.closeBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
                title={t('tabBar.closeTab')}
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
          onClick={newTab}
          title={t('tabBar.newTab')}
          role="tab"
          aria-label={t('tabBar.newTab')}
        >
          +
        </button>
        {tabs.length > 1 && (
          <button className={styles.actionBtn} onClick={closeAllTabs} title={t('tabBar.closeAllTabs')}>
            {t('tabBar.closeAll')}
          </button>
        )}
      </div>

      {contextMenu.visible && (
        <div ref={menuRef} className={styles.contextMenu} style={{ left: contextMenu.x, top: contextMenu.y }} role="menu">
          {contextMenuItems.map((item, index) => {
            if (item.type === 'separator') return <div key={index} className={styles.separator} />
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
        <div ref={colorPickerRef} className={styles.colorPicker} style={{ left: colorPicker.x, top: colorPicker.y }}>
          <div className={styles.colorPickerTitle}>{t('tabBar.markColor')}</div>
          <div className={styles.colorGrid}>
            {colorOptions.map((option) => (
              <button
                key={option.color}
                className={`${styles.colorOption} ${option.className}`}
                title={option.label}
                onClick={() => handleColor(option.color)}
              />
            ))}
          </div>
          <div className={styles.separator} />
          <button className={styles.clearColorBtn} onClick={() => handleColor('none')}>
            {t('tabBar.clearColor')}
          </button>
        </div>
      )}

      {tooltipTab && (
        <div className={styles.tooltip} style={{ left: tooltipPos.x, top: tooltipPos.y }}>
          <div className={styles.tooltipName}>{tooltipTab.name}</div>
          {tooltipTab.filePath && <div className={styles.tooltipPath}>{tooltipTab.filePath}</div>}
          <div className={styles.tooltipMeta}>
            <span>{t('tabBar.size', { size: formatFileSize(tooltipTab.size, t) })}</span>
            <span>{t('tabBar.modified', { date: formatDate(tooltipTab.lastModified) })}</span>
          </div>
          <div className={styles.tooltipPreview}>{tooltipPreview}</div>
        </div>
      )}
    </div>
  )
}
