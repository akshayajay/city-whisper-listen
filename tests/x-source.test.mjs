import { test } from 'node:test';
import assert from 'node:assert/strict';
import { database } from '../scripts/local-db.mjs';
import { syncX, xStatus } from '../worker/x-source.js';
import worker from '../worker/index.js';
const config = db => ({ DB: db, X_ENABLED: 'true', X_BEARER_TOKEN: 'test-provider-secret', X_INGEST_TOKEN: 'test-ingestion-secret-with-32-characters', X_DAILY_POST_LIMIT: '20' });
const payload = (id = '1234567890123456789', now = Date.now()) => ({data:[{id, text:'Chennai waterlogging near the station', created_at:new Date(now).toISOString(), author_id:'7654'}],includes:{users:[{id:'7654',username:'fixture_user',name:'Test fixture',profile_image_url:'https://pbs.twimg.com/profile_images/fixture.png'}]}});
test('X is disabled without explicit API access, enablement and read limit; public requests cannot trigger costs', async () => {
  const db = database();
  try {
    let calls = 0;
    assert.equal((await syncX({ DB:db }, () => { calls++; })).status, 409);
    const req = new Request('https://example.test/api/sources/x/sync',{method:'POST'});
    assert.equal((await worker.fetch(req,config(db))).status,401);
    assert.equal(calls,0);
    const status = await worker.fetch(new Request('https://example.test/api/sources'),config(db));
    const text = await status.text();
    assert.ok(!text.includes('test-provider-secret') && !text.includes('test-ingestion-secret'));
    assert.equal((await xStatus({DB:db})).status,'Not connected');
  } finally { db.close(); }
});
test('X import preserves attribution, deduplicates, updates live analytics, source filters and export without affecting citizen submission',async()=>{
  const db=database(), env=config(db), now=Date.now();
  try {
    const urls=[];
    const fetcher=async url=>{ urls.push(new URL(url));return Response.json(payload(undefined,now));};
    assert.equal((await syncX(env,fetcher,now)).body.inserted,1);
    assert.equal((await syncX(env,fetcher,now+900001)).body.inserted,0);
    assert.equal(urls[0].origin,'https://api.x.com');
    assert.equal(urls[0].searchParams.get('max_results'),'10');
    assert.equal(urls[1].searchParams.get('since_id'),'1234567890123456789');
    const report=await worker.fetch(new Request('https://example.test/api/reports',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),content:'Streetlight is broken by the park.',city:'Chennai',area:'Adyar',category:'Infrastructure',source:'X'})}),env);
    assert.equal(report.status,201);
    assert.equal((await report.json()).event.source,'Citizen report');
    const snapshot=async query=>(await worker.fetch(new Request(`https://example.test/api/snapshot?mode=live&${query}`),env)).json();
    assert.equal((await snapshot('')).summary.total,2);
    const x=await snapshot('source=X');
    assert.equal(x.summary.total,1);
    assert.equal(x.events[0].source_url,'https://x.com/fixture_user/status/1234567890123456789');
    assert.equal(x.events[0].category,'Water');
    assert.equal((await snapshot('source=Citizen%20report')).summary.total,1);
    const csv=await worker.fetch(new Request('https://example.test/api/export?mode=live&source=X'),env);
    assert.match(await csv.text(),/https:\/\/x.com\/fixture_user\/status/);
    const demo=await worker.fetch(new Request('https://example.test/api/snapshot?mode=demo'),env);
    assert.equal((await demo.json()).summary.total,0);
  } finally{db.close();}
});
test('concurrent collectors reserve only one page; daily cap persists and resets on a new UTC date',async()=>{
  const db=database(), env={...config(db),X_DAILY_POST_LIMIT:'10'},now=Date.parse('2026-09-30T12:00:00Z');
  try{
    let calls=0;
    const fetcher=async()=>{calls++;return Response.json(payload(undefined,now));};
    const results=await Promise.all([syncX(env,fetcher,now),syncX(env,fetcher,now)]);
    assert.deepEqual(results.map(x=>x.status).sort(),[200,429]);
    assert.equal((await syncX(env,fetcher,now+900001)).status,429);
    assert.equal(calls,1);
    assert.equal((await syncX(env,fetcher,now+86400000)).status,200);
    assert.equal(calls,2);
  }finally{db.close();}
});
test('X failures expose useful errors without credentials, preserve the cursor, reserve budget and leave citizens usable',async()=>{
  const db=database(),env=config(db),now=Date.now();
  try{
    const failed=await syncX(env,async()=>new Response('provider sensitive body',{status:402}),now);
    assert.equal(failed.status,502);
    assert.match(failed.body.error,/credits/);
    const row=await db.prepare("SELECT * FROM x_ingestion").first();
    assert.equal(row.since_id,null);
    assert.equal(row.reserved_posts,10);
    assert.equal((await syncX(env,async()=>{throw new Error(env.X_BEARER_TOKEN);},now+900001)).body.error,'X is temporarily unreachable. The next sync will retry.');
    assert.equal((await worker.fetch(new Request('https://example.test/api/health'),env)).status,200);
  }finally{db.close();}
});
test('partial or malformed X results do not advance the cursor or fabricate signals',async()=>{
  const db=database(),env=config(db);
  try{
    assert.equal((await syncX(env,async()=>Response.json({errors:[{message:'bad'}]}))).status,502);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM events').first()).n,0);
    assert.equal((await db.prepare('SELECT since_id FROM x_ingestion').first()).since_id,null);
  }finally{db.close();}
});
test('owner removal deletes only requested X posts and X exports omit cached text', async()=>{
  const db=database(),env=config(db);
  try{
    await syncX(env,async()=>Response.json(payload()));
    const csv=await worker.fetch(new Request('https://example.test/api/export?mode=live&source=X'),env);
    assert.ok(!(await csv.text()).includes('Chennai waterlogging'));
    const body=JSON.stringify({ids:['1234567890123456789']});
    const request=authorization=>new Request('https://example.test/api/sources/x/remove',{method:'POST',headers:{'content-type':'application/json',authorization},body});
    assert.equal((await worker.fetch(request('Bearer wrong'),env)).status,401);
    const removed=await worker.fetch(request(`Bearer ${env.X_INGEST_TOKEN}`),env);
    assert.equal((await removed.json()).removed,1);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM events').first()).n,0);
  }finally{db.close();}
});
