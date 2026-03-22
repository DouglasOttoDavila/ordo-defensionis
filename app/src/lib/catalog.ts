import { assetManualProfiles } from '../config/assetProfiles'
import { BRAZIL_HUB_COORDINATES, getExporterCoordinates } from './geo'
import type {
  AssetDiscoveredImage,
  AssetEditableImage,
  AssetGalleryImageConfig,
  AssetImageManifestMap,
  AssetImageMetadata,
  AssetImageMetadataMap,
  AssetOverride,
  AssetOverrideMap,
  AssetRecord,
  Branch,
  CatalogSnapshot,
  DashboardMetrics,
  ExporterFlow,
  SipriOrder,
  TrendPoint,
} from '../types'

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeMediaKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function inferBranch(order: Pick<SipriOrder, 'category' | 'desc' | 'subCategory'>): Branch {
  const detail = `${order.desc} ${order.subCategory ?? ''}`.toLowerCase()
  if (
    order.category === 'Ships' ||
    order.category === 'Naval weapons' ||
    detail.includes('naval') ||
    detail.includes('submarine') ||
    detail.includes('maritime')
  ) {
    return 'Naval'
  }

  if (
    order.category === 'Aircraft' ||
    order.category === 'Sensors' ||
    order.category === 'Engines' ||
    order.category === 'Air-defence systems' ||
    detail.includes('aircraft') ||
    detail.includes('air-search') ||
    detail.includes('helicopter')
  ) {
    return 'Air'
  }

  if (
    order.category === 'Armoured vehicles' ||
    order.category === 'Artillery' ||
    detail.includes('tank') ||
    detail.includes('armoured') ||
    detail.includes('ground')
  ) {
    return 'Land'
  }

  return 'Joint'
}

function classifyStatus(order: SipriOrder): 'Pipeline' | 'Delivered' | 'Transferred' {
  if (!order.deliveryYr || order.deliveryYr === 0 || order.status === 'N') {
    return 'Pipeline'
  }

  if (order.status === 'R') {
    return 'Transferred'
  }

  return 'Delivered'
}

function formatYear(year: number | null) {
  return year && year > 0 ? String(year) : 'Undisclosed'
}

function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

function sumUnits(assetOrders: SipriOrder[]) {
  return assetOrders.reduce((sum, order) => sum + (order.units ?? 0), 0)
}

function buildTimeline(assetOrders: SipriOrder[]) {
  const buckets = new Map<number, number>()

  assetOrders.forEach((order) => {
    const year = order.deliveryYr && order.deliveryYr > 0 ? order.deliveryYr : order.orderYr
    buckets.set(year, (buckets.get(year) ?? 0) + (order.units ?? 1))
  })

  const entries = [...buckets.entries()].sort((left, right) => left[0] - right[0])
  const maxValue = Math.max(...entries.map(([, value]) => value), 1)

  return entries.slice(-8).map(([, value]) => Math.max(16, Math.round((value / maxValue) * 100)))
}

function buildExporterFlows(orders: SipriOrder[]): ExporterFlow[] {
  const exporterMap = new Map<
    string,
    {
      coordinates: [number, number]
      units: number
      records: number
      latestYear: number
      assets: Set<string>
      branches: Set<Branch>
      categories: Set<string>
    }
  >()

  orders.forEach((order) => {
    const coordinates = getExporterCoordinates(order.seller)

    if (!coordinates) {
      return
    }

    const current = exporterMap.get(order.seller) ?? {
      coordinates,
      units: 0,
      records: 0,
      latestYear: 0,
      assets: new Set<string>(),
      branches: new Set<Branch>(),
      categories: new Set<string>(),
    }

    current.units += order.units ?? 1
    current.records += 1
    current.latestYear = Math.max(
      current.latestYear,
      order.deliveryYr && order.deliveryYr > 0 ? order.deliveryYr : order.orderYr,
    )
    current.assets.add(slugify(order.desg || `${order.category}-${order.id}`))
    current.branches.add(inferBranch(order))
    current.categories.add(order.category)

    exporterMap.set(order.seller, current)
  })

  return [...exporterMap.entries()]
    .map(([country, value]) => ({
      country,
      coordinates: value.coordinates,
      destination: BRAZIL_HUB_COORDINATES,
      units: value.units,
      records: value.records,
      assets: value.assets.size,
      latestYear: value.latestYear,
      branches: [...value.branches],
      categories: [...value.categories],
    }))
    .sort((left, right) => right.units - left.units || right.records - left.records)
}

