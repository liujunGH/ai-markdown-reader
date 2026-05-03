import { useMemo, useState } from 'react'
import styles from './MarkdownGraphPanel.module.css'
import type { IndexProgress } from '../../utils/searchIndex'

export interface MarkdownGraphNode {
  id: string
  label: string
  filePath?: string
  incoming: number
  outgoing: number
}

export interface MarkdownGraphEdge {
  from: string
  to: string
  line: number
}

export interface MarkdownGraph {
  nodes: MarkdownGraphNode[]
  edges: MarkdownGraphEdge[]
  orphanNodes: unknown[]
}

interface Props {
  graph: MarkdownGraph
  onOpenFile: (path: string, line?: number) => void
  onOpenMissingLink?: (target: string) => void
  onReindex?: () => Promise<void> | void
  onClose: () => void
  folderPath?: string
  isIndexing?: boolean
  indexProgress?: IndexProgress | null
  onCancelIndex?: () => void
}

interface PositionedNode extends MarkdownGraphNode {
  x: number
  y: number
  radius: number
}

export function MarkdownGraphPanel({
  graph,
  onOpenFile,
  onOpenMissingLink,
  onReindex,
  onClose,
  folderPath,
  isIndexing = false,
  indexProgress,
  onCancelIndex,
}: Props) {
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const positionedNodes = useMemo(() => layoutNodes(graph.nodes), [graph.nodes])
  const nodeById = useMemo(() => new Map(positionedNodes.map(node => [node.id, node])), [positionedNodes])
  const graphNodeById = useMemo(() => new Map(graph.nodes.map(node => [node.id, node])), [graph.nodes])
  const topNodes = useMemo(() => (
    [...graph.nodes]
      .sort((a, b) => (b.incoming + b.outgoing) - (a.incoming + a.outgoing) || a.label.localeCompare(b.label))
      .slice(0, 12)
  ), [graph.nodes])
  const focusedNode = focusedNodeId ? graphNodeById.get(focusedNodeId) : null
  const focusedIncoming = useMemo(
    () => focusedNodeId ? graph.edges.filter(edge => edge.to === focusedNodeId) : [],
    [focusedNodeId, graph.edges],
  )
  const focusedOutgoing = useMemo(
    () => focusedNodeId ? graph.edges.filter(edge => edge.from === focusedNodeId) : [],
    [focusedNodeId, graph.edges],
  )

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.panel} onClick={e => e.stopPropagation()} aria-label="Markdown 图谱">
        <header className={styles.header}>
          <div>
            <h3>Markdown 图谱</h3>
            <p>{folderPath || '当前工作区'}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={styles.summary}>
          <SummaryCard label="节点" value={graph.nodes.length} />
          <SummaryCard label="链接" value={graph.edges.length} />
          <SummaryCard label="孤立文档" value={graph.orphanNodes.length} />
        </div>
        {isIndexing && indexProgress && (
          <div className={styles.indexProgress}>
            <span>索引中：发现 {indexProgress.discoveredFiles}，已处理 {indexProgress.indexedFiles}，跳过 {indexProgress.skippedFiles}</span>
            {onCancelIndex && (
              <button type="button" onClick={onCancelIndex}>取消</button>
            )}
          </div>
        )}

        <div className={styles.content}>
          {graph.nodes.length === 0 ? (
            <div className={styles.empty}>
              <strong>还没有可显示的图谱</strong>
              <span>{folderPath ? '当前索引为空，重建索引后会显示这个文件夹里的 Markdown 文档。' : '先打开一个 Markdown 文件夹，文档关系会显示在这里。'}</span>
              {folderPath && onReindex && (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => {
                    try {
                      const result = onReindex()
                      if (result instanceof Promise) result.catch(error => console.error('Reindex failed:', error))
                    } catch (error) {
                      console.error('Reindex failed:', error)
                    }
                  }}
                  disabled={isIndexing}
                >
                  {isIndexing ? '正在重建索引...' : '重建索引'}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={styles.graphView}>
                <svg className={styles.svg} viewBox="0 0 640 320" role="img" aria-label="Markdown 文档链接图">
                  {graph.edges.slice(0, 80).map((edge, index) => {
                    const from = nodeById.get(edge.from)
                    const to = nodeById.get(edge.to)
                    if (!from || !to) return null
                    return (
                      <line
                        key={`${edge.from}-${edge.to}-${edge.line}-${index}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        className={`${styles.edge} ${focusedNodeId && (edge.from === focusedNodeId || edge.to === focusedNodeId) ? styles.edgeActive : ''} ${focusedNodeId && edge.from !== focusedNodeId && edge.to !== focusedNodeId ? styles.edgeMuted : ''}`}
                      />
                    )
                  })}
                  {positionedNodes.map(node => (
                    <g
                      key={node.id}
                      className={`${styles.nodeGroup} ${node.filePath ? styles.clickableNode : ''} ${focusedNodeId === node.id ? styles.nodeFocused : ''}`}
                      onClick={() => setFocusedNodeId(node.id)}
                    >
                      <circle cx={node.x} cy={node.y} r={node.radius} className={styles.nodeCircle} />
                      <text x={node.x} y={node.y + node.radius + 14} className={styles.nodeLabel}>
                        {trimLabel(node.label, 14)}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              <div className={styles.sections}>
                <section className={styles.section}>
                  <h4>核心节点</h4>
                  <div className={styles.nodeList}>
                    {topNodes.map(node => (
                      <NodeRow key={node.id} node={node} isFocused={focusedNodeId === node.id} onFocusNode={setFocusedNodeId} />
                    ))}
                  </div>
                </section>

                <section className={styles.section}>
                  {focusedNode ? (
                    <FocusedNodePanel
                      node={focusedNode}
                      incoming={focusedIncoming}
                      outgoing={focusedOutgoing}
                      nodeById={graphNodeById}
                      onOpenFile={onOpenFile}
                      onOpenMissingLink={onOpenMissingLink}
                      onClear={() => setFocusedNodeId(null)}
                    />
                  ) : (
                    <>
                      <h4>孤立文档</h4>
                      {graph.orphanNodes.length === 0 ? (
                        <div className={styles.muted}>没有孤立文档</div>
                      ) : (
                        <div className={styles.orphanList}>
                          {graph.orphanNodes.slice(0, 24).map((node, index) => (
                            <OrphanNode key={orphanKey(node, index)} node={node} onOpenFile={onOpenFile} />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.summaryCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function NodeRow({
  node,
  isFocused,
  onFocusNode,
}: {
  node: MarkdownGraphNode
  isFocused: boolean
  onFocusNode: (id: string) => void
}) {
  const content = (
    <>
      <span className={styles.nodeName}>{node.label}</span>
      <span className={styles.nodeStats}>入 {node.incoming} · 出 {node.outgoing}</span>
    </>
  )

  return (
    <button
      type="button"
      className={`${styles.nodeRow} ${isFocused ? styles.nodeRowFocused : ''}`}
      onClick={() => onFocusNode(node.id)}
      aria-label={`聚焦节点 ${node.label}`}
    >
      {content}
    </button>
  )
}

function FocusedNodePanel({
  node,
  incoming,
  outgoing,
  nodeById,
  onOpenFile,
  onOpenMissingLink,
  onClear,
}: {
  node: MarkdownGraphNode
  incoming: MarkdownGraphEdge[]
  outgoing: MarkdownGraphEdge[]
  nodeById: Map<string, MarkdownGraphNode>
  onOpenFile: (path: string, line?: number) => void
  onOpenMissingLink?: (target: string) => void
  onClear: () => void
}) {
  return (
    <div className={styles.focusPanel} role="region" aria-label={`节点关系 ${node.label}`}>
      <div className={styles.focusHeader}>
        <div>
          <h4>{node.label}</h4>
          <span>入 {incoming.length} · 出 {outgoing.length}</span>
        </div>
        <div className={styles.focusActions}>
          {!node.filePath && onOpenMissingLink && (
            <button type="button" onClick={() => onOpenMissingLink(node.label)} aria-label={`查看缺失链接 ${node.label}`}>
              缺失链接
            </button>
          )}
          <button type="button" onClick={onClear}>清除</button>
        </div>
      </div>

      <LinkGroup
        title="入链"
        emptyText="没有入链"
        edges={incoming}
        getPeer={edge => nodeById.get(edge.from)}
        makeLabel={(peer, edge) => `打开来源 ${peer?.label || edge.from} 行 ${edge.line}`}
        onOpenFile={onOpenFile}
      />
      <LinkGroup
        title="出链"
        emptyText="没有出链"
        edges={outgoing}
        getPeer={edge => nodeById.get(edge.to)}
        makeLabel={(peer, edge) => `打开目标 ${peer?.label || edge.to} 行 ${edge.line}`}
        onOpenFile={onOpenFile}
      />
    </div>
  )
}

function LinkGroup({
  title,
  emptyText,
  edges,
  getPeer,
  makeLabel,
  onOpenFile,
}: {
  title: string
  emptyText: string
  edges: MarkdownGraphEdge[]
  getPeer: (edge: MarkdownGraphEdge) => MarkdownGraphNode | undefined
  makeLabel: (peer: MarkdownGraphNode | undefined, edge: MarkdownGraphEdge) => string
  onOpenFile: (path: string, line?: number) => void
}) {
  return (
    <div className={styles.linkGroup}>
      <h5>{title}</h5>
      {edges.length === 0 ? (
        <div className={styles.muted}>{emptyText}</div>
      ) : (
        <div className={styles.linkRows}>
          {edges.map((edge, index) => {
            const peer = getPeer(edge)
            const label = peer?.label || edge.to
            if (!peer?.filePath) {
              return (
                <div key={`${edge.from}-${edge.to}-${edge.line}-${index}`} className={`${styles.linkRow} ${styles.disabledRow}`}>
                  <span>{label}</span>
                  <small>行 {edge.line}</small>
                </div>
              )
            }
            return (
              <button
                key={`${edge.from}-${edge.to}-${edge.line}-${index}`}
                type="button"
                className={styles.linkRow}
                aria-label={makeLabel(peer, edge)}
                onClick={() => onOpenFile(peer.filePath || '', edge.line)}
              >
                <span>{label}</span>
                <small>行 {edge.line}</small>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function OrphanNode({ node, onOpenFile }: { node: unknown; onOpenFile: (path: string) => void }) {
  const graphNode = node as Partial<MarkdownGraphNode>
  const label = graphNode.label || graphNode.id || '未命名文档'

  if (!graphNode.filePath) {
    return <span className={styles.orphan}>{label}</span>
  }

  return (
    <button type="button" className={styles.orphan} onClick={() => onOpenFile(graphNode.filePath || '')}>
      {label}
    </button>
  )
}

function layoutNodes(nodes: MarkdownGraphNode[]): PositionedNode[] {
  const visibleNodes = nodes
    .slice()
    .sort((a, b) => (b.incoming + b.outgoing) - (a.incoming + a.outgoing) || a.label.localeCompare(b.label))
    .slice(0, 28)

  if (visibleNodes.length === 0) return []

  const centerX = 320
  const centerY = 158
  const radiusX = 250
  const radiusY = 112
  const maxDegree = Math.max(...visibleNodes.map(node => node.incoming + node.outgoing), 1)

  return visibleNodes.map((node, index) => {
    const angle = (Math.PI * 2 * index) / visibleNodes.length - Math.PI / 2
    const degree = node.incoming + node.outgoing
    return {
      ...node,
      x: Math.round(centerX + Math.cos(angle) * radiusX),
      y: Math.round(centerY + Math.sin(angle) * radiusY),
      radius: 7 + Math.round((degree / maxDegree) * 9),
    }
  })
}

function trimLabel(label: string, maxLength: number): string {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label
}

function orphanKey(node: unknown, index: number): string {
  const graphNode = node as Partial<MarkdownGraphNode>
  return `${graphNode.id || graphNode.filePath || graphNode.label || 'orphan'}-${index}`
}
