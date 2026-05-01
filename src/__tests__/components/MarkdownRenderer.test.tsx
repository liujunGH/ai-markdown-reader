import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MarkdownRenderer } from '../../components/MarkdownRenderer'

vi.mock('../../hooks/useMarkdownWorker', () => ({
  useMarkdownWorker: vi.fn(() => ({ html: '', loading: false })),
}))

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg>mock</svg>' }),
  },
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
  Object.defineProperty(window, 'localStorage', {
    value: new LocalStorageMock(),
    writable: true,
  })

  vi.stubGlobal('electronAPI', {
    executeShellCommand: vi.fn().mockResolvedValue({ success: true, stdout: 'ok' }),
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
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MarkdownRenderer', () => {
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

  it('renders inline and block math', async () => {
    const { container } = render(
      <MarkdownRenderer content={'Inline math $E=mc^2$ and block math $$\\sum_{i=1}^{n} x_i$$'} />
    )

    await waitFor(() => {
      expect(container.querySelectorAll('.katex').length).toBeGreaterThan(0)
    })
  })

  it('renders wiki links as links', async () => {
    const { container } = render(
      <MarkdownRenderer content="[[AnotherFile]] and [[Display|AnotherFile]]" />
    )

    await waitFor(() => {
      const links = container.querySelectorAll('a.wikilink')
      expect(links.length).toBe(2)
    })

    const links = container.querySelectorAll('a.wikilink')
    expect(links[0]).toHaveAttribute('href', 'wikilink://AnotherFile')
    expect(links[0]).toHaveTextContent('AnotherFile')
    expect(links[1]).toHaveAttribute('href', 'wikilink://Display')
    expect(links[1]).toHaveTextContent('AnotherFile')
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
