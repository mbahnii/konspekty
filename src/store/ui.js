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
      items: [],              // { id, url, kind: add | reprocess | delete, status: queued | processing | done | error, at, pending }
      removed: [],            // id, которые надо удалить в облаке
      sync: 'ok',             // ok | busy | off
      add: (url, kind = 'add') => set({ items: [...get().items, { id: crypto.randomUUID(), url, kind, status: 'queued', at: Date.now(), pending: true }] }),
      remove: (id) => set({ items: get().items.filter((x) => x.id !== id), removed: [...get().removed, id] }),
      setSync: (sync) => set({ sync }),
    }),
    { name: 'konspekty-queue', version: 2, migrate: () => ({ items: [], removed: [] }), storage, partialize: (s) => ({ items: s.items, removed: s.removed }) },
  ),
)
