/**
 * IPC 注册工厂
 *
 * 取代旧 main.ts 内联的 wrapHandler。从 shared 层读取 channel 名与超时配置，
 * 用 createTimeoutHandler 包装后 ipcMain.handle 注册。
 *
 * 统一入口的意义：channel 名不再散落为魔法字符串，超时配置集中管理。
 * 所有 channel（含 db）都走这里注册。
 */
import { ipcMain } from 'electron'
import { createTimeoutHandler } from '../lib/ipcGuard'
import {
  INVOKE_CHANNELS,
  CHANNEL_TIMEOUTS,
  IPC_DEFAULT_TIMEOUT,
  DB_CHANNELS,
} from '../../shared'

type IpcHandler = (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any

/**
 * 注册一个带超时的 invoke handler。
 * @param channel  channel 名（shared 层常量，或 db channel）
 * @param handler  handler 实现（handler 通过闭包捕获各自需要的 ctx，无需注入）
 * @param timeoutMs 可选超时覆盖；不传则查 CHANNEL_TIMEOUTS，再退到 IPC_DEFAULT_TIMEOUT
 */
export function registerHandler(
  channel: string,
  handler: IpcHandler,
  timeoutMs?: number
): void {
  const resolved = timeoutMs ?? CHANNEL_TIMEOUTS[channel] ?? IPC_DEFAULT_TIMEOUT
  ipcMain.handle(channel, createTimeoutHandler(handler, resolved, channel))
}

/** channel 常量重导出（含 invoke + db），供 handler 文件直接引用 */
export const Channels = { ...INVOKE_CHANNELS, ...DB_CHANNELS }
