import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parse } from 'csv-parse/sync'
import { strFromU8, unzipSync } from 'fflate'

const AIRPORTS_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv'
const COUNTRIES_URL = 'https://davidmegginson.github.io/ourairports-data/countries.csv'
const CITIES_URL = 'https://download.geonames.org/export/dump/cities5000.zip'

interface AirportRow {
  type: string
  name: string
  latitude_deg: string
  longitude_deg: string
  iso_country: string
  municipality: string
  scheduled_service: string
  iata_code: string
}

interface CountryRow { code: string; name: string }

const [airportsResponse, countriesResponse, citiesResponse] = await Promise.all([
  fetch(AIRPORTS_URL, { headers: { 'User-Agent': 'FreeVisaTrip airport data generator' } }),
  fetch(COUNTRIES_URL, { headers: { 'User-Agent': 'FreeVisaTrip airport data generator' } }),
  fetch(CITIES_URL, { headers: { 'User-Agent': 'FreeVisaTrip airport data generator' } }),
])
if (!airportsResponse.ok || !countriesResponse.ok || !citiesResponse.ok) throw new Error(`Airport/city download failed (${airportsResponse.status}/${countriesResponse.status}/${citiesResponse.status})`)

const countryRows = parse(await countriesResponse.text(), { columns: true, skip_empty_lines: true }) as CountryRow[]
const countries = Object.fromEntries(countryRows.filter((row) => /^[A-Z]{2}$/.test(row.code)).map((row) => [row.code, row.name]))
const airportRows = parse(await airportsResponse.text(), { columns: true, skip_empty_lines: true, relax_column_count: true }) as AirportRow[]
const zippedCities = unzipSync(new Uint8Array(await citiesResponse.arrayBuffer()))
const citiesText = strFromU8(zippedCities['cities5000.txt'])
const cityPopulations = new Map<string, number>()
const normalizePlace = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

for (const line of citiesText.split('\n')) {
  if (!line) continue
  const fields = line.split('\t')
  const country = fields[8]
  const population = Number(fields[14]) || 0
  const names = [fields[1], fields[2], ...(fields[3]?.split(',') ?? [])]
  for (const name of names) {
    const normalized = normalizePlace(name)
    if (!normalized) continue
    const key = `${country}:${normalized}`
    if (population > (cityPopulations.get(key) ?? 0)) cityPopulations.set(key, population)
  }
}
const sizeRank: Record<string, number> = { large_airport: 5, medium_airport: 4, small_airport: 3, seaplane_base: 2, heliport: 1, balloonport: 0 }
const byIata = new Map<string, AirportRow>()

for (const row of airportRows) {
  const iata = row.iata_code?.toUpperCase()
  if (row.scheduled_service !== 'yes' || !/^[A-Z]{3}$/.test(iata) || row.type === 'closed_airport' || !countries[row.iso_country]) continue
  const previous = byIata.get(iata)
  if (!previous || (sizeRank[row.type] ?? -1) > (sizeRank[previous.type] ?? -1)) byIata.set(iata, row)
}

const airports = [...byIata.values()].map((row) => ({
  i: row.iata_code.toUpperCase(),
  n: row.name,
  m: row.municipality || row.name.replace(/\s+(International\s+)?Airport.*$/i, ''),
  c: row.iso_country,
  a: Number(Number(row.latitude_deg).toFixed(4)),
  o: Number(Number(row.longitude_deg).toFixed(4)),
  p: Math.max(...[row.municipality, ...([...row.municipality.matchAll(/\(([^)]+)\)/g)].map((match) => match[1]))].map((name) => cityPopulations.get(`${row.iso_country}:${normalizePlace(name)}`) ?? 0)),
})).sort((left, right) => left.c.localeCompare(right.c) || left.m.localeCompare(right.m) || left.i.localeCompare(right.i))

const shared = resolve(import.meta.dirname, '..', 'shared')
await Promise.all([
  writeFile(resolve(shared, 'airports.generated.json'), `${JSON.stringify(airports)}\n`),
  writeFile(resolve(shared, 'countries.generated.json'), `${JSON.stringify(countries, null, 2)}\n`),
  writeFile(resolve(shared, 'airport-data-meta.generated.json'), `${JSON.stringify({ source: AIRPORTS_URL, populationSource: CITIES_URL, generatedAt: new Date().toISOString(), criteria: 'scheduled_service=yes, valid IATA code, not closed', airports: airports.length, countries: new Set(airports.map((airport) => airport.c)).size, airportsWithCityPopulation: airports.filter((airport) => airport.p > 0).length }, null, 2)}\n`),
])

console.log(`Generated ${airports.length} scheduled airports across ${new Set(airports.map((airport) => airport.c)).size} countries and territories.`)
