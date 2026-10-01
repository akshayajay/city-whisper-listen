import { classify } from './domain.js';
import { insert } from './store.js';

export const X_QUERY = '(Chennai OR சென்னை) (pothole OR waterlogging OR sewage OR garbage OR traffic OR streetlight OR "water supply" OR flooding OR குடிநீர் OR குப்பை OR சாலை OR வெள்ளம்) -is:retweet';
const CADENCE = 15 * 60 * 1000;
const PAGE_SIZE = 10;
export function xConfig(env) {
  const cap = Number(env.X_DAILY_POST_LIMIT || 0);
  return { enabled: env.X_ENABLED === 'true', token: !!env.X_BEARER_TOKEN,
    admin: !!env.X_INGEST_TOKEN && env.X_INGEST_TOKEN.length >= 32,
    cap: Number.isSafeInteger(cap) && cap >= PAGE_SIZE && cap <= 10000 ? cap : 0 };
}
export async function xStatus(env) {
  const config = xConfig(env);
  const state = await env.DB.prepare("SELECT * FROM x_ingestion WHERE id = 'chennai'").first();
  const ready = config.enabled && config.token && config.admin && config.cap > 0;
  let status = !config.token ? 'Not connected' : !ready ? 'Paused' : 'Awaiting first sync';
  if (ready && state?.last_error) status = 'Needs attention';
  else if (ready && state?.last_success) status = Date.now() - Date.parse(state.last_success) < CADENCE * 2 ? 'Receiving posts' : 'Sync overdue';
  const reserved = state?.day === new Date().toISOString().slice(0, 10) ? state.reserved_posts : 0;
  if (ready && reserved + PAGE_SIZE > config.cap) status = 'Daily limit reached';
  return { status, ready, query: X_QUERY, lastSuccess: state?.last_success || null,
    lastError: ready ? state?.last_error || null : null, cadenceMinutes: 15,
    dailyPostLimit: config.cap, reservedPosts: reserved, sampled: true };
}
export async function authorizedX(request, env) {
  if (!xConfig(env).admin) return false;
  const supplied = request.headers.get('authorization') || '';
  const digest = async text => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  const [a, b] = await Promise.all([digest(supplied), digest(`Bearer ${env.X_INGEST_TOKEN}`)]);
  let different = 0;
  for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i];
  return different === 0;
}
export function civicCategory(text) {
  for (const [category, words] of [
    ['Water', /water|sewage|flood|குடிநீர்|வெள்ளம்/i],
    ['Waste', /garbage|waste|குப்பை/i],
    ['Infrastructure', /pothole|streetlight|சாலை/i],
    ['Transport', /traffic|bus|metro/i],
  ]) if (words.test(text)) return category;
  return 'Other';
}
export async function syncX(env, fetcher = fetch, now = Date.now()) {
  const cfg = xConfig(env);
  if (!cfg.enabled || !cfg.token || !cfg.admin || !cfg.cap)
    return { status: 409, body: { error: 'X ingestion is disabled. Configure API access, an ingestion secret, and a daily read limit first.' } };
  const iso = new Date(now).toISOString();
  const day = iso.slice(0, 10);
  await env.DB.prepare("INSERT INTO x_ingestion (id) VALUES ('chennai') ON CONFLICT(id) DO NOTHING").run();
  // Reserve the full page before an external request. Concurrent callers cannot exceed the cap.
  // Failed requests keep their reservation because their billing outcome may be unknown.
  const lease = await env.DB.prepare(`UPDATE x_ingestion SET next_allowed = ?, last_attempt = ?, day = ?,
    reserved_posts = CASE WHEN day = ? THEN reserved_posts + ? ELSE ? END
    WHERE id = 'chennai' AND next_allowed <= ?
    AND (CASE WHEN day = ? THEN reserved_posts ELSE 0 END) + ? <= ? RETURNING *`)
    .bind(now + CADENCE, iso, day, day, PAGE_SIZE, PAGE_SIZE, now, day, PAGE_SIZE, cfg.cap).first();
  if (!lease) return { status: 429, body: { error: 'Sync cooldown or daily read limit reached.' } };
  const endpoint = new URL('https://api.x.com/2/tweets/search/recent');
  endpoint.search = new URLSearchParams({ query: X_QUERY, max_results: String(PAGE_SIZE),
    'tweet.fields': 'created_at,author_id,lang', expansions: 'author_id', 'user.fields': 'name,username,profile_image_url' }).toString();
  // A deliberate latest-post sample: at most 10 per interval, not exhaustive collection.
  // Rebase after seven days because recent search cannot recover older gaps.
  if (lease.since_id && lease.last_success && now - Date.parse(lease.last_success) < 6 * 86400000)
    endpoint.searchParams.set('since_id', lease.since_id);
  else endpoint.searchParams.set('start_time', new Date(now - 86400000).toISOString());
  try {
    const response = await fetcher(endpoint, { headers: { Authorization: `Bearer ${env.X_BEARER_TOKEN}` }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      const messages = { 401: 'X rejected the API token.', 402: 'X API credits are required.', 403: 'X API access is not permitted for this app.', 429: 'X rate limit reached. The next sync will retry.' };
      throw new Error(messages[response.status] || `X API returned HTTP ${response.status}.`);
    }
    const payload = await response.json();
    if (payload.errors?.length || (payload.data !== undefined && !Array.isArray(payload.data))) throw new Error('X returned incomplete data. The next sync will retry.');
    const posts = (payload.data || []).slice(0, PAGE_SIZE);
    const authors = new Map((payload.includes?.users || []).map(user => [user.id, user]));
    const records = posts.map(post => {
      const author = authors.get(post.author_id);
      if (!/^\d{1,30}$/.test(post.id) || typeof post.text !== 'string' || !Number.isFinite(Date.parse(post.created_at)) || !author || !/^\w{1,15}$/.test(author.username))
        throw new Error('X returned a post without valid attribution or timestamp.');
      return { id: `x-${post.id}`, content: post.text, city: 'Chennai', area: 'Chennai mention · location unverified',
        category: civicCategory(post.text), sentiment: classify(post.text), source: 'X', demo: 0,
        created_at: new Date(post.created_at).toISOString(), received_at: iso,
        source_url: `https://x.com/${author.username}/status/${post.id}`, author_username: author.username,
        author_name: String(author.name || author.username), author_avatar: /^https:\/\/pbs\.twimg\.com\//.test(author.profile_image_url || '') ? author.profile_image_url : null };
    });
    const newest = posts.reduce((id, post) => BigInt(post.id) > BigInt(id || '0') ? post.id : id, lease.since_id || '0');
    const results = await env.DB.batch([
      ...records.map(event => insert(env.DB, event)),
      env.DB.prepare("DELETE FROM events WHERE source = 'X' AND created_at < ?").bind(new Date(now - 7 * 86400000).toISOString()),
      env.DB.prepare("UPDATE x_ingestion SET since_id = ?, last_success = ?, last_error = NULL WHERE id = 'chennai'").bind(newest === '0' ? null : newest, iso),
    ]);
    const inserted = results.slice(0, records.length).reduce((sum, result) => sum + Number(result.meta?.changes || 0), 0);
    return { status: 200, body: { received: posts.length, inserted, sampled: true, nextSyncAfter: new Date(now + CADENCE).toISOString() } };
  } catch (error) {
    // Never echo provider response bodies, tokens, or network exception strings.
    const message = error instanceof Error && /^X (rejected|API|rate|returned)/.test(error.message) ? error.message : 'X is temporarily unreachable. The next sync will retry.';
    await env.DB.prepare("UPDATE x_ingestion SET last_error = ? WHERE id = 'chennai'").bind(message).run();
    return { status: 502, body: { error: message } };
  }
}
