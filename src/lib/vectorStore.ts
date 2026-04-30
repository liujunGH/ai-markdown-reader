import Dexie, { Table } from 'dexie'

export interface DocumentChunk {
  id: string
  filePath: string
  content: string
  embedding: number[]
  createdAt: number
}

class VectorDatabase extends Dexie {
  chunks!: Table<DocumentChunk, string>

  constructor() {
    super('AIMarkdownVectorDB')
    this.version(1).stores({
      chunks: 'id, filePath',
    })
  }
}

const vectorDb = new VectorDatabase()

export async function saveChunks(chunks: DocumentChunk[]): Promise<void> {
  await vectorDb.chunks.bulkPut(chunks)
}

export async function deleteChunksByFile(filePath: string): Promise<void> {
  await vectorDb.chunks.where('filePath').equals(filePath).delete()
}

export async function deleteAllChunks(): Promise<void> {
  await vectorDb.chunks.clear()
}

export async function getAllChunks(): Promise<DocumentChunk[]> {
  return vectorDb.chunks.toArray()
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function searchSimilar(
  queryEmbedding: number[],
  topK: number = 5
): Promise<Array<{ chunk: DocumentChunk; score: number }>> {
  const chunks = await getAllChunks()
  const scored = chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}

export async function getIndexedFilePaths(): Promise<string[]> {
  const chunks = await getAllChunks()
  return [...new Set(chunks.map((c) => c.filePath))]
}
