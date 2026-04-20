import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import styles from './CommandPalette.module.css'

export interface Command {
  id: string
  label: string
  shortcut?: string
  category: string
  icon?: string
  action: () => void
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  commands?: Command[]
  onExecute: (commandId: string) => void
}

const DEFAULT_COMMANDS: Command[] = [
  { id: 'open-file', label: '打开文件', shortcut: 'Ctrl+O', category: '文件', icon: '📂', action: () => {} },
  { id: 'open-folder', label: '打开文件夹', shortcut: 'Ctrl+Shift+O', category: '文件', icon: '📁', action: () => {} },
  { id: 'new-tab', label: '新建标签', shortcut: 'Ctrl+T', category: '标签', icon: '➕', action: () => {} },
  { id: 'close-tab', label: '关闭当前标签', shortcut: 'Ctrl+W', category: '标签', icon: '✕', action: () => {} },
  { id: 'toggle-source', label: '切换源码视图', shortcut: 'Ctrl+S', category: '视图', icon: '📄', action: () => {} },
  { id: 'toggle-outline', label: '显示/隐藏目录', category: '视图', icon: '📑', action: () => {} },
  { id: 'toggle-search', label: '搜索', shortcut: 'Ctrl+F', category: '视图', icon: '🔍', action: () => {} },
  { id: 'global-search', label: '全局搜索', shortcut: 'Ctrl+Shift+F', category: '视图', icon: '🔎', action: () => {} },
  { id: 'toggle-focus', label: '专注模式', shortcut: 'Ctrl+.', category: '视图', icon: '👁️', action: () => {} },
  { id: 'toggle-recent', label: '最近文件', shortcut: 'Ctrl+Shift+R', category: '视图', icon: '📜', action: () => {} },
  { id: 'toggle-theme', label: '切换主题', category: '视图', icon: '🎨', action: () => {} },
  { id: 'zoom-in', label: '放大字体', shortcut: 'Ctrl+=', category: '视图', icon: 'A+', action: () => {} },
  { id: 'zoom-out', label: '缩小字体', shortcut: 'Ctrl+-', category: '视图', icon: 'A-', action: () => {} },
  { id: 'toggle-split', label: '双栏对比', shortcut: 'Ctrl+\\', category: '视图', icon: '⚡', action: () => {} },
  { id: 'quick-jump', label: '快速跳转', shortcut: 'Ctrl+G', category: '视图', icon: '↗', action: () => {} },
  { id: 'reading-stats', label: '阅读统计', category: '视图', icon: '📊', action: () => {} },
  { id: 'custom-style', label: '自定义 CSS', category: '视图', icon: '🎨', action: () => {} },
  { id: 'export-html', label: '导出为 HTML', shortcut: 'Ctrl+E', category: '导出', icon: '📤', action: () => {} },
  { id: 'print', label: '打印', shortcut: 'Ctrl+P', category: '导出', icon: '🖨️', action: () => {} },
  { id: 'show-shortcuts', label: '显示快捷键', shortcut: 'F1', category: '帮助', icon: '⌨️', action: () => {} },
]

// 常见中文字符到拼音首字母的映射（覆盖默认命令中的字符）
const PINYIN_INITIAL_MAP: Record<string, string> = {
  '打': 'd', '开': 'k', '文': 'w', '件': 'j', '夹': 'j',
  '新': 'x', '建': 'j', '标': 'b', '签': 'q',
  '关': 'g', '闭': 'b', '当': 'd', '前': 'q',
  '切': 'q', '换': 'h', '源': 'y', '码': 'm', '视': 's', '图': 't',
  '显': 'x', '示': 's', '隐': 'y', '藏': 'c', '目': 'm', '录': 'l',
  '搜': 's', '索': 's',
  '专': 'z', '注': 'z', '模': 'm', '式': 's',
  '最': 'z', '近': 'j',
  '主': 'z', '题': 't',
  '放': 'f', '大': 'd', '字': 'z', '体': 't',
  '缩': 's', '小': 'x',
  '双': 's', '栏': 'l', '对': 'd', '比': 'b',
  '导': 'd', '出': 'c', '为': 'w',
  '印': 'y',
  '快': 'k', '捷': 'j', '键': 'j',
  '帮': 'b', '助': 'z',
  '跳': 't', '转': 'z',
  '阅': 'y', '读': 'd', '统': 't', '计': 'j',
  '自': 'z', '定': 'd', '义': 'y',
}

