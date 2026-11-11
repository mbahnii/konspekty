import { create } from 'zustand'

// Как новое видео появляется в списке.
//   'hidden' — конспект готов, видео уже есть в данных, но строка ещё свёрнута (ждёт «шарик» из очереди)
//   'wait'   — место в списке раздвигается, содержимое пока прозрачное
//   'go'     — шарик долетел: обложка и текст красиво появляются
// Нет записи — обычная строка.
export const useArrive = create((set) => ({
  st: {},
  setArrive: (vid, v) => set((s) => {
    const st = { ...s.st }
    if (v) st[vid] = v; else delete st[vid]
    return { st }
  }),
}))

export const setArrive = (vid, v) => useArrive.getState().setArrive(vid, v)
export const useArriveOf = (vid) => useArrive((s) => s.st[vid])
