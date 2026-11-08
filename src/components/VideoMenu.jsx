import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { useLibrary } from '../store/library'
import { useQueue, useToast } from '../store/ui'
import { IYt, ILink, IDone, IPin, IRedo, ITrash, IOpen } from './Icons'

// Пункты меню видео (⋯ и правый клик) — все рабочие
export function useVideoMenu() {
  const t = useT()
  const nav = useNavigate()
  const say = useToast((s) => s.say)
  const lib = useLibrary()
  const add = useQueue((s) => s.add)
  return (v) => [
    v.ready && { icon: <IOpen />, label: t('m.open'), onSelect: () => nav(`/v/${v.id}`) },
    { icon: <IYt />, label: t('watch'), onSelect: () => window.open(v.url, '_blank') },
    { icon: <ILink />, label: t('copyLink'), onSelect: () => { navigator.clipboard?.writeText(v.url); say(t('toast.linkCopied')) } },
    '-',
    v.ready && { icon: <IDone />, label: t(lib.learned[v.id] ? 'm.unlearned' : 'm.learned'), onSelect: () => { lib.toggle('learned', v.id); say(t(lib.learned[v.id] ? 'toast.unlearned' : 'toast.learned')) } },
    { icon: <IPin />, label: t(lib.pinned[v.id] ? 'm.unpin' : 'm.pin'), onSelect: () => lib.toggle('pinned', v.id) },
    { icon: <IRedo />, label: t('m.redo'), onSelect: () => { add(v.url, 'reprocess'); say(t('toast.redo')) } },
    '-',
    { icon: <ITrash />, label: t('m.delete'), danger: true, onSelect: () => { lib.setFlag('hidden', v.id, true); add(v.url, 'delete'); say(t('toast.deleted')); nav('/') } },
  ].filter(Boolean)
}
