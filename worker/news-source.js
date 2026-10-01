import { insert, rows } from './store.js';
import { readLimited, safeUrl } from './free-sources.js';
import { initialArchive } from './news-backfill.js';

export const NEWS_CADENCE = 15 * 60000;
const DAY = 86400000;
const PIB = 'https://www.pib.gov.in/AllRelease.aspx?lang=1&reg=6';
export const NEWS_SOURCES = [
  { id: 'news-gdelt-files', name: 'GDELT headlines', kind: 'News index', url: 'https://www.gdeltproject.org/', license: 'https://blog.gdeltproject.org/using-the-new-web-ngrams-dataset-to-find-relevant-coverage/' },
  { id: 'news-pib', name: 'PIB Chennai', kind: 'Official release', url: PIB, license: 'https://www.pib.gov.in/content/3604_2_CopyrightPolicy.aspx?lang=1&reg=3' },
  { id: 'news-mongabay', name: 'Mongabay India', kind: 'Independent reporting', url: 'https://india.mongabay.com/', license: 'https://india.mongabay.com/about/' },
];
export function plainText(value = '') {
  return String(value).replace(/<(script|style|figure|figcaption)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|rdquo|ldquo|ndash|mdash);/gi, (all, key) => {
      const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—' };
      if (entities[key.toLowerCase()]) return entities[key.toLowerCase()];
      const n = key[1]?.toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
    }).replace(/\s+/g, ' ').trim();
}
const local = text => /\bChennai\b|சென்னை/i.test(text);
export function newsCategory(text) {
  for (const [category, expression] of [
    ['Water', /\bwater(?:logging|\s+supply)?\b|sewage|flood|drainage|reservoir/i],
    ['Waste', /\bwaste\b|garbage|sanitation|cleanliness|swachh/i],
    ['Transport', /\b(?:traffic|metro|bus|buses|railway|rail|road|roads|toll|transport)\b/i],
    ['Infrastructure', /pothole|streetlight|electric|power\s+(?:supply|cut)|mobile network|telecom|broadband/i],
    ['Parks', /greenbelt|urban\s+(?:trees|forest)|wetland|biodiversity|pollution|air quality|ecolog/i],
    ['Safety', /public health|hospital|fire safety|\baccident\b/i],
    ['Other', /dak\s*adalat|postal|grievance|public services/i],
  ]) if (expression.test(text)) return category;
  return null;
}
function recent(date, now) { const n = Date.parse(date); return Number.isFinite(n) && n <= now && n >= now - 30 * DAY; }
export function parsePibListing(html, now) {
  if (!/publishdatesmall|No (?:Press )?Release/i.test(html)) throw new Error('Unrecognized PIB archive');
  const items = [];
  for (const m of html.matchAll(/<li>\s*<a\b([^>]*\bhref=['"][^'"]*PRID=(\d+)['"][^>]*)>([\s\S]*?)<\/a>\s*<span class=['"]publishdatesmall['"]>Posted on:\s*(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/gi)) {
    const title = plainText(m[1].match(/\btitle=(['"])([\s\S]*?)\1/i)?.[2] || m[3]);
    // The archive has dates, not times. Preserve the IST calendar date and expose that precision.
    const date = new Date(`${m[4]} 00:00:00 GMT+0530`).toISOString();
    if (recent(date, now) && local(title) && newsCategory(title)) items.push({ title, date, url: `https://www.pib.gov.in/PressReleseDetail.aspx?PRID=${m[2]}`, byline: 'Press Information Bureau', datePrecision: 'day' });
  }
  return [...new Map(items.map(item => [item.url, item])).values()].slice(0, 100);
}
function archiveForm(html, month, year) {
  const body = new URLSearchParams();
  for (const m of html.matchAll(/<input\b[^>]*type="hidden"[^>]*>/gi)) {
    const name = m[0].match(/name="([^"]+)"/)?.[1], value = m[0].match(/value="([^"]*)"/)?.[1];
    if (name) body.set(name, plainText(value || ''));
  }
  if (!body.has('__VIEWSTATE')) throw new Error('Missing archive form');
  for (const [key, value] of Object.entries({ '__EVENTTARGET': 'ctl00$ContentPlaceHolder1$ddlMonth', 'ctl00$Bar1$ddlregion': '6', 'ctl00$Bar1$ddlLang': '1', 'ctl00$ContentPlaceHolder1$ddlMinistry': '0', 'ctl00$ContentPlaceHolder1$ddlday': '0', 'ctl00$ContentPlaceHolder1$ddlMonth': String(month), 'ctl00$ContentPlaceHolder1$ddlYear': String(year) })) body.set(key, value);
  return body;
}
async function fetchText(fetcher, url, init = {}) {
  const response = await fetcher(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(25000), headers: { Accept: 'application/json, text/html', 'User-Agent': 'CityPulse/1.0 (+https://citypulse-listen.akshayajayakanth.chatgpt.site/sources)', ...init.headers } });
  return readLimited(response, 3_000_000);
}
export function parseMongabay(posts, now) {
  if (!Array.isArray(posts)) throw new Error('Invalid publisher response');
  return posts.slice(0, 100).flatMap(post => {
    const title = plainText(post.title?.rendered);
    // Only the headline or lead establishes local focus. Captions, related links and passing body mentions do not.
    const paragraphs = [...String(post.content?.rendered || '').replace(/<(figure|figcaption)\b[^>]*>[\s\S]*?<\/\1>/gi, '').matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].slice(0, 3).map(m => plainText(m[1])).join(' ');
    const focus = `${title} ${paragraphs}`;
    const date = `${post.date_gmt}Z`;
    let url; try { url = new URL(post.link); } catch { return []; }
    if (url.origin !== 'https://india.mongabay.com' || !recent(date, now) || !local(focus) || !newsCategory(focus)) return [];
    // Display only the original headline, attribution and link; no rewritten licensed article text or photographs.
    const byline = plainText(post.yoast_head_json?.author || post._embedded?.author?.[0]?.name || 'Mongabay India');
    return [{ title, date, url: url.href, byline, datePrecision: 'second', analysisText: focus }];
  });
}
export async function digest(text) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(n => n.toString(16).padStart(2, '0')).join('');
}
export async function authorizedNews(request, env) {
  if (!/^[a-f0-9]{64}$/.test(env.NEWS_INGEST_TOKEN_SHA256 || '')) return false;
  const token = request.headers.get('authorization')?.match(/^Bearer (.{32,4096})$/)?.[1];
  if (!token) return false;
  const actual = await digest(token); let different = 0;
  for (let i = 0; i < actual.length; i++) different |= actual.charCodeAt(i) ^ env.NEWS_INGEST_TOKEN_SHA256.charCodeAt(i);
  return different === 0;
}
export function parseGdeltHeadlines(text, now) {
  const items = [];
  for (const line of text.trim().split('\n')) {
    if (!line.trim()) continue;
    const article = JSON.parse(line);
    const title = plainText(article.title), url = safeUrl(article.url);
    if (url && recent(article.date, now) && local(title) && newsCategory(title)) items.push({ title, url, date: article.date, datePrecision: 'indexed', byline: new URL(url).hostname });
  }
  return items;
}
async function collectGdeltFiles(now, previous, fetcher) {
  const end = Math.floor(now / 60000) * 60000 - 5 * 60000;
  // Bounded requests fit the Worker subrequest budget. An initial run scans 30 minutes;
  // subsequent runs overlap two minutes. Longer outages are explicitly reported as gaps.
  const start = Math.max(end - 29 * 60000, previous.lastMinute ? previous.lastMinute - 60000 : end - 29 * 60000);
  const minutes = []; for (let t = start; t <= end; t += 60000) minutes.push(t);
  let scanned = 0, files = 0; const items = [];
  for (let offset = 0; offset < minutes.length; offset += 3) {
    const batch = await Promise.all(minutes.slice(offset, offset + 3).map(async t => {
      const stamp = new Date(t).toISOString().slice(0,16).replace(/[-:T]/g,'') + '00';
      const response = await fetcher(`https://data.gdeltproject.org/gdeltv5/weblegacy/ngrams/${stamp}.toc.json.gz`, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
      if (response.status === 404) return null; // The publisher documents sparse minute files.
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await readLimited(new Response(response.body.pipeThrough(new DecompressionStream('gzip'))), 8_000_000);
      return { items: parseGdeltHeadlines(text, now), scanned: text.trim().split('\n').length };
    }));
    for (const result of batch) if (result) { files++; scanned += result.scanned; items.push(...result.items); }
  }
  if (!files) throw new Error('No index files available in the collection window');
  return { items: [...new Map(items.map(item => [item.url, item])).values()], scanned, files, lastMinute: end, windowStart: new Date(start).toISOString(), windowEnd: new Date(end).toISOString(), gap: !!previous.lastMinute && previous.lastMinute + 60000 < start };
}
async function collect(source, now, previous, fetcher) {
  if (source.id === 'news-gdelt-files') return collectGdeltFiles(now, previous, fetcher);

  if (source.id === 'news-mongabay') {
    const after = new Date(now - 30 * DAY).toISOString().slice(0, 19);
    const url = `https://india.mongabay.com/wp-json/wp/v2/posts?search=Chennai&after=${encodeURIComponent(after)}&per_page=100`;
    const posts = JSON.parse(await fetchText(fetcher, url));
    return { items: parseMongabay(posts, now), scanned: posts.length };
  }
  const html = await fetchText(fetcher, PIB);
  let archiveItems = previous.archiveItems || [], archiveCheckedAt = previous.archiveCheckedAt;
  const start = new Date(now - 30 * DAY + 330 * 60000), current = new Date(now + 330 * 60000);
  const months = [];
  for (let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); d < new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1)); d.setUTCMonth(d.getUTCMonth() + 1)) months.push({month: d.getUTCMonth() + 1, year: d.getUTCFullYear()});
  const monthKey = months.map(d => `${d.year}-${d.month}`).join(',');
  if (months.length && (previous.archiveMonth !== monthKey || now - Date.parse(archiveCheckedAt || '') > DAY || !archiveCheckedAt)) {
    archiveItems = [];
    for (const month of months) {
      const archived = await fetchText(fetcher, PIB, { method: 'POST', body: archiveForm(html, month.month, month.year) });
      archiveItems.push(...parsePibListing(archived, now));
    }
    archiveCheckedAt = new Date(now).toISOString();
  }
  const items = [...new Map([...parsePibListing(html, now), ...archiveItems.filter(item => recent(item.date, now))].map(item => [item.url, item])).values()];
  return { items, scanned: (html.match(/publishdatesmall/g) || []).length, archiveItems, archiveCheckedAt, archiveMonth: monthKey };
}
export function mentionedArea(text) {
  const names = ['Retteri', 'Adyar', 'Velachery', 'Tambaram', 'Anna Nagar', 'T Nagar', 'Perambur', 'Tiruvottiyur', 'Pallikaranai', 'Porur', 'Ambattur', 'Guindy', 'Mylapore', 'Royapuram'];
  const found = names.find(name => new RegExp(`\\b${name}\\b`, 'i').test(text));
  return found ? `${found} · location mentioned, not verified` : 'Chennai · city mention, not an incident location';
}
async function toRecord(item, source, now, initialBackfill = false) {
  return { id: `article-${await digest(item.url)}`, content: item.title, city: 'Chennai', area: mentionedArea(item.analysisText || item.title), category: newsCategory(item.analysisText || item.title), sentiment: 'unscored', source: source.name, demo: 0, created_at: item.date, received_at: new Date(now).toISOString(), source_url: item.url, author_name: item.byline,
    news_meta: JSON.stringify({ kind: source.kind, publisher: item.datePrecision === 'indexed' ? item.byline : source.name, license: source.license, datePrecision: item.datePrecision, initialBackfill, backfilled: now - Date.parse(item.date) > DAY, analysis: 'Rule-based topic and Chennai relevance; not verified incidents' }) };
}
export async function syncNews(env, { now = Date.now(), fetcher = fetch, backfill = true, ids = NEWS_SOURCES.map(s => s.id) } = {}) {
  // This small, attributed backfill was obtained from the public archive during setup.
  // It is never presented as a successful current publisher check.
  const seeds = await Promise.all(initialArchive.filter(item => backfill && recent(item.date, now)).map(item => toRecord(item, NEWS_SOURCES.find(s => s.id === item.sourceId), now, true)));
  if (seeds.length) await env.DB.batch(seeds.map(event => insert(env.DB, event)));
  const results = [];
  for (const source of NEWS_SOURCES.filter(s => ids.includes(s.id))) {
    await env.DB.prepare('INSERT INTO source_state (id) VALUES (?) ON CONFLICT(id) DO NOTHING').bind(source.id).run();
    const lease = await env.DB.prepare('UPDATE source_state SET next_allowed = ?, last_attempt = ? WHERE id = ? AND next_allowed <= ? RETURNING payload').bind(now + NEWS_CADENCE, new Date(now).toISOString(), source.id, now).first();
    if (!lease) { results.push({ id: source.id, status: 'cooldown' }); continue; }
    try {
      let previous = {}; try { previous = JSON.parse(lease.payload || '{}'); } catch { /* A malformed cache can be rebuilt. */ }
      const collected = await collect(source, now, previous, fetcher);
      const items = collected.items.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
      const records = await Promise.all(items.map(item => toRecord(item, source, now)));
      const writes = records.length ? await env.DB.batch(records.map(event => insert(env.DB, event))) : [];
      const inserted = writes.reduce((sum, r) => sum + Number(r.meta?.changes || 0), 0);
      const payload = { ...collected, items: undefined, matched: records.length, inserted };
      await env.DB.prepare('UPDATE source_state SET last_success = ?, last_error = NULL, last_count = ?, payload = ? WHERE id = ?').bind(new Date(now).toISOString(), inserted, JSON.stringify(payload), source.id).run();
      results.push({ id: source.id, status: 'ok', matched: records.length, inserted });
    } catch (error) {
      const message = error.message === 'HTTP 403' ? 'Publisher denied access; collection is paused for 24 hours. Other sources continue.' : /^HTTP \d+$/.test(error.message) ? `Publisher returned ${error.message}; retry after the collection interval.` : 'Publisher unavailable or format changed; retry after the collection interval.';
      console.warn(`News collector ${source.id}: ${error.name}: ${error.message}`);
      await env.DB.prepare('UPDATE source_state SET last_error = ?, next_allowed = ? WHERE id = ?').bind(message, now + (error.message === 'HTTP 403' ? DAY : NEWS_CADENCE), source.id).run();
      results.push({ id: source.id, status: 'error', error: message });
    }
  }
  return { checkedAt: new Date(now).toISOString(), results };
}
const tokens = text => new Set(plainText(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !['the','and','for','with','from','chennai','city','its'].includes(w)));
export function groupCoverage(events) {
  const groups = [];
  for (const event of events) {
    const words = tokens(event.content);
    const group = groups.find(g => {
      if (g.category !== event.category || Math.abs(Date.parse(g.publishedAt) - Date.parse(event.created_at)) > 7 * DAY) return false;
      const overlap = [...words].filter(w => g.words.has(w)).length;
      return overlap / new Set([...words, ...g.words]).size >= 0.65;
    });
    if (group) { group.articles++; group.links.push({ title: event.content, url: event.source_url, source: event.source }); }
    else groups.push({ id: event.id, title: event.content, category: event.category, publishedAt: event.created_at, articles: 1, words, links: [{ title: event.content, url: event.source_url, source: event.source }] });
  }
  return groups.map(({ words: _words, ...group }) => group);
}
export async function newsStatus(env, now = Date.now()) {
  const events = await rows(env.DB, 'SELECT * FROM events WHERE news_meta IS NOT NULL AND created_at >= ? ORDER BY created_at DESC LIMIT 501', [new Date(now - 30 * DAY).toISOString()]);
  const states = new Map((await rows(env.DB, "SELECT * FROM source_state WHERE id IN ('news-pib','news-mongabay','news-gdelt-files')")).map(s => [s.id, s]));
  const groups = groupCoverage(events.slice(0, 500));
  return { windowDays: 30, cadenceMinutes: 15, writerConfigured: !!env.NEWS_INGEST_TOKEN_SHA256, capped: events.length > 500, articles: Math.min(events.length, 500), coverageGroups: groups.length, latestPublication: events[0]?.created_at || null,
    topics: [...new Set(events.map(e => e.category))].map(name => ({ name, count: events.filter(e => e.category === name).length })), groups: groups.slice(0, 8),
    sources: NEWS_SOURCES.map(source => {
      const state = states.get(source.id); let payload = {}; try { payload = JSON.parse(state?.payload || '{}'); } catch { /* Status remains readable. */ }
      return { ...source, lastAttempt: state?.last_attempt || null, lastSuccess: state?.last_success || null, lastError: state?.last_error || null, lastInserted: state?.last_count || 0, lastMatched: payload.matched || 0, scanned: payload.scanned || 0, gap: payload.gap || false,
        status: state?.last_error ? 'Needs attention' : !state?.last_success ? 'Awaiting collection' : now - Date.parse(state.last_success) > NEWS_CADENCE * 3 ? 'Overdue' : 'Checked' };
    }) };
}
