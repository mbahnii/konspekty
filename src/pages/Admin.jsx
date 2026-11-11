import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useT } from '../i18n'
import { supabase } from '../lib/supabase'
import { useAuth } from '../store/auth'
import { useIndex } from '../data/useData'
import { useLibrary } from '../store/library'
import { useQueue, useToast } from '../store/ui'
import { isAdmin } from '../lib/admin'
import { ITrash } from '../components/Icons'
import { PageHead } from './Home'

// Страница администратора: все конспекты, чьи они и кто видит; удалить любой (с подтверждением), сменить видимость своих
export default function Admin({ onBack }) {
  const t = useT()
  const say = useToast((s) => s.say)
  const session = useAuth((s) => s.session)
  const { data } = useIndex()
  const add = useQueue((s) => s.add)
  const [sure, setSure] = useState(null)
  if (!isAdmin(session)) return <Navigate to="/" replace />
  const uid = session.user.id
  const list = data ?? []
  const pub = list.filter((v) => (v.visibility ?? 'public') === 'public').length
  const del = (v) => {
    if (sure !== v.id) { setSure(v.id); setTimeout(() => setSure((s) => (s === v.id ? null : s)), 3000); return }
    useLibrary.getState().setFlag('hidden', v.id, true)
    add(v.url || `photos:${v.id}`, 'delete', { title: v.title, vid: v.id })
    setSure(null); say(t('toast.deleted'))
  }
  const toggle = async (v) => {
    const vis = (v.visibility ?? 'public') === 'public' ? 'private' : 'public'
    const { error } = await supabase.rpc('set_note_visibility', { note_id: v.id, vis })
    say(error ? t('au.fail') : t('pf.saved'))
  }
  return (
    <div className="wrap">
      <PageHead title={t('ad.title')} sub={t('ad.sub')} onBack={onBack} />
      <div className="meta"><span className="chip">{t('ad.total')}: {list.length}</span><span className="chip">{t('ad.public')}: {pub}</span><span className="chip">{t('ad.private')}: {list.length - pub}</span></div>
      <section className="card ad-list">
        {!list.length && <p className="ad-empty">{t('empty')}</p>}
        {list.map((v) => (
          <div key={v.id} className="ad-row">
            <div className="ad-t"><b>{v.title}</b><small>{(v.visibility ?? 'public') === 'public' ? t('cat.public') : t('cat.mine')} · {v.owner ? (v.owner === uid ? t('ad.you') : v.owner.slice(0, 8)) : t('ad.noOwner')} · {String(v.id).startsWith('ph-') ? t('ph.channel') : 'YouTube'}</small></div>
            {v.owner === uid && <button className="ad-b tap" onClick={() => toggle(v)}>{(v.visibility ?? 'public') === 'public' ? t('ad.makePrivate') : t('ad.makePublic')}</button>}
            <button className={`ad-b del tap ${sure === v.id ? 'sure' : ''}`} onClick={() => del(v)} aria-label={t('m.delete')}><ITrash />{sure === v.id && <span>{t('ad.sure')}</span>}</button>
          </div>
        ))}
      </section>
    </div>
  )
}
