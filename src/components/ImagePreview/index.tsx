import { useState, useEffect } from 'react'
import styles from './ImagePreview.module.css'

interface Props {
  src: string
  alt?: string
}

export function ImagePreview({ src, alt }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  const handleClick = () => {
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
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

  return (
    <>
      <img 
        src={src} 
        alt={alt} 
        className={styles.thumbnail}
        onClick={handleClick}
      />
      {isOpen && (
        <div className={styles.overlay} onClick={handleClose}>
          <button className={styles.closeButton} onClick={handleClose}>✕</button>
          <img 
            src={src} 
            alt={alt} 
            className={styles.fullImage}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
