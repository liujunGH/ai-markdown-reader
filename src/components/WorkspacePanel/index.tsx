import { useMemo } from 'react'
import styles from './WorkspacePanel.module.css'
import { sortWorkspaces } from '../../utils/workspaces'

export interface Workspace {
  id: string
  name: string
  folderPath: string
  updatedAt: number
  isPinned?: boolean
}

interface Props {
  workspaces: Workspace[]
  currentFolderPath: string | null
  currentFolderName: string
  onSaveCurrent: () => void
  onOpenWorkspace: (folderPath: string) => void
  onRemoveWorkspace: (id: string) => void
  onTogglePinned: (id: string) => void
  onRenameWorkspace: (id: string, name: string) => void
  onCleanInvalidWorkspaces: () => void
  onOpenGlobalSearch?: () => void
  onOpenKnowledgeHealth?: () => void
  onOpenMarkdownGraph?: () => void
  onOpenReadingTimeline?: () => void
  onClose: () => void
}

export function WorkspacePanel({
  workspaces,
  currentFolderPath,
  currentFolderName,
  onSaveCurrent,
  onOpenWorkspace,
  onRemoveWorkspace,
  onTogglePinned,
  onRenameWorkspace,
  onCleanInvalidWorkspaces,
  onOpenGlobalSearch,
  onOpenKnowledgeHealth,
  onOpenMarkdownGraph,
  onOpenReadingTimeline,
  onClose,
}: Props) {
  const sortedWorkspaces = useMemo(
    () => sortWorkspaces(workspaces),
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

        <section className={styles.quickActions} aria-label="工作区快捷动作">
          <button
            type="button"
            className={styles.quickAction}
            onClick={onOpenGlobalSearch}
            disabled={!currentFolderPath}
            aria-label="搜索当前工作区"
            title={currentFolderPath ? '搜索当前工作区' : '打开文件夹后可用'}
          >
            <span>⌕</span>
            搜索
          </button>
          <button
            type="button"
            className={styles.quickAction}
            onClick={onOpenReadingTimeline}
            aria-label="打开阅读时间线"
            title="打开阅读时间线"
          >
            <span>◷</span>
            时间线
          </button>
          <button
            type="button"
            className={styles.quickAction}
            onClick={onOpenKnowledgeHealth}
            disabled={!currentFolderPath}
            aria-label="查看知识健康报告"
            title={currentFolderPath ? '查看知识健康报告' : '打开文件夹后可用'}
          >
            <span>✓</span>
            健康
          </button>
          <button
            type="button"
            className={styles.quickAction}
            onClick={onOpenMarkdownGraph}
            disabled={!currentFolderPath}
            aria-label="查看文档图谱"
            title={currentFolderPath ? '查看文档图谱' : '打开文件夹后可用'}
          >
            <span>◎</span>
            图谱
          </button>
        </section>

        <div className={styles.content}>
          {sortedWorkspaces.length > 0 && (
            <div className={styles.bulkActions}>
              <span>{sortedWorkspaces.length} 个工作区</span>
              <button type="button" onClick={onCleanInvalidWorkspaces} aria-label="清理失效工作区">
                清理失效
              </button>
            </div>
          )}
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
                          {workspace.isPinned && <span className={styles.pinBadge}>置顶</span>}
                          {isActive && <span className={styles.badge}>当前</span>}
                        </div>
                        <div className={styles.path} title={workspace.folderPath}>{workspace.folderPath}</div>
                        <div className={styles.time}>{formatTime(workspace.updatedAt)}</div>
                      </div>
                    </button>
                    <div className={styles.workspaceActions}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => onTogglePinned(workspace.id)}
                        title={workspace.isPinned ? '取消置顶' : '置顶'}
                        aria-label={`${workspace.isPinned ? '取消置顶' : '置顶'}工作区 ${workspace.name}`}
                      >
                        {workspace.isPinned ? '★' : '☆'}
                      </button>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => {
                          const nextName = window.prompt('重命名工作区', workspace.name)
                          if (nextName) onRenameWorkspace(workspace.id, nextName)
                        }}
                        title="重命名"
                        aria-label={`重命名工作区 ${workspace.name}`}
                      >
                        ✎
                      </button>
                    </div>
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
