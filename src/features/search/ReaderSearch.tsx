/**
 * ReaderSearch v2 —— 文内搜索容器（复用现有 SearchBox 展示组件）
 *
 * 现有 SearchBox 是纯展示组件，唯一 v2 适配点：跨标签搜索的 tab.content。
 * v2 从 DocumentCache 取 content（不在 tabStore）。
 *
 * 数据流：
 *  - 当前标签搜索：useSearch(getContent(activeTabId))
 *  - 跨标签搜索：构造 tabsWithContent（元数据 + DocumentCache content）传给 SearchBox
 */
import { useMemo, useState, useCallback } from 'react'
import { useTabStore, useUIStore } from '../../state'
import { useSearch } from '../../hooks/useSearch'
import { getContent } from '../../resources/DocumentCache'
import { SearchBox } from '../../components/SearchBox'
import type { Tab } from '../../types/Tab'

const SEARCH_HISTORY_KEY = 'search-history'
const MAX_HISTORY = 5

export function ReaderSearch() {
  const activeTabId = useTabStore((s) => s.activeTabId)
  const tabs = useTabStore((s) => s.tabs)
  const closePanel = useUIStore((s) => s.closePanel)
  const selectTab = useTabStore((s) => s.selectTab)

  const [query, setQuery] = useState('')
  const [isRegex, setIsRegex] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem(SEARCH_HISTORY_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  // 当前标签 content（从 DocumentCache）
  const content = useMemo(() => getContent(activeTabId) ?? '', [activeTabId, tabs.length])
  const search = useSearch(content)

  const handleQueryChange = useCallback(
    (q: string) => {
      setQuery(q)
      search.setQuery(q)
      if (q.trim()) {
        setSearchHistory((prev) => {
          const next = [q, ...prev.filter((h) => h !== q)].slice(0, MAX_HISTORY)
          try {
            sessionStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next))
          } catch {
            // 忽略
          }
          return next
        })
      }
    },
    [search]
  )

  const handleClose = useCallback(() => {
    closePanel('search')
    search.clearSearch()
    setQuery('')
  }, [closePanel, search])

  // 跨标签搜索：构造含 content 的 tabs（从 DocumentCache 注入）
  const tabsWithContent = useMemo<Tab[]>(() => {
    return tabs.map((t) => ({
      id: t.id,
      name: t.name,
      content: getContent(t.id) ?? '',
      filePath: t.filePath,
      isPinned: t.isPinned,
      color: t.color,
      contentStatus: t.contentStatus,
    })) as Tab[]
  }, [tabs])

  return (
    <SearchBox
      query={query}
      isRegex={isRegex}
      matches={search.matches.length}
      currentMatch={search.currentMatch}
      onQueryChange={handleQueryChange}
      onRegexChange={setIsRegex}
      onNext={search.nextMatch}
      onPrev={search.prevMatch}
      onClose={handleClose}
      searchHistory={searchHistory}
      onSelectHistory={handleQueryChange}
      tabs={tabsWithContent}
      activeTabId={activeTabId}
      onTabSelect={(tabId) => selectTab(tabId)}
      onNavigateToMatch={search.goToMatch}
    />
  )
}
