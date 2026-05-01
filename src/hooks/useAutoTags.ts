import { useState, useEffect } from 'react'
import { sendChat, type ChatMessage } from '../services/ai'
import { useAIStore } from '../stores/aiStore'

const TAGS_CACHE_PREFIX = 'auto-tags-'
const MAX_CONTENT_LENGTH = 4000

function getCachedTags(filePath: string): string[] | null {
  if (!filePath) return null
  try {
    const cached = localStorage.getItem(TAGS_CACHE_PREFIX + filePath)
    if (cached) {
      const parsed = JSON.parse(cached) as unknown
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
        return parsed as string[]
      }
    }
  } catch {
    // ignore
  }
  return null
}

function setCachedTags(filePath: string, tags: string[]): void {
  try {
    localStorage.setItem(TAGS_CACHE_PREFIX + filePath, JSON.stringify(tags))
  } catch {
    // ignore storage errors
  }
}

export function useAutoTags(filePath: string, content: string): {
  tags: string[]
  isLoading: boolean
} {
  const [tags, setTags] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const enabled = useAIStore((state) => state.config.enabled)
  const apiKey = useAIStore((state) => state.config.apiKey)

  useEffect(() => {
    let aborted = false

    const run = async () => {
      if (!filePath || !content.trim()) {
        setTags([])
        setIsLoading(false)
        return
      }

      const cached = getCachedTags(filePath)
      if (cached) {
        setTags(cached)
        setIsLoading(false)
        return
      }

      if (!enabled || !apiKey) {
        setTags([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const truncated = content.slice(0, MAX_CONTENT_LENGTH)
        const messages: ChatMessage[] = [
          {
            role: 'user',
            content: `请从以下文档中提取3-5个关键词/标签，只返回标签列表，用逗号分隔，不要有任何其他文字：\n\n${truncated}`,
          },
        ]
        const response = await sendChat(messages)
        const extracted = response
          .split(/[,，、]/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0 && t.length <= 20)
          .slice(0, 5)
        if (!aborted) {
          setTags(extracted)
          setCachedTags(filePath, extracted)
        }
      } catch (err) {
        console.error('Auto tag extraction failed:', err)
        if (!aborted) {
          setTags([])
        }
      } finally {
        if (!aborted) {
          setIsLoading(false)
        }
      }
    }

    void run()
    return () => {
      aborted = true
    }
  }, [filePath, content, enabled, apiKey])

  return { tags, isLoading }
}
