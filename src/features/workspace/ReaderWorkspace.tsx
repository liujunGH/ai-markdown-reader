/**
 * ReaderWorkspace v2 —— 工作区面板容器（复用现有 workspace 组件）
 *
 * 现有 ElectronFolderExplorer / RecentFilesPage / WelcomeHome 都是纯展示组件。
 * v2 容器接数据 + 把回调接到 useDocumentActions。
 */
import { useState, useCallback, useEffect } from 'react'
import { ElectronFolderExplorer } from '../../components/ElectronFolderExplorer'
import { RecentFilesPage } from '../../components/RecentFilesPage'
import { WelcomeHome } from '../../components/WelcomeHome'
import { useFileStore, useUIStore } from '../../state'
import { useDocumentActions } from '../../app/useDocumentActions'
import { getRecentFiles, getElectronAPI } from '../../ipc/client'
import type { RecentFile } from '../../../shared'

type WorkspaceView = 'files' | 'recent' | 'welcome'

export function ReaderWorkspace() {
  const folderPath = useFileStore((s) => s.currentFolderPath) ?? ''
  const folderName = useFileStore((s) => s.currentFolderName)
  const currentFilePath = useFileStore((s) => s.currentFilePath)
  const setCurrentFilePath = useFileStore((s) => s.setCurrentFilePath)
  const closePanel = useUIStore((s) => s.closePanel)
  const { openDocumentWithContent, openDocumentByPath, openExample } = useDocumentActions()

  const [view, setView] = useState<WorkspaceView>('welcome')
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])

  const refreshRecent = useCallback(async () => {
    setRecentFiles(await getRecentFiles())
  }, [])

  useEffect(() => {
    if (view === 'recent') void refreshRecent()
  }, [view, refreshRecent])

  const handleFileSelect = useCallback(
    (content: string, name: string, filePath: string) => {
      openDocumentWithContent(content, name, filePath)
      setCurrentFilePath(filePath)
    },
    [openDocumentWithContent, setCurrentFilePath]
  )

  const handleRecentSelect = useCallback(
    async (file: RecentFile) => {
      await openDocumentByPath(file.filePath)
    },
    [openDocumentByPath]
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 4, padding: 8, borderBottom: '1px solid var(--border, #e0e0e0)' }}>
        <button type="button" onClick={() => setView('files')}>文件</button>
        <button type="button" onClick={() => setView('recent')}>最近</button>
        <button type="button" onClick={() => setView('welcome')}>欢迎</button>
        <button type="button" onClick={() => closePanel('fileSidebar')} style={{ marginLeft: 'auto' }}>×</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {view === 'files' && (
          <ElectronFolderExplorer
            folderPath={folderPath}
            folderName={folderName}
            currentFilePath={currentFilePath}
            onFileSelect={handleFileSelect}
            onClose={() => closePanel('fileSidebar')}
          />
        )}
        {view === 'recent' && (
          <RecentFilesPage
            files={recentFiles}
            onSelect={handleRecentSelect}
            onRemove={async (filePath) => {
              const api = getElectronAPI()
              if (api) await api.removeRecentFile(filePath)
              void refreshRecent()
            }}
            onClearAll={async () => {
              const api = getElectronAPI()
              if (api) await api.clearRecentFiles()
              void refreshRecent()
            }}
            onClose={() => closePanel('fileSidebar')}
            onOpenFolder={async () => {
              const api = getElectronAPI()
              if (api) {
                const res = await api.openFileDialog()
                if (res?.filePath) closePanel('fileSidebar')
              }
            }}
          />
        )}
        {view === 'welcome' && (
          <WelcomeHome
            recentFileCount={recentFiles.length}
            readingHistoryCount={0}
            indexedFileCount={0}
            isIndexing={false}
            currentFolderName={folderName}
            currentFolderPath={folderPath}
            onOpenFile={async () => {
              const api = getElectronAPI()
              if (api) await api.openFileDialog()
            }}
            onOpenFolder={() => setView('files')}
            onOpenRecent={() => setView('recent')}
            onOpenReadingTimeline={() => { /* 阶段 5 */ }}
            onShowGuide={() => { /* 阶段 4.12 */ }}
            onReindex={() => { /* 阶段 5 */ }}
          />
        )}
      </div>
      {/* 示例文档快捷按钮（WelcomeHome 无此回调，单独放） */}
      {view === 'welcome' && (
        <button type="button" onClick={openExample} style={{ margin: 8 }}>
          打开示例文档
        </button>
      )}
    </div>
  )
}