function getPinyinInitials(text: string): string {
  return text
    .split('')
    .map(ch => PINYIN_INITIAL_MAP[ch] || (/[a-zA-Z0-9]/.test(ch) ? ch.toLowerCase() : ''))
    .join('')
}

function fuzzyMatch(query: string, text: string): boolean {
  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()
  let queryIndex = 0
  for (let i = 0; i < lowerText.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) queryIndex++
    if (queryIndex === lowerQuery.length) return true
  }
  return false
}

interface GroupedItem {
  type: 'group'
  category: string
}

interface CommandItem {
  type: 'command'
  command: Command
  globalIndex: number
}

type ListItem = GroupedItem | CommandItem

export default function CommandPalette({ isOpen, onClose, commands, onExecute }: CommandPaletteProps) {
  const allCommands = commands ?? DEFAULT_COMMANDS
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      // 延迟聚焦，确保模态框已渲染
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const filteredCommands = useMemo(() => {
    const q = query.trim()
    if (!q) return allCommands

    return allCommands.filter(cmd => {
      const searchableText = `${cmd.label} ${cmd.category}`
      if (fuzzyMatch(q, searchableText)) return true
      // 拼音首字母模糊匹配
      const pinyinText = `${getPinyinInitials(cmd.label)} ${getPinyinInitials(cmd.category)}`
      return fuzzyMatch(q, pinyinText)
    })
  }, [query, allCommands])

  const { listItems, commandItems } = useMemo(() => {
    const grouped = new Map<string, Command[]>()
    for (const cmd of filteredCommands) {
      if (!grouped.has(cmd.category)) {
        grouped.set(cmd.category, [])
      }
      grouped.get(cmd.category)!.push(cmd)
    }

    const items: ListItem[] = []
    const cmdItems: CommandItem[] = []
    let globalIndex = 0

    for (const [category, cmds] of grouped) {
      items.push({ type: 'group', category })
      for (const command of cmds) {
        const item: CommandItem = { type: 'command', command, globalIndex }
        items.push(item)
        cmdItems.push(item)
        globalIndex++
      }
    }

    return { listItems: items, commandItems: cmdItems }
  }, [filteredCommands])

  const selectedCommand = commandItems[selectedIndex]?.command

  useEffect(() => {
    if (!selectedCommand) return
    const itemEl = itemRefs.current[selectedIndex]
    if (itemEl && listRef.current) {
      const listRect = listRef.current.getBoundingClientRect()
      const itemRect = itemEl.getBoundingClientRect()
      if (itemRect.top < listRect.top) {
        listRef.current.scrollTop -= listRect.top - itemRect.top
      } else if (itemRect.bottom > listRect.bottom) {
        listRef.current.scrollTop += itemRect.bottom - listRect.bottom
      }
    }
  }, [selectedIndex, selectedCommand])

  const handleExecute = useCallback((command: Command) => {
    onExecute(command.id)
    command.action()
    onClose()
  }, [onExecute, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, commandItems.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = commandItems[selectedIndex]?.command
      if (cmd) {
        handleExecute(cmd)
      }
      return
    }
  }, [commandItems, selectedIndex, handleExecute, onClose])

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.inputWrapper}>
          <span className={styles.searchIcon}>⌘</span>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="输入命令..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              className={styles.clearBtn}
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              title="清空"
            >
              ✕
            </button>
          )}
        </div>

        <div className={styles.list} ref={listRef}>
          {commandItems.length === 0 ? (
            <div className={styles.empty}>未找到匹配的命令</div>
          ) : (
            listItems.map((item) => {
              if (item.type === 'group') {
                return (
                  <div key={item.category} className={styles.groupHeader}>
                    {item.category}
                  </div>
                )
              }

              const isSelected = item.globalIndex === selectedIndex
              const refIndex = item.globalIndex

              return (
                <div
                  key={item.command.id}
                  ref={el => { itemRefs.current[refIndex] = el }}
                  className={`${styles.item} ${isSelected ? styles.selected : ''}`}
                  onClick={() => handleExecute(item.command)}
                  onMouseEnter={() => setSelectedIndex(item.globalIndex)}
                >
                  <span className={styles.itemIcon}>{item.command.icon}</span>
                  <span className={styles.itemLabel}>{item.command.label}</span>
                  {item.command.shortcut && (
                    <span className={styles.itemShortcut}>{item.command.shortcut}</span>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className={styles.footer}>
          <span>↑↓ 导航</span>
          <span>Enter 执行</span>
          <span>Esc 关闭</span>
        </div>
      </div>
    </div>
  )
}
