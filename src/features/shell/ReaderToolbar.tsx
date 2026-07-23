/**
 * ReaderToolbar v2 —— 工具栏（整合 shell 按钮）
 *
 * 复用现有 ThemeToggle（已用 useTheme Context，无 store 依赖）。
 * 文件打开接 useDocumentActions.openFileDialog。
 * 其余 shell 功能（字号/专注/源码/大纲）接 uiStore。
 */
import { ThemeToggle } from '../../components/ThemeToggle'
import { useUIStore } from '../../state'
import { useDocumentActions } from '../../app/useDocumentActions'

export function ReaderToolbar() {
  const togglePanel = useUIStore((s) => s.togglePanel)
  const setFontSize = useUIStore((s) => s.setFontSize)
  const fontSize = useUIStore((s) => s.fontSize)
  const { openFileDialog, openExample } = useDocumentActions()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button type="button" onClick={() => void openFileDialog()} title="打开文件">📂</button>
      <button type="button" onClick={openExample} title="示例">📄</button>
      <button type="button" onClick={() => togglePanel('search')} title="搜索">🔍</button>
      <button type="button" onClick={() => togglePanel('fileSidebar')} title="文件">📁</button>
      <button type="button" onClick={() => togglePanel('outline')} title="目录">📑</button>
      <button type="button" onClick={() => togglePanel('source')} title="源码">📄</button>
      <button type="button" onClick={() => togglePanel('focusMode')} title="专注">🎯</button>
      <button type="button" onClick={() => setFontSize(Math.max(12, fontSize - 1))} title="缩小">A-</button>
      <span style={{ fontSize: 12, color: '#888' }}>{fontSize}</span>
      <button type="button" onClick={() => setFontSize(Math.min(32, fontSize + 1))} title="放大">A+</button>
      <button type="button" onClick={() => togglePanel('commandPalette')} title="命令">⌘</button>
      <div style={{ marginLeft: 'auto' }}>
        <ThemeToggle />
      </div>
    </div>
  )
}
