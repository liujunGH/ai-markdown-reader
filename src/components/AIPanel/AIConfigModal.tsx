import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAIStore } from '../../stores/aiStore'
import styles from './AIPanel.module.css'

interface AIConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AIConfigModal({ isOpen, onClose }: AIConfigModalProps) {
  const { t } = useTranslation()
  const modalRef = useRef<HTMLDivElement>(null)
  const config = useAIStore((state) => state.config)
  const updateConfig = useAIStore((state) => state.updateConfig)

  const [baseURL, setBaseURL] = useState(config.baseURL)
  const [apiKey, setApiKey] = useState(config.apiKey)
  const [model, setModel] = useState(config.model)
  const [enabled, setEnabled] = useState(config.enabled)

  useEffect(() => {
    if (isOpen) {
      setBaseURL(config.baseURL)
      setApiKey(config.apiKey)
      setModel(config.model)
      setEnabled(config.enabled)
    }
  }, [isOpen, config])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleSave = () => {
    updateConfig({ baseURL, apiKey, model, enabled })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay}>
      <div
        ref={modalRef}
        className={styles.configModal}
        role="dialog"
        aria-modal="true"
        aria-label={t('aiConfig.title')}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{t('aiConfig.title')}</h3>
          <button
            className={styles.modalCloseBtn}
            onClick={onClose}
            type="button"
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="ai-base-url">
              {t('aiConfig.baseUrl')}
            </label>
            <input
              id="ai-base-url"
              type="text"
              className={styles.formInput}
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="https://api.xiaomimimo.com/v1"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="ai-api-key">
              {t('aiConfig.apiKey')}
            </label>
            <input
              id="ai-api-key"
              type="password"
              className={styles.formInput}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="ai-model">
              {t('aiConfig.modelName')}
            </label>
            <input
              id="ai-model"
              type="text"
              className={styles.formInput}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="MiMo-V2.5-Pro"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.toggleLabel} htmlFor="ai-enabled">
              <input
                id="ai-enabled"
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span>{t('aiConfig.enableAI')}</span>
            </label>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
            type="button"
          >
            {t('common.cancel')}
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            type="button"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
