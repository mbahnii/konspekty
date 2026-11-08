import { createPortal } from 'react-dom'
import { useT } from '../i18n'
import { IBack } from './Icons'

// Кнопка «назад» живёт прямо в <body>, а не внутри страницы: сдвиг страницы при переходе
// (transform) делал её «прыгающей», потому что fixed внутри transform держится за родителя, а не за экран.
export default function BackButton({ onClick }) {
  const t = useT()
  return createPortal(<button className="back tap" onClick={onClick} aria-label={t('back')}><IBack /></button>, document.body)
}
