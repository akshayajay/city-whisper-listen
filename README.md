# CityPulse

A working civic analytics platform for Tamil Nadu: submit a report, watch it arrive on connected dashboards, and explore the same persisted records through charts, a city map, filters, and CSV export.

## What works

- **Citizen reports:** validated submissions saved in a database, with stable IDs and duplicate-safe retries.
- **Streaming updates:** server-sent events announce new records; clients reconnect with a cursor and refresh analytics. A 15-second fallback refresh recovers missed updates.
- **Honest demo mode:** synthetic events arrive every five seconds while a demo workspace is open. Demo records are stored separately from citizen reports and expire after 24 hours. Pausing stops that browser's generator; another viewer can still generate shared demo events.
- **Connected analytics:** city, category, sentiment, search, and time-window filters apply to the feed, totals, charts, map, and export. Database batches keep panel totals consistent.
- **Functional navigation:** overview, signal map, analytics, signal feed, and data sources are real routes, including direct page loads.
- **Responsive interface:** mobile navigation, accessible report dialog, explicit loading/error/empty states, and keyboard-selectable city markers.

## Run locally

Use **Node.js 24 or newer** (the local database uses `node:sqlite`).

```sh
npm ci
npm run dev:api
```

In another terminal:

```sh
npm run dev
```

Open [the local dashboard](http://localhost:8080/dashboard). Vite proxies `/api` to the API on port 8787. Local records survive restarts in the ignored `.data/citypulse.sqlite` file. Citizen reports and demo mode need no API keys. X ingestion needs separate approved API access; see [X setup](docs/x-integration.md).

The default view is explicitly labeled **Demo**. Choose **Live** to view citizen submissions and imported X posts, with a source filter to separate them. The report form always saves to Live and switches to that dataset after success.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The integration tests exercise the same Worker handlers and SQL used in production against a real SQLite database. They cover persistence after restart, duplicate prevention, input validation, dataset separation, filter/aggregate reconciliation, CSV escaping, time windows, storage errors, and SSE cursor replay.

## Deployment

The full platform uses a Cloudflare-compatible ESM Worker and a persistent D1 database, hosted together through Sites. The manifest is [`.openai/hosting.json`](.openai/hosting.json). Build outputs are `dist/client` (frontend) and `dist/server/index.js` (API Worker).

- Bind a D1 database as `DB` and the frontend assets as `ASSETS`.
- Apply the versioned SQL migrations in [`drizzle/`](drizzle/) before starting the Worker.
- Serve SPA routes through the asset binding and `/api/*` through the Worker.
- Keep the site access-controlled unless intentionally opening it to a public audience. This app is a shared workspace: visitors with access can read reports and submit new ones.
- A static-only deployment does **not** provide the API or durable storage. Old Vercel/Netlify static deployment files have been retired to avoid silently publishing a nonfunctional app.

For a self-hosted Node deployment, `npm start` serves both built assets and the same API using SQLite. Set `PORT`, `HOST`, and `DATA_DIR` as needed and attach durable storage. The included Render configuration uses this single-service arrangement; it requires a paid plan for its persistent disk. No paid deployment is created automatically.

The older Python prototype is retained in [`backend/`](backend/) for reference. It is **not** the backend for this version, and its social-media demo data is not mixed into the deployed database.

## API

| Method | Endpoint        | Purpose                                                   |
| ------ | --------------- | --------------------------------------------------------- |
| GET    | `/api/health`   | Database and service readiness                            |
| GET    | `/api/snapshot` | Consistent totals, charts, and newest 100 matching events |
| GET    | `/api/stream`   | SSE announcements and heartbeats, with cursor replay      |
| POST   | `/api/reports`  | Validate and persist a real citizen report                |
| POST   | `/api/demo`     | Add duplicate-safe simulated events                       |
| GET    | `/api/export`   | Export up to 10,000 matching records as CSV               |

Snapshot and export accept `mode=live|demo`, `city`, `category`, `sentiment`, `q`, and `hours=1|24|168|720`. Timestamps are UTC in storage; hourly chart labels and feed times use the browser's timezone. Calendar-day chart buckets are UTC. Search matches literal text in report content and neighborhood. The stream accepts `mode` and `cursor`, or the standard `Last-Event-ID` header.

## Interpretation and limits

- Sentiment is an **English keyword heuristic**, not a trained ML model or validated measure of public opinion. Negative keywords take precedence; unmatched text is neutral. Tamil and other languages can be submitted but are not reliably classified.
- Categories are selected by reporters. Demo sentiments and categories are predetermined examples.
- The map uses city centroids, not exact incident locations. Signal volume is not population-normalized.
- X has an optional, owner-authorized Chennai recent-search integration with bounded sampling and explicit source status. It stays disabled until credentials and a read limit are configured. Facebook is not connected. The platform does not scrape social media, forward reports to government, or claim official resolution.
- Reports are public on the live site. Do not submit personal details. The independent project is not an emergency service.
- The current deployment is intended for a small shared workspace. Report intake is limited to 10 new submissions per client per 10-minute window using rotating hashed network identifiers. High-volume rollout would still need moderation, stronger abuse controls, and operational monitoring.

## Hosted platform

[Open CityPulse](https://citypulse-listen.akshayajayakanth.chatgpt.site) — a public workspace with separate Live and Demo datasets.

### Chennai X integration

The optional collector reads up to 10 recent civic posts per 15-minute interval, persists attribution and original links, and uses the same live analytics and SSE as citizen reports. Chennai keyword matches are not verified locations. The source page displays actual configuration, successful-sync time, errors and read-limit status. See [setup, limits and operation](docs/x-integration.md).

- `GET /api/sources`: public source status; no secrets.
- `POST /api/sources/x/sync`: owner ingestion token required, disabled by default.
- `source=X` or `source=Citizen%20report`: consistent filters across feed, charts and CSV.
