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
  overrideStorage: AssetOverrideStorageMeta | null
  loading: boolean
  error: string | null
  refresh: (force?: boolean) => Promise<void>
  saveOverride: (slug: string, override: Omit<AssetOverride, 'slug'>) => Promise<void>
  resetOverride: (slug: string) => Promise<void>
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

export function CatalogProvider({ children }: PropsWithChildren) {
  const [records, setRecords] = useState<SipriOrder[]>([])
  const [meta, setMeta] = useState<SipriProxyMeta | null>(null)
  const [overrides, setOverrides] = useState<AssetOverrideMap>({})
  const [overrideStorage, setOverrideStorage] = useState<AssetOverrideStorageMeta | null>(null)
  const [assetImages, setAssetImages] = useState<AssetImageManifestMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load(force = false) {
    setLoading(true)
    setError(null)

    try {
      const [payload, overridePayload, imagePayload] = await Promise.all([
        fetchSipriProxy(force),
        fetchAssetOverrides(),
        fetchAssetImages(),
      ])
      const persistedOverrides = sanitizePersistedOverrides(overridePayload.overrides)

      startTransition(() => {
        setRecords(payload.records)
        setMeta(payload.meta)
        setOverrides(persistedOverrides)
        setOverrideStorage(overridePayload.storage)
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

    return buildCatalogSnapshot(records, overrides, assetImages)
  }, [records, overrides, assetImages])

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

  const value = useMemo<CatalogContextValue>(
    () => ({
      snapshot,
      meta,
      overrides,
      overrideStorage,
      loading,
      error,
      refresh: load,
      saveOverride,
      resetOverride,
    }),
    [snapshot, meta, overrides, overrideStorage, loading, error],
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
