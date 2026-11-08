import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { useSettings } from '../store/settings'
import { useTopics } from '../data/aggregate'
import { useAllSummaries } from '../data/useData'
import { useVideos } from '../lib/videos'
import { topicName } from '../lib/topics'
import { inline } from '../lib/md'
import { fmt } from '../lib/time'
import Segmented from '../components/Segmented'
import { coverOf } from '../components/VideoRow'
import { PageHead } from './Home'

// Огляд тем: сверху переключатель тем, ниже — видео по выбранной теме с кратким содержанием
export default function Topics({ onBack }) {
  const t = useT()
  const lang = useSettings((s) => s.lang)
  const topics = useTopics()
  const { videos } = useVideos()
  const all = useAllSummaries(true)
  const [sel, setSel] = useState('all')

  const ready = videos.filter((v) => v.ready)
  const nameOf = (tp) => tp.title ?? topicName(tp.id, lang)
  const tp = topics.find((x) => x.id === sel)
  const list = tp ? (tp.videos ?? []).map((v) => videos.find((x) => x.id === v.id)).filter(Boolean) : ready
  const tldr = (id) => all.find((a) => a.id === id)?.summary.tldr

  const items = [{ id: 'all', label: t('topics.all'), count: ready.length }, ...topics.map((x) => ({ id: x.id, label: nameOf(x), count: x.videos?.length }))]

  return (
    <div className="wrap">
      <PageHead title={t('nav.topics')} sub={t('topics.sub')} onBack={onBack} />
      {!topics.length ? <div className="empty"><b>{t('empty')}</b>{t('topics.empty')}</div> : (
        <>
          <div className="topics-bar"><Segmented className="seg scroll" items={items} value={sel} onChange={setSel} /></div>
          {tp && (
            <div className="thead">
              <h2>{nameOf(tp)}</h2>
              <p>{tp.summary ? inline(tp.summary) : t('topics.auto')}</p>
              {tp.points?.length > 0 && <ul className="pts">{tp.points.map((p, i) => <li key={i}>{inline(p.text)}{p.vid && <> · <Link to={`/v/${p.vid}/notes`} className="from">{p.t != null ? fmt(p.t) : '↗'}</Link></>}</li>)}</ul>}
            </div>
          )}
          {list.map((v) => (
            <Link key={v.id} className="tcard tap" to={`/v/${v.id}`}>
              <div className="cv" style={{ backgroundImage: `url("${coverOf(v)}")` }} />
              <div className="tb">
                <b>{v.title}</b>
                {tp?.best === v.id && <span className="best">★ {t('topics.best')}</span>}
                <span className="tl">{tldr(v.id) ? inline(tldr(v.id)) : ''}</span>
                <span className="tags">{(v.topics ?? []).map((x) => (
                  <span key={x} className="chip" onClick={(e) => { e.preventDefault(); setSel(x) }}>{topicName(x, lang)}</span>
                ))}</span>
              </div>
            </Link>
          ))}
        </>
      )}
    </div>
  )
}
