import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from '../scripts/local-db.mjs';
import {blueskyRecord,collectSource,parseGdelt,parseGdacs,parseHazards,readLimited,sampleBluesky,syncFreeSources,freeSourceStatus} from '../worker/free-sources.js';
import {insert,snapshot} from '../worker/store.js';
const now = Date.now();
const date = new Date(now).toISOString();
const post = {collection:'app.bsky.feed.post',did:'did:plc:abcdefghijklmnopqrstuvwx',rkey:'abc',operation:'create',record:{text:'Chennai road has dangerous potholes',createdAt:date}};
const weather = {current:{time:date.slice(0,19),temperature_2m:32,precipitation:0}};
const response = data => new Response(JSON.stringify(data));

test('news requires civic Chennai title, safe link and valid time; stays unscored and deduplicates',async()=>{
  const article = {title:'Chennai road repairs after rain',url:'https://example.com/news',seendate:date.replaceAll('-','').replaceAll(':','').slice(0,15)+'Z'};
  const parsed = await parseGdelt({articles:[article,{...article,title:'Cricket in Chennai'},{...article,url:'javascript:alert(1)'},{...article,seendate:'invalid'}]},now);
  assert.equal(parsed.records.length,1);
  assert.equal(parsed.records[0].sentiment,'unscored');
  const db = database();
  try {
    await insert(db,parsed.records[0]).run(); await insert(db,parsed.records[0]).run();
    await insert(db,{...parsed.records[0],id:'citizen-example',source:'Citizen report',sentiment:'negative'}).run();
    const data = await snapshot(db,new URL('http://local/api/snapshot'));
    assert.equal(data.summary.total,2); assert.equal(data.summary.sentimentTotal,1); assert.equal(data.summary.negative,1);
    assert.equal((await snapshot(db,new URL('http://local/api/snapshot?source=GDELT%20news'))).summary.sentimentTotal,0);
  } finally {db.close();}
});
test('environment retains real zero, missing metrics and provider timestamps without inventing reports',async()=>{
  const db = database();
  try {
    const fetcher = async()=>response(weather);
    await syncFreeSources({DB:db},{ids:['weather'],now,fetcher});
    await syncFreeSources({DB:db},{ids:['weather'],now:now+16*60000,fetcher});
    const source = (await freeSourceStatus(db)).find(s=>s.id==='weather');
    assert.equal(source.payload.values.precipitation,0); assert.equal(source.payload.values.relative_humidity_2m,null);
    assert.equal(source.history.length,1);
    assert.equal((await snapshot(db,new URL('http://local/api/snapshot'))).summary.total,0);
    const changed = {...weather,current:{...weather.current,time:new Date(now+3600000).toISOString().slice(0,19)}};
    await syncFreeSources({DB:db},{ids:['weather'],now:now+3600000,fetcher:async()=>response(changed)});
    assert.equal((await freeSourceStatus(db)).find(s=>s.id==='weather').history.length,2);
  } finally {db.close();}
});
test('concurrent viewers share one collection lease; failure preserves previous data and other feeds',async()=>{
  const db = database(); let calls=0;
  try {
    const opts={ids:['weather'],now,fetcher:async()=>{calls++;return response(weather)}};
    const runs=await Promise.all([syncFreeSources({DB:db},opts),syncFreeSources({DB:db},opts)]);
    assert.equal(calls,1); assert.ok(runs.some(r=>r.results[0].status==='cooldown'));
    const result=await syncFreeSources({DB:db},{ids:['weather','usgs'],now:now+16*60000,fetcher:async url=>url.includes('usgs')?response({features:[]}):new Response('',{status:429})});
    assert.equal(result.results.find(s=>s.id==='usgs').status,'ok');
    const source=(await freeSourceStatus(db)).find(s=>s.id==='weather');
    assert.equal(source.status,'Retrying'); assert.equal(source.payload.values.temperature_2m,32); assert.equal(source.lastSuccess,date);
  }finally{db.close()}
});
test('regional feeds exclude remote points, reject unsafe XML and preserve attribution',()=>{
  const quake=(lon,lat)=>({id:'test',geometry:{coordinates:[lon,lat]},properties:{time:now,mag:3,place:'Test',url:'https://example.com/event'}});
  assert.equal(parseHazards('usgs',{features:[quake(80.27,13.08),quake(-122,37)]},now).count,1);
  assert.equal(parseHazards('usgs',{features:[{...quake(80,13),properties:{time:NaN}}]},now).count,0);
  const xml=`<rss><channel><item><title><![CDATA[Test &amp; rain]]></title><geo:lat>13.08</geo:lat><geo:long>80.27</geo:long><pubDate>${date}</pubDate><link>https://example.com/advisory</link></item><item><title>Missing location</title></item></channel></rss>`;
  const parsed=parseGdacs(xml,now); assert.equal(parsed.count,1); assert.equal(parsed.payload.hazards[0].title,'Test & rain');
  assert.throws(()=>parseGdacs('<!DOCTYPE rss><rss/>',now));
  assert.equal(parseHazards('eonet',{events:[{id:'e',title:'Far away',geometry:[{type:'Point',coordinates:[0,0],date}],sources:[{url:'https://example.com'}]}]},now).count,0);
});
test('Bluesky create, edit and delete use stable identity and require a Chennai civic mention',async()=>{
  const record=await blueskyRecord(post,now); assert.equal(record.source,'Bluesky'); assert.match(record.area,/unverified/);
  assert.equal((await blueskyRecord({...post,operation:'delete'},now)).id,record.id);
  assert.equal((await blueskyRecord({...post,record:{...post.record,text:'Chennai cricket'}},now)).remove,true);
  const db=database();
  try{
    const run=async(event,time)=>syncFreeSources({DB:db},{ids:['bluesky'],now:time,sampler:async()=>({events:[event],scanned:123})});
    await run(post,now); await run({...post,operation:'update',record:{...post.record,text:'Chennai road repaired, thanks'}},now+60001);
    let data=await snapshot(db,new URL('http://local/api/snapshot')); assert.equal(data.summary.total,1); assert.equal(data.events[0].sentiment,'positive');
    await run({...post,operation:'delete'},now+120002);
    data=await snapshot(db,new URL('http://local/api/snapshot')); assert.equal(data.summary.total,0);
  }finally{db.close()}
});
test('bounded Jetstream sample reads official payload envelopes and handles malformed frames',async()=>{
  const socket=new EventTarget(); socket.close=()=>{};
  const promise=sampleBluesky(null,20,async()=>({socket,opened:true}));
  await new Promise(resolve=>setTimeout(resolve,1));
  socket.dispatchEvent(new MessageEvent('message',{data:'bad json'}));
  socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({payload:post})}));
  socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({payload:{...post,operation:'delete'}})}));
  const sample=await promise; assert.equal(sample.scanned,2); assert.equal(sample.events.length,1); assert.equal(sample.events[0].operation,'delete');
});
test('provider errors and oversized bodies are rejected; caller cannot select arbitrary URLs',async()=>{
  await assert.rejects(()=>readLimited(new Response('abcdef'),3),/too large/);
  await assert.rejects(()=>readLimited(new Response('',{status:503})),/503/);
  await assert.rejects(()=>collectSource('https://example.com'),/Unknown source/);
  await assert.rejects(()=>collectSource('weather',{fetcher:async()=>response({})}),/Invalid conditions/);
});
