import { useEffect, useState } from 'react';
import { ArrowUpRight, Newspaper } from 'lucide-react';
import { api } from './types';
type News = { articles:number; coverageGroups:number; capped:boolean; writerConfigured:boolean; latestPublication:string|null; topics:{name:string;count:number}[]; sources:{id:string;name:string;kind:string;url:string;license:string;status:string;lastSuccess:string|null;lastAttempt:string|null;lastError:string|null;lastInserted:number;lastMatched:number;scanned:number;gap:boolean}[]; groups:{id:string;title:string;category:string;articles:number;publishedAt:string;links:{title:string;url:string;source:string}[]}[] };
const stamp = (value:string|null) => value ? new Date(value).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Not yet';
export function NewsPulse({ detailed=false }: {detailed?:boolean}) {
  const [news,setNews] = useState<News|null>(null);
  const [error,setError] = useState(false);
  useEffect(() => { let active=true; const refresh=()=>void api<News>('/api/news').then(next=>{if(active){setNews(next);setError(false);}}).catch(()=>{if(active)setError(true);});refresh();const timer=setInterval(refresh,30000);return()=>{active=false;clearInterval(timer);}; },[]);
  return <section className="panel news-pulse" aria-label="Chennai news monitor">
    <div className="panel-heading"><div><span className="news-eyebrow"><Newspaper size={14}/> CHENNAI NEWS MONITOR</span><h2>What the city is talking about.</h2><p>Last 30 days · publication / index dates · separate from citizen sentiment</p></div><a className="post-link" href="/reports?mode=live&hours=720">Read the signal feed <ArrowUpRight size={15}/></a></div>
    {error && <p className="source-error" role="status">News status is unavailable. {news ? 'Showing the last confirmed response.' : 'Retrying automatically.'}</p>}
    {!news ? !error && <p className="collector-explainer">Checking saved news and collection status…</p> : <>
      <div className="news-metrics"><div><strong>{news.articles}{news.capped ? '+' : ''}</strong><span>saved articles & releases</span></div><div><strong>{news.coverageGroups}</strong><span>candidate coverage groups</span></div><div><strong>15 min</strong><span>collector interval · see checks below</span></div><div><strong className="news-date">{stamp(news.latestPublication)}</strong><span>latest publication or indexing time</span></div></div>
      <div className="news-topics">{news.topics.map(topic=><span className="category-tag" key={topic.name}>{topic.name} <b>{topic.count}</b></span>)}</div>
      <p className="collector-explainer">Headlines are classified by civic keywords and Chennai relevance. Similar titles within seven days are grouped for review; these are not counts of verified incidents. News is not assigned citizen sentiment. Older articles keep their original dates.</p>
      <div className="news-source-grid">{news.sources.map(source=><article key={source.id}><div><strong>{source.name}</strong><span className={`source-health ${source.status === 'Checked' ? 'healthy':'degraded'}`}>{source.status}</span></div><small>{source.kind}</small><p>Last successful check: {stamp(source.lastSuccess)}<br/>{source.scanned.toLocaleString()} items scanned · {source.lastInserted} newly saved · {source.lastMatched} matches in the last successful collection</p>{source.gap && <p className="source-error">A collection gap followed a delay. This feed is not exhaustive.</p>}{source.lastError && <p className="source-error">{source.lastError}</p>}<a className="post-link" href={source.license} target="_blank" rel="noopener noreferrer">Publisher & reuse policy <ArrowUpRight size={12}/></a></article>)}</div>
      {detailed && <div className="news-coverage">{news.groups.map(group=><details key={group.id}><summary>{group.title}<span>{group.category} · {group.articles} {group.articles===1?'article':'articles'}</span></summary>{group.links.map(link=><a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.source}: {link.title} ↗</a>)}</details>)}</div>}
      {news.articles === 0 && <p className="collector-explainer">No qualifying Chennai coverage has been saved in the last 30 days. A successful check can return zero matches; the collector does not invent signals.</p>}
    </>}
  </section>;
}
