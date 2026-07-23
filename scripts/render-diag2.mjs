import { _electron as electron } from '@playwright/test'
import path from 'path'
import { spawn } from 'child_process'
const root = '/Users/liujun/aimarkdown/ai-markdown-reader'
const vite = spawn('npx', ['vite', 'preview', '--port', '5173', '--strictPort'], { cwd: root, stdio: 'pipe' })
await new Promise(r => setTimeout(r, 4000))
const app = await electron.launch({ args: [path.join(root, 'dist-electron/electron/main.js'), '--no-sandbox', '--disable-setuid-sandbox', `--user-data-dir=/tmp/rc2-${Date.now()}`] })
const win = await app.firstWindow()
await win.waitForLoadState('domcontentloaded')
await win.waitForSelector('header', { timeout: 10000 })
await win.evaluate(() => localStorage.setItem('has-seen-guide', '1'))
await win.reload()
await win.waitForSelector('header', { timeout: 10000 })
await win.waitForTimeout(1000)
await app.evaluate(({ dialog }, fp) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [fp], bookmarks: [] }) }, path.join(root, 'test-docs/comprehensive-test.md'))
await win.locator('header button[title="打开文件"]').click({ force: true })
await win.waitForTimeout(8000)
const diag = await win.evaluate(() => {
  const shell = document.querySelector('._appShell')
  if (!shell) return JSON.stringify({ error: 'no _appShell' })
  const children = Array.from(shell.children).map(c => ({
    tag: c.tagName,
    cls: c.className?.slice(0, 30),
    h: c.offsetHeight,
    flex: getComputedStyle(c).flex,
  }))
  return JSON.stringify({ shellH: shell.offsetHeight, children })
})
console.log('DIAG2:', JSON.stringify(diag))
vite.kill(); await app.close()
