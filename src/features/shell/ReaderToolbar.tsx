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

  const btn = (onClick: () => void, title: string, tooltip: string, icon: string) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      data-tooltip={tooltip}
      aria-label={tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        border: '1px solid var(--border, #e0e0e0)',
        borderRadius: 6,
        background: 'transparent',
        cursor: 'pointer',
        fontSize: 14,
        color: 'var(--text-primary)',
      }}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {btn(() => void openFileDialog(), '打开文件', '打开本地 Markdown 文件', '📂')}
      {btn(openExample, '示例', '打开示例文档', '📄')}
      {btn(() => togglePanel('search'), '搜索', '搜索文档内容', '🔍')}
      {btn(() => togglePanel('fileSidebar'), '文件', '文件/工作区面板', '📁')}
      {btn(() => togglePanel('outline'), '目录', '文档目录大纲', '📑')}
      {btn(() => togglePanel('source'), '源码', '查看 Markdown 源码', '📄')}
      {btn(() => togglePanel('focusMode'), '专注', '进入专注模式', '🎯')}
      {btn(() => setFontSize(Math.max(12, fontSize - 1)), '缩小', '缩小字号', 'A-')}
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 20, textAlign: 'center' }}>{fontSize}</span>
      {btn(() => setFontSize(Math.min(32, fontSize + 1)), '放大', '放大字号', 'A+')}
      {btn(() => togglePanel('commandPalette'), '命令', '打开命令面板', '⌘')}
      {btn(() => togglePanel('readingTools'), '阅读工具', '阅读工具面板', '📖')}
      {btn(() => togglePanel('globalSearch'), '全局搜索', '全局搜索', '🔎')}
      {btn(() => togglePanel('exportPanel'), '导出', '导出文档', '📤')}
      <div style={{ marginLeft: 'auto' }}>
        <ThemeToggle />
      </div>
    </div>
  )
}
