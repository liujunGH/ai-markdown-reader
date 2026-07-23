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
    // 等首个文件渲染
    await expect(async () => {
      expect(await window.getByRole('heading').count()).toBeGreaterThan(0)
    }).toPass({ timeout: 30000 })

    await clickOpenFile()
    await expect(async () => {
      const tabCount = await window.getByRole('tab').count()
      expect(tabCount).toBeGreaterThanOrEqual(2)
    }).toPass({ timeout: 15000 })

    await clickOpenFile()
    await expect(async () => {
      const tabCount = await window.getByRole('tab').count()
      expect(tabCount).toBeGreaterThanOrEqual(3)
    }).toPass({ timeout: 15000 })
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

  test('should render the release smoke-test document', async () => {
    await mockOpenFileDialog([smokeTestPath])
    await clickOpenFile()
    // smoke-test.md 含各类元素，验证能渲染
    await expect(async () => {
      expect(await window.getByRole('heading').count()).toBeGreaterThan(0)
    }).toPass({ timeout: 30000 })
  })
})
