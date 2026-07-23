/**
 * shared 层统一出口
 *
 * 主进程与渲染进程都应从此处导入跨进程共享的契约与常量。
 * 禁止在此处导入任何 Node / Electron / 浏览器 API。
 */
export * from './ipc-channels'
export * from './constants'
