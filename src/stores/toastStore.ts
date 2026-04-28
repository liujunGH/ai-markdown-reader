import { create } from 'zustand'

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

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  showToast: (message, type = 'error') => {
    const id = Date.now().toString()
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }))
    }, 3000)
  },

  dismissToast: (id) => {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }))
  },
}))
