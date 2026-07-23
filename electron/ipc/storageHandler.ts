/**
 * 最近文件 / 配置存储 IPC handler（8 个 channel）
 *
 * 行为与旧 main.ts 逐行对齐（get/add/remove/clear-recent-files、
 * get/set-last-folder、get/set-max-recent-files）。
 *
 * 数据仍走 config.json（原子写 + .bak 备份）。阅读数据在阶段 5 迁移到 SQLite。
 */
import { DEFAULT_MAX_RECENT_FILES } from '../../shared'
import type { IpcContext } from './context'
import { registerHandler, Channels } from './registry'

export function registerStorageHandlers(ctx: IpcContext): void {
  const { loadConfigStore, saveConfigStore } = ctx

  // ---- get-recent-files (dedup) ----
  registerHandler(
    Channels.GET_RECENT_FILES,
    async () => {
      return loadConfigStore().recentFiles
    },
  )

  // ---- add-recent-file ----
  registerHandler(
    Channels.ADD_RECENT_FILE,
    async (_event, file: { name: string; filePath: string }) => {
      const store = loadConfigStore()
      const existing = store.recentFiles.findIndex((f) => f.filePath === file.filePath)
      if (existing !== -1) {
        store.recentFiles.splice(existing, 1)
      }
      store.recentFiles.unshift({ ...file, openedAt: Date.now() })
      const maxFiles = store.maxRecentFiles || DEFAULT_MAX_RECENT_FILES
      if (store.recentFiles.length > maxFiles) {
        store.recentFiles.pop()
      }
      saveConfigStore(store)
    },
  )

  // ---- remove-recent-file ----
  registerHandler(
    Channels.REMOVE_RECENT_FILE,
    async (_event, filePath: string) => {
      const store = loadConfigStore()
      store.recentFiles = store.recentFiles.filter((f) => f.filePath !== filePath)
      saveConfigStore(store)
    },
  )

  // ---- clear-recent-files ----
  registerHandler(
    Channels.CLEAR_RECENT_FILES,
    async () => {
      const store = loadConfigStore()
      store.recentFiles = []
      saveConfigStore(store)
    },
  )

  // ---- get-last-folder (dedup) ----
  registerHandler(
    Channels.GET_LAST_FOLDER,
    async () => {
      return loadConfigStore().lastFolder
    },
  )

  // ---- set-last-folder ----
  registerHandler(
    Channels.SET_LAST_FOLDER,
    async (_event, folderPath: string) => {
      const store = loadConfigStore()
      store.lastFolder = folderPath
      saveConfigStore(store)
    },
  )

  // ---- get-max-recent-files (dedup) ----
  registerHandler(
    Channels.GET_MAX_RECENT_FILES,
    async () => {
      return loadConfigStore().maxRecentFiles || DEFAULT_MAX_RECENT_FILES
    },
  )

  // ---- set-max-recent-files ----
  registerHandler(
    Channels.SET_MAX_RECENT_FILES,
    async (_event, max: number) => {
      const store = loadConfigStore()
      store.maxRecentFiles = max
      if (store.recentFiles.length > max) {
        store.recentFiles = store.recentFiles.slice(0, max)
      }
      saveConfigStore(store)
    },
  )
}
