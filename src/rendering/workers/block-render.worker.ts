import { renderBlockSources } from '../pipeline/renderBlockSource'
import type { BlockRenderRequest, BlockRenderResponse } from '../types'

self.onmessage = async (event: MessageEvent<BlockRenderRequest>) => {
  const { id, blocks, referenceDefinitions } = event.data
  try {
    const response: BlockRenderResponse = {
      id,
      blocks: await renderBlockSources(blocks, referenceDefinitions),
    }
    self.postMessage(response)
  } catch (error) {
    const response: BlockRenderResponse = {
      id,
      blocks: [],
      error: error instanceof Error ? error.message : String(error),
    }
    self.postMessage(response)
  }
}
