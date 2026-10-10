import { describe, expect, it } from 'vitest'
import { airports, airportsByCountry } from './airports'

describe('expanded scheduled-airport catalog', () => {
  it('covers thousands of airports across most countries and territories', () => {
    expect(airports.length).toBeGreaterThan(4_000)
    expect(Object.keys(airportsByCountry).length).toBeGreaterThan(225)
  })

  it('includes regional scheduled airports and unique IATA codes', () => {
    expect(airports.find((airport) => airport.iata === 'USM')?.municipality).toContain('Samui')
    expect(new Set(airports.map((airport) => airport.iata)).size).toBe(airports.length)
  })

  it('adds population metadata for sorting major gateway cities', () => {
    expect(airports.find((airport) => airport.iata === 'SIN')?.population).toBeGreaterThan(5_000_000)
    expect(airports.filter((airport) => airport.population).length).toBeGreaterThan(2_500)
  })
})
