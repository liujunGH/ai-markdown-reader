import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { getStorageItem, setStorageItem } from '../utils/storage'

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '0, 0, 0'
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  return `${r}, ${g}, ${b}`
}

type Theme = 'light' | 'dark' | 'sepia'

export const ACCENT_COLORS = [
  { name: '蓝色', value: '#0066cc' },
  { name: '绿色', value: '#00a86b' },
  { name: '紫色', value: '#8b5cf6' },
  { name: '橙色', value: '#f97316' },
  { name: '粉色', value: '#ec4899' },
  { name: '青色', value: '#14b8a6' },
]

export const CODE_THEMES = [
  { name: '默认', value: 'default' },
  { name: '深色', value: 'tomorrow' },
  { name: '高对比', value: 'prism' },
  { name: '扁平', value: 'atom-dark' },
]

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  accentColor: string
  setAccentColor: (color: string) => void
  codeTheme: string
  setCodeTheme: (theme: string) => void
  followSystem: boolean
  setFollowSystem: (value: boolean) => void
  autoDark: boolean
  setAutoDark: (value: boolean) => void
  customCSS: string
  setCustomCSS: (css: string) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function getTimeBasedTheme(): 'light' | 'dark' {
  const hour = new Date().getHours()
  return hour >= 22 || hour < 7 ? 'dark' : 'light'
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const follow = getStorageItem('followSystem') === 'true'
    const auto = getStorageItem('autoDark') === 'true'
    if (follow) {
      return getSystemTheme()
    }
    if (auto) {
      return getTimeBasedTheme()
    }
    const stored = getStorageItem('theme')
    if (stored === 'light' || stored === 'dark' || stored === 'sepia') return stored
    return getSystemTheme()
  })

  const [accentColor, setAccentColorState] = useState<string>(() => {
    const stored = getStorageItem('accentColor')
    if (stored) return stored
    return '#0066cc'
  })

  const [codeTheme, setCodeThemeState] = useState<string>(() => {
    const stored = getStorageItem('codeTheme')
    return stored || 'default'
  })

  const [followSystem, setFollowSystemState] = useState<boolean>(() => {
    return getStorageItem('followSystem') === 'true'
  })

  const [autoDark, setAutoDarkState] = useState<boolean>(() => {
    return getStorageItem('autoDark') === 'true'
  })

  const [customCSS, setCustomCSSState] = useState<string>(() => {
    return getStorageItem('custom-css', '') ?? ''
  })

  const setCustomCSS = useCallback((css: string) => {
    setCustomCSSState(css)
    setStorageItem('custom-css', css)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    setStorageItem('theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor)
    document.documentElement.style.setProperty('--accent-rgb', hexToRgb(accentColor))
    setStorageItem('accentColor', accentColor)
  }, [accentColor])

  useEffect(() => {
    setStorageItem('codeTheme', codeTheme)
  }, [codeTheme])

  useEffect(() => {
    setStorageItem('followSystem', String(followSystem))
    if (followSystem) {
      setAutoDarkState(false)
      setStorageItem('autoDark', 'false')
      setThemeState(getSystemTheme())
    }
  }, [followSystem])

  useEffect(() => {
    setStorageItem('autoDark', String(autoDark))
    if (autoDark && !followSystem) {
      setThemeState(getTimeBasedTheme())
    }
  }, [autoDark, followSystem])

  // Listen to Electron system theme changes
  useEffect(() => {
    if (!window.electronAPI || !followSystem) return
    const handler = (systemTheme: 'light' | 'dark') => {
      setThemeState(systemTheme)
    }
    window.electronAPI.onSystemThemeChange(handler)
    return () => {
      window.electronAPI?.offSystemThemeChange(handler)
    }
  }, [followSystem])

  // Browser fallback: listen to matchMedia changes
  useEffect(() => {
    if (!followSystem) return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      setThemeState(e.matches ? 'dark' : 'light')
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [followSystem])

  // Time-based interval check
  useEffect(() => {
    if (!autoDark || followSystem) return
    setThemeState(getTimeBasedTheme())
    const interval = setInterval(() => {
      setThemeState(getTimeBasedTheme())
    }, 60000) // check every minute
    return () => clearInterval(interval)
  }, [autoDark, followSystem])

  // Inject custom CSS
  useEffect(() => {
    let styleEl = document.getElementById('user-custom-css') as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'user-custom-css'
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = customCSS
  }, [customCSS])

  const toggleTheme = () => {
    if (followSystem || autoDark) return
    if (theme === 'light') setThemeState('dark')
    else if (theme === 'dark') setThemeState('sepia')
    else setThemeState('light')
  }

  const setTheme = (t: Theme) => {
    if (followSystem || autoDark) return
    setThemeState(t)
  }
  const setAccentColor = (color: string) => setAccentColorState(color)
  const setCodeTheme = (t: string) => setCodeThemeState(t)
  const setFollowSystem = (value: boolean) => setFollowSystemState(value)
  const setAutoDark = (value: boolean) => {
    setAutoDarkState(value)
    if (value) setFollowSystemState(false)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, accentColor, setAccentColor, codeTheme, setCodeTheme, followSystem, setFollowSystem, autoDark, setAutoDark, customCSS, setCustomCSS }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
