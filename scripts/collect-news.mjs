// Fixed destination: never send the ingestion secret to a redirect or supplied URL.
const origin = 'https://citypulse-listen.akshayajayakanth.chatgpt.site';
const token = process.env.CITYPULSE_NEWS_TOKEN;
if (!token || token.length < 32) throw new Error('CITYPULSE_NEWS_TOKEN is not configured.');
const response = await fetch(`${origin}/api/news/sync`, { method: 'POST', redirect: 'manual', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(180000) });
if (![200,502].includes(response.status)) throw new Error(`News writer returned HTTP ${response.status}.`);
const result = await response.json();
if (!Array.isArray(result.results)) throw new Error('News writer returned an invalid result.');
const readback = await fetch(`${origin}/api/news`, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
if (!readback.ok) throw new Error(`News readback returned HTTP ${readback.status}.`);
const saved = await readback.json();
console.log(JSON.stringify({ checkedAt: result.checkedAt, results: result.results.map(r=>({source:r.id,status:r.status,inserted:r.inserted??0})), savedArticles:saved.articles, candidateCoverageGroups:saved.coverageGroups }));
const healthy = saved.sources.filter(s => ['news-gdelt-files','news-mongabay'].includes(s.id) && s.lastSuccess && Date.now()-Date.parse(s.lastSuccess)<45*60000);
if (!healthy.length) throw new Error('No news index or independent publisher has a recent successful collection. See the Site source status.');
for (const source of saved.sources.filter(s=>s.lastError)) console.log(`Provider needs attention: ${source.name}. The saved Site source status has details.`);
