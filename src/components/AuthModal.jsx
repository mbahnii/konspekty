import { useEffect, useState } from 'react'
import { useAuth, setLoginOpen, signIn, signOut } from '../store/auth'
import { supabase } from '../lib/supabase'
import { TELEGRAM_BOT_ID } from '../lib/accounts'
import { useT } from '../i18n'
import { useToast } from '../store/ui'
import Segmented from './Segmented'

// Вход и регистрация: почта + пароль (с кодом из письма), Google, GitHub, Telegram.
// Всегда в DOM: открывается и закрывается одной анимацией. Включается флагом (lib/accounts.js).
const Badge = ({ bg, children }) => <span className="am-badge" style={{ background: bg }}>{children}</span>
const ICON = {
  google: <Badge bg="#fff"><svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg></Badge>,
  github: <Badge bg="#24292f"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.2-3.4-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.7.4-1.1.6-1.3-2.2-.3-4.600-1.100-4.600-5 0-1.100.4-2 1-2.700-.1-.3-.4-1.300.1-2.700 0 0 .8-.3 2.700 1a9.400 9.400 0 0 1 5 0c1.900-1.300 2.700-1 2.700-1 .5 1.400.2 2.400.1 2.700.6.7 1 1.600 1 2.700 0 3.900-2.400 4.700-4.600 5 .4.3.7.9.7 1.800v2.700c0 .3.2.6.7.5A10 10 0 0 0 12 2z" fill="#fff" stroke="none" /></svg></Badge>,
  telegram: <Badge bg="#29a9eb"><svg viewBox="0 0 24 24"><path d="M20.5 4.200 3.700 10.700c-1.100.4-1.100 1.100-.2 1.400l4.300 1.300 1.700 5.100c.2.600.1.800.7.800.5 0 .7-.2 1-.5l2.100-2 4.400 3.200c.8.400 1.400.2 1.600-.7L22 5.500c.3-1.200-.5-1.700-1.500-1.300zM9 13.400l9.200-5.800c.4-.3.800-.1.500.2l-7.500 6.800-.3 3.100z" fill="#fff" stroke="none" /></svg></Badge>,
}

const score = (p) => [p.length >= 8, /[A-Z]/.test(p) && /[a-z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p) || p.length >= 12].filter(Boolean).length

