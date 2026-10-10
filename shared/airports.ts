import type { Airport } from './types'
import airportData from './airports.generated.json'
import countryData from './countries.generated.json'

interface CompactAirport { i: string; n: string; m: string; c: string; a: number; o: number; p?: number }

export const airports: Airport[] = (airportData as CompactAirport[]).map((airport) => ({
  iata: airport.i,
  name: airport.n,
  municipality: airport.m,
  countryCode: airport.c,
  country: (countryData as Record<string, string>)[airport.c] ?? airport.c,
  lat: airport.a,
  lon: airport.o,
  population: airport.p || undefined,
}))

export const airportsByCountry = airports.reduce<Record<string, Airport[]>>((grouped, airport) => {
  ;(grouped[airport.countryCode] ??= []).push(airport)
  return grouped
}, {})
