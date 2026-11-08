import { useT } from '../i18n'
import { IBack } from './Icons'

// Одна постоянная кнопка «назад» на телефоне. Не внутри страницы (страница при переходе сдвигается),
// не пересоздаётся — только плавно появляется и исчезает.
export default function BackButton({ visible, onClick }) {
  const t = useT()
  return <button className={`back tap ${visible ? 'show' : ''}`} onClick={onClick} aria-label={t('back')} tabIndex={visible ? 0 : -1}><IBack /></button>
}
