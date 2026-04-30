import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Outline } from '../../components/Outline'
import { OutlineItem } from '../../hooks/useOutline'
import styles from '../../components/Outline/Outline.module.css'

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
})

const mockItems: OutlineItem[] = [
  { level: 1, text: 'Introduction', id: 'introduction', position: 0 },
  { level: 2, text: 'Getting Started', id: 'getting-started', position: 20 },
  { level: 2, text: 'Installation', id: 'installation', position: 40 },
  { level: 1, text: 'Conclusion', id: 'conclusion', position: 60 },
]

describe('Outline', () => {
  it('renders list of outline items', () => {
    render(
      <Outline
        items={mockItems}
        activeId={null}
        onItemClick={vi.fn()}
      />
    )

    expect(screen.getByText('目录')).toBeInTheDocument()
    expect(screen.getByRole('list')).toBeInTheDocument()

    mockItems.forEach((item) => {
      expect(screen.getByText(item.text)).toBeInTheDocument()
    })
  })

  it('highlights active item', () => {
    render(
      <Outline
        items={mockItems}
        activeId="getting-started"
        onItemClick={vi.fn()}
      />
    )

    const activeButton = screen.getByLabelText('跳转到 Getting Started')
    expect(activeButton).toHaveClass(styles.active)
  })

  it('handles item click', async () => {
    const user = userEvent.setup()
    const onItemClick = vi.fn()

    render(
      <Outline
        items={mockItems}
        activeId={null}
        onItemClick={onItemClick}
      />
    )

    await user.click(screen.getByLabelText('跳转到 Introduction'))
    expect(onItemClick).toHaveBeenCalledTimes(1)
    expect(onItemClick).toHaveBeenCalledWith('introduction')

    await user.click(screen.getByLabelText('跳转到 Conclusion'))
    expect(onItemClick).toHaveBeenCalledTimes(2)
    expect(onItemClick).toHaveBeenCalledWith('conclusion')
  })

  it('handles empty items state', () => {
    render(
      <Outline
        items={[]}
        activeId={null}
        onItemClick={vi.fn()}
      />
    )

    expect(screen.getByText('目录')).toBeInTheDocument()
    expect(screen.getByText('本文档没有标题层级')).toBeInTheDocument()
    expect(screen.getByText('添加 # 标题来创建目录')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('toggles parent items expand/collapse', async () => {
    const user = userEvent.setup()
    const parentItems: OutlineItem[] = [
      { level: 1, text: 'Parent', id: 'parent', position: 0 },
      { level: 2, text: 'Child 1', id: 'child-1', position: 10 },
      { level: 2, text: 'Child 2', id: 'child-2', position: 20 },
    ]

    render(
      <Outline
        items={parentItems}
        activeId={null}
        onItemClick={vi.fn()}
      />
    )

    const toggleBtn = screen.getByLabelText('折叠 Parent')
    expect(toggleBtn).toHaveTextContent('▾')

    await user.click(toggleBtn)
    expect(toggleBtn).toHaveTextContent('▸')
    expect(toggleBtn).toHaveAttribute('aria-label', '展开 Parent')

    await user.click(toggleBtn)
    expect(toggleBtn).toHaveTextContent('▾')
    expect(toggleBtn).toHaveAttribute('aria-label', '折叠 Parent')
  })

  it('restores collapsed state from localStorage', () => {
    window.localStorage.setItem('outline-fold-test-file', JSON.stringify(['parent']))

    const parentItems: OutlineItem[] = [
      { level: 1, text: 'Parent', id: 'parent', position: 0 },
      { level: 2, text: 'Child 1', id: 'child-1', position: 10 },
    ]

    render(
      <Outline
        items={parentItems}
        activeId={null}
        onItemClick={vi.fn()}
        filePath="test-file"
      />
    )

    const toggleBtn = screen.getByLabelText('展开 Parent')
    expect(toggleBtn).toHaveTextContent('▸')
  })

  it('applies correct padding based on heading level', () => {
    const items: OutlineItem[] = [
      { level: 1, text: 'H1', id: 'h1', position: 0 },
      { level: 2, text: 'H2', id: 'h2', position: 10 },
      { level: 3, text: 'H3', id: 'h3', position: 20 },
    ]

    render(
      <Outline
        items={items}
        activeId={null}
        onItemClick={vi.fn()}
      />
    )

    const listItems = screen.getAllByRole('listitem')
    expect(listItems[0]).toHaveStyle({ paddingLeft: '8px' })
    expect(listItems[1]).toHaveStyle({ paddingLeft: '20px' })
    expect(listItems[2]).toHaveStyle({ paddingLeft: '32px' })
  })
})
