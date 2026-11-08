import { useEffect, useState } from 'react'
import { useAuth, setLoginOpen, signIn, signOut } from '../store/auth'
import { useT } from '../i18n'
import { useToast } from '../store/ui'

// Окно входа для синхронизации. Всегда в DOM: открывается и закрывается одной и той же анимацией.
export default function LoginModal() {
  const t = useT()
  const say = useToast((s) => s.say)
  const { session, loginOpen } = useAuth()
  const [email, setEmail] = useState(''), [pass, setPass] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setLoginOpen(false)
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => { if (session && loginOpen) { const id = setTimeout(() => setLoginOpen(false), 600); return () => clearTimeout(id) } }, [session, loginOpen])

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    const { error } = await signIn(email.trim(), pass)
    setBusy(false)
    if (error) setErr(t('login.bad')); else { setPass(''); say(t('login.ok')) }
  }

  return (
    <div className={`modal-back ${loginOpen ? 'show' : ''}`} onClick={() => setLoginOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-hidden={!loginOpen}>
        <h3>{t('login.title')}</h3>
        {session ? (
          <>
            <p className="modal-sub">{t('login.as', { email: session.user.email })}</p>
            <button className="modal-btn tap" onClick={async () => { await signOut(); say(t('login.out')) }}>{t('login.signout')}</button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="modal-sub">{t('login.sub')}</p>
            <input type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" autoComplete="current-password" placeholder={t('login.pass')} value={pass} onChange={(e) => setPass(e.target.value)} required />
            {err && <p className="modal-err">{err}</p>}
            <button className="modal-btn primary tap" disabled={busy}>{busy ? '…' : t('login.go')}</button>
          </form>
        )}
      </div>
    </div>
  )
}
