import { describe, expect, it } from 'vitest'
import { enhanceLinks } from '../enhancements/linkEnhancer'
import { enhanceTables } from '../enhancements/tableEnhancer'
import { enhanceCodeBlocks } from '../enhancements/codeEnhancer'
import { enhanceTaskLists } from '../enhancements/taskListEnhancer'
import { enhanceKatex } from '../enhancements/katexEnhancer'
import { enhanceWikiLinks } from '../enhancements/wikiLinkEnhancer'
import { enhanceMermaid } from '../enhancements/mermaidEnhancer'
import { encodeBase64 } from '../pipeline/tokenizer'

/** 创建一个块 DOM 容器并注入 HTML */
function makeBlock(html: string): HTMLElement {
  const div = document.createElement('div')
  div.innerHTML = html
  return div
}

describe('enhanceLinks — 链接安全', () => {
  it('禁用 javascript: 协议', () => {
    const block = makeBlock('<a href="javascript:alert(1)">x</a>')
    enhanceLinks(block)
    const link = block.querySelector('a')!
    expect(link.getAttribute('href')).toBeNull()
    expect(link.style.textDecoration).toBe('line-through')
  })

  it('http 链接加 target=_blank rel=noopener', () => {
    const block = makeBlock('<a href="https://example.com">x</a>')
    enhanceLinks(block)
    const link = block.querySelector('a')!
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('wikilink 协议保留（不禁用）', () => {
    const block = makeBlock('<a href="wikilink://note" class="wikilink">x</a>')
    enhanceLinks(block)
    expect(block.querySelector('a')!.getAttribute('href')).toBe('wikilink://note')
  })
})

describe('enhanceTables — 表格包裹', () => {
  it('给 table 包裹 .table-reader-wrapper', () => {
    const block = makeBlock('<table><tbody><tr><td>1</td></tr></tbody></table>')
    enhanceTables(block)
    const wrapper = block.querySelector('.table-reader-wrapper')!
    expect(wrapper).toBeTruthy()
    expect(wrapper.getAttribute('role')).toBe('region')
    expect(wrapper.querySelector('table')).toBeTruthy()
  })

  it('已包裹的表格不重复包裹（幂等）', () => {
    const block = makeBlock('<table><tbody><tr><td>1</td></tr></tbody></table>')
    enhanceTables(block)
    enhanceTables(block)
    expect(block.querySelectorAll('.table-reader-wrapper').length).toBe(1)
  })
})

describe('enhanceCodeBlocks — 复制按钮', () => {
  it('给 pre 加复制按钮和语言标签', () => {
    const block = makeBlock('<pre><code class="language-js">const x = 1</code></pre>')
    enhanceCodeBlocks(block, { docHash: 'abc' })
    expect(block.querySelector('.copy-button')).toBeTruthy()
    expect(block.querySelector('.code-lang-label')?.textContent).toBe('js')
  })

  it('幂等：不重复加按钮', () => {
    const block = makeBlock('<pre><code class="language-js">x</code></pre>')
    enhanceCodeBlocks(block, { docHash: 'abc' })
    enhanceCodeBlocks(block, { docHash: 'abc' })
    expect(block.querySelectorAll('.copy-button').length).toBe(1)
  })
})

describe('enhanceTaskLists — task checkbox', () => {
  it('[ ]/[x] 文本转为 checkbox', () => {
    const block = makeBlock('<ul><li>[ ] 未完成</li><li>[x] 已完成</li></ul>')
    enhanceTaskLists(block, { docHash: 'abc' })
    const checkboxes = block.querySelectorAll('input.task-checkbox')
    expect(checkboxes.length).toBe(2)
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(false)
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(true)
  })

  it('非 task 文本不受影响', () => {
    const block = makeBlock('<ul><li>普通列表项</li></ul>')
    enhanceTaskLists(block, { docHash: 'abc' })
    expect(block.querySelector('input.task-checkbox')).toBeNull()
  })
})

describe('enhanceKatex — tooltip', () => {
  it('为 .katex 加 data-latex', () => {
    const block = makeBlock('<span class="katex"><annotation encoding="application/x-tex">x^2</annotation></span>')
    enhanceKatex(block)
    const katex = block.querySelector('.katex')!
    expect(katex.getAttribute('data-latex')).toBe('x^2')
    expect(katex.classList.contains('katex-tooltip')).toBe(true)
  })
})

describe('enhanceWikiLinks — 点击处理', () => {
  it('点击 wikilink 触发回调（带 target 和 altTarget）', () => {
    const block = makeBlock(
      '<a href="wikilink://note" class="wikilink" data-alt-target="display">link</a>'
    )
    let clicked: { target: string; altTarget?: string } | null = null
    enhanceWikiLinks(block, {
      onWikiLinkClick: (target, altTarget) => {
        clicked = { target, altTarget }
      },
    })
    const link = block.querySelector('a.wikilink')!
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(clicked).toEqual({ target: 'note', altTarget: 'display' })
  })

  it('无回调时 dispatch 全局事件', () => {
    const block = makeBlock('<a href="wikilink://note2" class="wikilink">link</a>')
    enhanceWikiLinks(block, {})
    let eventDetail: unknown = null
    window.addEventListener('wikilink-click', (e) => {
      eventDetail = (e as CustomEvent).detail
    })
    block.querySelector('a.wikilink')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    )
    expect(eventDetail).toEqual({ target: 'note2', altTarget: undefined })
  })
})

describe('enhanceMermaid — 占位替换', () => {
  it('把 .mermaid-code 占位替换为 .mermaid-wrapper', () => {
    const code = 'graph TD\nA-->B'
    const encoded = encodeBase64(code)
    const block = makeBlock(`<div class="mermaid-code" data-content="${encoded}"></div>`)
    enhanceMermaid(block, {})
    const wrapper = block.querySelector('.mermaid-wrapper')!
    expect(wrapper).toBeTruthy()
    expect(wrapper.getAttribute('data-mermaid-rendered')).toBe('pending')
    expect(wrapper.querySelector('.mermaid[data-code]')).toBeTruthy()
  })

  it('空 mermaid 显示空占位', () => {
    const block = makeBlock(`<div class="mermaid-code" data-content="${encodeBase64('')}"></div>`)
    enhanceMermaid(block, {})
    const wrapper = block.querySelector('.mermaid-wrapper')!
    expect(wrapper.getAttribute('data-mermaid-rendered')).toBe('empty')
    expect(wrapper.querySelector('.mermaid-empty')).toBeTruthy()
  })
})
