import { test, expect, _electron, type ElectronApplication, type Page } from '@playwright/test'
import path from 'path'
import os from 'os'

test.describe('App Launch', () => {
  let electronApp: ElectronApplication
  let window: Page

  test.beforeEach(async ({}, testInfo) => {
    const userDataDir = path.join(os.tmpdir(), `playwright-e2e-${testInfo.workerIndex}-${Date.now()}`)
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
    // v2 AppShell: 等待 header 渲染（含 "Markdown Reader (v2)"）
    await window.waitForSelector('header', { timeout: 10000 })
  })

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test('should launch application successfully', async () => {
    // v2: 验证 AppShell header 渲染
    const header = window.locator('header')
    await expect(header).toBeVisible()
    await expect(header).toContainText('Markdown Reader')
  })

  test('should have basic UI elements', async () => {
    // v2: 工具栏按钮（title 属性匹配，按钮文本是 emoji）
    const openFileBtn = window.locator('header button[title="打开文件"]')
    await expect(openFileBtn).toBeVisible()
  })
})
