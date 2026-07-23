/**
 * IPC 客户端（渲染进程统一封装）
 *
 * 取代散落各处的 `window.electronAPI.xxx` 直接调用 + 手动 `!window.electronAPI` 守卫。
 * 单一入口提供类型安全的 invoke，channel 名来自 shared 契约层。
 *
 * 所有方法自动处理 electronAPI 不存在的场景（返回 null / 安全拒绝），
 * 调用方无需重复写守卫。非 Electron 环境（理论上 v2 已去除，但保留防御）
 * 统一返回安全默认值。
 */
import type { ElectronAPI } from '../types/electron'

/** 取 electronAPI，不存在返回 null */
export function getElectronAPI(): ElectronAPI | null {
  return typeof window !== 'undefined' && window.electronAPI ? window.electronAPI : null
}

/** 是否运行在 Electron 环境 */
export const isElectron = (): boolean => getElectronAPI() !== null

// ============================================================
// 常用操作的便捷封装（避免每个调用方写 selector + 手动守卫）
// ============================================================

/** 读文件内容 */
export async function readFile(filePath: string) {
  const api = getElectronAPI()
  return api ? api.readFile(filePath) : { success: false as const, error: 'Not in Electron' }
}

/** 读文件夹（一层） */
export async function readFolder(folderPath: string) {
  const api = getElectronAPI()
  return api ? api.readFolder(folderPath) : { success: false as const, error: 'Not in Electron' }
}

/** 读图片为 data URL */
export async function readImageAsDataUrl(filePath: string) {
  const api = getElectronAPI()
  return api ? api.readImageAsDataUrl(filePath) : { success: false as const, error: 'Not in Electron' }
}

/** 取文件信息 */
export async function getFileInfo(filePath: string) {
  const api = getElectronAPI()
  return api ? api.getFileInfo(filePath) : { success: false as const, error: 'Not in Electron' }
}

/** 最近文件 CRUD */
export async function getRecentFiles() {
  const api = getElectronAPI()
  return api ? api.getRecentFiles() : []
}

export async function addRecentFile(file: { name: string; filePath: string }) {
  const api = getElectronAPI()
  if (api) await api.addRecentFile(file)
}

/** 窗口操作 */
export async function setTitle(title: string) {
  const api = getElectronAPI()
  if (api) await api.setTitle(title)
}

export async function registerWindowFiles(filePaths: string[]) {
  const api = getElectronAPI()
  if (api) await api.registerWindowFiles(filePaths)
}

export async function setProgressBar(progress: number) {
  const api = getElectronAPI()
  if (api) await api.setProgressBar(progress)
}

export async function clearProgressBar() {
  const api = getElectronAPI()
  if (api) await api.clearProgressBar()
}

/** DB 查询（主进程 SQLite） */
export async function dbQuery<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<{ success: boolean; rows?: T[]; error?: string }> {
  const api = getElectronAPI()
  if (!api || !api.dbQuery) return { success: false, error: 'db:query not available' }
  return api.dbQuery<T>(sql, params)
}

export async function dbExec(
  sql: string,
  params?: unknown[]
): Promise<{ success: boolean; changes?: number; lastInsertRowid?: number | bigint; error?: string }> {
  const api = getElectronAPI()
  if (!api || !api.dbExec) return { success: false, error: 'db:exec not available' }
  return api.dbExec(sql, params)
}
