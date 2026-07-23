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
    // Wait for React to render the welcome home
    await window.waitForSelector('section[aria-label="开始阅读"]', { timeout: 10000 })
  })

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test('should launch application successfully', async () => {
    // Verify the app has rendered the welcome home section
    const welcomeSection = window.locator('section[aria-label="开始阅读"]')
    await expect(welcomeSection).toBeVisible()
    // Verify version is shown in the status bar
    await expect(window.getByText(/v\d+\.\d+\.\d+/)).toBeVisible()
  })

  test('should have basic UI elements', async () => {
    // The welcome home should be visible with primary action buttons.
    // Use data-guide selector: '打开文件' substring-matches the toolbar's
    // '打开文件夹' button, so role+name is ambiguous here.
    await expect(window.locator('button[data-guide="file-opener"]')).toBeVisible()
    await expect(window.getByRole('button', { name: '打开文件夹' })).toBeVisible()
  })
})