export default function AuthModal() {
  const t = useT()
  const say = useToast((s) => s.say)
  const { session, loginOpen } = useAuth()
  const [tab, setTab] = useState('in')                 // in | up
  const [step, setStep] = useState('form')             // form | code | reset
  const [nick, setNick] = useState(''), [email, setEmail] = useState(''), [pass, setPass] = useState('')
  const [show, setShow] = useState(false), [code, setCode] = useState('')
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false), [wait, setWait] = useState(0)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setLoginOpen(false)
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => { if (!loginOpen) { setStep('form'); setErr(''); setPass(''); setCode('') } }, [loginOpen])
  useEffect(() => { if (wait <= 0) return; const id = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(id) }, [wait])

  const fail = (e) => {
    const m = String(e?.message || e || '').toLowerCase()
    setErr(t(m.includes('invalid login') ? 'au.badLogin' : m.includes('already') ? 'au.exists' : m.includes('password') ? 'au.weak' : m.includes('rate') || m.includes('seconds') ? 'au.rate'
      : m.includes('provider') || m.includes('not enabled') || m.includes('unsupported') ? 'au.off' : m.includes('token') || m.includes('expired') ? 'au.codeBad' : 'au.fail'))
  }

  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (tab === 'up' && !/^[A-Za-z0-9_.-]{3,24}$/.test(nick)) { setErr(t('au.nick')); return }
    if (tab === 'up' && score(pass) < 2) { setErr(t('au.weak')); return }
    setBusy(true)
    if (tab === 'in') {
      const { error } = await signIn(email.trim(), pass)
      setBusy(false)
      if (error) fail(error); else { setPass(''); say(t('login.ok')); setTimeout(() => setLoginOpen(false), 450) }
    } else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pass, options: { data: { nickname: nick } } })
      setBusy(false)
      if (error) fail(error)
      else if (data.session) { say(t('login.ok')); setTimeout(() => setLoginOpen(false), 450) }      // подтверждение почты выключено
      else { setStep('code'); setWait(30) }
    }
  }
  const verify = async (v) => {
    setBusy(true); setErr('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: v, type: 'signup' })
    setBusy(false)
    if (error) { fail(error); setCode('') } else { say(t('login.ok')); setTimeout(() => setLoginOpen(false), 450) }
  }
  const resend = async () => { setWait(30); const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() }); if (error) fail(error); else say(t('au.sent')) }
  const reset = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname })
    setBusy(false); if (error) fail(error); else { say(t('au.sent')); setStep('form') }
  }

  // Telegram — стандартный вход: переходим на oauth.telegram.org, там подтверждение в приложении Telegram, потом Telegram возвращает на сайт
  // (см. main.jsx и store/auth.js: данные проверяет функция Supabase «telegram-auth»).
  const telegram = () => {
    setErr(''); setBusy(true)
    const back = location.origin + location.pathname
    location.href = `https://oauth.telegram.org/auth?bot_id=${TELEGRAM_BOT_ID}&origin=${encodeURIComponent(location.origin)}&request_access=write&return_to=${encodeURIComponent(back)}`
  }
  const oauthPick = (provider) => {                  // каждый раз даём выбрать аккаунт, а не входим молча в прошлый
    setErr('')
    supabase.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } } })
      .then(({ error }) => error && fail(error))
  }

  const sc = score(pass)
  const nickBad = tab === 'up' && nick && !/^[A-Za-z0-9_.-]{3,24}$/.test(nick)
  return (
    <div className={`modal-back ${loginOpen ? 'show' : ''}`} onClick={() => setLoginOpen(false)}>
      <div className="modal am" onClick={(e) => e.stopPropagation()} role="dialog" aria-hidden={!loginOpen}>
        {session ? (
          <>
            <h3>{t('au.hi', { name: session.user.user_metadata?.nickname || session.user.email?.split('@')[0] })}</h3>
            <p className="modal-sub">{t('login.as', { email: session.user.email })}</p>
            <button className="modal-btn tap" onClick={async () => { await signOut(); say(t('login.out')) }}>{t('login.signout')}</button>
          </>
        ) : step === 'code' ? (
          <div className="am-step" key="code">
            <h3>{t('au.codeTitle')}</h3>
            <p className="modal-sub">{t('au.codeSub', { email })}</p>
            <input className="am-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="······" value={code}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setCode(v); if (v.length === 6) verify(v) }} />
            {err && <p className="modal-err">{err}</p>}
            <button className="modal-btn tap" disabled={wait > 0 || busy} onClick={resend}>{wait > 0 ? t('au.resendIn', { n: wait }) : t('au.resend')}</button>
            <button className="am-link tap" onClick={() => setStep('form')}>{t('au.back')}</button>
          </div>
        ) : step === 'reset' ? (
          <form className="am-step" key="reset" onSubmit={reset}>
            <h3>{t('au.resetTitle')}</h3>
            <p className="modal-sub">{t('au.resetSub')}</p>
            <input type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {err && <p className="modal-err">{err}</p>}
            <button className="modal-btn primary tap" disabled={busy}>{busy ? '…' : t('au.send')}</button>
            <button type="button" className="am-link tap" onClick={() => setStep('form')}>{t('au.back')}</button>
          </form>
        ) : (
          <div className="am-step" key="form">
            <h3>{t(tab === 'in' ? 'au.inTitle' : 'au.upTitle')}</h3>
            <Segmented className="seg am-seg" value={tab} onChange={(v) => { setTab(v); setErr('') }} items={[{ id: 'in', label: t('au.in') }, { id: 'up', label: t('au.up') }]} />
            <div className="am-social">
              <button type="button" className="am-sbtn tap" onClick={() => oauthPick('google')}>{ICON.google}Google</button>
              <button type="button" className="am-sbtn tap" onClick={() => oauthPick('github')}>{ICON.github}GitHub</button>
              <button type="button" className="am-sbtn tap" onClick={telegram}>{ICON.telegram}Telegram</button>
            </div>
            <div className="am-or"><span>{t('au.or')}</span></div>
            <form onSubmit={submit}>
              {tab === 'up' && (
                <label className={`am-f ${nickBad ? 'bad' : ''}`}><span>{t('au.nickname')}</span>
                  <input autoComplete="nickname" autoCapitalize="off" spellCheck="false" value={nick} onChange={(e) => setNick(e.target.value)} placeholder="mykhailo_b" maxLength={24} required /></label>
              )}
              <label className="am-f"><span>Email</span>
                <input type="email" autoComplete={tab === 'in' ? 'username' : 'email'} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required /></label>
              <label className="am-f"><span>{t('login.pass')}</span>
                <div className="am-pw">
                  <input type={show ? 'text' : 'password'} autoComplete={tab === 'in' ? 'current-password' : 'new-password'} value={pass} onChange={(e) => setPass(e.target.value)} minLength={tab === 'up' ? 8 : undefined} required />
                  <button type="button" className="tap" onClick={() => setShow(!show)} aria-label={t('au.show')}>{show ? t('au.hide') : t('au.show')}</button>
                </div></label>
              {tab === 'up' && pass && <div className="am-meter" data-s={sc}><i /><i /><i /><i /></div>}
              {err && <p className="modal-err">{err}</p>}
              <button className="modal-btn primary tap" disabled={busy}>{busy ? '…' : t(tab === 'in' ? 'login.go' : 'au.create')}</button>
              {tab === 'in' && <button type="button" className="am-link tap" onClick={() => { setStep('reset'); setErr('') }}>{t('au.forgot')}</button>}
            </form>
            <p className="am-guest">{t('au.guest')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
