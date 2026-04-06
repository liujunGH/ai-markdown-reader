export async function exportMermaidToSvg(code: string): Promise<string> {
  const mermaid = (await import('mermaid')).default
  
  mermaid.initialize({
    startOnLoad: false,
    theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
    securityLevel: 'loose',
  })

  const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
  const { svg } = await mermaid.render(id, code)
  return svg
}

export async function exportMermaidToPng(code: string): Promise<string> {
  const svg = await exportMermaidToSvg(code)
  
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context not available')

  const img = new Image()
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      canvas.width = img.width * 2
      canvas.height = img.height * 2
      ctx.scale(2, 2)
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
  })
}

export function downloadFile(data: string, filename: string, mimeType: string) {
  const blob = mimeType === 'image/png' 
    ? dataToBlob(data, mimeType)
    : new Blob([data], { type: mimeType })
  
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function dataToBlob(data: string, mimeType: string): Blob {
  const byteString = atob(data.split(',')[1])
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mimeType })
}
