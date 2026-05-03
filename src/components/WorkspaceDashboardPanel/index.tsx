import type { DashboardSection, WorkspaceDashboard } from '../../utils/workspaceEnhancements'
import styles from './WorkspaceDashboardPanel.module.css'

interface Props {
  dashboard: WorkspaceDashboard
  onOpenSection: (sectionId: DashboardSection['id']) => void
  onClose: () => void
}

export function WorkspaceDashboardPanel({ dashboard, onOpenSection, onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.panel} onClick={event => event.stopPropagation()} aria-label="工作区仪表盘">
        <header className={styles.header}>
          <div>
            <h3>工作区仪表盘</h3>
            <p>集中查看维护、链接、图片、阅读和发布状态</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={styles.grid}>
          {dashboard.sections.map(section => (
            <article key={section.id} className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4>{section.title}</h4>
                <button type="button" onClick={() => onOpenSection(section.id)}>
                  {section.actionLabel}
                </button>
              </div>
              <div className={styles.items}>
                {section.items.map(item => (
                  <div key={`${section.id}-${item.label}`} className={`${styles.item} ${item.status ? styles[item.status] : ''}`}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.detail}</small>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
