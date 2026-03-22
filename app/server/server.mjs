import 'dotenv/config'
import { createServer } from 'node:http'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT || 8787)
const snapshotPath = resolve(__dirname, '../src/data/sipri-brazil-orders.json')
const overrideStorePath = resolve(__dirname, './data/asset-overrides.json')
const imageMetadataStorePath = resolve(__dirname, './data/asset-image-metadata.json')
const autoImagesPath = resolve(__dirname, '../public/assets/gallery/images')
const autoImagesBaseUrl = '/assets/gallery/images'
const upstreamUrl = 'https://atbackend.sipri.org/api/p/trades/search'
const cacheTtlMs = 1000 * 60 * 10
const supportedImageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg'])
const supportedBranches = new Set(['Air', 'Land', 'Naval', 'Joint'])
const supabaseUrl = process.env.SUPABASE_URL?.trim()
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const geminiApiKey = process.env.GEMINI_API_KEY?.trim()
const geminiModel = (process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash').replace(/^models\//, '')
const geminiBaseUrl = process.env.GEMINI_API_BASE_URL?.trim() || 'https://generativelanguage.googleapis.com/v1beta'
const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

const localOverrideStorageMeta = {
  provider: 'local-json',
  label: 'Local JSON fallback',
  target: 'server/data/asset-overrides.json',
}

const supabaseOverrideStorageMeta = {
  provider: 'supabase',
  label: 'Supabase remote table',
  target: 'public.asset_overrides',
}

const localImageMetadataStorageMeta = {
  provider: 'local-json',
  label: 'Local image metadata JSON',
  target: 'server/data/asset-image-metadata.json',
}

const aiGenerationMeta = {
  provider: 'gemini',
  model: geminiModel,
  enabled: Boolean(geminiApiKey),
}

const payload = {
  filters: [
    {
      field: 'Recipient',
      oldField: '',
      condition: 'contains',
      value1: '',
      value2: '',
      listData: [1050387],
    },
    {
      field: 'UNROCA',
      value1: false,
    },
  ],
  logic: 'AND',
  sorts: {
    deliveryYr: 'DESC',
  },
}

let cachedRecords = null
let cachedAt = 0

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type',
  })
  response.end(JSON.stringify(body))
}

function normalizeMediaKey(value) {
  return value
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function parseJsonFile(path, fallback) {
  try {
    const content = await readFile(path, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return fallback
    }

    throw error
  }
}

async function readSnapshot() {
  return parseJsonFile(snapshotPath, [])
}

async function writeSnapshot(records) {
  await mkdir(dirname(snapshotPath), { recursive: true })
  await writeFile(snapshotPath, `${JSON.stringify(records, null, 2)}\n`, 'utf8')
}

async function readOverrides() {
  const rawOverrides = await parseJsonFile(overrideStorePath, {})

  return Object.fromEntries(
    Object.entries(rawOverrides).map(([slug, override]) => [slug, sanitizePersistedOverride(slug, override)]),
  )
}

async function writeOverrides(overrides) {
  await mkdir(dirname(overrideStorePath), { recursive: true })
  await writeFile(overrideStorePath, `${JSON.stringify(overrides, null, 2)}\n`, 'utf8')
}

async function readImageMetadata() {
  const rawMetadata = await parseJsonFile(imageMetadataStorePath, {})

  return Object.fromEntries(
    Object.entries(rawMetadata).map(([slug, metadata]) => [slug, sanitizePersistedImageMetadata(slug, metadata)]),
  )
}

async function writeImageMetadata(imageMetadata) {
  await mkdir(dirname(imageMetadataStorePath), { recursive: true })
  await writeFile(imageMetadataStorePath, `${JSON.stringify(imageMetadata, null, 2)}\n`, 'utf8')
}

function sanitizeString(value) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed || undefined
}

function sanitizeStringArray(values) {
  if (!Array.isArray(values)) {
    return []
  }

  return [...new Set(values.map(sanitizeString).filter(Boolean))]
}

function sanitizeBranch(value) {
  return supportedBranches.has(value) ? value : undefined
}

function sanitizeUrl(value) {
  const next = sanitizeString(value)

  if (!next) {
    return undefined
  }

  if (next.startsWith('/')) {
    return next
  }

  try {
    const parsed = new URL(next)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return next
    }
  } catch {}

  return undefined
}

