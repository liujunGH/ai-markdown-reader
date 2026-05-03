import { describe, expect, it } from 'vitest'
import { analyzeMarkdownImages, getImageRepairSuggestion } from '../../utils/imageInventory'

describe('analyzeMarkdownImages', () => {
  it('finds markdown images with alt text and line numbers', () => {
    const images = analyzeMarkdownImages('Intro\n![Logo](./assets/logo.png "Logo title")')

    expect(images).toHaveLength(1)
    expect(images[0]).toMatchObject({
      alt: 'Logo',
      src: './assets/logo.png',
      line: 2,
      type: 'local-relative',
    })
  })

  it('finds html img tags with src and alt attributes', () => {
    const images = analyzeMarkdownImages('<p><img class="hero" src="/tmp/hero.png" alt="Hero"></p>')

    expect(images).toHaveLength(1)
    expect(images[0]).toMatchObject({
      alt: 'Hero',
      src: '/tmp/hero.png',
      line: 1,
      type: 'local-absolute',
      resolvedPath: '/tmp/hero.png',
    })
  })

  it('classifies remote images without network probing', () => {
    const images = analyzeMarkdownImages('![Remote](https://example.com/image.png?size=2)')

    expect(images[0]).toMatchObject({
      alt: 'Remote',
      src: 'https://example.com/image.png?size=2',
      type: 'remote',
    })
    expect(images[0].resolvedPath).toBeUndefined()
    expect(images[0].warnings).toEqual([])
  })

  it('resolves local relative paths from the markdown file path', () => {
    const images = analyzeMarkdownImages('![Local](images/photo.png?cache=1)', '/Users/me/docs/readme.md')

    expect(images[0]).toMatchObject({
      src: 'images/photo.png?cache=1',
      type: 'local-relative',
      resolvedPath: '/Users/me/docs/images/photo.png',
    })
  })

  it('classifies data URLs as embedded images', () => {
    const images = analyzeMarkdownImages('![Inline](data:image/png;base64,AAAA)')

    expect(images[0]).toMatchObject({
      src: 'data:image/png;base64,AAAA',
      type: 'data',
    })
  })

  it('reports empty image sources', () => {
    const images = analyzeMarkdownImages('<img alt="Missing" src="">')

    expect(images).toHaveLength(1)
    expect(images[0]).toMatchObject({
      alt: 'Missing',
      src: '',
      type: 'unknown',
    })
    expect(images[0].warnings).toContain('图片 src 为空')
  })

  it('ignores markdown images inside fenced code blocks and inline code', () => {
    const images = analyzeMarkdownImages([
      '```js',
      '![Code](code.png)',
      '```',
      'text `![Inline](inline.png)` more',
      '![Real](real.png)'
    ].join('\n'))

    expect(images).toHaveLength(1)
    expect(images[0]).toMatchObject({
      alt: 'Real',
      src: 'real.png',
      line: 5,
    })
  })

  it('ignores html img tags inside fenced code blocks and inline code', () => {
    const images = analyzeMarkdownImages([
      '```html',
      '<img src="code.png">',
      '```',
      'text `<img src="inline.png">` more',
      '<img src="real.png">'
    ].join('\n'))

    expect(images).toHaveLength(1)
    expect(images[0]).toMatchObject({
      src: 'real.png',
      line: 5,
    })
  })
})

describe('getImageRepairSuggestion', () => {
  it('explains common image repair actions', () => {
    expect(getImageRepairSuggestion({
      alt: '',
      src: '',
      line: 1,
      type: 'unknown',
      warnings: ['图片 src 为空'],
    })).toBe('补全图片地址，或删除这个空图片引用。')

    expect(getImageRepairSuggestion({
      alt: 'remote',
      src: 'https://example.com/a.png',
      line: 2,
      type: 'remote',
      warnings: [],
    })).toBe('网络图片依赖外部访问；离线使用时建议下载到本地并改成相对路径。')

    expect(getImageRepairSuggestion({
      alt: 'local',
      src: './missing.png',
      line: 3,
      type: 'local-relative',
      warnings: [],
    })).toBe('本地相对图片没有解析到文件；检查路径拼写，或把图片放到 Markdown 同级/子目录。')
  })
})
