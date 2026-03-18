import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(__dirname, '../src/data/sipri-brazil-orders.json')

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

const response = await fetch('https://atbackend.sipri.org/api/p/trades/search', {
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

const data = await response.json()

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')

console.log(`Wrote ${data.length} SIPRI trade records to ${outputPath}`)
