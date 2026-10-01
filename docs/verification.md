# CityPulse verification

The platform's current automated suite is `npm test`. It executes real SQL against an isolated SQLite database through the deployed Worker's handlers; it does not replace the database with arrays or mocks.

Covered behavior:

- Reports survive a database close/reopen.
- Duplicate retries preserve a single record; conflicting reuse of an ID is rejected.
- Real reports and synthetic demo events remain separate.
- Totals reconcile across sentiment, category, city, and time buckets.
- City/category/sentiment/search/time filters select the correct records.
- Empty time buckets appear as zero rather than interpolating over gaps.
- Invalid inputs, oversized bodies, and cross-origin writes are rejected.
- CSV export respects filters and neutralizes spreadsheet formula prefixes.
- Server-sent events resume after a cursor and stop after cancellation.
- Public report intake limits new submissions while allowing duplicate-safe retries.
- Frontend deep links receive the app; missing assets/API endpoints remain 404.
- Missing storage produces a visible error rather than sample data.

Local browser verification also exercised the responsive dashboard, navigation, real report submission, switching between Live and Demo, and city/sentiment filters. A clearly labeled local test report was persisted in `.data/`; that database is ignored and is not included in deployment artifacts. Production starts with no real citizen reports.

Production dependencies were checked with `npm audit --omit=dev` and had no reported advisories at verification. The migration tooling has a moderate advisory in a transitive legacy esbuild development server; that tool is not bundled into the Worker or used to serve the deployed app. The migration CLI is used only to generate SQL locally.

The retained Python prototype has its own existing CI job and is not the deployed API. Local platform test results do not imply a new run of that prototype or a load test of the public service.
