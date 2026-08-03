import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import type { AppUpdater, ProgressInfo, UpdateInfo } from 'electron-updater'
import { createUpdateService, normalizeReleaseNotes } from '../updateService'

class FakeUpdater extends EventEmitter {
  autoDownload = true
  autoInstallOnAppQuit = false
  checkForUpdates = vi.fn(async () => null)
  downloadUpdate = vi.fn(async () => [] as string[])
  quitAndInstall = vi.fn()
}

const info = (version: string, releaseNotes?: UpdateInfo['releaseNotes']): UpdateInfo => ({
  version,
  files: [],
  path: '',
  sha512: '',
  releaseDate: '2026-08-03T00:00:00.000Z',
  releaseNotes,
} as UpdateInfo)

function setup(isPackaged = true) {
  const updater = new FakeUpdater()
  const states: Array<ReturnType<ReturnType<typeof createUpdateService>['getState']>> = []
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  let scheduled: (() => void) | undefined
  const service = createUpdateService({
    updater: updater as unknown as AppUpdater,
    isPackaged,
    currentVersion: '2.0.1',
    broadcast: (state) => states.push(state),
    logger,
    schedule: (callback) => { scheduled = callback },
  })
  service.start()
  return { updater, service, states, logger, runScheduled: () => scheduled?.() }
}

describe('updateService', () => {
  it('disables automatic download and schedules a silent packaged check', async () => {
    const { updater, service, runScheduled } = setup()
    expect(updater.autoDownload).toBe(false)
    expect(updater.autoInstallOnAppQuit).toBe(true)

    updater.checkForUpdates.mockImplementationOnce(async () => {
      updater.emit('update-not-available', info('2.0.1'))
      return null
    })
    runScheduled()
    await vi.waitFor(() => expect(updater.checkForUpdates).toHaveBeenCalledTimes(1))
    expect(service.getState()).toMatchObject({ status: 'up-to-date', manual: false })
  })

  it('keeps development checks local and reports why manual checking is unavailable', async () => {
    const { updater, service } = setup(false)
    const state = await service.checkForUpdates(true)
    expect(updater.checkForUpdates).not.toHaveBeenCalled()
    expect(state).toMatchObject({ status: 'unsupported', manual: true })
    expect(state.error).toContain('安装包版本')
  })

  it('carries release notes through download progress and performs a real install restart', async () => {
    const { updater, service } = setup()
    updater.checkForUpdates.mockImplementationOnce(async () => {
      updater.emit('update-available', info('2.1.0', [{ version: '2.1.0', note: '更快的长文档渲染' }]))
      return null
    })
    await service.checkForUpdates(true)
    expect(service.getState()).toMatchObject({
      status: 'available',
      version: '2.1.0',
      releaseNotes: '2.1.0\n更快的长文档渲染',
    })

    updater.downloadUpdate.mockImplementationOnce(async () => {
      updater.emit('download-progress', { percent: 42.4, transferred: 42, total: 100 } as ProgressInfo)
      updater.emit('update-downloaded', info('2.1.0'))
      return ['/tmp/update.zip']
    })
    const downloaded = await service.downloadUpdate()
    expect(downloaded).toMatchObject({ status: 'downloaded', percent: 100, version: '2.1.0' })
    expect(service.installUpdate()).toBe(true)
    expect(updater.quitAndInstall).toHaveBeenCalledWith(false, true)
  })

  it('allows retrying a failed download without losing the available version', async () => {
    const { updater, service } = setup()
    updater.emit('update-available', info('2.1.0', '修复更新流程'))
    updater.downloadUpdate.mockRejectedValueOnce(new Error('network unavailable'))
    const failed = await service.downloadUpdate()
    expect(failed).toMatchObject({ status: 'error', version: '2.1.0', manual: true })

    updater.downloadUpdate.mockImplementationOnce(async () => {
      updater.emit('update-downloaded', info('2.1.0'))
      return ['/tmp/update.zip']
    })
    expect((await service.downloadUpdate()).status).toBe('downloaded')
  })

  it('normalizes missing manifest errors and release note fallbacks', async () => {
    const { updater, service } = setup()
    updater.checkForUpdates.mockRejectedValueOnce(new Error('HttpError: 404 latest-mac.yml'))
    const failed = await service.checkForUpdates(true)
    expect(failed.error).toContain('更新清单')
    expect(normalizeReleaseNotes({ releaseNotes: null, releaseName: 'Version 2.1' })).toBe('Version 2.1')
  })
})
