import styles from './AutoTagCloud.module.css'

interface AutoTagCloudProps {
  tags: string[]
  isLoading: boolean
}

export function AutoTagCloud({ tags, isLoading }: AutoTagCloudProps) {
  if (tags.length === 0 && !isLoading) {
    return null
  }

  return (
    <div className={styles.container}>
      <span className={styles.label}>🏷️</span>
      {isLoading && tags.length === 0 && (
        <span className={styles.loading}>正在提取标签...</span>
      )}
      {tags.map((tag) => (
        <span key={tag} className={styles.tag}>
          {tag}
        </span>
      ))}
    </div>
  )
}
