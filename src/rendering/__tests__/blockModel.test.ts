import { describe, expect, it } from 'vitest'
import MarkdownIt from 'markdown-it'
import texmath from 'markdown-it-texmath'
import katex from 'katex'
import { splitIntoBlocks, slugify, contentHash } from '../pipeline/blockModel'

// 带 texmath 的 md 实例（用于测试 $$ 块级公式 → math_block token）
const mdWithMath = new MarkdownIt({ html: false, linkify: true })
mdWithMath.use(texmath, {
  engine: katex,
  delimiters: 'dollars',
  katexOptions: { output: 'html', throwOnError: false, strict: 'ignore' },
})

/**
 * 块模型切块测试。
 *
 * 核心验证点（对应方案对旧 VirtualMarkdown 的改进）：
 *  - 按语义边界切（标题/段落/代码/表格/列表/引用/公式），不按行数粗暴切
 *  - 表格、列表、代码块、引用块内部绝不被切断
 *  - 标题产出正确的 slugify id（供大纲/锚点）
 *  - 块的行号范围正确（供行跳转）
 */
const md = new MarkdownIt({ html: false, linkify: true, typographer: true })

describe('splitIntoBlocks — 块边界', () => {
  it('把每种块级元素切成独立的块', () => {
    const content = `# 标题

普通段落。

\`\`\`js
const x = 1
\`\`\`

- 列表项 1
- 列表项 2

> 引用块

---

第二段。`
    const tokens = md.parse(content, {})
    const { blocks } = splitIntoBlocks(tokens, md, content)

    // 期望：heading, paragraph, code(fence), list, blockquote, hr, paragraph = 7 块
    expect(blocks.length).toBe(7)
    expect(blocks.map((b) => b.kind)).toEqual([
      'heading',
      'paragraph',
      'code',
      'list',
      'blockquote',
      'hr',
      'paragraph',
    ])
  })

  it('表格不会被切成多块（完整保持为一个块）', () => {
    const content = `| 列A | 列B | 列C |
|-----|-----|-----|
| 1 | 2 | 3 |
| 4 | 5 | 6 |`
    const tokens = md.parse(content, {})
    const { blocks } = splitIntoBlocks(tokens, md, content)

    expect(blocks.length).toBe(1)
    expect(blocks[0].kind).toBe('table')
    // 表格 HTML 含全部行
    expect(blocks[0].html).toContain('<td>1</td>')
    expect(blocks[0].html).toContain('<td>6</td>')
  })

  it('多级嵌套列表保持为一个块', () => {
    const content = `- 顶层
  - 嵌套1
  - 嵌套2
- 顶层2`
    const tokens = md.parse(content, {})
    const { blocks } = splitIntoBlocks(tokens, md, content)

    expect(blocks.length).toBe(1)
    expect(blocks[0].kind).toBe('list')
    expect(blocks[0].html).toContain('嵌套1')
    expect(blocks[0].html).toContain('顶层2')
  })

  it('代码块不被切断（含多行内容）', () => {
    const content = '```python\n' + Array.from({ length: 20 }, (_, i) => `line${i}`).join('\n') + '\n```'
    const tokens = md.parse(content, {})
    const { blocks } = splitIntoBlocks(tokens, md, content)

    expect(blocks.length).toBe(1)
    expect(blocks[0].kind).toBe('code')
    expect(blocks[0].meta?.codeLang).toBe('python')
    expect(blocks[0].meta?.codeLines).toBe(20)
    expect(blocks[0].html).toContain('line0')
    expect(blocks[0].html).toContain('line19')
  })

  it('mermaid 代码块标记 hasMermaid', () => {
    const content = '```mermaid\ngraph TD\nA-->B\n```'
    const tokens = md.parse(content, {})
    const { blocks } = splitIntoBlocks(tokens, md, content)

    expect(blocks[0].kind).toBe('code')
    expect(blocks[0].meta?.codeLang).toBe('mermaid')
    expect(blocks[0].meta?.hasMermaid).toBe(true)
  })
})

