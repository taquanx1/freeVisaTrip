import { airports, airportsByCountry } from '../shared/airports'
import { countryName, passports } from '../shared/countries'
import type { DestinationEligibility, PassportPolicy, PolicyKind, VisaMapResponse } from '../shared/types'

export const VISA_KEY = 'visa-dataset:v1'
export const DATASET_URL = 'https://raw.githubusercontent.com/ilyankou/passport-index-dataset/master/passport-index-tidy.csv'

export interface VisaDataset {
  version: 1
  refreshedAt: string
  revision: string
  etag?: string
  source: string
  matrix: Record<string, Record<string, string | number>>
}

export function classifyPolicy(raw: string | number | null | undefined, sameCountry = false): PassportPolicy['kind'] {
  if (sameCountry || raw === -1 || raw === '-1') return 'visa-free'
  if (typeof raw === 'number' && raw >= 0) return 'visa-free'
  const value = String(raw ?? '').trim().toLowerCase()
  if (/^\d+$/.test(value)) return 'visa-free'
  if (value === 'visa free') return 'visa-free'
  if (value === 'visa on arrival') return 'visa-on-arrival'
  return 'restricted'
}

function policyLabel(kind: PolicyKind, raw: string | number | null): string {
  if (kind === 'visa-on-arrival') return 'Visa on arrival'
  if (kind === 'visa-free') {
    if (raw === -1 || raw === '-1') return 'Domestic travel'
    if (/^\d+$/.test(String(raw))) return `Visa-free for ${raw} days`
    return 'Visa-free'
  }
  const value = String(raw ?? '').trim().toLowerCase()
  if (value === 'eta') return 'Electronic travel authorisation required'
  if (value === 'e-visa') return 'eVisa required before travel'
  if (!value) return 'Entry policy unavailable — confirm before travel'
  return value.replace(/^./, (letter) => letter.toUpperCase())
}

export function aggregateDestination(dataset: VisaDataset, passportCodes: string[], destinationCode: string): DestinationEligibility {
  const policies = passportCodes.map((passport) => {
    const raw = dataset.matrix[passport]?.[destinationCode] ?? null
    const kind = classifyPolicy(raw, passport === destinationCode)
    return { passport, raw, kind, label: policyLabel(kind, raw) }
  })
  const eligible = policies.every((policy) => policy.kind !== 'restricted')
  const pattern = eligible ? [...new Set(policies.map((policy) => policy.kind as 'visa-free' | 'visa-on-arrival'))] : []
  return { countryCode: destinationCode, country: countryName(destinationCode), eligible, pattern, policies, airports: airportsByCountry[destinationCode] ?? [] }
}

export function buildVisaResponse(dataset: VisaDataset, passportCodes: string[], stale = false): VisaMapResponse {
  const destinations = [...new Set(airports.map((airport) => airport.countryCode))]
    .map((code) => aggregateDestination(dataset, passportCodes, code))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.country.localeCompare(b.country))
  return { destinations, freshness: { refreshedAt: dataset.refreshedAt, revision: dataset.revision, stale, source: dataset.source } }
}

const strongPassports = new Set(['SG','JP','KR','DE','FR','IT','ES','NL','SE','FI','DK','NO','CH','AT','BE','PT','IE','GB','US','CA','AU','NZ'])
const visaOnArrival = new Set(['ID','TH','LK','EG','QA'])

export const fallbackDataset: VisaDataset = {
  version: 1,
  refreshedAt: '2026-09-01T00:00:00.000Z',
  revision: 'bundled-fallback-2026-09',
  source: DATASET_URL,
  matrix: Object.fromEntries(passports.map(({ code }) => [code, Object.fromEntries([...new Set(airports.map((airport) => airport.countryCode))].map((destination) => {
    if (code === destination) return [destination, -1]
    if (strongPassports.has(code) && ['MY','TH','ID','VN','PH','HK','TW','JP','KR','AE','QA','TR','GB','FR','NL','DE','IT','ES','PT','GR','CH','MX','BR','AR','CL','MA','ZA'].includes(destination)) return [destination, visaOnArrival.has(destination) ? 'visa on arrival' : 90]
    if (code === 'IN' && ['TH','ID','LK','QA'].includes(destination)) return [destination, 'visa on arrival']
    if (code === 'IN' && ['MY','VN','AE'].includes(destination)) return [destination, 'visa free']
    if (['MY','TH','ID','PH','VN'].includes(code) && ['SG','MY','TH','ID','VN','PH'].includes(destination)) return [destination, 30]
    return [destination, 'visa required']
  }))]))
}

const nameToCode = new Map(passports.map((passport) => [passport.name.toLowerCase(), passport.code]))
nameToCode.set('czech republic', 'CZ')
nameToCode.set('turkey', 'TR')

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index++) {
    const character = line[index]
    if (character === '"') quoted = !quoted
    else if (character === ',' && !quoted) { result.push(value); value = '' }
    else value += character
  }
  result.push(value)
  return result
}

export function normalizeCsv(csv: string, now: string, revision: string, etag?: string): VisaDataset {
  const matrix: VisaDataset['matrix'] = {}
  for (const line of csv.split(/\r?\n/).slice(1)) {
    if (!line) continue
    const [passportName, destinationName, requirement] = parseCsvLine(line)
    const passportCode = nameToCode.get(passportName.toLowerCase())
    const destinationCode = nameToCode.get(destinationName.toLowerCase())
    if (!passportCode || !destinationCode || !airportsByCountry[destinationCode]) continue
    ;(matrix[passportCode] ??= {})[destinationCode] = /^-?\d+$/.test(requirement) ? Number(requirement) : requirement
  }
  if (Object.keys(matrix).length < 10) throw new Error('Visa dataset normalization produced too few passports')
  return { version: 1, refreshedAt: now, revision, etag, source: DATASET_URL, matrix }
}
