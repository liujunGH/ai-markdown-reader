import { useState, useRef, useEffect } from 'react'
import { useTheme, ACCENT_COLORS, CODE_THEMES } from '../../context/ThemeContext'
import styles from './ThemeToggle.module.css'

export function ThemeToggle() {
  const { theme, toggleTheme, setTheme, accentColor, setAccentColor, codeTheme, setCodeTheme } = useTheme()
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
            <div className={styles.pickerTitle}>主题</div>
            <div className={styles.themeButtons}>
              <button
                className={`${styles.themeBtn} ${theme === 'light' ? styles.active : ''}`}
                onClick={() => setTheme('light')}
              >
                ☀️ 浅色
              </button>
              <button
                className={`${styles.themeBtn} ${theme === 'dark' ? styles.active : ''}`}
                onClick={() => setTheme('dark')}
              >
                🌙 深色
              </button>
              <button
                className={`${styles.themeBtn} ${theme === 'sepia' ? styles.active : ''}`}
                onClick={() => setTheme('sepia')}
              >
                📜 护眼
              </button>
            </div>
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
        </div>
      )}
    </div>
  )
}
