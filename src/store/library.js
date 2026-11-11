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
      tags: {},                         // метки видео: { id: { c: 'red', e: '📘' } } — цветной кружок и значок в списке
      toggle: (field, id) => set((s) => ({ [field]: { ...s[field], [id]: !s[field][id] } })),
      setTag: (id, patch) => set((s) => {
        const cur = { ...(s.tags[id] ?? {}), ...patch }
        const tags = { ...s.tags }
        if (!cur.c && !cur.e) delete tags[id]; else tags[id] = cur
        return { tags }
      }),
      setFlag: (field, id, v) => set((s) => ({ [field]: { ...s[field], [id]: v } })),
    }),
    { name: 'konspekty-library', storage },
  ),
)
