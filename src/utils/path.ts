export function basename(filePath: string): string {
  return window.electronAPI?.pathBasename(filePath) || filePath.replace(/.*[\\\/]/, '')
}

export function dirname(filePath: string): string {
  return window.electronAPI?.pathDirname(filePath) || filePath.replace(/[\\\/][^\\\/]+$/, '')
}

export function join(...paths: string[]): string {
  return window.electronAPI?.pathJoin(...paths) || paths.join('/')
}
