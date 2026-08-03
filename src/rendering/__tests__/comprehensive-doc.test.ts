import { describe, expect, it } from 'vitest'
import { createParser, scanCodeLanguages, loadPrismLanguage } from '../pipeline/tokenizer'
import { splitIntoBlocks } from '../pipeline/blockModel'
import { renderBlockSources } from '../pipeline/renderBlockSource'

/**
 * 用综合测试文档验证完整解析链路。
 * 复现 "Cannot convert undefined or null to object" 错误。
 */
describe('综合测试文档解析', () => {
  it('能正确解析含各种语法的文档', async () => {
    const content = `# 综合测试

## 代码

\`\`\`javascript
function hello(name) {
  console.log(\`Hello, \${name}!\`)
}
\`\`\`

## 表格

| A | B |
|---|---|
| 1 | 2 |

## 公式

$E = mc^2$

$$
\\int_0^1 x dx = \\frac{1}{2}
$$

## 任务

- [x] 已完成
- [ ] 未完成

## Mermaid

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

## Emoji

:smile: :rocket:

## 链接

[外部](https://github.com)

[[wikilink]]
`

    const { md, prism } = await createParser()
    const langs = scanCodeLanguages(content)
    await Promise.all(langs.map((lang) => loadPrismLanguage(prism, lang)))

    const tokens = md.parse(content, {})
    const result = splitIntoBlocks(tokens, md, content)

    expect(result.blocks.length).toBeGreaterThan(0)
    expect(result.outline.length).toBeGreaterThan(0)
    expect(result.blocks.every((b) => b.source.length > 0)).toBe(true)
    const rendered = await renderBlockSources(result.blocks)
    expect(rendered).toHaveLength(result.blocks.length)
    expect(rendered.some((block) => block.html.includes('mermaid-code'))).toBe(true)
  })
})
