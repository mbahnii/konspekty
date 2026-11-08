import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuth = create(() => ({ session: null, ready: false, loginOpen: false }))
export const setLoginOpen = (v) => useAuth.setState({ loginOpen: v })

export function initAuth() {
  supabase.auth.getSession().then(({ data }) => useAuth.setState({ session: data.session, ready: true }))
  supabase.auth.onAuthStateChange((_e, session) => useAuth.setState({ session }))
}
export const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
export const signOut = () => supabase.auth.signOut()
