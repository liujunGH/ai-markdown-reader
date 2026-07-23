/**
 * 状态层统一出口（v2）
 *
 * v2 渲染层/功能层都从此处导入 stores。
 * 与旧 src/stores/ 并存（阶段 4-5 迁移组件时切换）。
 */
export { useTabStore, installTabSideEffects } from './stores/tabStore'
export type { TabMeta, TabStore } from './stores/tabStore'

export { useUIStore, usePanelVisible, ALL_PANELS } from './stores/uiStore'
export type { UIStore, PanelName } from './stores/uiStore'

export { useFileStore } from './stores/fileStore'
export type { FileStore } from './stores/fileStore'

export { useToastStore } from './stores/toastStore'
export type { ToastStore, Toast } from './stores/toastStore'

export { useReadingStore } from './stores/readingStore'
export type { ReadingStore } from './stores/readingStore'

export { useActiveDocStore } from './stores/activeDocStore'
