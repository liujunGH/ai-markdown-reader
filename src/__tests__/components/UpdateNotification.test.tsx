import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { UpdateStatePayload } from '../../../shared'
import type { ElectronAPI } from '../../types/electron'
import { UpdateNotification } from '../../components/UpdateNotification'

const listeners = new Set<(state: UpdateStatePayload) => void>()
const api = {
  getUpdateState: vi.fn<() => Promise<UpdateStatePayload>>(),
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  installUpdate: vi.fn(),
  onUpdateStateChange: vi.fn((callback: (state: UpdateStatePayload) => void) => listeners.add(callback)),
  offUpdateStateChange: vi.fn((callback: (state: UpdateStatePayload) => void) => listeners.delete(callback)),
} as unknown as ElectronAPI

beforeAll(() => {
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: api })
})

beforeEach(() => {
  listeners.clear()
  vi.clearAllMocks()
})

afterEach(cleanup)

describe('UpdateNotification', () => {
  it('shows release notes and starts an explicit download', async () => {
    api.getUpdateState = vi.fn().mockResolvedValue({
      status: 'available', currentVersion: '2.0.1', version: '2.1.0',
      releaseNotes: '长文档渲染更快', manual: false,
    })
    api.downloadUpdate = vi.fn().mockResolvedValue({
      status: 'downloading', currentVersion: '2.0.1', version: '2.1.0', manual: true,
    })
    render(<UpdateNotification />)

    expect(await screen.findByText('发现新版本 2.1.0')).toBeInTheDocument()
    expect(screen.getByText('长文档渲染更快')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '下载更新' }))
    await waitFor(() => expect(api.downloadUpdate).toHaveBeenCalledTimes(1))
  })

  it('calls the install IPC instead of merely dismissing a downloaded update', async () => {
    api.getUpdateState = vi.fn().mockResolvedValue({
      status: 'downloaded', currentVersion: '2.0.1', version: '2.1.0', percent: 100, manual: true,
    })
    api.installUpdate = vi.fn().mockResolvedValue(true)
    render(<UpdateNotification />)

    fireEvent.click(await screen.findByRole('button', { name: '重启并安装' }))
    await waitFor(() => expect(api.installUpdate).toHaveBeenCalledTimes(1))
  })

  it('does not interrupt reading for silent development or no-update states', async () => {
    api.getUpdateState = vi.fn().mockResolvedValue({
      status: 'unsupported', currentVersion: '2.0.1', manual: false,
    })
    render(<UpdateNotification />)
    await waitFor(() => expect(api.getUpdateState).toHaveBeenCalled())
    expect(screen.queryByTestId('update-notification')).not.toBeInTheDocument()
  })
})