function sanitizeEditableImage(image) {
  if (!image || typeof image !== 'object') {
    return null
  }

  const title = sanitizeString(image.title) ?? 'Image'
  const caption = sanitizeString(image.caption) ?? ''
  const src = sanitizeUrl(image.src) ?? ''
  const alt = sanitizeString(image.alt) ?? ''
  const credit = sanitizeString(image.credit) ?? ''
  const sourcePageUrl = sanitizeUrl(image.sourcePageUrl)

  if (!title && !caption && !src && !alt && !credit && !sourcePageUrl) {
    return null
  }

  const nextImage = {
    title,
    caption,
    src,
    alt,
    credit,
  }

  if (sourcePageUrl) {
    nextImage.sourcePageUrl = sourcePageUrl
  }

  return nextImage
}

function sanitizeTechnicalDetails(details) {
  if (!Array.isArray(details)) {
    return []
  }

  return details
    .map((detail) => {
      if (!detail || typeof detail !== 'object') {
        return null
      }

      const label = sanitizeString(detail.label)
      const value = sanitizeString(detail.value)

      if (!label || !value) {
        return null
      }

      return { label, value }
    })
    .filter(Boolean)
    .slice(0, 12)
}

function sanitizeSuggestedOverrides(suggestions) {
  if (!Array.isArray(suggestions)) {
    return []
  }

  return suggestions
    .map((suggestion) => {
      if (!suggestion || typeof suggestion !== 'object') {
        return null
      }

      const field = sanitizeString(suggestion.field)
      const suggestedValue = sanitizeString(suggestion.suggestedValue)
      const reason = sanitizeString(suggestion.reason)

      if (!field || !suggestedValue || !reason) {
        return null
      }

      return { field, suggestedValue, reason }
    })
    .filter(Boolean)
    .slice(0, 8)
}

function sanitizeSourceLinks(sources) {
  if (!Array.isArray(sources)) {
    return []
  }

  return sources
    .map((source) => {
      if (!source || typeof source !== 'object') {
        return null
      }

      const label = sanitizeString(source.label) || sanitizeString(source.title)
      const url = sanitizeUrl(source.url)
      const note = sanitizeString(source.note)

      if (!label || !url) {
        return null
      }

      const nextSource = { label, url }
      if (note) {
        nextSource.note = note
      }

      return nextSource
    })
    .filter(Boolean)
    .slice(0, 10)
}

function sanitizeImageCandidates(candidates) {
  if (!Array.isArray(candidates)) {
    return []
  }

  return candidates
    .map((candidate) => {
      if (!candidate || typeof candidate !== 'object') {
        return null
      }

      const id = sanitizeString(candidate.id)
      const imageUrl = sanitizeUrl(candidate.imageUrl)
      const thumbnailUrl = sanitizeUrl(candidate.thumbnailUrl)
      const sourcePageUrl = sanitizeUrl(candidate.sourcePageUrl)
      const sourceTitle = sanitizeString(candidate.sourceTitle)
      const sourceDomain = sanitizeString(candidate.sourceDomain)
      const caption = sanitizeString(candidate.caption)
      const alt = sanitizeString(candidate.alt)
      const credit = sanitizeString(candidate.credit)
      const reason = sanitizeString(candidate.reason)
      const suggestedRole = sanitizeString(candidate.suggestedRole)
      const confidence = Number(candidate.confidence)

      if (!id || !imageUrl || !sourcePageUrl || !sourceTitle || !sourceDomain || !reason) {
        return null
      }

      const nextCandidate = {
        id,
        imageUrl,
        sourcePageUrl,
        sourceTitle,
        sourceDomain,
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
        reason,
      }

      if (thumbnailUrl) {
        nextCandidate.thumbnailUrl = thumbnailUrl
      }

      if (caption) {
        nextCandidate.caption = caption
      }

      if (alt) {
        nextCandidate.alt = alt
      }

      if (credit) {
        nextCandidate.credit = credit
      }

      if (suggestedRole === 'cover' || suggestedRole === 'gallery') {
        nextCandidate.suggestedRole = suggestedRole
      }

      return nextCandidate
    })
    .filter(Boolean)
    .slice(0, 12)
}

