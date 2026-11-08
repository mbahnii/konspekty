import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const storage = {
  getItem: (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch { return null } },
  setItem: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } },
  removeItem: (k) => { try { localStorage.removeItem(k) } catch { /* ignore */ } },
}

// Отметки по видео: изучено, закреплено, скрыто (удалено). Позже синхронизируется с облаком.
export const useLibrary = create(
  persist(
    (set) => ({
      learned: {}, pinned: {}, hidden: {},
      toggle: (field, id) => set((s) => ({ [field]: { ...s[field], [id]: !s[field][id] } })),
      setFlag: (field, id, v) => set((s) => ({ [field]: { ...s[field], [id]: v } })),
    }),
    { name: 'konspekty-library', storage },
  ),
)