describe('splitIntoBlocks — 块级公式（回归 #1：math_block 不能吞后续 token）', () => {
  it('$$ 块级公式是自闭合块，不吞掉后续段落', () => {
    // texmath 的 $$...$$ 产出单个 nesting=0 的 math_block token。
    // 若被当成配对块，会吞掉后面的 paragraph。必须用装了 texmath 的 md。
    const content = '$$\nx^2 + y^2\n$$\n\n公式后面的段落。'
    const tokens = mdWithMath.parse(content, {})
    const { blocks } = splitIntoBlocks(tokens, mdWithMath, content)

    // 期望：math 块 + paragraph 块 = 2 块（若 bug 则只有 1 块）
    expect(blocks.length).toBe(2)
    expect(blocks[0].kind).toBe('math')
    expect(blocks[1].kind).toBe('paragraph')
    // 段落内容未被吞进 math 块
    expect(blocks[1].html).toContain('公式后面的段落')
  })
})

describe('splitIntoBlocks — 边界情况', () => {
  it('空文档产出 0 个块', () => {
    const { blocks } = splitIntoBlocks(md.parse('', {}), md, '')
    expect(blocks.length).toBe(0)
  })

  it('只有标题的文档产出 1 个块', () => {
    const { blocks, outline } = splitIntoBlocks(md.parse('# Solo', {}), md, '# Solo')
    expect(blocks.length).toBe(1)
    expect(blocks[0].kind).toBe('heading')
    expect(outline.length).toBe(1)
  })
})

describe('splitIntoBlocks — 标题与大纲', () => {
  it('标题产出 slugify id 和大纲', () => {
    const content = `# 中文标题

## English Title

### 混合 Mixed 标题`
    const tokens = md.parse(content, {})
    const { blocks, outline } = splitIntoBlocks(tokens, md, content)

    expect(blocks.filter((b) => b.kind === 'heading').length).toBe(3)
    expect(outline.length).toBe(3)
    expect(outline[0].level).toBe(1)
    expect(outline[1].level).toBe(2)
    expect(outline[0].text).toBe('中文标题')
  })

  it('heading id 注入到块 HTML（供大纲/锚点/scrollspy 定位）', () => {
    const content = '# Hello World'
    const tokens = md.parse(content, {})
    const { blocks } = splitIntoBlocks(tokens, md, content)
    // HTML 应含 <h1 id="hello-world">
    expect(blocks[0].html).toContain('<h1 id="hello-world">')
  })

  it('行号范围正确（1-based）', () => {
    const content = `第一行标题上方

# 标题

段落。`
    const tokens = md.parse(content, {})
    const { blocks } = splitIntoBlocks(tokens, md, content)
    const heading = blocks.find((b) => b.kind === 'heading')!
    // 标题在第 3 行
    expect(heading.startLine).toBe(3)
  })
})

describe('splitIntoBlocks — 图片与 task list 检测', () => {
  it('检测块内含本地图片', () => {
    const content = '![alt](./img.png)'
    const tokens = md.parse(content, {})
    const { blocks } = splitIntoBlocks(tokens, md, content)
    expect(blocks[0].meta?.hasLocalImage).toBe(true)
  })

  it('检测 task list', () => {
    const content = '- [ ] 未完成\n- [x] 已完成'
    const tokens = md.parse(content, {})
    const { blocks } = splitIntoBlocks(tokens, md, content)
    expect(blocks[0].meta?.hasTaskList).toBe(true)
  })
})

describe('slugify', () => {
  it('保留中文', () => {
    expect(slugify('中文标题')).toBe('中文标题')
  })
  it('英文小写连字符化', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })
  it('空文本兜底', () => {
    expect(slugify('')).toBe('heading')
  })
})

describe('contentHash', () => {
  it('相同内容产出相同 hash', () => {
    expect(contentHash('abc')).toBe(contentHash('abc'))
  })
  it('不同内容产出不同 hash', () => {
    expect(contentHash('abc')).not.toBe(contentHash('xyz'))
  })
})