function sanitizeAiDraftResponse(payload, branchOptions) {
  const draft = payload?.draft && typeof payload.draft === 'object' ? payload.draft : {}
  const branch = sanitizeBranch(draft.branch)

  return {
    draft: {
      designation: sanitizeString(draft.designation),
      description: sanitizeString(draft.description),
      branch: branch && branchOptions.includes(branch) ? branch : null,
      category: sanitizeString(draft.category),
      subCategory: sanitizeString(draft.subCategory),
      technicalDetails: sanitizeTechnicalDetails(draft.technicalDetails),
      mainImage: sanitizeEditableImage(draft.mainImage),
      gallery: Array.isArray(draft.gallery)
        ? draft.gallery.map(sanitizeEditableImage).filter(Boolean).slice(0, 6)
        : [],
      suggestedOverrides: sanitizeSuggestedOverrides(draft.suggestedOverrides),
      notes: sanitizeString(draft.notes),
    },
    sources: sanitizeSourceLinks(payload?.sources),
    searchQueries: Array.isArray(payload?.searchQueries)
      ? payload.searchQueries.map(sanitizeString).filter(Boolean).slice(0, 8)
      : [],
  }
}

function sanitizeAiImageSuggestionResponse(payload) {
  return {
    candidates: sanitizeImageCandidates(payload?.candidates),
    sources: sanitizeSourceLinks(payload?.sources),
    searchQueries: Array.isArray(payload?.searchQueries)
      ? payload.searchQueries.map(sanitizeString).filter(Boolean).slice(0, 8)
      : [],
    notes: sanitizeString(payload?.notes),
  }
}

function extractGroundingSources(candidate) {
  const chunks = candidate?.groundingMetadata?.groundingChunks

  if (!Array.isArray(chunks)) {
    return []
  }

  return chunks
    .map((chunk) => {
      const web = chunk?.web
      if (!web) {
        return null
      }

      const label = sanitizeString(web.title)
      const url = sanitizeUrl(web.uri)

      if (!label || !url) {
        return null
      }

      return { label, url }
    })
    .filter(Boolean)
}

function mergeSources(primary, secondary) {
  const seen = new Set()
  const merged = []

  for (const source of [...primary, ...secondary]) {
    if (!source?.url || seen.has(source.url)) {
      continue
    }

    seen.add(source.url)
    merged.push(source)
  }

  return merged.slice(0, 10)
}

function buildAiResearchPrompt(input) {
  return `
You are researching a military asset for an admin console. Use Google Search grounding to gather reliable and trustworthy information.

Trust hierarchy:
1. Official manufacturer pages, technical brochures, and datasheets
2. Official armed forces, defense ministry, or government sources
3. Reputable defense publications only when primary sources are unavailable

Rules:
- Return strict JSON only. No markdown.
- Prefer evidence-backed facts. If a field cannot be improved confidently, keep it close to the current value or leave it empty.
- For dropdown fields, you must choose from the allowed options when they fit.
- If no dropdown option fits well, set the field to null and add an item to suggestedOverrides explaining the better label.
- For image URLs, include only direct http/https image links or public paths you are confident can be used directly. If you cannot find a trustworthy direct image URL, leave src empty.
- Keep the description concise and operational.
- Technical details should be a short list of high-signal facts, not marketing copy.

Return this exact JSON shape:
{
  "draft": {
    "designation": "string",
    "description": "string",
    "branch": "Air|Land|Naval|Joint|null",
    "category": "string",
    "subCategory": "string",
    "technicalDetails": [{"label": "string", "value": "string"}],
    "mainImage": {"title": "string", "caption": "string", "src": "string", "alt": "string", "credit": "string"} | null,
    "gallery": [{"title": "string", "caption": "string", "src": "string", "alt": "string", "credit": "string"}],
    "suggestedOverrides": [{"field": "string", "suggestedValue": "string", "reason": "string"}],
    "notes": "string"
  },
  "sources": [{"label": "string", "url": "string", "note": "string"}],
  "searchQueries": ["string"]
}

Admin context:
${JSON.stringify(input, null, 2)}
`.trim()
}

function buildAiImageResearchPrompt(input) {
  return `
You are researching trustworthy image sources for a military asset admin console.

Your job:
- Use Google Search grounding
- Identify reliable source pages likely to contain usable asset images
- Prefer official manufacturer, official armed forces, official government, and then reputable defense publications
- Avoid Pinterest, social reposts, forums, random aggregators, wallpaper sites, and AI art sources
- Focus on pages that are likely to show the exact platform or variant

Rules:
- Return strict JSON only. No markdown.
- Do not invent direct image URLs if you are not confident.
- Prioritize source pages over guesswork.
- Include short notes about why each source page is useful.

Return this exact JSON shape:
{
  "sources": [{"label": "string", "url": "string", "note": "string"}],
  "searchQueries": ["string"],
  "notes": "string"
}

Asset context:
${JSON.stringify(input, null, 2)}
`.trim()
}

function extractJsonText(value) {
  const raw = sanitizeString(value)

  if (!raw) {
    return null
  }

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1).trim()
  }

  return raw
}

function normalizeDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function buildSourceCredit(domain, title) {
  return title || domain || 'Web source'
}

function sourceTrustScore(url) {
  const domain = normalizeDomain(url)

  if (!domain) {
    return 0
  }

  if (domain.endsWith('.gov.br') || domain.endsWith('.gov') || domain.endsWith('.mil') || domain.endsWith('.mil.br')) {
    return 1
  }

  if (
    domain.includes('embraer') ||
    domain.includes('saab') ||
    domain.includes('mbda') ||
    domain.includes('naval-group') ||
    domain.includes('helibras') ||
    domain.includes('airbus') ||
    domain.includes('leonardo') ||
    domain.includes('sikorsky') ||
    domain.includes('boeing') ||
    domain.includes('lockheedmartin') ||
    domain.includes('northropgrumman') ||
    domain.includes('bae') ||
    domain.includes('rheinmetall') ||
    domain.includes('iveco') ||
    domain.includes('thales') ||
    domain.includes('telephonics')
  ) {
    return 0.95
  }

  if (
    domain.includes('janes') ||
    domain.includes('navalnews') ||
    domain.includes('defensenews') ||
    domain.includes('armyrecognition') ||
    domain.includes('flightglobal') ||
    domain.includes('twz') ||
    domain.includes('shephardmedia')
  ) {
    return 0.72
  }

  if (domain.includes('wikipedia') || domain.includes('wikimedia')) {
    return 0.58
  }

  return 0.45
}

function looksLikeBlockedImage(url, context = '') {
  const value = `${url} ${context}`.toLowerCase()
  return [
    'logo',
    'sprite',
    'favicon',
    'avatar',
    'placeholder',
    'icon',
    'banner',
    'social',
    'brand',
    'pixel',
    'tracking',
    'thumbnail',
  ].some((token) => value.includes(token))
}

function absoluteUrl(value, pageUrl) {
  const next = sanitizeString(value)

  if (!next || next.startsWith('data:')) {
    return undefined
  }

  try {
    return new URL(next, pageUrl).toString()
  } catch {
    return undefined
  }
}

function parseHtmlAttributes(tag) {
  const attributes = {}

  for (const match of tag.matchAll(/([a-zA-Z0-9:_-]+)\s*=\s*["']([^"']*)["']/g)) {
    attributes[match[1].toLowerCase()] = match[2]
  }

  return attributes
}

function rankImageCandidate(candidate, asset) {
  const assetTerms = [
    asset.designation,
    asset.sourceDesignation,
    ...(asset.manufacturers ?? []),
    asset.category,
    asset.subCategory ?? '',
  ]
    .map((value) => sanitizeString(value)?.toLowerCase())
    .filter(Boolean)

  const text = [
    candidate.imageUrl,
    candidate.caption ?? '',
    candidate.alt ?? '',
    candidate.sourceTitle,
    candidate.sourceDomain,
  ]
    .join(' ')
    .toLowerCase()

  const matchScore = assetTerms.reduce((sum, term) => {
    if (!term) {
      return sum
    }

    return text.includes(term) ? sum + 0.12 : sum
  }, 0)

  const roleBonus = candidate.suggestedRole === 'cover' ? 0.06 : 0
  return Math.max(0, Math.min(1, candidate.confidence + matchScore + roleBonus))
}

function createImageCandidate(imageUrl, source, asset, details = {}) {
  const sourceDomain = normalizeDomain(source.url)
  const baseConfidence = sourceTrustScore(source.url)
  const context = [details.alt, details.caption, source.label, source.note].filter(Boolean).join(' ')

  if (!imageUrl || looksLikeBlockedImage(imageUrl, context)) {
    return null
  }

  const candidate = {
    id: normalizeMediaKey(`${asset.slug}-${source.url}-${imageUrl}`),
    imageUrl,
    thumbnailUrl: imageUrl,
    sourcePageUrl: source.url,
    sourceTitle: source.label,
    sourceDomain,
    caption: sanitizeString(details.caption) ?? `${asset.designation} candidate image from ${source.label}`,
    alt: sanitizeString(details.alt) ?? `${asset.designation} image candidate`,
    credit: sanitizeString(details.credit) ?? buildSourceCredit(sourceDomain, source.label),
    confidence: baseConfidence,
    reason: `${source.note ?? 'Trusted source page'} ${sourceDomain ? `(${sourceDomain})` : ''}`.trim(),
    suggestedRole: details.suggestedRole ?? 'gallery',
  }

  candidate.confidence = rankImageCandidate(candidate, asset)
  if (candidate.confidence >= 0.8) {
    candidate.suggestedRole = 'cover'
  }

  return candidate
}

