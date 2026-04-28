import styles from './FileOpener.module.css'
import { basename } from '../../utils/path'

interface Props {
  onFileOpen: (content: string, filename: string, filePath: string) => void
  onError?: (message: string) => void
}

export function FileOpener({ onFileOpen, onError }: Props) {
  const handleClick = async () => {
    if (!window.electronAPI) return

    try {
      const result = await window.electronAPI.openFileDialog()
      if (!result) return
      if (result.error) {
        onError?.(result.error)
        return
      }
      onFileOpen(result.content, basename(result.filePath) || '未命名.md', result.filePath)
    } catch (err) {
      console.error('[FileOpener] openFileDialog failed:', err)
      onError?.('打开文件对话框失败: ' + String(err))
    }
  }

  return (
    <button className={styles.button} onClick={handleClick} data-guide="file-opener">
      📂 打开文件
    </button>
  )
}
