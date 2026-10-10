import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parse } from 'csv-parse/sync'

const AIRPORTS_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv'
const COUNTRIES_URL = 'https://davidmegginson.github.io/ourairports-data/countries.csv'

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

const [airportsResponse, countriesResponse] = await Promise.all([
  fetch(AIRPORTS_URL, { headers: { 'User-Agent': 'FreeVisaTrip airport data generator' } }),
  fetch(COUNTRIES_URL, { headers: { 'User-Agent': 'FreeVisaTrip airport data generator' } }),
])
if (!airportsResponse.ok || !countriesResponse.ok) throw new Error(`OurAirports download failed (${airportsResponse.status}/${countriesResponse.status})`)

const countryRows = parse(await countriesResponse.text(), { columns: true, skip_empty_lines: true }) as CountryRow[]
const countries = Object.fromEntries(countryRows.filter((row) => /^[A-Z]{2}$/.test(row.code)).map((row) => [row.code, row.name]))
const airportRows = parse(await airportsResponse.text(), { columns: true, skip_empty_lines: true, relax_column_count: true }) as AirportRow[]
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
})).sort((left, right) => left.c.localeCompare(right.c) || left.m.localeCompare(right.m) || left.i.localeCompare(right.i))

const shared = resolve(import.meta.dirname, '..', 'shared')
await Promise.all([
  writeFile(resolve(shared, 'airports.generated.json'), `${JSON.stringify(airports)}\n`),
  writeFile(resolve(shared, 'countries.generated.json'), `${JSON.stringify(countries, null, 2)}\n`),
  writeFile(resolve(shared, 'airport-data-meta.generated.json'), `${JSON.stringify({ source: AIRPORTS_URL, generatedAt: new Date().toISOString(), criteria: 'scheduled_service=yes, valid IATA code, not closed', airports: airports.length, countries: new Set(airports.map((airport) => airport.c)).size }, null, 2)}\n`),
])

console.log(`Generated ${airports.length} scheduled airports across ${new Set(airports.map((airport) => airport.c)).size} countries and territories.`)
