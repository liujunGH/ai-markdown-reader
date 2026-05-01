import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class MockWorker {
  static instances: MockWorker[] = []

  onmessage: ((event: MessageEvent<{ id: number; html: string }>) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  postMessage = vi.fn()

  constructor() {
    MockWorker.instances.push(this)
  }

  respond(id: number, html: string) {
    this.onmessage?.({ data: { id, html } } as MessageEvent<{ id: number; html: string }>)
  }
}

beforeEach(() => {
  MockWorker.instances = []
  vi.resetModules()
  vi.stubGlobal('Worker', MockWorker)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function renderHookConsumer(initialContent: string) {
  const { useMarkdownWorker } = await import('./useMarkdownWorker')

  function Consumer({ content }: { content: string }) {
    const { html, loading } = useMarkdownWorker(content)
    return (
      <div data-testid="result" data-loading={String(loading)}>
        {html}
      </div>
    )
  }

  return { ...render(<Consumer content={initialContent} />), Consumer }
}

describe('useMarkdownWorker', () => {
  it('parses content on first mount', async () => {
    await renderHookConsumer('# Hello')

    await waitFor(() => {
      expect(MockWorker.instances[0].postMessage).toHaveBeenCalledTimes(1)
    })

    const worker = MockWorker.instances[0]
    const message = worker.postMessage.mock.calls[0][0]
    expect(message).toMatchObject({ content: '# Hello' })
    expect(screen.getByTestId('result')).toHaveAttribute('data-loading', 'true')

    act(() => {
      worker.respond(message.id, '<h1>Hello</h1>')
    })

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('<h1>Hello</h1>')
    })
    expect(screen.getByTestId('result')).toHaveAttribute('data-loading', 'false')
  })

  it('ignores stale responses after content changes', async () => {
    const rendered = await renderHookConsumer('first')

    await waitFor(() => {
      expect(MockWorker.instances[0].postMessage).toHaveBeenCalledTimes(1)
    })

    const worker = MockWorker.instances[0]
    const firstMessage = worker.postMessage.mock.calls[0][0]

    const Consumer = rendered.Consumer
    rendered.rerender(<Consumer content="second" />)

    await waitFor(() => {
      expect(worker.postMessage).toHaveBeenCalledTimes(2)
    })

    const secondMessage = worker.postMessage.mock.calls[1][0]
    act(() => {
      worker.respond(firstMessage.id, 'stale')
      worker.respond(secondMessage.id, 'fresh')
    })

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('fresh')
    })
    expect(screen.getByTestId('result')).not.toHaveTextContent('stale')
  })

  it('does not update state from a response after unmount', async () => {
    const rendered = await renderHookConsumer('content')

    await waitFor(() => {
      expect(MockWorker.instances[0].postMessage).toHaveBeenCalledTimes(1)
    })

    const worker = MockWorker.instances[0]
    const message = worker.postMessage.mock.calls[0][0]

    rendered.unmount()

    act(() => {
      worker.respond(message.id, 'after unmount')
    })

    expect(screen.queryByText('after unmount')).not.toBeInTheDocument()
  })
})
