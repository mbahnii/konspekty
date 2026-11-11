import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { supabase } from '../lib/supabase'
import { useAuth, setLoginOpen, signOut } from '../store/auth'
import { useToast } from '../store/ui'
import { useVideos } from '../lib/videos'
import { accountInfo } from '../lib/account'
import { ICON } from '../components/ProviderBadge'
import { IChevDown } from '../components/Icons'
import { PageHead } from './Home'

// Профиль: шапка с аватаром, сгруппированные строки «подпись — значение» (как «Настройки» в iOS), «Зберегти» появляется плавно
const Row = ({ label, children, hint, bad }) => (
  <label className={`pf-row ${bad ? 'bad' : ''}`}><span className="pf-l">{label}</span><span className="pf-v">{children}</span>{hint && <small>{hint}</small>}</label>
)

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
        const { data: upd, error } = await supabase.from('profiles').update({ nickname: nick || null }).eq('id', uid).select('id')
        if (!error && !upd?.length) { say(t('au.fail')); setBusy(false); return }       // строки профиля нет — не говорим «Збережено»
        if (error) { say(t(/duplicate|unique/i.test(error.message) ? 'pf.taken' : 'pf.badNick')); setBusy(false); return }
        setNick0(nick)
      }
      say(t('pf.saved'))
    } catch (e) { console.warn('profile', e); say(t('au.fail')) }
    setBusy(false)
  }

  if (!acc) return (
    <div className="wrap pf">
      <PageHead title={t('pf.title')} sub={t('pf.sub')} onBack={onBack} />
      <div className="empty"><b>{t('pf.need')}</b><div><button className="nf-btn tap" onClick={() => setLoginOpen(true)}>{t('login.go')}</button></div></div>
    </div>
  )
  const initial = (acc.name || '?').trim().charAt(0).toUpperCase()
  return (
    <div className="wrap pf">
      <PageHead title={t('pf.title')} sub={t('pf.sub')} onBack={onBack} />

      <section className="card pf-hero">
        <span className="pf-ava">{acc.picture ? <img src={acc.picture} alt="" referrerPolicy="no-referrer" /> : <b>{initial}</b>}<i className="pf-badge">{ICON[acc.provider] || ICON.email}</i></span>
        <h2>{acc.name}</h2>
        <p>{t('pf.via')} {acc.label}{acc.sub && acc.sub !== acc.label ? ` · ${acc.sub}` : ''}</p>
        <div className="pf-chips"><span className="chip">{t('pf.mine')}: {counts.mine}</span></div>
      </section>

      <section className="card pf-group">
        <h3>{t('pf.profile')}</h3>
        <Row label={t('pf.name')}><input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" /></Row>
        <Row label={t('pf.nick')} bad={!nickOk} hint={t('pf.nickHint')}><input value={nick} onChange={(e) => setNick(e.target.value.replace(/\s/g, ''))} maxLength={24} placeholder="nickname" autoCapitalize="off" autoCorrect="off" spellCheck="false" /></Row>
        {acc.provider !== 'telegram' && acc.email && <Row label={t('pf.email')}><input value={acc.email} readOnly className="ro" /></Row>}
        <div className={`pf-save ${dirty ? 'on' : ''}`}><div><button className="nf-btn tap" disabled={busy || !nickOk} onClick={save}>{t('pf.save')}</button></div></div>
      </section>

      <section className="card pf-group">
        <h3>{t('pf.account')}</h3>
        <div className="pf-row"><span className="pf-l">{t('pf.via')}</span><span className="pf-v pf-prov">{ICON[acc.provider] || ICON.email}{acc.label}</span></div>
        <button className="pf-row pf-out tap" onClick={async () => { await signOut(); onBack() }}><span className="pf-l">{t('pf.signout')}</span><IChevDown className="i" /></button>
      </section>
    </div>
  )
}
