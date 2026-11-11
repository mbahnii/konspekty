import { useQueue } from '../store/ui'
import { setArrive } from '../store/arrive'
import { knownIds } from './videos'

// Только для локальной копии сайта: адрес с ?demo=queue прогоняет по очереди все этапы,
// чтобы посмотреть анимацию кольца и «полёт в список» без настоящего worker.
export function runQueueDemo() {
  if (!import.meta.env.DEV || !/[?&]demo=queue/.test(location.search)) return
  const vid = [...knownIds][0] || 'MbPJWa6_FNM'
  const id = 'demo-' + Date.now()
  const base = { id, url: `https://youtu.be/${vid}`, kind: 'add', at: Date.now(), title: 'Демо: проходження всіх етапів', vid, demo: true }
  const put = (patch) => useQueue.setState((s) => ({ items: [...s.items.filter((x) => x.id !== id), { ...base, ...patch, upd: Date.now() }] }))
  const steps = [
    [0, { status: 'queued' }],
    [2600, { status: 'processing', stage: 'download' }],
    [5600, { status: 'processing', stage: 'summary' }],
    [9600, { status: 'processing', stage: 'published' }],
    [11800, { status: 'done' }],
  ]
  for (const [ms, patch] of steps) setTimeout(() => {
    if (patch.status === 'done') setArrive(vid, 'hidden')       // как будто видео новое: строка свёрнута, ждёт шарик
    put(patch)
  }, ms)
}
