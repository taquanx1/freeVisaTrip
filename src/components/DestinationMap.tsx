import { useMemo, useState } from 'react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import world from 'world-atlas/countries-110m.json'
import { Check, Info, MapPin } from 'lucide-react'
import type { Airport, DestinationEligibility, VisaMapResponse } from '../../shared/types'

interface Props { data: VisaMapResponse; selected?: Airport; onSelect: (airport: Airport) => void }
const aliases: Record<string, string> = { 'United States of America': 'US', 'United Kingdom': 'GB', 'South Korea': 'KR', 'Czechia': 'CZ', 'Taiwan': 'TW' }

export function DestinationMap({ data, selected, onSelect }: Props) {
  const [active, setActive] = useState<DestinationEligibility | null>(null)
  const [hovered, setHovered] = useState<DestinationEligibility | null>(null)
  const byName = useMemo(() => new Map(data.destinations.flatMap((destination) => [[destination.country, destination], [aliases[destination.country] ?? '', destination]])), [data])
  const display = active ?? hovered
  const accessibleCount = data.destinations.filter((item) => item.eligible).length

  const resolve = (geography: { properties?: { name?: string } }) => {
    const name = geography.properties?.name ?? ''
    return data.destinations.find((destination) => destination.country === name || destination.countryCode === aliases[name]) ?? byName.get(name)
  }

  return <section className="step map-step" aria-labelledby="map-title">
    <div className="step-heading"><span className="step-number">02</span><div><p className="eyebrow">Explore the map</p><h2 id="map-title">Where can everyone go?</h2><p><strong>{accessibleCount} gateway countries</strong> match your passports. Choose a city to continue.</p></div></div>
    <div className="map-shell">
      <div className="legend" aria-label="Map legend"><span><i className="swatch free"/>Visa-free</span><span><i className="swatch arrival"/>On arrival / online</span><span><i className="swatch mixed"/>Mixed</span><span><i className="swatch restricted"/>Embassy visa</span></div>
      <ComposableMap projectionConfig={{ scale: 142 }} width={900} height={440} aria-label="Visa eligibility world map">
        <defs><pattern id="mixedPattern" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="4" height="8" fill="#5cbdb9"/><rect x="4" width="4" height="8" fill="#f4aab9"/></pattern></defs>
        <ZoomableGroup maxZoom={4}>
          <Geographies geography={world}>{({ geographies }) => geographies.map((geo) => {
            const destination = resolve(geo)
            const mixed = (destination?.pattern.length ?? 0) > 1
            const onlineOrArrival = destination?.pattern[0] !== 'visa-free'
            const fill = !destination?.eligible ? '#d9dddc' : mixed ? 'url(#mixedPattern)' : onlineOrArrival ? '#f4aab9' : '#5cbdb9'
            return <Geography key={geo.rsmKey} geography={geo} tabIndex={destination ? 0 : -1} role={destination ? 'button' : undefined} aria-label={destination ? `${destination.country}, ${destination.eligible ? 'eligible' : destination.policies.filter((item) => item.kind === 'restricted').map((item) => `${item.passport} needs an embassy visa`).join(', ')}` : undefined} onMouseEnter={() => setHovered(destination ?? null)} onMouseLeave={() => setHovered(null)} onClick={() => destination && setActive(destination)} onKeyDown={(event) => { if (destination && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setActive(destination) } }} style={{ default: { fill, stroke: '#fff', strokeWidth: .6, outline: 'none' }, hover: { fill: destination?.eligible ? '#339e99' : '#c9cecc', stroke: '#fff', outline: 'none', cursor: destination ? 'pointer' : 'default' }, pressed: { fill, outline: 'none' } }}/>
          })}</Geographies>
          {data.destinations.filter((destination) => destination.eligible && (active?.countryCode === destination.countryCode || hovered?.countryCode === destination.countryCode)).flatMap((destination) => destination.airports).map((airport) => <Marker key={airport.iata} coordinates={[airport.lon, airport.lat]}><circle r={5} fill="#172b2a" stroke="#fff" strokeWidth={2}/></Marker>)}
        </ZoomableGroup>
      </ComposableMap>
      <div className="map-tip"><Info size={16}/><span>On mobile, tap a country first, then choose a city below.</span></div>
      {display && <aside className={`country-card ${display.eligible ? '' : 'blocked'}`} aria-live="polite">
        <div><p className="eyebrow">{display.eligible ? 'Ready to explore' : 'Embassy visa needed'}</p><h3>{display.country}</h3></div>
        <div className="policy-list">{display.policies.map((policy) => <span key={policy.passport}><b>{policy.passport}</b> {policy.label}</span>)}</div>
        {display.eligible ? <div className="city-list">{display.airports.map((airport) => <button className={selected?.iata === airport.iata ? 'selected' : ''} onClick={() => onSelect(airport)} key={airport.iata}><MapPin size={16}/><span><strong>{airport.municipality}</strong><small>{airport.name} · {airport.iata}</small></span>{selected?.iata === airport.iata && <Check size={17}/>}</button>)}</div> : <p className="blocked-copy">At least one traveller needs a conventional visa, so this country is unavailable for this search.</p>}
      </aside>}
    </div>
    <p className="freshness">Visa data refreshed {new Date(data.freshness.refreshedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}{data.freshness.stale ? ' · Using last available copy' : ''}</p>
  </section>
}
