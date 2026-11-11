import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { useLaterAll } from '../data/aggregate'
import { inline } from '../lib/md'
import { fmt, ytLink, stamp } from '../lib/time'
import { useIndex } from '../data/useData'
import { IPlay } from '../components/Icons'
import { PageHead } from './Home'

export default function Later({ onBack }) {
  const t = useT()
  const items = useLaterAll()
  const { data: index } = useIndex()
  const isPh = (vid) => index?.find((v) => v.id === vid)?.source === 'photos'
  return (
    <div className="wrap">
      <PageHead title={t('nav.later')} sub={t('later.sub')} onBack={onBack} />
      {!items.length && <div className="empty"><b>{t('empty')}</b>{t('later.empty')}</div>}
      {items.map((x, i) => (
        <div key={i} className="card">
          <h3>{x.title} {isPh(x.vid) ? <span className="tc page">{stamp({ source: 'photos' }, x.t, t('ph.page'))}</span> : <a className="tc tap" href={ytLink(x.vid, x.t)} target="_blank" rel="noreferrer"><IPlay />{fmt(x.t)}</a>}</h3>
          <div className="body" style={{ color: 'var(--text-2)' }}>{inline(x.text)}</div>
          <Link className="from" to={`/v/${x.vid}/later`} style={{ marginTop: 'var(--s3)' }}>↳ {x.vtitle}</Link>
        </div>
      ))}
    </div>
  )
}
