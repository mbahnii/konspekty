import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuth = create(() => ({ session: null, ready: false, loginOpen: false }))
export const setLoginOpen = (v) => useAuth.setState({ loginOpen: v })

export function initAuth() {
  // ссылка «Відкрити Конспекти» из бота Telegram: ?tg=<одноразовый ключ> → вход, затем ключ убираем из адреса
  const tgKey = new URLSearchParams(location.search).get('tg')
  if (tgKey) {
    const u = new URL(location.href); u.searchParams.delete('tg'); history.replaceState(null, '', u.toString())
    supabase.auth.verifyOtp({ token_hash: tgKey, type: 'magiclink' }).catch(() => {})   // уже вошли на этой странице — ключ просто не нужен
  }
  // данные от Telegram → функция проверяет подпись → сессия
  const tg = sessionStorage.getItem('konspekty-tg')
  if (tg) {
    sessionStorage.removeItem('konspekty-tg')
    supabase.functions.invoke('telegram-auth', { body: JSON.parse(tg) })
      .then(({ data }) => data?.token_hash && supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' }))
      .catch(() => {})
  }
  supabase.auth.getSession().then(({ data }) => useAuth.setState({ session: data.session, ready: true }))
  supabase.auth.onAuthStateChange((_e, session) => useAuth.setState({ session }))
}
export const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
export const signOut = () => supabase.auth.signOut()
