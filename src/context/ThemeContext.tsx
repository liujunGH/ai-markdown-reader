import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark' || stored === 'sepia') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const [accentColor, setAccentColorState] = useState<string>(() => {
    const stored = localStorage.getItem('accentColor')
    if (stored) return stored
    return '#0066cc'
  })

  const [codeTheme, setCodeThemeState] = useState<string>(() => {
    const stored = localStorage.getItem('codeTheme')
    return stored || 'default'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor)
    localStorage.setItem('accentColor', accentColor)
  }, [accentColor])

  useEffect(() => {
    localStorage.setItem('codeTheme', codeTheme)
  }, [codeTheme])

  const toggleTheme = () => {
    if (theme === 'light') setThemeState('dark')
    else if (theme === 'dark') setThemeState('sepia')
    else setThemeState('light')
  }
  
  const setTheme = (t: Theme) => setThemeState(t)
  const setAccentColor = (color: string) => setAccentColorState(color)
  const setCodeTheme = (t: string) => setCodeThemeState(t)

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, accentColor, setAccentColor, codeTheme, setCodeTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
