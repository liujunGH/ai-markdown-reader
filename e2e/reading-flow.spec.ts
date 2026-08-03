import { test, expect, _electron, type ElectronApplication, type Page } from '@playwright/test'
import path from 'path'
import os from 'os'
import fs from 'fs'

/**
 * Reading Flow E2E（v2 适配）
 *
 * v2 的 UI 结构：AppShell → header(ReaderToolbar) → TabBar → ReaderPanel(DocumentView) → StatusBar
 * 选择器适配 v2：header 内的文本按钮、role=tab、DocumentView 渲染的块。
 */
test.describe('Reading Flow', () => {
  let electronApp: ElectronApplication
  let window: Page
  let fixturePath: string
  let fixturePath2: string
  let fixturePath3: string
  let smokeTestPath: string
  let userDataDir: string

  test.beforeAll(() => {
    const tmpDir = os.tmpdir()
    fixturePath = path.join(tmpDir, 'ai-markdown-reader-sample.md')
    fixturePath2 = path.join(tmpDir, 'ai-markdown-reader-sample2.md')
    fixturePath3 = path.join(tmpDir, 'ai-markdown-reader-sample3.md')
    smokeTestPath = path.join(__dirname, '../examples/smoke-test.md')

    fs.writeFileSync(fixturePath, fs.readFileSync(path.join(__dirname, 'fixtures/sample.md'), 'utf-8'))
    fs.writeFileSync(fixturePath2, '# Second Document\n\nThis is the second test document.\n\n## Section A\n\nContent for section A.\n\n## Section B\n\nContent for section B.\n')
    fs.writeFileSync(fixturePath3, '# Third Document\n\nThis is the third test document.\n')
  })

  test.beforeEach(async ({}, testInfo) => {
    userDataDir = path.join(os.tmpdir(), `playwright-e2e-reading-${testInfo.workerIndex}-${Date.now()}`)
    electronApp = await _electron.launch({
      args: [
        path.join(__dirname, '../dist-electron/electron/main.js'),
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--user-data-dir=${userDataDir}`,
      ],
    })
    window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    // v2 AppShell: 等 header 渲染
    await window.waitForSelector('header', { timeout: 10000 })
    // 首次引导应从第 1 步开始，并可在当前渲染周期即时关闭。
    const guide = window.getByRole('dialog', { name: /新手引导|First-time Guide/ })
    await expect(guide).toBeVisible()
    await expect(guide.getByText('1 / 6')).toBeVisible()
    await guide.getByRole('button', { name: /跳过引导|Skip Guide/ }).click()
    await expect(guide).toHaveCount(0)
  })

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test.afterAll(() => {
    try { fs.unlinkSync(fixturePath) } catch {}
    try { fs.unlinkSync(fixturePath2) } catch {}
    try { fs.unlinkSync(fixturePath3) } catch {}
  })

  async function mockOpenFileDialog(filePaths: string[]) {
    await electronApp.evaluate(({ dialog }, paths) => {
      let callIndex = 0
      const originalShowOpenDialog = dialog.showOpenDialog
      dialog.showOpenDialog = async () => {
        const filePath = paths[callIndex++ % paths.length]
        return {
          canceled: false,
          filePaths: [filePath],
          bookmarks: [],
        } as ReturnType<typeof originalShowOpenDialog>
      }
      return () => {
        dialog.showOpenDialog = originalShowOpenDialog
      }
    }, filePaths)
  }

  /** v2: 点击 header 的"打开文件"按钮（title 属性匹配） */
  async function clickOpenFile() {
    await window.locator('header button[title="打开文件"]').click()
  }

  test('should open file and render content', async () => {
    await mockOpenFileDialog([fixturePath])
    await clickOpenFile()
    // v2: 等标签或文档渲染（异步链路：IPC→DocumentCache→worker→DocumentView）
    // 用宽松等待：任一指示文件已打开的信号
    await expect(async () => {
      const tabs = await window.getByRole('tab').count()
      const headings = await window.getByRole('heading').count()
      expect(tabs > 1 || headings > 0).toBeTruthy()
    }).toPass({ timeout: 30000 })
  })

  test('should manage tabs', async () => {
    await mockOpenFileDialog([fixturePath, fixturePath2, fixturePath3])

    await clickOpenFile()
    // 等首个文件渲染（与 open-file 测试一致的等待逻辑）
    await expect(async () => {
      const tabs = await window.getByRole('tab').count()
      const headings = await window.getByRole('heading').count()
      expect(tabs > 1 || headings > 0).toBeTruthy()
    }).toPass({ timeout: 30000 })

    await clickOpenFile()
    await expect(async () => {
      const tabCount = await window.getByRole('tab').count()
      expect(tabCount).toBeGreaterThanOrEqual(2)
    }).toPass({ timeout: 30000 })

    await clickOpenFile()
    await expect(async () => {
      const tabCount = await window.getByRole('tab').count()
      expect(tabCount).toBeGreaterThanOrEqual(3)
    }).toPass({ timeout: 30000 })
  })

  test('should toggle theme', async () => {
    // v2: ThemeToggle 在 header 内（复用组件，含 Toggle theme aria-label）
    const themeToggle = window.getByLabel('Toggle theme')
    const initialTheme = await window.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    await themeToggle.click()
    const themeAfter = await window.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(themeAfter).not.toBe(initialTheme)
  })

  test('should expose manual update checking and explain development mode', async ({}, testInfo) => {
    await window.getByRole('button', { name: '打开命令面板' }).click()
    const palette = window.getByPlaceholder('输入命令...')
    await palette.fill('检查软件更新')
    await window.getByText('检查软件更新', { exact: true }).click()

    const updateNotice = window.getByTestId('update-notification')
    await expect(updateNotice).toBeVisible()
    await expect(updateNotice.getByText('当前环境不支持检查更新')).toBeVisible()
    await expect(updateNotice.getByText(/安装包版本中检查更新/)).toBeVisible()
    await window.screenshot({ path: testInfo.outputPath('update-development.png') })
    await updateNotice.getByRole('button', { name: '知道了' }).click()
    await expect(updateNotice).toHaveCount(0)
  })

  test('should render the release smoke-test document', async () => {
    await mockOpenFileDialog([smokeTestPath])
    await clickOpenFile()
    // smoke-test.md 含各类元素，验证能渲染（宽松等待，与 open-file 一致）
    await expect(async () => {
      const tabs = await window.getByRole('tab').count()
      const headings = await window.getByRole('heading').count()
      expect(tabs > 1 || headings > 0).toBeTruthy()
    }).toPass({ timeout: 30000 })
  })

  test('should preserve the example and reading controls across UI modes', async () => {
    await window.locator('header button[title="示例"]').click()
    await expect(window.getByRole('heading', { name: 'Markdown Reader 示例' })).toBeVisible({ timeout: 30000 })

    const mermaid = window.locator('.mermaid-wrapper')
    await expect(mermaid).toHaveAttribute('data-mermaid-rendered', 'true', { timeout: 30000 })
    await expect(mermaid.locator('svg')).toHaveCount(1)
    await expect.poll(async () => mermaid.evaluate((wrapper) => {
      const block = wrapper.closest('[data-index]')
      const index = Number(block?.getAttribute('data-index'))
      const nextBlock = document.querySelector(`[data-index="${index + 1}"]`)
      if (!block || !nextBlock) return false
      // ResizeObserver/Chromium may round sub-pixel block heights; allow <1px.
      return block.getBoundingClientRect().bottom - nextBlock.getBoundingClientRect().top < 1
    })).toBe(true)

    // 搜索不能改写 SVG；关闭搜索后必须清掉文档里的 mark。
    await window.locator('header button[title="搜索"]').click()
    const search = window.getByRole('search', { name: '文档搜索' })
    await search.getByRole('textbox', { name: '搜索关键词' }).fill('Mermaid')
    await expect(mermaid).toHaveAttribute('data-mermaid-rendered', 'true')
    await expect(mermaid.locator('svg')).toHaveCount(1)
    await search.locator('button[title="关闭"]').click()
    await expect(window.locator('mark.search-highlight')).toHaveCount(0)

    // 切换主题后 pending Mermaid 会自动重新渲染。
    await window.getByLabel('Toggle theme').click()
    await expect(mermaid).toHaveAttribute('data-mermaid-rendered', 'true', { timeout: 30000 })
    await expect(mermaid.locator('svg')).toHaveCount(1)

    // 源码模式锚定阅读区，第一行和退出按钮都可见。
    await window.locator('header button[title="源码"]').click()
    await expect(window.getByText('# Markdown Reader 示例', { exact: false })).toBeVisible()
    await window.getByRole('button', { name: '退出源码' }).click()

    // 专注模式真正隐藏外壳，并保留明确的退出入口。
    await window.locator('header button[title="专注"]').click()
    await expect(window.locator('header')).toHaveCount(0)
    await expect(window.getByRole('tablist')).toHaveCount(0)
    await window.getByRole('button', { name: '退出专注' }).click()
    await expect(window.locator('header')).toBeVisible()

    // 会话恢复时，内置示例无文件路径也必须重新注入正文。
    await window.reload()
    await window.waitForLoadState('domcontentloaded')
    await expect(window.getByRole('heading', { name: 'Markdown Reader 示例' })).toBeVisible({ timeout: 30000 })
  })
})
