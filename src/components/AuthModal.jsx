import { useEffect, useState } from 'react'
import { useAuth, setLoginOpen, signIn, signOut } from '../store/auth'
import { supabase } from '../lib/supabase'
import { TELEGRAM_BOT } from '../lib/accounts'
import { useT } from '../i18n'
import { useToast } from '../store/ui'
import Segmented from './Segmented'
import { QueueRing } from './QueueRing'

// Вход и регистрация: почта + пароль (с кодом из письма), Google, GitHub, Telegram.
// Всегда в DOM: открывается и закрывается одной анимацией. Включается флагом (lib/accounts.js).
import { ICON } from './ProviderBadge'
import { rowKey, decryptKey } from '../lib/tglogin'

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

  // Telegram: открываем бота (t.me/<бот>?start=<код>), человек жмёт «Start», бот присылает сайту ключ входа
  // через Realtime-канал tg-login-<код> (функция Supabase «telegram-auth»). Запасной путь — кнопка-ссылка в чате с ботом.
  const [tgWait, setTgWait] = useState(null)        // { code, ch } пока ждём подтверждения в Telegram
  const stopTg = () => setTgWait((w) => { if (w?.ch) supabase.removeChannel(w.ch); clearTimeout(w?.timer); clearInterval(w?.iv); if (w?.onVis) document.removeEventListener('visibilitychange', w.onVis); return null })
  const telegram = () => {
    setErr('')
    const code = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')
    const link = `https://t.me/${TELEGRAM_BOT}?start=${code}`
    const ch = supabase.channel(`tg-login-${code}`).on('broadcast', { event: 'login' }, async ({ payload }) => {
      const r = await supabase.auth.verifyOtp({ token_hash: payload?.token_hash, type: 'magiclink' })
      stopTg()
      if (r.error) fail(r.error); else { say(t('login.ok')); setLoginOpen(false) }
    }).subscribe()
    // запасной путь: вкладка могла «уснуть» в фоне и не получить мгновенный ключ — спрашиваем зашифрованную запись раз в 2 с и при возврате на вкладку
    let busyPoll = false
    const poll = async () => {
      if (busyPoll) return; busyPoll = true
      try {
        const { data } = await supabase.from('site').select('value').eq('key', await rowKey(code)).maybeSingle()
        if (data?.value?.ct) {
          const r = await supabase.auth.verifyOtp({ token_hash: await decryptKey(code, data.value), type: 'magiclink' })
          if (!r.error) { stopTg(); say(t('login.ok')); setLoginOpen(false); supabase.from('site').delete().eq('key', await rowKey(code)) }
        }
      } catch { /* повторим */ }
      busyPoll = false
    }
    const iv = setInterval(poll, 2000), onVis = () => { if (!document.hidden) poll() }
    document.addEventListener('visibilitychange', onVis)
    const timer = setTimeout(stopTg, 10 * 60 * 1000)
    setTgWait({ code, ch, link, timer, iv, onVis })
    window.open(link, '_blank', 'noopener')           // на телефоне откроется приложение Telegram
  }
  useEffect(() => { if (!loginOpen) stopTg() }, [loginOpen]) // eslint-disable-line
  useEffect(() => { if (session) stopTg() }, [session])     // eslint-disable-line
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
        {session && !session.user?.is_anonymous ? (
          <>
            <h3>{t('au.hi', { name: session.user.user_metadata?.nickname || session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || '' })}</h3>
            <p className="modal-sub">{t('login.as', { email: session.user.email })}</p>
            <button className="modal-btn tap" onClick={async () => { await signOut(); say(t('login.out')) }}>{t('login.signout')}</button>
          </>
        ) : tgWait ? (
          <div className="am-step am-tg" key="tg">
            <span className="am-tg-ic">{ICON.telegram}</span>
            <h3>{t('au.tgTitle')}</h3>
            <p className="modal-sub">{t('au.tgSub')}</p>
            <div className="am-tg-wait"><QueueRing k={2} mode="run" size={22} /><span>{t('au.tgWait')}</span></div>
            <a className="modal-btn primary tap" href={tgWait.link} target="_blank" rel="noopener noreferrer">{t('au.tgOpen')}</a>
            <button className="am-link tap" onClick={stopTg}>{t('au.back')}</button>
          </div>
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
                  <input autoComplete="nickname" autoCapitalize="off" spellCheck="false" value={nick} onChange={(e) => setNick(e.target.value)} placeholder="nickname" maxLength={24} required /></label>
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
