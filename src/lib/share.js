import { useSettings } from '../store/settings'

// Куда попадёт новое видео/фото — решает ТОЛЬКО вкладка, выбранная в момент добавления:
// «Мої» → личное; «Усі» или «Загальні» → общее. На какой странице человек находится — не важно.
export function shareDefault() {
  return useSettings.getState().catalog !== 'mine'
}
