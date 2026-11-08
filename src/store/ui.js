import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const storage = {
  getItem: (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch { return null } },
  setItem: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } },
  removeItem: (k) => { try { localStorage.removeItem(k) } catch { /* ignore */ } },
}

// Всплывающее сообщение
let timer
export const useToast = create((set) => ({
  text: '', show: false,
  say: (text) => { set({ text, show: true }); clearTimeout(timer); timer = setTimeout(() => set({ show: false }), 1700) },
}))

// Очередь ссылок + индикатор синхронизации (позже — Supabase)
// Состояние пилюли (открыта / шире / квадратные углы) — запоминается
export const useIslandPrefs = create(persist((set) => ({ wide: false, square: false, toggle: (k) => set((s) => ({ [k]: !s[k] })) }), { name: 'konspekty-island', storage }))

export const useQueue = create(
  persist(
    (set, get) => ({
      items: [],              // { url, kind: add | reprocess | delete, status: queued | processing | done, at }
      sync: 'ok',             // ok | busy | off
      add: (url, kind = 'add') => { set({ items: [...get().items, { url, kind, status: 'queued', at: Date.now() }] }); get().flash() },
      remove: (i) => { set({ items: get().items.filter((_, j) => j !== i) }); get().flash() },
      flash: () => { set({ sync: 'busy' }); setTimeout(() => set({ sync: navigator.onLine ? 'ok' : 'off' }), 1600) },
      setSync: (sync) => set({ sync }),
    }),
    { name: 'konspekty-queue', storage, partialize: (s) => ({ items: s.items }) },
  ),
)
