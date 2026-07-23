/**
 * IPC 事件订阅 hook（渲染进程统一封装）
 *
 * 取代散落各处的 useEffect + 手动 on/off 配对（App.tsx、ThemeContext、
 * UpdateNotification、useFileWatcher、ElectronFolderExplorer 各自订阅）。
 *
 * 提供：
 *  - useIPCEvent(channel, callback)：单个事件订阅，自动 on/off + 清理
 *  - useOpenFileEvent / useOpenFolderEvent / useFileChangedEvent：常用便捷 hook
 *  - useUpdateEvents：聚合 4 个更新事件
 *
 * 注意：preload 的事件 API 要求保存同一回调引用用于 off，本 hook 用 useCallback
 * + useRef 保证引用稳定。
 */
import { useEffect, useRef } from 'react'
import { getElectronAPI } from './client'
import type {
  SystemTheme,
  UpdateProgressPayload,
  UpdateVersionPayload,
  UpdateErrorPayload,
} from '../../shared'

/**
 * 缓存的 electronAPI 引用。preload 的方法引用在应用生命周期内稳定
 * （contextBridge.exposeInMainWorld 暴露一次），这里缓存避免每次 render 重取
 * 导致 subscribe/unsubscribe 依赖变化触发重复订阅。
 */
let cachedAPI: ReturnType<typeof getElectronAPI> | null = null
let apiResolved = false
function getCachedAPI() {
  if (!apiResolved) {
    cachedAPI = getElectronAPI()
    apiResolved = true
  }
  return cachedAPI
}

/**
 * 订阅单个 IPC 事件，组件卸载自动取消订阅。
 * @param subscribe   preload 的 on 方法
 * @param unsubscribe preload 的 off 方法
 * @param callback    事件回调（内部用 ref 保持稳定引用）
 */
function useIPCSubscription<TCallback extends (...args: any[]) => any>(
  subscribe: ((cb: TCallback) => void) | undefined,
  unsubscribe: ((cb: TCallback) => void) | undefined,
  callback: TCallback
): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!subscribe || !unsubscribe) return
    const handler = ((...args: any[]) => callbackRef.current(...args)) as TCallback
    subscribe(handler)
    return () => unsubscribe(handler)
  }, [subscribe, unsubscribe])
}

/** 订阅 open-file 事件（主进程发送打开文件请求） */
export function useOpenFileEvent(callback: (filePath: string) => void): void {
  const api = getCachedAPI()
  useIPCSubscription(api?.onOpenFile, api?.offOpenFile, callback)
}

/** 订阅 open-folder 事件 */
export function useOpenFolderEvent(callback: (folderPath: string) => void): void {
  const api = getCachedAPI()
  useIPCSubscription(api?.onOpenFolder, api?.offOpenFolder, callback)
}

/** 订阅 file-changed 事件（文件被外部修改） */
export function useFileChangedEvent(callback: (filePath: string) => void): void {
  const api = getCachedAPI()
  useIPCSubscription(api?.onFileChanged, api?.offFileChanged, callback)
}

/** 订阅系统主题变更事件 */
export function useSystemThemeEvent(callback: (theme: SystemTheme) => void): void {
  const api = getCachedAPI()
  useIPCSubscription(api?.onSystemThemeChange, api?.offSystemThemeChange, callback)
}

/** 自动更新的 4 个事件聚合 */
export interface UpdateEvents {
  onAvailable?: (info: UpdateVersionPayload) => void
  onProgress?: (progress: UpdateProgressPayload) => void
  onDownloaded?: (info: UpdateVersionPayload) => void
  onError?: (error: UpdateErrorPayload) => void
}

/** 订阅全部 4 个更新事件 */
export function useUpdateEvents(events: UpdateEvents): void {
  const api = getCachedAPI()
  // 逐个订阅；callback 用 ref 稳定（useIPCSubscription 内部处理）
  useIPCSubscription(api?.onUpdateAvailable, api?.offUpdateAvailable, (info: UpdateVersionPayload) => {
    events.onAvailable?.(info)
  })
  useIPCSubscription(api?.onUpdateProgress, api?.offUpdateProgress, (progress: UpdateProgressPayload) => {
    events.onProgress?.(progress)
  })
  useIPCSubscription(api?.onUpdateDownloaded, api?.offUpdateDownloaded, (info: UpdateVersionPayload) => {
    events.onDownloaded?.(info)
  })
  useIPCSubscription(api?.onUpdateError, api?.offUpdateError, (error: UpdateErrorPayload) => {
    events.onError?.(error)
  })
}