function createAssetFacts(assetOrders: SipriOrder[], suppliers: string[], localInvolvement: boolean) {
  const first = assetOrders[assetOrders.length - 1]
  const latest = assetOrders[0]
  const notes = [
    `First entry in this dataset appears in ${first.orderYr} and the most recent activity lands in ${formatYear(
      latest.deliveryYr && latest.deliveryYr > 0 ? latest.deliveryYr : latest.orderYr,
    )}.`,
    `Supply chain exposure spans ${suppliers.length} partner nation${suppliers.length === 1 ? '' : 's'}.`,
  ]

  if (localInvolvement) {
    notes.push('SIPRI flags local involvement on at least one line item, suggesting domestic industrial participation.')
  }

  const estimatedRows = assetOrders.filter((order) => order.unitsEst || order.orderYrEst || order.statusEst).length
  if (estimatedRows > 0) {
    notes.push(
      `${estimatedRows} line item${estimatedRows === 1 ? '' : 's'} contain estimated fields and should be treated as planning-grade intelligence.`,
    )
  }

  return notes
}

function formatManufacturer(profileManufacturers: string[] | undefined) {
  if (!profileManufacturers || profileManufacturers.length === 0) {
    return 'Undisclosed in SIPRI feed'
  }

  return profileManufacturers.join(', ')
}

function sortOrders(rawOrders: SipriOrder[]) {
  return [...rawOrders].sort((left, right) => {
    const leftYear = left.deliveryYr || left.orderYr
    const rightYear = right.deliveryYr || right.orderYr
    return rightYear - leftYear
  })
}

function findMatchingOverride(asset: Pick<AssetRecord, 'slug' | 'designation'>, overrides: AssetOverrideMap) {
  const direct = overrides[asset.slug]

  if (direct) {
    return direct
  }

  return Object.values(overrides).find((override) => {
    if (override.sourceSlug && override.sourceSlug === asset.slug) {
      return true
    }

    if (override.sourceDesignation && override.sourceDesignation === asset.designation) {
      return true
    }

    return override.sourceDesignations?.includes(asset.designation) ?? false
  })
}

function findMatchingImageMetadata(
  asset: Pick<AssetRecord, 'slug' | 'designation'>,
  imageMetadata: AssetImageMetadataMap,
) {
  const direct = imageMetadata[asset.slug]

  if (direct) {
    return direct
  }

  return Object.values(imageMetadata).find((metadata) => {
    if (metadata.sourceSlug && metadata.sourceSlug === asset.slug) {
      return true
    }

    if (metadata.sourceDesignation && metadata.sourceDesignation === asset.designation) {
      return true
    }

    return metadata.sourceDesignations?.includes(asset.designation) ?? false
  })
}

function buildImageConfig(image: AssetEditableImage | null | undefined): AssetGalleryImageConfig | null {
  if (!image?.src?.trim()) {
    return null
  }

  return {
    title: image.title.trim() || 'Primary image',
    caption: image.caption.trim(),
    alt: image.alt?.trim() || undefined,
    credit: image.credit?.trim() || undefined,
    sourcePageUrl: image.sourcePageUrl?.trim() || undefined,
    sources: [image.src.trim()],
  }
}

