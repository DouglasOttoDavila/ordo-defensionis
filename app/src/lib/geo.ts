export const BRAZIL_HUB_COORDINATES: [number, number] = [-47.8825, -15.7942]

const exporterCountryCoordinates: Record<string, [number, number]> = {
  australia: [133.7751, -25.2744],
  austria: [14.5501, 47.5162],
  belgium: [4.4699, 50.5039],
  canada: [-106.3468, 56.1304],
  czechia: [15.4729, 49.8175],
  denmark: [9.5018, 56.2639],
  finland: [25.7482, 61.9241],
  france: [2.2137, 46.2276],
  germany: [10.4515, 51.1657],
  ireland: [-8.2439, 53.4129],
  israel: [34.8516, 31.0461],
  italy: [12.5674, 41.8719],
  japan: [138.2529, 36.2048],
  jordan: [36.2384, 30.5852],
  kuwait: [47.4818, 29.3117],
  netherlands: [5.2913, 52.1326],
  norway: [8.4689, 60.472],
  russia: [105.3188, 61.524],
  singapore: [103.8198, 1.3521],
  'south-africa': [22.9375, -30.5595],
  spain: [-3.7492, 40.4637],
  sweden: [18.6435, 60.1282],
  switzerland: [8.2275, 46.8182],
  'united-kingdom': [-3.436, 55.3781],
  'united-states': [-95.7129, 37.0902],
}

function normalizeCountryKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getExporterCoordinates(country: string) {
  const key = normalizeCountryKey(country)
  return exporterCountryCoordinates[key] ?? null
}
