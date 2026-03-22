import { useEffect, useMemo, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { getAssetGalleryConfig, getAssetIconConfig, getAssetMainImageConfig } from '../lib/media'
import { getCategoryIcon } from '../lib/icons'
import type { AssetRecord, AssetGalleryImageConfig } from '../types'

function useCandidateSource(sources: string[]) {
  const [index, setIndex] = useState(0)
  const signature = useMemo(() => sources.join('|'), [sources])

  useEffect(() => {
    setIndex(0)
  }, [signature])

  return {
    source: sources[index] ?? null,
    handleError: () => setIndex((current) => current + 1),
  }
}

interface AssetIconProps {
  asset: AssetRecord
  size?: number
}

export function AssetIcon({ asset, size = 28 }: AssetIconProps) {
  const iconConfig = getAssetIconConfig(asset)
  const { source, handleError } = useCandidateSource(iconConfig.sources)
  const FallbackIcon = getCategoryIcon(asset.category)

  if (!source) {
    return <FallbackIcon size={size} aria-hidden="true" />
  }

  return (
    <img
      className="asset-art__img"
      src={source}
      alt={iconConfig.alt ?? `${asset.designation} icon`}
      width={size}
      height={size}
      loading="lazy"
      onError={handleError}
    />
  )
}

function GalleryImage({ item, asset }: { item: AssetGalleryImageConfig; asset: AssetRecord }) {
  const { source, handleError } = useCandidateSource(item.sources)

  if (!source) {
    return (
      <>
        <div className="gallery-card__frame" aria-hidden="true" />
        <div className="gallery-card__content">
          <p className="eyebrow">{asset.branch} branch</p>
          <h3 className="gallery-card__title">{item.title}</h3>
          <p className="gallery-card__copy">{item.caption || `${asset.designation} image is currently unavailable.`}</p>
          <p className="gallery-card__credit">Source unavailable</p>
        </div>
      </>
    )
  }

  return (
    <>
      <img
        className="gallery-card__media"
        src={source}
        alt={item.alt ?? `${asset.designation} ${item.title.toLowerCase()}`}
        loading="lazy"
        onError={handleError}
      />
      <div className="gallery-card__overlay" />
      <div className="gallery-card__content">
        <p className="eyebrow">{asset.branch} deck</p>
        <h3 className="gallery-card__title">{item.title}</h3>
        <p className="gallery-card__copy">{item.caption}</p>
        {item.credit ? <p className="gallery-card__credit">{item.credit}</p> : null}
      </div>
    </>
  )
}

export function AssetLeadImage({ asset }: { asset: AssetRecord }) {
  const item = getAssetMainImageConfig(asset)

  if (!item) {
    return (
      <div className="empty-state empty-state--compact">
        <ImageOff size={24} aria-hidden="true" />
        <strong>No main image available.</strong>
        <p>No approved cover image has been assigned to this asset.</p>
      </div>
    )
  }

  return (
    <article className="gallery-card lead-media">
      <GalleryImage asset={asset} item={item} />
    </article>
  )
}

export function AssetGalleryGrid({ asset }: { asset: AssetRecord }) {
  const gallery = getAssetGalleryConfig(asset)

  if (gallery.length === 0) {
    return (
      <div className="empty-state empty-state--compact">
        <ImageOff size={24} aria-hidden="true" />
        <strong>No gallery images available.</strong>
        <p>This dossier does not currently have any approved gallery imagery.</p>
      </div>
    )
  }

  return (
    <div className="gallery-grid">
      {gallery.map((item) => (
        <article className="gallery-card" key={`${asset.slug}-${item.title}`}>
          <GalleryImage asset={asset} item={item} />
        </article>
      ))}
    </div>
  )
}
