/**
 * IPC 统一注册入口
 *
 * main.ts 在 whenReady 后调用一次 registerAllHandlers(ctx)，
 * 即可完成全部 31 个原有 invoke channel + 2 个新增 db channel 的注册。
 *
 * 注册顺序无关（channel 名唯一）。db 层是懒加载，首次 db:query/db:exec
 * 调用时才真正打开连接，故注册 dbHandler 无需 db 预先就绪。
 */
import type { IpcContext } from './context'
import { registerFileHandlers } from './fileHandler'
import { registerDialogHandlers } from './dialogHandler'
import { registerWindowHandlers } from './windowHandler'
import { registerStorageHandlers } from './storageHandler'
import { registerDbHandlers } from './dbHandler'

export function registerAllHandlers(ctx: IpcContext): void {
  registerFileHandlers(ctx)
  registerDialogHandlers(ctx)
  registerWindowHandlers(ctx)
  registerStorageHandlers(ctx)
  registerDbHandlers(ctx)
}

export type { IpcContext, ConfigStoreData, WatcherEntry } from './context'
