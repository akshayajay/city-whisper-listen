import { NewsPulse } from './platform/NewsPulse';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  Layers3,
  Loader2,
  MapPin,
  Menu,
  MessageSquare,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Wifi,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SignalMap from "./platform/SignalMap";
import ReportDialog from "./platform/ReportDialog";
import XPost from "./platform/XPost";
import { FreeSourcePanel, CityConditions } from "./platform/FreeSources";
import {
  api,
  categories,
  cities,
  CivicEvent,
  Mode,
  Snapshot,
  SourceStatus,
} from "./platform/types";
import "./platform/platform.css";
const nav = [
  { path: "/dashboard", name: "Overview", icon: Layers3 },
  { path: "/map", name: "Signal map", icon: MapPin },
  { path: "/analytics", name: "Analytics", icon: BarChart3 },
  { path: "/reports", name: "Signal feed", icon: MessageSquare },
  { path: "/sources", name: "Data sources", icon: Radio },
];
const time = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
const isBackfill = (event: CivicEvent) => { try { return !!JSON.parse(event.news_meta || "{}").initialBackfill; } catch { return false; } };
const number = (n = 0) => n.toLocaleString();
function EventList({
  events,
  empty,
  full = false,
}: {
  events: CivicEvent[];
  empty: string;
  full?: boolean;
}) {
  return events.length ? (
    <div className={`event-list ${full ? "full" : ""}`}>
      {events.map((event) => (
        <article className="event" key={event.id}>
          <div className={`event-symbol ${event.sentiment}`}>
            <MessageSquare size={15} />
          </div>
          <div className="event-body">
            <div className="event-meta">
              <strong>{event.city}</strong>
              <span>·</span>
              <span>{event.area}</span>
              <time
                dateTime={event.created_at}
                title={new Date(event.created_at).toLocaleString()}
              >
                {event.news_meta ? new Date(event.created_at).toLocaleDateString([], {month:"short",day:"numeric",year:"numeric",timeZone:"Asia/Kolkata"}) : time(event.created_at)}
              </time>
            </div>
            {event.source === "X" && event.author_username && (
              <a className="post-author" href={`https://x.com/${event.author_username}`} target="_blank" rel="noopener noreferrer">
                {event.author_avatar && <img src={event.author_avatar} alt="" width={24} height={24} loading="lazy" referrerPolicy="no-referrer" />}
                <strong>{event.author_name}</strong> @{event.author_username}
              </a>
            )}
            {event.source === "X" ? <XPost event={event} /> : <p>{event.content}</p>}
            {event.news_meta && <small className="news-attribution">{isBackfill(event) ? "Archive backfill · " : ""}{event.source === 'PIB Chennai' ? 'Official release · Press Information Bureau' : event.source === 'GDELT headlines' ? `News index · ${event.author_name}` : `Independent reporting · ${event.author_name || event.source}`} · {event.source === 'GDELT headlines' ? 'Indexed date; publication date unverified' : 'Published date, not incident date'} · Topic inferred from text</small>}
            <div className="event-tags">
              <span className="category-tag">{event.category}</span>
              {event.sentiment !== "unscored" && <span className={`sentiment ${event.sentiment}`}>{event.sentiment}</span>}
              <small>{event.demo ? "Simulated event" : event.source === "X" ? "X · Chennai mention" : event.source}</small>
              {event.source_url && (
                <a href={event.source_url} target="_blank" rel="noopener noreferrer" className="post-link">{event.source === "X" ? "View on X" : event.source === "Bluesky" ? "View on Bluesky" : "Read original"} <ArrowUpRight size={12} /></a>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  ) : (
    <div className="empty">
      <MessageSquare size={30} />
      <h3>No signals here yet</h3>
      <p>{empty}</p>
    </div>
  );
}
function Platform() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const mode: Mode = params.get("mode") === "demo" ? "demo" : "live";
  const city = params.get("city") || "all",
    category = params.get("category") || "all",
    source = params.get("source") || "all",
    sentiment = params.get("sentiment") || "all",
    hours = params.get("hours") || (mode === "live" ? "720" : "24"),
    q = params.get("q") || "";
  const [search, setSearch] = useState(q);
  const [data, setData] = useState<Snapshot | null>(null);
  const [syncing, setSyncing] = useState(false);
  const syncBusy = useRef(false);
  const [sources, setSources] = useState<SourceStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<
    "connecting" | "connected" | "reconnecting"
  >("connecting");
  const [heartbeat, setHeartbeat] = useState("");
  const [paused, setPaused] = useState(false);
  const [demoError, setDemoError] = useState("");
  const [menu, setMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");
  const currentRequest = useRef(0);
  const dataRef = useRef<Snapshot | null>(null);
  const query = useMemo(
    () =>
      new URLSearchParams({
        mode,
        city,
        category,
        source: mode === "live" ? source : "all",
        sentiment,
        hours,
        q,
      }).toString(),
    [mode, city, category, source, sentiment, hours, q],
  );
  const update = useCallback(
    (key: string, value: string) => {
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        if (value === "all" || !value) next.delete(key);
        else next.set(key, value);
        return next;
      });
    },
    [setParams],
  );
  const refresh = useCallback(async () => {
    const version = ++currentRequest.current;
    try {
      const next = await api<Snapshot>(`/api/snapshot?${query}`);
      if (version === currentRequest.current) {
        setData(next);
        dataRef.current = next;
        setError("");
      }
    } catch (e) {
      if (version === currentRequest.current) setError((e as Error).message);
    } finally {
      if (version === currentRequest.current) setLoading(false);
    }
  }, [query]);
  useEffect(() => {
    setData(null);
    dataRef.current = null;
    setLoading(true);
    void refresh();
    const pendingRequests = currentRequest;
    return () => {
      pendingRequests.current++;
    };
  }, [refresh]);
  useEffect(() => {
    let active = true;
    const load = () => void api<SourceStatus>("/api/sources").then(next => { if (active) setSources(next); }).catch(() => { if (active) setSources(null); });
    load();
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  useEffect(() => {
    setSearch(q);
  }, [q]);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    setConnection("connecting");
    setHeartbeat("");
    const stream = new EventSource(
      `/api/stream?mode=${mode}&cursor=${dataRef.current?.cursor || 0}`,
    );
    stream.onopen = () => setConnection("connected");
    stream.addEventListener("signals", () => void refresh());
    stream.addEventListener("heartbeat", (event) => {
      setHeartbeat(JSON.parse((event as MessageEvent).data).time);
      setConnection("connected");
    });
    stream.addEventListener("unavailable", () => setConnection("reconnecting"));
    stream.onerror = () => setConnection("reconnecting");
    const fallback = setInterval(() => void refresh(), 15000);
    return () => {
      stream.close();
      clearInterval(fallback);
    };
  }, [mode, refresh]);
  useEffect(() => {
    if (mode !== "demo" || paused) return;
    let active = true;
    let busy = false;
    const tick = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        await api("/api/demo", { method: "POST" });
        if (active) {
          setDemoError("");
          void refresh();
        }
      } catch (e) {
        if (active) setDemoError((e as Error).message);
      } finally {
        busy = false;
      }
    };
    void tick();
    const timer = setInterval(tick, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [mode, paused, refresh]);
  const syncFree = useCallback(async () => {
    if (syncBusy.current) return;
    syncBusy.current = true; setSyncing(true);
    try {
      await api("/api/sources/sync", {method:"POST",signal:AbortSignal.timeout(45000)});
      setSources(await api<SourceStatus>("/api/sources"));
      void refresh();
    } catch { setNotice("Some free feeds could not be checked. Last confirmed data remains visible; collection will retry."); }
    finally { syncBusy.current = false; setSyncing(false); }
  }, [refresh]);
  useEffect(() => {
    if (mode !== "live") return;
    const tick = () => { if (!document.hidden) void syncFree(); };
    tick(); const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, [mode, syncFree]);
  const route = location.pathname;
  const isMap = route === "/map",
    isReports = route === "/reports",
    isSources = route === "/sources",
    isAnalytics = route === "/analytics";
  const activeFilters =
    city !== "all" || category !== "all" || sentiment !== "all" || (mode === "live" && source !== "all") || !!q;
  const summary = data?.summary;
  const total = summary?.total || 0;
  const opinionTotal = summary?.sentimentTotal || 0;
  const negativeShare = opinionTotal
    ? Math.round(((summary?.negative || 0) / opinionTotal) * 100)
    : 0;
  const title = isMap
    ? "A local view. A bigger picture."
    : isReports
      ? "Every voice, in one place."
      : isSources
        ? "Know where your signals come from."
        : isAnalytics
          ? "From conversations to patterns."
          : "Your city has a lot to say.";
  const href = (path: string) => `${path}?${params.toString()}`;
  const reset = () => setParams({ mode, hours });
  const onSaved = (event: CivicEvent) => {
    setParams({ mode: "live", hours: "24", source: "Citizen report" });
    setNotice(
      `Report ${event.id.slice(0, 8)} saved. You’re now viewing real citizen reports.`,
    );
  };
  async function download() {
    setExporting(true);
    try {
      const response = await fetch(`/api/export?${query}`);
      if (!response.ok) throw new Error("Export failed. Try again shortly.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `citypulse-${mode}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice("Exported matching reports (up to 10,000 rows).");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="platform">
      {menu && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Link to={href("/dashboard")} className="brand">
          <span className="brand-mark">
            <Activity size={25} />
          </span>
          citypulse<span className="brand-dot">.</span>
        </Link>
        <div className="workspace">
          <div className="workspace-icon">TN</div>
          <div>
            <strong>Tamil Nadu</strong>
            <small>Civic intelligence workspace</small>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {nav.map(({ path, name, icon: Icon }) => (
            <NavLink key={path} to={href(path)}>
              <Icon size={18} />
              {name}
              {path === "/reports" && mode === "live" && total > 0 && (
                <span className="nav-count">{number(total)}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="listening-card">
            <span className="tiny-label">A CITY THAT LISTENS</span>
            <div className="mini-wave">
              {Array.from({ length: 24 }, (_, i) => (
                <i key={i} style={{ height: 8 + ((i * 13) % 33) }} />
              ))}
            </div>
            <p>
              Small signals.
              <br />
              Meaningful change.
            </p>
          </div>
          <Link to={href("/sources")} className="sidebar-help">
            <CircleHelp size={17} />
            About this workspace
          </Link>
          <div className="profile">
            <span>AJ</span>
            <div>
              <strong>CityPulse project</strong>
              <small>Independent civic analytics</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {nav.find((n) => n.path === route)?.name || "Overview"}
            </strong>
          </div>
          <div className="topbar-right">
            <span
              className={`connection ${connection === "connected" && !error ? "online" : "offline"}`}
            >
              <i />
              {error
                ? "Data unavailable"
                : connection === "connected"
                  ? "Dashboard connected"
                  : connection === "connecting"
                    ? "Connecting…"
                    : "Reconnecting…"}
            </span>
            <span className="top-divider" />
            <span className="avatar">TN</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span />
                CITY INTELLIGENCE, IN MOTION
              </div>
              <h1>{title}</h1>
              <p>
                {isReports
                  ? "Search the latest reports, understand the issue, and add your voice."
                  : isSources
                    ? "Transparent origins. Persistent records. No hidden sample data."
                    : "Listen to local voices. Spot what matters. See the picture change."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="secondary"
                onClick={download}
                disabled={exporting || !data}
              >
                {exporting ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <Download size={16} />
                )}
                Export
              </button>
              <ReportDialog onSaved={onSaved} />
            </div>
          </div>
          <div className={`mode-banner ${mode}`}>
            <div className="mode-description">
              <span className="mode-icon">
                {mode === "demo" ? <Layers3 size={18} /> : <Radio size={18} />}
              </span>
              <div>
                <strong>
                  {mode === "demo"
                    ? "You’re exploring the demo workspace"
                    : "Real voices. Tamil Nadu signals."}
                </strong>
                <span>
                  {mode === "demo"
                    ? "Simulated civic signals arrive every 5 seconds. They never enter your live dataset."
                    : "Citizen reports, public posts and civic news. Environmental feeds have their own panels; X remains optional."}
                </span>
              </div>
            </div>
            <div className="mode-controls">
              {mode === "demo" && (
                <button
                  className="text-button"
                  onClick={() => setPaused(!paused)}
                >
                  {paused ? <Play size={14} /> : <Pause size={14} />}{" "}
                  {paused ? "Resume demo" : "Pause generator"}
                </button>
              )}
              <div className="segmented" aria-label="Dataset">
                <button
                  className={mode === "live" ? "selected" : ""}
                  onClick={() => update("mode", "live")}
                >
                  <Radio size={13} />
                  Live
                </button>
                <button
                  className={mode === "demo" ? "selected" : ""}
                  onClick={() => update("mode", "demo")}
                >
                  Demo
                </button>
              </div>
            </div>
          </div>
          {mode === "live" && (
            <div className="chennai-source-strip">
              <div><strong>Tamil Nadu · news & citizen reports</strong><span>{sources?.free?.filter(s => s.status === "Connected").length || 0} / {sources?.free?.length || 7} open feeds checked · X {sources?.x.status || "status unavailable"}</span></div>
              <Link to="/sources?mode=live">Source details <ArrowUpRight size={14} /></Link>
              <Link to="/dashboard?mode=live">Explore Tamil Nadu <ArrowUpRight size={14} /></Link>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              <Check size={16} />
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {(error || demoError) && (
            <div className="error-banner" role="alert">
              <Wifi size={18} />
              <div>
                <strong>
                  {error
                    ? "Unable to refresh analytics"
                    : "Demo generator unavailable"}
                </strong>
                <p>
                  {error || demoError}
                  {data ? " Last confirmed data is shown." : ""}
                </p>
              </div>
              <button className="secondary" onClick={() => void refresh()}>
                Retry
              </button>
            </div>
          )}
          {!isSources && (
            <div className="filterbar">
              <div className="filters">
                <SlidersHorizontal size={16} />
                <select
                  aria-label="Filter city"
                  value={city}
                  onChange={(e) => update("city", e.target.value)}
                >
                  <option value="all">All Tamil Nadu</option><option value="Tamil Nadu">Statewide / multiple districts</option>
                  {cities.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select
                  aria-label="Filter category"
                  value={category}
                  onChange={(e) => update("category", e.target.value)}
                >
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select
                  aria-label="Filter sentiment"
                  value={sentiment}
                  onChange={(e) => update("sentiment", e.target.value)}
                >
                  <option value="all">All sentiments</option>
                  {["negative", "neutral", "positive"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                {mode === "live" && <select aria-label="Filter source" value={source} onChange={e => update("source", e.target.value)}>
                  <option value="all">All live sources</option>
                  <option value="Citizen report">Citizen reports</option>
                  <option value="Bluesky">Bluesky · Chennai</option>
                  <option value="GDELT headlines">GDELT · Indexed headlines</option>
                  <option value="PIB Chennai">PIB Chennai · Official releases</option>
                  <option value="Mongabay India">Mongabay India · News</option>
                  <option value="GDELT news">GDELT · Civic news</option>
                  <option value="X">X · Chennai</option>
                </select>}
                {activeFilters && (
                  <button className="text-button clear" onClick={reset}>
                    <X size={13} />
                    Clear
                  </button>
                )}
              </div>
              <div className="window-select">
                <select
                  aria-label="Time window"
                  value={hours}
                  onChange={(e) => update("hours", e.target.value)}
                >
                  <option value="1">Last hour</option>
                  <option value="24">Last 24 hours</option>
                  <option value="168">Last 7 days</option>
                  <option value="720">Last 30 days</option>
                </select>
                <button
                  className="icon-button"
                  aria-label="Refresh analytics"
                  onClick={() => void refresh()}
                >
                  <RefreshCw size={16} className={loading ? "spin" : ""} />
                </button>
              </div>
            </div>
          )}
          {loading && !data ? (
            <div className="loading-state">
              <Loader2 className="spin" />
              <p>Connecting the dots…</p>
            </div>
          ) : isSources ? (
            <div className="sources-layout">
              <NewsPulse detailed />
              <FreeSourcePanel sources={sources?.free || []} syncing={syncing} onSync={() => void syncFree()} />
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Your connected sources</h2>
                    <p>Each source has an explicit origin and dataset.</p>
                  </div>
                  <Radio size={19} />
                </div>
                <div className="source-row">
                  <div className="source-logo">
                    <MessageSquare size={23} />
                  </div>
                  <div>
                    <h3>Citizen reports</h3>
                    <p>
                      Real submissions through the report form. Stored durably
                      and streamed to connected viewers.
                    </p>
                    <span className="source-badge">Live dataset</span>
                  </div>
                  <span className="source-status">
                    {error ? "Unavailable" : "Ready to receive"}
                  </span>
                </div>
                <div className="source-row">
                  <div className="source-logo violet">
                    <Layers3 size={23} />
                  </div>
                  <div>
                    <h3>Demo simulator</h3>
                    <p>
                      Synthetic examples across 38 districts. Generates while a
                      demo workspace is open; old demo events expire after 24
                      hours.
                    </p>
                    <span className="source-badge violet">
                      Separate demo dataset
                    </span>
                  </div>
                  <span className="source-status">
                    {mode === "demo" && !paused ? "Generating" : "Standby"}
                  </span>
                </div>
                <div className="source-row">
                  <div className="source-logo x-logo" aria-hidden="true">𝕏</div>
                  <div>
                    <h3>X · Chennai civic signals</h3>
                    <p>Public posts mentioning Chennai or சென்னை and civic issues. A sample of up to 10 recent posts per sync, with reposts excluded. These are city mentions, not verified locations.</p>
                    <span className="source-badge">Live dataset · separate source filter</span>
                    <p className="source-detail">{sources?.x.lastSuccess ? `Last successful sync: ${new Date(sources.x.lastSuccess).toLocaleString()}` : "No posts have been collected yet."}</p>
                    {sources?.x.lastError && <p className="source-detail">{sources.x.lastError}</p>}
                    <p className="source-detail">{sources?.x.ready ? `Owner-run collection, at most once every 15 minutes. ${sources.x.reservedPosts} / ${sources.x.dailyPostLimit} daily post-read slots reserved.` : sources?.x.status === "Paused" ? "API credentials are saved. Collection is paused until a read limit is approved and enabled." : "Collection is waiting for the owner to connect X API access and approve a read limit."}</p>
                    <Link className="post-link" to="/reports?mode=live&city=Chennai&source=X">Browse Chennai posts <ArrowUpRight size={14} /></Link>
                  </div>
                  <span className="source-status">{sources?.x.status || "Unavailable"}</span>
                </div>
                <div className="source-footnote">
                  Citizen reporting works independently of X. Facebook and municipal systems are not connected. X collection is a bounded sample and may miss posts between syncs; it is not a measure of all Chennai residents’ opinions.
                </div>
              </section>
              <section className="panel methodology">
                <div className="panel-heading">
                  <h2>How the numbers work</h2>
                </div>
                <div>
                  <h3>
                    01 <span>Receive & persist</span>
                  </h3>
                  <p>
                    Each report gets a unique ID. Retrying the same submission
                    does not create a duplicate.
                  </p>
                  <h3>
                    02 <span>Classify transparently</span>
                  </h3>
                  <p>
                    Sentiment uses a small English keyword heuristic, not a
                    trained ML model. Negative keywords take precedence;
                    unmatched text is neutral. Labels may be wrong. Categories
                    are chosen by the reporter. Public posts use keyword categories; Tamil sentiment is not modeled. News headlines are unscored and excluded from sentiment percentages. Environmental readings and regional hazards never enter report counts or sentiment.
                  </p>
                  <h3>
                    03 <span>Update together</span>
                  </h3>
                  <p>
                    Server-sent events trigger fresh database analytics. Totals,
                    trends, and city counts use the same filters and database
                    snapshot. A 15-second refresh recovers missed updates.
                  </p>
                  <h3>
                    04 <span>Understand the limits</span>
                  </h3>
                  <p>
                    This project does not dispatch reports or track official
                    resolution. City locations are approximate. The feed shows
                    the newest 100 matching signals. X posts are retained for seven days and removed on the next sync; exports include up to
                    10,000.
                  </p>
                </div>
              </section>
            </div>
          ) : (
            <>
              {mode === "live" && !isMap && <NewsPulse detailed={isReports} />}
              {mode === "live" && !isReports && !isMap && (city === "all" || city === "Chennai") && <CityConditions sources={sources?.free || []} />}
              <div className="stat-grid">
                <article className="stat-card">
                  <div>
                    <span>Total signals</span>
                    <MessageSquare size={17} />
                  </div>
                  <strong>{number(total)}</strong>
                  <small>
                    <span className="stat-pill purple">
                      {mode === "demo" ? "DEMO" : "LIVE"}
                    </span>
                    in the selected window
                  </small>
                  <div className="stat-spark purple-spark">
                    {data?.trend.slice(-17).map((bucket, i) => (
                      <i
                        key={i}
                        style={{
                          height: Math.max(
                            2,
                            (bucket.total /
                              Math.max(1, ...data.trend.map((t) => t.total))) *
                              30,
                          ),
                        }}
                      />
                    ))}
                  </div>
                </article>
                <article className="stat-card">
                  <div>
                    <span>Negative signals</span>
                    <Activity size={17} />
                  </div>
                  <strong>{number(summary?.negative)}</strong>
                  <small>
                    <span className="stat-pill orange">{negativeShare}%</span>of
                    scored reports and posts
                  </small>
                  <div className="stat-line">
                    <i style={{ width: `${negativeShare}%` }} />
                  </div>
                </article>
                <article className="stat-card">
                  <div>
                    <span>Districts heard from</span>
                    <MapPin size={17} />
                  </div>
                  <strong>
                    {data?.cities.filter(c => cities.includes(c.name)).length || 0}
                    <em>/ 38</em>
                  </strong>
                  <small>districts with signals in this view</small>
                  <div className="city-dots">
                    {cities.map((c) => (
                      <i
                        key={c}
                        className={
                          data?.cities.some((v) => v.name === c)
                            ? "has-signals"
                            : ""
                        }
                      />
                    ))}
                  </div>
                </article>
                <article className="stat-card">
                  <div>
                    <span>Signals / minute</span>
                    <Radio size={17} />
                  </div>
                  <strong>
                    {summary?.perMinute || 0}
                    <span className="live-marker">
                      {connection === "connected" && !error
                        ? "CONNECTED"
                        : "WAITING"}
                    </span>
                  </strong>
                  <small>received in the last 60 seconds</small>
                  <div className="pulse-line" />
                </article>
              </div>
              {isReports ? (
                <section className="panel report-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        {mode === "demo" ? "Demo reports" : "Live signals"}
                      </h2>
                      <p>
                        Newest 100 matching records. All matching records count
                        toward analytics.
                      </p>
                    </div>
                    <form
                      className="searchbox"
                      onSubmit={(e) => {
                        e.preventDefault();
                        update("q", search);
                      }}
                    >
                      <Search size={16} />
                      <input
                        aria-label="Search reports"
                        placeholder="Search issues or neighborhoods…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <button type="submit">Search</button>
                    </form>
                  </div>
                  <EventList
                    events={data?.events || []}
                    full
                    empty="Submit a report or adjust the filters to see more voices."
                  />
                </section>
              ) : isMap ? (
                <div className="map-layout">
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>The city signal map</h2>
                        <p>Select a city to explore its reports.</p>
                      </div>
                      <span className="small-badge">
                        {summary?.cities || 0} active cities
                      </span>
                    </div>
                    <SignalMap
                      data={data?.cities || []}
                      selected={city}
                      onSelect={(c) => update("city", c)}
                      large
                    />
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>
                        {city === "all" ? "Latest across the region" : city}
                      </h2>
                    </div>
                    <EventList
                      events={data?.events.slice(0, 6) || []}
                      empty="No reports match this city and time window."
                    />
                  </section>
                </div>
              ) : (
                <>
                  <div className="overview-grid">
                    <section className="panel trend-panel" id="trends">
                      <div className="panel-heading">
                        <div>
                          <h2>How the conversation is changing</h2>
                          <p>
                            Signal volume over time ·{" "}
                            {Number(hours) <= 24 ? "hourly" : "daily"} buckets ·
                            local labels
                          </p>
                        </div>
                        <span className="small-badge">
                          <Activity size={12} />
                          Sentiment trend
                        </span>
                      </div>
                      <div className="chart-legend">
                        <span>
                          <i style={{ background: "#8470ea" }} />
                          Negative
                        </span>
                        <span>
                          <i style={{ background: "#43b59b" }} />
                          Positive
                        </span>
                        <span>
                          <i style={{ background: "#c4c9d9" }} />
                          Neutral
                        </span>
                      </div>
                      <div className="trend-chart">
                        {total > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={data?.trend}
                              margin={{
                                top: 10,
                                right: 20,
                                left: -20,
                                bottom: 0,
                              }}
                            >
                              <defs>
                                <linearGradient
                                  id="negativeFill"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="0%"
                                    stopColor="#8470ea"
                                    stopOpacity={0.3}
                                  />
                                  <stop
                                    offset="100%"
                                    stopColor="#8470ea"
                                    stopOpacity={0.01}
                                  />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 5"
                                vertical={false}
                                stroke="#e9eaf0"
                              />
                              <XAxis
                                dataKey="bucket"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: "#8b8da0", fontSize: 11 }}
                                minTickGap={28}
                                tickFormatter={(s) =>
                                  Number(hours) <= 24
                                    ? new Date(
                                        s + ":00:00.000Z",
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : s.slice(5)
                                }
                              />
                              <YAxis
                                allowDecimals={false}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#8b8da0", fontSize: 11 }}
                              />
                              <Tooltip
                                contentStyle={{
                                  borderRadius: 12,
                                  border: "1px solid #e9eaf0",
                                  fontSize: 12,
                                }}
                                labelFormatter={(s) =>
                                  Number(hours) <= 24
                                    ? new Date(
                                        s + ":00:00.000Z",
                                      ).toLocaleString()
                                    : s
                                }
                              />
                              <Area
                                type="monotone"
                                dataKey="negative"
                                name="Negative"
                                stroke="#8470ea"
                                strokeWidth={2.5}
                                fill="url(#negativeFill)"
                                isAnimationActive={false}
                              />
                              <Area
                                type="monotone"
                                dataKey="positive"
                                name="Positive"
                                stroke="#43b59b"
                                strokeWidth={2}
                                fill="transparent"
                                isAnimationActive={false}
                              />
                              <Area
                                type="monotone"
                                dataKey="neutral"
                                name="Neutral"
                                stroke="#b5bdce"
                                strokeWidth={2}
                                fill="transparent"
                                isAnimationActive={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="empty">
                            <BarChart3 size={30} />
                            <h3>The next signal starts here</h3>
                            <p>
                              Submit a citizen report to bring this view to
                              life.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="chart-footer">
                        <span>
                          Based on {number(opinionTotal)}{" "}
                          {mode === "demo" ? "simulated" : "scored"} reports and posts
                        </span>
                        <span>
                          Keyword sentiment ·{" "}
                          <Link to={href("/sources")}>methodology</Link>
                        </span>
                      </div>
                    </section>
                    <section className="panel category-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Issues in the feed</h2>
                          <p>Signals by issue category</p>
                        </div>
                        <BarChart3 size={18} />
                      </div>
                      <div className="category-bars">
                        {data?.categories.length ? (
                          data.categories.map((item, i) => (
                            <button
                              key={item.name}
                              className="category-row"
                              onClick={() =>
                                update(
                                  "category",
                                  category === item.name ? "all" : item.name,
                                )
                              }
                            >
                              <div>
                                <span>
                                  <i
                                    style={{
                                      background: [
                                        "#7f6ce8",
                                        "#a99aec",
                                        "#c2b4ef",
                                        "#ebae73",
                                        "#74b7b0",
                                        "#a2afc8",
                                        "#bbb",
                                      ][i % 7],
                                    }}
                                  />
                                  {item.name}
                                </span>
                                <strong>
                                  {number(item.total)}
                                  <small>
                                    {Math.round((item.total / total) * 100)}%
                                  </small>
                                </strong>
                              </div>
                              <div className="bar-track">
                                <i
                                  style={{
                                    width: `${(item.total / Math.max(...data.categories.map((c) => c.total))) * 100}%`,
                                    background: [
                                      "#7f6ce8",
                                      "#a99aec",
                                      "#c2b4ef",
                                      "#ebae73",
                                      "#74b7b0",
                                      "#a2afc8",
                                      "#bbb",
                                    ][i % 7],
                                  }}
                                />
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="empty">
                            <p>Categories appear as reports arrive.</p>
                          </div>
                        )}
                      </div>
                      <div className="category-note">
                        Select a category to focus your view.
                      </div>
                    </section>
                  </div>
                  <div className="bottom-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Where the city is speaking</h2>
                          <p>Local signals, connected.</p>
                        </div>
                        <Link className="panel-link" to={href("/map")}>
                          Explore map
                          <ArrowUpRight size={14} />
                        </Link>
                      </div>
                      <SignalMap
                        data={data?.cities || []}
                        selected={city}
                        onSelect={(c) => update("city", c)}
                      />
                    </section>
                    <section className="panel live-feed" id="live">
                      <div className="panel-heading">
                        <div>
                          <h2>
                            On the pulse{" "}
                            <span className="feed-badge">
                              {mode === "demo" ? "DEMO FEED" : "LIVE FEED"}
                            </span>
                          </h2>
                          <p>
                            {paused && mode === "demo"
                              ? "Your demo generator is paused. Shared records can still update."
                              : "The latest voices as they arrive."}
                          </p>
                        </div>
                        <Link className="panel-link" to={href("/reports")}>
                          View all
                          <ArrowUpRight size={14} />
                        </Link>
                      </div>
                      <EventList
                        events={data?.events.slice(0, 4) || []}
                        empty="Be the first to share a local issue or improvement."
                      />
                    </section>
                  </div>
                  {isAnalytics && (
                    <section className="panel city-table">
                      <div className="panel-heading">
                        <div>
                          <h2>City comparison</h2>
                          <p>
                            Compare signal volume and negative share within your
                            current filters.
                          </p>
                        </div>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>City</th>
                            <th>Signals</th>
                            <th>Negative</th>
                            <th>Negative share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data?.cities.map((c) => (
                            <tr key={c.name}>
                              <td>
                                <button onClick={() => update("city", c.name)}>
                                  {c.name}
                                </button>
                              </td>
                              <td>{number(c.total)}</td>
                              <td>{number(c.negative)}</td>
                              <td>
                                {Math.round((c.negative / c.total) * 100)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  )}
                </>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              <Activity size={14} />
              CityPulse <span>·</span>Every voice adds to the picture.
            </span>
            <span>
              {heartbeat
                ? `Stream checked ${time(heartbeat)}`
                : "Waiting for stream"}
              <span>·</span>
              {mode === "demo" ? "Simulated data" : "Citizen reports + connected sources"}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function NotFound() {
  return (
    <div className="notfound">
      <Activity size={44} />
      <h1>This street leads nowhere.</h1>
      <p>The page you’re looking for doesn’t exist.</p>
      <Link className="primary" to="/dashboard">
        Back to the dashboard
      </Link>
    </div>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        {nav.map((n) => (
          <Route key={n.path} path={n.path} element={<Platform />} />
        ))}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
