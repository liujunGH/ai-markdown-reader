import { useState, useEffect, useCallback } from 'react'
import { getStorageItem, setStorageItem } from '../utils/storage'

export interface FileSettings {
  fontSize: number
  showSource: boolean
  showOutline: boolean
}

const DEFAULT_SETTINGS: FileSettings = {
  fontSize: 16,
  showSource: false,
  showOutline: true,
}

export function useFileSettings(filePath?: string) {
  const key = `file-settings-${filePath || 'default'}`

  const [settings, setSettings] = useState<FileSettings>(() => {
    if (!filePath) return DEFAULT_SETTINGS
    const stored = getStorageItem(key as `file-settings-${string}`)
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
      } catch {
        return DEFAULT_SETTINGS
      }
    }
    return DEFAULT_SETTINGS
  })

  useEffect(() => {
    if (!filePath) return
    const stored = getStorageItem(key as `file-settings-${string}`)
    if (stored) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) })
      } catch {
        setSettings(DEFAULT_SETTINGS)
      }
    } else {
      setSettings(DEFAULT_SETTINGS)
    }
  }, [filePath, key])

  useEffect(() => {
    if (!filePath) return
    setStorageItem(key as `file-settings-${string}`, JSON.stringify(settings))
  }, [settings, key, filePath])

  const updateSetting = useCallback(<K extends keyof FileSettings>(
    k: K, v: FileSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [k]: v }))
  }, [])

  return { settings, updateSetting }
}
