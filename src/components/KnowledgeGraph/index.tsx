import { useState, useCallback, useMemo } from 'react'
import { useKnowledgeGraph } from '../../hooks/useKnowledgeGraph'
import styles from './KnowledgeGraph.module.css'

interface KnowledgeGraphProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (filePath: string) => void
}

export function KnowledgeGraph({ isOpen, onClose, onNavigate }: KnowledgeGraphProps) {
  const { nodes, edges, isLoading, refresh } = useKnowledgeGraph()
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  const handleNodeClick = useCallback(
    (filePath: string) => {
      onNavigate(filePath)
      onClose()
    },
    [onNavigate, onClose]
  )

  const connectedEdges = useMemo(() => {
    if (!hoveredNode) return new Set<string>()
    const set = new Set<string>()
    for (const edge of edges) {
      if (edge.source === hoveredNode || edge.target === hoveredNode) {
        set.add(`${edge.source}--${edge.target}`)
      }
    }
    return set
  }, [hoveredNode, edges])

  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return new Set<string>()
    const set = new Set<string>()
    for (const edge of edges) {
      if (edge.source === hoveredNode) set.add(edge.target)
      if (edge.target === hoveredNode) set.add(edge.source)
    }
    return set
  }, [hoveredNode, edges])

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="知识图谱">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>🕸️ 知识图谱</h3>
          <div className={styles.actions}>
            <button className={styles.iconBtn} onClick={refresh} title="刷新" type="button">
              🔄
            </button>
            <button className={styles.iconBtn} onClick={onClose} title="关闭" type="button">
              ✕
            </button>
          </div>
        </div>

        <div className={styles.graphArea}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <div>正在构建知识图谱...</div>
            </div>
          ) : nodes.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🕸️</div>
              <div className={styles.emptyText}>暂无索引文档，请先索引文件夹</div>
            </div>
          ) : (
            <>
              <svg
                className={styles.svg}
                viewBox="0 0 800 600"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Edges */}
                {edges.map((edge) => {
                  const source = nodes.find((n) => n.id === edge.source)
                  const target = nodes.find((n) => n.id === edge.target)
                  if (!source || !target) return null
                  const edgeId = `${edge.source}--${edge.target}`
                  const isHighlighted = connectedEdges.has(edgeId)
                  return (
                    <line
                      key={edgeId}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      strokeWidth={1 + edge.weight * 3}
                      strokeOpacity={isHighlighted ? 0.8 : 0.25 + edge.weight * 0.4}
                      className={`${styles.edge} ${isHighlighted ? styles.edgeHighlight : ''}`}
                    />
                  )
                })}

                {/* Nodes */}
                {nodes.map((node) => {
                  const isHovered = hoveredNode === node.id
                  const isConnected = connectedNodes.has(node.id)
                  const isDimmed = hoveredNode && !isHovered && !isConnected
                  return (
                    <g
                      key={node.id}
                      className={styles.node}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={() => handleNodeClick(node.id)}
                      opacity={isDimmed ? 0.3 : 1}
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isHovered ? 24 : 18}
                        className={styles.nodeCircle}
                      />
                      <rect
                        x={node.x - node.label.length * 5.5 - 6}
                        y={node.y + 28}
                        width={node.label.length * 11 + 12}
                        height={18}
                        className={styles.nodeLabelBg}
                      />
                      <text
                        x={node.x}
                        y={node.y + 37}
                        className={styles.nodeLabel}
                      >
                        {node.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
              <div className={styles.legend}>
                节点数: {nodes.length} | 关联数: {edges.length}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
