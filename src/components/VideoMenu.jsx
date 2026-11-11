import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { useLibrary } from '../store/library'
import { useQueue, useToast } from '../store/ui'
import { IYt, ILink, IDone, IPin, IRedo, ITrash, IOpen, IPhoto } from './Icons'

// Пункты меню видео (⋯ и правый клик) — все рабочие
// Метки видео, как цветные теги в Finder: цвет + значок (показываются в списке)
export const TAG_COLORS = { red: '#ff453a', orange: '#ff9f0a', yellow: '#ffd60a', green: '#30d158', teal: '#40c8e0', blue: '#0a84ff', purple: '#bf5af2', pink: '#ff375f', gray: '#98989d' }
export const TAG_EMOJI = ['📘', '📗', '📕', '⭐', '🔥', '💡', '🎯', '🧠', '📌', '✅', '❓', '🎓']

// Готовые метки (как списки в todo-main): цвет + значок + название
export const PRESETS = [
  { c: 'red', e: '🔥', name: ['Важливе'] }, { c: 'orange', e: '❓', name: ['З питаннями'] }, { c: 'yellow', e: '💡', name: ['Ідея'] },
  { c: 'green', e: '✅', name: ['Опановано'] }, { c: 'teal', e: '📗', name: ['Практика'] }, { c: 'blue', e: '🧠', name: ['Вчу'] },
  { c: 'purple', e: '🎓', name: ['Курс'] }, { c: 'pink', e: '⭐', name: ['Улюблене'] }, { c: 'gray', e: '📌', name: ['Архів'] },
]
export const TagTile = ({ tag }) => (
  <span className={`tag-tile ${tag ? '' : 'none'}`} style={tag ? { '--c': TAG_COLORS[tag.c] } : undefined}>{tag ? (tag.e || '') : <i />}</span>
)

export function useVideoMenu() {
  const t = useT()
  const nav = useNavigate()
  const say = useToast((s) => s.say)
  const lib = useLibrary()
  const add = useQueue((s) => s.add)
  return (v) => { const photo = String(v.id).startsWith('ph-') || v.source === 'photos'; return [
    { icon: <IOpen />, label: t('m.open'), onSelect: () => nav(`/v/${v.id}`) },
    // конспект из фото: вместо YouTube и ссылки — сразу к фото страниц
    ...(photo ? [{ icon: <IPhoto />, label: t('m.photos'), onSelect: () => nav(`/v/${v.id}/pages`) }] : [
      { icon: <IYt />, label: t('watch'), onSelect: () => window.open(v.url, '_blank') },
      { icon: <ILink />, label: t('copyLink'), onSelect: () => { navigator.clipboard?.writeText(v.url); say(t('toast.linkCopied')) } },
    ]),
    '-',
    v.ready && { icon: <TagTile tag={lib.tags[v.id]} />, label: t('tag.title'), sc: lib.tags[v.id] ? (PRESETS.find((p) => p.c === lib.tags[v.id].c)?.name[0] ?? '') + ' ›' : '›', back: t('tag.title'),
      sub: [
        { icon: <TagTile />, label: t('tag.none'), on: !lib.tags[v.id], sc: !lib.tags[v.id] ? '✓' : '', onSelect: () => lib.setTag(v.id, { c: undefined, e: undefined }) },
        ...PRESETS.map((p) => ({ icon: <TagTile tag={p} />, label: p.name[0], on: lib.tags[v.id]?.c === p.c, sc: lib.tags[v.id]?.c === p.c ? '✓' : '', onSelect: () => lib.setTag(v.id, { c: p.c, e: p.e }) })),
      ] },
    v.ready && '-',
    v.ready && { icon: <IDone />, label: t(lib.learned[v.id] ? 'm.unlearned' : 'm.learned'), onSelect: () => { lib.toggle('learned', v.id); say(t(lib.learned[v.id] ? 'toast.unlearned' : 'toast.learned')) } },
    { icon: <IPin />, label: t(lib.pinned[v.id] ? 'm.unpin' : 'm.pin'), onSelect: () => lib.toggle('pinned', v.id) },
    !photo && { icon: <IRedo />, label: t('m.redo'), onSelect: () => { add(v.url, 'reprocess', { title: v.title, vid: v.id }); say(t('toast.redo')) } },
    '-',
    { icon: <ITrash />, label: t('m.delete'), danger: true, onSelect: () => { lib.setFlag('hidden', v.id, true); add(v.url, 'delete', { title: v.title, vid: v.id }); say(t('toast.deleted')); nav('/') } },
  ].filter(Boolean) }
}
