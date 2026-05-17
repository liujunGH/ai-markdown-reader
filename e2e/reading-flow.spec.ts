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
  let smokeTestPath: string
  let wikiFolderPath: string
  let userDataDir: string

  test.beforeAll(() => {
    const tmpDir = os.tmpdir()
    fixturePath = path.join(tmpDir, 'ai-markdown-reader-sample.md')
    fixturePath2 = path.join(tmpDir, 'ai-markdown-reader-sample2.md')
    fixturePath3 = path.join(tmpDir, 'ai-markdown-reader-sample3.md')
    smokeTestPath = path.join(__dirname, '../examples/smoke-test.md')
    wikiFolderPath = path.join(tmpDir, 'ai-markdown-reader-wiki-fixture')

    fs.writeFileSync(fixturePath, fs.readFileSync(path.join(__dirname, 'fixtures/sample.md'), 'utf-8'))
    fs.writeFileSync(fixturePath2, '# Second Document\n\nThis is the second test document.\n\n## Section A\n\nContent for section A.\n\n## Section B\n\nContent for section B.\n')
    fs.writeFileSync(fixturePath3, '# Third Document\n\nThis is the third test document.\n')
    fs.rmSync(wikiFolderPath, { recursive: true, force: true })
    fs.mkdirSync(wikiFolderPath, { recursive: true })
    fs.writeFileSync(path.join(wikiFolderPath, '00-index.md'), [
      '# Wiki Index',
      '',
      'Open [[Target Note|目标文档]].',
      '',
      'Open legacy [[旧显示名|Target Note]].',
      '',
      'Create [[Missing Note]].',
    ].join('\n'))
    fs.writeFileSync(path.join(wikiFolderPath, 'Target Note.md'), '# Target Note\n\nJump worked.\n')
  })

  test.beforeEach(async ({}, testInfo) => {
    userDataDir = path.join(os.tmpdir(), `playwright-e2e-reading-${testInfo.workerIndex}-${Date.now()}`)
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
    try { fs.rmSync(wikiFolderPath, { recursive: true, force: true }) } catch {}
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

  test('should expose reading-first tools and hide removed maintenance tools', async () => {
    await mockOpenFileDialog([fixturePath])

    await window.locator('[data-guide="file-opener"]').click()
    await expect(window.getByRole('heading', { name: 'Sample Document' })).toBeVisible()

    await window.getByRole('button', { name: '工具' }).click()
    const menu = window.getByRole('menu')
    await expect(menu.getByRole('menuitem', { name: /阅读工具/ })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /阅读时间线/ })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /索引诊断/ })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /文件信息/ })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /文档健康检查/ })).toHaveCount(0)
    await expect(menu.getByRole('menuitem', { name: /图片检查面板/ })).toHaveCount(0)
    await expect(menu.getByRole('menuitem', { name: /反向引用/ })).toHaveCount(0)
    await expect(menu.getByRole('menuitem', { name: /文档图谱/ })).toHaveCount(0)
    await expect(menu.getByRole('menuitem', { name: /缺失链接/ })).toHaveCount(0)

    await menu.getByRole('menuitem', { name: /阅读工具/ }).click()
    const readingTools = window.locator('section[aria-label="阅读工具侧栏"]')
    await expect(readingTools).toBeVisible()
    await readingTools.getByRole('button', { name: '关闭' }).click()

    await window.getByRole('button', { name: '工具' }).click()
    await window.getByRole('menuitem', { name: /文件信息/ }).click()
    await expect(window.getByRole('heading', { name: /文件信息/ })).toBeVisible()
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

  test('should open workspace wiki links to matching markdown files', async () => {
    await mockOpenFileDialog([wikiFolderPath])

    await window.getByRole('button', { name: '打开文件夹' }).click()
    await expect(window.getByRole('heading', { name: 'Wiki Index' })).toBeVisible()

    await window.getByRole('link', { name: '目标文档' }).click()
    await expect(window.getByRole('heading', { name: 'Target Note' })).toBeVisible()
    await expect(window.getByText('Jump worked.')).toBeVisible()
    await expect(window.getByRole('tab', { name: 'Target Note.md' })).toBeVisible()
  })

  test('should restore file tabs without reopening the folder tree on restart', async () => {
    await mockOpenFileDialog([wikiFolderPath])

    await window.getByRole('button', { name: '打开文件夹' }).click()
    await expect(window.getByRole('heading', { name: 'Wiki Index' })).toBeVisible()
    await expect(window.getByText(path.basename(wikiFolderPath))).toBeVisible()

    await electronApp.close()
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

    await expect(window.getByRole('heading', { name: 'Wiki Index' })).toBeVisible()
    await expect(window.getByRole('button', { name: '打开文件：00-index.md' })).toHaveCount(0)
  })
})
