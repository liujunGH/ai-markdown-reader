import { useState, useRef, useEffect } from 'react'
import { useTheme, ACCENT_COLORS, CODE_THEMES } from '../../context/ThemeContext'
import styles from './ThemeToggle.module.css'

interface ThemeToggleProps {
  onOpenCustomStyle?: () => void
}

export function ThemeToggle({ onOpenCustomStyle }: ThemeToggleProps) {
  const {
    theme, toggleTheme, setTheme, accentColor, setAccentColor, codeTheme, setCodeTheme,
    followSystem, setFollowSystem, autoDark, setAutoDark
  } = useTheme()
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getThemeIcon = () => {
    if (theme === 'light') return '☀️'
    if (theme === 'dark') return '🌙'
    return '📜'
  }

  const getThemeName = () => {
    if (theme === 'light') return '浅色'
    if (theme === 'dark') return '深色'
    return '护眼'
  }

  const isAuto = followSystem || autoDark

  return (
    <div className={styles.container} ref={pickerRef} data-guide="theme-toggle">
      <button
        className={styles.toggle}
        onClick={toggleTheme}
        aria-label="Toggle theme"
        title={`${getThemeName()}主题`}
      >
        {getThemeIcon()}
      </button>
      <button
        className={styles.colorBtn}
        onClick={() => setShowPicker(!showPicker)}
        aria-label="主题设置"
        title="主题设置"
      >
        <span
          className={styles.colorDot}
          style={{ backgroundColor: accentColor }}
        />
      </button>
      {showPicker && (
        <div className={styles.picker}>
          <div className={styles.section}>
            <div className={styles.pickerTitle}>自动切换</div>
            <div className={styles.switches}>
              <button
                className={`${styles.switchRow} ${followSystem ? styles.switchRowOn : ''}`}
                onClick={() => setFollowSystem(!followSystem)}
              >
                <span className={styles.switchLabel}>🌓 跟随系统</span>
                <span className={`${styles.switchTrack} ${followSystem ? styles.switchTrackOn : ''}`}>
                  <span className={styles.switchThumb} />
                </span>
              </button>
              {!followSystem && (
                <button
                  className={`${styles.switchRow} ${autoDark ? styles.switchRowOn : ''}`}
                  onClick={() => setAutoDark(!autoDark)}
                >
                  <span className={styles.switchLabel}>🕐 自动深色（22:00-07:00）</span>
                  <span className={`${styles.switchTrack} ${autoDark ? styles.switchTrackOn : ''}`}>
                    <span className={styles.switchThumb} />
                  </span>
                </button>
              )}
            </div>
          </div>
          <div className={styles.divider} />
          <div className={styles.section}>
            <div className={styles.pickerTitle}>主题</div>
            <div className={styles.themeButtons}>
              <button
                className={`${styles.themeBtn} ${theme === 'light' ? styles.active : ''} ${isAuto ? styles.disabled : ''}`}
                onClick={() => setTheme('light')}
                disabled={isAuto}
              >
                ☀️ 浅色
              </button>
              <button
                className={`${styles.themeBtn} ${theme === 'dark' ? styles.active : ''} ${isAuto ? styles.disabled : ''}`}
                onClick={() => setTheme('dark')}
                disabled={isAuto}
              >
                🌙 深色
              </button>
              <button
                className={`${styles.themeBtn} ${theme === 'sepia' ? styles.active : ''} ${isAuto ? styles.disabled : ''}`}
                onClick={() => setTheme('sepia')}
                disabled={isAuto}
              >
                📜 护眼
              </button>
            </div>
            {isAuto && (
              <div className={styles.autoHint}>
                {followSystem ? '已启用跟随系统，手动切换已禁用' : '已启用自动深色，手动切换已禁用'}
              </div>
            )}
          </div>
          <div className={styles.divider} />
          <div className={styles.section}>
            <div className={styles.pickerTitle}>代码主题</div>
            <div className={styles.themeButtons}>
              {CODE_THEMES.map((t) => (
                <button
                  key={t.value}
                  className={`${styles.themeBtn} ${codeTheme === t.value ? styles.active : ''}`}
                  onClick={() => setCodeTheme(t.value)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.divider} />
          <div className={styles.section}>
            <div className={styles.pickerTitle}>主题颜色</div>
            <div className={styles.colorGrid}>
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  className={`${styles.colorOption} ${accentColor === color.value ? styles.selected : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setAccentColor(color.value)}
                  title={color.name}
                >
                  {accentColor === color.value && '✓'}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.divider} />
          <div className={styles.section}>
            <div className={styles.pickerTitle}>自定义</div>
            <button
              className={styles.themeBtn}
              onClick={() => {
                setShowPicker(false)
                onOpenCustomStyle?.()
              }}
            >
              🎨 自定义 CSS
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
