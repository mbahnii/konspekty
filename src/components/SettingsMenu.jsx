import { useSettings } from '../store/settings'
import { useAuth, setLoginOpen } from '../store/auth'
import { useT, LANGS } from '../i18n'
import { useMenu } from './Menu'
import { ICloud } from './Icons'

// Меню настроек: тема, язык, вход для синхронизации
export function useSettingsMenu() {
  const t = useT()
  const menu = useMenu()
  const { theme, lang, setTheme, setLang } = useSettings()
  const session = useAuth((s) => s.session)
  return (e) => { e.stopPropagation(); menu.open(e.currentTarget, [
    { header: t('theme') },
    ...['system', 'light', 'dark'].map((k) => ({ tick: theme === k, label: t(`theme.${k}`), onSelect: () => setTheme(k) })),
    '-',
    { header: t('language') },
    ...Object.entries(LANGS).map(([k, v]) => ({ tick: lang === k, label: v, onSelect: () => setLang(k) })),
    '-',
    { icon: <ICloud />, label: session ? t('login.menuOn') : t('login.menuOff'), onSelect: () => setLoginOpen(true) },
  ], { alignRight: true }) }
}
