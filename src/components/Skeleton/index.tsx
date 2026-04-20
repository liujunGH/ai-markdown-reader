import styles from './Skeleton.module.css'

interface SkeletonProps {
  lines?: number
  width?: string | number
  height?: string | number
  circle?: boolean
}

export function Skeleton({ lines = 1, width, height, circle }: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width ?? '100%',
    height: height ?? (circle ? undefined : '16px'),
  }

  if (lines > 1) {
    return (
      <div className={styles.lines}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${styles.skeleton} ${circle ? styles.skeletonCircle : ''}`}
            style={{
              ...style,
              width: i === lines - 1 && width === undefined ? '60%' : style.width,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${styles.skeleton} ${circle ? styles.skeletonCircle : ''}`}
      style={style}
    />
  )
}
