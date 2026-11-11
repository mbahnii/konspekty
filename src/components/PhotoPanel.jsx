import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import { supabase } from '../lib/supabase'
import { useAuth, setLoginOpen } from '../store/auth'
import { useQueue, useToast } from '../store/ui'
import { QueueRing } from './QueueRing'
import { ITrash } from './Icons'

// Загрузка фото конспектов (печатный текст читает macOS, рукописный — локальная модель на ноутбуке).
// Порядок: выбрать снимки → уменьшить до 2400 px → загрузить в хранилище «photos» → задача в очереди (note.photos) → worker.
const MAX_SIDE = 2400

// Уменьшаем снимок в браузере (экономит трафик; HEIC с iPhone становится обычным JPEG)
async function shrink(file) {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close?.()
  return new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('toBlob'))), 'image/jpeg', 0.86))
}

export default function PhotoPanel({ open, onDone }) {
  const t = useT()
  const say = useToast((s) => s.say)
  const add = useQueue((s) => s.add)
  const session = useAuth((s) => s.session)
  const [files, setFiles] = useState([])            // [{ file, url }]
  const [mode, setMode] = useState('print')         // print | hand
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [pct, setPct] = useState(0)
  const input = useRef(null)

  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), []) // eslint-disable-line
  useEffect(() => { if (!open) { setFiles((fs) => { fs.forEach((f) => URL.revokeObjectURL(f.url)); return [] }); setTitle(''); setBusy(false) } }, [open])

  const pick = (list) => {
    const imgs = [...list].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    setFiles((fs) => [...fs, ...imgs.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 30))
  }
  const drop = (i) => setFiles((fs) => { URL.revokeObjectURL(fs[i].url); return fs.filter((_, k) => k !== i) })

  const submit = async () => {
    if (!session) { say(t('isl.needLogin')); setLoginOpen(true); return }
    if (!files.length || busy) return
    setBusy(true); setPct(0)
    try {
      const uid = session.user.id
      const pid = 'ph-' + crypto.randomUUID().replace(/-/g, '').slice(0, 9)
      const paths = []
      for (let i = 0; i < files.length; i++) {
        const blob = await shrink(files[i].file)
        const path = `${uid}/${pid}/${i + 1}.jpg`
        const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
        if (error) throw error
        paths.push(path); setPct(((i + 1) / files.length) * 100)
      }
      const name = title.trim() || `${t('ph.default')} ${new Date().toLocaleDateString()}`
      add(`photos:${pid}`, 'add', { title: name, channel: t('ph.channel'), vid: pid, photos: paths, mode })
      say(t('isl.queued')); onDone?.()
    } catch (e) {
      console.warn('photo upload', e); say(t('ph.fail'))
    } finally { setBusy(false) }
  }

  return (
    <div className="ph">
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { pick(e.target.files); e.target.value = '' }} />
      <div className="ph-modes" role="tablist">
        <button className={`tap ${mode === 'print' ? 'on' : ''}`} onClick={() => setMode('print')}>{t('ph.print')}<small>{t('ph.printHint')}</small></button>
        <button className={`tap ${mode === 'hand' ? 'on' : ''}`} onClick={() => setMode('hand')}>{t('ph.hand')}<small>{t('ph.handHint')}</small></button>
      </div>
      <div className="ph-grid">
        {files.map((f, i) => (
          <div key={f.url} className="ph-th" style={{ backgroundImage: `url("${f.url}")` }}>
            <i>{i + 1}</i>
            <button className="tap" aria-label={t('m.delete')} onClick={() => drop(i)}><ITrash /></button>
          </div>
        ))}
        <button className="ph-add tap" onClick={() => input.current?.click()} aria-label={t('ph.pick')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
      <div className="isl-link ph-title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('ph.titlePh')} maxLength={90} />
        <button className="go tap" disabled={!files.length || busy} onClick={submit}>
          {busy ? <QueueRing k={1} mode="run" size={20} /> : t('ph.go', { n: files.length })}
        </button>
      </div>
      {busy && <div className="ph-bar"><i style={{ width: `${pct}%` }} /></div>}
    </div>
  )
}
