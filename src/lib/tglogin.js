// Вход через Telegram: ключ входа от бота приходит на сайт двумя путями — мгновенно (Realtime) и «из почтового ящика»
// (зашифрованная запись в таблице site) на случай, если вкладка в браузере «уснула», пока человек был в Telegram.
// Шифр: AES-GCM, ключ = SHA-256(код). Код знает только сайт, поэтому читаемая всем запись без кода бесполезна.
// ТА ЖЕ схема — в _supabase-черновики/functions/telegram-auth/index.ts (держать в синхроне).
const enc = new TextEncoder()
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export const rowKey = async (code) => 'tgl-' + hex(await crypto.subtle.digest('SHA-256', enc.encode('row:' + code))).slice(0, 24)

export async function decryptKey(code, { iv, ct }) {
  const key = await crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', enc.encode(code)), 'AES-GCM', false, ['decrypt'])
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ct)))
}
