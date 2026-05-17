#!/usr/bin/env node
import { _electron } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const electronMain = path.join(rootDir, 'dist-electron', 'main.js')
const distIndex = path.join(rootDir, 'dist', 'index.html')
const previewUrl = 'http://localhost:5173'
const options = parseArgs(process.argv.slice(2))

function parseArgs(args) {
  const parsed = {
    mb: 5,
    timeout: 60_000,
    query: 'needle-target',
    keep: false,
    out: '',
  }

  for (const arg of args) {
    if (arg.startsWith('--mb=')) parsed.mb = Number(arg.split('=')[1])
    if (arg.startsWith('--timeout=')) parsed.timeout = Number(arg.split('=')[1])
    if (arg.startsWith('--query=')) parsed.query = arg.split('=').slice(1).join('=')
    if (arg.startsWith('--out=')) parsed.out = arg.split('=').slice(1).join('=')
    if (arg === '--keep') parsed.keep = true
  }

  if (!Number.isFinite(parsed.mb) || parsed.mb < 1) parsed.mb = 5
  if (!Number.isFinite(parsed.timeout) || parsed.timeout < 5_000) parsed.timeout = 60_000
  if (!parsed.query.trim()) parsed.query = 'needle-target'
  return parsed
}

function assertBuildArtifacts() {
  const missing = []
  if (!fs.existsSync(electronMain)) missing.push(path.relative(rootDir, electronMain))
  if (!fs.existsSync(distIndex)) missing.push(path.relative(rootDir, distIndex))
  if (missing.length > 0) {
    throw new Error(`Missing build artifacts: ${missing.join(', ')}. Run npm run electron:compile && npm run build first.`)
  }
}

function byteLength(text) {
  return Buffer.byteLength(text, 'utf8')
}

function makeLargeMarkdown(targetBytes, query) {
  const lines = [
    '# Perf Document Fixture',
    '',
    `First visible search marker: ${query}`,
    '',
  ]
  let currentBytes = byteLength(lines.join('\n'))
  let section = 1

  while (currentBytes < targetBytes) {
    const chunk = [
      `## Section ${section}`,
      '',
      'This paragraph is generated to exercise long document rendering, virtual section activation, search highlighting, and scrolling.',
      '中文混排：长文档阅读、搜索高亮、虚拟渲染、滚动触发。',
      section % 25 === 0 ? `Repeated search marker ${query} in section ${section}.` : `Regular paragraph ${section}.`,
      '',
      '```typescript',
      `export const section${section} = ${section}`,
      '```',
      '',
      '| Column | Value |',
      '|---|---:|',
      `| Section | ${section} |`,
      '',
    ]
    lines.push(...chunk)
    currentBytes += byteLength(chunk.join('\n')) + 1
    section += 1
  }

  lines.push('', '## Tail Section', '', `Tail marker for scroll verification: ${query}`)
  return lines.join('\n')
}

function generateFixture() {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-markdown-reader-document-perf-'))
  const filePath = path.join(baseDir, 'perf-document.md')
  const targetBytes = options.mb * 1024 * 1024
  fs.writeFileSync(filePath, makeLargeMarkdown(targetBytes, options.query))
  const stat = fs.statSync(filePath)
  return {
    baseDir,
    file: {
      id: 'perf-document-tab',
      name: 'perf-document.md',
      filePath,
      size: stat.size,
      lastModified: stat.mtimeMs,
    },
  }
}

