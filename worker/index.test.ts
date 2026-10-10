import { describe, expect, it } from 'vitest'
import worker, { type Env } from './index'

function environment(stored: unknown = null): Env {
  return {
    VISA_DATA: { get: async () => stored, put: async () => undefined } as unknown as KVNamespace,
    ASSETS: { fetch: async () => new Response('asset') },
  } as unknown as Env
}

const execution = { waitUntil: () => undefined, passThroughOnException: () => undefined, props: {} } as unknown as ExecutionContext

describe('Worker API', () => {
  it('reports configuration without exposing a secret', async () => {
    const response = await worker.fetch(new Request('https://example.com/api/health'), environment(), execution)
    const body = await response.json() as Record<string, unknown>
    expect(response.status).toBe(200)
    expect(body.fareProviderConfigured).toBe(false)
    expect(JSON.stringify(body)).not.toContain('SERP')
  })

  it('rejects malformed passports', async () => {
    const response = await worker.fetch(new Request('https://example.com/api/visa-map?passports=bad'), environment(), execution)
    expect(response.status).toBe(400)
    expect((await response.json() as { error: { code: string } }).error.code).toBe('INVALID_PASSPORTS')
  })

  it('serves bundled visa fallback data', async () => {
    const response = await worker.fetch(new Request('https://example.com/api/visa-map?passports=SG,IN'), environment(), execution)
    const body = await response.json() as { destinations: unknown[]; freshness: { stale: boolean } }
    expect(response.status).toBe(200)
    expect(body.destinations.length).toBeGreaterThan(20)
    expect(body.freshness.stale).toBe(true)
  })

  it('blocks cross-site calls', async () => {
    const response = await worker.fetch(new Request('https://example.com/api/health', { headers: { 'Sec-Fetch-Site': 'cross-site' } }), environment(), execution)
    expect(response.status).toBe(403)
  })

  it('returns a stable error when fares are unconfigured', async () => {
    const response = await worker.fetch(new Request('https://example.com/api/flights/search', { method: 'POST', body: '{}' }), environment(), execution)
    expect(response.status).toBe(503)
    expect((await response.json() as { error: { code: string } }).error.code).toBe('PROVIDER_NOT_CONFIGURED')
  })
})