function extractImageCandidatesFromHtml(html, source, asset) {
  const candidates = []
  const seen = new Set()

  const pushCandidate = (candidate) => {
    if (!candidate || seen.has(candidate.imageUrl)) {
      return
    }

    seen.add(candidate.imageUrl)
    candidates.push(candidate)
  }

  for (const match of html.matchAll(/<meta\b[^>]*(?:property|name)=["'](?:og:image|og:image:url|twitter:image)["'][^>]*content=["']([^"']+)["'][^>]*>/gi)) {
    const imageUrl = absoluteUrl(match[1], source.url)
    pushCandidate(
      createImageCandidate(imageUrl, source, asset, {
        caption: `${asset.designation} image candidate from page metadata`,
        alt: `${asset.designation} page metadata image`,
        suggestedRole: 'cover',
      }),
    )
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attributes = parseHtmlAttributes(match[0])
    const imageUrl = absoluteUrl(attributes.src || attributes['data-src'] || attributes['data-original'], source.url)
    if (!imageUrl) {
      continue
    }

    const alt = sanitizeString(attributes.alt)
    const title = sanitizeString(attributes.title)
    const className = sanitizeString(attributes.class)
    const context = [alt, title, className].filter(Boolean).join(' ')

    pushCandidate(
      createImageCandidate(imageUrl, source, asset, {
        caption: title || alt || `${asset.designation} image candidate`,
        alt: alt || title || `${asset.designation} image candidate`,
        credit: source.label,
        suggestedRole: context.toLowerCase().includes('hero') ? 'cover' : 'gallery',
      }),
    )
  }

  return candidates
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 5)
}

async function fetchSourcePageCandidates(source, asset) {
  try {
    const response = await fetch(source.url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; OrdoDefensionis/1.0; +https://localhost)',
      },
    })

    if (!response.ok) {
      return []
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) {
      return []
    }

    const html = (await response.text()).slice(0, 400_000)
    return extractImageCandidatesFromHtml(html, source, asset)
  } catch {
    return []
  }
}

async function requestGeminiJson(prompt, { tools = [], temperature = 0.2 } = {}) {
  if (!geminiApiKey) {
    throw new Error('Gemini AI generation is not configured. Set GEMINI_API_KEY in app/.env and restart the server.')
  }

  const endpoint = `${geminiBaseUrl}/models/${geminiModel}:generateContent`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': geminiApiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      ...(tools.length > 0 ? { tools } : {}),
      generationConfig: {
        temperature,
      },
    }),
  })

  const payload = await response.json()

  if (!response.ok) {
    const message = payload?.error?.message || `Gemini request failed with ${response.status}`
    throw new Error(message)
  }

  const candidate = payload?.candidates?.[0]
  const text = candidate?.content?.parts
    ?.map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim()

  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }

  try {
    const jsonText = extractJsonText(text)
    if (!jsonText) {
      throw new Error('Gemini returned an empty JSON body.')
    }

    return {
      parsed: JSON.parse(jsonText),
      candidate,
    }
  } catch {
    throw new Error('Gemini returned malformed JSON.')
  }
}

async function generateAiAssetDraft(input) {
  const { parsed, candidate } = await requestGeminiJson(buildAiResearchPrompt(input), {
    tools: [{ google_search: {} }],
    temperature: 0.2,
  })

  const sanitized = sanitizeAiDraftResponse(parsed, input.branchOptions ?? [])
  const groundedSources = extractGroundingSources(candidate)

  return {
    ...sanitized,
    sources: mergeSources(sanitized.sources, groundedSources),
    model: geminiModel,
    grounded: groundedSources.length > 0,
  }
}

async function suggestAiAssetImages(input) {
  const { parsed, candidate } = await requestGeminiJson(buildAiImageResearchPrompt(input), {
    tools: [{ google_search: {} }],
    temperature: 0.1,
  })

  const sanitized = sanitizeAiImageSuggestionResponse(parsed)
  const groundedSources = extractGroundingSources(candidate)
  const mergedSources = mergeSources(sanitized.sources, groundedSources).slice(0, 8)
  const sourceCandidates = await Promise.all(mergedSources.map((source) => fetchSourcePageCandidates(source, input.asset)))
  const candidates = sourceCandidates
    .flat()
    .sort((left, right) => right.confidence - left.confidence)
    .filter((candidateItem, index, values) => values.findIndex((item) => item.imageUrl === candidateItem.imageUrl) === index)
    .slice(0, 10)

  const notes = candidates.length > 0
    ? sanitized.notes ?? `Fetched ${candidates.length} candidate image${candidates.length === 1 ? '' : 's'} from grounded source pages.`
    : sanitized.notes ?? 'Grounded search completed, but no reliable candidate images were extracted from the discovered source pages.'

  return {
    candidates,
    sources: mergedSources,
    searchQueries: sanitized.searchQueries,
    notes,
    model: geminiModel,
    grounded: groundedSources.length > 0,
  }
}

