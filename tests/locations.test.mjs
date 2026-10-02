import { test } from 'node:test';
import assert from 'node:assert/strict';
import {districts,locateTamilNadu} from '../worker/locations.js';
import {validateReport} from '../worker/domain.js';
import {parseGdeltHeadlines,groupCoverage,newsCategory,syncNews} from '../worker/news-source.js';
import {database} from '../scripts/local-db.mjs';
test('reports accept all 38 districts and reject unknown locations',()=>{
 assert.equal(districts.length,38);assert.equal(new Set(districts.map(d=>d.name)).size,38);
 for(const d of districts) assert.equal(validateReport({id:'test-id-1234567890',content:'Water supply is interrupted',area:'Town centre',city:d.name,category:'Water'}).city,d.name);
 assert.throws(()=>validateReport({id:'test-id-1234567890',content:'Water supply is interrupted',area:'Town centre',city:'Delhi',category:'Water'}));
});
test('English and Tamil district aliases are resolved without invented incident locations',()=>{
 assert.equal(locateTamilNadu('Trichy road repairs').city,'Tiruchirappalli');
 assert.equal(locateTamilNadu('தூத்துக்குடியில் குடிநீர் விநியோகம்').city,'Thoothukudi');
 assert.equal(locateTamilNadu('Tamil Nadu water supply').city,'Tamil Nadu');
 assert.deepEqual(locateTamilNadu('Madurai and Coimbatore bus services').districts,['Coimbatore','Madurai']);
 assert.equal(locateTamilNadu('Madurai and Coimbatore bus services').city,'Tamil Nadu');
 assert.equal(locateTamilNadu('Salem Oregon road repairs'),null);
 assert.equal(locateTamilNadu('Flood waters erode roads in Ohio'),null);
 assert.equal(locateTamilNadu('Salem Tamil Nadu road repairs').city,'Salem');
});
test('statewide news accepts Tamil civic topics and preserves source time',()=>{
 const now=Date.parse('2026-10-02T00:00:00Z');
 const records=['Coimbatore water supply restored','திருச்சியில் பேருந்து சேவை','Salem Oregon water supply','Delhi metro expansion'].map((title,i)=>({title,url:`https://example.com/${i}`,date:'2026-10-01T20:00:00Z'}));
 const results=parseGdeltHeadlines(records.map(JSON.stringify).join('\n'),now);
 assert.equal(results.length,2);assert.equal(newsCategory(results[1].title),'Transport');
 assert.equal(results[0].date,'2026-10-01T20:00:00Z');
});
test('similar headlines in different districts remain separate coverage groups',()=>{
 const a={id:'1',city:'Madurai',content:'Main road water supply repair completed today',category:'Water',created_at:'2026-10-01',source_url:'https://example.com/1'};
 assert.equal(groupCoverage([a,{...a,id:'2',city:'Coimbatore'}]).length,2);
});
test('statewide publisher ingestion stores inferred district and never scores news as citizen sentiment',async()=>{
 const db=database(),now=Date.parse('2026-10-02T00:00:00Z');
 try{await syncNews({DB:db},{now,backfill:false,ids:['news-mongabay'],fetcher:async url=>{
 assert.ok(!url.includes('search=Chennai'));
 return Response.json([{title:{rendered:'Coimbatore wetland restoration'},content:{rendered:'<p>Coimbatore water and biodiversity project.</p>'},link:'https://india.mongabay.com/2026/10/test',date_gmt:'2026-10-01T00:00:00'}]);
 }});
 const row=await db.prepare('SELECT * FROM events').first();assert.equal(row.city,'Coimbatore');assert.equal(row.sentiment,'unscored');assert.deepEqual(JSON.parse(row.news_meta).districts,['Coimbatore']);
 }finally{db.close();}
});
