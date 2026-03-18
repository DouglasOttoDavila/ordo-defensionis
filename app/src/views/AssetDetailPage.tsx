import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Factory,
  Info,
  Layers3,
  RefreshCcw,
  Shield,
  Sparkles,
} from 'lucide-react'
import { AssetGalleryGrid, AssetIcon, AssetLeadImage, MissingMediaNote } from '../components/AssetMedia'
import { useCatalog } from '../context/CatalogContext'
import { findAssetBySlug } from '../lib/catalog'
import { getBranchTone } from '../lib/icons'

function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function statusLabel(code: string) {
  switch (code) {
    case 'Delivered':
      return 'Delivered lines'
    case 'Transferred':
      return 'Transferred lines'
    default:
      return 'Pipeline lines'
  }
}

export function AssetDetailPage() {
  const { slug = '' } = useParams()
  const { snapshot, loading, error, refresh } = useCatalog()
  const asset = snapshot ? findAssetBySlug(snapshot, slug) : null
  const profile = asset?.manualProfile

  if (loading && !snapshot) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar__brand">
            <div className="brand-mark">
              <Layers3 size={22} aria-hidden="true" />
            </div>
            <div className="title-lockup">
              <p className="eyebrow">Asset dossier</p>
              <strong>ORDO DEFENSIONIS</strong>
              <span>Loading live asset record</span>
            </div>
          </div>
        </header>
        <div className="empty-state">
          <RefreshCcw size={32} aria-hidden="true" />
          <strong>Loading live procurement data.</strong>
          <p>The local proxy is still fetching the latest asset registry.</p>
        </div>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar__brand">
            <div className="brand-mark">
              <Layers3 size={22} aria-hidden="true" />
            </div>
            <div className="title-lockup">
              <p className="eyebrow">Asset dossier</p>
              <strong>ORDO DEFENSIONIS</strong>
              <span>Live data unavailable</span>
            </div>
          </div>
          <button className="button button--ghost" onClick={() => void refresh(true)} type="button">
            <RefreshCcw size={16} aria-hidden="true" />
            Retry live fetch
          </button>
        </header>
        <div className="empty-state">
          <Info size={32} aria-hidden="true" />
          <strong>Proxy fetch failed.</strong>
          <p>{error ?? 'Unknown proxy failure.'}</p>
        </div>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar__brand">
            <div className="brand-mark">
              <Layers3 size={22} aria-hidden="true" />
            </div>
            <div className="title-lockup">
              <p className="eyebrow">Asset lookup</p>
              <strong>ORDO DEFENSIONIS</strong>
              <span>Platform not found in the current live snapshot</span>
            </div>
          </div>
          <Link className="button button--ghost" to="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Return to registry
          </Link>
        </header>

        <div className="empty-state">
          <Info size={32} aria-hidden="true" />
          <strong>That asset slug does not exist in the current dataset.</strong>
          <p>Return to the dashboard and open a dossier directly from the live registry.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__brand">
          <div className="brand-mark">
            <AssetIcon asset={asset} size={22} />
          </div>
          <div className="title-lockup">
            <p className="eyebrow">Asset dossier</p>
            <strong>{asset.designation}</strong>
            <span>{asset.category}</span>
          </div>
        </div>
        <div className="topbar__meta">
          <Link className="button button--ghost" to="/admin">
            <Shield size={16} aria-hidden="true" />
            Admin editor
          </Link>
          <button className="button button--ghost" onClick={() => void refresh(true)} type="button">
            <RefreshCcw size={16} aria-hidden="true" />
            Refresh feed
          </button>
          <Link className="button button--ghost" to="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="detail-shell">
        <section className="detail-hero">
          <div>
            <p className="eyebrow">{asset.branch} branch / asset intelligence</p>
            <div className="detail-hero__icon">
              <AssetIcon asset={asset} size={30} />
            </div>
            <h1 className="detail-hero__title">{asset.designation}</h1>
            <p className="detail-hero__lede">
              {profile?.summary ??
                `${asset.description}. This dossier aggregates every SIPRI line item tied to this designation and frames it as a procurement intelligence page. Replace the placeholder image modules and add deeper technical records when you are ready.`}
            </p>
            <div className="detail-actions">
              <span className={getBranchTone(asset.branch)}>{asset.statusCode}</span>
              <span className="micro-label">{statusLabel(asset.statusCode)}</span>
              {profile ? <span className="micro-label">{profile.tagline}</span> : null}
            </div>
          </div>

          <div className="detail-stats">
            <div className="stat-block">
              <span>Tracked units</span>
              <strong>{formatCount(asset.totalUnits)}</strong>
            </div>
            <div className="stat-block">
              <span>Active units</span>
              <strong>{formatCount(asset.activeUnits)}</strong>
            </div>
            <div className="stat-block">
              <span>Supplier nations</span>
              <strong>{asset.suppliers.length}</strong>
            </div>
            <div className="stat-block">
              <span>Order span</span>
              <strong>
                {asset.firstOrderYear} - {asset.latestOrderYear}
              </strong>
            </div>
            <div className="stat-block">
              <span>Latest delivery</span>
              <strong>{asset.latestDeliveryYear ?? 'TBD'}</strong>
            </div>
            <div className="stat-block">
              <span>Local involvement</span>
              <strong>{asset.localInvolvement ? 'Flagged' : 'None seen'}</strong>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="detail-section__header">
            <div>
              <p className="eyebrow">Main image</p>
              <h2 className="panel__title">Primary visual slot</h2>
              <p className="panel__copy">
                This image can be overridden from the local admin page without touching the upstream feed.
              </p>
            </div>
          </div>
          <AssetLeadImage asset={asset} />
        </section>

        <section className="detail-grid">
          <div className="detail-section">
            <article className="panel">
              <div className="detail-section__header">
                <div>
                  <p className="eyebrow">Timeline</p>
                  <h2 className="panel__title">Order and delivery history</h2>
                </div>
                <span className="status-tag">
                  <CalendarDays size={14} aria-hidden="true" />
                  {asset.orders.length} line items
                </span>
              </div>

              <div className="timeline-list">
                {asset.orders.map((order) => (
                  <article className="timeline-card" key={order.id}>
                    <div className="timeline-card__top">
                      <strong>{order.seller}</strong>
                      <span className="micro-label">{order.deliveryYr || 'TBD'}</span>
                    </div>
                    <div className="timeline-card__meta">
                      <span>Order year: {order.orderYr}</span>
                      <span>Units: {order.units ?? 'n/a'}</span>
                      <span>Trade ID: {order.tradeId}</span>
                    </div>
                  </article>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="detail-section__header">
                <div>
                  <p className="eyebrow">{profile ? 'Curated notes' : 'Curious facts'}</p>
                  <h2 className="panel__title">{profile ? 'Manual dossier signals' : 'Program notes'}</h2>
                </div>
                <span className="status-tag status-tag--accent">
                  <Sparkles size={14} aria-hidden="true" />
                  {profile ? 'manual layer' : 'generated from dataset'}
                </span>
              </div>
              <div className="timeline-list">
                {(profile?.programNotes ?? asset.factCards).map((fact) => (
                  <article className="timeline-card" key={fact}>
                    <div className="timeline-card__top">
                      <strong>Signal</strong>
                    </div>
                    <div className="timeline-card__meta">
                      <span>{fact}</span>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </div>

          <div className="detail-section">
            {profile ? (
              <article className="detail-list">
                <div className="detail-section__header">
                  <div>
                    <p className="eyebrow">Technical layer</p>
                    <h2 className="panel__title">Curated platform profile</h2>
                    <p className="panel__copy">
                      {profile.role} {profile.operatorFit}
                    </p>
                  </div>
                  <span className="status-tag status-tag--accent">
                    <Factory size={14} aria-hidden="true" />
                    curated
                  </span>
                </div>
                <dl>
                  {profile.specs.map((detail) => (
                    <div key={detail.label}>
                      <dt className="detail-list__label">{detail.label}</dt>
                      <dd className="detail-list__value">{detail.value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ) : null}

            <article className="detail-list">
              <div className="detail-section__header">
                <div>
                  <p className="eyebrow">Technical data</p>
                  <h2 className="panel__title">Procurement frame</h2>
                </div>
                <span className="status-tag">
                  <Factory size={14} aria-hidden="true" />
                  data-backed
                </span>
              </div>
              <dl>
                {asset.technicalDetails.map((detail) => (
                  <div key={detail.label}>
                    <dt className="detail-list__label">{detail.label}</dt>
                    <dd className="detail-list__value">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </article>

            <article className="detail-list">
              <div className="detail-section__header">
                <div>
                  <p className="eyebrow">Integration hooks</p>
                  <h2 className="panel__title">What to enrich next</h2>
                </div>
              </div>
              <dl>
                <div>
                  <dt className="detail-list__label">Asset icon</dt>
                  <dd className="detail-list__value">
                    Drop a custom SVG or PNG into <code>/public/assets/icons/assets/</code> and register it in{' '}
                    <code>src/config/assetMedia.ts</code>.
                  </dd>
                </div>
                <div>
                  <dt className="detail-list__label">Photo gallery</dt>
                  <dd className="detail-list__value">
                    Add photos under <code>/public/assets/gallery/{asset.slug}/</code> or register them in{' '}
                    <code>src/config/assetMedia.ts</code>.
                  </dd>
                </div>
                <div>
                  <dt className="detail-list__label">Technical dossier</dt>
                  <dd className="detail-list__value">
                    Extend curated specs, role notes and references in <code>src/config/assetProfiles.ts</code>.
                  </dd>
                </div>
                <div>
                  <dt className="detail-list__label">Source notes</dt>
                  <dd className="detail-list__value">
                    Merge official manufacturer docs or Jane&apos;s-style records for richer fidelity.
                  </dd>
                </div>
              </dl>
            </article>
          </div>
        </section>

        {profile ? (
          <section className="panel">
            <div className="detail-section__header">
              <div>
                <p className="eyebrow">Dossier modules</p>
                <h2 className="panel__title">Mission systems and source stack</h2>
                <p className="panel__copy">
                  This layer is manually curated and sits on top of the live SIPRI procurement feed.
                </p>
              </div>
              <span className="status-tag status-tag--accent">
                <Sparkles size={14} aria-hidden="true" />
                selected platforms only
              </span>
            </div>

            <div className="intel-grid">
              <article className="timeline-card">
                <div className="timeline-card__top">
                  <strong>Mission systems</strong>
                </div>
                <ul className="signal-list">
                  {profile.missionSystems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="timeline-card">
                <div className="timeline-card__top">
                  <strong>Curious facts</strong>
                </div>
                <ul className="signal-list">
                  {profile.curiosities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="timeline-card">
                <div className="timeline-card__top">
                  <strong>Reference stack</strong>
                </div>
                <ul className="signal-list">
                  {profile.references.map((reference) => (
                    <li key={reference.url}>
                      <a className="reference-link" href={reference.url} rel="noreferrer" target="_blank">
                        {reference.label}
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </a>
                      {reference.note ? <span>{reference.note}</span> : null}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </section>
        ) : null}

        <section className="panel">
          <div className="detail-section__header">
            <div>
              <p className="eyebrow">Photo gallery</p>
              <h2 className="panel__title">Visual hangar</h2>
              <p className="panel__copy">
                These are intentionally styled placeholders so you can swap in final photos later
                without redesigning the page structure.
              </p>
            </div>
            <MissingMediaNote />
          </div>

          <AssetGalleryGrid asset={asset} />
        </section>

        <section className="panel">
          <div className="detail-section__header">
            <div>
              <p className="eyebrow">Next move</p>
              <h2 className="panel__title">Scale the prototype</h2>
            </div>
          </div>
          <div className="asset-card__footer">
            <span className="micro-label">{asset.suppliers.join(' / ')}</span>
            <Link className="button button--primary" to="/">
              Open another dossier
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
