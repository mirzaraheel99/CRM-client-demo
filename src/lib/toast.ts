import { create } from "zustand";

export type ToastTone = "success" | "info" | "error";

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastStore {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
}

const DURATION_MS = 3200;
let counter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string, tone: ToastTone = "success") {
  const id = `toast-${Date.now()}-${counter++}`;
  useToastStore.setState((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
  setTimeout(() => useToastStore.getState().dismiss(id), DURATION_MS);
}
