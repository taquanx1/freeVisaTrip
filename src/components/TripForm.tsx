import { useMemo, useState } from 'react'
import { ChevronDown, Minus, PlaneTakeoff, Plus, Search, Users } from 'lucide-react'
import { airports } from '../../shared/airports'
import type { Airport, SearchContext } from '../../shared/types'

interface Props { destination: Airport; context: SearchContext; onChange: (context: SearchContext) => void; onSearch: () => void; loading: boolean }

export function TripForm({ destination, context, onChange, onSearch, loading }: Props) {
  const [airportQuery, setAirportQuery] = useState('')
  const [showAirports, setShowAirports] = useState(false)
  const [showPassengers, setShowPassengers] = useState(false)
  const matchingAirports = useMemo(() => airports.filter((airport) => airport.iata !== destination.iata && `${airport.iata} ${airport.name} ${airport.municipality} ${airport.country}`.toLowerCase().includes(airportQuery.toLowerCase())).slice(0, 7), [airportQuery, destination.iata])
  const origin = airports.find((airport) => airport.iata === context.origin)
  const update = <K extends keyof SearchContext>(key: K, value: SearchContext[K]) => onChange({ ...context, [key]: value })
  const passengerTotal = context.passengers.adults + context.passengers.children + context.passengers.infants
  const valid = context.origin && context.outboundDate && context.returnDate > context.outboundDate
  const setPassenger = (key: keyof SearchContext['passengers'], value: number) => update('passengers', { ...context.passengers, [key]: value })

  return <section className="step trip-step" aria-labelledby="trip-title">
    <div className="step-heading"><span className="step-number">03</span><div><p className="eyebrow">Build your trip</p><h2 id="trip-title">When are you heading to {destination.municipality}?</h2><p>Choose your starting point and dates. We’ll compare complete round trips.</p></div></div>
    <div className="search-card">
      <div className="route-row"><div className="field airport-field"><label htmlFor="origin">Flying from</label><div className="input-wrap"><PlaneTakeoff size={18}/><input id="origin" value={airportQuery || (origin ? `${origin.municipality} (${origin.iata})` : '')} placeholder="City or airport" autoComplete="off" onFocus={() => { setAirportQuery(''); setShowAirports(true) }} onChange={(event) => { setAirportQuery(event.target.value); setShowAirports(true) }}/></div>{showAirports && <ul className="airport-options">{matchingAirports.map((airport) => <li key={airport.iata}><button onMouseDown={(event) => event.preventDefault()} onClick={() => { update('origin', airport.iata); setAirportQuery(''); setShowAirports(false) }}><b>{airport.iata}</b><span>{airport.municipality}<small>{airport.name}</small></span></button></li>)}</ul>}</div><span className="route-arrow">→</span><div className="field"><label>Flying to</label><div className="destination-input"><b>{destination.iata}</b><span>{destination.municipality}<small>{destination.name}</small></span></div></div></div>
      <div className="details-row">
        <div className="field"><label htmlFor="depart">Depart</label><input id="depart" type="date" min={new Date().toISOString().slice(0,10)} value={context.outboundDate} onChange={(event) => update('outboundDate', event.target.value)}/></div>
        <div className="field"><label htmlFor="return">Return</label><input id="return" type="date" min={context.outboundDate || new Date().toISOString().slice(0,10)} value={context.returnDate} onChange={(event) => update('returnDate', event.target.value)}/></div>
        <div className="field compact"><label htmlFor="currency">Currency</label><select id="currency" value={context.currency} onChange={(event) => update('currency', event.target.value as SearchContext['currency'])}>{['SGD','USD','EUR','GBP','AUD'].map((currency) => <option key={currency}>{currency}</option>)}</select></div>
        <div className="field passenger-field"><label>Travellers · Economy</label><button className="passenger-trigger" onClick={() => setShowPassengers(!showPassengers)}><Users size={17}/>{passengerTotal} traveller{passengerTotal !== 1 && 's'}<ChevronDown size={16}/></button>{showPassengers && <div className="passenger-popover">{([['adults','Adults','12+ years'],['children','Children','2–11 years'],['infants','Infants','Under 2']] as const).map(([key,label,hint]) => <div className="passenger-row" key={key}><span><strong>{label}</strong><small>{hint}</small></span><div><button aria-label={`Remove ${label}`} disabled={context.passengers[key] <= (key === 'adults' ? 1 : 0)} onClick={() => setPassenger(key, context.passengers[key] - 1)}><Minus size={15}/></button><b>{context.passengers[key]}</b><button aria-label={`Add ${label}`} disabled={passengerTotal >= 9 || (key === 'infants' && context.passengers.infants >= context.passengers.adults)} onClick={() => setPassenger(key, context.passengers[key] + 1)}><Plus size={15}/></button></div></div>)}</div>}</div>
        <button className="search-button" disabled={!valid || loading} onClick={onSearch}><Search size={18}/>{loading ? 'Searching…' : 'Search flights'}</button>
      </div>
    </div>
  </section>
}
