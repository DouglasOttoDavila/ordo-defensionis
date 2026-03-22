import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, ImagePlus, Layers3, Plus, RefreshCcw, Save, Shield, Sparkles, Trash2 } from 'lucide-react'
import { useCatalog } from '../context/CatalogContext'
import { getAssetGalleryConfig, getAssetMainImageConfig } from '../lib/media'
import type {
  AssetAiGenerationPayload,
  AssetAiGenerationResult,
  AssetAiSuggestedOverride,
  AssetImageCandidate,
  AssetImageMetadata,
  AssetImageSuggestionPayload,
  AssetImageSuggestionResult,
  AssetEditableDraft,
  AssetEditableImage,
  AssetOverride,
  AssetRecord,
  AssetReferenceLink,
  AssetSpecField,
  Branch,
} from '../types'

const branchOptions: Branch[] = ['Air', 'Land', 'Naval', 'Joint']
type AssetEditorDraft = AssetEditableDraft
type AiFieldKey = 'designation' | 'description' | 'branch' | 'category' | 'subCategory' | 'technicalDetails' | 'mainImage' | 'gallery'
type AiChangeNotes = Partial<Record<AiFieldKey, string>>

function emptyDetail(): AssetSpecField {
  return { label: '', value: '' }
}

function emptyImage(title = 'Gallery image'): AssetEditableImage {
  return {
    title,
    caption: '',
    src: '',
    alt: '',
    credit: '',
    sourcePageUrl: '',
  }
}

function imageDraftFromConfig(config: ReturnType<typeof getAssetMainImageConfig>, fallbackTitle: string) {
  return {
    title: config?.title ?? fallbackTitle,
    caption: config?.caption ?? '',
    src: config?.sources[0] ?? '',
    alt: config?.alt ?? '',
    credit: config?.credit ?? '',
    sourcePageUrl: config?.sourcePageUrl ?? '',
  }
}

function createDraft(asset: AssetRecord): AssetEditorDraft {
  const gallery = getAssetGalleryConfig(asset)

  return {
    designation: asset.designation,
    description: asset.description,
    branch: asset.branch,
    category: asset.category,
    subCategory: asset.subCategory ?? '',
    technicalDetails: asset.technicalDetails.length > 0 ? asset.technicalDetails : [emptyDetail()],
    mainImage: imageDraftFromConfig(getAssetMainImageConfig(asset), 'Main image'),
    gallery: gallery.length > 0 ? gallery.map((item) => imageDraftFromConfig(item, item.title)) : [emptyImage()],
  }
}

function summarizeDetails(details: AssetSpecField[]) {
  return details
    .map((detail) => `${detail.label}: ${detail.value}`)
    .join(' | ')
}

function summarizeImage(image: AssetEditableImage | null) {
  if (!image) {
    return 'empty'
  }

  return [image.title, image.src, image.caption, image.sourcePageUrl].filter(Boolean).join(' | ') || 'empty'
}

function summarizeGallery(images: AssetEditableImage[]) {
  if (images.length === 0) {
    return 'empty'
  }

  return images
    .map((image) => [image.title, image.src, image.sourcePageUrl].filter(Boolean).join(' | '))
    .join(' || ')
}

