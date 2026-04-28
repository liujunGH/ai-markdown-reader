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
        path.join(__dirname, '../electron/main.js'),
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--user-data-dir=${userDataDir}`,
      ],
    })
    window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
  })

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test('should launch application successfully', async () => {
    const title = await window.title()
    expect(title).toBe('Markdown Reader')
  })

  test('should have basic UI elements', async () => {
    const root = window.locator('#root')
    await expect(root).toBeVisible()
  })
})
