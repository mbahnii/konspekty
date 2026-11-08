import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { useSettings } from '../store/settings'
import { useTopics } from '../data/aggregate'
import { topicName } from '../lib/topics'
import { inline } from '../lib/md'
import { PageHead } from './Home'

export default function Topics({ onBack }) {
  const t = useT()
  const lang = useSettings((s) => s.lang)
  const topics = useTopics()
  return (
    <div className="wrap">
      <PageHead title={t('nav.topics')} sub={t('topics.sub')} onBack={onBack} />
      {!topics.length && <div className="empty"><b>{t('empty')}</b>{t('topics.empty')}</div>}
      {topics.map((tp) => (
        <div key={tp.id} className="card">
          <h3>{tp.title ?? topicName(tp.id, lang)} <span className="badge">{tp.videos?.length ?? ''}</span></h3>
          {tp.summary && <div className="body">{inline(tp.summary)}</div>}
          <div className="list">
            {(tp.videos ?? []).map((v) => (
              <Link key={v.id} className="li tap" to={`/v/${v.id}`}><span className="t">{v.title}</span></Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