function buildGalleryOverride(images: AssetEditableImage[] | undefined): AssetGalleryImageConfig[] | undefined {
  if (!images) {
    return undefined
  }

  return images
    .map((image, index): AssetGalleryImageConfig | null => {
      const source = image.src.trim()
      if (!source) {
        return null
      }

      const nextImage: AssetGalleryImageConfig = {
        title: image.title.trim() || `Gallery image ${index + 1}`,
        caption: image.caption.trim(),
        sources: [source],
      }

      const alt = image.alt?.trim()
      const credit = image.credit?.trim()

      if (alt) {
        nextImage.alt = alt
      }

      if (credit) {
        nextImage.credit = credit
      }

      const sourcePageUrl = image.sourcePageUrl?.trim()
      if (sourcePageUrl) {
        nextImage.sourcePageUrl = sourcePageUrl
      }

      return nextImage
    })
    .filter((image): image is AssetGalleryImageConfig => Boolean(image))
}

function buildAutoImageConfig(asset: AssetRecord, image: AssetDiscoveredImage, index: number): AssetGalleryImageConfig {
  const title = index === 0 ? 'Detected main image' : `Detected image ${image.index}`
  const caption =
    index === 0
      ? `${asset.designation} auto-detected from the gallery images drop folder.`
      : `${asset.designation} additional image auto-detected from the gallery images drop folder.`

  return {
    title,
    caption,
    alt: `${asset.designation} ${title.toLowerCase()}`,
    sources: [image.src],
  }
}

function resolveAutoImages(
  asset: AssetRecord,
  override: AssetOverride | undefined,
  imageManifest: AssetImageManifestMap,
  designation: string,
) {
  const keys = Array.from(
    new Set(
      [
        designation,
        asset.sourceDesignation,
        ...(override?.sourceDesignations ?? []),
        override?.sourceDesignation ?? '',
      ]
        .filter((value): value is string => Boolean(value))
        .map((value) => normalizeMediaKey(value)),
    ),
  )

  const discovered = keys.flatMap((key) => imageManifest[key] ?? [])
  const deduped = discovered.filter(
    (image, index, images) => images.findIndex((candidate) => candidate.src === image.src) === index,
  )

  if (deduped.length === 0) {
    return {
      autoMainImage: null,
      autoGallery: [],
    }
  }

  const sorted = [...deduped].sort((left, right) => left.index - right.index || left.filename.localeCompare(right.filename))
  const autoMainImage = buildAutoImageConfig(asset, sorted[0], 0)
  const autoGallery = sorted.slice(1).map((image, index) => buildAutoImageConfig(asset, image, index + 1))

  return {
    autoMainImage,
    autoGallery,
  }
}

function applyAssetOverride(
  asset: AssetRecord,
  override: AssetOverride | undefined,
  technicalDetails: AssetRecord['technicalDetails'],
) {
  if (!override) {
    return {
      slug: asset.slug,
      designation: asset.designation,
      description: asset.description,
      category: asset.category,
      subCategory: asset.subCategory,
      branch: asset.branch,
      technicalDetails,
      mainImage: undefined,
      galleryOverride: undefined,
    }
  }

  return {
    slug: override.sourceSlug?.trim() || asset.slug,
    designation: override.designation?.trim() || asset.designation,
    description: override.description?.trim() || asset.description,
    category: override.category?.trim() || asset.category,
    subCategory: override.subCategory?.trim() || asset.subCategory,
    branch: override.branch ?? asset.branch,
    technicalDetails:
      override.technicalDetails && override.technicalDetails.length > 0
        ? override.technicalDetails
            .map((detail) => ({
              label: detail.label.trim(),
              value: detail.value.trim(),
            }))
            .filter((detail) => detail.label && detail.value)
        : technicalDetails,
    mainImage: buildImageConfig(override.mainImage),
    galleryOverride: buildGalleryOverride(override.gallery),
  }
}

function applyImageMetadata(asset: AssetRecord, metadata: AssetImageMetadata | undefined) {
  if (!metadata) {
    return {
      mainImage: asset.mainImage,
      galleryOverride: asset.galleryOverride,
    }
  }

  return {
    mainImage: buildImageConfig(metadata.coverImage),
    galleryOverride: buildGalleryOverride(metadata.gallery),
  }
}

