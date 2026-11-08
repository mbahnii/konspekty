import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { hello } from '../lib/hello'
import { useVideos } from '../lib/videos'
import { useQueue } from '../store/ui'
import { IBack } from '../components/Icons'

export const PageHead = ({ title, sub, onBack }) => {
  const t = useT()
  return (
    <div className="head"><div className="titles">
      <div className="hello"><button className="back tap" onClick={onBack}><IBack />{t('back')}</button><span>{hello(t)} 👋</span></div>
      <h1>{title}</h1>
      {sub && <p className="page-sub">{sub}</p>}
    </div></div>
  )
}

export function VideoCard({ v }) {
  const t = useT()
  const pct = v.total ? Math.round((v.done / v.total) * 100) : 0
  const inner = (
    <>
      <div className="cover" style={{ backgroundImage: v.cover ? `url("./data/v/${v.id}/${v.cover}")` : `url("https://i.ytimg.com/vi/${v.id}/mqdefault.jpg")` }} />
      <b>{v.title}</b>
      <div className="sub">{v.ready ? <>{v.learned ? `✓ ${t('nav.learned')}` : t('rail.done', { a: v.done, b: v.total }) + ' · ' + t('tab.guides').toLowerCase()}</> : t('processing')}</div>
      {v.ready && <div className="bar"><i style={{ width: `${v.learned ? 100 : pct}%` }} /></div>}
    </>
  )
  return v.ready ? <Link className="vcard tap" to={`/v/${v.id}`}>{inner}</Link> : <div className="vcard" style={{ opacity: .6 }}>{inner}</div>
}

export default function Home({ onBack }) {
  const t = useT()
  const { videos, loaded } = useVideos()
  const items = useQueue((s) => s.items)
  const queue = items.filter((x) => x.status !== 'done' && (x.kind ?? 'add') === 'add')
  return (
    <div className="wrap">
      <PageHead title={t('app')} sub={t('home.sub', { n: videos.filter((v) => v.ready).length, q: queue.length + videos.filter((v) => !v.ready).length })} onBack={onBack} />
      {loaded && !videos.length && <div className="empty"><b>{t('empty')}</b>{t('home.empty')}</div>}
      <div className="grid-cards">{videos.map((v) => <VideoCard key={v.id} v={v} />)}</div>
    </div>
  )
}
