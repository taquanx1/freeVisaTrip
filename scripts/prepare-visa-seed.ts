import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { DATASET_URL, normalizeCsv } from '../worker/visa'

const outputPath = process.argv[2]
if (!outputPath) throw new Error('Usage: npm run visa:seed-file -- <output-path>')

const response = await fetch(DATASET_URL, { headers: { 'User-Agent': 'FreeVisaTrip data refresh' } })
if (!response.ok) throw new Error(`Visa source returned ${response.status}`)

const etag = response.headers.get('etag') ?? undefined
const dataset = normalizeCsv(await response.text(), new Date().toISOString(), etag ?? 'manual-seed', etag)
await writeFile(resolve(outputPath), JSON.stringify(dataset), { mode: 0o600 })
console.log(`Prepared ${Object.keys(dataset.matrix).length} passports for KV seeding.`)
