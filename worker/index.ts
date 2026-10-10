import { Hono, type Context } from 'hono'
import { z } from 'zod'
import { fallbackDataset, buildVisaResponse, DATASET_URL, normalizeCsv, VISA_KEY, type VisaDataset } from './visa'
import { googleFlightsUrl, normalizeFlights, readToken, type SerpFlight } from './flights'
import type { SearchContext } from '../shared/types'

export interface Env {
  VISA_DATA: KVNamespace
  ASSETS: Fetcher
  SERPAPI_KEY?: string
}

type Variables = { requestId: string }
type AppContext = Context<{ Bindings: Env; Variables: Variables }>
interface SerpResponse { best_flights?: SerpFlight[]; other_flights?: SerpFlight[]; error?: string; search_metadata?: { google_flights_url?: string }; [key: string]: unknown }
const app = new Hono<{ Bindings: Env; Variables: Variables }>()
const instanceRequests = new Map<string, { count: number; reset: number }>()

const error = (code: string, message: string, status: 400 | 401 | 403 | 404 | 408 | 429 | 500 | 502 | 503 = 400, retryable = false) => Response.json({ error: { code, message, retryable } }, { status })

app.use('/api/*', async (c, next) => {
  c.set('requestId', crypto.randomUUID())
  const site = c.req.header('Sec-Fetch-Site')
  const origin = c.req.header('Origin')
  if (site === 'cross-site' || (origin && new URL(origin).host !== new URL(c.req.url).host)) return error('FORBIDDEN_ORIGIN', 'This API only accepts requests from FreeVisaTrip.', 403)
  const ip = c.req.header('CF-Connecting-IP') ?? 'local'
  const current = instanceRequests.get(ip)
  const now = Date.now()
  if (!current || current.reset < now) instanceRequests.set(ip, { count: 1, reset: now + 60_000 })
  else if (++current.count > 45) return error('RATE_LIMITED', 'Too many requests. Please wait a minute.', 429, true)
  await next()
  c.header('Cache-Control', 'no-store')
  c.header('X-Content-Type-Options', 'nosniff')
})

app.get('/api/health', async (c) => {
  const stored = await c.env.VISA_DATA.get<VisaDataset>(VISA_KEY, 'json')
  return c.json({ status: 'ok', visaData: { source: stored ? 'kv' : 'fallback', refreshedAt: (stored ?? fallbackDataset).refreshedAt }, fareProviderConfigured: Boolean(c.env.SERPAPI_KEY) })
})

app.get('/api/visa-map', async (c) => {
  const passportCodes = (c.req.query('passports') ?? '').split(',').filter(Boolean)
  if (!passportCodes.length || passportCodes.length > 20 || passportCodes.some((code) => !/^[A-Z]{2}$/.test(code))) return error('INVALID_PASSPORTS', 'Choose between 1 and 20 valid passports.')
  const stored = await c.env.VISA_DATA.get<VisaDataset>(VISA_KEY, 'json')
  const dataset = stored ?? fallbackDataset
  const stale = Date.now() - Date.parse(dataset.refreshedAt) > 48 * 60 * 60_000
  c.header('Cache-Control', 'public, max-age=300')
  return c.json(buildVisaResponse(dataset, passportCodes, stale))
})

const contextSchema = z.object({
  origin: z.string().regex(/^[A-Z]{3}$/), destination: z.string().regex(/^[A-Z]{3}$/),
  outboundDate: z.string().date(), returnDate: z.string().date(), currency: z.enum(['SGD','USD','EUR','GBP','AUD']),
  cabin: z.literal('economy'), passengers: z.object({ adults: z.number().int().min(1).max(9), children: z.number().int().min(0).max(8), infants: z.number().int().min(0).max(8) }),
}).superRefine((value, ctx) => {
  if (value.returnDate <= value.outboundDate) ctx.addIssue({ code: 'custom', message: 'Return date must be after departure date' })
  if (value.outboundDate < new Date().toISOString().slice(0, 10)) ctx.addIssue({ code: 'custom', message: 'Departure date cannot be in the past' })
  if (value.passengers.infants > value.passengers.adults) ctx.addIssue({ code: 'custom', message: 'Each infant requires an adult' })
  if (value.passengers.adults + value.passengers.children > 9) ctx.addIssue({ code: 'custom', message: 'Maximum 9 seated passengers' })
})

async function readContext(c: AppContext): Promise<SearchContext | Response> {
  let body: unknown
  try { body = await c.req.json() } catch { return error('INVALID_REQUEST', 'Expected a JSON request body.') }
  const candidate = (body as { context?: unknown }).context ?? body
  const parsed = contextSchema.safeParse(candidate)
  if (!parsed.success) return error('INVALID_SEARCH', parsed.error.issues[0]?.message ?? 'Invalid flight search.')
  return parsed.data
}

