import { useState, useRef, useEffect } from 'react'
import { Tab } from '../../types/Tab'
import styles from './TabBar.module.css'

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string | null
  onTabSelect: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onTabCloseOthers: (tabId: string) => void
  onTabCloseAll: () => void
  onNewTab: () => void
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  tabId: string | null
}

export function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabCloseOthers,
  onTabCloseAll,
  onNewTab
}: TabBarProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    tabId: null
  })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }))
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
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

  const contextMenuItems = [
    { label: '复制文件名称', onClick: handleCopyFileName },
    { type: 'separator' as const },
    { label: '关闭该标签', onClick: handleCloseTab },
    { label: '关闭其他标签', onClick: handleCloseOtherTabs, disabled: tabs.length <= 1 },
    { label: '关闭所有标签', onClick: handleCloseAllTabs, disabled: tabs.length <= 1 },
  ]

  return (
    <div className={styles.tabBar}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''}`}
            onClick={() => onTabSelect(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
            title={tab.filePath ? `${tab.name}\n${tab.filePath}` : tab.name}
          >
            <span className={styles.tabName}>
              {tab.name}
            </span>
            {tabs.length > 1 && (
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
              >
                {item.label}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
