import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_INDEX_SETTINGS,
  getEffectiveIndexPolicy,
  loadIndexSettings,
  resetIndexSettings,
  saveIndexSettings,
} from '../../utils/indexSettings'

describe('indexSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads default settings when nothing is saved', () => {
    expect(loadIndexSettings()).toEqual(DEFAULT_INDEX_SETTINGS)
  })

  it('saves and loads normalized settings', () => {
    saveIndexSettings({
      maxFileSizeMb: 75,
      extraSkipDirectoryNames: [' drafts ', 'node_modules', 'drafts', '', '.cache', 'exports'],
    })

    expect(loadIndexSettings()).toEqual({
      maxFileSizeMb: 75,
      extraSkipDirectoryNames: ['drafts', 'exports'],
    })
  })

  it('recovers invalid saved settings with defaults', () => {
    localStorage.setItem('index-settings', JSON.stringify({
      maxFileSizeMb: 9999,
      extraSkipDirectoryNames: 'drafts',
    }))

    expect(loadIndexSettings()).toEqual(DEFAULT_INDEX_SETTINGS)
  })

  it('resets saved settings', () => {
    saveIndexSettings({
      maxFileSizeMb: 75,
      extraSkipDirectoryNames: ['drafts'],
    })

    resetIndexSettings()

    expect(loadIndexSettings()).toEqual(DEFAULT_INDEX_SETTINGS)
  })

  it('builds the effective index policy from defaults and extras', () => {
    expect(getEffectiveIndexPolicy({
      maxFileSizeMb: 64,
      extraSkipDirectoryNames: ['drafts', 'exports'],
    })).toEqual({
      maxFileSizeBytes: 64 * 1024 * 1024,
      skipDirectoryNames: [
        '.git',
        '.hg',
        '.svn',
        'node_modules',
        'dist',
        'build',
        'release',
        '.next',
        '.cache',
        'drafts',
        'exports',
      ],
    })
  })
})
