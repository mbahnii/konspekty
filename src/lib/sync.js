import { supabase } from './supabase'
import { useAuth } from '../store/auth'
import { useProgress } from '../store/progress'
import { useLibrary } from '../store/library'
import { useQueue } from '../store/ui'

// Синхронизация с облаком (Supabase). Работает только если вы вошли; без входа всё хранится на устройстве.
// Правило для отметок: если на этом устройстве есть неотправленные изменения — побеждают они,
// иначе берём то, что в облаке.
const SPECS = {
  progress: { store: useProgress, get: (s) => ({ marks: s.marks }), set: (v) => ({ marks: v.marks ?? {} }) },
  library: { store: useLibrary, get: (s) => ({ learned: s.learned, pinned: s.pinned, hidden: s.hidden }), set: (v) => ({ learned: v.learned ?? {}, pinned: v.pinned ?? {}, hidden: v.hidden ?? {} }) },
}
const META = 'konspekty-sync-meta'
const loadMeta = () => { try { return JSON.parse(localStorage.getItem(META)) ?? {} } catch { return {} } }
const meta = loadMeta()
const saveMeta = () => { try { localStorage.setItem(META, JSON.stringify(meta)) } catch { /* ignore */ } }

let applying = false, running = false, again = false, timer = 0

const user = () => useAuth.getState().session?.user
const setSync = (s) => useQueue.getState().setSync(s)

async function syncKv() {
  const { data: rows, error } = await supabase.from('kv').select('key,value,updated_at')
  if (error) throw error
  for (const [key, spec] of Object.entries(SPECS)) {
    const row = rows.find((r) => r.key === key), m = (meta[key] ??= {})
    const local = spec.get(spec.store.getState())
    const hasData = Object.values(local).some((o) => Object.keys(o).length)
    if (m.dirty || (!row && hasData)) {
      const { data, error: e } = await supabase.from('kv').upsert({ key, value: spec.get(spec.store.getState()), updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' }).select('updated_at').single()
      if (e) throw e
      m.dirty = false; m.at = data.updated_at
    } else if (row.updated_at !== m.at) {
      applying = true; spec.store.setState(spec.set(row.value)); applying = false
      m.at = row.updated_at
    }
  }
  saveMeta()
}

async function syncQueue() {
  const q = useQueue.getState()
  if (q.removed.length) {
    const { error } = await supabase.from('queue').delete().in('id', q.removed)
    if (error) throw error
  }
  const pending = q.items.filter((x) => x.pending)
  if (pending.length) {
    const { error } = await supabase.from('queue').upsert(pending.map((x) => ({ id: x.id, url: x.url, kind: x.kind })), { onConflict: 'id' })
    if (error) throw error
  }
  const { data, error } = await supabase.from('queue').select('id,url,kind,status,created_at').order('created_at')
  if (error) throw error
  const cur = useQueue.getState()
  const mine = cur.items.filter((x) => x.pending && !pending.some((p) => p.id === x.id))   // добавлено, пока шёл запрос
  useQueue.setState({
    removed: cur.removed.filter((id) => !q.removed.includes(id)),
    items: [...data.map((r) => ({ id: r.id, url: r.url, kind: r.kind, status: r.status, at: Date.parse(r.created_at) })), ...mine],
  })
}

export async function syncNow() {
  if (!user() || !navigator.onLine) { if (!navigator.onLine) setSync('off'); return }
  if (running) { again = true; return }
  running = true; setSync('busy')
  try { await syncKv(); await syncQueue(); setSync('ok') }
  catch (e) { console.warn('sync', e); setSync('off') }
  finally { running = false; if (again) { again = false; schedule(300) } }
}
const schedule = (ms = 900) => { clearTimeout(timer); timer = setTimeout(syncNow, ms) }

export function initSync() {
  for (const [key, spec] of Object.entries(SPECS)) {
    spec.store.subscribe(() => { if (applying) return; (meta[key] ??= {}).dirty = true; saveMeta(); schedule() })
  }
  useQueue.subscribe((s, prev) => { if (s.items !== prev.items || s.removed !== prev.removed) { if (s.items.some((x) => x.pending) || s.removed.length) schedule() } })
  useAuth.subscribe((s, prev) => { if (s.session?.user?.id !== prev.session?.user?.id) { if (s.session) schedule(100); else setSync('ok') } })
  addEventListener('online', () => schedule(100))
  addEventListener('focus', () => schedule(200))
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(200) })
  setInterval(() => { if (!document.hidden) syncNow() }, 30000)
  if (user()) schedule(300)
}
