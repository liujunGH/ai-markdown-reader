import { findSearchMatches } from '../../utils/search'
import type { SearchMatch } from '../../utils/search'

export interface SearchWorkerRequest {
  id: number
  content: string
  query: string
  isRegex: boolean
}

export interface SearchWorkerResponse {
  id: number
  matches: SearchMatch[]
  error?: string
}

self.onmessage = (event: MessageEvent<SearchWorkerRequest>) => {
  const { id, content, query, isRegex } = event.data
  try {
    const response: SearchWorkerResponse = {
      id,
      matches: findSearchMatches(content, query, isRegex),
    }
    self.postMessage(response)
  } catch (error) {
    const response: SearchWorkerResponse = {
      id,
      matches: [],
      error: error instanceof Error ? error.message : String(error),
    }
    self.postMessage(response)
  }
}
