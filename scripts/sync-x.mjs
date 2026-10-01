// Run with node --env-file=.env scripts/sync-x.mjs [--watch]. Secrets stay server-side.
import { setTimeout } from 'node:timers/promises';
const origin = process.env.CITYPULSE_URL;
const token = process.env.X_INGEST_TOKEN;
if (!origin || !token || token.length < 32) throw new Error('Set CITYPULSE_URL and X_INGEST_TOKEN in your private environment.');
const endpoint = new URL('/api/sources/x/sync', origin);
if (endpoint.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(endpoint.hostname)) throw new Error('Use HTTPS for remote ingestion.');
do {
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000), redirect: 'error' });
    const result = await response.json();
    console.log(new Date().toISOString(), response.status, result);
    if ([401, 409].includes(response.status)) process.exit(1);
    if (!response.ok && !process.argv.includes('--watch')) process.exitCode = 1;
  } catch {
    console.error('Ingestion request failed; check the platform and retry.');
    if (!process.argv.includes('--watch')) process.exitCode = 1;
  }
  if (!process.argv.includes('--watch')) break;
  await setTimeout(15 * 60 * 1000);
} while (true);
