import { classify } from './domain.js';
import { civicCategory } from './x-source.js';
import { insert, rows } from './store.js';

export const CHENNAI = { latitude: 13.0827, longitude: 80.2707 };
const minute = 60000;
export const FREE_SOURCES = [
  { id: 'weather', name: 'Open-Meteo weather', kind: 'conditions', every: 15 * minute, docs: 'https://open-meteo.com/', description: 'Chennai temperature, rain, humidity and wind. Model estimates, not a street sensor.' },
  { id: 'air', name: 'Open-Meteo / CAMS air quality', kind: 'conditions', every: 60 * minute, docs: 'https://open-meteo.com/en/docs/air-quality-api', description: 'Modeled PM2.5, PM10 and US AQI for Chennai. CAMS global grid is about 45 km; not a neighborhood measurement.' },
  { id: 'gdelt', name: 'GDELT news', kind: 'news', every: 15 * minute, docs: 'https://www.gdeltproject.org/', description: 'Up to 50 recent Chennai civic headlines with publisher links. Coverage is incomplete; indexing time can differ from publication time.' },
  { id: 'bluesky', name: 'Bluesky', kind: 'social', every: minute, docs: 'https://bsky.network/docs/jetstream/', description: 'A 15-second sample of the public post stream per collection, at most once a minute. Filters Chennai / சென்னை and civic terms. Not continuous or exhaustive; zero matches is normal.' },
  { id: 'usgs', name: 'USGS earthquakes', kind: 'hazards', every: 15 * minute, docs: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php', description: 'Magnitude 2.5+ feed, past week, within 500 km of Chennai. Regional context, not a Chennai impact or emergency warning.' },
  { id: 'eonet', name: 'NASA EONET', kind: 'hazards', every: 60 * minute, docs: 'https://eonet.gsfc.nasa.gov/docs/v3', description: 'Open natural events from the past 30 days with a recent point within 500 km of Chennai. Satellite-curated context, not an emergency alert.' },
  { id: 'gdacs', name: 'GDACS disasters', kind: 'hazards', every: 30 * minute, docs: 'https://www.gdacs.org/', description: 'Regional disaster-feed points within 500 km of Chennai. Point filtering can miss events with large footprints. Check the original advisory.' },
];
export const ENDPOINTS = {
  weather: 'https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&forecast_days=1&timezone=UTC',
  air: 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=13.0827&longitude=80.2707&current=pm2_5,pm10,us_aqi&timezone=UTC',
  gdelt: 'https://api.gdeltproject.org/api/v2/doc/doc?query=Chennai%20(water%20OR%20flood%20OR%20traffic%20OR%20road%20OR%20garbage%20OR%20metro%20OR%20power%20OR%20rain)&mode=artlist&format=json&maxrecords=50&timespan=1d&sort=datedesc',
  usgs: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson',
  eonet: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&bbox=75,18,86,8',
  gdacs: 'https://www.gdacs.org/xml/rss.xml',
  bluesky: 'https://jetstream.us-east.bsky.network/xrpc/network.bsky.jetstream.subscribeEvents?collections=app.bsky.feed.post&kinds=commit',
};
export function safeUrl(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; }
}
const validTime = (value) => Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
export function distanceKm(lon, lat) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return Infinity;
  const rad = x => x * Math.PI / 180;
  const dlat = rad(lat - CHENNAI.latitude), dlon = rad(lon - CHENNAI.longitude);
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(CHENNAI.latitude)) * Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
async function hash(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(n => n.toString(16).padStart(2, '0')).join('');
}
export const civicMatch = text => /chennai|சென்னை/i.test(text) && /water|flood|rain|road|traffic|metro|bus\b|sewage|garbage|waste|pothole|streetlight|power|electric|pollut|குடிநீர்|குப்பை|சாலை|வெள்ளம்|மழை|போக்குவரத்து/i.test(text);
function requireArray(value) { if (!Array.isArray(value)) throw new Error('Invalid feed format'); return value; }
export async function readLimited(response, limit = 2_000_000) {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty provider response');
  const chunks = []; let size = 0;
  while (true) { const {done, value} = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); throw new Error('Provider response too large'); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}
