import os
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime, timedelta

# Twitter agent client (from agent-twitter-client)
from social_media.twitter_client import TwitterClient
# ML modules
from ml.sentiment_analyzer import SentimentAnalyzer
from ml.category_classifier import CategoryClassifier
# Database manager
from db.database import DatabaseManager

app = FastAPI(title="TamilNadu CityPulse API")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
sentiment_analyzer = SentimentAnalyzer()
category_classifier = CategoryClassifier()
db_manager = DatabaseManager()
# Twitter agent
twitter_client = TwitterClient()
# Connected WebSocket clients
connected_clients: List[WebSocket] = []
ingestion_state: Dict[str, Any] = {
    "running": False,
    "mode": "mock",
    "interval_seconds": 8,
    "last_run_at": None,
    "last_post_count": 0,
    "total_processed": 0,
}

LOCATION_COORDS = {
    "Chennai": (13.0827, 80.2707),
    "Coimbatore": (11.0168, 76.9558),
    "Madurai": (9.9252, 78.1198),
    "Trichy": (10.7905, 78.7047),
    "Tiruchirappalli": (10.7905, 78.7047),
    "Salem": (11.6643, 78.1460),
    "Tirunelveli": (8.7139, 77.7567),
    "Thoothukudi": (8.7642, 78.1348),
    "Nagercoil": (8.1833, 77.4119),
    "Tamil Nadu": (11.1271, 78.6569),
}

SEED_POSTS = [
    ("seed-1", "Twitter", "The new metro extension in Chennai is making my commute so much easier!", "Chennai", "positive", "transportation"),
    ("seed-2", "Facebook", "Garbage has not been collected in Adyar for the third day in a row.", "Chennai", "negative", "waste"),
    ("seed-3", "Twitter", "Beautiful new park opened in T. Nagar today. A much-needed green space.", "Chennai", "positive", "parks"),
    ("seed-4", "Facebook", "Traffic at Kathipara junction is terrible today due to construction.", "Chennai", "negative", "transportation"),
    ("seed-5", "Twitter", "Water supply interrupted in Velachery since morning.", "Chennai", "negative", "water"),
    ("seed-6", "Facebook", "Coimbatore smart city work is improving public spaces.", "Coimbatore", "positive", "infrastructure"),
    ("seed-7", "Twitter", "Schools in Madurai closed tomorrow due to heavy rain forecast.", "Madurai", "neutral", "education"),
    ("seed-8", "Facebook", "Trichy Corporation fixed the potholes on East Boulevard Road.", "Trichy", "positive", "infrastructure"),
    ("seed-9", "Twitter", "New bus routes announced for Salem city.", "Salem", "positive", "transportation"),
    ("seed-10", "Facebook", "Streetlights in my neighborhood have not worked for weeks.", "Chennai", "negative", "safety"),
]

class SocialMediaPost(BaseModel):
    id: str
    platform: str = "twitter"
    content: str
    timestamp: str
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    sentiment: Optional[str] = None
    category: Optional[str] = None

class GrievanceSubmission(BaseModel):
    content: str
    category: str
    area: str
    district: str

class DashboardNotification(BaseModel):
    title: str
    detail: str
    level: str = "info"

class MessageQueueItem(BaseModel):
    id: str
    title: str
    detail: str
    category: Optional[str] = None
    location: Optional[str] = None
    priority: str = "normal"
    timestamp: str

class GeoHotspot(BaseModel):
    location: str
    latitude: float
    longitude: float
    total: int
    negative: int
    neutral: int
    positive: int
    urgency_score: int
    dominant_category: str
    top_source: str
    recent_posts: List[SocialMediaPost]

class GeoAnalytics(BaseModel):
    total_signals: int
    mapped_signals: int
    unmapped_signals: int
    negative_signals: int
    hotspots: List[GeoHotspot]
    category_totals: List[Dict[str, Any]]
    sentiment_totals: List[Dict[str, Any]]
    source_totals: List[Dict[str, Any]]
    bounds: Dict[str, float]

@app.on_event("startup")
async def startup_event():
    await seed_demo_data()
    if os.getenv("ENABLE_BACKGROUND_JOBS", "true").lower() == "true":
        asyncio.create_task(process_social_media_stream())
        asyncio.create_task(aggregate_trends_hourly())

