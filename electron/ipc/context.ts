/**
 * IPC 上下文：主进程共享的可变状态与依赖运行时上下文的 helper
 *
 * 设计原则：ctx 只包含「真正共享的可变状态」和「依赖 Electron 运行时上下文的
 * helper」。无状态纯工具（fs/path/validateFileSize/isPathSafe 等）由 handler
 * 各自直接 import，不放进 ctx——避免 ctx 变成大杂烩。
 *
 * main.ts 创建唯一实例，各 handler 文件接收 ctx 注册自己的 channel。
 */
import type { BrowserWindow } from 'electron'
import type fs from 'fs'
import type { createLogger } from '../lib/logger'
import type { createRateLimiter } from '../lib/ipcGuard'
import type { RecentFile, WindowState } from '../../shared'

/** 配置存储（config.json）的数据结构 */
export interface ConfigStoreData {
  recentFiles: RecentFile[]
  lastFolder: string | null
  maxRecentFiles: number
  windowStates?: WindowState[]
}

/**
 * 主进程 IPC 上下文。所有共享可变状态集中于此。
 * 字段语义与旧 main.ts 全局变量逐一对齐——这是 1:1 行为迁移的基础。
 */
export interface IpcContext {
  /** 已读 config.json，handler 读写后需 saveConfigStore 持久化 */
  loadConfigStore: () => ConfigStoreData
  saveConfigStore: (data: ConfigStoreData) => void

  /** 文件 watcher 注册表：filePath -> FSWatcher */
  watchers: Map<string, fs.FSWatcher>

  /** 窗口注册表：自增 id -> BrowserWindow */
  windows: Map<number, BrowserWindow>
  /** 反向映射：BrowserWindow -> id（WeakMap，窗口销毁自动回收） */
  windowIds: WeakMap<BrowserWindow, number>
  /** 每个窗口当前打开的文件集合（多窗口文件去重） */
  windowOpenFiles: Map<number, Set<string>>
  /** 当前自增窗口 id 计数器值（createWindow 时 ++） */
  windowIdCounter: { value: number }
  /** 最近获得焦点的窗口 id */
  lastFocusedWindowId: { value: number }

  /** 取窗口 id（WeakMap 查询，无则 0） */
  getWindowId: (win: BrowserWindow) => number
  /** 取聚焦窗口，退化到最近聚焦窗口，再退化到任意未销毁窗口 */
  getFocusedOrLastWindow: () => BrowserWindow | undefined

  /** 应用是否正在退出（控制 macOS 关闭=隐藏行为） */
  isQuiting: { value: boolean }

  /** 日志实例 */
  logger: ReturnType<typeof createLogger>

  /** 对话框限流器：全局 5 次/秒（跨所有窗口共享，仅 open/open-folder-dialog 使用） */
  fileDialogLimiter: ReturnType<typeof createRateLimiter>
}
