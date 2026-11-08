import { useEffect, useState } from 'react'
import { useAllSummaries, useIndex } from './useData'

// Темы: если Claude написал topics.json — берём его; иначе группируем видео по полю topics
export function useTopics() {
  const { data: index } = useIndex()
  const [custom, setCustom] = useState(undefined)
  useEffect(() => { fetch('./data/topics.json').then((r) => (r.ok ? r.json() : null)).then(setCustom).catch(() => setCustom(null)) }, [])
  if (custom && index) return custom.map((tp) => ({ ...tp, videos: (tp.videos ?? []).map((id) => index.find((v) => v.id === id)).filter(Boolean) }))
  const map = new Map()
  for (const v of index ?? []) for (const tp of v.topics ?? []) {
    if (!map.has(tp)) map.set(tp, { id: tp, videos: [] })
    map.get(tp).videos.push(v)
  }
  return [...map.values()].sort((a, b) => b.videos.length - a.videos.length)
}
export const useTopicsCount = () => useTopics().length

export function useLaterAll() {
  const all = useAllSummaries(true)
  return all.flatMap(({ id, title, summary }) => summary.later.map((x) => ({ ...x, vid: id, vtitle: title })))
}
export function useLaterCount() {
  const { data } = useIndex()
  return (data ?? []).reduce((a, v) => a + (v.counts?.later ?? 0), 0)
}
