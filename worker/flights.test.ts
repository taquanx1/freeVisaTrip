import { describe, expect, it } from 'vitest'
import { createToken, googleFlightsUrl, normalizeFlights, readToken } from './flights'
import type { SearchContext } from '../shared/types'

const context: SearchContext = { origin: 'SIN', destination: 'BKK', outboundDate: '2027-01-10', returnDate: '2027-01-15', currency: 'SGD', cabin: 'economy', passengers: { adults: 1, children: 0, infants: 0 } }

describe('flight normalization', () => {
  it('creates tamper-evident expiring tokens', async () => {
    const token = await createToken({ exp: Date.now() + 1000, value: 42 }, 'secret')
    expect((await readToken(token, 'secret'))?.value).toBe(42)
    expect(await readToken(`${token}x`, 'secret')).toBeNull()
    expect(await readToken(await createToken({ exp: 1 }, 'secret'), 'secret')).toBeNull()
  })

  it('normalizes an overnight result', async () => {
    const [flight] = await normalizeFlights([{ price: 220, total_duration: 150, departure_token: 'provider-token', flights: [{ airline: 'Test Air', departure_airport: { id: 'SIN', time: '2027-01-10 23:30' }, arrival_airport: { id: 'BKK', time: '2027-01-11 02:00' } }] }], context, 'secret', 'outbound')
    expect(flight.arrival.nextDay).toBe(1)
    expect(flight.stops).toBe(0)
    expect(flight.price).toBe(220)
  })

  it('builds a safe Google Flights handoff', () => expect(googleFlightsUrl(context)).toContain('google.com/travel/flights'))
})
