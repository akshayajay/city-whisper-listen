import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from '../scripts/local-db.mjs';
import {parsePibListing,parseMongabay,syncNews,newsStatus,authorizedNews,digest,groupCoverage,parseGdeltHeadlines} from '../worker/news-source.js';
import {snapshot} from '../worker/store.js';
import worker from '../worker/index.js';
const now=Date.parse('2026-10-01T18:00:00Z');
const item=(title='Chennai water supply repairs',date='18 Sep 2026',id=123)=>`<li><a title='${title}' href='/PressReleseDetail.aspx?PRID=${id}'>${title}</a><span class='publishdatesmall'>Posted on: ${date}</li>`;
const current=`<input type="hidden" name="__VIEWSTATE" value="public-archive-form">${item('Chennai road repairs','01 Oct 2026',456)}`;
const post={date_gmt:'2026-09-29T10:00:00',title:{rendered:'How Chennai is protecting its wetlands'},content:{rendered:'<p>Chennai residents discuss water and wetland conservation.</p>'},link:'https://india.mongabay.com/2026/09/chennai-wetlands/',yoast_head_json:{author:'Reporter'}};

test('archive keeps true publication date and rejects unrelated, old and future titles',()=>{
 const articles=parsePibListing(item()+item('Delhi road repairs')+item('Chennai film festival')+item('Chennai road repairs','01 Aug 2026')+item('Chennai road repairs','02 Oct 2026'),now);
 assert.equal(articles.length,1);assert.equal(articles[0].date,'2026-09-17T18:30:00.000Z');assert.equal(articles[0].datePrecision,'day');
 assert.throws(()=>parsePibListing('<html>service unavailable</html>',now));
});
test('independent reporting requires local civic focus, safe links and current publication; captions do not qualify',()=>{
 assert.equal(parseMongabay([post],now).length,1);
 assert.equal(parseMongabay([{...post,title:{rendered:'National steel demand'},content:{rendered:'<figure><figcaption>Chennai water tank</figcaption></figure><p>Steel industry changes.</p>'}}],now).length,0);
 assert.equal(parseMongabay([{...post,link:'https://evil.example/article'},{...post,date_gmt:'2026-08-01T00:00:00'},{...post,date_gmt:'2026-10-02T00:00:00'}],now).length,0);
});
test('backfill persists once; shared leases prevent duplicate work; cached archive and failures preserve data',async()=>{
 const db=database();let calls=0,archives=0;
 const fetcher=async(url,init)=>{calls++;if(url.includes('mongabay'))return new Response(JSON.stringify([post]));if(init.method==='POST'){archives++;return new Response(item());}return new Response(current);};
 try {
  const [first,concurrent]=await Promise.all([syncNews({DB:db},{now,fetcher,backfill:false,ids:['news-pib','news-mongabay']}),syncNews({DB:db},{now,fetcher,backfill:false,ids:['news-pib','news-mongabay']})]);
  assert.equal([...first.results,...concurrent.results].filter(r=>r.status==='cooldown').length,2);
  assert.equal(calls,3);assert.equal(archives,1);
  assert.equal((await newsStatus({DB:db},now)).articles,3);
  const before=await db.prepare('SELECT received_at,created_at,sentiment,news_meta FROM events ORDER BY seq').all();
  await syncNews({DB:db},{now:now+16*60000,fetcher,backfill:false,ids:['news-pib','news-mongabay']});
  assert.equal(archives,1);assert.deepEqual((await db.prepare('SELECT received_at,created_at,sentiment,news_meta FROM events ORDER BY seq').all()).results,before.results);
  assert.ok(before.results.every(row=>row.sentiment==='unscored'));
  await syncNews({DB:db},{now:now+32*60000,backfill:false,ids:['news-pib','news-mongabay'],fetcher:async()=>new Response('limited',{status:429})});
  const status=await newsStatus({DB:db},now+32*60000);assert.equal(status.articles,3);assert.ok(status.sources.filter(s=>s.id !== 'news-gdelt-files').every(s=>s.lastError&&s.lastSuccess));
  assert.equal((await db.prepare("SELECT count(*) AS n FROM events WHERE source='Citizen report'").first()).n,0);
 }finally{db.close();}
});
test('news writer denies missing or incorrect authorization before any fetch or database write',async()=>{
 const token='testing-only-credential-at-least-32-characters';const env={NEWS_INGEST_TOKEN_SHA256:await digest(token)};
 assert.equal(await authorizedNews(new Request('https://local',{headers:{Authorization:`Bearer ${token}`}}),env),true);
 for(const headers of [{},{Authorization:'Bearer wrong-credential-at-least-32-characters'}]){
  const db=database();try{const r=await worker.fetch(new Request('https://local/api/news/sync',{method:'POST',headers}),{...env,DB:db});assert.equal(r.status,401);assert.equal((await db.prepare('SELECT count(*) AS n FROM source_state').first()).n,0);}finally{db.close();}
 }
});
test('coverage grouping combines very similar titles only within category and seven days',()=>{
 const a={id:'a',content:'Chennai water supply repairs in Adyar',category:'Water',created_at:'2026-09-25T00:00:00Z',source_url:'https://example.com/a',source:'Test'};
 const result=groupCoverage([a,{...a,id:'b',content:'Water supply repairs in Adyar Chennai',source_url:'https://example.com/b'},{...a,id:'c',created_at:'2026-09-01T00:00:00Z'},{...a,id:'d',content:'Chennai water reservoir construction completed'}]);
 assert.equal(result.length,3);assert.equal(result[0].articles,2);assert.equal(result[0].links.length,2);
});
test('news metadata is optional and new articles appear in normal live analytics without sentiment inflation',async()=>{
 const db=database();const today=new Date().toISOString().slice(0,19);try{
  await syncNews({DB:db},{backfill:false,ids:['news-pib','news-mongabay'],fetcher:async url=>url.includes('mongabay')?new Response(JSON.stringify([{...post,date_gmt:today}])):new Response('HTTP failure',{status:503})});
  const data=await snapshot(db,new URL('https://local/api/snapshot?mode=live&hours=720'));
  assert.equal(data.summary.total,1);assert.equal(data.summary.sentimentTotal,0);assert.equal(data.events[0].source,'Mongabay India');assert.ok(data.events[0].news_meta);
 }finally{db.close();}
});

test('GDELT headline references preserve index time and reject nonlocal or unsafe records',()=>{
 const record={title:'Chennai metro extension opens',date:'2026-10-01T17:00:00Z',url:'https://example.com/chennai-metro'};
 const items=parseGdeltHeadlines([record,{...record,title:'Delhi metro extension'},{...record,url:'javascript:alert(1)'}].map(JSON.stringify).join('\n'),now);
 assert.equal(items.length,1);assert.equal(items[0].datePrecision,'indexed');
});
