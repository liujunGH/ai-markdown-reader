/**
 * ImagePreviewOverlay —— 图片大图预览 overlay
 *
 * 复刻旧 MarkdownRenderer 的图片预览 overlay（缩放/拖拽/Esc/复制地址/原图）。
 * 从 activeDocStore.previewImage 取状态（DocumentView 的 onPreviewImage 触发）。
 */
import { useEffect, useState, useRef } from 'react'
import { useActiveDocStore } from '../../state'

export function ImagePreviewOverlay() {
  const previewImage = useActiveDocStore((s) => s.previewImage)
  const setPreviewImage = useActiveDocStore((s) => s.setPreviewImage)
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragging = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)

  // 重置缩放/位置
  useEffect(() => {
    if (previewImage) {
      setScale(1)
      setPos({ x: 0, y: 0 })
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [previewImage])

  // Esc 关闭
  useEffect(() => {
    if (!previewImage) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [previewImage, setPreviewImage])

  if (!previewImage) return null

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.2 : 0.2
    setScale((s) => Math.max(0.25, Math.min(5, s + delta)))
  }

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = { startX: e.clientX, startY: e.clientY, baseX: pos.x, baseY: pos.y }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    setPos({
      x: dragging.current.baseX + (e.clientX - dragging.current.startX),
      y: dragging.current.baseY + (e.clientY - dragging.current.startY),
    })
  }
  const onMouseUp = () => {
    dragging.current = null
  }

  const copyAddress = () => {
    void navigator.clipboard?.writeText(previewImage.originalSrc)
  }

  const isHttp = /^https?:\/\//i.test(previewImage.originalSrc)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: dragging.current ? 'grabbing' : 'grab',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setPreviewImage(null)
      }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <img
        src={previewImage.src}
        alt={previewImage.alt}
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          transition: dragging.current ? 'none' : 'transform 0.1s',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
        draggable={false}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 8,
          background: 'rgba(0,0,0,0.6)',
          padding: '8px 12px',
          borderRadius: 8,
          color: '#fff',
          fontSize: 13,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={() => setScale((s) => Math.max(0.25, s - 0.25))}>−</button>
        <span>{Math.round(scale * 100)}%</span>
        <button type="button" onClick={() => setScale((s) => Math.min(5, s + 0.25))}>+</button>
        <button type="button" onClick={() => { setScale(1); setPos({ x: 0, y: 0 }) }}>1:1</button>
        <button type="button" onClick={copyAddress}>复制地址</button>
        {isHttp && (
          <button type="button" onClick={() => window.open(previewImage.originalSrc, '_blank', 'noopener,noreferrer')}>原图</button>
        )}
        <button type="button" onClick={() => setPreviewImage(null)}>关闭</button>
      </div>
    </div>
  )
}
