import { useState, useEffect, useRef } from 'react'
import styles from './FirstUseGuide.module.css'

interface GuideStep {
  target: string
  title: string
  description: string
  position: 'bottom' | 'top' | 'right'
}

const GUIDE_STEPS: GuideStep[] = [
  {
    target: '[data-guide="file-opener"]',
    title: '打开文件',
    description: '点击按钮选择本地 .md 文件，或直接将文件拖拽到窗口中',
    position: 'bottom'
  },
  {
    target: '[data-guide="recent-files"]',
    title: '最近文件',
    description: '快速访问最近打开的文件',
    position: 'bottom'
  },
  {
    target: '[data-guide="outline"]',
    title: '目录导航',
    description: '查看文档大纲，快速跳转到任意章节',
    position: 'bottom'
  },
  {
    target: '[data-guide="search"]',
    title: '全文搜索',
    description: '按 Ctrl+F 搜索内容，支持正则表达式',
    position: 'bottom'
  },
  {
    target: '[data-guide="source"]',
    title: '源码模式',
    description: '查看 Markdown 原始内容',
    position: 'bottom'
  },
  {
    target: '[data-guide="font-size"]',
    title: '字体大小',
    description: '调整阅读字体大小，或使用 Ctrl+= / Ctrl+- 快捷键',
    position: 'bottom'
  },
  {
    target: '[data-guide="focus-mode"]',
    title: '专注模式',
    description: '隐藏所有界面元素，只保留内容。按 Ctrl+. 切换',
    position: 'bottom'
  },
  {
    target: '[data-guide="theme-toggle"]',
    title: '主题切换',
    description: '切换深色/浅色模式，点击颜色圆点自定义主题色',
    position: 'bottom'
  }
]

interface Props {
  onComplete: () => void
  onSkip: () => void
}

export function FirstUseGuide({ onComplete, onSkip }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [showTips, setShowTips] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const step = GUIDE_STEPS[currentStep]
    if (!step) return

    const updatePosition = () => {
      const element = document.querySelector(step.target)
      if (!element) {
        setCurrentStep(prev => prev + 1)
        return
      }

      const rect = element.getBoundingClientRect()
      const scrollTop = window.scrollY

      let top = rect.bottom + scrollTop + 8
      let left = rect.left + rect.width / 2

      if (step.position === 'top') {
        top = rect.top + scrollTop - 8
      } else if (step.position === 'right') {
        left = rect.right + 8
        top = rect.top + scrollTop + rect.height / 2
      }

      setTooltipStyle({
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        transform: 'translateX(-50%)'
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [currentStep])

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      onComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const step = GUIDE_STEPS[currentStep]

  return (
    <div className={styles.overlay} ref={overlayRef} role="dialog" aria-modal="true" aria-label="新手引导">
      <div className={styles.header}>
        <h3 className={styles.title}>欢迎使用 AI Markdown Reader</h3>
        <div className={styles.actions}>
          <button className={styles.skipBtn} onClick={onSkip}>
            跳过引导
          </button>
        </div>
      </div>

      <div className={styles.tips}>
        <button 
          className={`${styles.tipToggle} ${showTips ? styles.active : ''}`}
          onClick={() => setShowTips(!showTips)}
        >
          💡 使用提示
        </button>
        
        {showTips && (
          <div className={styles.tipList}>
            {GUIDE_STEPS.map((s, i) => (
              <button
                key={i}
                className={`${styles.tipItem} ${i === currentStep ? styles.active : ''}`}
                onClick={() => setCurrentStep(i)}
              >
                {i + 1}. {s.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {step && (
        <div className={styles.tooltip} style={tooltipStyle}>
          <div className={styles.tooltipTitle}>{step.title}</div>
          <div className={styles.tooltipDesc}>{step.description}</div>
          <div className={styles.tooltipNav}>
            <span className={styles.stepCount}>
              {currentStep + 1} / {GUIDE_STEPS.length}
            </span>
            <div className={styles.navButtons}>
              {currentStep > 0 && (
                <button className={styles.navBtn} onClick={handlePrev}>
                  ← 上一步
                </button>
              )}
              <button className={styles.navBtn} onClick={handleNext}>
                {currentStep === GUIDE_STEPS.length - 1 ? '完成' : '下一步 →'}
              </button>
            </div>
          </div>
          <div className={styles.tooltipArrow} />
        </div>
      )}
    </div>
  )
}

export default FirstUseGuide
