const DEFAULT_BLOCK_HTML_CACHE_CAPACITY = 160

/** DocumentView 私有的有界 LRU，同时记录正在 Worker 中渲染的块。 */
export class BlockHtmlCache {
  private readonly values = new Map<number, string>()
  private readonly pending = new Set<number>()

  constructor(private readonly capacity = DEFAULT_BLOCK_HTML_CACHE_CAPACITY) {}

  get(blockId: number): string | undefined {
    const value = this.values.get(blockId)
    if (value === undefined) return undefined
    this.values.delete(blockId)
    this.values.set(blockId, value)
    return value
  }

  reserve(blockIds: number[]): number[] {
    const reserved: number[] = []
    for (const blockId of blockIds) {
      if (this.values.has(blockId) || this.pending.has(blockId)) continue
      this.pending.add(blockId)
      reserved.push(blockId)
    }
    return reserved
  }

  resolve(entries: Array<{ id: number; html: string }>): void {
    for (const { id, html } of entries) {
      this.pending.delete(id)
      this.values.delete(id)
      this.values.set(id, html)
    }
    this.evict()
  }

  reject(blockIds: number[]): void {
    for (const blockId of blockIds) this.pending.delete(blockId)
  }

  get size(): number {
    return this.values.size
  }

  private evict(): void {
    while (this.values.size > this.capacity) {
      const oldest = this.values.keys().next().value as number | undefined
      if (oldest === undefined) return
      this.values.delete(oldest)
    }
  }
}
