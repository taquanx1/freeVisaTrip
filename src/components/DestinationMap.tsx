import { useEffect, useMemo, useRef, useState } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import world from 'world-atlas/countries-110m.json'
import { Check, MapPin, Minus, Plus, RotateCcw } from 'lucide-react'
import type { Airport, DestinationEligibility, VisaMapResponse } from '../../shared/types'
import { flagFor } from '../../shared/countries'

interface Props { data: VisaMapResponse; selected?: Airport; onSelect: (airport: Airport) => void }
interface MapPosition { coordinates: [number, number]; zoom: number }
interface CityGroup { name: string; population?: number; airports: Airport[] }

const aliases: Record<string, string> = { 'United States of America': 'US', 'United Kingdom': 'GB', 'South Korea': 'KR', 'Czechia': 'CZ', 'Taiwan': 'TW' }
const defaultPosition: MapPosition = { coordinates: [0, 0], zoom: 1 }
const populationFormatter = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

export function DestinationMap({ data, selected, onSelect }: Props) {
  const [active, setActive] = useState<DestinationEligibility | null>(null)
  const [position, setPosition] = useState<MapPosition>(defaultPosition)
  const cardRef = useRef<HTMLElement>(null)
  const byName = useMemo(() => new Map(data.destinations.flatMap((destination) => [[destination.country, destination], [aliases[destination.country] ?? '', destination]])), [data])
  const accessibleCount = data.destinations.filter((item) => item.eligible).length
  const cities = useMemo<CityGroup[]>(() => {
    if (!active?.eligible) return []
    const grouped = new Map<string, CityGroup>()
    for (const airport of active.airports) {
      const current = grouped.get(airport.municipality)
      if (current) {
        current.airports.push(airport)
        current.population = Math.max(current.population ?? 0, airport.population ?? 0) || undefined
      } else {
        grouped.set(airport.municipality, { name: airport.municipality, population: airport.population, airports: [airport] })
      }
    }
    return [...grouped.values()].sort((left, right) => (right.population ?? -1) - (left.population ?? -1) || left.name.localeCompare(right.name))
  }, [active])

  useEffect(() => {
    if (!active) return
    const closeWhenOutside = (event: PointerEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) setActive(null)
    }
    document.addEventListener('pointerdown', closeWhenOutside)
    return () => document.removeEventListener('pointerdown', closeWhenOutside)
  }, [active])

  const resolve = (geography: { properties?: { name?: string } }) => {
    const name = geography.properties?.name ?? ''
    return data.destinations.find((destination) => destination.country === name || destination.countryCode === aliases[name]) ?? byName.get(name)
  }

  const changeZoom = (difference: number) => setPosition((current) => ({ ...current, zoom: Math.min(4, Math.max(1, current.zoom + difference)) }))

  return <section className="step map-step" aria-labelledby="map-title">
    <div className="step-heading"><span className="step-number">02</span><div><p className="eyebrow">Explore the map</p><h2 id="map-title">Where can everyone go?</h2><p><strong>{accessibleCount} gateway countries</strong> match your passports. Select a country, then choose a city to continue.</p></div></div>
    <div className="map-shell">
      <div className="legend" aria-label="Map legend"><span><i className="swatch free"/>Visa-free</span><span><i className="swatch arrival"/>On arrival / online</span><span><i className="swatch mixed"/>Mixed</span><span><i className="swatch restricted"/>Embassy visa</span></div>
      <ComposableMap projectionConfig={{ scale: 142 }} width={900} height={440} aria-label="Visa eligibility world map">
        <defs>
          <pattern id="mixedPattern" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="4" height="8" fill="#5cbdb9"/><rect x="4" width="4" height="8" fill="#f4aab9"/></pattern>
          <filter id="countryGlow" x="-35%" y="-35%" width="170%" height="170%"><feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ff5f82" floodOpacity="1"/></filter>
        </defs>
        <ZoomableGroup minZoom={1} maxZoom={4} center={position.coordinates} zoom={position.zoom} onMoveEnd={({ coordinates, zoom }) => setPosition({ coordinates: coordinates as [number, number], zoom })}>
          <Geographies geography={world}>{({ geographies }) => geographies.map((geo) => {
            const destination = resolve(geo)
            const mixed = (destination?.pattern.length ?? 0) > 1
            const onlineOrArrival = destination?.pattern[0] !== 'visa-free'
            const selectedCountry = active?.countryCode === destination?.countryCode
            const fill = selectedCountry ? '#ffd45c' : !destination?.eligible ? '#d9dddc' : mixed ? 'url(#mixedPattern)' : onlineOrArrival ? '#f4aab9' : '#5cbdb9'
            return <Geography key={geo.rsmKey} geography={geo} tabIndex={destination ? 0 : -1} role={destination ? 'button' : undefined} aria-label={destination ? `${destination.country}, ${destination.eligible ? 'eligible' : destination.policies.filter((item) => item.kind === 'restricted').map((item) => `${item.passport} needs preapproval`).join(', ')}` : undefined} onClick={() => destination && setActive(destination)} onKeyDown={(event) => { if (destination && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setActive(destination) } }} filter={selectedCountry ? 'url(#countryGlow)' : undefined} style={{ default: { fill, stroke: selectedCountry ? '#ff5f82' : '#fff', strokeWidth: selectedCountry ? 1.7 : .6, outline: 'none' }, hover: { fill: selectedCountry ? '#ffd45c' : destination?.eligible ? '#339e99' : '#c9cecc', stroke: selectedCountry ? '#ff5f82' : '#fff', strokeWidth: selectedCountry ? 1.7 : .6, outline: 'none', cursor: destination ? 'pointer' : 'default' }, pressed: { fill, outline: 'none' } }}/>
          })}</Geographies>
        </ZoomableGroup>
      </ComposableMap>
      <div className="map-controls" aria-label="Map zoom controls">
        <button type="button" aria-label="Zoom in" onClick={() => changeZoom(.75)} disabled={position.zoom >= 4}><Plus size={17}/></button>
        <button type="button" aria-label="Zoom out" onClick={() => changeZoom(-.75)} disabled={position.zoom <= 1}><Minus size={17}/></button>
        <button type="button" aria-label="Reset map zoom" onClick={() => setPosition(defaultPosition)} disabled={position.zoom === 1 && position.coordinates[0] === 0 && position.coordinates[1] === 0}><RotateCcw size={15}/></button>
      </div>
      {active && <aside ref={cardRef} className={`country-card ${active.eligible ? '' : 'blocked'}`} aria-live="polite">
        <div><p className="eyebrow">{active.eligible ? 'Ready to explore' : 'Preapproval needed'}</p><h3 className="country-title"><span className="country-flag" aria-hidden>{flagFor(active.countryCode)}</span>{active.country}</h3></div>
        <div className="policy-list">{active.policies.map((policy) => <span key={policy.passport}><b>{policy.passport}</b> {policy.label}</span>)}</div>
        {active.eligible ? <div className="city-list">{cities.map((city) => <section className="city-group" key={city.name}><div className="city-heading"><strong>{city.name}</strong><small>{city.population ? `${populationFormatter.format(city.population)} people` : 'Population unavailable'}</small></div>{city.airports.map((airport) => <button type="button" className={selected?.iata === airport.iata ? 'selected' : ''} onClick={() => onSelect(airport)} key={airport.iata}><MapPin size={16}/><span><strong>{airport.name}</strong><small>{airport.iata}</small></span>{selected?.iata === airport.iata && <Check size={17}/>}</button>)}</section>)}</div> : <p className="blocked-copy">At least one traveller needs advance approval, so this country is unavailable for this search.</p>}
      </aside>}
    </div>
    <p className="freshness">Visa data refreshed {new Date(data.freshness.refreshedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}{data.freshness.stale ? ' · Using last available copy' : ''}</p>
  </section>
}
