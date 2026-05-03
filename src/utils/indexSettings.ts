import { getDefaultIndexSkipDirectoryNames } from './searchIndex'
import { getStorageItem, removeStorageItem, setStorageItem } from './storage'

const INDEX_SETTINGS_KEY = 'index-settings'
const MIN_FILE_SIZE_MB = 1
const MAX_FILE_SIZE_MB = 500

export interface IndexSettings {
  maxFileSizeMb: number
  extraSkipDirectoryNames: string[]
}

export interface EffectiveIndexPolicy {
  maxFileSizeBytes: number
  skipDirectoryNames: string[]
}

export const DEFAULT_INDEX_SETTINGS: IndexSettings = {
  maxFileSizeMb: 50,
  extraSkipDirectoryNames: [],
}

export function loadIndexSettings(): IndexSettings {
  const stored = getStorageItem(INDEX_SETTINGS_KEY)
  if (!stored) return DEFAULT_INDEX_SETTINGS

  try {
    return normalizeIndexSettings(JSON.parse(stored))
  } catch {
    return DEFAULT_INDEX_SETTINGS
  }
}

export function saveIndexSettings(settings: IndexSettings): IndexSettings {
  const normalized = normalizeIndexSettings(settings)
  setStorageItem(INDEX_SETTINGS_KEY, JSON.stringify(normalized))
  return normalized
}

export function resetIndexSettings(): IndexSettings {
  removeStorageItem(INDEX_SETTINGS_KEY)
  return DEFAULT_INDEX_SETTINGS
}

export function getEffectiveIndexPolicy(settings: IndexSettings): EffectiveIndexPolicy {
  const normalized = normalizeIndexSettings(settings)
  const defaults = getDefaultIndexSkipDirectoryNames()
  return {
    maxFileSizeBytes: normalized.maxFileSizeMb * 1024 * 1024,
    skipDirectoryNames: [...defaults, ...normalized.extraSkipDirectoryNames],
  }
}

function normalizeIndexSettings(value: unknown): IndexSettings {
  if (!value || typeof value !== 'object') return DEFAULT_INDEX_SETTINGS
  const settings = value as Partial<IndexSettings>
  if (
    typeof settings.maxFileSizeMb !== 'number'
    || !Number.isInteger(settings.maxFileSizeMb)
    || settings.maxFileSizeMb < MIN_FILE_SIZE_MB
    || settings.maxFileSizeMb > MAX_FILE_SIZE_MB
    || !Array.isArray(settings.extraSkipDirectoryNames)
  ) {
    return DEFAULT_INDEX_SETTINGS
  }

  return {
    maxFileSizeMb: settings.maxFileSizeMb,
    extraSkipDirectoryNames: normalizeDirectoryNames(settings.extraSkipDirectoryNames),
  }
}

function normalizeDirectoryNames(names: unknown[]): string[] {
  const defaults = new Set(getDefaultIndexSkipDirectoryNames())
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const rawName of names) {
    if (typeof rawName !== 'string') continue
    const name = rawName.trim()
    if (!name || defaults.has(name) || seen.has(name)) continue
    seen.add(name)
    normalized.push(name)
  }

  return normalized
}
