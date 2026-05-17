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
    docs: 12,
    mb: 5,
    timeout: 60_000,
    keep: false,
    out: '',
  }

  for (const arg of args) {
    if (arg.startsWith('--docs=')) parsed.docs = Number(arg.split('=')[1])
    if (arg.startsWith('--mb=')) parsed.mb = Number(arg.split('=')[1])
    if (arg.startsWith('--timeout=')) parsed.timeout = Number(arg.split('=')[1])
    if (arg.startsWith('--out=')) parsed.out = arg.split('=').slice(1).join('=')
    if (arg === '--keep') parsed.keep = true
  }

  if (!Number.isFinite(parsed.docs) || parsed.docs < 1) parsed.docs = 12
  if (!Number.isFinite(parsed.mb) || parsed.mb < 1) parsed.mb = 5
  if (!Number.isFinite(parsed.timeout) || parsed.timeout < 5_000) parsed.timeout = 60_000
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

function makeLargeMarkdown(index, targetBytes) {
  const label = String(index + 1).padStart(2, '0')
  const lines = [
    `# Perf Large Document ${label}`,
    '',
    `This fixture is generated for startup performance testing. Document ${label}.`,
    '',
  ]

  let currentBytes = byteLength(lines.join('\n'))
  let section = 1
  while (currentBytes < targetBytes) {
    const chunk = [
      `## Section ${section}`,
      '',
      'This paragraph is intentionally repetitive so the renderer, outline parser, reading landmarks, search state, and file loading path all see a realistic long Markdown document.',
      'It contains Chinese text for mixed-width layout: 启动性能测试、长文档阅读、标签恢复、懒加载验证。',
      '',
      '```typescript',
      `export const perfSection${section} = { index: ${section}, title: 'Large startup fixture' }`,
      '```',
      '',
      `- checklist item ${section}`,
      `- reading note ${section}`,
      '',
      '| Metric | Value |',
      '|---|---:|',
      `| Section | ${section} |`,
      `| Target bytes | ${targetBytes} |`,
      ''
    ]
    if (section % 12 === 0) {
      chunk.push('Inline math sample: $E = mc^2$ and $a^2 + b^2 = c^2$.', '')
    }
    lines.push(...chunk)
    currentBytes += byteLength(chunk.join('\n')) + 1
    section += 1
  }

  return lines.join('\n')
}

function generateFixtures() {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-markdown-reader-startup-perf-'))
  const docsDir = path.join(baseDir, 'docs')
  fs.mkdirSync(docsDir, { recursive: true })
  const targetBytes = options.mb * 1024 * 1024

  const files = []
  for (let i = 0; i < options.docs; i += 1) {
    const name = `perf-large-${String(i + 1).padStart(2, '0')}.md`
    const filePath = path.join(docsDir, name)
    fs.writeFileSync(filePath, makeLargeMarkdown(i, targetBytes))
    files.push({
      id: `perf-tab-${i + 1}`,
      name,
      filePath,
      size: fs.statSync(filePath).size,
      lastModified: Date.now() - i * 1000,
    })
  }

  return { baseDir, files }
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

async function seedLocalStorage(userDataDir, entries) {
  const { electronApp, page } = await launchApp(userDataDir)
  await page.evaluate((items) => {
    localStorage.clear()
    for (const [key, value] of Object.entries(items)) {
      localStorage.setItem(key, value)
    }
  }, entries)
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
    return {
      processCount: 0,
      workingSetMb: 0,
    }
  }
}

async function measureBaseline() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-markdown-reader-baseline-'))
  await seedLocalStorage(userDataDir, {
    'has-seen-guide': 'true',
  })

  const launch = await launchApp(userDataDir)
  const homeVisibleAt = performance.now()
  const memory = await getMemorySummary(launch.electronApp)
  await launch.electronApp.close()

  return {
    name: 'baseline-empty-session',
    userDataDir,
    ...launch.metrics,
    homeReadyMs: round(homeVisibleAt - launch.startedAt),
    ...memory,
  }
}

async function measureLargeSession(files) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-markdown-reader-large-session-'))
  const activeTab = files[0]
  const targetTab = files[files.length - 1]

  await seedLocalStorage(userDataDir, {
    'has-seen-guide': 'true',
    'session-tabs': JSON.stringify(files.map(file => ({
      id: file.id,
      name: file.name,
      filePath: file.filePath,
      size: file.size,
      lastModified: file.lastModified,
    }))),
    'session-active-tab': activeTab.id,
  })

  const launch = await launchApp(userDataDir)

  await launch.page.getByRole('tab', { name: targetTab.name }).waitFor({ state: 'visible', timeout: options.timeout })
  const tabsRestoredAt = performance.now()

  await launch.page.getByRole('heading', { name: 'Perf Large Document 01' }).waitFor({ state: 'visible', timeout: options.timeout })
  const activeDocumentRenderedAt = performance.now()

  const switchStartedAt = performance.now()
  await launch.page.getByRole('tab', { name: targetTab.name }).click()
  await launch.page.getByRole('heading', { name: `Perf Large Document ${String(files.length).padStart(2, '0')}` }).waitFor({ state: 'visible', timeout: options.timeout })
  const inactiveDocumentRenderedAt = performance.now()

  const memory = await getMemorySummary(launch.electronApp)
  await launch.electronApp.close()

  return {
    name: `large-session-${files.length}x${options.mb}mb`,
    userDataDir,
    totalFixtureMb: round(files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024),
    activeFileMb: round(activeTab.size / 1024 / 1024),
    ...launch.metrics,
    tabsRestoredMs: round(tabsRestoredAt - launch.startedAt),
    activeDocumentRenderedMs: round(activeDocumentRenderedAt - launch.startedAt),
    inactiveTabSwitchRenderMs: round(inactiveDocumentRenderedAt - switchStartedAt),
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
  const fixture = generateFixtures()
  const results = []

  console.log(`Preview server: ${preview.reused ? 'reused' : 'started'} (${previewUrl})`)
  console.log(`Generated ${fixture.files.length} files in ${fixture.baseDir}`)
  console.log(`Fixture size: ${options.mb} MB per file, ${round(fixture.files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024)} MB total`)

  try {
    const baseline = await measureBaseline()
    results.push(baseline)
    printResult(baseline)

    const largeSession = await measureLargeSession(fixture.files)
    results.push(largeSession)
    printResult(largeSession)

    const summary = {
      generatedAt: new Date().toISOString(),
      options,
      fixtureDir: fixture.baseDir,
      results,
    }

    if (options.out) {
      const outPath = path.resolve(rootDir, options.out)
      fs.mkdirSync(path.dirname(outPath), { recursive: true })
      fs.writeFileSync(outPath, JSON.stringify(summary, null, 2))
      console.log(`\nWrote ${path.relative(rootDir, outPath)}`)
    }

    if (!options.keep) {
      fs.rmSync(fixture.baseDir, { recursive: true, force: true })
      for (const result of results) {
        fs.rmSync(result.userDataDir, { recursive: true, force: true })
      }
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
