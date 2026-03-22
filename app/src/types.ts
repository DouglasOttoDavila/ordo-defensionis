export type Branch = 'Air' | 'Land' | 'Naval' | 'Joint'

export interface SipriOrder {
  id: number
  tradeId: number
  buyer: string
  seller: string
  orderYr: number
  orderYrEst?: boolean
  units?: number
  unitsEst?: boolean
  deliveryYr?: number
  status?: string
  statusEst?: boolean
  locInvolvement?: number
  transferType?: number
  reason1700?: number
  desg: string
  desc: string
  category: string
  subCategory?: string
}

export interface AssetRecord {
  slug: string
  sourceSlug: string
  designation: string
  sourceDesignation: string
  description: string
  category: string
  subCategory?: string
  sourceSubCategory?: string
  branch: Branch
  suppliers: string[]
  orders: SipriOrder[]
  totalUnits: number
  activeUnits: number
  firstOrderYear: number
  latestOrderYear: number
  latestDeliveryYear: number | null
  latestKnownYear: number
  statusCode: 'Pipeline' | 'Delivered' | 'Transferred'
  deliveryStates: Record<'Pipeline' | 'Delivered' | 'Transferred', number>
  localInvolvement: boolean
  timeline: number[]
  factCards: string[]
  technicalDetails: Array<{ label: string; value: string }>
  gallery: Array<{ title: string; caption: string }>
  manualProfile?: AssetManualProfile
  mainImage?: AssetGalleryImageConfig | null
  galleryOverride?: AssetGalleryImageConfig[]
  autoMainImage?: AssetGalleryImageConfig | null
  autoGallery?: AssetGalleryImageConfig[]
}

export interface DashboardMetrics {
  records: number
  assets: number
  suppliers: number
  units: number
  activePrograms: number
  activeUnits: number
  latestDeliveryYear: number
}

export interface TrendPoint {
  year: number
  count: number
}

export interface ExporterFlow {
  country: string
  coordinates: [number, number]
  destination: [number, number]
  units: number
  records: number
  assets: number
  latestYear: number
  branches: Branch[]
  categories: string[]
}

export interface CatalogSnapshot {
  orders: SipriOrder[]
  assetCatalog: AssetRecord[]
  dashboardMetrics: DashboardMetrics
  categoryDistribution: Array<[string, number]>
  supplierDistribution: Array<[string, number]>
  exporterFlows: ExporterFlow[]
  pulseTimeline: TrendPoint[]
}

export interface SipriProxyMeta {
  source: string
  fetchedAt: string | null
  stale: boolean
  count: number
  warning?: string
}

export interface SipriProxyResponse {
  records: SipriOrder[]
  meta: SipriProxyMeta
}

export interface AssetIconConfig {
  alt?: string
  sources: string[]
}

export interface AssetGalleryImageConfig {
  title: string
  caption: string
  alt?: string
  credit?: string
  sourcePageUrl?: string
  sources: string[]
}

export interface AssetEditableImage {
  title: string
  caption: string
  src: string
  alt?: string
  credit?: string
  sourcePageUrl?: string
}

export interface AssetEditableDraft {
  designation: string
  description: string
  branch: Branch
  category: string
  subCategory: string
  technicalDetails: AssetSpecField[]
  mainImage: AssetEditableImage
  gallery: AssetEditableImage[]
}

export interface AssetDiscoveredImage {
  filename: string
  index: number
  src: string
}

export interface AssetMediaConfig {
  icon?: AssetIconConfig
  gallery?: AssetGalleryImageConfig[]
}

export interface AssetSpecField {
  label: string
  value: string
}

export interface AssetReferenceLink {
  label: string
  url: string
  note?: string
}

export interface AssetImageCandidate {
  id: string
  imageUrl: string
  thumbnailUrl?: string
  sourcePageUrl: string
  sourceTitle: string
  sourceDomain: string
  caption?: string
  alt?: string
  credit?: string
  confidence: number
  reason: string
  suggestedRole?: 'cover' | 'gallery'
}

export interface AssetAiSuggestedOverride {
  field: string
  suggestedValue: string
  reason: string
}

export interface AssetAiDraft {
  designation?: string
  description?: string
  branch?: Branch | null
  category?: string
  subCategory?: string
  technicalDetails?: AssetSpecField[]
  mainImage?: AssetEditableImage | null
  gallery?: AssetEditableImage[]
  suggestedOverrides?: AssetAiSuggestedOverride[]
  notes?: string
}

export interface AssetAiGenerationPayload {
  asset: {
    slug: string
    designation: string
    sourceDesignation: string
    description: string
    branch: Branch
    category: string
    subCategory?: string
    suppliers: string[]
    technicalDetails: AssetSpecField[]
    recentOrders: Array<{
      seller: string
      orderYr: number
      deliveryYr?: number
      units?: number
      status?: string
    }>
    manualProfile?: {
      tagline: string
      summary: string
      role: string
      operatorFit: string
      manufacturers?: string[]
    }
  }
  currentDraft: AssetEditableDraft
  branchOptions: Branch[]
}

export interface AssetAiGenerationResult {
  draft: AssetAiDraft
  sources: AssetReferenceLink[]
  searchQueries: string[]
  model: string
  grounded: boolean
}

export interface AssetImageSuggestionPayload {
  asset: {
    slug: string
    designation: string
    sourceDesignation: string
    description: string
    branch: Branch
    category: string
    subCategory?: string
    suppliers: string[]
    manufacturers?: string[]
  }
}

export interface AssetImageSuggestionResult {
  candidates: AssetImageCandidate[]
  sources: AssetReferenceLink[]
  searchQueries: string[]
  notes?: string
  model: string
  grounded: boolean
}

export interface AssetOverride {
  slug: string
  sourceSlug?: string
  sourceDesignation?: string
  sourceDesignations?: string[]
  designation?: string
  description?: string
  branch?: Branch
  category?: string
  subCategory?: string
  technicalDetails?: AssetSpecField[]
  mainImage?: AssetEditableImage | null
  gallery?: AssetEditableImage[]
}

export type AssetOverrideMap = Record<string, AssetOverride>

export interface AssetImageMetadata {
  slug: string
  sourceSlug?: string
  sourceDesignation?: string
  sourceDesignations?: string[]
  coverImage?: AssetEditableImage | null
  gallery?: AssetEditableImage[]
}

export type AssetImageMetadataMap = Record<string, AssetImageMetadata>

export type AssetImageManifestMap = Record<string, AssetDiscoveredImage[]>

export interface AssetOverrideStorageMeta {
  provider: 'local-json' | 'supabase'
  label: string
  target: string
}

export interface AssetManualProfile {
  tagline: string
  summary: string
  role: string
  operatorFit: string
  manufacturers?: string[]
  specs: AssetSpecField[]
  missionSystems: string[]
  programNotes: string[]
  curiosities: string[]
  references: AssetReferenceLink[]
}
