export interface DocumentStats {
  wordCount: number
  readingTime: number
  lineEnding: 'CRLF' | 'LF'
}

function isWhitespace(code: number): boolean {
  return (
    (code >= 0x09 && code <= 0x0d) ||
    code === 0x20 ||
    code === 0xa0 ||
    code === 0x1680 ||
    (code >= 0x2000 && code <= 0x200a) ||
    code === 0x2028 ||
    code === 0x2029 ||
    code === 0x202f ||
    code === 0x205f ||
    code === 0x3000 ||
    code === 0xfeff
  )
}

/** 单次扫描统计字数和行尾，避免为长文档创建 split/replace/match 中间副本。 */
export function computeDocumentStats(content: string): DocumentStats {
  let wordCount = 0
  let inWord = false
  let crlfCount = 0
  let lfOnlyCount = 0

  for (let index = 0; index < content.length; index += 1) {
    const code = content.charCodeAt(index)

    if (code === 0x0a) {
      if (index > 0 && content.charCodeAt(index - 1) === 0x0d) crlfCount += 1
      else lfOnlyCount += 1
    }

    if (isWhitespace(code)) {
      inWord = false
    } else if (!inWord) {
      wordCount += 1
      inWord = true
    }
  }

  return {
    wordCount,
    readingTime: Math.ceil(wordCount / 300),
    lineEnding: crlfCount > lfOnlyCount ? 'CRLF' : 'LF',
  }
}
