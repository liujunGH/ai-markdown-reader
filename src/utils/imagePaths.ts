export function isRemoteOrEmbeddedImageSrc(src: string): boolean {
  return (
    !src ||
    src.startsWith('#') ||
    src.startsWith('//') ||
    /^[a-z][a-z0-9+.-]*:/i.test(src)
  )
}

function splitSrcSuffix(src: string): { pathPart: string; suffix: string } {
  const suffixIndex = src.search(/[?#]/)
  if (suffixIndex === -1) return { pathPart: src, suffix: '' }
  return {
    pathPart: src.slice(0, suffixIndex),
    suffix: src.slice(suffixIndex),
  }
}

export function resolveLocalImagePath(src: string, documentFilePath?: string): string | null {
  if (isRemoteOrEmbeddedImageSrc(src) || !documentFilePath) return null

  const { pathPart, suffix } = splitSrcSuffix(src)
  if (!pathPart || suffix.startsWith('#')) return null

  if (pathPart.startsWith('/')) return pathPart

  const baseDir = window.electronAPI?.pathDirname(documentFilePath) || documentFilePath.replace(/[\\\/][^\\\/]+$/, '')
  return window.electronAPI?.pathJoin(baseDir, pathPart) || `${baseDir.replace(/[\\\/]$/, '')}/${pathPart}`
}
