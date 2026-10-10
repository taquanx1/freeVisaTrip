# FreeVisaTrip

Visa-aware destination discovery and round-trip flight search for groups travelling on different passports.

## What it includes

- Searchable multi-passport selection
- Interactive, keyboard-accessible visa eligibility map
- Mixed visa-free / visa-on-arrival / eVisa / ETA destination patterns
- Gateway airport, date, currency, cabin, and passenger controls
- SerpApi Google Flights proxy with outbound/return selection
- Signed, expiring selection tokens and short-lived edge caching
- Daily visa-data refresh into Workers KV with ETag support and bundled fallback data
- Responsive layouts, reduced motion, loading, empty, quota, and error states

## Local development

```bash
npm install
npm run dev
```

Run the Worker API alongside Vite with `npx wrangler dev`. Vite proxies `/api` to port 8787.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Cloudflare setup

1. Authenticate: `npx wrangler login`
2. Create KV: `npx wrangler kv namespace create VISA_DATA`
3. Replace the placeholder KV ID in `wrangler.jsonc` with the returned ID.
4. Store the fare key securely: `npx wrangler secret put SERPAPI_KEY`
5. Optionally seed current visa data: `npm run visa:seed-file -- /tmp/freevisatrip-visa-seed.json`, then upload it with `npx wrangler kv key put --remote --binding VISA_DATA --path /tmp/freevisatrip-visa-seed.json visa-dataset:v1`.
6. Deploy: `npm run deploy`

The cron trigger runs daily at 03:17 UTC. The first request can safely use the bundled visa snapshot before the first refresh.

Never store a SerpApi key in a source file, `.env` file committed to Git, Wrangler configuration, logs, or client-side code. Keep SerpApi paid renewal disabled to ensure quota exhaustion cannot create charges.

## API

- `GET /api/visa-map?passports=SG,IN`
- `POST /api/flights/search`
- `POST /api/flights/returns`
- `GET /api/health`

Visa information is community-sourced and advisory. Travellers must verify entry requirements with official authorities. FreeVisaTrip searches and redirects; it does not sell or reserve flights.
