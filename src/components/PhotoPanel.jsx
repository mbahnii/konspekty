import { useCallback, useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import { supabase } from '../lib/supabase'
import { useAuth, setLoginOpen } from '../store/auth'
import { useQueue, useToast } from '../store/ui'
import { QueueRing } from './QueueRing'
import { ITrash, IChevUp, IChevDown, IRedo, IPlus } from './Icons'
import PhotoViewer from './PhotoViewer'
import { shareDefault } from '../lib/share'

// Загрузка фото конспектов — одна из главных функций сайта.
// Как добавить фото:  перетащить файлы в окно браузера (откроется сама),  выбрать кнопкой,  вставить из буфера (⌘V / Ctrl+V),
//                     сфотографировать (на телефоне).  Страницы можно переставить и повернуть.
// Печатный текст читает macOS, рукописный — локальная модель на ноутбуке (worker/photos.py).
const MAX_SIDE = 2400, MAX_FILES = 40
const IMG = /\.(jpe?g|png|webp|gif|bmp|heic|heif|tiff?)$/i
const isImg = (f) => f.type?.startsWith('image/') || IMG.test(f.name || '')
const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files')
const natural = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })

// Уменьшаем снимок и при необходимости поворачиваем (HEIC с iPhone становится обычным JPEG)
async function shrink(file, turn = 0) {
  const bmp = await createImageBitmap(file)                 // учитывает поворот из EXIF
  const swap = turn % 2 === 1
  const w0 = swap ? bmp.height : bmp.width, h0 = swap ? bmp.width : bmp.height
  const k = Math.min(1, MAX_SIDE / Math.max(w0, h0))
  const c = document.createElement('canvas')
  c.width = Math.round(w0 * k); c.height = Math.round(h0 * k)
  const g = c.getContext('2d')
  g.translate(c.width / 2, c.height / 2); g.rotate((turn * Math.PI) / 2)
  const dw = (swap ? c.height : c.width), dh = (swap ? c.width : c.height)
  g.drawImage(bmp, -dw / 2, -dh / 2, dw, dh)
  bmp.close?.()
  return new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('toBlob'))), 'image/jpeg', 0.86))
}

