import { useNavigate } from 'react-router-dom'
import { useSettings } from '../store/settings'
import { useAuth, setLoginOpen } from '../store/auth'
import { useT, LANGS } from '../i18n'
import { useMenu } from './Menu'
import Segmented from './Segmented'
import { ICON } from './ProviderBadge'
import { accountInfo } from '../lib/account'
import { isAdmin } from '../lib/admin'
import { IForward, ICloud, IStack } from './Icons'

// Рядок настройки: подпись + переключатель (компактно, как в пилюле)
const Row = ({ label, children }) => <div className="ms-row"><span>{label}</span>{children}</div>

// Переключатели живые: сами читают настройки, поэтому подсветка активной опции меняется сразу после нажатия
function SettingsPanel() {
  const t = useT()
  const { theme, lang, setTheme, setLang, corners, setCorners, motion, setMotion } = useSettings()
  return (
    <>
      <Row label={t('theme')}><Segmented className="seg ms-seg" value={theme} onChange={setTheme} items={['system', 'light', 'dark'].map((k) => ({ id: k, label: t(`theme.${k}S`) }))} /></Row>
      <Row label={t('language')}><Segmented className="seg ms-seg" value={lang} onChange={setLang} items={Object.keys(LANGS).map((k) => ({ id: k, label: k.toUpperCase() }))} /></Row>
      <Row label={t('isl.corners')}><Segmented className="seg ms-seg" value={corners} onChange={setCorners} items={[{ id: 'round', label: t('isl.round') }, { id: 'square', label: t('isl.square') }]} /></Row>
      <Row label={t('isl.motion')}><Segmented className="seg ms-seg" value={motion} onChange={setMotion} items={['min', 'mid', 'max'].map((k) => ({ id: k, label: t(`mo.${k}S`) }))} /></Row>
    </>
  )
}

// Меню настроек: аккаунт (→ профиль) и четыре компактных переключателя; без длинных списков
export function useSettingsMenu() {
  const t = useT()
  const menu = useMenu()
  const nav = useNavigate()
  const session = useAuth((s) => s.session)
  return (e) => {
    e.stopPropagation()
    const acc = accountInfo(session)
    menu.open(e.currentTarget, [
      acc
        ? { icon: <span className="ms-ic">{ICON[acc.provider] || ICON.email}</span>, label: <span className="ms-acc"><b>{acc.name}</b><small>{acc.sub}</small></span>, sc: <IForward />, onSelect: () => nav('/profile') }
        : { icon: <ICloud />, label: t('login.menuOff'), onSelect: () => setLoginOpen(true) },
      isAdmin(session) && { icon: <IStack />, label: t('ad.menu'), onSelect: () => nav('/admin') },
      '-',
      { node: <SettingsPanel /> },
      { header: t('version') + ' ' + __BUILD__ },
    ], { alignRight: true })
  }
}
