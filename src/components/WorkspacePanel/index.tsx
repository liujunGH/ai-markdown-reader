import { useMemo } from 'react'
import styles from './WorkspacePanel.module.css'

export interface Workspace {
  id: string
  name: string
  folderPath: string
  updatedAt: number
}

interface Props {
  workspaces: Workspace[]
  currentFolderPath: string | null
  currentFolderName: string
  onSaveCurrent: () => void
  onOpenWorkspace: (folderPath: string) => void
  onRemoveWorkspace: (id: string) => void
  onClose: () => void
}

export function WorkspacePanel({
  workspaces,
  currentFolderPath,
  currentFolderName,
  onSaveCurrent,
  onOpenWorkspace,
  onRemoveWorkspace,
  onClose,
}: Props) {
  const sortedWorkspaces = useMemo(
    () => [...workspaces].sort((a, b) => b.updatedAt - a.updatedAt),
    [workspaces],
  )

  const currentWorkspace = currentFolderPath
    ? workspaces.find(workspace => workspace.folderPath === currentFolderPath)
    : undefined

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.panel} onClick={event => event.stopPropagation()} aria-label="工作区">
        <header className={styles.header}>
          <div>
            <h3>工作区</h3>
            <p>{currentFolderPath || '当前未打开文件夹'}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <section className={styles.current}>
          <div className={styles.currentInfo}>
            <span className={styles.sectionLabel}>当前工作区</span>
            <strong title={currentFolderName}>{currentFolderName || '未命名工作区'}</strong>
            <span title={currentFolderPath || undefined}>
              {currentFolderPath || '打开文件夹后可保存为工作区'}
            </span>
          </div>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={onSaveCurrent}
            disabled={!currentFolderPath}
            title={currentWorkspace ? '更新当前工作区' : '保存当前工作区'}
          >
            {currentWorkspace ? '更新' : '保存'}
          </button>
        </section>

        <div className={styles.content}>
          {sortedWorkspaces.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📁</div>
              <div className={styles.emptyTitle}>暂无工作区</div>
              <div className={styles.emptySubtitle}>保存当前文件夹后，可在这里快速切换</div>
            </div>
          ) : (
            <div className={styles.list} role="list" aria-label="工作区列表">
              {sortedWorkspaces.map(workspace => {
                const isActive = workspace.folderPath === currentFolderPath

                return (
                  <article
                    key={workspace.id}
                    className={`${styles.workspace} ${isActive ? styles.active : ''}`}
                    role="listitem"
                  >
                    <button
                      type="button"
                      className={styles.workspaceMain}
                      onClick={() => onOpenWorkspace(workspace.folderPath)}
                      aria-label={`打开工作区 ${workspace.name}`}
                    >
                      <div className={styles.workspaceIcon}>📂</div>
                      <div className={styles.workspaceInfo}>
                        <div className={styles.workspaceTop}>
                          <strong title={workspace.name}>{workspace.name}</strong>
                          {isActive && <span className={styles.badge}>当前</span>}
                        </div>
                        <div className={styles.path} title={workspace.folderPath}>{workspace.folderPath}</div>
                        <div className={styles.time}>{formatTime(workspace.updatedAt)}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => onRemoveWorkspace(workspace.id)}
                      title="移除工作区"
                      aria-label={`移除工作区 ${workspace.name}`}
                    >
                      ×
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`

  return new Date(timestamp).toLocaleDateString('zh-CN')
}
