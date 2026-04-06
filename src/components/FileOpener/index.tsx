import styles from './FileOpener.module.css'

interface Props {
  onFileOpen: (content: string, filename: string, filePath: string) => void
}

export function FileOpener({ onFileOpen }: Props) {
  const handleClick = async () => {
    if (!window.electronAPI) return
    
    const result = await window.electronAPI.openFileDialog()
    if (result) {
      onFileOpen(result.content, result.filePath.split('/').pop() || '未命名.md', result.filePath)
    }
  }

  return (
    <button className={styles.button} onClick={handleClick} data-guide="file-opener">
      📂 打开文件
    </button>
  )
}
