import { useT } from '../i18n'
import { useVideos } from '../lib/videos'
import { PageHead, VideoCard } from './Home'

export default function Learned({ onBack }) {
  const t = useT()
  const { videos } = useVideos()
  const done = videos.filter((v) => v.learned)
  const inProgress = videos.filter((v) => v.ready && !v.learned && v.done > 0)
  return (
    <div className="wrap">
      <PageHead title={t('nav.learned')} sub={t('learned.sub')} onBack={onBack} />
      {!done.length && <div className="empty"><b>{t('learned.none')}</b>{t('learned.how')}</div>}
      {done.length > 0 && <div className="grid-cards">{done.map((v) => <VideoCard key={v.id} v={v} />)}</div>}
      {inProgress.length > 0 && <>
        <h2 style={{ marginTop: 'var(--s7)', fontSize: 'var(--fs-title)' }}>{t('learned.progress')}</h2>
        <div className="grid-cards" style={{ marginTop: 'var(--s4)' }}>{inProgress.map((v) => <VideoCard key={v.id} v={v} />)}</div>
      </>}
    </div>
  )
}
