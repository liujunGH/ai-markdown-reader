import type { ExecutableFixSuggestion } from '../../utils/workspaceEnhancements'
import type { DocumentTemplate, ImageLocalizationPlan, RenamePlan, UnlinkedMention } from '../../utils/workspaceActions'
import styles from './ActionWorkbenchPanel.module.css'

interface Props {
  fixes: ExecutableFixSuggestion[]
  templates: DocumentTemplate[]
  renamePlan: RenamePlan
  imagePlan: ImageLocalizationPlan
  unlinkedMentions: UnlinkedMention[]
  archiveReport: string
  onExecuteFix: (fix: ExecutableFixSuggestion) => void
  onApplyRename: () => void
  onLocalizeImages: () => void
  onCreateFromTemplate: (template: DocumentTemplate) => void
  onOpenMention: (mention: UnlinkedMention) => void
  onCopyArchive: () => void
  onClose: () => void
}

export function ActionWorkbenchPanel({
  fixes,
  templates,
  renamePlan,
  imagePlan,
  unlinkedMentions,
  archiveReport,
  onExecuteFix,
  onApplyRename,
  onLocalizeImages,
  onCreateFromTemplate,
  onOpenMention,
  onCopyArchive,
  onClose,
}: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.panel} onClick={event => event.stopPropagation()} aria-label="增强操作台">
        <header className={styles.header}>
          <div>
            <h3>增强操作台</h3>
            <p>把检查结果变成可执行的知识库维护动作</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={styles.grid}>
          <section className={styles.section}>
            <h4>一键修复</h4>
            <p>{fixes.length > 0 ? `${fixes.length} 个可执行建议` : '当前没有可执行修复'}</p>
            {fixes.slice(0, 4).map(fix => (
              <button key={fix.id} type="button" onClick={() => onExecuteFix(fix)}>
                执行：{fix.title}
              </button>
            ))}
          </section>

          <section className={styles.section}>
            <h4>重命名安全更新</h4>
            <p>{renamePlan.oldLabel} → {renamePlan.newLabel}</p>
            <strong>{renamePlan.changedFiles.length} 个文件受影响</strong>
            <button type="button" onClick={onApplyRename} disabled={renamePlan.changedFiles.length === 0}>
              应用重命名更新
            </button>
          </section>

          <section className={styles.section}>
            <h4>图片资产本地化</h4>
            <p>{imagePlan.assetsDir}</p>
            <strong>{imagePlan.items.length} 张网络图片</strong>
            <button type="button" onClick={onLocalizeImages} disabled={imagePlan.items.length === 0}>
              本地化 {imagePlan.items.length} 张图片
            </button>
          </section>

          <section className={styles.section}>
            <h4>文档模板</h4>
            <p>从模板快速创建常用文档</p>
            {templates.map(template => (
              <button key={template.id} type="button" onClick={() => onCreateFromTemplate(template)}>
                用{template.name}新建
              </button>
            ))}
          </section>

          <section className={styles.section}>
            <h4>双链提示</h4>
            <p>{unlinkedMentions.length > 0 ? '发现文本提及但尚未链接的文档' : '当前没有未链接提及'}</p>
            {unlinkedMentions.slice(0, 5).map(mention => (
              <button key={mention.targetPath} type="button" onClick={() => onOpenMention(mention)}>
                打开 {mention.label}
              </button>
            ))}
          </section>

          <section className={styles.section}>
            <h4>发布归档</h4>
            <p>{archiveReport.split('\n')[0] || '工作区归档报告'}</p>
            <button type="button" onClick={onCopyArchive}>复制归档报告</button>
          </section>
        </div>
      </section>
    </div>
  )
}
