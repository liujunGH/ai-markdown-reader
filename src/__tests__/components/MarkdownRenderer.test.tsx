import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MarkdownRenderer } from '../../components/MarkdownRenderer'
import { __resetMermaidLoaderForTests } from '../../utils/mermaidLoader'

const mermaidMock = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(),
}))

vi.mock('../../hooks/useMarkdownWorker', async () => {
  const { parseMarkdown } = await vi.importActual<typeof import('../../utils/markdownParser')>('../../utils/markdownParser')
  return {
    useMarkdownWorker: vi.fn((content: string) => ({ html: parseMarkdown(content), loading: false, error: null })),
  }
})

vi.mock('mermaid', () => ({
  default: mermaidMock,
}))

vi.mock('dompurify', async () => {
  const actual = await vi.importActual<typeof import('dompurify')>('dompurify')
  return {
    default: {
      ...actual.default,
      sanitize: (dirty: string, cfg?: any) => {
        return actual.default.sanitize(dirty, {
          ...cfg,
          ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|xxx|wikilink):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        })
      },
    },
  }
})

class LocalStorageMock {
  store: Record<string, string> = {}
  getItem(key: string) {
    return this.store[key] ?? null
  }
  setItem(key: string, value: string) {
    this.store[key] = value
  }
  removeItem(key: string) {
    delete this.store[key]
  }
  clear() {
    this.store = {}
  }
}

