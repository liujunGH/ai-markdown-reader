import { useMemo, useState } from 'react'
import type { MaintenanceTask } from '../../utils/maintenanceTasks'
import styles from './MaintenanceQueuePanel.module.css'

interface Props {
  tasks: MaintenanceTask[]
  onOpenTask: (task: MaintenanceTask) => void
  onCopyTasks: () => void
  onClose: () => void
}

const SEVERITY_LABELS: Record<MaintenanceTask['severity'], string> = {
  error: '错误',
  warning: '警告',
  info: '提示',
}

export function MaintenanceQueuePanel({ tasks, onOpenTask, onCopyTasks, onClose }: Props) {
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set())
  const visibleTasks = useMemo(() => tasks.filter(task => !doneIds.has(task.id)), [doneIds, tasks])
  const counts = useMemo(() => ({
    errors: visibleTasks.filter(task => task.severity === 'error').length,
    warnings: visibleTasks.filter(task => task.severity === 'warning').length,
    info: visibleTasks.filter(task => task.severity === 'info').length,
  }), [visibleTasks])

  const markDone = (task: MaintenanceTask) => {
    setDoneIds(current => new Set([...current, task.id]))
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.panel} onClick={event => event.stopPropagation()} aria-label="待处理队列">
        <header className={styles.header}>
          <div>
            <h3>待处理队列</h3>
            <p>把当前诊断结果整理成可以逐项处理的清单</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={styles.summary}>
          <div>
            <strong>{visibleTasks.length}</strong>
            <span>待处理</span>
          </div>
          <div>
            <strong>{counts.errors}</strong>
            <span>{counts.errors} 个错误</span>
          </div>
          <div>
            <strong>{counts.warnings}</strong>
            <span>{counts.warnings} 个警告</span>
          </div>
          <div>
            <strong>{doneIds.size}</strong>
            <span>已处理 {doneIds.size} 项</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={onCopyTasks}>复制待处理清单</button>
        </div>

        <div className={styles.list}>
          {visibleTasks.length === 0 ? (
            <div className={styles.empty}>当前没有待处理项</div>
          ) : visibleTasks.map(task => (
            <article key={task.id} className={`${styles.task} ${styles[task.severity]}`}>
              <div className={styles.taskBody}>
                <span>{SEVERITY_LABELS[task.severity]}</span>
                <h4>{task.title}</h4>
                <p>{task.detail}</p>
                {(task.sourcePath || task.line) && (
                  <small>{task.sourcePath || '当前文档'}{task.line ? ` · 第 ${task.line} 行` : ''}</small>
                )}
              </div>
              <div className={styles.taskActions}>
                <button type="button" onClick={() => onOpenTask(task)}>{task.actionLabel}</button>
                <button type="button" onClick={() => markDone(task)}>标记已处理</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
