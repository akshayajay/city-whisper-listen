# Chennai news collection

`POST /api/news/sync` updates durable live events; `GET /api/news` reads the saved 30-day news analysis and source health. Citizen submissions continue through `/api/reports`. X remains disabled and is never called by the news writer.

## Sources and interpretation

- **GDELT headline files:** the provider-recommended alternative to its overloaded legacy search API. Fetches only public table-of-contents metadata, not article text or images. The initial archive also contains one qualifying headline found in a bounded sample of 48 minute files from the preceding 24 hours (42 available files, 58,695 indexed references scanned); this is not a complete archive. Initial ongoing collection scans up to 30 minutes; later runs overlap two minutes, with a five-minute publishing delay. Up to 30 files per call, three in flight, with bounded decompression and timeouts. Sparse 404 files are expected. A delay over 30 minutes can leave a gap, explicitly shown in source health. Headline URLs, publisher domains and **index timestamps** are retained; an index time is not a publication or incident time. [Dataset documentation](https://blog.gdeltproject.org/using-the-new-web-ngrams-dataset-to-find-relevant-coverage/).
- **PIB Chennai:** attributed official releases from the public monthly archive. The initial five-release backfill was retrieved on October 1, 2026. It is separately marked `initialBackfill` and never establishes a successful current source check. Archive dates have day precision in India Standard Time. Current requests may be denied by the publisher; failures remain visible and are not bypassed. [Reuse policy](https://www.pib.gov.in/content/3604_2_CopyrightPolicy.aspx?lang=1&reg=3).
- **Mongabay India:** official public WordPress API; searches the last 30 days and requires a civic Chennai focus in the headline or first three paragraphs. Figure captions and passing mentions elsewhere do not qualify. Only original headlines, bylines and links are displayed, without rewriting or republishing article bodies or photographs. [Publisher and licensing](https://india.mongabay.com/about/).

The app uses English civic keyword rules, not a trained or validated classifier. News is unscored for citizen sentiment. Exact article URLs deduplicate on a SHA-256 ID. Candidate coverage groups use at least 0.65 headline-token Jaccard similarity, the same topic, and dates within seven days; they do not establish unique incidents. Locations are city mentions, not coordinates. The news panel analyzes up to 500 records over 30 days, separately from the dashboard's user-selected filters.

The Live UI defaults to 30 days so backfilled records are visible without changing dates. Demo retains its 24-hour window. The standard feed and aggregates include news as signals, not citizen submissions. `source` filters distinguish every source.

## Unattended access and operation

The active scheduler is the repository's **Collect Chennai news** GitHub Actions workflow. It requests runs at minutes 7, 22, 37 and 52 of every hour, independent of browsers and the developer's laptop. GitHub can delay scheduled jobs; public-repository schedules can be disabled after 60 days without repository activity. Check the Actions run history and the Site's last-success timestamps. The Site's built-in cloud scheduler rejected 15-minute cadence because it allows at most one run per hour; no duplicate Site task was created.

GitHub uses a separate random `CITYPULSE_NEWS_TOKEN` repository secret. Only its SHA-256 digest is stored in the Site's `NEWS_SCHEDULER_TOKEN_SHA256` secret. The script sends it directly to the fixed public Site origin with redirects disabled. It grants no Site account, connected-app, X, code-deployment, report-editing or arbitrary content-write access. The job collects once, reads saved news status, and fails if neither the news index nor independent publisher has a recent successful check. Known partial publisher failures remain visible without making healthy collection appear entirely failed.

For owner-driven cloud verification, the following separate existing service-credential path remains available:

The Site is public, but the writer is authenticated separately. The owner's existing Site service credential is authorized narrowly for this collector by storing its SHA-256 digest in the secret runtime variable `NEWS_INGEST_TOKEN_SHA256`. The Worker verifies an application `Authorization: Bearer …` header against that digest. Dispatch service access alone is insufficient. No user identity or connected private sources are required; all collected sources are public. No credential appears in source code, browser code, logs, or schedule text.

A scheduled cloud run must:

1. Reopen the linked CityPulse Site through Sites `get_site` and obtain its existing `siwc_bypass_bearer_token`. Do not create or rotate a credential and never print it.
2. Send one POST to the Site's `/api/news/sync`, using that token in both `OAI-Sites-Authorization: Bearer …` and `Authorization: Bearer …`. Send it only to the Site origin. Do not use the X endpoints.
3. Read `/api/news` and `/api/snapshot?mode=live&hours=720` to verify saved status and counts. The writer returns per-source inserted/matched counts. A partial 502 can still contain successful independent sources; preserve and report their outcomes accurately.
4. Respect each provider's persisted 15-minute lease; do not loop to defeat cooldowns or access blocks. A zero-match success is normal. Notify only on a meaningful new failure, recovery, or required action, not unchanged checks. Routine runs update data without rebuilding or republishing.

If the service credential is rotated, an owner must update the configured digest and redeploy before the task can write again. Missing/incorrect authorization returns 401 before any collection. The schedule is a separate hosted task; the presence of the route or its configuration alone does not prove a schedule is enabled. Verify the actual Site automation list.

## Verification

`npm test` exercises parsing, time boundaries, exclusions, durable deduplication, concurrent leases, archive caching, failure preservation, authorization, coverage grouping and analytics. `npm run typecheck`, `npm run lint`, and `npm run build` validate the UI/build. Tests use synthetic fixtures; real collection results must be verified separately through the deployed writer and readback. No throughput or accuracy benchmark is claimed by these checks.
