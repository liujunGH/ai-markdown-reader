import { getStorageItem, setStorageItem } from '../utils/storage'

export interface LLMConfig {
  baseURL: string
  apiKey: string
  model: string
  enabled: boolean
}

const DEFAULT_CONFIG: LLMConfig = {
  baseURL: 'https://api.xiaomimimo.com/v1',
  apiKey: '',
  model: 'MiMo-V2.5-Pro',
  enabled: false,
}

const STORAGE_KEY = 'llm-config'

export function getLLMConfig(): LLMConfig {
  try {
    const raw = getStorageItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_CONFIG, ...parsed }
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_CONFIG }
}

export function saveLLMConfig(config: Partial<LLMConfig>): void {
  const current = getLLMConfig()
  const next = { ...current, ...config }
  setStorageItem(STORAGE_KEY, JSON.stringify(next))
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function* streamChat(
  messages: ChatMessage[],
  config?: LLMConfig
): AsyncGenerator<string, void, unknown> {
  const cfg = config || getLLMConfig()
  if (!cfg.enabled || !cfg.apiKey) {
    throw new Error('LLM 未配置，请先在设置中配置 API Key')
  }

  const response = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      stream: true,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`API 错误 (${response.status}): ${text}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')

  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) yield delta
        } catch {
          // ignore parse errors for malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export async function sendChat(
  messages: ChatMessage[],
  config?: LLMConfig
): Promise<string> {
  const cfg = config || getLLMConfig()
  if (!cfg.enabled || !cfg.apiKey) {
    throw new Error('LLM 未配置，请先在设置中配置 API Key')
  }

  const response = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      stream: false,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`API 错误 (${response.status}): ${text}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}
