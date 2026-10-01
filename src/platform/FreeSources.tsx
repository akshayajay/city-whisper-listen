import { Activity, ArrowUpRight, CloudRain, RefreshCw, Wind } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { FreeSource } from './types';
const stamp = (date?: string | null) => date ? new Date(date).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Not collected yet';
export function FreeSourcePanel({ sources, syncing, onSync }: { sources: FreeSource[]; syncing: boolean; onSync: () => void }) {
  return <section className="panel free-sources-panel">
    <div className="panel-heading"><div><h2>Open data, connected</h2><p>Seven free feeds · independent health checks</p></div><button className="secondary" onClick={onSync} disabled={syncing}><RefreshCw size={14} className={syncing ? 'spin' : ''}/>{syncing ? 'Collecting…' : 'Check feeds'}</button></div>
    <div className="collector-explainer">Feeds refresh when a live workspace is open. Each provider has a shared cooldown across all viewers. Bluesky uses short samples; the other feeds are polled. No paid X calls are made.</div>
    {!sources.length && <p className="collector-explainer">Source status is unavailable. Citizen reporting remains independent.</p>}
    {sources.map(source => <div className="source-row free-source-row" key={source.id}>
      <div className="source-logo"><Activity size={20}/></div>
      <div><h3>{source.name}</h3><p>{source.description}</p><div className="source-detail"><span className="source-badge">{source.kind}</span> At most every {source.everyMinutes} min · Last success: {stamp(source.lastSuccess)}</div>
      {source.lastSuccess && <p className="source-detail">{source.kind === 'conditions' ? `${source.lastCount} available metrics` : `${source.lastCount} matches in the last collection`}{source.payload?.scanned !== undefined ? ` · ${source.payload.scanned.toLocaleString()} items scanned` : ''}</p>}
      {source.lastError && <p className="source-error">{source.lastError} {source.lastSuccess ? 'Last successful data remains visible with its timestamp.' : 'No successful data yet.'}</p>}
      <a className="post-link" href={source.docs} target="_blank" rel="noopener noreferrer">Provider & attribution <ArrowUpRight size={13}/></a></div>
      <span className={`source-health ${source.status === 'Connected' ? 'healthy' : source.status === 'Awaiting collection' ? 'waiting' : 'degraded'}`}>{source.status}</span>
    </div>)}
  </section>;
}
function History({source, metric, color}: {source?: FreeSource; metric:'temperature_2m'|'pm2_5'; color:string}) {
  const points = source?.history.filter(p => typeof p[metric] === 'number') || [];
  return points.length > 1 ? <div className="condition-chart"><ResponsiveContainer width="100%" height={100}><AreaChart data={points} margin={{left:0,right:8,top:8,bottom:0}}>
    <XAxis dataKey="time" tickFormatter={s => new Date(s).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} minTickGap={60} tick={{fontSize:10,fill:'#89849b'}} axisLine={false} tickLine={false}/>
    <Tooltip labelFormatter={s => stamp(String(s))} formatter={value => [value,metric === 'pm2_5' ? 'PM2.5 (µg/m³)' : 'Temperature (°C)']}/>
    <Area dataKey={metric} stroke={color} fill={color} fillOpacity={0.1} isAnimationActive={false}/>
  </AreaChart></ResponsiveContainer></div> : <p className="history-empty">The trend builds as new provider timestamps arrive.</p>;
}
export function CityConditions({sources}: {sources:FreeSource[]}) {
  const weather = sources.find(s => s.id === 'weather'), air = sources.find(s => s.id === 'air');
  const value = (s: FreeSource | undefined,key:string) => s?.payload?.values?.[key] ?? '—';
  const hazards = sources.filter(s => s.kind === 'hazards');
  return <section className="city-context" aria-label="Chennai environmental context">
    <div className="context-heading"><div><span>CHENNAI · ENVIRONMENT & REGION</span><h2>A wider view of your city.</h2></div><p>Separate from report counts and sentiment. Model estimates are not local sensor readings.</p></div>
    <div className="context-grid">
      <article className="panel condition-card"><div className="condition-title"><CloudRain size={21}/><h3>Weather</h3><span className="source-badge">Modeled</span></div>
        <div className="condition-primary">{value(weather,'temperature_2m')}<small>°C</small></div>
        <div className="condition-metrics"><span>Rain <b>{value(weather,'precipitation')} mm / 15 min</b></span><span>Humidity <b>{value(weather,'relative_humidity_2m')}%</b></span><span>Wind <b>{value(weather,'wind_speed_10m')} km/h</b></span></div>
        <History source={weather} metric="temperature_2m" color="#8070df"/>
        <p className="condition-time">Provider time: {stamp(weather?.payload?.measuredAt)} · {weather?.status || 'Awaiting collection'}</p><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Weather data by Open-Meteo ↗</a>
      </article>
      <article className="panel condition-card"><div className="condition-title"><Wind size={21}/><h3>Air quality</h3><span className="source-badge">Modeled · 45 km grid</span></div>
        <div className="condition-primary">{value(air,'us_aqi')}<small>US AQI</small></div>
        <div className="condition-metrics"><span>PM2.5 <b>{value(air,'pm2_5')} µg/m³</b></span><span>PM10 <b>{value(air,'pm10')} µg/m³</b></span></div>
        <History source={air} metric="pm2_5" color="#339e91"/>
        <p className="condition-time">Provider time: {stamp(air?.payload?.measuredAt)} · {air?.status || 'Awaiting collection'}</p><a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noopener noreferrer">CAMS via Open-Meteo ↗</a>
      </article>
      <article className="panel regional-card"><div className="condition-title"><Activity size={21}/><h3>Regional hazard watch</h3></div><p>Within 500 km of Chennai. Feed entries do not establish local impact; check original advisories.</p>
        {hazards.map(source => <div className="hazard-source" key={source.id}><strong>{source.name}<span>{source.status}</span></strong>
          {source.payload?.hazards?.length ? source.payload.hazards.slice(0,3).map(h => <a key={h.id} href={h.url} target="_blank" rel="noopener noreferrer">{h.title}<small>{h.distanceKm} km from Chennai · {stamp(h.date)} ↗</small></a>) : <p>{source.lastSuccess ? 'No matching events in the last successful check.' : 'No successful check yet.'}</p>}
          <small>Checked {stamp(source.lastSuccess)}</small>
        </div>)}
      </article>
    </div>
  </section>;
}
