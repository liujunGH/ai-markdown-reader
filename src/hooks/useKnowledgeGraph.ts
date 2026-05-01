import { useState, useEffect, useCallback } from 'react'
import { getIndexedFilePaths, getAllChunks } from '../lib/vectorStore'

export interface GraphNode {
  id: string
  label: string
  x: number
  y: number
}

export interface GraphEdge {
  source: string
  target: string
  weight: number
}

export interface KnowledgeGraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

function getBasename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath
}

function extractKeywords(filePath: string, chunks: string[]): string[] {
  const basename = getBasename(filePath)
  const nameWithoutExt = basename.replace(/\.md$/i, '')

  const nameWords = nameWithoutExt
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fa5]+/)
    .filter((w) => w.length >= 2)

  const headingWords: string[] = []
  for (const chunk of chunks) {
    const lines = chunk.split('\n')
    for (const line of lines) {
      const match = line.match(/^#{1,6}\s+(.+)$/)
      if (match) {
        const words = match[1]
          .toLowerCase()
          .split(/[^a-z0-9\u4e00-\u9fa5]+/)
          .filter((w) => w.length >= 2)
        headingWords.push(...words)
      }
    }
  }

  return [...new Set([...nameWords, ...headingWords])]
}

function computeJaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a)
  const setB = new Set(b)
  if (setA.size === 0 && setB.size === 0) return 0
  const intersection = new Set([...setA].filter((x) => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return intersection.size / union.size
}

const SIMULATION_WIDTH = 800
const SIMULATION_HEIGHT = 600
const SIMULATION_ITERATIONS = 120

export function useKnowledgeGraph(): KnowledgeGraphData & {
  isLoading: boolean
  refresh: () => void
} {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const buildGraph = useCallback(async () => {
    setIsLoading(true)
    try {
      const filePaths = await getIndexedFilePaths()
      if (filePaths.length === 0) {
        setNodes([])
        setEdges([])
        return
      }

      const allChunks = await getAllChunks()
      const fileChunks = new Map<string, string[]>()
      for (const chunk of allChunks) {
        if (!fileChunks.has(chunk.filePath)) {
          fileChunks.set(chunk.filePath, [])
        }
        fileChunks.get(chunk.filePath)!.push(chunk.content)
      }

      const fileKeywords = new Map<string, string[]>()
      for (const filePath of filePaths) {
        const chunks = fileChunks.get(filePath) || []
        fileKeywords.set(filePath, extractKeywords(filePath, chunks))
      }

      // Initialize nodes in a circle
      const newNodes: GraphNode[] = filePaths.map((filePath, index) => {
        const angle = (index / Math.max(filePaths.length, 1)) * Math.PI * 2
        const radius = Math.min(SIMULATION_WIDTH, SIMULATION_HEIGHT) * 0.35
        return {
          id: filePath,
          label: getBasename(filePath),
          x: Math.cos(angle) * radius + SIMULATION_WIDTH / 2,
          y: Math.sin(angle) * radius + SIMULATION_HEIGHT / 2,
        }
      })

      // Build edges based on similarity
      const newEdges: GraphEdge[] = []
      for (let i = 0; i < filePaths.length; i++) {
        for (let j = i + 1; j < filePaths.length; j++) {
          const sim = computeJaccardSimilarity(
            fileKeywords.get(filePaths[i]) || [],
            fileKeywords.get(filePaths[j]) || []
          )
          if (sim > 0.05) {
            newEdges.push({
              source: filePaths[i],
              target: filePaths[j],
              weight: sim,
            })
          }
        }
      }

      // Simple force-directed simulation
      for (let iter = 0; iter < SIMULATION_ITERATIONS; iter++) {
        // Repulsion between all nodes
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[j].x - newNodes[i].x
            const dy = newNodes[j].y - newNodes[i].y
            const distSq = dx * dx + dy * dy
            const dist = Math.sqrt(distSq) || 1
            const force = 4000 / (distSq + 100)
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            newNodes[i].x -= fx
            newNodes[i].y -= fy
            newNodes[j].x += fx
            newNodes[j].y += fy
          }
        }

        // Attraction along edges
        for (const edge of newEdges) {
          const source = newNodes.find((n) => n.id === edge.source)
          const target = newNodes.find((n) => n.id === edge.target)
          if (!source || !target) continue
          const dx = target.x - source.x
          const dy = target.y - source.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = dist * 0.008 * edge.weight
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          source.x += fx
          source.y += fy
          target.x -= fx
          target.y -= fy
        }

        // Center gravity
        for (const node of newNodes) {
          const dx = SIMULATION_WIDTH / 2 - node.x
          const dy = SIMULATION_HEIGHT / 2 - node.y
          node.x += dx * 0.03
          node.y += dy * 0.03
        }
      }

      setNodes(newNodes)
      setEdges(newEdges)
    } catch (err) {
      console.error('Failed to build knowledge graph:', err)
      setNodes([])
      setEdges([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void buildGraph()
  }, [buildGraph])

  return { nodes, edges, isLoading, refresh: buildGraph }
}
