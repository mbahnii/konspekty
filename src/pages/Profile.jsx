import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { supabase } from '../lib/supabase'
import { useAuth, setLoginOpen, signOut } from '../store/auth'
import { useToast } from '../store/ui'
import { useVideos } from '../lib/videos'
import { accountInfo } from '../lib/account'
import { ICON } from '../components/ProviderBadge'
import { PageHead } from './Home'

// Профиль: как человек вошёл, имя и никнейм (можно менять), сколько у него конспектов
export default function Profile({ onBack }) {
  const t = useT()
  const say = useToast((s) => s.say)
  const session = useAuth((s) => s.session)
  const acc = accountInfo(session)
  const { counts } = useVideos()
  const uid = session?.user?.id
  const [name, setName] = useState(''), [nick, setNick] = useState(''), [nick0, setNick0] = useState(''), [busy, setBusy] = useState(false)
  useEffect(() => { setName(session?.user?.user_metadata?.display_name || acc?.name || '') }, [uid]) // eslint-disable-line
  useEffect(() => {
    if (!uid) return
    supabase.from('profiles').select('nickname').eq('id', uid).maybeSingle().then(({ data }) => { setNick(data?.nickname || ''); setNick0(data?.nickname || '') })
  }, [uid])

  const nickOk = !nick || /^[A-Za-z0-9_.-]{3,24}$/.test(nick)
  const dirty = name.trim() !== (acc?.name || '') || nick !== nick0
  const save = async () => {
    if (!nickOk) { say(t('pf.badNick')); return }
    setBusy(true)
    try {
      if (name.trim() !== (acc?.name || '')) { const { error } = await supabase.auth.updateUser({ data: { display_name: name.trim() } }); if (error) throw error }
      if (nick !== nick0) {
        const { error } = await supabase.from('profiles').update({ nickname: nick || null }).eq('id', uid)
        if (error) { say(t(/duplicate|unique/i.test(error.message) ? 'pf.taken' : 'pf.badNick')); setBusy(false); return }
        setNick0(nick)
      }
      say(t('pf.saved'))
    } catch (e) { console.warn('profile', e); say(t('au.fail')) }
    setBusy(false)
  }

  if (!acc) return (
    <div className="wrap">
      <PageHead title={t('pf.title')} sub={t('pf.sub')} onBack={onBack} />
      <div className="empty"><b>{t('pf.need')}</b><div><button className="nf-btn tap" onClick={() => setLoginOpen(true)}>{t('login.go')}</button></div></div>
    </div>
  )
  return (
    <div className="wrap">
      <PageHead title={t('pf.title')} sub={t('pf.sub')} onBack={onBack} />
      <div className="card pf-who">
        <span className="pf-ic">{acc.picture ? <img src={acc.picture} alt="" referrerPolicy="no-referrer" /> : ICON[acc.provider] || ICON.email}</span>
        <div className="pf-t"><b>{acc.name}</b><small>{t('pf.via')} {acc.label}{acc.provider !== 'telegram' && acc.sub && acc.sub !== acc.label ? ` · ${acc.sub}` : acc.provider === 'telegram' && acc.sub !== 'Telegram' ? ` · ${acc.sub}` : ''}</small></div>
        <span className="pf-prov">{ICON[acc.provider] || ICON.email}</span>
      </div>
      <div className="card pf-form">
        <label><span>{t('pf.name')}</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" /></label>
        <label><span>{t('pf.nick')}</span><input value={nick} onChange={(e) => setNick(e.target.value.replace(/\s/g, ''))} maxLength={24} autoCapitalize="off" autoCorrect="off" spellCheck="false" className={nickOk ? '' : 'bad'} /><small className={nickOk ? '' : 'bad'}>{t('pf.nickHint')}</small></label>
        {acc.provider !== 'telegram' && acc.email && <label><span>{t('pf.email')}</span><input value={acc.email} readOnly className="ro" /></label>}
        <div className="pf-act"><button className="nf-btn tap pf-save" disabled={!dirty || busy || !nickOk} onClick={save}>{t('pf.save')}</button></div>
      </div>
      <div className="card pf-stat"><span>{t('pf.mine')}</span><b>{counts.mine}</b></div>
      <button className="pf-out tap" onClick={async () => { await signOut(); onBack() }}>{t('pf.signout')}</button>
    </div>
  )
}
