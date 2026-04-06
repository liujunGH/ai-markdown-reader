import { useRef } from 'react'
import styles from './FileOpener.module.css'

interface Props {
  onFileOpen: (content: string, filename: string) => void
}

export function FileOpener({ onFileOpen }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const content = await file.text()
    onFileOpen(content, file.name)
    
    e.target.value = ''
  }

  return (
    <button className={styles.button} onClick={handleClick} data-guide="file-opener">
      📂 打开文件
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </button>
  )
}
