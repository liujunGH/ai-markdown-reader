import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './FirstUseGuide.module.css'

interface GuideStep {
  target: string
  title: string
  description: string
  position: 'bottom' | 'top' | 'right'
}

interface Props {
  onComplete: () => void
  onSkip: () => void
}

export function FirstUseGuide({ onComplete, onSkip }: Props) {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [showTips, setShowTips] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const GUIDE_STEPS: GuideStep[] = [
    {
      target: '[data-guide="file-opener"]',
      title: t('guide.steps.openFile.title'),
      description: t('guide.steps.openFile.description'),
      position: 'bottom'
    },
    {
      target: '[data-guide="recent-files"]',
      title: t('guide.steps.recentFiles.title'),
      description: t('guide.steps.recentFiles.description'),
      position: 'bottom'
    },
    {
      target: '[data-guide="outline"]',
      title: t('guide.steps.outline.title'),
      description: t('guide.steps.outline.description'),
      position: 'bottom'
    },
    {
      target: '[data-guide="search"]',
      title: t('guide.steps.search.title'),
      description: t('guide.steps.search.description'),
      position: 'bottom'
    },
    {
      target: '[data-guide="tools"]',
      title: '工具菜单',
      description: '阅读工具、全局搜索、索引诊断和导出功能都集中在这里。',
      position: 'bottom'
    },
    {
      target: '[data-guide="theme-toggle"]',
      title: t('guide.steps.theme.title'),
      description: t('guide.steps.theme.description'),
      position: 'bottom'
    }
  ]

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
    <div className={styles.overlay} ref={overlayRef} role="dialog" aria-modal="true" aria-label={t('guide.ariaLabel')}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('guide.welcomeTitle')}</h3>
        <div className={styles.actions}>
          <button className={styles.skipBtn} onClick={onSkip}>
            {t('guide.skip')}
          </button>
        </div>
      </div>

      <div className={styles.tips}>
        <button 
          className={`${styles.tipToggle} ${showTips ? styles.active : ''}`}
          onClick={() => setShowTips(!showTips)}
        >
          {t('guide.tips')}
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
                  {t('guide.prev')}
                </button>
              )}
              <button className={styles.navBtn} onClick={handleNext}>
                {currentStep === GUIDE_STEPS.length - 1 ? t('guide.finish') : t('guide.next')}
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
