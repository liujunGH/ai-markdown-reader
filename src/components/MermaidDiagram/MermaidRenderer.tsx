import { useEffect, useState } from 'react'
import { MermaidDiagram } from './index'

function decodeBase64(str: string): string {
  return decodeURIComponent(escape(atob(str)))
}

export function MermaidRenderer() {
  const [diagrams, setDiagrams] = useState<{ id: string; code: string }[]>([])

  useEffect(() => {
    const elements = document.querySelectorAll('.mermaid-code')
    const diagrams = Array.from(elements).map((el) => {
      const content = decodeBase64(el.getAttribute('data-content') || '')
      return {
        id: `mermaid-${Math.random().toString(36).substr(2, 9)}`,
        code: content
      }
    })
    setDiagrams(diagrams)

    elements.forEach((el) => {
      (el as HTMLElement).style.display = 'none'
    })
  }, [])

  if (diagrams.length === 0) return null

  return (
    <div className="mermaid-renderer">
      {diagrams.map((diagram) => (
        <MermaidDiagram key={diagram.id} code={diagram.code} />
      ))}
    </div>
  )
}