function sanitizePersistedOverride(slug, input = {}) {
  const sourceSlug = sanitizeString(input.sourceSlug)
  const sourceDesignation = sanitizeString(input.sourceDesignation)
  const sourceDesignations = [...new Set([sourceDesignation, ...sanitizeStringArray(input.sourceDesignations)])]
  const designation = sanitizeString(input.designation)
  const description = sanitizeString(input.description)
  const branch = sanitizeBranch(input.branch)
  const category = sanitizeString(input.category)
  const subCategory = sanitizeString(input.subCategory)

  const nextOverride = { slug }

  if (sourceSlug) {
    nextOverride.sourceSlug = sourceSlug
  }

  if (sourceDesignation) {
    nextOverride.sourceDesignation = sourceDesignation
  }

  if (sourceDesignations.length > 0) {
    nextOverride.sourceDesignations = sourceDesignations
  }

  if (designation) {
    nextOverride.designation = designation
  }

  if (description) {
    nextOverride.description = description
  }

  if (branch) {
    nextOverride.branch = branch
  }

  if (category) {
    nextOverride.category = category
  }

  if (subCategory) {
    nextOverride.subCategory = subCategory
  }

  return nextOverride
}

function sanitizePersistedImageMetadata(slug, input = {}) {
  const sourceSlug = sanitizeString(input.sourceSlug)
  const sourceDesignation = sanitizeString(input.sourceDesignation)
  const sourceDesignations = [...new Set([sourceDesignation, ...sanitizeStringArray(input.sourceDesignations)])]
  const coverImage = sanitizeEditableImage(input.coverImage)
  const gallery = Array.isArray(input.gallery)
    ? input.gallery.map(sanitizeEditableImage).filter(Boolean).slice(0, 8)
    : []

  const nextMetadata = { slug }

  if (sourceSlug) {
    nextMetadata.sourceSlug = sourceSlug
  }

  if (sourceDesignation) {
    nextMetadata.sourceDesignation = sourceDesignation
  }

  if (sourceDesignations.length > 0) {
    nextMetadata.sourceDesignations = sourceDesignations
  }

  if (coverImage) {
    nextMetadata.coverImage = coverImage
  }

  if (gallery.length > 0) {
    nextMetadata.gallery = gallery
  }

  return nextMetadata
}

function mapOverrideRow(row) {
  return sanitizePersistedOverride(row.slug, {
    sourceSlug: row.source_slug,
    sourceDesignation: row.source_designation,
    sourceDesignations: row.source_designations,
    designation: row.designation,
    description: row.description,
    branch: row.branch,
    category: row.category,
    subCategory: row.sub_category,
  })
}

function mapOverrideRowInput(override) {
  return {
    slug: override.slug,
    source_slug: override.sourceSlug ?? null,
    source_designation: override.sourceDesignation ?? null,
    source_designations: override.sourceDesignations ?? [],
    designation: override.designation ?? null,
    description: override.description ?? null,
    branch: override.branch ?? null,
    category: override.category ?? null,
    sub_category: override.subCategory ?? null,
  }
}

function getOverrideStorageMeta() {
  return supabase ? supabaseOverrideStorageMeta : localOverrideStorageMeta
}

function getImageStorageMeta() {
  return localImageMetadataStorageMeta
}

async function listSupabaseOverrides() {
  const { data, error } = await supabase.from('asset_overrides').select('*').order('slug')

  if (error) {
    throw new Error(`Supabase override read failed: ${error.message}`)
  }

  return Object.fromEntries((data ?? []).map((row) => [row.slug, mapOverrideRow(row)]))
}

