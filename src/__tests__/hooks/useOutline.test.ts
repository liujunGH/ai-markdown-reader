import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useOutline } from '../../hooks/useOutline'

describe('useOutline', () => {
  it('returns empty array for empty content', () => {
    const { result } = renderHook(() => useOutline(''))
    expect(result.current).toEqual([])
  })

  it('parses markdown headings to outline items', () => {
    const content = `# Introduction
Some intro text.
## Getting Started
More text here.
### Installation
Install steps.
## Usage
Usage info.
# Conclusion
Wrap up.`

    const { result } = renderHook(() => useOutline(content))

    expect(result.current).toHaveLength(5)
    expect(result.current).toEqual([
      { level: 1, text: 'Introduction', id: 'introduction', position: 0 },
      { level: 2, text: 'Getting Started', id: 'getting-started', position: 32 },
      { level: 3, text: 'Installation', id: 'installation', position: 67 },
      { level: 2, text: 'Usage', id: 'usage', position: 99 },
      { level: 1, text: 'Conclusion', id: 'conclusion', position: 120 },
    ])
  })

  it('skips non-heading lines', () => {
    const content = `This is a paragraph.
# Only Heading
Another paragraph.
## Second Heading
\`# inline code\``

    const { result } = renderHook(() => useOutline(content))

    expect(result.current).toHaveLength(2)
    expect(result.current[0]).toMatchObject({ level: 1, text: 'Only Heading' })
    expect(result.current[1]).toMatchObject({ level: 2, text: 'Second Heading' })
  })

  it('trims heading text', () => {
    const content = `#   Spaced Heading   `

    const { result } = renderHook(() => useOutline(content))

    expect(result.current).toHaveLength(1)
    expect(result.current[0]).toMatchObject({
      level: 1,
      text: 'Spaced Heading',
    })
  })

  it('generates ids by lowercasing and replacing special chars with hyphens', () => {
    const content = `# Hello World
## Test 123
### C++ Programming
#### 中文标题`

    const { result } = renderHook(() => useOutline(content))

    expect(result.current[0].id).toBe('hello-world')
    expect(result.current[1].id).toBe('test-123')
    expect(result.current[2].id).toBe('c-programming')
    expect(result.current[3].id).toBe('中文标题')
  })

  it('handles headings up to level 6', () => {
    const content = `# H1
## H2
### H3
#### H4
##### H5
###### H6
####### Not a heading`

    const { result } = renderHook(() => useOutline(content))

    expect(result.current).toHaveLength(6)
    result.current.forEach((item, index) => {
      expect(item.level).toBe(index + 1)
    })
  })

  it('memoizes results for same content', () => {
    const content = '# Heading'
    const { result, rerender } = renderHook(() => useOutline(content))

    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})