async function isUrlReady(url) {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

async function waitForPreview(url, timeoutMs) {
  const startedAt = performance.now()
  while (performance.now() - startedAt < timeoutMs) {
    if (await isUrlReady(url)) return
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function ensurePreviewServer() {
  if (await isUrlReady(previewUrl)) {
    return { reused: true, close: async () => undefined }
  }

  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const child = spawn(command, ['vite', 'preview', '--port', '5173', '--strictPort'], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  })

  let output = ''
  child.stdout.on('data', chunk => { output += chunk.toString() })
  child.stderr.on('data', chunk => { output += chunk.toString() })

  try {
    await waitForPreview(previewUrl, options.timeout)
  } catch (error) {
    child.kill()
    throw new Error(`${error.message}\n${output}`)
  }

  return {
    reused: false,
    close: async () => {
      child.kill()
      await new Promise(resolve => child.once('exit', resolve))
    },
  }
}

async function launchApp(userDataDir) {
  const startedAt = performance.now()
  const electronApp = await _electron.launch({
    args: [
      electronMain,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--user-data-dir=${userDataDir}`,
    ],
    env: {
      ...process.env,
      AI_MARKDOWN_PERF: '1',
    },
  })
  const firstWindowAt = performance.now()
  const page = await electronApp.firstWindow()
  await page.waitForLoadState('domcontentloaded', { timeout: options.timeout })
  const domContentLoadedAt = performance.now()
  await page.locator('#root').waitFor({ state: 'visible', timeout: options.timeout })
  const rootVisibleAt = performance.now()

  return {
    electronApp,
    page,
    startedAt,
    metrics: {
      processLaunchMs: round(firstWindowAt - startedAt),
      domContentLoadedMs: round(domContentLoadedAt - startedAt),
      rootVisibleMs: round(rootVisibleAt - startedAt),
    },
  }
}

async function seedLocalStorage(userDataDir, file) {
  const { electronApp, page } = await launchApp(userDataDir)
  await page.evaluate((item) => {
    localStorage.clear()
    localStorage.setItem('has-seen-guide', 'true')
    localStorage.setItem('session-tabs', JSON.stringify([item]))
    localStorage.setItem('session-active-tab', item.id)
  }, {
    id: file.id,
    name: file.name,
    filePath: file.filePath,
    size: file.size,
    lastModified: file.lastModified,
  })
  await electronApp.close()
}

async function getMemorySummary(electronApp) {
  try {
    const metrics = await electronApp.evaluate(({ app }) => app.getAppMetrics())
    const totalWorkingSetKb = metrics.reduce((sum, item) => sum + (item.memory?.workingSetSize || 0), 0)
    return {
      processCount: metrics.length,
      workingSetMb: round(totalWorkingSetKb / 1024),
    }
  } catch {
    return { processCount: 0, workingSetMb: 0 }
  }
}

async function measureDocument(file) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-markdown-reader-document-user-'))
  await seedLocalStorage(userDataDir, file)

  const launch = await launchApp(userDataDir)
  await launch.page.getByRole('heading', { name: 'Perf Document Fixture' }).waitFor({ state: 'visible', timeout: options.timeout })
  const documentRenderedAt = performance.now()

  const searchStartedAt = performance.now()
  await launch.page.locator('button[data-guide="search"]').click()
  const searchPanelOpenedAt = performance.now()
  await launch.page.locator('input[aria-label="搜索关键词"]').fill(options.query)
  const searchFilledAt = performance.now()
  await launch.page.locator('mark.search-highlight').first().waitFor({ state: 'visible', timeout: options.timeout })
  const firstSearchHighlightAt = performance.now()

  const scrollStartedAt = performance.now()
  await launch.page.locator('main').evaluate((main) => {
    main.scrollTop = main.scrollHeight
  })
  await launch.page.getByRole('heading', { name: 'Tail Section' }).waitFor({ state: 'visible', timeout: options.timeout })
  const tailRenderedAt = performance.now()

  const memory = await getMemorySummary(launch.electronApp)
  await launch.electronApp.close()

  return {
    name: `large-document-${options.mb}mb`,
    userDataDir,
    fileMb: round(file.size / 1024 / 1024),
    ...launch.metrics,
    documentRenderedMs: round(documentRenderedAt - launch.startedAt),
    openSearchMs: round(searchPanelOpenedAt - searchStartedAt),
    fillSearchMs: round(searchFilledAt - searchPanelOpenedAt),
    waitFirstHighlightMs: round(firstSearchHighlightAt - searchFilledAt),
    searchFirstHighlightMs: round(firstSearchHighlightAt - searchStartedAt),
    scrollToTailRenderMs: round(tailRenderedAt - scrollStartedAt),
    ...memory,
  }
}

function round(value) {
  return Math.round(value * 10) / 10
}

function printResult(result) {
  console.log(`\n${result.name}`)
  console.table(result)
}

async function main() {
  assertBuildArtifacts()
  const preview = await ensurePreviewServer()
  const fixture = generateFixture()

  console.log(`Preview server: ${preview.reused ? 'reused' : 'started'} (${previewUrl})`)
  console.log(`Generated ${fixture.file.filePath}`)
  console.log(`Fixture size: ${round(fixture.file.size / 1024 / 1024)} MB`)

  try {
    const result = await measureDocument(fixture.file)
    printResult(result)

    const summary = {
      generatedAt: new Date().toISOString(),
      options,
      fixtureDir: fixture.baseDir,
      result,
    }

    if (options.out) {
      const outPath = path.resolve(rootDir, options.out)
      fs.mkdirSync(path.dirname(outPath), { recursive: true })
      fs.writeFileSync(outPath, JSON.stringify(summary, null, 2))
      console.log(`\nWrote ${path.relative(rootDir, outPath)}`)
    }

    if (!options.keep) {
      fs.rmSync(fixture.baseDir, { recursive: true, force: true })
      fs.rmSync(result.userDataDir, { recursive: true, force: true })
    } else {
      console.log('\nKept generated fixture and userData directories for inspection.')
    }
  } finally {
    await preview.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
