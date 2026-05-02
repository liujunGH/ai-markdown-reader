import { useMemo } from 'react'
import { analyzeMarkdownImages, MarkdownImageItem, MarkdownImageType } from '../../utils/imageInventory'
import styles from './ImageInventoryPanel.module.css'

interface Props {
  content: string
  filePath?: string
  onClose: () => void
}

const TYPE_LABELS: Record<MarkdownImageType, string> = {
  'local-relative': '相对路径',
  'local-absolute': '绝对路径',
  remote: '网络',
  data: '内嵌',
  blob: 'Blob',
  unknown: '未知',
}

export function ImageInventoryPanel({ content, filePath, onClose }: Props) {
  const images = useMemo(() => analyzeMarkdownImages(content, filePath), [content, filePath])
  const counts = useMemo(() => images.reduce<Record<MarkdownImageType, number>>((acc, image) => {
    acc[image.type] += 1
    return acc
  }, {
    'local-relative': 0,
    'local-absolute': 0,
    remote: 0,
    data: 0,
    blob: 0,
    unknown: 0,
  }), [images])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.panel} onClick={e => e.stopPropagation()} aria-label="图片检查面板">
        <header className={styles.header}>
          <div>
            <h3>图片检查面板</h3>
            <p>{filePath || '当前未保存文档'}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={styles.summary}>
          <SummaryCard label="全部" value={images.length} />
          {(Object.keys(counts) as MarkdownImageType[]).map(type => (
            counts[type] > 0 && <SummaryCard key={type} label={TYPE_LABELS[type]} value={counts[type]} />
          ))}
        </div>

        <div className={styles.content}>
          {images.length === 0 ? (
            <div className={styles.empty}>当前文档没有图片引用</div>
          ) : (
            <div className={styles.list}>
              {images.map((image, index) => (
                <ImageRow key={`${image.line}-${image.src}-${index}`} image={image} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.summaryCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ImageRow({ image }: { image: MarkdownImageItem }) {
  const canOpenRemote = image.type === 'remote' && /^https?:\/\//i.test(image.src)
  const canReveal = !!image.resolvedPath && (image.type === 'local-relative' || image.type === 'local-absolute')

  return (
    <article className={styles.item}>
      <div className={styles.itemTop}>
        <span className={styles.line}>行 {image.line}</span>
        <span className={styles.badge}>{TYPE_LABELS[image.type]}</span>
      </div>
      <div className={styles.alt}>{image.alt || '无 alt 文本'}</div>
      <div className={styles.src} title={image.src}>{image.src || '(空 src)'}</div>
      {image.resolvedPath && <div className={styles.resolved} title={image.resolvedPath}>{image.resolvedPath}</div>}
      {image.warnings.length > 0 && (
        <div className={styles.warnings}>
          {image.warnings.map(warning => <span key={warning}>{warning}</span>)}
        </div>
      )}
      <div className={styles.actions}>
        <button type="button" onClick={() => void navigator.clipboard?.writeText(image.src)}>复制 src</button>
        {canOpenRemote && <button type="button" onClick={() => window.open(image.src, '_blank', 'noopener,noreferrer')}>打开链接</button>}
        {canReveal && (
          <button type="button" onClick={() => void window.electronAPI?.showInFolder(image.resolvedPath || image.src)}>
            在 Finder 中显示
          </button>
        )}
      </div>
    </article>
  )
}
