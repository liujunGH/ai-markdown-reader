/**
 * ReaderGlobalSearch v2 —— 全局搜索容器（复用现有 GlobalSearch）
 *
 * GlobalSearch 是纯展示（folderPath + onOpenFile 等回调）。
 * 索引仍走 IndexedDB（searchIndex.ts），FTS5 迁移是后续优化。
 * v2 容器接 fileStore（folderPath）+ useDocumentActions（onOpenFile）。
 */
import { useFileStore, useUIStore } from '../../state'
import { useDocumentActions } from '../../app/useDocumentActions'
import { GlobalSearch } from '../../components/GlobalSearch'

export function ReaderGlobalSearch() {
  const isOpen = useUIStore((s) => s.panels.globalSearch)
  const closePanel = useUIStore((s) => s.closePanel)
  const folderPath = useFileStore((s) => s.currentFolderPath)
  const { openDocumentByPath } = useDocumentActions()

  return (
    <GlobalSearch
      isOpen={isOpen}
      onClose={() => closePanel('globalSearch')}
      folderPath={folderPath}
      onOpenFile={async (filePath) => {
        await openDocumentByPath(filePath)
        closePanel('globalSearch')
      }}
    />
  )
}
