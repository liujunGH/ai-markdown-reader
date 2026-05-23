import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ResizableSidebar } from '../../components/ResizableSidebar'

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

describe('ResizableSidebar', () => {
  it('renders children when open', () => {
    render(
      <ResizableSidebar side="left" storageKey="left" isOpen>
        <div data-testid="sidebar-content">Hello Sidebar</div>
      </ResizableSidebar>
    )

    expect(screen.getByTestId('sidebar-content')).toBeInTheDocument()
    expect(screen.getByTitle('收起文件列表')).toBeInTheDocument()
    expect(screen.queryByTitle('展开文件列表')).not.toBeInTheDocument()
  })

  it('renders collapse button when closed', () => {
    render(
      <ResizableSidebar side="left" storageKey="left" isOpen={false}>
        <div data-testid="sidebar-content">Hello Sidebar</div>
      </ResizableSidebar>
    )

    expect(screen.queryByTestId('sidebar-content')).not.toBeInTheDocument()
    expect(screen.getByTitle('展开文件列表')).toBeInTheDocument()
  })

  it('handles toggle click when open', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()

    render(
      <ResizableSidebar side="left" storageKey="left" isOpen onToggle={onToggle}>
        <div>Content</div>
      </ResizableSidebar>
    )

    await user.click(screen.getByTitle('收起文件列表'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('handles toggle click when closed', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()

    render(
      <ResizableSidebar side="left" storageKey="left" isOpen={false} onToggle={onToggle}>
        <div>Content</div>
      </ResizableSidebar>
    )

    await user.click(screen.getByTitle('展开文件列表'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('renders correct toggle direction for right side when open', () => {
    render(
      <ResizableSidebar side="right" storageKey="right" isOpen>
        <div>Content</div>
      </ResizableSidebar>
    )

    expect(screen.getByTitle('收起目录')).toBeInTheDocument()
    expect(screen.queryByTitle('展开目录')).not.toBeInTheDocument()
  })

  it('renders correct collapse direction for right side when closed', () => {
    render(
      <ResizableSidebar side="right" storageKey="right" isOpen={false}>
        <div>Content</div>
      </ResizableSidebar>
    )

    expect(screen.getByTitle('展开目录')).toBeInTheDocument()
  })

  it('restores width from localStorage', () => {
    window.localStorage.setItem('sidebar-width-left', '300')

    render(
      <ResizableSidebar side="left" storageKey="left" isOpen defaultWidth={240} minWidth={160} maxWidth={500}>
        <div>Content</div>
      </ResizableSidebar>
    )

    const sidebar = screen.getByTitle('收起文件列表').parentElement
    expect(sidebar).toHaveStyle({ width: '300px' })
  })

  it('clamps width to min/max when restoring from localStorage', () => {
    window.localStorage.setItem('sidebar-width-left', '50')

    render(
      <ResizableSidebar side="left" storageKey="left" isOpen defaultWidth={240} minWidth={160} maxWidth={500}>
        <div>Content</div>
      </ResizableSidebar>
    )

    const sidebar = screen.getByTitle('收起文件列表').parentElement
    expect(sidebar).toHaveStyle({ width: '160px' })
  })

  it('resizes a left sidebar and persists the final width', () => {
    render(
      <ResizableSidebar side="left" storageKey="left" isOpen defaultWidth={240} minWidth={160} maxWidth={500}>
        <div>Content</div>
      </ResizableSidebar>
    )

    const resizer = screen.getByTitle('拖拽调整宽度')
    const sidebar = screen.getByTitle('收起文件列表').parentElement

    fireEvent.mouseDown(resizer, { clientX: 240 })
    fireEvent.mouseMove(document, { clientX: 360 })
    fireEvent.mouseUp(document)

    expect(sidebar).toHaveStyle({ width: '360px' })
    expect(window.localStorage.getItem('sidebar-width-left')).toBe('360')
  })
})
