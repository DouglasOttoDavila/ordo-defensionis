import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Binary,
  CalendarDays,
  Factory,
  Filter,
  Layers3,
  RefreshCcw,
  Search,
  Shield,
} from 'lucide-react'
import { AssetIcon } from '../components/AssetMedia'
import { WorldFlowMap } from '../components/WorldFlowMap'
import { useCatalog } from '../context/CatalogContext'
import { getBranchTone } from '../lib/icons'
import type { AssetRecord, Branch, DashboardMetrics, SipriProxyMeta, TrendPoint } from '../types'

const branchOptions: Array<Branch | 'All'> = ['All', 'Air', 'Land', 'Naval', 'Joint']
const defaultVisibleAssets = 9
const descriptionClampLines = 5

function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function buildChartPath(values: number[]) {
  if (values.length === 0) {
    return ''
  }

  const max = Math.max(...values, 1)
  const step = 640 / Math.max(values.length - 1, 1)

  return values
    .map((value, index) => {
      const x = index * step
      const y = 240 - (value / max) * 180
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function metricSummary(metrics: DashboardMetrics) {
  return [
    {
      label: 'Tracked programs',
      value: metrics.assets,
      delta: `${metrics.activePrograms} still in procurement pipeline`,
      icon: Layers3,
    },
    {
      label: 'Units logged',
      value: metrics.units,
      delta: `${formatCount(metrics.activeUnits)} units tied to active lines`,
      icon: Binary,
    },
    {
      label: 'Supplier states',
      value: metrics.suppliers,
      delta: `latest scheduled delivery marker: ${metrics.latestDeliveryYear}`,
      icon: Factory,
    },
    {
      label: 'Data records',
      value: metrics.records,
      delta: 'live via local SIPRI proxy',
      icon: Activity,
    },
  ]
}

function proxyStatus(meta: SipriProxyMeta | null) {
  if (!meta) {
    return 'Waiting for proxy'
  }

  if (meta.stale) {
    return `Fallback source: ${meta.source}`
  }

  return `Source: ${meta.source}`
}

function freshnessLabel(meta: SipriProxyMeta | null) {
  if (!meta?.fetchedAt) {
    return 'Timestamp unavailable'
  }

  return `Updated ${new Date(meta.fetchedAt).toLocaleString()}`
}

function AssetDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)
  const textRef = useRef<HTMLParagraphElement | null>(null)

  useEffect(() => {
    setExpanded(false)
  }, [text])

  useEffect(() => {
    const element = textRef.current

    if (!element) {
      return
    }

    const computed = window.getComputedStyle(element)
    const lineHeight = Number.parseFloat(computed.lineHeight)
    const nextCanExpand =
      Number.isFinite(lineHeight) && lineHeight > 0
        ? element.scrollHeight > lineHeight * descriptionClampLines + 2
        : element.scrollHeight > element.clientHeight + 2

    setCanExpand(nextCanExpand)
  }, [text])

  return (
    <div className="asset-card__description">
      <p
        className={`asset-card__copy${expanded ? ' asset-card__copy--expanded' : ' asset-card__copy--clamped'}`}
        style={{ WebkitLineClamp: descriptionClampLines }}
        ref={textRef}
      >
        {text}
      </p>
      {canExpand ? (
        <button className="asset-card__expand" onClick={() => setExpanded((current) => !current)} type="button">
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      ) : null}
    </div>
  )
}

function AssetCard({ asset }: { asset: AssetRecord }) {
  return (
    <article className="asset-card">
      <div className="asset-card__header">
        <div className="asset-card__header-top">
          <div className="asset-card__title-lockup">
            <div className="asset-card__icon">
              <AssetIcon asset={asset} size={28} />
            </div>
            <div className="asset-card__title-group">
              <p className="eyebrow">{asset.branch} command</p>
              <h3 className="asset-card__title">{asset.designation}</h3>
            </div>
          </div>
          <span className={getBranchTone(asset.branch)}>{asset.statusCode}</span>
        </div>
        <AssetDescription text={asset.description} />
      </div>

      <div className="asset-card__meta">
        <span className="micro-label">{asset.category}</span>
        {asset.subCategory ? <span className="micro-label">{asset.subCategory}</span> : null}
        <span className="micro-label">{asset.suppliers.length} suppliers</span>
      </div>

      <div className="asset-card__stats">
        <div className="stat-block">
          <span>Tracked units</span>
          <strong>{formatCount(asset.totalUnits)}</strong>
        </div>
        <div className="stat-block">
          <span>First order</span>
          <strong>{asset.firstOrderYear}</strong>
        </div>
        <div className="stat-block">
          <span>Latest delivery</span>
          <strong>{asset.latestDeliveryYear ?? 'TBD'}</strong>
        </div>
      </div>

      <div>
        <p className="eyebrow">Program pulse</p>
        <div className="asset-card__timeline" aria-hidden="true">
          {asset.timeline.map((height, index) => (
            <span key={`${asset.slug}-${index}`} style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>

      <div className="asset-card__footer">
        <span className="micro-label">
          <CalendarDays size={14} aria-hidden="true" />
          {asset.orders.length} line items
        </span>
        <Link to={`/asset/${asset.slug}`} className="button button--ghost">
          Open dossier
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

function LoadingState() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__brand">
          <div className="brand-mark">
            <Layers3 size={22} aria-hidden="true" />
          </div>
          <div className="title-lockup">
            <p className="eyebrow">Brazil force monitor</p>
            <strong>ORDO DEFENSIONIS</strong>
            <span>Waiting for live SIPRI feed</span>
          </div>
        </div>
      </header>
      <div className="empty-state">
        <RefreshCcw size={32} aria-hidden="true" />
        <strong>Loading live procurement data.</strong>
        <p>The local proxy is fetching the latest Brazil orders from SIPRI.</p>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { snapshot, meta, loading, error, refresh } = useCatalog()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedBranch, setSelectedBranch] = useState<(typeof branchOptions)[number]>('All')
  const [visibleAssetCount, setVisibleAssetCount] = useState(defaultVisibleAssets)
  const deferredSearch = useDeferredValue(search)

  const filteredAssets = useMemo(() => {
    if (!snapshot) {
      return []
    }

    const query = deferredSearch.trim().toLowerCase()

    return snapshot.assetCatalog.filter((asset) => {
      const matchesQuery =
        query.length === 0 ||
        asset.designation.toLowerCase().includes(query) ||
        asset.description.toLowerCase().includes(query) ||
        asset.suppliers.some((supplier) => supplier.toLowerCase().includes(query))
      const matchesCategory = selectedCategory === 'All' || asset.category === selectedCategory
      const matchesBranch = selectedBranch === 'All' || asset.branch === selectedBranch

      return matchesQuery && matchesCategory && matchesBranch
    })
  }, [deferredSearch, selectedCategory, selectedBranch, snapshot])

  const hasActiveFilters =
    deferredSearch.trim().length > 0 || selectedCategory !== 'All' || selectedBranch !== 'All'

  useEffect(() => {
    setVisibleAssetCount(defaultVisibleAssets)
  }, [deferredSearch, selectedCategory, selectedBranch])

  useEffect(() => {
    if (hasActiveFilters) {
      return
    }

    setVisibleAssetCount((current) => Math.min(current, filteredAssets.length || defaultVisibleAssets))
  }, [filteredAssets.length, hasActiveFilters])

  const visibleAssets = hasActiveFilters ? filteredAssets : filteredAssets.slice(0, visibleAssetCount)
  const canShowMore = !hasActiveFilters && visibleAssetCount < filteredAssets.length
  const canShowAll = !hasActiveFilters && filteredAssets.length > defaultVisibleAssets && visibleAssetCount < filteredAssets.length

  if (loading && !snapshot) {
    return <LoadingState />
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
              <p className="eyebrow">Brazil force monitor</p>
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
          <Activity size={32} aria-hidden="true" />
          <strong>Proxy fetch failed.</strong>
          <p>{error ?? 'Unknown proxy failure.'}</p>
        </div>
      </div>
    )
  }

  const pulseValues = snapshot.pulseTimeline.map((item) => item.count)
  const chartPath = buildChartPath(pulseValues)
  const categoryOptions = ['All', ...snapshot.categoryDistribution.map(([category]) => category)]

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__brand">
          <div className="brand-mark">
            <Layers3 size={22} aria-hidden="true" />
          </div>
          <div className="title-lockup">
            <p className="eyebrow">Brazil force monitor</p>
            <strong>ORDO DEFENSIONIS</strong>
            <span>{freshnessLabel(meta)}</span>
          </div>
        </div>
        <div className="topbar__meta">
          <span className={meta?.stale ? 'status-tag status-tag--danger' : 'status-tag'}>
            <Activity size={14} aria-hidden="true" />
            {proxyStatus(meta)}
          </span>
          <Link className="button button--ghost" to="/admin">
            <Shield size={16} aria-hidden="true" />
            Admin editor
          </Link>
          <button className="button button--ghost" onClick={() => void refresh(true)} type="button">
            <RefreshCcw size={16} aria-hidden="true" />
            Refresh feed
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero__grid">
          <div>
            <p className="eyebrow">Procurement intelligence deck</p>
            <h1 className="hero__title">Brazilian Armed Forces Assets Console</h1>
            <p className="hero__lede">
              A dark tactical dashboard built from live SIPRI international order records for
              Brazil through a local proxy. It groups platforms into navigable dossiers, surfaces
              procurement pressure points, and leaves clear hooks for custom icons, galleries, and
              deeper technical metadata.
            </p>
            <div className="hero__actions">
              <a className="button button--primary" href="#asset-registry">
                Browse asset registry
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <Link className="button button--ghost" to="/admin">
                Open admin editor
              </Link>
              <a className="button button--ghost" href="#data-pulse">
                Inspect procurement pulse
              </a>
            </div>
          </div>

          <div className="hero-grid">
            {metricSummary(snapshot.dashboardMetrics).map(({ icon: Icon, label, value, delta }) => (
              <article className="metric-card" key={label}>
                <span className="metric-card__label">
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </span>
                <div className="metric-card__value">
                  {formatCount(value)}
                  <small> / live</small>
                </div>
                <div className="metric-card__delta">{delta}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <main className="dashboard">
        {meta?.warning ? (
          <section className="panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Proxy warning</p>
                <h2 className="panel__title">Upstream instability detected</h2>
                <p className="panel__copy">{meta.warning}</p>
              </div>
              <span className="status-tag status-tag--danger">fallback mode</span>
            </div>
          </section>
        ) : null}

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Geospatial relay</p>
              <h2 className="panel__title">Exporter route mesh</h2>
              <p className="panel__copy">
                A live world overlay of every country in the SIPRI feed currently exporting assets
                to Brazil, with animated transfer vectors converging on the Brazilian command hub.
              </p>
            </div>
            <span className="status-tag status-tag--accent">
              <Activity size={14} aria-hidden="true" />
              {snapshot.exporterFlows.length} countries mapped
            </span>
          </div>
          <WorldFlowMap flows={snapshot.exporterFlows} />
        </section>

        <section className="panel-grid" id="data-pulse">
          <section className="panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Temporal view</p>
                <h2 className="panel__title">Procurement pulse</h2>
              </div>
              <span className="status-tag">
                <CalendarDays size={14} aria-hidden="true" />
                last 12-year window
              </span>
            </div>
            <div className="pulse-chart">
              <svg viewBox="0 0 640 260" role="img" aria-label="Recent procurement activity chart">
                <defs>
                  <linearGradient id="pulseLine" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#46f59b" />
                    <stop offset="100%" stopColor="#4dd7ff" />
                  </linearGradient>
                </defs>
                <path d={chartPath} fill="none" stroke="url(#pulseLine)" strokeWidth="5" strokeLinecap="round" />
              </svg>
              <div className="chart-footer">
                {snapshot.pulseTimeline.map((point: TrendPoint) => (
                  <span key={point.year}>
                    {point.year}
                    <strong style={{ color: 'var(--text)', marginLeft: 6 }}>{formatCount(point.count)}</strong>
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="sub-grid">
            <article className="panel">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Category heat</p>
                  <h2 className="panel__title">Payload concentration</h2>
                </div>
              </div>
              <div className="chip-wrap">
                {snapshot.categoryDistribution.slice(0, 8).map(([category, units]) => (
                  <div className="chip" key={category}>
                    <span>{category}</span>
                    <strong>{formatCount(units)}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Supplier stack</p>
                  <h2 className="panel__title">Top partner nations</h2>
                </div>
              </div>
              <div className="supplier-stack">
                {snapshot.supplierDistribution.map(([seller, units]) => (
                  <div className="supplier-card" key={seller}>
                    <p className="eyebrow">{seller}</p>
                    <strong>{formatCount(units)}</strong>
                    <span>tracked units across all line items</span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </section>

        <section className="panel" id="asset-registry">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Registry access</p>
              <h2 className="panel__title">Asset dossiers</h2>
              <p className="panel__copy">
                Search by platform, supplier, or descriptor. Each card opens a detail page with
                procurement data, timeline history, gallery slots, and extension points for richer
                technical content.
              </p>
            </div>
            <span className="status-tag status-tag--accent">
              <Filter size={14} aria-hidden="true" />
              {visibleAssets.length} visible
            </span>
          </div>

          <div className="toolbar" role="search">
            <label className="field">
              <Search size={16} aria-hidden="true" />
              <span className="visually-hidden">Search assets</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search designation, supplier, or descriptor"
              />
            </label>

            <label className="field">
              <Filter size={16} aria-hidden="true" />
              <span className="visually-hidden">Filter by category</span>
              <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <Layers3 size={16} aria-hidden="true" />
              <span className="visually-hidden">Filter by branch</span>
              <select
                value={selectedBranch}
                onChange={(event) => setSelectedBranch(event.target.value as (typeof branchOptions)[number])}
              >
                {branchOptions.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filteredAssets.length > 0 ? (
            <div className="asset-grid" style={{ marginTop: 18 }}>
              {visibleAssets.map((asset: AssetRecord) => (
                <AssetCard asset={asset} key={asset.slug} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Layers3 size={32} aria-hidden="true" />
              <strong>No assets matched the current filters.</strong>
              <p>Try a supplier name like “France”, a category like “Aircraft”, or clear the query.</p>
            </div>
          )}

          {filteredAssets.length > 0 && !hasActiveFilters ? (
            <div className="registry-actions">
              <span className="micro-label">
                Showing {visibleAssets.length} of {filteredAssets.length} dossiers
              </span>
              {canShowMore ? (
                <button
                  className="button button--ghost"
                  onClick={() => setVisibleAssetCount((current) => Math.min(current + defaultVisibleAssets, filteredAssets.length))}
                  type="button"
                >
                  Show more
                </button>
              ) : null}
              {canShowAll ? (
                <button
                  className="button button--ghost"
                  onClick={() => setVisibleAssetCount(filteredAssets.length)}
                  type="button"
                >
                  Show all
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>

      <p className="footer-note">
        The dashboard now fetches through a local SIPRI proxy at <code>/api/sipri/orders</code>,
        which avoids browser CORS restrictions and can fall back to the saved snapshot if the
        upstream service becomes unstable.
      </p>
    </div>
  )
}
