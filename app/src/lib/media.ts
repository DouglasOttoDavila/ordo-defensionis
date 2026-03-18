import { assetMediaRegistry } from '../config/assetMedia'
import type { AssetGalleryImageConfig, AssetIconConfig, AssetRecord } from '../types'

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function dedupe(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function normalizeGalleryItem(asset: AssetRecord, item: AssetGalleryImageConfig) {
  return {
    ...item,
    alt: item.alt ?? `${asset.designation} ${item.title.toLowerCase()}`,
    sources: dedupe(item.sources),
  }
}

function buildDefaultGallery(asset: AssetRecord): AssetGalleryImageConfig[] {
  const slots = [
    {
      key: '01-overview',
      title: 'Overview Frame',
      caption: `${asset.designation} hero image slot for a primary platform photograph or rendered concept art.`,
    },
    {
      key: '02-detail',
      title: 'Detail Frame',
      caption: `Secondary technical or close-up image slot for ${asset.designation}.`,
    },
    {
      key: '03-deployment',
      title: 'Deployment Frame',
      caption: `${asset.branch} theatre slot for operational imagery, crew context, or dockside ramp shots.`,
    },
  ]

  return slots.map(({ key, title, caption }) => ({
    title,
    caption,
    alt: `${asset.designation} ${title.toLowerCase()}`,
    sources: [
      `/assets/gallery/${asset.slug}/${key}.webp`,
      `/assets/gallery/${asset.slug}/${key}.jpg`,
      `/assets/gallery/${asset.slug}/${key}.png`,
      `/assets/gallery/placeholders/${key}.svg`,
    ],
  }))
}

export function getAssetIconConfig(asset: AssetRecord): AssetIconConfig {
  const registered = assetMediaRegistry[asset.slug]?.icon
  const categorySlug = slugify(asset.category)
  const branchSlug = slugify(asset.branch)

  return {
    alt: registered?.alt ?? `${asset.designation} icon`,
    sources: dedupe([
      ...(registered?.sources ?? []),
      `/assets/icons/categories/${categorySlug}.png`,
      `/assets/icons/categories/${categorySlug}.svg`,
      `/assets/icons/branches/${branchSlug}.png`,
      `/assets/icons/branches/${branchSlug}.svg`,
    ]),
  }
}

export function getAssetMainImageConfig(asset: AssetRecord): AssetGalleryImageConfig | null {
  if (asset.mainImage) {
    return normalizeGalleryItem(asset, asset.mainImage)
  }

  if (asset.autoMainImage) {
    return normalizeGalleryItem(asset, asset.autoMainImage)
  }

  const gallery = getAssetGalleryConfig(asset)
  return gallery[0] ?? null
}

export function getAssetGalleryConfig(asset: AssetRecord): AssetGalleryImageConfig[] {
  if (asset.galleryOverride) {
    return asset.galleryOverride.map((item) => normalizeGalleryItem(asset, item))
  }

  const registered = assetMediaRegistry[asset.slug]?.gallery

  if (registered && registered.length > 0) {
    return registered.map((item) => normalizeGalleryItem(asset, item))
  }

  if (asset.autoGallery && asset.autoGallery.length > 0) {
    return asset.autoGallery.map((item) => normalizeGalleryItem(asset, item))
  }

  return buildDefaultGallery(asset)
}
