# Free Chennai feeds

Citizen reporting remains available independently of every external feed. The optional paid X collector remains disabled; `/api/sources/sync` never calls X.

| Source | Data used | Minimum interval |
| --- | --- | --- |
| [Bluesky Jetstream](https://bsky.network/docs/jetstream/) | 15-second public post-stream sample, Chennai/சென்னை plus civic keywords | 1 minute |
| [GDELT DOC API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/) | Up to 50 recent search results, retaining civic Chennai headlines and publisher links | 15 minutes |
| [Open-Meteo weather](https://open-meteo.com/en/docs) | Modeled temperature, rain, humidity and wind at Chennai's city center | 15 minutes |
| [CAMS via Open-Meteo](https://open-meteo.com/en/docs/air-quality-api) | Modeled PM2.5, PM10 and US AQI, approximately 45 km global grid | 60 minutes |
| [USGS GeoJSON](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) | Magnitude 2.5+ earthquakes, past week, points within 500 km | 15 minutes |
| [NASA EONET](https://eonet.gsfc.nasa.gov/docs/v3) | Open natural events with a recent point within 500 km, past 30 days | 60 minutes |
| [GDACS RSS](https://www.gdacs.org/xml/rss.xml) | Disaster-feed points within 500 km, published within 30 days | 30 minutes |

No API key is required for these endpoints. Open-Meteo's free service is intended for noncommercial use and has rate limits; its attribution and CAMS credit appear beside the data. Provider terms and availability still apply. This configuration suits a noncommercial project, not guaranteed commercial service availability. No publisher page is scraped and no full news article is stored.

## Collection and persistence

A visible Live workspace requests `POST /api/sources/sync` once per minute. The Data Sources page also has a Check feeds button. Each source takes an atomic database lease before making an outbound request, so multiple viewers share its cooldown. These intervals are maximum collection frequency, not freshness guarantees. No unattended schedule is installed; when nobody has Live open, collection pauses. An operator can invoke the same endpoint from a scheduler if background collection is later required.

The endpoint accepts no destination URL or query overrides, reads only a fixed allowlist of public feeds, and cannot activate the separately authorized X route. Cross-origin browser writes are rejected. Responses are bounded to 2 MB and requests have timeouts. Provider failures are isolated, reported on the source panel, and preserve the last successful payload. A successful empty result is different from a failed collection. Check `GET /api/sources` to inspect both states.

Environmental readings are persisted in `measurements`, keyed by provider and observation timestamp, with seven-day retention. The dashboard charts the last 24 hours of collected points; it does not backfill gaps or manufacture history. Imported posts and headlines are deduplicated by stable source identity and retained for seven days, pruned at collection time. Citizen reports are not pruned by these collectors. SQLite and D1 share the versioned migrations.

## Interpretation

- Bluesky is a sample, not exhaustive or continuous capture. Posts need an explicit Chennai mention and a civic keyword; location is unverified. Zero matching posts is normal. Stream edits/deletions observed within samples update/remove stored posts. Changes outside those samples may be missed; seven-day retention bounds the stored copy. Original-post links remain visible.
- Tamil civic terms help retrieval, but sentiment remains the existing English keyword heuristic, not validated multilingual sentiment analysis.
- GDELT headlines are `unscored`, excluded from the sentiment denominator, and attributed to their original URL. Their event timestamp means first seen by GDELT, not necessarily publication time. News can contribute to issue counts but is not presented as a citizen report.
- Weather, air quality and regional hazards never enter citizen/post sentiment or signal totals. Model estimates are not neighborhood sensors. A regional hazard entry does not establish Chennai impact, and a missing entry does not establish safety. Point filtering can miss large geographic footprints.
- Demo records remain explicitly synthetic and separate. Provider outages never trigger replacement with demo content.

## Validation

`npm test` covers lease concurrency, idempotent imports, post edits/deletions, invalid/oversized input, geographic filtering, source failure isolation, observation history and sentiment-denominator reconciliation, in addition to citizen intake and SSE replay. Live provider checks exercise the adapters separately; they are not deterministic CI dependencies.