async function fetchSerp(params: URLSearchParams, apiKey: string): Promise<SerpResponse | Response> {
  params.set('engine', 'google_flights'); params.set('api_key', apiKey); params.set('no_cache', 'false'); params.set('hl', 'en')
  try {
    const response = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(12_000) })
    const data = await response.json() as SerpResponse
    if (response.status === 429 || String(data.error ?? '').toLowerCase().includes('credits')) return error('QUOTA_EXHAUSTED', 'The monthly live-fare allowance has been used. Try again next month.', 429)
    if (!response.ok || data.error) return error('PROVIDER_ERROR', 'The fare provider could not complete this search.', 502, true)
    return data
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'TimeoutError') return error('PROVIDER_TIMEOUT', 'The fare search timed out. Please retry.', 408, true)
    return error('PROVIDER_ERROR', 'The fare provider is temporarily unavailable.', 502, true)
  }
}

function serpParams(context: SearchContext) {
  const params = new URLSearchParams({ departure_id: context.origin, arrival_id: context.destination, outbound_date: context.outboundDate, return_date: context.returnDate, currency: context.currency, type: '1', travel_class: '1', adults: String(context.passengers.adults), children: String(context.passengers.children), infants_in_seat: String(context.passengers.infants) })
  return params
}

app.post('/api/flights/search', async (c) => {
  if (!c.env.SERPAPI_KEY) return error('PROVIDER_NOT_CONFIGURED', 'Live fares are not configured yet.', 503)
  const context = await readContext(c)
  if (context instanceof Response) return context
  const cacheKey = new Request(`https://cache.freevisatrip/search?${serpParams(context)}`)
  const edgeCache = (caches as CacheStorage & { default: Cache }).default
  let data: SerpResponse; let cacheHit = false
  const cached = await edgeCache.match(cacheKey)
  if (cached) { data = await cached.json<SerpResponse>(); cacheHit = true }
  else {
    const upstream = await fetchSerp(serpParams(context), c.env.SERPAPI_KEY)
    if (upstream instanceof Response) return upstream
    data = upstream
    c.executionCtx.waitUntil(edgeCache.put(cacheKey, Response.json(data, { headers: { 'Cache-Control': 'max-age=600' } })))
  }
  const raw = [...(data.best_flights ?? []), ...(data.other_flights ?? [])] as SerpFlight[]
  if (!raw.length) return error('NO_RESULTS', 'No outbound flights were found for these dates.', 404)
  const flights = await normalizeFlights(raw, context, c.env.SERPAPI_KEY, 'outbound')
  return c.json({ flights, searchId: crypto.randomUUID(), cached: cacheHit })
})

app.post('/api/flights/returns', async (c) => {
  if (!c.env.SERPAPI_KEY) return error('PROVIDER_NOT_CONFIGURED', 'Live fares are not configured yet.', 503)
  let body: { context?: unknown; outboundToken?: unknown }
  try { body = await c.req.json() } catch { return error('INVALID_REQUEST', 'Expected a JSON request body.') }
  const parsed = contextSchema.safeParse(body.context)
  if (!parsed.success || typeof body.outboundToken !== 'string') return error('INVALID_SEARCH', 'The return search is incomplete.')
  const token = await readToken(body.outboundToken, c.env.SERPAPI_KEY)
  if (!token || JSON.stringify(token.context) !== JSON.stringify(parsed.data) || typeof token.departureToken !== 'string') return error('STALE_TOKEN', 'That outbound selection expired. Search again.', 400)
  const params = serpParams(parsed.data); params.set('departure_token', token.departureToken)
  const upstream = await fetchSerp(params, c.env.SERPAPI_KEY)
  if (upstream instanceof Response) return upstream
  const raw = [...(upstream.best_flights ?? []), ...(upstream.other_flights ?? [])] as SerpFlight[]
  if (!raw.length) return error('NO_RESULTS', 'No matching return flights were found.', 404)
  return c.json({ flights: await normalizeFlights(raw, parsed.data, c.env.SERPAPI_KEY, 'return'), searchId: crypto.randomUUID(), cached: false, googleFlightsUrl: upstream.search_metadata?.google_flights_url ?? googleFlightsUrl(parsed.data) })
})

app.onError(() => error('INTERNAL_ERROR', 'Something went wrong. Please try again.', 500, true))
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw))

async function refreshVisaData(env: Env): Promise<void> {
  const previous = await env.VISA_DATA.get<VisaDataset>(VISA_KEY, 'json')
  const headers = new Headers()
  if (previous?.etag) headers.set('If-None-Match', previous.etag)
  const response = await fetch(DATASET_URL, { headers, signal: AbortSignal.timeout(20_000) })
  if (response.status === 304) return
  if (!response.ok) throw new Error(`Visa source returned ${response.status}`)
  const etag = response.headers.get('ETag') ?? undefined
  const dataset = normalizeCsv(await response.text(), new Date().toISOString(), etag ?? crypto.randomUUID(), etag)
  await env.VISA_DATA.put(VISA_KEY, JSON.stringify(dataset))
}

export { refreshVisaData }
export default { fetch: app.fetch, scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) { ctx.waitUntil(refreshVisaData(env)) } }
