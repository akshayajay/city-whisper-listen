# Chennai X signals

Citizen submissions remain open through **Report an issue**, independently of X availability. X posts join the Live dataset with author attribution, an optional official X embed and a link to the original; demo records remain separate.

## Access and activation

1. Create an approved app in the [X Developer Console](https://console.x.com/). The account owner must approve the developer terms and any credit purchase. No X credentials are included in this repository.
2. Store `X_BEARER_TOKEN` as a secret in the existing Site's runtime environment. Create a separate random `X_INGEST_TOKEN` secret of at least 32 characters for the collector endpoint. Never put either in frontend variables, Git, URLs or chat.
3. Agree a read budget and set `X_DAILY_POST_LIMIT` (10–10000) and `X_ENABLED=true`. The default is disabled with a zero limit. Redeploy a saved Site version to apply runtime changes.
4. Run one sync from a trusted operator environment: `node --env-file=.env scripts/sync-x.mjs`. Its private environment needs only `CITYPULSE_URL` and `X_INGEST_TOKEN`; the X bearer stays on the server. To keep collecting while that process runs, add `--watch`. The standalone API server can load configuration with `node --env-file=.env scripts/serve.mjs`.
5. Check **Data sources** for a successful sync. The dashboard receives inserted posts through SSE. Merely opening the public dashboard never triggers paid X calls. There is no always-on collector provisioned by this change; the watch process must run on an available host or an authorized external scheduler must call the endpoint.

X uses paid read credits. The current published price is $0.005 per post and $0.010 per user resource, so 10 posts with 10 distinct authors can cost about $0.15. Prices may change; confirm them in the [official pricing documentation](https://docs.x.com/x-api/getting-started/pricing) and set an account spending limit. The application reserves 10 post-read slots **before** every request, even on failures or empty responses, and at most 10 author expansions are requested per page. Reservations reset at UTC midnight. This is a conservative request-volume guard, not a billing guarantee or a cap on other applications using the same X account.

## Collection and interpretation

- Uses the official [recent search API](https://docs.x.com/x-api/posts/search/quickstart/recent-search), never browser scraping or fabricated fallback tweets.
- Searches Chennai / சென்னை plus civic issue keywords; excludes reposts. Exact query is in `worker/x-source.js` and `/api/sources`.
- First sync looks back 24 hours. Later syncs request IDs newer than the stored high-water mark. After a long outage, the collector starts a new 24-hour window.
- **Sampled collection**: at most the latest 10 posts per successful interval; no pagination/backfill. Busy intervals can skip posts. It is not exhaustive streaming or a representative opinion survey.
- City assignment means the post mentions Chennai. The author's location and the event's location are unverified. No user-level location inference is performed.
- Categories use small English/Tamil keyword rules. Sentiment uses the existing English rules and may label Tamil text neutral. No trained NLP model or model training is involved.
- Idempotent X post IDs prevent duplicate rows. A database lease prevents concurrent collectors from multiplying requests. Provider failures preserve the cursor, expose a sanitized error and leave citizen reports working.
- CSV exports include X references and derived categories but omit X post text and author handles. Cached post text is not displayed as a substitute for an unavailable original.
- The owner can honor specific deletion notices via `POST /api/sources/x/remove` with the ingestion bearer token and JSON `{ "ids": ["numeric-post-id"] }`. This removes only X records, never citizen submissions.
- X records older than seven days are removed during successful syncs. Before ongoing collection, the operator remains responsible for honoring X deletion/compliance requests and current display/redistribution terms. Do not treat a seven-day retention rule as a deletion-compliance service.

## Verification

`npm test` covers disabled defaults, denied public ingestion, secret-free status, attributed imports, source filters, CSV links, deduplication, concurrent request limits, UTC budget reset, malformed responses, failed API calls and independent citizen submissions. X responses in unit tests are explicit fixtures. A successful fixture test is not proof of live X API access.
