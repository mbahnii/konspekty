import { create } from 'zustand'

// Последняя открытая страница (видео/раздел) — чтобы со списка вернуться «туда, где был»
export const useNav = create((set) => ({ last: null, setLast: (last) => set({ last }) }))
