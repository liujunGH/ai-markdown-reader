export type TabColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'none'
export type TabContentStatus = 'ready' | 'pending' | 'loading' | 'error'

export interface Tab {
  id: string
  name: string
  content: string
  filePath?: string
  file?: File
  isModified?: boolean
  size?: number
  lastModified?: number
  isPinned?: boolean
  color?: TabColor
  contentStatus?: TabContentStatus
  contentError?: string
}

export function createTab(
  name: string,
  content: string,
  filePath?: string,
  file?: File,
  size?: number,
  lastModified?: number,
  color?: TabColor
): Tab {
  return {
    id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    content,
    filePath,
    file,
    isModified: false,
    size: size ?? new Blob([content]).size,
    lastModified: lastModified ?? Date.now(),
    isPinned: false,
    color,
    contentStatus: 'ready'
  }
}

export function getWelcomeTab(): Tab {
  return createTab('欢迎使用.md', '')
}
