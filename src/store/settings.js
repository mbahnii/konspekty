import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const storage = {
  getItem: (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch { return null } },
  setItem: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } },
  removeItem: (k) => { try { localStorage.removeItem(k) } catch { /* ignore */ } },
}

export const useSettings = create(
  persist(
    (set) => ({
      theme: 'system', lang: 'uk', sidebarCollapsed: false,
      seenGuide: false,                       // страница «Як користуватися» открывается сама один раз
      setSeenGuide: () => set({ seenGuide: true }),
      setTheme: (theme) => set({ theme }),
      setLang: (lang) => set({ lang }),
      noteLang: {},                           // язык конспекта для каждого видео отдельно (не язык интерфейса)
      setNoteLang: (id, l) => set((s) => ({ noteLang: { ...s.noteLang, [id]: l } })),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'konspekty-settings', storage },
  ),
)
