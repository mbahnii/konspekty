import { useEffect, useState } from 'react'
import { create } from 'zustand'

// Данные сайта (список видео, конспекты) лежат на GitHub Pages.
// GitHub держит копию файлов в кэше до 10 минут, поэтому к каждому запросу добавляем метку времени
// (?t=…) — так всегда приходит свежая версия. Когда в очереди что-то стало «готово», вызываем
// refreshData(): список и конспекты перечитываются сами, без перезагрузки страницы.
export const useDataVersion = create(() => ({ v: 0 }))

const cache = new Map()
let stamp = Date.now()
let lastRefresh = 0

export function refreshData(minGapMs = 0) {
  if (Date.now() - lastRefresh < minGapMs) return
  lastRefresh = Date.now()
  stamp = Date.now()
  cache.clear()
  useDataVersion.setState((s) => ({ v: s.v + 1 }))
}

const load = (url) => {
  if (!cache.has(url)) {
    cache.set(url, fetch(`${url}?t=${stamp}`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json() }))
  }
  return cache.get(url)
}

function useJson(url) {
  const v = useDataVersion((s) => s.v)
  const [st, setSt] = useState({ data: null, error: null, url: null })
  useEffect(() => {
    if (!url) return
    let alive = true
    // при обновлении старые данные остаются на экране, пока не придут новые — ничего не мигает
    load(url)
      .then((data) => alive && setSt({ data, error: null, url }))
      .catch((error) => alive && setSt((s) => (s.url === url && s.data ? s : { data: null, error, url })))
    return () => { alive = false }
  }, [url, v])
  return st.url === url ? st : { data: null, error: null }
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

// Возвращаемся во вкладку/приложение — перечитываем данные (не чаще раза в минуту)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshData(60000) })
}