export function buildCatalogSnapshot(
  rawOrders: SipriOrder[],
  overrides: AssetOverrideMap = {},
  imageManifest: AssetImageManifestMap = {},
  imageMetadata: AssetImageMetadataMap = {},
): CatalogSnapshot {
  const orders = sortOrders(rawOrders)
  const assetMap = new Map<string, AssetRecord>()

  for (const order of orders) {
    const key = slugify(order.desg || `${order.category}-${order.id}`)
    const current = assetMap.get(key)

    if (!current) {
      assetMap.set(key, {
        slug: key,
        sourceSlug: key,
        designation: order.desg,
        sourceDesignation: order.desg,
        description: order.desc,
        category: order.category,
        subCategory: order.subCategory,
        sourceSubCategory: order.subCategory,
        branch: inferBranch(order),
        suppliers: [order.seller],
        orders: [order],
        totalUnits: order.units ?? 0,
        activeUnits: classifyStatus(order) === 'Pipeline' ? order.units ?? 0 : 0,
        firstOrderYear: order.orderYr,
        latestOrderYear: order.orderYr,
        latestDeliveryYear: order.deliveryYr && order.deliveryYr > 0 ? order.deliveryYr : null,
        latestKnownYear: order.deliveryYr && order.deliveryYr > 0 ? order.deliveryYr : order.orderYr,
        statusCode: classifyStatus(order),
        deliveryStates: {
          Pipeline: classifyStatus(order) === 'Pipeline' ? 1 : 0,
          Delivered: classifyStatus(order) === 'Delivered' ? 1 : 0,
          Transferred: classifyStatus(order) === 'Transferred' ? 1 : 0,
        },
        localInvolvement: Boolean(order.locInvolvement),
        timeline: [],
        factCards: [],
        technicalDetails: [],
        gallery: [],
        manualProfile: assetManualProfiles[key],
        autoMainImage: null,
        autoGallery: [],
      })
      continue
    }

    current.orders.push(order)
    current.suppliers = unique([...current.suppliers, order.seller])
    current.totalUnits += order.units ?? 0
    current.activeUnits += classifyStatus(order) === 'Pipeline' ? order.units ?? 0 : 0
    current.firstOrderYear = Math.min(current.firstOrderYear, order.orderYr)
    current.latestOrderYear = Math.max(current.latestOrderYear, order.orderYr)
    current.latestDeliveryYear =
      order.deliveryYr && order.deliveryYr > 0
        ? Math.max(current.latestDeliveryYear ?? 0, order.deliveryYr)
        : current.latestDeliveryYear
    current.latestKnownYear = Math.max(
      current.latestKnownYear,
      order.deliveryYr && order.deliveryYr > 0 ? order.deliveryYr : order.orderYr,
    )
    current.deliveryStates[classifyStatus(order)] += 1
    current.localInvolvement ||= Boolean(order.locInvolvement)
  }

  const assetCatalog = [...assetMap.values()]
    .map((asset) => {
      const assetOrders = [...asset.orders].sort((left, right) => {
        const leftYear = left.deliveryYr && left.deliveryYr > 0 ? left.deliveryYr : left.orderYr
        const rightYear = right.deliveryYr && right.deliveryYr > 0 ? right.deliveryYr : right.orderYr
        return rightYear - leftYear
      })

      const stateRanking = Object.entries(asset.deliveryStates).sort((left, right) => right[1] - left[1])
      const override = findMatchingOverride(asset, overrides)
      const persistedImageMetadata = findMatchingImageMetadata(asset, imageMetadata)
      const manualProfile = asset.manualProfile ?? assetManualProfiles[asset.slug]
      const seededMerge = applyAssetOverride(asset, override, [])
      const technicalDetails = [
        { label: 'Manufacturer', value: formatManufacturer(manualProfile?.manufacturers) },
        { label: 'Category', value: seededMerge.category },
        { label: 'Sub-category', value: seededMerge.subCategory ?? 'Unspecified' },
        { label: 'Primary branch', value: seededMerge.branch },
        { label: 'Supplier nations', value: asset.suppliers.join(', ') },
        { label: 'Order window', value: `${asset.firstOrderYear} to ${asset.latestOrderYear}` },
        { label: 'Latest delivery marker', value: formatYear(asset.latestDeliveryYear) },
        { label: 'Tracked line items', value: formatCount(assetOrders.length) },
        { label: 'Tracked units', value: formatCount(sumUnits(assetOrders)) },
      ]
      const merged = applyAssetOverride(asset, override, technicalDetails)
      const imageMerge = applyImageMetadata(asset, persistedImageMetadata)
      const autoImages = resolveAutoImages(asset, override, imageManifest, merged.designation)

      return {
        ...asset,
        slug: merged.slug,
        designation: merged.designation,
        description: merged.description,
        category: merged.category,
        subCategory: merged.subCategory,
        branch: merged.branch,
        orders: assetOrders,
        statusCode: (stateRanking[0]?.[0] as AssetRecord['statusCode']) ?? 'Pipeline',
        timeline: buildTimeline(assetOrders),
        factCards: createAssetFacts(assetOrders, asset.suppliers, asset.localInvolvement),
        technicalDetails: merged.technicalDetails,
        gallery: [],
        manualProfile: manualProfile ?? assetManualProfiles[merged.slug],
        mainImage: imageMerge.mainImage ?? merged.mainImage,
        galleryOverride: imageMerge.galleryOverride ?? merged.galleryOverride,
        autoMainImage: autoImages.autoMainImage,
        autoGallery: autoImages.autoGallery,
      }
    })
    .sort((left, right) => right.latestKnownYear - left.latestKnownYear)

  const allUnits = orders.reduce((sum, order) => sum + (order.units ?? 0), 0)
  const activePrograms = assetCatalog.filter((asset) => asset.statusCode === 'Pipeline').length
  const activeUnits = assetCatalog.reduce((sum, asset) => sum + asset.activeUnits, 0)
  const suppliers = unique(orders.map((order) => order.seller)).length
  const latestDeliveryYear = Math.max(...orders.map((order) => order.deliveryYr ?? 0))

  const dashboardMetrics: DashboardMetrics = {
    records: orders.length,
    assets: assetCatalog.length,
    suppliers,
    units: allUnits,
    activePrograms,
    activeUnits,
    latestDeliveryYear,
  }

  const categoryDistribution = [...orders
    .reduce((map, order) => {
      map.set(order.category, (map.get(order.category) ?? 0) + (order.units ?? 0))
      return map
    }, new Map<string, number>())
    .entries()].sort((left, right) => right[1] - left[1])

  const supplierDistribution = [...orders
    .reduce((map, order) => {
      map.set(order.seller, (map.get(order.seller) ?? 0) + (order.units ?? 0))
      return map
    }, new Map<string, number>())
    .entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)

  const pulseTimeline: TrendPoint[] = (() => {
    const now = new Date().getFullYear()
    const start = now - 11
    const yearMap = new Map<number, number>()

    orders.forEach((order) => {
      const year = order.deliveryYr && order.deliveryYr > 0 ? order.deliveryYr : order.orderYr
      if (year >= start) {
        yearMap.set(year, (yearMap.get(year) ?? 0) + (order.units ?? 1))
      }
    })

    return Array.from({ length: 12 }, (_, index) => start + index).map((year) => ({
      year,
      count: yearMap.get(year) ?? 0,
    }))
  })()

  return {
    orders,
    assetCatalog,
    dashboardMetrics,
    categoryDistribution,
    supplierDistribution,
    exporterFlows: buildExporterFlows(orders),
    pulseTimeline,
  }
}

export function findAssetBySlug(snapshot: CatalogSnapshot, slug: string) {
  return snapshot.assetCatalog.find((asset) => asset.slug === slug)
}
