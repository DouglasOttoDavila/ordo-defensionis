import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Layers3, Plus, RefreshCcw, Save, Shield, Sparkles, Trash2 } from 'lucide-react'
import { useCatalog } from '../context/CatalogContext'
import { getAssetGalleryConfig, getAssetMainImageConfig } from '../lib/media'
import type {
  AssetAiGenerationPayload,
  AssetAiGenerationResult,
  AssetAiSuggestedOverride,
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
  }
}

function imageDraftFromConfig(config: ReturnType<typeof getAssetMainImageConfig>, fallbackTitle: string) {
  return {
    title: config?.title ?? fallbackTitle,
    caption: config?.caption ?? '',
    src: config?.sources[0] ?? '',
    alt: config?.alt ?? '',
    credit: config?.credit ?? '',
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

  return [image.title, image.src, image.caption].filter(Boolean).join(' | ') || 'empty'
}

function summarizeGallery(images: AssetEditableImage[]) {
  if (images.length === 0) {
    return 'empty'
  }

  return images
    .map((image) => [image.title, image.src].filter(Boolean).join(' | '))
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
  }
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
  const { snapshot, overrides, overrideStorage, loading, error, refresh, saveOverride, resetOverride } = useCatalog()
  const [search, setSearch] = useState('')
  const [selectedSlug, setSelectedSlug] = useState('')
  const [draft, setDraft] = useState<AssetEditorDraft | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiChangeNotes, setAiChangeNotes] = useState<AiChangeNotes>({})
  const [aiSuggestedOverrides, setAiSuggestedOverrides] = useState<AssetAiSuggestedOverride[]>([])
  const [aiSources, setAiSources] = useState<AssetReferenceLink[]>([])
  const [aiNotes, setAiNotes] = useState<string | null>(null)
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
      return
    }

    setDraft(createDraft(selectedAsset))
    setStatusMessage(null)
    setAiChangeNotes({})
    setAiSuggestedOverrides([])
    setAiSources([])
    setAiNotes(null)
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

  async function handleSave() {
    if (!selectedAsset || !draft) {
      return
    }

    setSaving(true)
    setStatusMessage(null)

    try {
      await saveOverride(selectedAsset.slug, toOverridePayload(selectedAsset, draft, overrides[selectedAsset.slug]))
      setStatusMessage(`Saved persisted override for ${selectedAsset.slug}.`)
    } catch (saveError) {
      setStatusMessage(saveError instanceof Error ? saveError.message : 'Failed to save persisted override.')
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
      await resetOverride(selectedAsset.slug)
      setStatusMessage(`Removed persisted override for ${selectedAsset.slug}.`)
    } catch (resetError) {
      setStatusMessage(resetError instanceof Error ? resetError.message : 'Failed to reset persisted override.')
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
              override registry. Technical rows and imagery remain session-local unless you model
              them in a separate metadata layer.
            </p>
            <div className="hero__actions">
              <span className="status-tag status-tag--accent">{overrideStorage?.provider ?? 'loading storage'}</span>
              <span className="micro-label">{overrideStorage?.target ?? 'resolving storage target'}</span>
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
                Persisted overrides
              </span>
              <div className="metric-card__value">{Object.keys(overrides).length}</div>
              <div className="metric-card__delta">{overrideStorage?.label ?? 'resolving persisted store'}</div>
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
                  <span className="micro-label">{overrides[asset.slug] ? 'override active' : asset.branch}</span>
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
                        Refresh-safe fields: name, description, branch, category and sub-category.
                      </p>
                    </div>
                    <div className="admin-actions">
                      <span className={hasLocalOverride ? 'status-tag status-tag--accent' : 'status-tag'}>
                        {hasLocalOverride ? 'override active' : 'using live default'}
                      </span>
                      <button
                        className="button button--ghost"
                        disabled={generatingAi || saving}
                        onClick={() => void handleGenerateWithAi()}
                        type="button"
                      >
                        <Sparkles size={16} aria-hidden="true" />
                        {generatingAi ? 'Researching with AI' : 'Generate with AI'}
                      </button>
                      <button className="button button--primary" disabled={saving || generatingAi} onClick={() => void handleSave()} type="button">
                        <Save size={16} aria-hidden="true" />
                        Save persisted override
                      </button>
                      <button className="button button--ghost" disabled={saving || generatingAi || !hasLocalOverride} onClick={() => void handleReset()} type="button">
                        <Trash2 size={16} aria-hidden="true" />
                        Reset override
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
                        <p className="panel__copy">Use a local public path or remote image URL. This does not persist after refresh.</p>
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
                        Save as many rows as you need. Empty image paths are ignored, and the gallery resets on refresh.
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
                            <img alt={image.alt || image.title} src={image.src} />
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
