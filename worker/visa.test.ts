import { describe, expect, it } from 'vitest'
import { aggregateDestination, classifyPolicy, fallbackDataset, normalizeCsv } from './visa'

describe('visa policy classification', () => {
  it.each([
    [90, false, 'visa-free'], ['30', false, 'visa-free'], ['visa free', false, 'visa-free'], [-1, false, 'visa-free'],
    ['visa on arrival', false, 'visa-on-arrival'], ['eta', false, 'eta'], ['e-visa', false, 'evisa'], ['evisa', false, 'evisa'],
    ['visa required', false, 'restricted'], [null, false, 'restricted'], ['unexpected', false, 'restricted'], [null, true, 'visa-free'],
  ])('classifies %s', (raw, sameCountry, expected) => expect(classifyPolicy(raw, sameCountry)).toBe(expected))

  it('grays a destination when any passport requires preapproval', () => {
    const dataset = structuredClone(fallbackDataset)
    dataset.matrix.SG.TH = 30
    dataset.matrix.IN.TH = 'visa required'
    const result = aggregateDestination(dataset, ['SG', 'IN'], 'TH')
    expect(result.eligible).toBe(false)
    expect(result.pattern).toEqual([])
  })

  it('retains both eligible policies as a mixed pattern', () => {
    const dataset = structuredClone(fallbackDataset)
    dataset.matrix.SG.TH = 30
    dataset.matrix.IN.TH = 'visa on arrival'
    expect(aggregateDestination(dataset, ['SG', 'IN'], 'TH').pattern).toEqual(['visa-free', 'visa-on-arrival'])
  })

  it('keeps eVisa and ETA destinations eligible', () => {
    const dataset = structuredClone(fallbackDataset)
    dataset.matrix.SG.CA = 'eta'
    dataset.matrix.IN.CA = 'e-visa'
    const result = aggregateDestination(dataset, ['SG', 'IN'], 'CA')
    expect(result.eligible).toBe(true)
    expect(result.pattern).toEqual(['eta', 'evisa'])
  })

  it('normalizes source rows and ignores unsupported locations', () => {
    const header = 'Passport,Destination,Requirement\n'
    const rows = ['Singapore,Thailand,30', 'India,Thailand,visa on arrival', 'Singapore,Nowhere,90']
    const data = normalizeCsv(header + rows.concat(Array.from({ length: 10 }, (_, index) => `${['Australia','Canada','France','Germany','Japan','Malaysia','Netherlands','New Zealand','United Kingdom','United States'][index]},Thailand,30`)).join('\n'), '2026-10-10T00:00:00Z', 'test')
    expect(data.matrix.SG.TH).toBe(30)
    expect(data.matrix.IN.TH).toBe('visa on arrival')
  })
})
