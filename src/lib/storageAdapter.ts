import { db } from './db'
import { getStorageItem as lsGet, setStorageItem as lsSet, removeStorageItem as lsRemove, type StorageKey } from '../utils/storage'

/**
 * Zustand persist middleware storage adapter backed by IndexedDB (Dexie).
 * Falls back to localStorage if IndexedDB fails (private mode, quota exceeded, etc.)
 */

const FALLBACK_PREFIX = 'zustand-'

async function idbGetItem(name: string): Promise<string | null> {
  try {
    const row = await db.app_settings.get(name)
    if (row) {
      return typeof row.value === 'string' ? row.value : JSON.stringify(row.value)
    }
  } catch (e) {
    console.warn('[StorageAdapter] IndexedDB get failed, falling back:', e)
  }
  // Fallback to localStorage
  return lsGet(`${FALLBACK_PREFIX}${name}` as StorageKey) ?? null
}

async function idbSetItem(name: string, value: string): Promise<void> {
  try {
    await db.app_settings.put({ key: name, value })
    return
  } catch (e) {
    console.warn('[StorageAdapter] IndexedDB set failed, falling back:', e)
  }
  // Fallback to localStorage
  lsSet(`${FALLBACK_PREFIX}${name}` as StorageKey, value)
}

async function idbRemoveItem(name: string): Promise<void> {
  try {
    await db.app_settings.delete(name)
  } catch (e) {
    console.warn('[StorageAdapter] IndexedDB remove failed, falling back:', e)
  }
  lsRemove(`${FALLBACK_PREFIX}${name}` as StorageKey)
}

/**
 * Create a Zustand-compatible persist storage backed by IndexedDB.
 * Usage:
 *   persist(store, { name: 'my-store', storage: createIDBStorage() })
 */
export function createIDBStorage() {
  return {
    getItem: async (name: string) => {
      const value = await idbGetItem(name)
      return value ? JSON.parse(value) : null
    },
    setItem: async (name: string, value: unknown) => {
      await idbSetItem(name, JSON.stringify(value))
    },
    removeItem: async (name: string) => {
      await idbRemoveItem(name)
    },
  }
}

/**
 * Simple async key-value API for non-Zustand usage.
 */
export const appStorage = {
  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const raw = await idbGetItem(key)
    if (raw === null) return defaultValue
    try {
      return JSON.parse(raw) as T
    } catch {
      return raw as unknown as T
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    await idbSetItem(key, JSON.stringify(value))
  },
  async remove(key: string): Promise<void> {
    await idbRemoveItem(key)
  },
}
