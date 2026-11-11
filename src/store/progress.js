import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const storage = {
  getItem: (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch { return null } },
  setItem: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } },
  removeItem: (k) => { try { localStorage.removeItem(k) } catch { /* ignore */ } },
}

// marks: { "<videoId>/<guideId>/<step>": true|false } — если ключа нет, берём done_already из конспекта
export const useProgress = create(
  persist(
    (set) => ({
      marks: {},
      setMark: (key, on) => set((s) => ({ marks: { ...s.marks, [key]: on } })),
    }),
    { name: 'konspekty-progress', storage },
  ),
)

export const stepOn = (marks, videoId, g, i) => {
  const k = `${videoId}/${g.id}/${i}`
  return marks && k in marks ? marks[k] : !!g.done_already
}
export const guideDone = (marks, videoId, g) => (g.steps?.length ?? 0) > 0 && g.steps.every((_, i) => stepOn(marks, videoId, g, i))   // инструкция без шагов выполненной не считается
