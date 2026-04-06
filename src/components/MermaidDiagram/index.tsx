import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import styles from './MermaidDiagram.module.css'

interface Props {
  code: string
}

export function MermaidDiagram({ code }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [svg, setSvg] = useState<string>('')

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
    })

    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        const { svg: renderedSvg } = await mermaid.render(id, code)
        setSvg(renderedSvg)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : '渲染失败')
      }
    }

    renderDiagram()
  }, [code])

  if (error) {
    return (
      <div className={styles.error}>
        <span>❌ Mermaid 渲染错误</span>
        <pre>{error}</pre>
      </div>
    )
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}
