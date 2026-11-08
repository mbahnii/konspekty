import { useIndex } from '../data/useData'
import { useLibrary } from '../store/library'
import { useProgress } from '../store/progress'

const TINTS = ['#0a84ff', '#ff9f0a', '#30b0c7', '#5e5ce6', '#ff375f', '#34c759', '#bf5af2']
export const tint = (id) => TINTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length]

// Сколько инструкций видео выполнено (по сводке из index.json)
export const doneOf = (marks, v) => (v.guides ?? []).filter((g) =>
  Array.from({ length: g.n }, (_, i) => marks[`${v.id}/${g.id}/${i}`] ?? g.done).every(Boolean)).length

// Список видео: закреплённые сверху, скрытые убраны
export function useVideos() {
  const { data } = useIndex()
  const { pinned, hidden, learned } = useLibrary()
  const marks = useProgress((p) => p.marks)
  const list = (data ?? []).filter((v) => !hidden[v.id]).map((v) => ({
    ...v, pinned: !!pinned[v.id], learned: !!learned[v.id],
    done: doneOf(marks, v), total: (v.guides ?? []).length,
  }))
  list.sort((a, b) => (b.pinned - a.pinned) || (b.ready - a.ready))
  return { videos: list, loaded: !!data }
}
