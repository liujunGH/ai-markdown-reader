import { test, expect, _electron, type ElectronApplication, type Page } from '@playwright/test'
import path from 'path'
import os from 'os'
import fs from 'fs'

test.describe('Reading Flow', () => {
  let electronApp: ElectronApplication
  let window: Page
  let fixturePath: string
  let fixturePath2: string
  let fixturePath3: string
  let inspectionPath: string
  let smokeTestPath: string

  test.beforeAll(() => {
    const tmpDir = os.tmpdir()
    fixturePath = path.join(tmpDir, 'ai-markdown-reader-sample.md')
    fixturePath2 = path.join(tmpDir, 'ai-markdown-reader-sample2.md')
    fixturePath3 = path.join(tmpDir, 'ai-markdown-reader-sample3.md')
    inspectionPath = path.join(tmpDir, 'ai-markdown-reader-inspection.md')
    smokeTestPath = path.join(__dirname, '../examples/smoke-test.md')

    fs.writeFileSync(fixturePath, fs.readFileSync(path.join(__dirname, 'fixtures/sample.md'), 'utf-8'))
    fs.writeFileSync(fixturePath2, '# Second Document\n\nThis is the second test document.\n\n## Section A\n\nContent for section A.\n\n## Section B\n\nContent for section B.\n')
    fs.writeFileSync(fixturePath3, '# Third Document\n\nThis is the third test document.\n')
    fs.writeFileSync(inspectionPath, [
      '# Inspection Document',
      '',
      '[bad](javascript:alert(1))',
      '',
      '![Remote](https://example.com/image.png)',
      '![Local](images/missing.png)'
    ].join('\n'))
  })

  test.beforeEach(async ({}, testInfo) => {
    const userDataDir = path.join(os.tmpdir(), `playwright-e2e-reading-${testInfo.workerIndex}-${Date.now()}`)
    electronApp = await _electron.launch({
      args: [
        path.join(__dirname, '../dist-electron/main.js'),
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--user-data-dir=${userDataDir}`,
      ],
    })
    window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    await dismissFirstUseGuide()
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
    try { fs.unlinkSync(inspectionPath) } catch {}
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

  async function dismissFirstUseGuide() {
    try {
      await window.getByText('跳过引导', { exact: true }).click({ timeout: 6000 })
    } catch {
      // Guide may not appear
    }
  }

  test('should open file and render content', async () => {
    await mockOpenFileDialog([fixturePath])

    await window.locator('[data-guide="file-opener"]').click()

    await expect(window.getByRole('heading', { name: 'Sample Document' })).toBeVisible()
    await expect(window.getByText('This is a sample markdown file for E2E testing.')).toBeVisible()
    await expect(window.locator('pre.language-javascript')).toBeVisible()
  })

  test('should search and highlight matches', async () => {
    await mockOpenFileDialog([fixturePath])

    await window.locator('[data-guide="file-opener"]').click()
    await expect(window.getByRole('heading', { name: 'Sample Document' })).toBeVisible()

    await window.getByRole('button', { name: '搜索', exact: true }).click()
    await window.getByLabel('搜索关键词').fill('sample')

    await expect(window.getByText(/共 \d+ 个匹配/)).toBeVisible()

    const marks = window.locator('mark.search-highlight')
    await expect(marks.first()).toBeVisible()
  })

  test('should expose inspection tools, jump to health issues, and filter images', async () => {
    await mockOpenFileDialog([inspectionPath])

    await dismissFirstUseGuide()
    await window.locator('[data-guide="file-opener"]').click()
    await expect(window.getByRole('heading', { name: 'Inspection Document' })).toBeVisible()

    await window.getByRole('button', { name: '工具' }).click()
    await window.getByRole('menuitem', { name: /文档健康检查/ }).click()
    const healthPanel = window.locator('section[aria-label="文档健康检查"]')
    await expect(healthPanel).toBeVisible()
    await healthPanel.getByRole('button', { name: /行 3/ }).click()
    await expect(healthPanel).not.toBeVisible()
    await expect(window.locator('[class*="highlighted"]').filter({ hasText: '[bad](javascript:alert(1))' }).first()).toBeVisible()

    await window.getByRole('button', { name: '工具' }).click()
    await window.getByRole('menuitem', { name: /图片检查面板/ }).click()
    const imagePanel = window.locator('section[aria-label="图片检查面板"]')
    await expect(imagePanel).toBeVisible()
    await imagePanel.getByRole('button', { name: /网络/ }).click()
    await expect(imagePanel.getByText('https://example.com/image.png')).toBeVisible()
    await expect(imagePanel.getByText('images/missing.png')).not.toBeVisible()
  })

  test('should manage tabs', async () => {
    await mockOpenFileDialog([fixturePath, fixturePath2, fixturePath3])

    await window.locator('[data-guide="file-opener"]').click()
    await expect(window.getByRole('heading', { name: 'Sample Document' })).toBeVisible()

    await window.locator('[data-guide="file-opener"]').click()
    await expect(window.getByRole('tab', { name: 'ai-markdown-reader-sample2.md' })).toBeVisible()

    await window.locator('[data-guide="file-opener"]').click()
    await expect(window.getByRole('tab', { name: 'ai-markdown-reader-sample3.md' })).toBeVisible()

    await window.getByRole('tab', { name: 'ai-markdown-reader-sample.md' }).click()
    await expect(window.getByRole('heading', { name: 'Sample Document' })).toBeVisible()

    const tab2 = window.getByRole('tab', { name: 'ai-markdown-reader-sample2.md' })
    await tab2.locator('button[title="关闭标签"]').click()
    await expect(tab2).not.toBeVisible()
  })

  test('should toggle theme', async () => {
    const themeToggle = window.getByLabel('Toggle theme')

    const initialTheme = await window.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )

    await themeToggle.click()
    const themeAfterFirst = await window.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(themeAfterFirst).not.toBe(initialTheme)

    await themeToggle.click()
    const themeAfterSecond = await window.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(themeAfterSecond).not.toBe(themeAfterFirst)
  })

  test('should navigate via outline', async () => {
    await mockOpenFileDialog([fixturePath])

    await window.locator('[data-guide="file-opener"]').click()
    await expect(window.getByRole('heading', { name: 'Sample Document' })).toBeVisible()

    await window.getByLabel('跳转到 Introduction').click()

    await expect(window.locator('#introduction')).toBeInViewport()
  })

  test('should render the release smoke-test document', async () => {
    await mockOpenFileDialog([smokeTestPath])

    await window.locator('[data-guide="file-opener"]').click()

    await expect(window.getByRole('heading', { name: 'Markdown Reader Smoke Test' })).toBeVisible()
    await expect(window.locator('pre.language-typescript')).toBeVisible()
    await expect(window.locator('pre.language-diff')).toBeVisible()
    await expect(window.locator('.katex').first()).toBeVisible()
    await expect(window.locator('.katex-display').first()).toBeVisible()
    await expect(window.locator('.mermaid-wrapper[data-mermaid-rendered="true"]').first()).toBeVisible({ timeout: 15000 })
    await expect(window.locator('.mermaid-wrapper[data-mermaid-rendered="true"] .mermaid-svg-wrapper svg').first()).toBeVisible()
    await expect(window.locator('table').first()).toBeVisible()
    await expect(window.locator('input.task-checkbox').first()).toBeVisible()
    await expect(window.locator('a.wikilink').first()).toBeVisible()
    const image = window.getByRole('img', { name: 'Markdown Reader local fixture' })
    await image.scrollIntoViewIfNeeded()
    await expect(image).toBeVisible()
    await expect.poll(async () => image.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    await expect(window.getByRole('heading', { name: '发布前检查清单' })).toBeVisible()
  })
})
