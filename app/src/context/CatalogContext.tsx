import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { buildCatalogSnapshot } from '../lib/catalog'
import type {
  AssetImageManifestMap,
  AssetImageMetadata,
  AssetImageMetadataMap,
  AssetOverride,
  AssetOverrideMap,
  AssetOverrideStorageMeta,
  CatalogSnapshot,
  SipriOrder,
  SipriProxyMeta,
  SipriProxyResponse,
} from '../types'

interface CatalogContextValue {
  snapshot: CatalogSnapshot | null
  meta: SipriProxyMeta | null
  overrides: AssetOverrideMap
  imageMetadata: AssetImageMetadataMap
  overrideStorage: AssetOverrideStorageMeta | null
  imageStorage: AssetOverrideStorageMeta | null
  loading: boolean
  error: string | null
  refresh: (force?: boolean) => Promise<void>
  saveOverride: (slug: string, override: Omit<AssetOverride, 'slug'>) => Promise<void>
  resetOverride: (slug: string) => Promise<void>
  saveImageMetadata: (slug: string, metadata: Omit<AssetImageMetadata, 'slug'>) => Promise<void>
  resetImageMetadata: (slug: string) => Promise<void>
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

async function fetchSipriProxy(force = false) {
  const suffix = force ? '?refresh=1' : ''
  const response = await fetch(`/api/sipri/orders${suffix}`)

  if (!response.ok) {
    throw new Error(`Proxy request failed with ${response.status}`)
  }

  return (await response.json()) as SipriProxyResponse
}

async function fetchAssetOverrides() {
  const response = await fetch('/api/asset-overrides')

  if (!response.ok) {
    throw new Error(`Override request failed with ${response.status}`)
  }

  return (await response.json()) as {
    overrides: AssetOverrideMap
    storage: AssetOverrideStorageMeta
  }
}

async function fetchAssetImageMetadata() {
  const response = await fetch('/api/asset-image-metadata')

  if (!response.ok) {
    throw new Error(`Image metadata request failed with ${response.status}`)
  }

  return (await response.json()) as {
    imageMetadata: AssetImageMetadataMap
    storage: AssetOverrideStorageMeta
  }
}

async function putAssetOverride(slug: string, override: Omit<AssetOverride, 'slug'>) {
  const response = await fetch(`/api/asset-overrides/${slug}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(override),
  })

  if (!response.ok) {
    throw new Error(`Override save failed with ${response.status}`)
  }

  return (await response.json()) as {
    override: AssetOverride
    storage: AssetOverrideStorageMeta
  }
}

async function fetchAssetImages() {
  const response = await fetch('/api/asset-images')

  if (!response.ok) {
    throw new Error(`Asset image request failed with ${response.status}`)
  }

  return (await response.json()) as { images: AssetImageManifestMap }
}

async function putAssetImageMetadata(slug: string, metadata: Omit<AssetImageMetadata, 'slug'>) {
  const response = await fetch(`/api/asset-image-metadata/${slug}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(metadata),
  })

  if (!response.ok) {
    throw new Error(`Image metadata save failed with ${response.status}`)
  }

  return (await response.json()) as {
    imageMetadata: AssetImageMetadata
    storage: AssetOverrideStorageMeta
  }
}

async function deleteAssetOverride(slug: string) {
  const response = await fetch(`/api/asset-overrides/${slug}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Override delete failed with ${response.status}`)
  }

  return (await response.json()) as {
    ok: true
    slug: string
    storage: AssetOverrideStorageMeta
  }
}

async function deleteAssetImageMetadata(slug: string) {
  const response = await fetch(`/api/asset-image-metadata/${slug}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Image metadata delete failed with ${response.status}`)
  }

  return (await response.json()) as {
    ok: true
    slug: string
    storage: AssetOverrideStorageMeta
  }
}

function sanitizePersistedOverrides(overrides: AssetOverrideMap) {
  return Object.fromEntries(
    Object.entries(overrides).map(([slug, override]) => [
      slug,
      {
        slug,
        sourceSlug: override.sourceSlug,
        sourceDesignation: override.sourceDesignation,
        sourceDesignations: override.sourceDesignations,
        designation: override.designation,
        description: override.description,
        branch: override.branch,
        category: override.category,
        subCategory: override.subCategory,
      } satisfies AssetOverride,
    ]),
  ) as AssetOverrideMap
}

