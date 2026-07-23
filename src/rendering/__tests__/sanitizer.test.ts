import { describe, expect, it } from 'vitest'
import { sanitizeBlock } from '../sanitizer/config'

/**
 * Sanitizer 白名单测试。
 *
 * 验证净化保留渲染所需的标签/属性，移除危险内容。
 * 这是块级净化的安全基线——DocumentView 注入 DOM 前对每块净化。
 */
describe('sanitizeBlock — 保留渲染所需结构', () => {
  it('保留基本块级结构', () => {
    expect(sanitizeBlock('<h1>Title</h1><p>Text</p>')).toBe('<h1>Title</h1><p>Text</p>')
  })

  it('保留表格结构', () => {
    const html = '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>'
    expect(sanitizeBlock(html)).toBe(html)
  })

  it('保留代码块 data-* 属性（折叠/复制按钮依赖）', () => {
    const html = '<pre class="language-js" data-lines="10" data-code-hash="abc"><code>x</code></pre>'
    const result = sanitizeBlock(html)
    expect(result).toContain('data-lines="10"')
    expect(result).toContain('data-code-hash="abc"')
  })

  it('保留 mermaid 占位的 data-content', () => {
    const html = '<div class="mermaid-code" data-content="encoded=="></div>'
    const result = sanitizeBlock(html)
    expect(result).toContain('data-content="encoded=="')
  })

  it('保留 wikilink 协议 href', () => {
    const html = '<a href="wikilink://target" class="wikilink" data-alt-target="x">link</a>'
    const result = sanitizeBlock(html)
    expect(result).toContain('wikilink://target')
    expect(result).toContain('class="wikilink"')
  })

  it('保留 KaTeX span（style / aria-hidden）', () => {
    const html = '<span class="katex" aria-hidden="true"><span class="katex-mathml">x</span></span>'
    const result = sanitizeBlock(html)
    expect(result).toContain('class="katex"')
    expect(result).toContain('aria-hidden="true"')
  })
})

describe('sanitizeBlock — 移除危险内容', () => {
  it('移除 script 标签', () => {
    expect(sanitizeBlock('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>')
  })

  it('禁用 javascript: 协议', () => {
    const result = sanitizeBlock('<a href="javascript:alert(1)">x</a>')
    expect(result).not.toContain('javascript:')
  })

  it('移除事件处理器属性', () => {
    const result = sanitizeBlock('<p onclick="alert(1)">x</p>')
    expect(result).not.toContain('onclick')
  })

  it('移除 iframe', () => {
    expect(sanitizeBlock('<iframe src="evil"></iframe>')).toBe('')
  })
})
