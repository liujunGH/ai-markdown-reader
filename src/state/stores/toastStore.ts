/**
 * Toast 通知 store（v2）
 *
 * 与旧版行为一致：showToast 默认 error 类型，3 秒自动消失。
 */
import { create } from 'zustand'
import { produce } from 'immer'

export interface Toast {
  id: string
  message: string
  type: 'error' | 'success'
}

interface ToastState {
  toasts: Toast[]
}

interface ToastActions {
  showToast: (message: string, type?: 'error' | 'success') => void
  dismissToast: (id: string) => void
}

export type ToastStore = ToastState & ToastActions

function generateToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const useToastStore = create<ToastStore>()((set, get) => ({
  toasts: [],

  showToast: (message, type = 'error') => {
    const id = generateToastId()
    set(
      produce((state: ToastState) => {
        state.toasts.push({ id, message, type })
      })
    )
    // 3 秒后自动消失
    setTimeout(() => {
      get().dismissToast(id)
    }, 3000)
  },

  dismissToast: (id) =>
    set(
      produce((state: ToastState) => {
        state.toasts = state.toasts.filter((t) => t.id !== id)
      })
    ),
}))
