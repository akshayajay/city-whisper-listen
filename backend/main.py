import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime, timedelta

# Mapping & Geocoding
from geopy.geocoders import Nominatim
import folium
from folium.plugins import HeatMap

# Twitter agent client (from agent-twitter-client)
from social_media.twitter_client import TwitterClient
# ML modules
from ml.sentiment_analyzer import SentimentAnalyzer
from ml.category_classifier import CategoryClassifier
# Database manager and record model
from db.database import DatabaseManager, SocialMediaPostRecord

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
# Geolocator
geolocator = Nominatim(user_agent="tn-citypulse-geocoder")

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
    asyncio.create_task(process_social_media_stream())
    asyncio.create_task(aggregate_trends_hourly())

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
                lat, lon = None, None
                loc = t.get('location')
                if loc:
                    try:
                        g = geolocator.geocode(f"{loc}, Tamil Nadu")
                        if g:
                            lat, lon = g.latitude, g.longitude
                    except:
                        pass
                record = {
                    'id': t['id'],
                    'platform': 'twitter',
                    'content': t['content'],
                    'timestamp': t['timestamp'],
                    'location': loc,
                    'latitude': lat,
                    'longitude': lon,
                    'sentiment': sentiment,
                    'category': category
                }
                await db_manager.store_post(**record)
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
    category: Optional[str] = None,
    sentiment: Optional[str] = None
):
    filters: Dict[str, Any] = {}
    if category:
        filters['category'] = category
    if sentiment:
        filters['sentiment'] = sentiment
    recs = await db_manager.get_posts(limit=limit, filters=filters)
    return [SocialMediaPost(**r.dict()) for r in recs]

@app.get("/trend-data")
async def get_trend_data(days: int = 7):
    end = datetime.now()
    start = end - timedelta(days=days)
    return await db_manager.get_sentiment_trends(start, end)

@app.get("/heatmap")
async def get_heatmap():
    recs = await db_manager.get_posts(limit=None, filters={})
    coords = [[r.latitude, r.longitude] for r in recs if r.latitude and r.longitude]
    m = folium.Map(location=[11.1271, 78.6569], zoom_start=7)
    HeatMap(coords, radius=15, blur=10, min_opacity=0.2).add_to(m)
    path = "static/tamil_nadu_grievances_heatmap.html"
    m.save(path)
    return {"heatmap_file": path}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
