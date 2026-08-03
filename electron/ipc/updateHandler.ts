import type { IpcContext } from './context'
import { registerHandler, Channels } from './registry'

export function registerUpdateHandlers(ctx: IpcContext): void {
  registerHandler(Channels.GET_UPDATE_STATE, () => ctx.updateService.getState())
  registerHandler(Channels.CHECK_FOR_UPDATES, (_event, manual = true) =>
    ctx.updateService.checkForUpdates(Boolean(manual))
  )
  registerHandler(Channels.DOWNLOAD_UPDATE, () => ctx.updateService.downloadUpdate())
  registerHandler(Channels.INSTALL_UPDATE, () => ctx.updateService.installUpdate())
}
