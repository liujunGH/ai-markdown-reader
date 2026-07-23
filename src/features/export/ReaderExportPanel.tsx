/**
 * ReaderExportPanel v2 —— 导出面板容器（复用现有 ExportPanel）
 *
 * ExportPanel 是纯展示（fileContent/filePath/theme 等props）。
 * v2 从 DocumentCache 取激活标签的 fileContent，主题从 ThemeContext 取。
 */
import { useTabStore, useUIStore } from '../../state'
import { getContent } from '../../resources/DocumentCache'
import { useTheme } from '../../context/ThemeContext'
import { ExportPanel } from '../../components/ExportPanel'

export function ReaderExportPanel() {
  const isOpen = useUIStore((s) => s.panels.exportPanel)
  const closePanel = useUIStore((s) => s.closePanel)
  const activeTab = useTabStore((s) => s.tabs.find((t) => t.id === s.activeTabId))
  const { theme, accentColor } = useTheme()

  const fileContent = activeTab ? getContent(activeTab.id) ?? '' : ''

  return (
    <ExportPanel
      isOpen={isOpen}
      onClose={() => closePanel('exportPanel')}
      fileName={activeTab?.name ?? ''}
      fileContent={fileContent}
      filePath={activeTab?.filePath}
      theme={theme}
      accentColor={accentColor}
    />
  )
}
