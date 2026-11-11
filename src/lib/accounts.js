// Регистрация и вход включены для всех. Аварийный выключатель: открыть сайт с ?accounts=0 (вернёт прежний вход по паролю), ?accounts=1 — снова включить.
export const accountsOn = () => {
  try {
    const q = new URLSearchParams(location.search).get('accounts')
    if (q === '0') localStorage.setItem('konspekty-accounts', '0')
    if (q === '1') localStorage.removeItem('konspekty-accounts')
    return localStorage.getItem('konspekty-accounts') !== '0'
  } catch { return true }
}
// Имя бота Telegram без @ (создаётся у @BotFather). Пока пусто — кнопка «Telegram» неактивна.
export const TELEGRAM_BOT = 'konspekty_notes_bot'
export const TELEGRAM_BOT_ID = 9103773076          // числовой id бота (публичный, это не токен)
