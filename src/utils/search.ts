export interface SearchMatch {
  index: number
  length: number
  text: string
}

interface FindSearchMatchesOptions {
  limit?: number
  contextChars?: number
}

export const DEFAULT_SEARCH_MATCH_LIMIT = 100
const DEFAULT_CONTEXT_CHARS = 20

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildSearchPattern(query: string, isRegex: boolean): RegExp | null {
  if (!query.trim()) return null

  try {
    return isRegex
      ? new RegExp(query, 'gi')
      : new RegExp(escapeRegExp(query), 'gi')
  } catch {
    return null
  }
}

export function findSearchMatches(
  content: string,
  query: string,
  isRegex: boolean,
  options: FindSearchMatchesOptions = {},
): SearchMatch[] {
  const pattern = buildSearchPattern(query, isRegex)
  if (!pattern) return []

  const limit = options.limit ?? DEFAULT_SEARCH_MATCH_LIMIT
  const contextChars = options.contextChars ?? DEFAULT_CONTEXT_CHARS
  const matches: SearchMatch[] = []

  let match: RegExpExecArray | null
  while ((match = pattern.exec(content)) !== null) {
    const length = match[0].length
    matches.push({
      index: match.index,
      length,
      text: content.slice(
        Math.max(0, match.index - contextChars),
        match.index + length + contextChars,
      ),
    })

    if (matches.length >= limit) break
    if (length === 0) {
      pattern.lastIndex += 1
    }
  }

  return matches
}
