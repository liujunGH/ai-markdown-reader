import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './ImagePreview.module.css'

interface Props {
  src: string
  alt?: string
}

export function ImagePreview({ src, alt }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 })

  const handleClick = () => {
    setIsOpen(true)
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleClose = () => {
    setIsOpen(false)
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale(prev => Math.min(5, Math.max(0.25, parseFloat((prev + delta).toFixed(2)))))
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: position.x,
      startY: position.y,
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setPosition({
      x: dragStartRef.current.startX + dx,
      y: dragStartRef.current.startY + dy,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomIn = () => {
    setScale(prev => Math.min(5, parseFloat((prev + 0.25).toFixed(2))))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.25, parseFloat((prev - 0.25).toFixed(2))))
  }

  const handleZoomReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleZoomFit = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={styles.thumbnail}
        onClick={handleClick}
        loading="lazy"
      />
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={handleClose}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <button className={styles.closeButton} onClick={handleClose}>✕</button>
          <div className={styles.controls}>
            <button onClick={handleZoomOut} title="缩小">−</button>
            <span className={styles.scaleText}>{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn} title="放大">+</button>
            <button onClick={handleZoomReset} title="1:1">1:1</button>
            <button onClick={handleZoomFit} title="适应屏幕">适应</button>
          </div>
          <img
            src={src}
            alt={alt}
            className={styles.fullImage}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
          />
        </div>
      )}
    </>
  )
}
