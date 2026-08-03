import type { AppUpdater, ProgressInfo, UpdateInfo } from 'electron-updater'
import type { UpdateStatePayload } from '../shared'

type Logger = {
  info: (message: string, meta?: Record<string, unknown>) => void
  warn: (message: string, meta?: Record<string, unknown>) => void
  error: (message: string, meta?: Record<string, unknown>) => void
}

export interface UpdateServiceOptions {
  updater: AppUpdater
  isPackaged: boolean
  currentVersion: string
  broadcast: (state: UpdateStatePayload) => void
  logger: Logger
  schedule?: (callback: () => void, delayMs: number) => unknown
}

export interface UpdateService {
  start: (autoCheckDelayMs?: number) => void
  getState: () => UpdateStatePayload
  checkForUpdates: (manual?: boolean) => Promise<UpdateStatePayload>
  downloadUpdate: () => Promise<UpdateStatePayload>
  installUpdate: () => boolean
}

/** electron-updater 的 releaseNotes 可能是字符串或分版本数组。 */
export function normalizeReleaseNotes(info: Pick<UpdateInfo, 'releaseNotes' | 'releaseName'>): string | undefined {
  if (typeof info.releaseNotes === 'string') {
    return info.releaseNotes.trim().slice(0, 8_000) || undefined
  }
  if (Array.isArray(info.releaseNotes)) {
    const notes = info.releaseNotes
      .map((entry) => {
        const version = typeof entry.version === 'string' ? entry.version.trim() : ''
        const note = typeof entry.note === 'string' ? entry.note.trim() : ''
        if (!note) return ''
        return version ? `${version}\n${note}` : note
      })
      .filter(Boolean)
      .join('\n\n')
    if (notes) return notes.slice(0, 8_000)
  }
  return typeof info.releaseName === 'string' && info.releaseName.trim()
    ? info.releaseName.trim().slice(0, 8_000)
    : undefined
}

function normalizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/latest-(mac|linux)\.yml|latest\.yml|404/i.test(message)) {
    return '暂未找到适用于当前平台的更新清单，请稍后再试。'
  }
  return message.replace(/^Error:\s*/i, '').trim() || '未知更新错误'
}

export function createUpdateService(options: UpdateServiceOptions): UpdateService {
  const { updater, isPackaged, currentVersion, broadcast, logger } = options
  const schedule = options.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs))
  let started = false
  let state: UpdateStatePayload = {
    status: isPackaged ? 'idle' : 'unsupported',
    currentVersion,
    manual: false,
  }

  const setState = (patch: Partial<UpdateStatePayload>): UpdateStatePayload => {
    state = { ...state, ...patch }
    broadcast({ ...state })
    return { ...state }
  }
  const getStatus = () => state.status

  const onChecking = () => {
    logger.info('Checking for update', { manual: state.manual })
  }

  const onAvailable = (info: UpdateInfo) => {
    logger.info('Update available', { version: info.version })
    setState({
      status: 'available',
      version: info.version,
      releaseNotes: normalizeReleaseNotes(info),
      percent: undefined,
      transferred: undefined,
      total: undefined,
      error: undefined,
      checkedAt: Date.now(),
    })
  }

  const onNotAvailable = (info: UpdateInfo) => {
    logger.info('Update not available', { version: info.version })
    setState({
      status: 'up-to-date',
      version: undefined,
      releaseNotes: undefined,
      percent: undefined,
      transferred: undefined,
      total: undefined,
      error: undefined,
      checkedAt: Date.now(),
    })
  }

  const onProgress = (progress: ProgressInfo) => {
    setState({
      status: 'downloading',
      manual: true,
      percent: Math.max(0, Math.min(100, progress.percent)),
      transferred: progress.transferred,
      total: progress.total,
      error: undefined,
    })
  }

  const onDownloaded = (info: UpdateInfo) => {
    logger.info('Update downloaded', { version: info.version })
    setState({
      status: 'downloaded',
      manual: true,
      version: info.version,
      releaseNotes: normalizeReleaseNotes(info) ?? state.releaseNotes,
      percent: 100,
      error: undefined,
    })
  }

  const onError = (error: Error) => {
    const message = normalizeError(error)
    logger.error('Auto-updater error', { error: String(error), manual: state.manual })
    setState({ status: 'error', error: message, checkedAt: Date.now() })
  }

  const start = (autoCheckDelayMs = 10_000): void => {
    if (started) return
    started = true
    updater.autoDownload = false
    updater.autoInstallOnAppQuit = true
    updater.on('checking-for-update', onChecking)
    updater.on('update-available', onAvailable)
    updater.on('update-not-available', onNotAvailable)
    updater.on('download-progress', onProgress)
    updater.on('update-downloaded', onDownloaded)
    updater.on('error', onError)

    if (!isPackaged) return
    schedule(() => {
      void checkForUpdates(false)
    }, autoCheckDelayMs)
  }

  const checkForUpdates = async (manual = true): Promise<UpdateStatePayload> => {
    if (!isPackaged) {
      return setState({
        status: 'unsupported',
        manual,
        error: manual ? '开发模式不连接发布源，请在安装包版本中检查更新。' : undefined,
        checkedAt: manual ? Date.now() : state.checkedAt,
      })
    }
    if (state.status === 'checking' || state.status === 'downloading') {
      return { ...state }
    }
    setState({
      status: 'checking',
      manual,
      version: undefined,
      releaseNotes: undefined,
      error: undefined,
      percent: undefined,
      transferred: undefined,
      total: undefined,
    })
    try {
      await updater.checkForUpdates()
    } catch (error) {
      // 某些 provider 会同时 emit error 并 reject；避免重复覆盖更具体的事件状态。
      if (getStatus() === 'checking') onError(error as Error)
    }
    return { ...state }
  }

  const downloadUpdate = async (): Promise<UpdateStatePayload> => {
    if (!isPackaged) return checkForUpdates(true)
    if (state.status === 'downloading' || state.status === 'downloaded') return { ...state }
    if (!state.version || (state.status !== 'available' && state.status !== 'error')) {
      return setState({ status: 'error', manual: true, error: '当前没有可下载的更新。' })
    }
    setState({ status: 'downloading', manual: true, percent: 0, error: undefined })
    try {
      await updater.downloadUpdate()
    } catch (error) {
      if (getStatus() === 'downloading') onError(error as Error)
    }
    return { ...state }
  }

  const installUpdate = (): boolean => {
    if (!isPackaged || state.status !== 'downloaded') {
      logger.warn('Ignored install request before update was downloaded', { status: state.status })
      return false
    }
    logger.info('Restarting to install update', { version: state.version })
    updater.quitAndInstall(false, true)
    return true
  }

  return {
    start,
    getState: () => ({ ...state }),
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  }
}
