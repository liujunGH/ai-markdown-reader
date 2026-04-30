import { saveChunks, deleteChunksByFile, searchSimilar, DocumentChunk } from '../lib/vectorStore'
import { getAllMarkdownFiles } from '../utils/searchIndex'
import { embedText, ProgressCallback } from './embedding'

export interface SearchResult {
  filePath: string
  content: string
  score: number
}

const MAX_CHUNK_LENGTH = 500

function splitIntoSentences(text: string): string[] {
  // Simple sentence splitting by punctuation followed by space or newline
  const sentences: string[] = []
  const regex = /[^.!?。！？]+[.!?。！？]+\s*/g
  let match
  while ((match = regex.exec(text)) !== null) {
    const sentence = match[0].trim()
    if (sentence) {
      sentences.push(sentence)
    }
  }
  // If no sentences found, return the whole text as one chunk
  if (sentences.length === 0 && text.trim()) {
    sentences.push(text.trim())
  }
  return sentences
}

function splitIntoChunks(content: string): string[] {
  // Split by paragraphs (double newlines)
  const paragraphs = content.split(/\n\s*\n/)
  const chunks: string[] = []

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (!trimmed) continue

    if (trimmed.length <= MAX_CHUNK_LENGTH) {
      chunks.push(trimmed)
    } else {
      // Paragraph too long, split by sentences
      const sentences = splitIntoSentences(trimmed)
      let currentChunk = ''

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > MAX_CHUNK_LENGTH && currentChunk.length > 0) {
          chunks.push(currentChunk.trim())
          currentChunk = sentence
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence
        }
      }

      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
      }
    }
  }

  return chunks.filter((c) => c.length > 0)
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function indexFile(filePath: string, content: string): Promise<void> {
  // Delete old chunks for this file first
  await deleteChunksByFile(filePath)

  const chunks = splitIntoChunks(content)
  const documentChunks: DocumentChunk[] = []

  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i]
    const embedding = await embedText(chunkContent)
    const id = await hashString(`${filePath}::chunk-${i}`)

    documentChunks.push({
      id,
      filePath,
      content: chunkContent,
      embedding,
      createdAt: Date.now(),
    })
  }

  if (documentChunks.length > 0) {
    await saveChunks(documentChunks)
  }
}

export async function indexFolder(
  folderPath: string,
  onProgress?: (indexed: number, total: number, filePath: string) => void,
  onEmbeddingProgress?: ProgressCallback
): Promise<void> {
  const files = await getAllMarkdownFiles(folderPath)
  if (files.length === 0) return

  // Delete old chunks for all files in this folder
  // We need to get all indexed files and delete those in this folder
  // For simplicity, we delete chunks file by file before re-indexing

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    onProgress?.(i, files.length, file.filePath)

    if (!window.electronAPI) continue
    const result = await window.electronAPI.readFile(file.filePath)
    if (result.success && result.content !== undefined) {
      // Delete old chunks first
      await deleteChunksByFile(file.filePath)

      const chunks = splitIntoChunks(result.content)
      const documentChunks: DocumentChunk[] = []

      for (let j = 0; j < chunks.length; j++) {
        const chunkContent = chunks[j]
        const embedding = await embedText(chunkContent, onEmbeddingProgress)
        const id = await hashString(`${file.filePath}::chunk-${j}`)

        documentChunks.push({
          id,
          filePath: file.filePath,
          content: chunkContent,
          embedding,
          createdAt: Date.now(),
        })
      }

      if (documentChunks.length > 0) {
        await saveChunks(documentChunks)
      }
    }

    onProgress?.(i + 1, files.length, file.filePath)
  }
}

export async function semanticSearch(query: string, topK: number = 5): Promise<SearchResult[]> {
  const queryEmbedding = await embedText(query)
  const results = await searchSimilar(queryEmbedding, topK)

  return results.map((r) => ({
    filePath: r.chunk.filePath,
    content: r.chunk.content,
    score: r.score,
  }))
}