function conditions(id, data) {
  const names = id === 'weather' ? ['temperature_2m','relative_humidity_2m','precipitation','wind_speed_10m'] : ['pm2_5','pm10','us_aqi'];
  const current = data.current;
  const measuredAt = validTime(current?.time ? `${current.time}Z` : '');
  if (!measuredAt || !names.some(n => typeof current[n] === 'number' && Number.isFinite(current[n]))) throw new Error('Invalid conditions');
  const values = Object.fromEntries(names.map(n => [n, typeof current[n] === 'number' && Number.isFinite(current[n]) ? current[n] : null]));
  return { records: [], payload: { measuredAt, values, units: data.current_units, modeled: true, city: 'Chennai' }, count: names.filter(n => values[n] !== null).length };
}
function parseGdeltDate(value) {
  if (!/^\d{8}T\d{6}Z$/.test(value || '')) return null;
  return validTime(`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T${value.slice(9,11)}:${value.slice(11,13)}:${value.slice(13,15)}Z`);
}
export async function parseGdelt(data, now) {
  const articles = requireArray(data.articles);
  const records = [];
  for (const article of articles.slice(0, 50)) {
    const url = safeUrl(article.url), date = parseGdeltDate(article.seendate);
    if (!url || !date || typeof article.title !== 'string' || !civicMatch(article.title)) continue;
    records.push({ id: `news-${await hash(url)}`, content: article.title.slice(0, 1000), city: 'Chennai', area: `${new URL(url).hostname} · headline`, category: civicCategory(article.title), sentiment: 'unscored', source: 'GDELT news', demo: 0, created_at: date, received_at: new Date(now).toISOString(), source_url: url });
  }
  return { records, payload: { scanned: articles.length, timeMeaning: 'First seen by GDELT' }, count: records.length };
}
export function parseHazards(id, data, now) {
  let hazards = [];
  if (id === 'usgs') {
    hazards = requireArray(data.features).flatMap(feature => {
      const p = feature.properties || {}, coords = feature.geometry?.coordinates || [];
      const distance = distanceKm(coords[0], coords[1]);
      const date = Number.isFinite(p.time) && Math.abs(p.time) < 8.64e15 ? new Date(p.time).toISOString() : null;
      const url = safeUrl(p.url);
      return distance <= 500 && date && url && now - Date.parse(date) <= 7 * 86400000 ? [{ id: feature.id, title: `M${p.mag} · ${p.place}`, date, url, distanceKm: Math.round(distance) }] : [];
    });
  } else if (id === 'eonet') {
    hazards = requireArray(data.events).flatMap(event => {
      const points = (event.geometry || []).filter(g => g.type === 'Point' && validTime(g.date) && now - Date.parse(g.date) <= 30 * 86400000).sort((a,b) => Date.parse(b.date) - Date.parse(a.date));
      const point = points.find(g => distanceKm(g.coordinates?.[0],g.coordinates?.[1]) <= 500);
      const url = safeUrl(event.sources?.[0]?.url) || safeUrl(event.link);
      return point && url ? [{ id: event.id, title: event.title, date: validTime(point.date), url, distanceKm: Math.round(distanceKm(...point.coordinates)) }] : [];
    });
  }
  return { records: [], payload: { hazards: hazards.slice(0, 50), radiusKm: 500 }, count: hazards.length };
}
// A bounded RSS reader for GDACS's fixed public feed; DTDs are deliberately rejected.
export function parseGdacs(xml, now) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || !/<rss\b/i.test(xml)) throw new Error('Invalid RSS format');
  const decode = text => text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,'').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m,key) => {
    const symbols = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
    if (symbols[key]) return symbols[key];
    const n = key[1]?.toLowerCase() === 'x' ? parseInt(key.slice(2),16) : Number(key.slice(1));
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
  }).trim();
  const field = (xml, tag) => decode(xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] || '');
  const hazards = [];
  for (const match of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const item = match[1], lat = field(item,'geo:lat'), lon = field(item,'geo:long');
    const distance = lat && lon ? distanceKm(Number(lon),Number(lat)) : Infinity;
    const date = validTime(field(item,'pubDate')), url = safeUrl(field(item,'link'));
    if (distance <= 500 && date && url && now - Date.parse(date) <= 30 * 86400000)
      hazards.push({ id: field(item,'guid') || url, title: field(item,'title').slice(0,500), date, url, distanceKm: Math.round(distance) });
    if (hazards.length >= 50) break;
  }
  return { records: [], payload: { hazards, radiusKm: 500 }, count: hazards.length };
}
export async function blueskyRecord(event, now) {
  if (event.collection !== 'app.bsky.feed.post' || !/^did:(plc:[a-z2-7]+|web:[a-zA-Z0-9.:%_-]+)$/.test(event.did || '') || !/^[a-zA-Z0-9._~-]+$/.test(event.rkey || '')) return null;
  const uri = `at://${event.did}/app.bsky.feed.post/${event.rkey}`;
  const id = `bsky-${await hash(uri)}`;
  if (event.operation === 'delete') return { id, remove: true };
  const text = event.record?.text;
  if (typeof text !== 'string' || !['create','update'].includes(event.operation)) return null;
  if (!civicMatch(text)) return { id, remove: true };
  const date = validTime(event.record.createdAt);
  if (!date || now - Date.parse(date) > 7 * 86400000 || Date.parse(date) > now + 300000) return null;
  return { id, content: text.slice(0,3000), city: 'Chennai', area: 'Chennai mention · location unverified', category: civicCategory(text), sentiment: classify(text), source: 'Bluesky', demo: 0, created_at: date, received_at: new Date(now).toISOString(), source_url: `https://bsky.app/profile/${event.did}/post/${event.rkey}`, author_username: event.did, author_name: null };
}
async function openSocket(fetcher) {
  if (typeof WebSocketPair !== 'undefined') {
    const response = await fetcher(ENDPOINTS.bluesky, {headers:{Upgrade:'websocket','Sec-WebSocket-Protocol':'xrpc.v1.json'}, signal: AbortSignal.timeout(10000)});
    if (!response.webSocket) throw new Error(`WebSocket HTTP ${response.status}`);
    response.webSocket.accept();
    return { socket: response.webSocket, opened: true };
  }
  return { socket: new WebSocket(ENDPOINTS.bluesky.replace('https:', 'wss:'), 'xrpc.v1.json'), opened: false };
}
export async function sampleBluesky(fetcher = fetch, duration = 15000, socketFactory = openSocket) {
  const {socket, opened} = await socketFactory(fetcher);
  return new Promise((resolve, reject) => {
    const events = new Map(); let scanned = 0, connected = opened, settled = false;
    const finish = error => { if (settled) return; settled = true; clearTimeout(timer); try {socket.close();}catch{}; if (error) reject(error); else resolve({events:[...events.values()], scanned}); };
    const timer = setTimeout(() => finish(connected ? null : new Error('Stream connection timed out')), duration);
    socket.addEventListener('open', () => { connected = true; });
    socket.addEventListener('error', () => finish(new Error('Public stream unavailable')));
    socket.addEventListener('close', () => finish(new Error('Public stream closed before sample completed')));
    socket.addEventListener('message', e => {
      if (typeof e.data !== 'string' || e.data.length > 100000) return;
      try {
        const event = JSON.parse(e.data).payload;
        if (!event || event.collection !== 'app.bsky.feed.post') return;
        scanned++;
        if (civicMatch(event.record?.text || '') || ['delete','update'].includes(event.operation)) {
          const key = `${event.did}/${event.rkey}`;
          if (events.has(key) || events.size < 300) events.set(key,event);
        }
      } catch { /* Individual malformed frames do not fabricate posts. */ }
    });
  });
}
export async function collectSource(id, {fetcher = fetch, now = Date.now(), sampler = sampleBluesky} = {}) {
  if (!FREE_SOURCES.some(source => source.id === id)) throw new Error('Unknown source');
  if (id === 'bluesky') {
    const sample = await sampler(fetcher);
    const entries = (await Promise.all(sample.events.map(e => blueskyRecord(e,now)))).filter(Boolean);
    return { records: entries.filter(e => !e.remove), removals: entries.filter(e => e.remove).map(e => e.id), payload: {scanned:sample.scanned,sampleSeconds:15}, count: entries.filter(e => !e.remove).length };
  }
  const response = await fetcher(ENDPOINTS[id], {headers:{Accept:id === 'gdacs' ? 'application/rss+xml, application/xml' : 'application/json'},signal:AbortSignal.timeout(15000)});
  const text = await readLimited(response);
  if (id === 'gdacs') return parseGdacs(text,now);
  const data = JSON.parse(text);
  if (['weather','air'].includes(id)) return conditions(id,data);
  if (id === 'gdelt') return parseGdelt(data,now);
  return parseHazards(id,data,now);
}
export async function syncFreeSources(env, options = {}) {
  const now = options.now ?? Date.now();
  const selected = options.ids || FREE_SOURCES.map(s => s.id);
  const results = await Promise.all(FREE_SOURCES.filter(s => selected.includes(s.id)).map(async source => {
    await env.DB.prepare('INSERT INTO source_state (id) VALUES (?) ON CONFLICT(id) DO NOTHING').bind(source.id).run();
    const lease = await env.DB.prepare('UPDATE source_state SET next_allowed = ?, last_attempt = ? WHERE id = ? AND next_allowed <= ? RETURNING id')
      .bind(now + source.every,new Date(now).toISOString(),source.id,now).first();
    if (!lease) return {id:source.id,status:'cooldown'};
    try {
      const result = await collectSource(source.id,{...options,now});
      await env.DB.batch([
        ...result.records.map(event => insert(env.DB,event)),
        ...result.records.filter(event => event.source === 'Bluesky').map(event => env.DB.prepare("UPDATE events SET content = ?, category = ?, sentiment = ?, created_at = ? WHERE id = ? AND source = 'Bluesky'").bind(event.content,event.category,event.sentiment,event.created_at,event.id)),
        ...(result.payload.measuredAt ? [env.DB.prepare('INSERT INTO measurements (id,source,observed_at,payload) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload').bind(`${source.id}-${result.payload.measuredAt}`,source.id,result.payload.measuredAt,JSON.stringify(result.payload.values)),env.DB.prepare('DELETE FROM measurements WHERE observed_at < ?').bind(new Date(now-7*86400000).toISOString())] : []),
        ...(result.removals || []).map(id => env.DB.prepare("DELETE FROM events WHERE id = ? AND source = 'Bluesky'").bind(id)),
        env.DB.prepare('UPDATE source_state SET last_success = ?, last_error = NULL, last_count = ?, payload = ? WHERE id = ?')
          .bind(new Date(now).toISOString(), result.count, JSON.stringify(result.payload), source.id),
        env.DB.prepare("DELETE FROM events WHERE source IN ('Bluesky','GDELT news') AND created_at < ?").bind(new Date(now - 7 * 86400000).toISOString()),
      ]);
      return {id:source.id,status:'ok',matched:result.count};
    } catch(error) {
      console.warn(`Free source ${source.id}: ${error.name}: ${error.message}`);
      const message = /^HTTP \d+$/.test(error.message) ? error.message === 'HTTP 429' ? 'Provider rate limit; collection will retry after cooldown.' : `Provider returned ${error.message}.` : 'Provider unavailable or returned an invalid response; retry after cooldown.';
      await env.DB.prepare('UPDATE source_state SET last_error = ? WHERE id = ?').bind(message,source.id).run();
      return {id:source.id,status:'error',error:message};
    }
  }));
  return {results,checkedAt:new Date(now).toISOString()};
}
export async function freeSourceStatus(db) {
  const state = new Map((await rows(db,'SELECT * FROM source_state')).map(s => [s.id,s]));
  const history = await rows(db, 'SELECT source,observed_at,payload FROM measurements WHERE observed_at >= ? ORDER BY observed_at DESC LIMIT 400', [new Date(Date.now()-24*3600000).toISOString()]);
  return FREE_SOURCES.map(source => {
    const row = state.get(source.id);
    let payload = null; try { payload = JSON.parse(row?.payload || 'null'); } catch { /* Invalid persisted data must not break other feeds. */ }
    return {...source, history: history.filter(point => point.source === source.id).reverse().map(point => ({time:point.observed_at,...JSON.parse(point.payload)})), everyMinutes:source.every/minute, lastAttempt:row?.last_attempt || null, lastSuccess:row?.last_success || null, lastError:row?.last_error || null, lastCount:row?.last_count || 0, nextAllowed:row?.next_allowed || 0, payload,
      status:row?.last_error ? 'Retrying' : !row?.last_success ? 'Awaiting collection' : Date.now()-Date.parse(row.last_success)>Math.max(source.every*2,3600000) ? 'Stale' : 'Connected'};
  });
}
