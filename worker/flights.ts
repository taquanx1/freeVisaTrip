import type { FlightChoice, SearchContext } from '../shared/types'

export interface SerpFlight { total_duration?: number; price?: number; departure_token?: string; flights?: Array<{ departure_airport?: { id?: string; time?: string }; arrival_airport?: { id?: string; time?: string }; duration?: number; airline?: string; airline_logo?: string }>; layovers?: Array<{ id?: string }> }

const encoder = new TextEncoder()
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
const fromBase64url = (value: string) => Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), (character) => character.charCodeAt(0))

async function signingKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function createToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const body = base64url(encoder.encode(JSON.stringify(payload)))
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(body))
  return `${body}.${base64url(new Uint8Array(signature))}`
}

export async function readToken(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const [body, signature] = token.split('.')
    if (!body || !signature || !(await crypto.subtle.verify('HMAC', await signingKey(secret), fromBase64url(signature), encoder.encode(body)))) return null
    const payload = JSON.parse(new TextDecoder().decode(fromBase64url(body))) as Record<string, unknown>
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    return payload
  } catch { return null }
}

const datePart = (time: string | undefined, fallback: string) => time?.slice(0, 10) || fallback
const clockPart = (time: string | undefined) => time?.slice(11, 16) || '--:--'

export async function normalizeFlights(rawFlights: SerpFlight[], context: SearchContext, secret: string, direction: 'outbound' | 'return'): Promise<FlightChoice[]> {
  return Promise.all(rawFlights.filter((item) => item.flights?.length && item.price).slice(0, 20).map(async (item, index) => {
    const legs = item.flights ?? []
    const first = legs[0]
    const last = legs.at(-1)!
    const fallbackDate = direction === 'outbound' ? context.outboundDate : context.returnDate
    const departureDate = datePart(first.departure_airport?.time, fallbackDate)
    const arrivalDate = datePart(last.arrival_airport?.time, fallbackDate)
    const dayDifference = Math.max(0, Math.round((Date.parse(arrivalDate) - Date.parse(departureDate)) / 86_400_000))
    return {
      token: await createToken({ departureToken: item.departure_token, index, direction, context, exp: Date.now() + 15 * 60_000 }, secret),
      price: item.price!, currency: context.currency,
      airline: [...new Set(legs.map((leg) => leg.airline).filter(Boolean))].join(' · ') || 'Multiple airlines',
      airlineLogo: first.airline_logo,
      departure: { airport: first.departure_airport?.id ?? context.origin, time: clockPart(first.departure_airport?.time), date: departureDate },
      arrival: { airport: last.arrival_airport?.id ?? context.destination, time: clockPart(last.arrival_airport?.time), date: arrivalDate, nextDay: dayDifference },
      durationMinutes: item.total_duration ?? legs.reduce((sum, leg) => sum + (leg.duration ?? 0), 0),
      stops: Math.max(0, legs.length - 1), stopAirports: item.layovers?.map((layover) => layover.id).filter((id): id is string => Boolean(id)) ?? [],
    }
  }))
}

export function googleFlightsUrl(context: SearchContext): string {
  const query = `Flights from ${context.origin} to ${context.destination} ${context.outboundDate} return ${context.returnDate}`
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}&curr=${context.currency}&hl=en`
}
