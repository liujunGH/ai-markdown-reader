const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

export function isExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return EXTERNAL_PROTOCOLS.has(parsed.protocol)
  } catch {
    return false
  }
}
