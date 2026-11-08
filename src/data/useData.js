import { useEffect, useState } from 'react'

const cache = new Map()
const load = (url) => {
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.json() }))
  return cache.get(url)
}

function useJson(url) {
  const [st, setSt] = useState({ data: null, error: null })
  useEffect(() => {
    let alive = true
    setSt({ data: null, error: null })
    if (url) load(url).then((data) => alive && setSt({ data, error: null })).catch((error) => alive && setSt({ data: null, error }))
    return () => { alive = false }
  }, [url])
  return st
}

export const useIndex = () => useJson('./data/index.json')

export function useVideo(id) {
  const s = useJson(`./data/v/${id}/summary.json`)
  const m = useJson(`./data/v/${id}/meta.json`)
  return { summary: s.data, meta: m.data, error: s.error || m.error }
}

// Все конспекты — для поиска (грузим только когда нужно)
export function useAllSummaries(enabled) {
  const { data: index } = useIndex()
  const [all, setAll] = useState([])
  useEffect(() => {
    if (!enabled || !index) return
    let alive = true
    Promise.all(index.filter((v) => v.ready).map((v) => load(`./data/v/${v.id}/summary.json`).then((summary) => ({ id: v.id, title: v.title, summary }))))
      .then((r) => alive && setAll(r)).catch(() => {})
    return () => { alive = false }
  }, [enabled, index])
  return all
}
