import { useState } from 'react'
import { exportMermaidToSvg, exportMermaidToPng, downloadFile } from '../../utils/mermaidExporter'
import styles from './MermaidExport.module.css'

interface Props {
  code: string
}

export function MermaidExport({ code }: Props) {
  const [exporting, setExporting] = useState(false)

  const handleExportSvg = async () => {
    setExporting(true)
    try {
      const svg = await exportMermaidToSvg(code)
      downloadFile(svg, 'diagram.svg', 'image/svg+xml')
    } catch (err) {
      console.error('Failed to export SVG:', err)
    }
    setExporting(false)
  }

  const handleExportPng = async () => {
    setExporting(true)
    try {
      const png = await exportMermaidToPng(code)
      downloadFile(png, 'diagram.png', 'image/png')
    } catch (err) {
      console.error('Failed to export PNG:', err)
    }
    setExporting(false)
  }

  return (
    <div className={styles.container}>
      <button 
        className={styles.button}
        onClick={handleExportSvg}
        disabled={exporting}
        title="导出 SVG"
      >
        📥 SVG
      </button>
      <button 
        className={styles.button}
        onClick={handleExportPng}
        disabled={exporting}
        title="导出 PNG"
      >
        📥 PNG
      </button>
    </div>
  )
}
