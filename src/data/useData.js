import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useLibrary } from '../store/library'

// Данные сайта (список видео, конспекты) берутся из базы Supabase — новые видео видны сразу.
// Если база недоступна — запасная копия на GitHub Pages (папка data/).
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

const STATIC = (url) => fetch(`${url}?t=${stamp}`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json() })
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))])

import { FROM_DB } from '../lib/files.js'
export { fileUrl } from '../lib/files.js'

async function fromDb(url) {
  if (url === './data/index.json') {
    const { data, error } = await supabase.from('notes').select('item').order('updated_at', { ascending: false })
    if (error || !data?.length) throw error || new Error('empty')
    FROM_DB.clear()
    data.forEach((r) => FROM_DB.add(r.item.id))
    return data.map((r) => r.item)
  }
  if (url === './data/topics.json') {
    const { data, error } = await supabase.from('site').select('value').eq('key', 'topics').maybeSingle()
    if (error || !data) throw error || new Error('empty')
    return data.value
  }
  await load('./data/index.json').catch(() => {})   // чтобы знать, какие видео из базы
  const m = url.match(/^\.\/data\/v\/([\w-]+)\/(summary|meta)\.json$/)
  if (m && FROM_DB.has(m[1])) {
    const { data, error } = await supabase.from('notes').select(m[2]).eq('id', m[1]).maybeSingle()
    if (error || !data) throw error || new Error('not found')
    return data[m[2]]
  }
  throw new Error('static')
}

// Сначала база (до 6 секунд), при любой ошибке — GitHub
export const load = (url) => {
  if (!cache.has(url)) cache.set(url, withTimeout(fromDb(url), 6000).catch(() => STATIC(url)))
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

// Список видео (без тех, что удалены через меню ⋯)
export const useIndex = () => {
  const st = useJson('./data/index.json')
  const hidden = useLibrary((s) => s.hidden)
  return st.data ? { ...st, data: st.data.filter((v) => !hidden[v.id]) } : st
}
export const useTopicsJson = () => useJson('./data/topics.json')

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
