import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (type: ToastType, title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (type, title, description) => {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    set({ toasts: [...get().toasts, { id, type, title, description }] });
    // Auto-dismiss after 4s
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, 4000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

// Convenience helper for use outside React components / inside other stores
export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push('success', title, description),
  error: (title: string, description?: string) =>
    useToastStore.getState().push('error', title, description),
  info: (title: string, description?: string) =>
    useToastStore.getState().push('info', title, description),
  warning: (title: string, description?: string) =>
    useToastStore.getState().push('warning', title, description),
};