export default function PhotoPanel({ open, onDone, onWantOpen }) {
  const t = useT()
  const say = useToast((s) => s.say)
  const add = useQueue((s) => s.add)
  const session = useAuth((s) => s.session)
  const [files, setFiles] = useState([])            // [{ id, file, url, turn }]
  const [mode, setMode] = useState('print')         // print | hand
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [pct, setPct] = useState(0)
  const [over, setOver] = useState(false)           // файлы сейчас над окном
  const [look, setLook] = useState(null)            // какое фото открыто для просмотра
  const input = useRef(null), cam = useRef(null), depth = useRef(0), live = useRef(files), titleRow = useRef(null)
  live.current = files
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches

  const pick = useCallback((list) => {
    const all = [...list]
    const imgs = all.filter(isImg).sort(natural)
    if (all.length && !imgs.length) { say(t('ph.notImg')); return }
    if (imgs.length < all.length) say(t('ph.skipped', { n: all.length - imgs.length }))
    setFiles((fs) => {
      const room = Math.max(0, MAX_FILES - fs.length)
      if (imgs.length > room) say(t('ph.max', { n: MAX_FILES }))
      return [...fs, ...imgs.slice(0, room).map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file), turn: 0 }))]
    })
  }, [say, t])

  // перетаскивание файлов в любое место окна (панель откроется сама), вставка из буфера
  useEffect(() => {
    const enter = (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth.current++; setOver(true); onWantOpen?.() }
    const overH = (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }
    const leave = (e) => { if (!hasFiles(e)) return; depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false) }
    const drop = (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth.current = 0; setOver(false); pick(e.dataTransfer.files); onWantOpen?.() }
    const paste = (e) => {
      const fl = [...(e.clipboardData?.files ?? [])].filter(isImg)
      if (!fl.length || /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName) && !e.clipboardData.types.includes('Files')) return
      e.preventDefault(); pick(fl); onWantOpen?.()
    }
    const end = () => { depth.current = 0; setOver(false) }
    addEventListener('dragenter', enter); addEventListener('dragover', overH); addEventListener('dragleave', leave)
    addEventListener('drop', drop); addEventListener('paste', paste); addEventListener('dragend', end)
    return () => {
      removeEventListener('dragenter', enter); removeEventListener('dragover', overH); removeEventListener('dragleave', leave)
      removeEventListener('drop', drop); removeEventListener('paste', paste); removeEventListener('dragend', end)
    }
  }, [pick, onWantOpen])

  useEffect(() => () => live.current.forEach((f) => URL.revokeObjectURL(f.url)), [])
  useEffect(() => { if (!open) { setFiles((fs) => { fs.forEach((f) => URL.revokeObjectURL(f.url)); return [] }); setTitle(''); setBusy(false); setLook(null) } }, [open])

  // добавили фото — прокручиваем так, чтобы кнопка «Надіслати» была видна (на телефоне она иначе уходит под край)
  useEffect(() => { if (files.length) { const id = setTimeout(() => titleRow.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 120); return () => clearTimeout(id) } }, [files.length])

  const drop1 = (id) => setFiles((fs) => { const f = fs.find((x) => x.id === id); f && URL.revokeObjectURL(f.url); return fs.filter((x) => x.id !== id) })
  const move = (i, d) => setFiles((fs) => { const j = i + d; if (j < 0 || j >= fs.length) return fs; const n = [...fs]; [n[i], n[j]] = [n[j], n[i]]; return n })
  const turn = (id) => setFiles((fs) => fs.map((f) => (f.id === id ? { ...f, turn: (f.turn + 1) % 4 } : f)))

  const submit = async () => {
    if (!session || session.user?.is_anonymous) { say(t('ph.needLogin')); setLoginOpen(true); return }   // фото — только после входа (гостям нельзя)
    if (!files.length || busy) return
    setBusy(true); setPct(0)
    try {
      const uid = session.user.id
      const pid = 'ph-' + crypto.randomUUID().replace(/-/g, '').slice(0, 9)
      const paths = []
      for (let i = 0; i < files.length; i++) {
        let blob
        try { blob = await shrink(files[i].file, files[i].turn) } catch { throw new Error(`${t('ph.cantRead')}: ${files[i].file.name}`) }
        const path = `${uid}/${pid}/${i + 1}.jpg`
        let err
        for (let a = 0; a < 3; a++) {                         // сеть моргнула — пробуем ещё
          ({ error: err } = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true }))
          if (!err) break
          await new Promise((r) => setTimeout(r, 700 * (a + 1)))
        }
        if (err) throw err
        paths.push(path); setPct(((i + 1) / files.length) * 100)
      }
      const share = shareDefault()
      const name = title.trim() || `${t('ph.default')} ${new Date().toLocaleDateString()}`
      add(`photos:${pid}`, 'add', { title: name, channel: t('ph.channel'), vid: pid, photos: paths, mode, share })
      say(t(share ? 'isl.queuedPub' : 'isl.queuedMine')); onDone?.()
    } catch (e) {
      console.warn('photo upload', e); say(String(e?.message || '').startsWith(t('ph.cantRead')) ? e.message : t('ph.fail'))
    } finally { setBusy(false) }
  }

  const ZoneIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4m0 0L8 8m4-4 4 4" /><path d="M5 14v3a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-3" /></svg>
  const GalIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" /></svg>
  const CamIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.3-1.8h6L16.3 6h1.2A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" /><circle cx="12" cy="12.6" r="3.2" /></svg>
  const n = files.length
  return (
    <div className={`ph ${over ? 'over' : ''}`}>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { pick(e.target.files); e.target.value = '' }} />
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { pick(e.target.files); e.target.value = '' }} />

      <div className="ph-modes" role="tablist">
        <button className={mode === 'print' ? 'on' : ''} onClick={() => setMode('print')}>{t('ph.print')}</button>
        <button className={mode === 'hand' ? 'on' : ''} onClick={() => setMode('hand')}>{t('ph.hand')}</button>
      </div>

      {!n ? (touch ? (
        <div className="ph-two">
          <button type="button" className="ph-tile tap" onClick={() => input.current?.click()}><span>{GalIcon}</span><b>{t('ph.gallery')}</b></button>
          <button type="button" className="ph-tile tap" onClick={() => cam.current?.click()}><span>{CamIcon}</span><b>{t('ph.camera')}</b></button>
        </div>
      ) : (
        <button type="button" className="ph-zone tap" onClick={() => input.current?.click()}>
          <span className="ph-zi">{ZoneIcon}</span>
          <b>{t('ph.zone')}</b>
          <small>{t('ph.zoneSub')}</small>
        </button>
      )) : (
        <div className="ph-list">
          <ol>
            {files.map((f, i) => (
              <li key={f.id} className="ph-row">
                <button className="ph-pic tap" onClick={() => setLook(i)} aria-label={t('ph.openPage')}>
                  <span className="ph-img" style={{ backgroundImage: `url("${f.url}")`, transform: `rotate(${f.turn * 90}deg)` }} />
                </button>
                <button className="ph-lab tap" onClick={() => setLook(i)}><b>{t('ph.page')} {i + 1}</b><small>{f.file.name}</small></button>
                <div className="ph-ctl">
                  <button className="tap" aria-label={t('ph.up')} title={t('ph.up')} disabled={i === 0} onClick={() => move(i, -1)}><IChevUp /></button>
                  <button className="tap" aria-label={t('ph.down')} title={t('ph.down')} disabled={i === n - 1} onClick={() => move(i, 1)}><IChevDown /></button>
                  <button className="tap" aria-label={t('ph.rotate')} title={t('ph.rotate')} onClick={() => turn(f.id)}><IRedo /></button>
                  <button className="tap del" aria-label={t('m.delete')} title={t('m.delete')} onClick={() => drop1(f.id)}><ITrash /></button>
                </div>
              </li>
            ))}
          </ol>
          <button className="ph-more tap" onClick={() => input.current?.click()}><IPlus />{t('ph.addMore')}</button>
        </div>
      )}

      <input className="ph-name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('ph.titlePh')} maxLength={90} ref={titleRow} />
      <button className="ph-send tap" disabled={!n || busy} onClick={submit}>
        {busy ? <><QueueRing k={1} mode="run" size={20} /><span>{Math.round(pct)}%</span></> : n ? t('ph.send', { n }) : t('ph.addFirst')}
      </button>
      {busy && <div className="ph-bar"><i style={{ width: `${pct}%` }} /></div>}

      <PhotoViewer items={files.map((f, i) => ({ src: f.url, label: `${t('ph.page')} ${i + 1}`, turn: f.turn }))} index={look != null && look < n ? look : null} onClose={() => setLook(null)} onIndex={setLook} />

      <div className="ph-drop" aria-hidden={!over}><div><span className="ph-zi big">{ZoneIcon}</span><b>{t('ph.release')}</b></div></div>
    </div>
  )
}
