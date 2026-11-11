import { useSettings } from '../store/settings'
import { useAuth, setLoginOpen } from '../store/auth'
import { accountsOn } from '../lib/accounts'
import { useT } from '../i18n'
import Segmented from './Segmented'
import { useVideos } from '../lib/videos'

// Какие конспекты показывать: все доступные / общий каталог / только мои. Появляется при включённых аккаунтах.
export default function CatalogFilter({ wide }) {
  const t = useT()
  const catalog = useSettings((s) => s.catalog)
  const setCatalog = useSettings((s) => s.setCatalog)
  const signed = useAuth((s) => !!s.session && !s.session.user?.is_anonymous)
  const { counts } = useVideos()
  if (!accountsOn()) return null
  const pick = (v) => { if (v === 'mine' && !signed) { setLoginOpen(true); return } setCatalog(v) }
  return (
    <div className={`cat-filter ${wide ? 'wide' : ''}`}>
      <Segmented className="seg cat-seg" value={catalog} onChange={pick}
        items={[{ id: 'all', label: t('cat.all'), count: counts.all }, { id: 'public', label: t('cat.public'), count: counts.public }, { id: 'mine', label: t('cat.mine'), count: signed ? counts.mine : null }]} />
    </div>
  )
}