async function upsertSupabaseOverride(override) {
  const { data, error } = await supabase
    .from('asset_overrides')
    .upsert(mapOverrideRowInput(override), { onConflict: 'slug' })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Supabase override save failed: ${error.message}`)
  }

  return mapOverrideRow(data)
}

async function deleteSupabaseOverride(slug) {
  const { error } = await supabase.from('asset_overrides').delete().eq('slug', slug)

  if (error) {
    throw new Error(`Supabase override delete failed: ${error.message}`)
  }
}

async function listStoredOverrides() {
  if (supabase) {
    return listSupabaseOverrides()
  }

  return readOverrides()
}

async function upsertStoredOverride(slug, input) {
  const override = sanitizePersistedOverride(slug, input)

  if (supabase) {
    return upsertSupabaseOverride(override)
  }

  const overrides = await readOverrides()
  overrides[slug] = override
  await writeOverrides(overrides)
  return override
}

async function removeStoredOverride(slug) {
  if (supabase) {
    await deleteSupabaseOverride(slug)
    return
  }

  const overrides = await readOverrides()
  delete overrides[slug]
  await writeOverrides(overrides)
}

async function listStoredImageMetadata() {
  return readImageMetadata()
}

async function upsertStoredImageMetadata(slug, input) {
  const metadata = sanitizePersistedImageMetadata(slug, input)
  const imageMetadata = await readImageMetadata()
  imageMetadata[slug] = metadata
  await writeImageMetadata(imageMetadata)
  return metadata
}

async function removeStoredImageMetadata(slug) {
  const imageMetadata = await readImageMetadata()
  delete imageMetadata[slug]
  await writeImageMetadata(imageMetadata)
}

function parseAutoImageFile(fileName) {
  const extension = extname(fileName).toLowerCase()

  if (!supportedImageExtensions.has(extension)) {
    return null
  }

  const stem = fileName.slice(0, -extension.length)
  const match = stem.match(/^(.*)-(\d+)$/)

  if (!match) {
    return null
  }

  const designationKey = normalizeMediaKey(match[1])
  const index = Number(match[2])

  if (!designationKey || !Number.isFinite(index) || index < 1) {
    return null
  }

  return {
    designationKey,
    image: {
      filename: fileName,
      index,
      src: `${autoImagesBaseUrl}/${encodeURIComponent(fileName)}`,
    },
  }
}

async function readAutoImageManifest() {
  try {
    const entries = await readdir(autoImagesPath, { withFileTypes: true })
    const manifest = {}

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue
      }

      const parsed = parseAutoImageFile(entry.name)
      if (!parsed) {
        continue
      }

      const current = manifest[parsed.designationKey] ?? []
      current.push(parsed.image)
      manifest[parsed.designationKey] = current
    }

    for (const key of Object.keys(manifest)) {
      manifest[key].sort((left, right) => left.index - right.index || left.filename.localeCompare(right.filename))
    }

    return manifest
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return {}
    }

    throw error
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []

    request.on('data', (chunk) => {
      chunks.push(chunk)
    })
    request.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    request.on('error', reject)
  })
}

async function readJsonBody(request) {
  const raw = await readBody(request)

  if (!raw) {
    return {}
  }

  return JSON.parse(raw)
}

async function fetchLiveOrders() {
  const response = await fetch(upstreamUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept-language': 'en-US,en;q=0.9,pt;q=0.8,pl;q=0.7',
      origin: 'https://armstransfers.sipri.org',
      referer: 'https://armstransfers.sipri.org/',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`SIPRI request failed with ${response.status}`)
  }

  const records = await response.json()
  cachedRecords = records
  cachedAt = Date.now()
  await writeSnapshot(records)
  return records
}

async function getOrders(forceRefresh = false) {
  const cacheIsFresh = cachedRecords && Date.now() - cachedAt < cacheTtlMs

  if (!forceRefresh && cacheIsFresh) {
    return {
      records: cachedRecords,
      meta: {
        source: 'memory-cache',
        fetchedAt: new Date(cachedAt).toISOString(),
        stale: false,
      },
    }
  }

  try {
    const records = await fetchLiveOrders()
    return {
      records,
      meta: {
        source: 'live-proxy',
        fetchedAt: new Date(cachedAt).toISOString(),
        stale: false,
      },
    }
  } catch (error) {
    if (cachedRecords) {
      return {
        records: cachedRecords,
        meta: {
          source: 'memory-cache-fallback',
          fetchedAt: new Date(cachedAt).toISOString(),
          stale: true,
          warning: error instanceof Error ? error.message : 'Unknown upstream error',
        },
      }
    }

    const records = await readSnapshot()
    return {
      records,
      meta: {
        source: 'snapshot-fallback',
        fetchedAt: null,
        stale: true,
        warning: error instanceof Error ? error.message : 'Unknown upstream error',
      },
    }
  }
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: 'Missing request URL' })
    return
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type',
    })
    response.end()
    return
  }

  const url = new URL(request.url, `http://${request.headers.host}`)

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, {
      ok: true,
      service: 'sipri-proxy',
      overrides: getOverrideStorageMeta(),
      images: getImageStorageMeta(),
      ai: aiGenerationMeta,
    })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/sipri/orders') {
    try {
      const forceRefresh = url.searchParams.get('refresh') === '1'
      const result = await getOrders(forceRefresh)
      sendJson(response, 200, {
        records: result.records,
        meta: {
          ...result.meta,
          count: result.records.length,
        },
      })
      return
    } catch (error) {
      sendJson(response, 502, {
        error: error instanceof Error ? error.message : 'Unexpected proxy error',
      })
      return
    }
  }

  if (request.method === 'GET' && url.pathname === '/api/asset-overrides') {
    try {
      const overrides = await listStoredOverrides()
      sendJson(response, 200, { overrides, storage: getOverrideStorageMeta() })
      return
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : 'Failed to read override store',
      })
      return
    }
  }

  if (request.method === 'GET' && url.pathname === '/api/asset-image-metadata') {
    try {
      const imageMetadata = await listStoredImageMetadata()
      sendJson(response, 200, { imageMetadata, storage: getImageStorageMeta() })
      return
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : 'Failed to read asset image metadata store',
      })
      return
    }
  }

  if (request.method === 'GET' && url.pathname === '/api/asset-images') {
    try {
      const images = await readAutoImageManifest()
      sendJson(response, 200, { images })
      return
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : 'Failed to read auto image folder',
      })
      return
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/ai/generate-asset-draft') {
    try {
      const input = await readJsonBody(request)
      const result = await generateAiAssetDraft(input)
      sendJson(response, 200, result)
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI generation failed'
      const statusCode = message.includes('not configured') ? 503 : 502
      sendJson(response, statusCode, { error: message })
      return
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/ai/suggest-asset-images') {
    try {
      const input = await readJsonBody(request)
      const result = await suggestAiAssetImages(input)
      sendJson(response, 200, result)
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI image suggestion failed'
      const statusCode = message.includes('not configured') ? 503 : 502
      sendJson(response, statusCode, { error: message })
      return
    }
  }

  if (url.pathname.startsWith('/api/asset-overrides/')) {
    const slug = decodeURIComponent(url.pathname.replace('/api/asset-overrides/', '')).trim()

    if (!slug) {
      sendJson(response, 400, { error: 'Missing asset slug' })
      return
    }

    if (request.method === 'PUT') {
      try {
        const input = await readJsonBody(request)
        const override = await upsertStoredOverride(slug, input)
        sendJson(response, 200, { override, storage: getOverrideStorageMeta() })
        return
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : 'Failed to save override',
        })
        return
      }
    }

    if (request.method === 'DELETE') {
      try {
        await removeStoredOverride(slug)
        sendJson(response, 200, { ok: true, slug, storage: getOverrideStorageMeta() })
        return
      } catch (error) {
        sendJson(response, 500, {
          error: error instanceof Error ? error.message : 'Failed to delete override',
        })
        return
      }
    }
  }

  if (url.pathname.startsWith('/api/asset-image-metadata/')) {
    const slug = decodeURIComponent(url.pathname.replace('/api/asset-image-metadata/', '')).trim()

    if (!slug) {
      sendJson(response, 400, { error: 'Missing asset slug' })
      return
    }

    if (request.method === 'PUT') {
      try {
        const input = await readJsonBody(request)
        const imageMetadata = await upsertStoredImageMetadata(slug, input)
        sendJson(response, 200, { imageMetadata, storage: getImageStorageMeta() })
        return
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : 'Failed to save image metadata',
        })
        return
      }
    }

    if (request.method === 'DELETE') {
      try {
        await removeStoredImageMetadata(slug)
        sendJson(response, 200, { ok: true, slug, storage: getImageStorageMeta() })
        return
      } catch (error) {
        sendJson(response, 500, {
          error: error instanceof Error ? error.message : 'Failed to delete image metadata',
        })
        return
      }
    }
  }

  sendJson(response, 404, { error: 'Not found' })
})

server.listen(port, () => {
  console.log(`SIPRI proxy listening on http://127.0.0.1:${port}`)
  console.log(`Override storage: ${getOverrideStorageMeta().provider} (${getOverrideStorageMeta().target})`)
  console.log(`AI generation: ${aiGenerationMeta.enabled ? `${aiGenerationMeta.provider} (${aiGenerationMeta.model})` : 'disabled'}`)
})
