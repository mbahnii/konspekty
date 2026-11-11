// Настройки регистрации и входа. Регистрация по флагу: откройте сайт с ?accounts=1 (запомнится), ?accounts=0 — выключить.
// Пока в Supabase не включены входы и не выполнен app/supabase/accounts.sql, обычный вход по паролю работает как раньше.
export const accountsOn = () => {
  try {
    const q = new URLSearchParams(location.search).get('accounts')
    if (q === '1') localStorage.setItem('konspekty-accounts', '1')
    if (q === '0') localStorage.removeItem('konspekty-accounts')
    return localStorage.getItem('konspekty-accounts') === '1'
  } catch { return false }
}
// Имя бота Telegram без @ (создаётся у @BotFather). Пока пусто — кнопка «Telegram» неактивна.
export const TELEGRAM_BOT = 'konspekty_notes_bot'
