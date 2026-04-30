import { pipeline, FeatureExtractionPipeline, Tensor } from '@xenova/transformers'

export type ProgressCallback = (progress: { status: string; file?: string; progress?: number; loaded?: number; total?: number }) => void

let embedder: FeatureExtractionPipeline | null = null
let initializationPromise: Promise<FeatureExtractionPipeline> | null = null

export async function getEmbedder(progressCallback?: ProgressCallback): Promise<FeatureExtractionPipeline> {
  if (embedder) {
    return embedder
  }

  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: true,
    progress_callback: progressCallback as unknown as Function,
  })

  embedder = await initializationPromise
  return embedder
}

export async function embedText(text: string, progressCallback?: ProgressCallback): Promise<number[]> {
  const extractor = await getEmbedder(progressCallback)
  const output: Tensor = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data as Float32Array)
}

export function resetEmbedder(): void {
  embedder = null
  initializationPromise = null
}
