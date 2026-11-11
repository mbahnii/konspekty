import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { useLibrary } from '../store/library'
import { useQueue, useToast } from '../store/ui'
import { IYt, ILink, IDone, IPin, IRedo, ITrash, IOpen } from './Icons'

// Пункты меню видео (⋯ и правый клик) — все рабочие
// Метки видео, как цветные теги в Finder: цвет + значок (показываются в списке)
export const TAG_COLORS = { red: '#ff453a', orange: '#ff9f0a', yellow: '#ffd60a', green: '#30d158', teal: '#40c8e0', blue: '#0a84ff', purple: '#bf5af2', pink: '#ff375f', gray: '#98989d' }
export const TAG_EMOJI = ['📘', '📗', '📕', '⭐', '🔥', '💡', '🎯', '🧠', '📌', '✅', '❓', '🎓']

export function useVideoMenu() {
  const t = useT()
  const nav = useNavigate()
  const say = useToast((s) => s.say)
  const lib = useLibrary()
  const add = useQueue((s) => s.add)
  return (v) => [
    { icon: <IOpen />, label: t('m.open'), onSelect: () => nav(`/v/${v.id}`) },
    { icon: <IYt />, label: t('watch'), onSelect: () => window.open(v.url, '_blank') },
    { icon: <ILink />, label: t('copyLink'), onSelect: () => { navigator.clipboard?.writeText(v.url); say(t('toast.linkCopied')) } },
    '-',
    v.ready && { header: t('tag.title') },
    v.ready && { swatches: [
      { id: 'none', color: 'transparent', label: t('tag.none'), on: !lib.tags[v.id]?.c },
      ...Object.entries(TAG_COLORS).map(([id, color]) => ({ id, color, label: id, on: lib.tags[v.id]?.c === id })),
    ], onPick: (id) => lib.setTag(v.id, { c: id === 'none' ? undefined : id }) },
    v.ready && { emojis: [{ id: 'none', on: !lib.tags[v.id]?.e }, ...TAG_EMOJI.map((id) => ({ id, on: lib.tags[v.id]?.e === id }))],
      onPick: (id) => lib.setTag(v.id, { e: id === 'none' ? undefined : id }) },
    v.ready && '-',
    v.ready && { icon: <IDone />, label: t(lib.learned[v.id] ? 'm.unlearned' : 'm.learned'), onSelect: () => { lib.toggle('learned', v.id); say(t(lib.learned[v.id] ? 'toast.unlearned' : 'toast.learned')) } },
    { icon: <IPin />, label: t(lib.pinned[v.id] ? 'm.unpin' : 'm.pin'), onSelect: () => lib.toggle('pinned', v.id) },
    { icon: <IRedo />, label: t('m.redo'), onSelect: () => { add(v.url, 'reprocess', { title: v.title, vid: v.id }); say(t('toast.redo')) } },
    '-',
    { icon: <ITrash />, label: t('m.delete'), danger: true, onSelect: () => { lib.setFlag('hidden', v.id, true); add(v.url, 'delete', { title: v.title, vid: v.id }); say(t('toast.deleted')); nav('/') } },
  ].filter(Boolean)
}
