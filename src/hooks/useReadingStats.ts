import { useState, useEffect, useRef, useCallback } from 'react'
import { getStorageItem, setStorageItem } from '../utils/storage'
import { basename } from '../utils/path'

const STATS_KEY = 'reading-stats'

export interface FileReadingRecord {
  filePath: string
  fileName: string
  totalTime: number
  lastReadAt: number
  readCount: number
  scrollDepth: number
}

export interface DailyReadingRecord {
  date: string
  totalTime: number
  filesRead: string[]
}

export interface ReadingStats {
  files: Record<string, FileReadingRecord>
  daily: Record<string, DailyReadingRecord>
}

function loadStats(): ReadingStats {
  try {
    const raw = getStorageItem(STATS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return {
          files: parsed.files || {},
          daily: parsed.daily || {}
        }
      }
    }
  } catch {
    // ignore parse errors
  }
  return { files: {}, daily: {} }
}

function saveStats(stats: ReadingStats): void {
  try {
    setStorageItem(STATS_KEY, JSON.stringify(stats))
  } catch {
    // ignore storage errors
  }
}

export function useReadingStats(activeFilePath?: string) {
  const [currentSessionTime, setCurrentSessionTime] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const statsRef = useRef<ReadingStats>(loadStats())
  const sessionAccumulatedMsRef = useRef(0)
  const prevPathRef = useRef<string | undefined>(undefined)

  // Initialize active state based on current visibility and focus
  useEffect(() => {
    setIsActive(document.visibilityState === 'visible' && document.hasFocus())
  }, [])

  // Handle file path changes: update readCount and reset session
  useEffect(() => {
    if (!activeFilePath) return
    if (prevPathRef.current === activeFilePath) return

    const stats = statsRef.current
    if (!stats.files[activeFilePath]) {
      stats.files[activeFilePath] = {
        filePath: activeFilePath,
        fileName: basename(activeFilePath),
        totalTime: 0,
        lastReadAt: Date.now(),
        readCount: 1,
        scrollDepth: 0
      }
    } else {
      stats.files[activeFilePath].readCount += 1
      stats.files[activeFilePath].lastReadAt = Date.now()
    }
    saveStats(stats)

    // Reset session for new file
    sessionAccumulatedMsRef.current = 0
    setCurrentSessionTime(0)
    prevPathRef.current = activeFilePath
  }, [activeFilePath])

  // Timer effect: track reading time and persist every 5 seconds
  useEffect(() => {
    if (!activeFilePath || !isActive) return

    const startTime = Date.now()
    let lastSaveTime = startTime

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsedMs = (now - startTime) + sessionAccumulatedMsRef.current
      setCurrentSessionTime(Math.floor(elapsedMs / 1000))

      // Save accumulated stats every 5 seconds
      if (now - lastSaveTime >= 5000) {
        const msToAdd = now - lastSaveTime
        const secondsToAdd = Math.round(msToAdd / 1000)
        const stats = statsRef.current
        const file = stats.files[activeFilePath]
        if (file) {
          file.totalTime += secondsToAdd
          file.lastReadAt = now
        }

        const today = new Date().toISOString().split('T')[0]
        if (!stats.daily[today]) {
          stats.daily[today] = { date: today, totalTime: 0, filesRead: [] }
        }
        stats.daily[today].totalTime += secondsToAdd
        if (!stats.daily[today].filesRead.includes(activeFilePath)) {
          stats.daily[today].filesRead.push(activeFilePath)
        }

        saveStats(stats)
        lastSaveTime = now
      }
    }, 1000)

    return () => {
      clearInterval(interval)
      const now = Date.now()
      const elapsedMs = now - startTime
      if (elapsedMs > 0) {
        sessionAccumulatedMsRef.current += elapsedMs

        // Final save of remaining time
        const stats = statsRef.current
        const file = stats.files[activeFilePath]
        if (file) {
          file.totalTime += Math.round(elapsedMs / 1000)
          file.lastReadAt = now
        }

        const today = new Date().toISOString().split('T')[0]
        if (!stats.daily[today]) {
          stats.daily[today] = { date: today, totalTime: 0, filesRead: [] }
        }
        stats.daily[today].totalTime += Math.round(elapsedMs / 1000)
        if (!stats.daily[today].filesRead.includes(activeFilePath)) {
          stats.daily[today].filesRead.push(activeFilePath)
        }

        saveStats(stats)
      }
    }
  }, [activeFilePath, isActive])

  // Listen to window focus and visibility changes
  useEffect(() => {
    const handleFocus = () => setIsActive(true)
    const handleBlur = () => setIsActive(false)
    const handleVisibility = () => {
      setIsActive(document.visibilityState === 'visible' && document.hasFocus())
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const recordScrollDepth = useCallback(
    (depth: number) => {
      if (!activeFilePath) return
      const stats = statsRef.current
      const file = stats.files[activeFilePath]
      if (file && depth > file.scrollDepth) {
        file.scrollDepth = depth
        saveStats(stats)
      }
    },
    [activeFilePath]
  )

  return {
    currentSessionTime,
    totalStats: statsRef.current,
    isTracking: isActive,
    recordScrollDepth
  }
}
