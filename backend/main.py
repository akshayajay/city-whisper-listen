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
    """Fetch and process tweets every hour"""
    while True:
        now = datetime.now()
        print(f"[{now}] Fetching tweets...")
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
                await db_manager.store_post(record)
                processed.append(record)
            # Broadcast
            if processed and connected_clients:
                for ws in list(connected_clients):
                    try:
                        await ws.send_json(processed)
                    except:
                        connected_clients.remove(ws)
            print(f"[{now}] Processed {len(processed)} tweets")
        except Exception as e:
            print(f"Error fetching/processing tweets: {e}")
        await asyncio.sleep(3600)

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
    sentiment: Optional[str] = None
):
    filters: Dict[str, Any] = {}
    if platform:
        filters['platform'] = platform
    if category:
        filters['category'] = category
    if sentiment:
        filters['sentiment'] = sentiment
    recs = await db_manager.get_posts(limit=limit, filters=filters)
    return [SocialMediaPost(**r) for r in recs]

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
