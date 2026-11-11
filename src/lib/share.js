import { useSettings } from '../store/settings'

// Куда попадёт новое видео/фото: в общий каталог или только мне.
// Общий — если открыт список «Усі» или «Загальні». «Мої» или любое другое место приложения (темы, страница видео…) — личное.
export function shareDefault() {
  const inList = (location.hash.replace(/^#/, '') || '/') === '/' || matchMedia('(min-width: 861px)').matches    // на ноутбуке список виден всегда
  return inList && useSettings.getState().catalog !== 'mine'
}