function sanitizePersistedImageMetadata(imageMetadata: AssetImageMetadataMap) {
  return Object.fromEntries(
    Object.entries(imageMetadata).map(([slug, metadata]) => [
      slug,
      {
        slug,
        sourceSlug: metadata.sourceSlug,
        sourceDesignation: metadata.sourceDesignation,
        sourceDesignations: metadata.sourceDesignations,
        coverImage: metadata.coverImage,
        gallery: metadata.gallery,
      } satisfies AssetImageMetadata,
    ]),
  ) as AssetImageMetadataMap
}

export function CatalogProvider({ children }: PropsWithChildren) {
  const [records, setRecords] = useState<SipriOrder[]>([])
  const [meta, setMeta] = useState<SipriProxyMeta | null>(null)
  const [overrides, setOverrides] = useState<AssetOverrideMap>({})
  const [imageMetadata, setImageMetadata] = useState<AssetImageMetadataMap>({})
  const [overrideStorage, setOverrideStorage] = useState<AssetOverrideStorageMeta | null>(null)
  const [imageStorage, setImageStorage] = useState<AssetOverrideStorageMeta | null>(null)
  const [assetImages, setAssetImages] = useState<AssetImageManifestMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load(force = false) {
    setLoading(true)
    setError(null)

    try {
      const [payload, overridePayload, imageMetadataPayload, imagePayload] = await Promise.all([
        fetchSipriProxy(force),
        fetchAssetOverrides(),
        fetchAssetImageMetadata(),
        fetchAssetImages(),
      ])
      const persistedOverrides = sanitizePersistedOverrides(overridePayload.overrides)
      const persistedImageMetadata = sanitizePersistedImageMetadata(imageMetadataPayload.imageMetadata)

      startTransition(() => {
        setRecords(payload.records)
        setMeta(payload.meta)
        setOverrides(persistedOverrides)
        setOverrideStorage(overridePayload.storage)
        setImageMetadata(persistedImageMetadata)
        setImageStorage(imageMetadataPayload.storage)
        setAssetImages(imagePayload.images)
      })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load SIPRI data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const snapshot = useMemo<CatalogSnapshot | null>(() => {
    if (records.length === 0) {
      return null
    }

    return buildCatalogSnapshot(records, overrides, assetImages, imageMetadata)
  }, [records, overrides, assetImages, imageMetadata])

  async function saveOverride(slug: string, override: Omit<AssetOverride, 'slug'>) {
    const payload = await putAssetOverride(slug, override)

    startTransition(() => {
      setOverrides((current) => ({
        ...current,
        [slug]: {
          ...override,
          ...payload.override,
          slug,
        },
      }))
      setOverrideStorage(payload.storage)
    })
  }

  async function resetOverride(slug: string) {
    const payload = await deleteAssetOverride(slug)

    startTransition(() => {
      setOverrides((current) => {
        const next = { ...current }
        delete next[slug]
        return next
      })
      setOverrideStorage(payload.storage)
    })
  }

  async function saveImageMetadata(slug: string, metadata: Omit<AssetImageMetadata, 'slug'>) {
    const payload = await putAssetImageMetadata(slug, metadata)

    startTransition(() => {
      setImageMetadata((current) => ({
        ...current,
        [slug]: {
          ...metadata,
          ...payload.imageMetadata,
          slug,
        },
      }))
      setImageStorage(payload.storage)
    })
  }

  async function resetImageMetadata(slug: string) {
    const payload = await deleteAssetImageMetadata(slug)

    startTransition(() => {
      setImageMetadata((current) => {
        const next = { ...current }
        delete next[slug]
        return next
      })
      setImageStorage(payload.storage)
    })
  }

  const value = useMemo<CatalogContextValue>(
    () => ({
      snapshot,
      meta,
      overrides,
      imageMetadata,
      overrideStorage,
      imageStorage,
      loading,
      error,
      refresh: load,
      saveOverride,
      resetOverride,
      saveImageMetadata,
      resetImageMetadata,
    }),
    [snapshot, meta, overrides, imageMetadata, overrideStorage, imageStorage, loading, error],
  )

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const context = useContext(CatalogContext)

  if (!context) {
    throw new Error('useCatalog must be used within CatalogProvider')
  }

  return context
}
