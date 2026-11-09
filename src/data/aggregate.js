import { useEffect, useState } from 'react'
import { useAllSummaries, useIndex } from './useData'

// Темы: если есть topics.json — берём его; иначе группируем видео по полю topics
export function useTopics() {
  const { data: index } = useIndex()
  const [custom, setCustom] = useState(undefined)
  useEffect(() => { fetch('./data/topics.json').then((r) => (r.ok ? r.json() : null)).then(setCustom).catch(() => setCustom(null)) }, [])
  if (custom && index) {
    // темы из topics.json + новые видео с этими темами + темы, которых ещё нет в topics.json
    const out = custom.map((tp) => {
      const ids = new Set(tp.videos ?? [])
      for (const v of index) if ((v.topics ?? []).includes(tp.id)) ids.add(v.id)
      return { ...tp, videos: [...ids].map((id) => index.find((v) => v.id === id)).filter(Boolean) }
    })
    const known = new Set(custom.map((tp) => tp.id))
    for (const v of index) for (const tp of v.topics ?? []) {
      if (known.has(tp)) continue
      let e = out.find((x) => x.id === tp)
      if (!e) { e = { id: tp, videos: [] }; out.push(e) }
      e.videos.push(v)
    }
    return out
  }
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
