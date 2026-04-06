import { useMemo } from 'react'

export interface OutlineItem {
  level: number
  text: string
  id: string
}

export function useOutline(content: string): OutlineItem[] {
  return useMemo(() => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm
    const items: OutlineItem[] = []
    let match

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length
      const text = match[2].trim()
      const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '')
      items.push({ level, text, id })
    }

    return items
  }, [content])
}
