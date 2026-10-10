import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowUpRight, Globe2, Heart, Menu, Plane, ShieldCheck } from 'lucide-react'
import type { Airport, FlightChoice, SearchContext, VisaMapResponse } from '../shared/types'
import { getVisaMap, searchFlights, searchReturns } from './api'
import { DestinationMap } from './components/DestinationMap'
import { FlightResults, FlightSkeleton } from './components/FlightResults'
import { PassportPicker } from './components/PassportPicker'
import { TripForm } from './components/TripForm'

const initialContext = (): SearchContext => ({ origin: '', destination: '', outboundDate: '', returnDate: '', currency: 'SGD', cabin: 'economy', passengers: { adults: 1, children: 0, infants: 0 } })

export default function App() {
  const [passports, setPassports] = useState<string[]>([])
  const [visaData, setVisaData] = useState<VisaMapResponse | null>(null)
  const [destination, setDestination] = useState<Airport>()
  const [context, setContext] = useState<SearchContext>(initialContext)
  const [outbounds, setOutbounds] = useState<FlightChoice[]>([])
  const [returns, setReturns] = useState<FlightChoice[]>([])
  const [selectedOutbound, setSelectedOutbound] = useState<FlightChoice>()
  const [selectedReturn, setSelectedReturn] = useState<FlightChoice>()
  const [googleUrl, setGoogleUrl] = useState('')
  const [loading, setLoading] = useState<'visa' | 'outbound' | 'return' | null>(null)
  const [error, setError] = useState<{ code: string; message: string }>()
  const [hasAutoSearched, setHasAutoSearched] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const tripRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const contextValid = Boolean(context.origin && context.destination && context.outboundDate && context.returnDate > context.outboundDate)
  const scroll = (ref: React.RefObject<HTMLDivElement | null>) => requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }))

  const showDestinations = async () => {
    setLoading('visa'); setError(undefined); setDestination(undefined); setOutbounds([]); setReturns([])
    try { setVisaData(await getVisaMap(passports)); scroll(mapRef) }
    catch (issue) { setError({ code: 'VISA_DATA_ERROR', message: issue instanceof Error ? issue.message : 'Visa data is unavailable.' }) }
    finally { setLoading(null) }
  }

  const chooseDestination = (airport: Airport) => {
    setDestination(airport); setContext((current) => ({ ...current, destination: airport.iata })); setOutbounds([]); setReturns([]); setHasAutoSearched(false); scroll(tripRef)
  }

  const runSearch = async () => {
    if (!contextValid) return
    setLoading('outbound'); setError(undefined); setOutbounds([]); setReturns([]); setSelectedOutbound(undefined); setSelectedReturn(undefined); setGoogleUrl('')
    try { const data = await searchFlights(context); setOutbounds(data.flights); scroll(resultsRef) }
    catch (issue) { setError({ code: (issue as { code?: string }).code ?? 'SEARCH_ERROR', message: issue instanceof Error ? issue.message : 'Flights are unavailable.' }); scroll(resultsRef) }
    finally { setLoading(null) }
  }

  useEffect(() => {
    if (contextValid && !hasAutoSearched) { setHasAutoSearched(true); void runSearch() }
    // Auto-search only once when the first complete form becomes valid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextValid, hasAutoSearched])

  const chooseOutbound = async (flight: FlightChoice) => {
    setSelectedOutbound(flight); setSelectedReturn(undefined); setReturns([]); setLoading('return'); setError(undefined)
    try { const data = await searchReturns(context, flight.token); setReturns(data.flights); setGoogleUrl(data.googleFlightsUrl) }
    catch (issue) { setError({ code: (issue as { code?: string }).code ?? 'RETURN_ERROR', message: issue instanceof Error ? issue.message : 'Return flights are unavailable.' }) }
    finally { setLoading(null) }
  }

  const reset = () => { setPassports([]); setVisaData(null); setDestination(undefined); setContext(initialContext()); setOutbounds([]); setReturns([]); setSelectedOutbound(undefined); setSelectedReturn(undefined); setGoogleUrl(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const selectedPassportNames = useMemo(() => passports.join(' + '), [passports])

  return <>
    <header><a className="brand" href="#top" aria-label="FreeVisaTrip home"><span><Globe2 size={23}/></span>FreeVisaTrip</a><nav><a href="#how">How it works</a><a href="#passport-title">Plan a trip</a></nav><button className="menu-button" aria-label="Open navigation"><Menu/></button></header>
    <main id="top">
      <section className="hero"><div className="hero-copy"><p className="eyebrow"><span/>Visa-smart flight discovery</p><h1>One world.<br/><em>Every passport.</em></h1><p className="hero-subtitle">Find places everyone in your group can visit visa-free, on arrival, or with an online authorisation—then compare the flights that get you there.</p><a className="primary-button hero-button" href="#passport-title">Find our next trip <ArrowUpRight size={17}/></a><div className="trust-row"><span><ShieldCheck size={18}/>Community visa data</span><span><Plane size={18}/>Live flight fares</span><span><Heart size={18}/>No booking fees</span></div></div><div className="hero-art" aria-hidden><div className="orbit orbit-one"><span>🇸🇬</span></div><div className="orbit orbit-two"><span>🇮🇳</span></div><div className="globe"><Globe2 strokeWidth={1.2}/><div className="plane-path"><Plane/></div></div><div className="destination-pill"><span>✦</span><div><small>Match found</small><strong>Bangkok, Thailand</strong></div></div></div></section>
      <section className="how" id="how"><p className="eyebrow">One shared adventure</p><h2>From passports to takeoff in three simple steps.</h2><div><article><b>01</b><span>🛂</span><h3>Add your passports</h3><p>Tell us every nationality travelling. Add as many as your group needs.</p></article><article><b>02</b><span>🗺️</span><h3>Explore open doors</h3><p>See destinations with visa-free, arrival, or simple online entry.</p></article><article><b>03</b><span>✈️</span><h3>Choose your flights</h3><p>Compare live round trips and continue to Google Flights to book.</p></article></div></section>
      <div className="planner"><PassportPicker selected={passports} onChange={(items) => { setPassports(items); setVisaData(null) }} onContinue={showDestinations}/>{loading === 'visa' && <div className="inline-loading" role="status"><span/>Checking entry policies for {selectedPassportNames}…</div>}<div ref={mapRef}>{visaData && <DestinationMap data={visaData} selected={destination} onSelect={chooseDestination}/>}</div><div ref={tripRef}>{destination && <TripForm destination={destination} context={context} onChange={(next) => { setContext(next); if (hasAutoSearched) { setOutbounds([]); setReturns([]) } }} onSearch={runSearch} loading={loading === 'outbound'}/>}</div>
        <div ref={resultsRef}>{error && <div className="error-state" role="alert"><AlertCircle/><div><strong>{error.code === 'QUOTA_EXHAUSTED' ? 'Free search limit reached' : 'We hit some turbulence'}</strong><p>{error.message}</p></div></div>}{loading === 'outbound' && <FlightSkeleton/>}{outbounds.length > 0 && <FlightResults title="Choose your outbound" flights={outbounds} selected={selectedOutbound?.token} onSelect={chooseOutbound}/>} {loading === 'return' && <FlightSkeleton/>}{returns.length > 0 && <FlightResults title="Now choose your return" flights={returns} selected={selectedReturn?.token} onSelect={setSelectedReturn} googleUrl={googleUrl} onReset={reset}/>}</div>
      </div>
    </main>
    <footer><div><a className="brand" href="#top"><span><Globe2 size={20}/></span>FreeVisaTrip</a><p>Visa guidance is advisory and may change. Always confirm entry requirements with official authorities before travel. Fares are supplied by Google Flights via SerpApi and may change before booking. Airport data: OurAirports. City population data: GeoNames (CC BY 4.0).</p></div><span>Built for borderless friendships.</span></footer>
  </>
}