function trimNote(value: string, maxLength = 180) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`
}

function previousValueNote(value: string) {
  return trimNote(value || 'empty')
}

function normalizeGeneratedImage(image: AssetEditableImage | null | undefined) {
  if (!image) {
    return null
  }

  return {
    title: image.title?.trim() || 'Image',
    caption: image.caption?.trim() || '',
    src: image.src?.trim() || '',
    alt: image.alt?.trim() || '',
    credit: image.credit?.trim() || '',
    sourcePageUrl: image.sourcePageUrl?.trim() || '',
  }
}

function buildAiImageSuggestionPayload(asset: AssetRecord): AssetImageSuggestionPayload {
  return {
    asset: {
      slug: asset.slug,
      designation: asset.designation,
      sourceDesignation: asset.sourceDesignation,
      description: asset.description,
      branch: asset.branch,
      category: asset.category,
      subCategory: asset.subCategory,
      suppliers: asset.suppliers,
      manufacturers: asset.manualProfile?.manufacturers,
    },
  }
}

async function fetchAiImageSuggestions(payload: AssetImageSuggestionPayload) {
  const response = await fetch('/api/ai/suggest-asset-images', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const body = (await response.json()) as AssetImageSuggestionResult | { error?: string }

  if (!response.ok) {
    throw new Error('error' in body && body.error ? body.error : `AI image suggestion failed with ${response.status}`)
  }

  return body as AssetImageSuggestionResult
}

function candidateToEditableImage(candidate: AssetImageCandidate, title: string) {
  return {
    title,
    caption: candidate.caption ?? '',
    src: candidate.imageUrl,
    alt: candidate.alt ?? '',
    credit: candidate.credit ?? '',
    sourcePageUrl: candidate.sourcePageUrl,
  }
}

function buildAiRequestPayload(asset: AssetRecord, draft: AssetEditorDraft): AssetAiGenerationPayload {
  return {
    asset: {
      slug: asset.slug,
      designation: asset.designation,
      sourceDesignation: asset.sourceDesignation,
      description: asset.description,
      branch: asset.branch,
      category: asset.category,
      subCategory: asset.subCategory,
      suppliers: asset.suppliers,
      technicalDetails: asset.technicalDetails,
      recentOrders: asset.orders.slice(0, 8).map((order) => ({
        seller: order.seller,
        orderYr: order.orderYr,
        deliveryYr: order.deliveryYr,
        units: order.units,
        status: order.status,
      })),
      manualProfile: asset.manualProfile
        ? {
            tagline: asset.manualProfile.tagline,
            summary: asset.manualProfile.summary,
            role: asset.manualProfile.role,
            operatorFit: asset.manualProfile.operatorFit,
            manufacturers: asset.manualProfile.manufacturers,
          }
        : undefined,
    },
    currentDraft: draft,
    branchOptions,
  }
}

async function fetchAiDraft(payload: AssetAiGenerationPayload) {
  const response = await fetch('/api/ai/generate-asset-draft', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const body = (await response.json()) as AssetAiGenerationResult | { error?: string }

  if (!response.ok) {
    throw new Error('error' in body && body.error ? body.error : `AI generation failed with ${response.status}`)
  }

  return body as AssetAiGenerationResult
}

function applyAiDraft(current: AssetEditorDraft, generated: AssetAiGenerationResult) {
  const nextDraft: AssetEditorDraft = {
    ...current,
    mainImage: { ...current.mainImage },
    gallery: [...current.gallery],
    technicalDetails: [...current.technicalDetails],
  }
  const changeNotes: AiChangeNotes = {}

  if (generated.draft.designation && generated.draft.designation.trim() !== current.designation.trim()) {
    changeNotes.designation = previousValueNote(current.designation.trim())
    nextDraft.designation = generated.draft.designation.trim()
  }

  if (generated.draft.description && generated.draft.description.trim() !== current.description.trim()) {
    changeNotes.description = previousValueNote(current.description.trim())
    nextDraft.description = generated.draft.description.trim()
  }

  if (generated.draft.branch && generated.draft.branch !== current.branch) {
    changeNotes.branch = previousValueNote(current.branch)
    nextDraft.branch = generated.draft.branch
  }

  if (generated.draft.category && generated.draft.category.trim() !== current.category.trim()) {
    changeNotes.category = previousValueNote(current.category.trim())
    nextDraft.category = generated.draft.category.trim()
  }

  if (
    typeof generated.draft.subCategory === 'string' &&
    generated.draft.subCategory.trim() !== current.subCategory.trim()
  ) {
    changeNotes.subCategory = previousValueNote(current.subCategory.trim())
    nextDraft.subCategory = generated.draft.subCategory.trim()
  }

  if (generated.draft.technicalDetails && generated.draft.technicalDetails.length > 0) {
    const currentSummary = summarizeDetails(current.technicalDetails)
    const nextSummary = summarizeDetails(generated.draft.technicalDetails)

    if (nextSummary && nextSummary !== currentSummary) {
      changeNotes.technicalDetails = previousValueNote(currentSummary)
      nextDraft.technicalDetails = generated.draft.technicalDetails
    }
  }

  const generatedMainImage = normalizeGeneratedImage(generated.draft.mainImage)
  if (generatedMainImage) {
    const currentSummary = summarizeImage(current.mainImage)
    const nextSummary = summarizeImage(generatedMainImage)

    if (nextSummary !== currentSummary) {
      changeNotes.mainImage = previousValueNote(currentSummary)
      nextDraft.mainImage = generatedMainImage
    }
  }

  if (generated.draft.gallery && generated.draft.gallery.length > 0) {
    const nextGallery = generated.draft.gallery.map((image) => normalizeGeneratedImage(image)).filter(Boolean) as AssetEditableImage[]
    const currentSummary = summarizeGallery(current.gallery)
    const nextSummary = summarizeGallery(nextGallery)

    if (nextGallery.length > 0 && nextSummary !== currentSummary) {
      changeNotes.gallery = previousValueNote(currentSummary)
      nextDraft.gallery = nextGallery
    }
  }

  return {
    draft: nextDraft,
    changeNotes,
  }
}

function FieldChangeNote({ note }: { note?: string }) {
  if (!note) {
    return null
  }

  return <small className="field-change-note">Previous: {note}</small>
}

function normalizeDetails(details: AssetSpecField[]) {
  return details
    .map((detail) => ({
      label: detail.label.trim(),
      value: detail.value.trim(),
    }))
    .filter((detail) => detail.label && detail.value)
}

function normalizeImage(image: AssetEditableImage): AssetEditableImage | null {
  const src = image.src.trim()

  if (!src) {
    return null
  }

  return {
    title: image.title.trim() || 'Image',
    caption: image.caption.trim(),
    src,
    alt: image.alt?.trim() ?? '',
    credit: image.credit?.trim() ?? '',
    sourcePageUrl: image.sourcePageUrl?.trim() ?? '',
  }
}

function toImageMetadataPayload(
  asset: AssetRecord,
  draft: AssetEditorDraft,
  existingMetadata?: AssetImageMetadata,
): Omit<AssetImageMetadata, 'slug'> {
  const baseDraft = createDraft(asset)
  const coverImage = normalizeImage(draft.mainImage)
  const normalizedGallery = draft.gallery.map(normalizeImage).filter((image): image is AssetEditableImage => Boolean(image))
  const sourceDesignations = Array.from(
    new Set([
      asset.sourceDesignation,
      ...(existingMetadata?.sourceDesignations ?? []),
      existingMetadata?.sourceDesignation ?? '',
    ].filter(Boolean)),
  )

  return {
    sourceSlug: existingMetadata?.sourceSlug ?? asset.sourceSlug ?? asset.slug,
    sourceDesignation: existingMetadata?.sourceDesignation ?? asset.sourceDesignation,
    sourceDesignations,
    coverImage: summarizeImage(baseDraft.mainImage) === summarizeImage(draft.mainImage) ? null : coverImage,
    gallery: summarizeGallery(baseDraft.gallery) === summarizeGallery(draft.gallery) ? [] : normalizedGallery,
  }
}

function haveDraftImagesChanged(asset: AssetRecord, draft: AssetEditorDraft) {
  const baseDraft = createDraft(asset)
  return (
    summarizeImage(baseDraft.mainImage) !== summarizeImage(draft.mainImage) ||
    summarizeGallery(baseDraft.gallery) !== summarizeGallery(draft.gallery)
  )
}

function toOverridePayload(asset: AssetRecord, draft: AssetEditorDraft, existingOverride?: AssetOverride): Omit<AssetOverride, 'slug'> {
  const sourceDesignations = Array.from(
    new Set([
      asset.sourceDesignation,
      ...(existingOverride?.sourceDesignations ?? []),
      existingOverride?.sourceDesignation ?? '',
    ].filter(Boolean)),
  )

  return {
    sourceSlug: existingOverride?.sourceSlug ?? asset.sourceSlug ?? asset.slug,
    sourceDesignation: existingOverride?.sourceDesignation ?? asset.sourceDesignation,
    sourceDesignations,
    designation: draft.designation.trim(),
    description: draft.description.trim(),
    branch: draft.branch,
    category: draft.category.trim(),
    subCategory: draft.subCategory.trim(),
    technicalDetails: normalizeDetails(draft.technicalDetails),
    mainImage: normalizeImage(draft.mainImage),
    gallery: draft.gallery.map(normalizeImage).filter((image): image is AssetEditableImage => Boolean(image)),
  }
}

function EditorLoadingState() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__brand">
          <div className="brand-mark">
            <Shield size={22} aria-hidden="true" />
          </div>
          <div className="title-lockup">
            <p className="eyebrow">Asset admin</p>
            <strong>ORDO DEFENSIONIS</strong>
            <span>Loading editable registry</span>
          </div>
        </div>
      </header>
      <div className="empty-state">
        <RefreshCcw size={32} aria-hidden="true" />
        <strong>Loading override registry.</strong>
        <p>The admin page is waiting for the live catalog and persisted correction layer.</p>
      </div>
    </div>
  )
}

export function AdminPage() {
  const {
    snapshot,
    overrides,
    imageMetadata,
    overrideStorage,
    imageStorage,
    loading,
    error,
    refresh,
    saveOverride,
    resetOverride,
    saveImageMetadata,
    resetImageMetadata,
  } = useCatalog()
  const [search, setSearch] = useState('')
  const [selectedSlug, setSelectedSlug] = useState('')
  const [draft, setDraft] = useState<AssetEditorDraft | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [suggestingImages, setSuggestingImages] = useState(false)
  const [aiChangeNotes, setAiChangeNotes] = useState<AiChangeNotes>({})
  const [aiSuggestedOverrides, setAiSuggestedOverrides] = useState<AssetAiSuggestedOverride[]>([])
  const [aiSources, setAiSources] = useState<AssetReferenceLink[]>([])
  const [aiNotes, setAiNotes] = useState<string | null>(null)
  const [aiImageCandidates, setAiImageCandidates] = useState<AssetImageCandidate[]>([])
  const [aiImageSources, setAiImageSources] = useState<AssetReferenceLink[]>([])
  const [aiImageNotes, setAiImageNotes] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)

  const filteredAssets = useMemo(() => {
    if (!snapshot) {
      return []
    }

    const query = deferredSearch.trim().toLowerCase()

    return snapshot.assetCatalog.filter((asset) => {
      if (!query) {
        return true
      }

      return (
        asset.designation.toLowerCase().includes(query) ||
        asset.description.toLowerCase().includes(query) ||
        asset.category.toLowerCase().includes(query) ||
        asset.slug.toLowerCase().includes(query)
      )
    })
  }, [deferredSearch, snapshot])

  useEffect(() => {
    if (filteredAssets.length === 0) {
      setSelectedSlug('')
      return
    }

    if (!selectedSlug || !filteredAssets.some((asset) => asset.slug === selectedSlug)) {
      setSelectedSlug(filteredAssets[0].slug)
    }
  }, [filteredAssets, selectedSlug])

  const selectedAsset = useMemo(() => {
    if (!selectedSlug) {
      return null
    }

    return filteredAssets.find((asset) => asset.slug === selectedSlug) ?? null
  }, [filteredAssets, selectedSlug])

  useEffect(() => {
    if (!selectedAsset) {
      setDraft(null)
      setAiChangeNotes({})
      setAiSuggestedOverrides([])
      setAiSources([])
      setAiNotes(null)
      setAiImageCandidates([])
      setAiImageSources([])
      setAiImageNotes(null)
      return
    }

    setDraft(createDraft(selectedAsset))
    setStatusMessage(null)
    setAiChangeNotes({})
    setAiSuggestedOverrides([])
    setAiSources([])
    setAiNotes(null)
    setAiImageCandidates([])
    setAiImageSources([])
    setAiImageNotes(null)
  }, [selectedAsset])

  if (loading && !snapshot) {
    return <EditorLoadingState />
  }

  if (!snapshot) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar__brand">
            <div className="brand-mark">
              <Shield size={22} aria-hidden="true" />
            </div>
            <div className="title-lockup">
              <p className="eyebrow">Asset admin</p>
              <strong>ORDO DEFENSIONIS</strong>
              <span>Editor unavailable</span>
            </div>
          </div>
          <button className="button button--ghost" onClick={() => void refresh(true)} type="button">
            <RefreshCcw size={16} aria-hidden="true" />
            Retry load
          </button>
        </header>
        <div className="empty-state">
          <Shield size={32} aria-hidden="true" />
          <strong>Catalog load failed.</strong>
          <p>{error ?? 'Unknown editor error.'}</p>
        </div>
      </div>
    )
  }

  const hasLocalOverride = selectedAsset ? Boolean(overrides[selectedAsset.slug]) : false
  const hasLocalImageMetadata = selectedAsset ? Boolean(imageMetadata[selectedAsset.slug]) : false
  const hasPersistedCustomization = hasLocalOverride || hasLocalImageMetadata

  async function handleSave() {
    if (!selectedAsset || !draft) {
      return
    }

    setSaving(true)
    setStatusMessage(null)

    try {
      const tasks: Promise<void>[] = [
        saveOverride(selectedAsset.slug, toOverridePayload(selectedAsset, draft, overrides[selectedAsset.slug])),
      ]

      if (haveDraftImagesChanged(selectedAsset, draft)) {
        const metadataPayload = toImageMetadataPayload(selectedAsset, draft, imageMetadata[selectedAsset.slug])
        const hasPersistableImages = Boolean(metadataPayload.coverImage) || (metadataPayload.gallery?.length ?? 0) > 0

        if (hasPersistableImages) {
          tasks.push(saveImageMetadata(selectedAsset.slug, metadataPayload))
        } else if (imageMetadata[selectedAsset.slug]) {
          tasks.push(resetImageMetadata(selectedAsset.slug))
        }
      }

      await Promise.all(tasks)
      setStatusMessage(`Saved persisted changes for ${selectedAsset.slug}.`)
    } catch (saveError) {
      setStatusMessage(saveError instanceof Error ? saveError.message : 'Failed to save persisted asset changes.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!selectedAsset) {
      return
    }

    setSaving(true)
    setStatusMessage(null)

    try {
      const tasks: Promise<void>[] = []

      if (hasLocalOverride) {
        tasks.push(resetOverride(selectedAsset.slug))
      }

      if (hasLocalImageMetadata) {
        tasks.push(resetImageMetadata(selectedAsset.slug))
      }

      await Promise.all(tasks)
      setStatusMessage(`Removed persisted customizations for ${selectedAsset.slug}.`)
    } catch (resetError) {
      setStatusMessage(resetError instanceof Error ? resetError.message : 'Failed to reset persisted asset customizations.')
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateWithAi() {
    if (!selectedAsset || !draft) {
      return
    }

    setGeneratingAi(true)
    setStatusMessage(null)

    try {
      const result = await fetchAiDraft(buildAiRequestPayload(selectedAsset, draft))
      const applied = applyAiDraft(draft, result)
      const changedFields = Object.keys(applied.changeNotes).length

      setDraft(applied.draft)
      setAiChangeNotes(applied.changeNotes)
      setAiSuggestedOverrides(result.draft.suggestedOverrides ?? [])
      setAiSources(result.sources)
      setAiNotes(result.draft.notes ?? null)
      setStatusMessage(
        changedFields > 0
          ? `AI draft applied locally across ${changedFields} field${changedFields === 1 ? '' : 's'}. Review before saving.`
          : 'AI research completed, but no stronger field updates were applied locally.',
      )
    } catch (generationError) {
      setStatusMessage(generationError instanceof Error ? generationError.message : 'AI generation failed.')
    } finally {
      setGeneratingAi(false)
    }
  }

  async function handleSuggestImagesWithAi() {
    if (!selectedAsset) {
      return
    }

    setSuggestingImages(true)
    setStatusMessage(null)

    try {
      const result = await fetchAiImageSuggestions(buildAiImageSuggestionPayload(selectedAsset))
      setAiImageCandidates(result.candidates)
      setAiImageSources(result.sources)
      setAiImageNotes(result.notes ?? null)
      setStatusMessage(
        result.candidates.length > 0
          ? `AI image research returned ${result.candidates.length} candidate image${result.candidates.length === 1 ? '' : 's'}. Review and pick before saving.`
          : 'AI image research completed, but no reliable image candidates were extracted.',
      )
    } catch (suggestionError) {
      setStatusMessage(suggestionError instanceof Error ? suggestionError.message : 'AI image suggestion failed.')
    } finally {
      setSuggestingImages(false)
    }
  }

  function applyCoverCandidate(candidate: AssetImageCandidate) {
    if (!draft) {
      return
    }

    setAiChangeNotes((current) => ({
      ...current,
      mainImage: current.mainImage ?? previousValueNote(summarizeImage(draft.mainImage)),
    }))
    setDraft((current) =>
      current
        ? {
            ...current,
            mainImage: candidateToEditableImage(candidate, 'Selected cover image'),
            gallery: current.gallery.filter((image) => image.src.trim() !== candidate.imageUrl),
          }
        : current,
    )
  }

  function addGalleryCandidate(candidate: AssetImageCandidate) {
    if (!draft) {
      return
    }

    if (draft.gallery.some((image) => image.src.trim() === candidate.imageUrl)) {
      return
    }

    const baseDraft = selectedAsset ? createDraft(selectedAsset) : null
    const useFreshGallery =
      !hasLocalImageMetadata && baseDraft ? summarizeGallery(baseDraft.gallery) === summarizeGallery(draft.gallery) : false
    const nextCandidate = candidateToEditableImage(candidate, `Selected gallery image 1`)

    setAiChangeNotes((current) => ({
      ...current,
      gallery: current.gallery || previousValueNote(summarizeGallery(draft.gallery)),
    }))
    setDraft((current) =>
      current
        ? {
            ...current,
            gallery: useFreshGallery
              ? [nextCandidate]
              : [
                  ...current.gallery.filter((image) => image.src.trim()),
                  candidateToEditableImage(
                    candidate,
                    `Selected gallery image ${current.gallery.filter((image) => image.src.trim()).length + 1}`,
                  ),
                ],
          }
        : current,
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__brand">
          <div className="brand-mark">
            <Shield size={22} aria-hidden="true" />
          </div>
          <div className="title-lockup">
            <p className="eyebrow">Asset admin</p>
            <strong>ORDO DEFENSIONIS</strong>
            <span>Hosted override editor for refresh-safe asset corrections</span>
          </div>
        </div>
        <div className="topbar__meta">
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

      <section className="hero">
        <div className="hero__grid">
          <div>
            <p className="eyebrow">Override storage</p>
            <h1 className="hero__title">Asset Override Console</h1>
            <p className="hero__lede">
              Edit naming and taxonomy without touching the upstream SIPRI feed. On refresh, only
              name, description, branch, category and sub-category stay pinned to the persisted
              override registry. Approved cover and gallery images persist in a separate image
              metadata layer, while technical rows remain session-local.
            </p>
            <div className="hero__actions">
              <span className="status-tag status-tag--accent">{overrideStorage?.provider ?? 'loading storage'}</span>
              <span className="micro-label">{overrideStorage?.target ?? 'resolving storage target'}</span>
              <span className="micro-label">{imageStorage?.target ?? 'resolving image storage target'}</span>
            </div>
          </div>

          <div className="hero-grid">
            <article className="metric-card">
              <span className="metric-card__label">
                <Layers3 size={16} aria-hidden="true" />
                Editable assets
              </span>
              <div className="metric-card__value">{filteredAssets.length}</div>
              <div className="metric-card__delta">current search window</div>
            </article>
            <article className="metric-card">
              <span className="metric-card__label">
                <Shield size={16} aria-hidden="true" />
                Persisted text overrides
              </span>
              <div className="metric-card__value">{Object.keys(overrides).length}</div>
              <div className="metric-card__delta">{overrideStorage?.label ?? 'resolving persisted store'}</div>
            </article>
            <article className="metric-card">
              <span className="metric-card__label">
                <ImagePlus size={16} aria-hidden="true" />
                Persisted image sets
              </span>
              <div className="metric-card__value">{Object.keys(imageMetadata).length}</div>
              <div className="metric-card__delta">{imageStorage?.label ?? 'resolving image metadata store'}</div>
            </article>
          </div>
        </div>
      </section>

      <main className="dashboard">
        <section className="admin-shell">
          <aside className="panel admin-sidebar">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Asset selection</p>
                <h2 className="panel__title">Registry editor</h2>
                <p className="panel__copy">Select a platform, then edit the persisted override layer.</p>
              </div>
            </div>

            <label className="field">
              <Layers3 size={16} aria-hidden="true" />
              <span className="visually-hidden">Search asset registry</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search slug, name, category"
              />
            </label>

            <div className="admin-list">
              {filteredAssets.map((asset) => (
                <button
                  className={`admin-list__item${asset.slug === selectedSlug ? ' admin-list__item--active' : ''}`}
                  key={asset.slug}
                  onClick={() => setSelectedSlug(asset.slug)}
                  type="button"
                >
                  <div>
                    <strong>{asset.designation}</strong>
                    <span>{asset.category}</span>
                  </div>
                  <span className="micro-label">
                    {overrides[asset.slug] || imageMetadata[asset.slug] ? 'customized' : asset.branch}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className="admin-editor">
            {!selectedAsset || !draft ? (
              <div className="empty-state">
                <Shield size={32} aria-hidden="true" />
                <strong>No asset selected.</strong>
                <p>Pick an asset from the left panel to open its editor.</p>
              </div>
            ) : (
              <>
                <section className="panel">
                  <div className="panel__header">
                    <div>
                      <p className="eyebrow">Editing asset</p>
                      <h2 className="panel__title">{selectedAsset.designation}</h2>
                      <p className="panel__copy">
                        Stable slug: <code>{selectedAsset.slug}</code>. Original source name:{' '}
                        <code>{selectedAsset.sourceDesignation}</code>.
                      </p>
                      <p className="panel__copy">
                        Refresh-safe text fields: name, description, branch, category and sub-category.
                      </p>
                    </div>
                    <div className="admin-actions">
                      <span className={hasPersistedCustomization ? 'status-tag status-tag--accent' : 'status-tag'}>
                        {hasPersistedCustomization ? 'persisted customization active' : 'using live default'}
                      </span>
                      <button
                        className="button button--ghost"
                        disabled={generatingAi || suggestingImages || saving}
                        onClick={() => void handleGenerateWithAi()}
                        type="button"
                      >
                        <Sparkles size={16} aria-hidden="true" />
                        {generatingAi ? 'Researching with AI' : 'Generate with AI'}
                      </button>
                      <button
                        className="button button--ghost"
                        disabled={generatingAi || suggestingImages || saving}
                        onClick={() => void handleSuggestImagesWithAi()}
                        type="button"
                      >
                        <ImagePlus size={16} aria-hidden="true" />
                        {suggestingImages ? 'Finding images' : 'Suggest images'}
                      </button>
                      <button className="button button--primary" disabled={saving || generatingAi || suggestingImages} onClick={() => void handleSave()} type="button">
                        <Save size={16} aria-hidden="true" />
                        Save persisted changes
                      </button>
                      <button className="button button--ghost" disabled={saving || generatingAi || suggestingImages || !hasPersistedCustomization} onClick={() => void handleReset()} type="button">
                        <Trash2 size={16} aria-hidden="true" />
                        Reset persisted changes
                      </button>
                    </div>
                  </div>

                  {statusMessage ? <p className="admin-note">{statusMessage}</p> : null}

                  <div className="admin-form-grid">
                    <label className="admin-field">
                      <span>Name</span>
                      <FieldChangeNote note={aiChangeNotes.designation} />
                      <input
                        value={draft.designation}
                        onChange={(event) => setDraft((current) => current ? { ...current, designation: event.target.value } : current)}
                      />
                    </label>
                    <label className="admin-field">
                      <span>Branch</span>
                      <FieldChangeNote note={aiChangeNotes.branch} />
                      <select
                        value={draft.branch}
                        onChange={(event) =>
                          setDraft((current) =>
                            current ? { ...current, branch: event.target.value as Branch } : current,
                          )
                        }
                      >
                        {branchOptions.map((branch) => (
                          <option key={branch} value={branch}>
                            {branch}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-field">
                      <span>Category</span>
                      <FieldChangeNote note={aiChangeNotes.category} />
                      <input
                        value={draft.category}
                        onChange={(event) => setDraft((current) => current ? { ...current, category: event.target.value } : current)}
                      />
                    </label>
                    <label className="admin-field">
                      <span>Sub-category</span>
                      <FieldChangeNote note={aiChangeNotes.subCategory} />
                      <input
                        value={draft.subCategory}
                        onChange={(event) =>
                          setDraft((current) => current ? { ...current, subCategory: event.target.value } : current)
                        }
                      />
                    </label>
                    <label className="admin-field admin-field--wide">
                      <span>Description</span>
                      <FieldChangeNote note={aiChangeNotes.description} />
                      <textarea
                        rows={4}
                        value={draft.description}
                        onChange={(event) => setDraft((current) => current ? { ...current, description: event.target.value } : current)}
                      />
                    </label>
                  </div>
                </section>

                {(aiSuggestedOverrides.length > 0 || aiSources.length > 0 || aiNotes) ? (
                  <section className="panel">
                    <div className="panel__header">
                      <div>
                        <p className="eyebrow">AI review layer</p>
                        <h2 className="panel__title">Suggested overrides</h2>
                        <p className="panel__copy">
                          Generated values are applied only to the local draft. Review sources and save manually if they look correct.
                        </p>
                      </div>
                      <span className="status-tag status-tag--accent">
                        <Sparkles size={14} aria-hidden="true" />
                        grounded draft
                      </span>
                    </div>

                    {aiNotes ? <p className="admin-note">{aiNotes}</p> : null}

                    {aiSuggestedOverrides.length > 0 ? (
                      <div className="array-list">
                        {aiSuggestedOverrides.map((item) => (
                          <article className="array-item" key={`${item.field}-${item.suggestedValue}`}>
                            <strong>{item.field}</strong>
                            <p className="panel__copy">Suggested label: {item.suggestedValue}</p>
                            <p className="panel__copy">{item.reason}</p>
                          </article>
                        ))}
                      </div>
                    ) : null}

                    {aiSources.length > 0 ? (
                      <div className="admin-source-list">
                        {aiSources.map((source) => (
                          <a className="admin-source-card" href={source.url} key={source.url} rel="noreferrer" target="_blank">
                            <strong>{source.label}</strong>
                            <span>{source.url}</span>
                            {source.note ? <small>{source.note}</small> : null}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}

                {(aiImageCandidates.length > 0 || aiImageSources.length > 0 || aiImageNotes) ? (
                  <section className="panel">
                    <div className="panel__header">
                      <div>
                        <p className="eyebrow">AI image review</p>
                        <h2 className="panel__title">Suggested asset imagery</h2>
                        <p className="panel__copy">
                          Review grounded image candidates, choose one for the cover slot, and add any additional picks to the gallery before saving.
                        </p>
                      </div>
                      <span className="status-tag status-tag--accent">
                        <ImagePlus size={14} aria-hidden="true" />
                        image candidates
                      </span>
                    </div>

                    {aiImageNotes ? <p className="admin-note">{aiImageNotes}</p> : null}

                    {aiImageCandidates.length > 0 ? (
                      <div className="admin-image-candidate-grid">
                        {aiImageCandidates.map((candidate) => (
                          <article className="admin-image-candidate" key={candidate.id}>
                            <div className="image-preview image-preview--gallery admin-image-candidate__preview">
                              <img alt={candidate.alt || candidate.sourceTitle} src={candidate.thumbnailUrl || candidate.imageUrl} />
                            </div>
                            <div className="admin-image-candidate__body">
                              <strong>{candidate.sourceTitle}</strong>
                              <span>{candidate.sourceDomain}</span>
                              <p className="panel__copy">{candidate.reason}</p>
                              <small>Confidence: {Math.round(candidate.confidence * 100)}%</small>
                              <div className="admin-image-candidate__actions">
                                <button className="button button--primary" onClick={() => applyCoverCandidate(candidate)} type="button">
                                  Set as cover
                                </button>
                                <button className="button button--ghost" onClick={() => addGalleryCandidate(candidate)} type="button">
                                  Add to gallery
                                </button>
                                <a className="button button--ghost" href={candidate.sourcePageUrl} rel="noreferrer" target="_blank">
                                  <ExternalLink size={14} aria-hidden="true" />
                                  Open source
                                </a>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : null}

                    {aiImageSources.length > 0 ? (
                      <div className="admin-source-list">
                        {aiImageSources.map((source) => (
                          <a className="admin-source-card" href={source.url} key={source.url} rel="noreferrer" target="_blank">
                            <strong>{source.label}</strong>
                            <span>{source.url}</span>
                            {source.note ? <small>{source.note}</small> : null}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}

                <section className="panel-grid">
                  <article className="panel">
                    <div className="panel__header">
                      <div>
                        <p className="eyebrow">Technical data</p>
                        <h2 className="panel__title">Editable detail rows</h2>
                        <p className="panel__copy">These rows are session-local only and reset on the next refresh.</p>
                        <FieldChangeNote note={aiChangeNotes.technicalDetails} />
                      </div>
                      <button
                        className="button button--ghost"
                        onClick={() =>
                          setDraft((current) =>
                            current
                              ? { ...current, technicalDetails: [...current.technicalDetails, emptyDetail()] }
                              : current,
                          )
                        }
                        type="button"
                      >
                        <Plus size={16} aria-hidden="true" />
                        Add row
                      </button>
                    </div>

                    <div className="array-list">
                      {draft.technicalDetails.map((detail, index) => (
                        <div className="array-item" key={`detail-${index}`}>
                          <div className="array-item__grid">
                            <label className="admin-field">
                              <span>Label</span>
                              <input
                                value={detail.label}
                                onChange={(event) =>
                                  setDraft((current) => {
                                    if (!current) {
                                      return current
                                    }

                                    const technicalDetails = [...current.technicalDetails]
                                    technicalDetails[index] = { ...technicalDetails[index], label: event.target.value }
                                    return { ...current, technicalDetails }
                                  })
                                }
                              />
                            </label>
                            <label className="admin-field">
                              <span>Value</span>
                              <input
                                value={detail.value}
                                onChange={(event) =>
                                  setDraft((current) => {
                                    if (!current) {
                                      return current
                                    }

                                    const technicalDetails = [...current.technicalDetails]
                                    technicalDetails[index] = { ...technicalDetails[index], value: event.target.value }
                                    return { ...current, technicalDetails }
                                  })
                                }
                              />
                            </label>
                          </div>
                          <button
                            className="button button--ghost"
                            onClick={() =>
                              setDraft((current) => {
                                if (!current) {
                                  return current
                                }

                                const technicalDetails = current.technicalDetails.filter((_, itemIndex) => itemIndex !== index)
                                return {
                                  ...current,
                                  technicalDetails: technicalDetails.length > 0 ? technicalDetails : [emptyDetail()],
                                }
                              })
                            }
                            type="button"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="panel">
                    <div className="panel__header">
                      <div>
                        <p className="eyebrow">Main image</p>
                        <h2 className="panel__title">Primary visual slot</h2>
                        <p className="panel__copy">
                          Use a local public path or remote image URL. If you save the asset now, the approved image selection persists in the dedicated image metadata layer.
                        </p>
                        <FieldChangeNote note={aiChangeNotes.mainImage} />
                      </div>
                    </div>

                    <div className="admin-form-grid">
                      <label className="admin-field admin-field--wide">
                        <span>Image URL or public path</span>
                        <input
                          placeholder="/assets/gallery/gripen-e/hero.webp"
                          value={draft.mainImage.src}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? { ...current, mainImage: { ...current.mainImage, src: event.target.value } }
                                : current,
                            )
                          }
                        />
                      </label>
                      <label className="admin-field">
                        <span>Title</span>
                        <input
                          value={draft.mainImage.title}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? { ...current, mainImage: { ...current.mainImage, title: event.target.value } }
                                : current,
                            )
                          }
                        />
                      </label>
                      <label className="admin-field">
                        <span>Alt text</span>
                        <input
                          value={draft.mainImage.alt}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? { ...current, mainImage: { ...current.mainImage, alt: event.target.value } }
                                : current,
                            )
                          }
                        />
                      </label>
                      <label className="admin-field admin-field--wide">
                        <span>Caption</span>
                        <textarea
                          rows={3}
                          value={draft.mainImage.caption}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? { ...current, mainImage: { ...current.mainImage, caption: event.target.value } }
                                : current,
                            )
                          }
                        />
                      </label>
                      <label className="admin-field">
                        <span>Credit</span>
                        <input
                          value={draft.mainImage.credit}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? { ...current, mainImage: { ...current.mainImage, credit: event.target.value } }
                                : current,
                            )
                          }
                        />
                      </label>
                    </div>

                    {draft.mainImage.sourcePageUrl ? (
                      <a className="admin-source-inline" href={draft.mainImage.sourcePageUrl} rel="noreferrer" target="_blank">
                        <ExternalLink size={14} aria-hidden="true" />
                        Open retained source page
                      </a>
                    ) : null}

                    <div className="image-preview">
                      {draft.mainImage.src ? (
                        <img alt={draft.mainImage.alt || draft.mainImage.title} src={draft.mainImage.src} />
                      ) : (
                        <div className="image-preview__empty">
                          <ImagePlus size={22} aria-hidden="true" />
                          <span>No primary image configured</span>
                        </div>
                      )}
                    </div>
                  </article>
                </section>

                <section className="panel">
                  <div className="panel__header">
                    <div>
                      <p className="eyebrow">Photo gallery</p>
                      <h2 className="panel__title">Add and remove gallery images</h2>
                      <p className="panel__copy">
                        Save as many rows as you need. Empty image paths are ignored. Saved gallery picks now persist through the separate image metadata layer.
                      </p>
                      <FieldChangeNote note={aiChangeNotes.gallery} />
                    </div>
                    <button
                      className="button button--ghost"
                      onClick={() =>
                        setDraft((current) =>
                          current ? { ...current, gallery: [...current.gallery, emptyImage()] } : current,
                        )
                      }
                      type="button"
                    >
                      <Plus size={16} aria-hidden="true" />
                      Add image
                    </button>
                  </div>

                  <div className="array-list">
                    {draft.gallery.map((image, index) => (
                      <div className="array-item" key={`gallery-${index}`}>
                        <div className="array-item__grid array-item__grid--gallery">
                          <label className="admin-field admin-field--wide">
                            <span>Image URL or public path</span>
                            <input
                              placeholder="/assets/gallery/gripen-e/02-detail.webp"
                              value={image.src}
                              onChange={(event) =>
                                setDraft((current) => {
                                  if (!current) {
                                    return current
                                  }

                                  const gallery = [...current.gallery]
                                  gallery[index] = { ...gallery[index], src: event.target.value }
                                  return { ...current, gallery }
                                })
                              }
                            />
                          </label>
                          <label className="admin-field">
                            <span>Title</span>
                            <input
                              value={image.title}
                              onChange={(event) =>
                                setDraft((current) => {
                                  if (!current) {
                                    return current
                                  }

                                  const gallery = [...current.gallery]
                                  gallery[index] = { ...gallery[index], title: event.target.value }
                                  return { ...current, gallery }
                                })
                              }
                            />
                          </label>
                          <label className="admin-field">
                            <span>Alt text</span>
                            <input
                              value={image.alt}
                              onChange={(event) =>
                                setDraft((current) => {
                                  if (!current) {
                                    return current
                                  }

                                  const gallery = [...current.gallery]
                                  gallery[index] = { ...gallery[index], alt: event.target.value }
                                  return { ...current, gallery }
                                })
                              }
                            />
                          </label>
                          <label className="admin-field admin-field--wide">
                            <span>Caption</span>
                            <textarea
                              rows={3}
                              value={image.caption}
                              onChange={(event) =>
                                setDraft((current) => {
                                  if (!current) {
                                    return current
                                  }

                                  const gallery = [...current.gallery]
                                  gallery[index] = { ...gallery[index], caption: event.target.value }
                                  return { ...current, gallery }
                                })
                              }
                            />
                          </label>
                          <label className="admin-field">
                            <span>Credit</span>
                            <input
                              value={image.credit}
                              onChange={(event) =>
                                setDraft((current) => {
                                  if (!current) {
                                    return current
                                  }

                                  const gallery = [...current.gallery]
                                  gallery[index] = { ...gallery[index], credit: event.target.value }
                                  return { ...current, gallery }
                                })
                              }
                            />
                          </label>
                        </div>

                        <div className="image-preview image-preview--gallery">
                          {image.src ? (
                            <>
                              <img alt={image.alt || image.title} src={image.src} />
                              {image.sourcePageUrl ? (
                                <a className="admin-source-inline admin-source-inline--overlay" href={image.sourcePageUrl} rel="noreferrer" target="_blank">
                                  <ExternalLink size={14} aria-hidden="true" />
                                  Source
                                </a>
                              ) : null}
                            </>
                          ) : (
                            <div className="image-preview__empty">
                              <ImagePlus size={22} aria-hidden="true" />
                              <span>Image preview appears when a path is set</span>
                            </div>
                          )}
                        </div>

                        <button
                          className="button button--ghost"
                          onClick={() =>
                            setDraft((current) => {
                              if (!current) {
                                return current
                              }

                              const gallery = current.gallery.filter((_, imageIndex) => imageIndex !== index)
                              return { ...current, gallery: gallery.length > 0 ? gallery : [emptyImage()] }
                            })
                          }
                          type="button"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                          Remove image
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </section>
        </section>
      </main>
    </div>
  )
}
