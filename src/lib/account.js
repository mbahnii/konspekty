// Как человек вошёл и что о нём показывать: GitHub → ник, Google → почта, Telegram → имя, почта → адрес
export function accountInfo(session) {
  const u = session?.user
  if (!u) return null
  const m = u.user_metadata || {}, prov = m.provider === 'telegram' ? 'telegram' : (u.app_metadata?.provider || 'email')
  const shown = m.display_name || m.full_name || m.name || ''
  const base = {
    github: { name: shown || m.user_name || m.preferred_username || 'GitHub', sub: m.user_name ? '@' + m.user_name : 'GitHub', label: 'GitHub' },
    google: { name: shown || u.email, sub: u.email, label: 'Google' },
    telegram: { name: shown || m.name || 'Telegram', sub: m.username ? '@' + m.username : 'Telegram', label: 'Telegram' },
    email: { name: shown || (u.email || '').split('@')[0], sub: u.email, label: 'Email' },
  }[prov] || { name: shown || u.email, sub: u.email, label: prov }
  return { provider: prov, picture: m.avatar_url || m.picture || null, email: u.email, ...base }
}