@app.get("/")
async def root():
    return {"name": "TamilNadu CityPulse API", "status": "ok"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/ingestion-status")
async def ingestion_status():
    return {
        **ingestion_state,
        "connected_clients": len(connected_clients),
        "twitter_configured": twitter_client.is_configured,
    }

async def seed_demo_data():
    """Ensure fresh demo data exists so a deployed dashboard is useful immediately."""
    existing_posts = await db_manager.get_posts(limit=1, filters={})
    if existing_posts:
        return

    now = datetime.now()
    for index, (post_id, platform, content, location, sentiment, category) in enumerate(SEED_POSTS):
        lat, lon = LOCATION_COORDS.get(location, LOCATION_COORDS["Tamil Nadu"])
        await db_manager.store_post({
            "id": post_id,
            "platform": platform,
            "content": content,
            "timestamp": (now - timedelta(hours=index * 8)).isoformat(),
            "location": location,
            "latitude": lat,
            "longitude": lon,
            "sentiment": sentiment,
            "category": category,
        })

    for days_ago in range(0, 8):
        end = now - timedelta(days=days_ago)
        start = end - timedelta(days=1)
        await db_manager.aggregate_hourly_trends(start, end)

async def process_social_media_stream():
    """Collect, analyze, store, aggregate, and broadcast new civic posts."""
    interval_seconds = int(os.getenv("REALTIME_INGEST_INTERVAL_SECONDS", "8"))
    ingestion_state["interval_seconds"] = interval_seconds
    ingestion_state["mode"] = "twitter" if twitter_client.is_configured else "mock"
    ingestion_state["running"] = True

    while True:
        now = datetime.now()
        print(f"[{now}] Collecting social posts...")
        try:
            tweets = await twitter_client.fetch_recent_posts()
            processed = []
            for t in tweets:
                sentiment = sentiment_analyzer.analyze(t['content'])
                category = category_classifier.classify(t['content'])
                loc = t.get('location')
                lat, lon = LOCATION_COORDS.get(loc, LOCATION_COORDS["Tamil Nadu"])
                record = {
                    'id': t['id'],
                    'platform': t.get('platform', 'Twitter'),
                    'content': t['content'],
                    'timestamp': t['timestamp'],
                    'location': loc,
                    'latitude': lat,
                    'longitude': lon,
                    'sentiment': sentiment,
                    'category': category
                }
                stored = await db_manager.store_post(record)
                if stored:
                    processed.append(record)

            if processed:
                hour_start = now.replace(minute=0, second=0, microsecond=0)
                await db_manager.aggregate_hourly_trends(hour_start, datetime.now())

            ingestion_state["last_run_at"] = datetime.now().isoformat()
            ingestion_state["last_post_count"] = len(processed)
            ingestion_state["total_processed"] += len(processed)

            if processed and connected_clients:
                for ws in list(connected_clients):
                    try:
                        await ws.send_json(processed)
                    except:
                        connected_clients.remove(ws)

            print(f"[{now}] Processed {len(processed)} social posts")
        except Exception as e:
            print(f"Error fetching/processing tweets: {e}")
        await asyncio.sleep(interval_seconds)

async def aggregate_trends_hourly():
    """Aggregate sentiment trends hourly"""
    while True:
        now = datetime.now()
        start = now - timedelta(hours=1)
        try:
            print(f"[{now}] Aggregating hourly trends...")
            await db_manager.aggregate_hourly_trends(start, now)
            print(f"[{now}] Aggregation done")
        except Exception as e:
            print(f"Error in aggregation: {e}")
        # sleep until next hour
        nxt = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        await asyncio.sleep((nxt - now).total_seconds())

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    connected_clients.append(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        connected_clients.remove(ws)

@app.get("/posts", response_model=List[SocialMediaPost])
async def get_posts(
    limit: int = 50,
    platform: Optional[str] = None,
    category: Optional[str] = None,
    sentiment: Optional[str] = None,
    search: Optional[str] = None,
):
    filters: Dict[str, Any] = {}
    if platform:
        filters['platform'] = platform
    if category:
        filters['category'] = category
    if sentiment:
        filters['sentiment'] = sentiment
    recs = await db_manager.get_posts(limit=limit, filters=filters, search=search)
    return [SocialMediaPost(**r) for r in recs]

@app.get("/notifications", response_model=List[DashboardNotification])
async def get_notifications():
    posts = await db_manager.get_posts(limit=None, filters={})
    recent_posts = await db_manager.get_posts(limit=25, filters={})
    negative_count = sum(1 for post in recent_posts if post.get("sentiment") == "negative")
    portal_count = sum(1 for post in recent_posts if post.get("platform") == "Citizen Portal")
    active_sources = sorted({post.get("platform") for post in posts if post.get("platform")})

    return [
        DashboardNotification(
            title="Live pipeline",
            detail=f"{ingestion_state['mode'].title()} ingestion is {'running' if ingestion_state['running'] else 'offline'} with {len(connected_clients)} live client(s).",
            level="success" if ingestion_state["running"] else "warning",
        ),
        DashboardNotification(
            title="Recent intake",
            detail=f"{len(recent_posts)} latest signals include {portal_count} citizen report(s) and {negative_count} negative signal(s).",
            level="warning" if negative_count else "info",
        ),
        DashboardNotification(
            title="Connected sources",
            detail=", ".join(active_sources) if active_sources else "No active source data yet.",
            level="info",
        ),
    ]

@app.get("/message-queue", response_model=List[MessageQueueItem])
async def get_message_queue(limit: int = 5):
    posts = await db_manager.get_posts(limit=None, filters={})
    critical_categories = {"safety", "water", "infrastructure", "waste"}
    priority_posts = [
        post for post in posts
        if post.get("sentiment") == "negative" or post.get("category") in critical_categories
    ]

    items = []
    for post in priority_posts[:limit]:
        category = post.get("category") or "general"
        location = post.get("location") or "Tamil Nadu"
        priority = "high" if post.get("sentiment") == "negative" else "normal"
        items.append(MessageQueueItem(
            id=str(post.get("id")),
            title=f"{category.title()} signal in {location}",
            detail=post.get("content", ""),
            category=category,
            location=location,
            priority=priority,
            timestamp=post.get("timestamp", datetime.now().isoformat()),
        ))

    return items

@app.get("/geo-analytics", response_model=GeoAnalytics)
async def get_geo_analytics(
    category: Optional[str] = None,
    sentiment: Optional[str] = None,
    platform: Optional[str] = None,
    limit: int = 12,
):
    filters: Dict[str, Any] = {}
    if category:
        filters["category"] = category
    if sentiment:
        filters["sentiment"] = sentiment
    if platform:
        filters["platform"] = platform

    posts = await db_manager.get_posts(limit=None, filters=filters)
    mapped_posts = [
        post for post in posts
        if post.get("latitude") is not None and post.get("longitude") is not None
    ]

    grouped: Dict[str, Dict[str, Any]] = {}
    category_totals: Dict[str, int] = {}
    sentiment_totals = {"positive": 0, "neutral": 0, "negative": 0}
    source_totals: Dict[str, int] = {}

    for post in posts:
        category_name = post.get("category") or "uncategorized"
        sentiment_name = post.get("sentiment") or "neutral"
        source_name = post.get("platform") or "Unknown"
        category_totals[category_name] = category_totals.get(category_name, 0) + 1
        if sentiment_name in sentiment_totals:
            sentiment_totals[sentiment_name] += 1
        source_totals[source_name] = source_totals.get(source_name, 0) + 1

    for post in mapped_posts:
        location = post.get("location") or "Tamil Nadu"
        latitude = float(post.get("latitude"))
        longitude = float(post.get("longitude"))
        key = f"{location}|{latitude:.4f}|{longitude:.4f}"
        bucket = grouped.setdefault(key, {
            "location": location,
            "latitude": latitude,
            "longitude": longitude,
            "posts": [],
            "sentiments": {"positive": 0, "neutral": 0, "negative": 0},
            "categories": {},
            "sources": {},
        })
        bucket["posts"].append(post)
        sentiment_name = post.get("sentiment") or "neutral"
        if sentiment_name in bucket["sentiments"]:
            bucket["sentiments"][sentiment_name] += 1
        category_name = post.get("category") or "uncategorized"
        source_name = post.get("platform") or "Unknown"
        bucket["categories"][category_name] = bucket["categories"].get(category_name, 0) + 1
        bucket["sources"][source_name] = bucket["sources"].get(source_name, 0) + 1

    hotspots: List[GeoHotspot] = []
    for bucket in grouped.values():
        posts_for_location = sorted(bucket["posts"], key=lambda item: item.get("timestamp", ""), reverse=True)
        total = len(posts_for_location)
        negative = bucket["sentiments"]["negative"]
        neutral = bucket["sentiments"]["neutral"]
        positive = bucket["sentiments"]["positive"]
        dominant_category = max(bucket["categories"], key=bucket["categories"].get) if bucket["categories"] else "uncategorized"
        top_source = max(bucket["sources"], key=bucket["sources"].get) if bucket["sources"] else "Unknown"
        urgency_score = (negative * 3) + (neutral * 2) + positive + min(total, 10)
        hotspots.append(GeoHotspot(
            location=bucket["location"],
            latitude=bucket["latitude"],
            longitude=bucket["longitude"],
            total=total,
            negative=negative,
            neutral=neutral,
            positive=positive,
            urgency_score=urgency_score,
            dominant_category=dominant_category,
            top_source=top_source,
            recent_posts=[SocialMediaPost(**post) for post in posts_for_location[:3]],
        ))

    hotspots.sort(key=lambda item: (item.urgency_score, item.total), reverse=True)
    selected_hotspots = hotspots[:limit]

    if mapped_posts:
        latitudes = [float(post["latitude"]) for post in mapped_posts]
        longitudes = [float(post["longitude"]) for post in mapped_posts]
        bounds = {
            "min_latitude": min(latitudes),
            "max_latitude": max(latitudes),
            "min_longitude": min(longitudes),
            "max_longitude": max(longitudes),
        }
    else:
        bounds = {
            "min_latitude": 8.0,
            "max_latitude": 13.5,
            "min_longitude": 76.0,
            "max_longitude": 80.5,
        }

    return GeoAnalytics(
        total_signals=len(posts),
        mapped_signals=len(mapped_posts),
        unmapped_signals=len(posts) - len(mapped_posts),
        negative_signals=sentiment_totals["negative"],
        hotspots=selected_hotspots,
        category_totals=[
            {"name": name, "value": value}
            for name, value in sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
        ],
        sentiment_totals=[
            {"name": "positive", "value": sentiment_totals["positive"]},
            {"name": "neutral", "value": sentiment_totals["neutral"]},
            {"name": "negative", "value": sentiment_totals["negative"]},
        ],
        source_totals=[
            {"platform": name, "count": value}
            for name, value in sorted(source_totals.items(), key=lambda item: item[1], reverse=True)
        ],
        bounds=bounds,
    )

@app.post("/grievances", response_model=SocialMediaPost)
async def submit_grievance(grievance: GrievanceSubmission):
    now = datetime.now()
    location = grievance.district.title()
    lat, lon = LOCATION_COORDS.get(location, LOCATION_COORDS["Tamil Nadu"])
    record = {
        "id": f"portal-{int(now.timestamp())}",
        "platform": "Citizen Portal",
        "content": grievance.content,
        "timestamp": now.isoformat(),
        "location": grievance.area or location,
        "latitude": lat,
        "longitude": lon,
        "sentiment": sentiment_analyzer.analyze(grievance.content),
        "category": grievance.category,
    }

    await db_manager.store_post(record)
    hour_start = now.replace(minute=0, second=0, microsecond=0)
    await db_manager.aggregate_hourly_trends(hour_start, datetime.now())

    for ws in list(connected_clients):
        try:
            await ws.send_json([record])
        except:
            connected_clients.remove(ws)

    return SocialMediaPost(**record)

@app.get("/trend-data")
async def get_trend_data(days: int = 7):
    end = datetime.now()
    start = end - timedelta(days=days)
    return await db_manager.get_sentiment_trends(start, end)

@app.get("/historical-trends")
async def get_historical_trends(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    interval: str = "daily",
):
    end = datetime.fromisoformat(end_date.replace("Z", "+00:00")).replace(tzinfo=None) if end_date else datetime.now()
    start = datetime.fromisoformat(start_date.replace("Z", "+00:00")).replace(tzinfo=None) if start_date else end - timedelta(days=7)
    return await db_manager.get_historical_trends(start, end, interval)

@app.get("/category-data")
async def get_category_data():
    return await db_manager.get_category_counts()

@app.get("/platform-data")
async def get_platform_data():
    return await db_manager.get_platform_counts()

@app.get("/sentiment-data")
async def get_sentiment_data():
    posts = await db_manager.get_posts(limit=None, filters={})
    counts = {"positive": 0, "neutral": 0, "negative": 0}
    for post in posts:
        sentiment = post.get("sentiment") or "neutral"
        if sentiment in counts:
            counts[sentiment] += 1

    return [
        {"name": "positive", "value": counts["positive"]},
        {"name": "neutral", "value": counts["neutral"]},
        {"name": "negative", "value": counts["negative"]},
    ]

@app.get("/dashboard-summary")
async def get_dashboard_summary():
    posts = await db_manager.get_posts(limit=None, filters={})
    total = len(posts)
    citizen_reports = sum(1 for post in posts if post.get("platform") == "Citizen Portal")
    social_posts = total - citizen_reports
    negative_signals = sum(1 for post in posts if post.get("sentiment") == "negative")
    recent_ingested = ingestion_state.get("last_post_count", 0)

    return {
        "total_signals": total,
        "citizen_reports": citizen_reports,
        "social_posts": social_posts,
        "negative_signals": negative_signals,
        "recent_ingested": recent_ingested,
    }

@app.get("/heatmap")
async def get_heatmap():
    import folium
    from folium.plugins import HeatMap
    os.makedirs("static", exist_ok=True)

    recs = await db_manager.get_posts(limit=None, filters={})
    coords = [[r["latitude"], r["longitude"]] for r in recs if r.get("latitude") and r.get("longitude")]
    m = folium.Map(location=[11.1271, 78.6569], zoom_start=7)
    if coords:
        HeatMap(coords, radius=15, blur=10, min_opacity=0.2).add_to(m)
    path = "static/tamil_nadu_grievances_heatmap.html"
    m.save(path)
    return {"heatmap_file": path}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