beforeEach(() => {
  __resetMermaidLoaderForTests()
  mermaidMock.initialize.mockReset()
  mermaidMock.render.mockReset()
  mermaidMock.render.mockResolvedValue({ svg: '<svg data-testid="mermaid-svg">mock</svg>' })

  Object.defineProperty(window, 'localStorage', {
    value: new LocalStorageMock(),
    writable: true,
  })

  vi.stubGlobal('speechSynthesis', {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn().mockReturnValue([]),
  })

  Element.prototype.scrollIntoView = vi.fn()

  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  })

  Object.assign(window, {
    electronAPI: {
      pathDirname: vi.fn((filePath: string) => filePath.replace(/[\\\/][^\\\/]+$/, '')),
      pathJoin: vi.fn((...paths: string[]) => paths.join('/').replace(/\/+/g, '/')),
      readImageAsDataUrl: vi.fn().mockResolvedValue({
        success: true,
        dataUrl: 'data:image/png;base64,ZmFrZQ==',
      }),
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MarkdownRenderer', () => {
  function expectNoExecutableHtml(root: ParentNode) {
    expect(root.querySelector('script')).not.toBeInTheDocument()
    expect(root.querySelector('iframe')).not.toBeInTheDocument()
    expect(root.querySelector('object')).not.toBeInTheDocument()
    expect(root.querySelector('embed')).not.toBeInTheDocument()
    expect(root.querySelector('a[href^="javascript:" i]')).not.toBeInTheDocument()
    expect(root.querySelector('a[href^="data:" i]')).not.toBeInTheDocument()
    expect(root.querySelector('[onclick], [onerror], [onload]')).not.toBeInTheDocument()
  }

  it('renders basic markdown content', () => {
    const { container } = render(
      <MarkdownRenderer content="# Hello\n\nThis is **bold** text." />
    )

    expect(container.querySelector('h1')).toHaveTextContent('Hello')
    expect(container.querySelector('strong')).toHaveTextContent('bold')
  })

  it('renders h1-h6 with proper IDs for anchor links', async () => {
    const { container } = render(
      <MarkdownRenderer content={'# Heading 1\n## Heading 2\n### Heading 3\n#### Heading 4\n##### Heading 5\n###### Heading 6'} />
    )

    await waitFor(() => {
      expect(container.querySelector('h1')).toHaveAttribute('id', 'heading-1')
    })

    expect(container.querySelector('h2')).toHaveAttribute('id', 'heading-2')
    expect(container.querySelector('h3')).toHaveAttribute('id', 'heading-3')
    expect(container.querySelector('h4')).toHaveAttribute('id', 'heading-4')
    expect(container.querySelector('h5')).toHaveAttribute('id', 'heading-5')
    expect(container.querySelector('h6')).toHaveAttribute('id', 'heading-6')
  })

  it('renders fenced code blocks with language class', async () => {
    const { container } = render(
      <MarkdownRenderer content={"```javascript\nconst x = 1;\n```"} />
    )

    await waitFor(() => {
      expect(container.querySelector('pre.language-javascript')).toBeInTheDocument()
    })

    expect(container.querySelector('code.language-javascript')).toBeInTheDocument()
    expect(container.querySelector('.code-lang-label')).toHaveTextContent('javascript')
    expect(container.querySelector('.copy-button')).toBeInTheDocument()
  })

  it('renders mermaid diagram containers', async () => {
    const { container } = render(
      <MarkdownRenderer content={"```mermaid\ngraph TD;\nA-->B;\n```"} />
    )

    await waitFor(() => {
      expect(container.querySelector('.mermaid-wrapper')).toBeInTheDocument()
    })
  })

  it('does not load or render Mermaid for ordinary markdown', async () => {
    const { container } = render(
      <MarkdownRenderer content={'# Mermaid notes\n\nThis paragraph mentions mermaid without a diagram.'} />
    )

    await waitFor(() => {
      expect(container.querySelector('h1')).toHaveTextContent('Mermaid notes')
    })

    expect(container.querySelector('.mermaid-wrapper')).not.toBeInTheDocument()
    expect(mermaidMock.initialize).not.toHaveBeenCalled()
    expect(mermaidMock.render).not.toHaveBeenCalled()
  })

  it('loads Mermaid only when a mermaid code block is present', async () => {
    const { container } = render(
      <MarkdownRenderer content={"Intro\n\n```mermaid\ngraph TD;\nA-->B;\n```\n\nOutro"} />
    )

    await waitFor(() => {
      expect(mermaidMock.render).toHaveBeenCalledWith(
        expect.stringMatching(/^mermaid-[a-z0-9]{8,9}$/),
        'graph TD;\nA-->B;\n'
      )
    })

    expect(mermaidMock.initialize).toHaveBeenCalledWith(expect.objectContaining({
      startOnLoad: false,
      securityLevel: 'strict',
    }))
    expect(container.querySelector('.mermaid-svg-wrapper svg')).toBeInTheDocument()
    expect(container).toHaveTextContent('Intro')
    expect(container).toHaveTextContent('Outro')
  })

  it('shows empty Mermaid blocks without calling Mermaid render', async () => {
    const { container } = render(
      <MarkdownRenderer content={"Before\n\n```mermaid\n\n```\n\nAfter"} />
    )

    await waitFor(() => {
      expect(container.querySelector('.mermaid-empty')).toHaveTextContent('空 Mermaid 图表')
    })

    expect(mermaidMock.render).not.toHaveBeenCalled()
    expect(container.querySelector('.mermaid-error')).not.toBeInTheDocument()
    expect(container).toHaveTextContent('Before')
    expect(container).toHaveTextContent('After')
  })

  it('isolates Mermaid render failures from the rest of the document', async () => {
    mermaidMock.render.mockRejectedValueOnce(new Error('diagram exploded'))

    const { container } = render(
      <MarkdownRenderer content={"Before\n\n```mermaid\ngraph TD;\nA-->B;\n```\n\nAfter"} />
    )

    await waitFor(() => {
      expect(container.querySelector('.mermaid-error')).toHaveTextContent('diagram exploded')
    })

    expect(container).toHaveTextContent('Before')
    expect(container).toHaveTextContent('After')
    expect(container.querySelector('p')).toBeInTheDocument()
  })

  it('renders inline math with surrounding markdown content', async () => {
    const { container } = render(
      <MarkdownRenderer content={'Inline math $E=mc^2$ and **bold text** after it.'} />
    )

    await waitFor(() => {
      expect(container.querySelector('.katex')).toBeInTheDocument()
    })

    expect(container).toHaveTextContent('Inline math')
    expect(container).toHaveTextContent('bold text')
    expect(container.querySelector('.katex-display')).not.toBeInTheDocument()
    expect(container.querySelector('strong')).toHaveTextContent('bold text')
  })

  it('renders block math as display math', async () => {
    const { container } = render(
      <MarkdownRenderer content={'Before\n\n$$\n\\sum_{i=1}^{n} x_i\n$$\n\nAfter'} />
    )

    await waitFor(() => {
      expect(container.querySelector('.katex-display')).toBeInTheDocument()
    })

    expect(container.querySelector('.katex-display .katex')).toBeInTheDocument()
    expect(container).toHaveTextContent('Before')
    expect(container).toHaveTextContent('After')
  })

  it('keeps rendering content around invalid math formulas', async () => {
    const { container } = render(
      <MarkdownRenderer content={'Start $\\notacommand{1}$ middle **still bold** end'} />
    )

    await waitFor(() => {
      expect(container).toHaveTextContent('Start')
    })

    expect(container).toHaveTextContent('middle')
    expect(container.querySelector('strong')).toHaveTextContent('still bold')
    expect(container).toHaveTextContent('end')
  })

  it('sanitizes malicious KaTeX input without executable HTML or dangerous links', async () => {
    const maliciousMath = [
      String.raw`$\href{javascript:alert(1)}{click}$`,
      String.raw`$\href{data:text/html,<script>alert(1)</script>}{data}$`,
      String.raw`$\htmlClass{bad" onclick="alert(1)}{x}$`,
      String.raw`$\includegraphics{javascript:alert(1)}$`,
    ].join('\n\n')

    const { container } = render(
      <MarkdownRenderer content={`Before\n\n${maliciousMath}\n\nAfter`} />
    )

    await waitFor(() => {
      expect(container).toHaveTextContent('Before')
    })

    expect(container).toHaveTextContent('After')
    expectNoExecutableHtml(container)
  })

  it('renders wiki links as links', async () => {
    const { container } = render(
      <MarkdownRenderer content="[[AnotherFile]] and [[AnotherFile|Display]]" />
    )

    await waitFor(() => {
      const links = container.querySelectorAll('a.wikilink')
      expect(links.length).toBe(2)
    })

    const links = container.querySelectorAll('a.wikilink')
    expect(links[0]).toHaveAttribute('href', 'wikilink://AnotherFile')
    expect(links[0]).toHaveTextContent('AnotherFile')
    expect(links[1]).toHaveAttribute('href', 'wikilink://AnotherFile')
    expect(links[1]).toHaveAttribute('data-alt-target', 'Display')
    expect(links[1]).toHaveTextContent('Display')
  })

  it('renders task lists as checkboxes', async () => {
    const { container } = render(
      <MarkdownRenderer content={'- [ ] Unchecked task\n- [x] Checked task'} />
    )

    await waitFor(() => {
      const checkboxes = container.querySelectorAll('input.task-checkbox')
      expect(checkboxes.length).toBe(2)
    })

    const checkboxes = container.querySelectorAll('input.task-checkbox')
    expect(checkboxes[0]).not.toBeChecked()
    expect(checkboxes[1]).toBeChecked()
  })

  it('renders img tags with proper src and lazy loading', async () => {
    const { container } = render(
      <MarkdownRenderer content={'![Alt text](https://example.com/image.png)'} />
    )

    await waitFor(() => {
      expect(container.querySelector('img')).toBeInTheDocument()
    })

    const img = container.querySelector('img') as HTMLImageElement
    expect(img).toHaveAttribute('src', 'https://example.com/image.png')
    expect(img).toHaveAttribute('alt', 'Alt text')
    expect(img.loading).toBe('lazy')
    expect(img).toHaveClass('clickable-image')
  })

  it('loads relative local images through the Electron image bridge', async () => {
    const { container } = render(
      <MarkdownRenderer
        content={'![Local image](./assets/local.png)'}
        filePath="/Users/test/docs/readme.md"
      />
    )

    await waitFor(() => {
      expect(window.electronAPI?.readImageAsDataUrl).toHaveBeenCalledWith('/Users/test/docs/./assets/local.png')
    })

    const img = container.querySelector('img') as HTMLImageElement
    await waitFor(() => {
      expect(img).toHaveAttribute('src', 'data:image/png;base64,ZmFrZQ==')
    })
    expect(img).toHaveAttribute('alt', 'Local image')
  })

  it('highlights matching text when searchQuery is provided', async () => {
    const { container, rerender } = render(
      <MarkdownRenderer content="Hello world, this is a test sentence." />
    )

    await waitFor(() => {
      expect(container.querySelector('p')).toBeInTheDocument()
    })

    rerender(
      <MarkdownRenderer content="Hello world, this is a test sentence." searchQuery="test" />
    )

    await waitFor(() => {
      const marks = container.querySelectorAll('mark.search-highlight')
      expect(marks.length).toBeGreaterThan(0)
    })

    expect(container.querySelector('mark.search-highlight')).toHaveTextContent('test')
  })

  it('reports selected text from the rendered document', async () => {
    const onTextSelect = vi.fn()
    const { container } = render(
      <MarkdownRenderer content="Selected reader text." onTextSelect={onTextSelect} />
    )

    await waitFor(() => {
      expect(container.querySelector('p')).toBeInTheDocument()
    })

    const paragraph = container.querySelector('p')!
    const range = document.createRange()
    range.selectNodeContents(paragraph)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    fireEvent.mouseUp(document, { clientX: 80, clientY: 80 })

    expect(onTextSelect).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Selected reader text.',
    }))
  })

  it('renders saved reader highlights', async () => {
    const { container } = render(
      <MarkdownRenderer content="Important reader text." readingHighlights={['reader']} />
    )

    await waitFor(() => {
      expect(container.querySelector('mark.reader-highlight')).toHaveTextContent('reader')
    })
  })

  it('wraps tables in a scrollable reading region', async () => {
    const { container } = render(
      <MarkdownRenderer content={'| A | B |\n|---|---|\n| 1 | 2 |'} />
    )

    await waitFor(() => {
      expect(container.querySelector('.table-reader-wrapper')).toBeInTheDocument()
    })

    expect(container.querySelector('.table-reader-wrapper')).toHaveAttribute('role', 'region')
    expect(container.querySelector('.table-reader-wrapper table')).toBeInTheDocument()
  })

  it('applies reading accessibility style values', () => {
    const { container } = render(
      <MarkdownRenderer
        content="Readable paragraph."
        readingStyle={{ lineHeight: 1.8, lineWidth: 680, letterSpacing: 0.04, paragraphSpacing: 1.4 }}
      />
    )

    const root = container.querySelector('[class*="renderer"]') as HTMLElement
    expect(root.style.lineHeight).toBe('1.8')
    expect(root.style.letterSpacing).toBe('0.04em')
    expect(root.style.getPropertyValue('--reader-paragraph-spacing')).toBe('1.4em')
  })

  it('calls onWikiLinkClick when wiki link is clicked', async () => {
    const user = userEvent.setup()
    const onWikiLinkClick = vi.fn()

    const { container } = render(
      <MarkdownRenderer content="[[TargetFile]]" onWikiLinkClick={onWikiLinkClick} />
    )

    await waitFor(() => {
      expect(container.querySelector('a.wikilink')).toBeInTheDocument()
    })

    const link = container.querySelector('a.wikilink')!
    await user.click(link)

    expect(onWikiLinkClick).toHaveBeenCalledTimes(1)
    expect(onWikiLinkClick).toHaveBeenCalledWith('TargetFile')
  })
})
