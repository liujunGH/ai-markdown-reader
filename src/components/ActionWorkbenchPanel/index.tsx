import type { ExecutableFixSuggestion } from '../../utils/workspaceEnhancements'
import type { DocumentTemplate, ImageLocalizationPlan, RenamePlan, UnlinkedMention } from '../../utils/workspaceActions'
import type { BatchMovePlan, ImageAssetAudit, OperationPreview, ReleaseAutomationPlan, StaticSiteExportPlan, WorkspaceHomeCard } from '../../utils/safetyAutomation'
import styles from './ActionWorkbenchPanel.module.css'

interface Props {
  fixes: ExecutableFixSuggestion[]
  templates: DocumentTemplate[]
  renamePlan: RenamePlan
  imagePlan: ImageLocalizationPlan
  unlinkedMentions: UnlinkedMention[]
  archiveReport: string
  operationPreview: OperationPreview
  imageAudit: ImageAssetAudit
  batchMovePlan: BatchMovePlan
  workspaceHomeCards: WorkspaceHomeCard[]
  staticSitePlan: StaticSiteExportPlan
  releasePlan: ReleaseAutomationPlan
  onExecuteFix: (fix: ExecutableFixSuggestion) => void
  onApplyRename: () => void
  onLocalizeImages: () => void
  onCreateFromTemplate: (template: DocumentTemplate) => void
  onOpenMention: (mention: UnlinkedMention) => void
  onCopyArchive: () => void
  onCopyPreview: () => void
  onUndoLast: () => void
  onCopyBatchMove: () => void
  onCopyStaticSite: () => void
  onCopyReleaseCommands: () => void
  onClose: () => void
}

export function ActionWorkbenchPanel({
  fixes,
  templates,
  renamePlan,
  imagePlan,
  unlinkedMentions,
  archiveReport,
  operationPreview,
  imageAudit,
  batchMovePlan,
  workspaceHomeCards,
  staticSitePlan,
  releasePlan,
  onExecuteFix,
  onApplyRename,
  onLocalizeImages,
  onCreateFromTemplate,
  onOpenMention,
  onCopyArchive,
  onCopyPreview,
  onUndoLast,
  onCopyBatchMove,
  onCopyStaticSite,
  onCopyReleaseCommands,
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
            <h4>预览与撤销</h4>
            <p>{operationPreview.title}</p>
            <strong>{operationPreview.summary.files} 个文件，+{operationPreview.summary.additions} / -{operationPreview.summary.removals}</strong>
            <button type="button" onClick={onCopyPreview} disabled={operationPreview.changes.length === 0}>
              复制 diff 预览
            </button>
            <button type="button" onClick={onUndoLast}>
              撤销最近操作
            </button>
          </section>

          <section className={styles.section}>
            <h4>图片资产审计</h4>
            <p>{imageAudit.summary.used} 已使用 / {imageAudit.summary.unused} 未使用</p>
            <strong>{imageAudit.summary.duplicateGroups} 组重复，{imageAudit.summary.remote} 张网络图片</strong>
            {imageAudit.unused.slice(0, 3).map(asset => (
              <span key={asset}>{asset}</span>
            ))}
          </section>

          <section className={styles.section}>
            <h4>批量移动/重命名</h4>
            <p>{batchMovePlan.targetDir}</p>
            <strong>{batchMovePlan.operations.length} 个文件，{batchMovePlan.affectedLinks} 条链接需关注</strong>
            <button type="button" onClick={onCopyBatchMove} disabled={batchMovePlan.operations.length === 0}>
              复制批量整理计划
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
            <h4>工作区首页</h4>
            <p>聚合最近阅读、健康度和待处理事项</p>
            {workspaceHomeCards.slice(0, 5).map(card => (
              <strong key={card.id}>{card.label}：{card.value}</strong>
            ))}
          </section>

          <section className={styles.section}>
            <h4>发布归档</h4>
            <p>{archiveReport.split('\n')[0] || '工作区归档报告'}</p>
            <button type="button" onClick={onCopyArchive}>复制归档报告</button>
          </section>

          <section className={styles.section}>
            <h4>静态站点导出</h4>
            <p>{staticSitePlan.outputDir}</p>
            <strong>{staticSitePlan.pages.length} 个页面待导出</strong>
            <button type="button" onClick={onCopyStaticSite}>复制静态站点计划</button>
          </section>

          <section className={styles.section}>
            <h4>Release 自动化</h4>
            <p>{releasePlan.version} · {releasePlan.notesFile}</p>
            <strong>{releasePlan.commands.length} 条命令</strong>
            <button type="button" onClick={onCopyReleaseCommands}>复制 Release 命令</button>
          </section>
        </div>
      </section>
    </div>
  )
}
