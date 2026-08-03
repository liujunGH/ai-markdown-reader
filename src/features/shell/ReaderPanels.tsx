/**
 * ReaderPanels —— 条件渲染的面板/浮层聚合
 *
 * 把 uiStore 面板开关映射到组件渲染。props 简单的组件直接接入；
 * 复杂面板（需大量派生数据）用占位提示，后续逐步完善。
 */
import { useMemo, useState } from 'react'
import { useUIStore, useTabStore } from '../../state'
import { SourceView } from '../../components/SourceView'
import { ProgressBar } from '../../components/ProgressBar'
import { FloatingTOC } from '../../components/FloatingTOC'
import { Minimap } from '../../components/Minimap'
import KeyboardShortcuts from '../../components/KeyboardShortcuts'
import { FirstUseGuide } from '../../components/FirstUseGuide'
import { getContent } from '../../resources/DocumentCache'
import { useDocument } from '../../rendering/hooks/useDocument'
import { scrollToHeading } from '../../app/readerScrollRegistry'
import { useScrollSpy } from '../../rendering/hooks/useScrollSpy'
import type { OutlineItem } from '../../hooks/useOutline'
import styles from './ReaderPanels.module.css'

function PanelOverlay({ title, onClose, children }: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <strong>{title}</strong>
          <button type="button" onClick={onClose} className={styles.closeBtn}>×</button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}

export function ReaderPanels() {
  const panels = useUIStore((s) => s.panels)
  const closePanel = useUIStore((s) => s.closePanel)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const activeTab = useTabStore((s) => s.tabs.find((t) => t.id === s.activeTabId))
  const content = useMemo(() => getContent(activeTabId) ?? '', [activeTabId])

  const { document } = useDocument(activeTabId, activeTab?.filePath)
  const activeHeadingId = useScrollSpy('main')
  const outlineItems = useMemo<OutlineItem[]>(
    () => (document?.outline ?? []).map((o) => ({ level: o.level, text: o.text, id: o.id, position: o.line })),
    [document]
  )

  return (
    <>
      {/* 源码视图（全屏覆盖） */}
      {panels.source && !panels.focusMode && content && (
        <div className={styles.sourceView}>
          <SourceView
            content={content}
            highlightedLine={undefined}
            editable={Boolean(activeTab?.filePath)}
            onSave={async (newContent: string) => {
              const api = window.electronAPI
              if (api && activeTab?.filePath) {
                await api.updateMarkdownFile(activeTab.filePath, newContent)
              }
            }}
          />
          <button type="button" className={styles.closeSourceBtn} onClick={() => closePanel('source')}>退出源码</button>
        </div>
      )}

      {/* 专注模式退出按钮 */}
      {panels.focusMode && (
        <div className={styles.focusExit}>
          <button type="button" onClick={() => closePanel('focusMode')}>退出专注</button>
        </div>
      )}

      {/* 阅读辅助（非源码模式时显示） */}
      {content && !panels.source && !panels.focusMode && (
        <>
          <ProgressBar />
          <FloatingTOC
            outlineItems={outlineItems}
            activeHeadingId={activeHeadingId}
            onNavigate={(id) => scrollToHeading(id)}
          />
          <Minimap
            outlineItems={outlineItems}
            activeHeadingId={activeHeadingId}
            onNavigate={(id) => scrollToHeading(id)}
            contentLength={content.length}
          />
        </>
      )}

      {/* 键盘快捷键面板 */}
      {panels.keyboardShortcuts && !panels.focusMode && (
        <PanelOverlay title="键盘快捷键" onClose={() => closePanel('keyboardShortcuts')}>
          <KeyboardShortcuts onClose={() => closePanel('keyboardShortcuts')} />
        </PanelOverlay>
      )}

      {/* 首次使用引导（仅未看过时显示） */}
      <FirstUseGuideConditional />
    </>
  )
}

/** 条件渲染首次引导（useState 初始化时检查 localStorage，避免渲染时序问题） */
function FirstUseGuideConditional() {
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem('has-seen-guide') === '1'
    } catch {
      return true
    }
  })
  if (seen) return null
  const markSeen = () => {
    try {
      localStorage.setItem('has-seen-guide', '1')
    } catch {
      // ignore
    }
    setSeen(true)
  }
  return <FirstUseGuide onComplete={markSeen} onSkip={markSeen} />
}
