import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetMermaidLoaderForTests,
  __setMermaidImporterForTests,
  getInitializedMermaid,
  hasMermaidLoaded,
  loadMermaid,
  renderMermaidSvg,
} from './mermaidLoader'

const mermaidMock = {
  initialize: vi.fn(),
  render: vi.fn(),
}

let mermaidImportCalls = 0

beforeEach(() => {
  __resetMermaidLoaderForTests()
  mermaidImportCalls = 0
  mermaidMock.initialize.mockReset()
  mermaidMock.render.mockReset()
  mermaidMock.render.mockResolvedValue({ svg: '<svg data-test="diagram"></svg>' })
  __setMermaidImporterForTests(async () => {
    mermaidImportCalls += 1
    return mermaidMock as unknown as Awaited<ReturnType<typeof loadMermaid>>
  })
  document.documentElement.removeAttribute('data-theme')
})

describe('mermaidLoader', () => {
  it('does not report Mermaid as loaded before the first lazy import', () => {
    expect(hasMermaidLoaded()).toBe(false)
    expect(mermaidImportCalls).toBe(0)
  })

  it('loads Mermaid lazily and reuses the cached module', async () => {
    const first = await loadMermaid()
    const second = await loadMermaid()

    expect(first).toBe(mermaidMock)
    expect(second).toBe(mermaidMock)
    expect(hasMermaidLoaded()).toBe(true)
    expect(mermaidImportCalls).toBe(1)
  })

  it('shares one in-flight load between concurrent callers', async () => {
    const [first, second] = await Promise.all([loadMermaid(), loadMermaid()])

    expect(first).toBe(mermaidMock)
    expect(second).toBe(mermaidMock)
    expect(mermaidImportCalls).toBe(1)
  })

  it('initializes with the active theme and requested security level', async () => {
    document.documentElement.setAttribute('data-theme', 'dark')

    await getInitializedMermaid({ securityLevel: 'loose' })

    expect(mermaidMock.initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
    })
  })

  it('renders exported SVGs with generated Mermaid render ids', async () => {
    const svg = await renderMermaidSvg('graph TD; A-->B;', { securityLevel: 'loose' })

    expect(svg).toBe('<svg data-test="diagram"></svg>')
    expect(mermaidMock.render).toHaveBeenCalledTimes(1)
    expect(mermaidMock.render).toHaveBeenCalledWith(
      expect.stringMatching(/^mermaid-[a-z0-9]{9}$/),
      'graph TD; A-->B;'
    )
    expect(mermaidMock.initialize).toHaveBeenCalledWith(expect.objectContaining({
      securityLevel: 'loose',
    }))
  })
})
