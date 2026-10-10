export type PolicyKind = 'visa-free' | 'visa-on-arrival' | 'evisa' | 'eta' | 'restricted'

export interface Passport {
  code: string
  name: string
  flag: string
}

export interface Airport {
  iata: string
  name: string
  municipality: string
  countryCode: string
  country: string
  lat: number
  lon: number
}

export interface PassportPolicy {
  passport: string
  kind: PolicyKind
  label: string
  raw: string | number | null
}

export interface DestinationEligibility {
  countryCode: string
  country: string
  eligible: boolean
  pattern: Array<Exclude<PolicyKind, 'restricted'>>
  policies: PassportPolicy[]
  airports: Airport[]
}

export interface VisaMapResponse {
  destinations: DestinationEligibility[]
  freshness: { refreshedAt: string; revision: string; stale: boolean; source: string }
}

export interface SearchContext {
  origin: string
  destination: string
  outboundDate: string
  returnDate: string
  currency: string
  cabin: 'economy'
  passengers: { adults: number; children: number; infants: number }
}

export interface FlightChoice {
  token: string
  price: number
  currency: string
  airline: string
  airlineLogo?: string
  departure: { airport: string; time: string; date: string }
  arrival: { airport: string; time: string; date: string; nextDay: number }
  durationMinutes: number
  stops: number
  stopAirports: string[]
}

export interface FlightSearchResponse {
  flights: FlightChoice[]
  searchId: string
  cached: boolean
}

export interface ReturnSearchResponse extends FlightSearchResponse {
  googleFlightsUrl: string
}

export interface ApiErrorBody {
  error: { code: string; message: string; retryable: boolean }
}
