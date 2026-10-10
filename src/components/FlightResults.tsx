import { useMemo, useState } from 'react'
import { ArrowRight, Clock3, ExternalLink, Plane, RotateCcw } from 'lucide-react'
import type { FlightChoice } from '../../shared/types'

interface Props { title: string; flights: FlightChoice[]; selected?: string; onSelect: (flight: FlightChoice) => void; googleUrl?: string; onReset?: () => void }
const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`

export function FlightResults({ title, flights, selected, onSelect, googleUrl, onReset }: Props) {
  const [sort, setSort] = useState<'cheapest' | 'fastest'>('cheapest')
  const sorted = useMemo(() => [...flights].sort((a, b) => sort === 'cheapest' ? a.price - b.price : a.durationMinutes - b.durationMinutes), [flights, sort])
  return <section className="results" aria-labelledby={`${title}-title`}>
    <div className="results-header"><div><p className="eyebrow">Live round-trip fares</p><h2 id={`${title}-title`}>{title}</h2></div><div className="sort-tabs" aria-label="Sort flights">{(['cheapest','fastest'] as const).map((item) => <button className={sort === item ? 'active' : ''} aria-pressed={sort === item} onClick={() => setSort(item)} key={item}>{item}</button>)}</div></div>
    <div className="flight-list">{sorted.map((flight) => <button key={flight.token} className={`flight-card ${selected === flight.token ? 'selected' : ''}`} onClick={() => onSelect(flight)} aria-pressed={selected === flight.token}>
      <div className="airline"><div className="airline-mark">{flight.airlineLogo ? <img src={flight.airlineLogo} alt=""/> : <Plane size={20}/>}</div><span>{flight.airline}</span></div>
      <div className="flight-time"><strong>{flight.departure.time}</strong><small>{flight.departure.airport}</small></div>
      <div className="flight-line"><span>{duration(flight.durationMinutes)}</span><i/><small>{flight.stops ? `${flight.stops} stop${flight.stops > 1 ? 's' : ''}${flight.stopAirports.length ? ` · ${flight.stopAirports.join(', ')}` : ''}` : 'Nonstop'}</small></div>
      <div className="flight-time"><strong>{flight.arrival.time}{flight.arrival.nextDay > 0 && <sup>+{flight.arrival.nextDay}</sup>}</strong><small>{flight.arrival.airport}</small></div>
      <div className="flight-price"><small>Total</small><strong>{flight.currency} {flight.price.toLocaleString()}</strong><span>{selected === flight.token ? 'Selected' : 'Choose'} <ArrowRight size={15}/></span></div>
    </button>)}</div>
    {googleUrl && selected && <div className="handoff"><div><Clock3 size={21}/><span><strong>Your round trip is ready</strong><small>Prices can change. Review the itinerary on Google Flights before booking.</small></span></div><a href={googleUrl} target="_blank" rel="noopener noreferrer" className="primary-button">Continue to Google Flights <ExternalLink size={16}/></a>{onReset && <button className="text-button" onClick={onReset}><RotateCcw size={15}/>Start over</button>}</div>}
  </section>
}

export function FlightSkeleton() { return <div className="results"><div className="skeleton title-skeleton"/>{[1,2,3].map((item) => <div className="skeleton flight-skeleton" key={item}/>)}</div> }
