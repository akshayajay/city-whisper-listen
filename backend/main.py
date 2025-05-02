import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
import json
from datetime import datetime, timedelta

# Mapping & Geocoding
from geopy.geocoders import Nominatim
import folium
from folium.plugins import HeatMap

# Import our custom modules
from social_media.twitter_client import TwitterClient
from social_media.facebook_client import FacebookClient
from ml.sentiment_analyzer import SentimentAnalyzer
from ml.category_classifier import CategoryClassifier
from db.database import DatabaseManager, SocialMediaPostRecord

app = FastAPI(title="TamilNadu CityPulse API")

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
sentiment_analyzer = SentimentAnalyzer()
category_classifier = CategoryClassifier()
db_manager = DatabaseManager()

# Initialize social media clients
twitter_client = TwitterClient()
facebook_client = FacebookClient()

# Connected WebSocket clients
connected_clients: List[WebSocket] = []

# Geolocator for mapping
geolocator = Nominatim(user_agent="tn-citypulse-geocoder")

class SocialMediaPost(BaseModel):
    id: str
    platform: str
    content: str
    timestamp: str
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    sentiment: Optional[str] = None
    category: Optional[str] = None

@app.on_event("startup")
async def startup_event():
    # Start the social media stream processing in the background
    asyncio.create_task(process_social_media_stream())
    # Start the hourly trend aggregation task
    asyncio.create_task(aggregate_trends_hourly())

async def process_social_media_stream():
    """Process social media streams and send updates to clients"""
    while True:
        current_time = datetime.now()
        print(f"[{current_time}] Starting social media data collection...")
        try:
            # Fetch new posts
            twitter_posts = await twitter_client.fetch_recent_posts()
            facebook_posts = await facebook_client.fetch_recent_posts()
            all_posts = twitter_posts + facebook_posts
            processed_posts = []

            for post in all_posts:
                # Sentiment and category
                sentiment = sentiment_analyzer.analyze(post['content'])
                category = category_classifier.classify(post['content'])
                post['sentiment'] = sentiment
                post['category'] = category

                # Geocode if location present
                lat, lon = None, None
                if post.get('location'):
                    try:
                        loc = geolocator.geocode(f"{post['location']}, Tamil Nadu")
                        if loc:
                            lat, lon = loc.latitude, loc.longitude
                    except Exception:
                        pass
                post['latitude'] = lat
                post['longitude'] = lon

                # Store enriched post
                await db_manager.store_post(**post)
                processed_posts.append(post)

            # Broadcast to WebSocket clients
            if processed_posts and connected_clients:
                for client in list(connected_clients):
                    try:
                        await client.send_json(processed_posts)
                    except Exception as e:
                        print(f"Error sending to client: {e}")
                        connected_clients.remove(client)

            print(f"[{current_time}] Processed {len(processed_posts)} posts")
        except Exception as e:
            print(f"Error in social media processing: {e}")

        # Sleep one hour
        await asyncio.sleep(3600)

async def aggregate_trends_hourly():
    """Aggregate trend data hourly and store it"""
    while True:
        current_time = datetime.now()
        start_time = current_time - timedelta(hours=1)
        try:
            print(f"[{current_time}] Aggregating trend data...")
            await db_manager.aggregate_hourly_trends(start_time, current_time)
            print(f"[{current_time}] Aggregation complete")
        except Exception as e:
            print(f"Error in trend aggregation: {e}")

        # Wait until next hour
        next_hour = (current_time.replace(minute=0, second=0, microsecond=0)
                     + timedelta(hours=1))
        wait_seconds = (next_hour - current_time).total_seconds()
        await asyncio.sleep(wait_seconds)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_clients.remove(websocket)

@app.get("/posts", response_model=List[SocialMediaPost])
async def get_posts(
    limit: int = 50,
    platform: Optional[str] = None,
    category: Optional[str] = None,
    sentiment: Optional[str] = None
):
    filters: Dict[str, Any] = {}
    if platform:
        filters["platform"] = platform
    if category:
        filters["category"] = category
    if sentiment:
        filters["sentiment"] = sentiment
    records: List[SocialMediaPostRecord] = await db_manager.get_posts(limit=limit, filters=filters)
    return [SocialMediaPost(**r.dict()) for r in records]

@app.get("/trend-data")
async def get_trend_data(days: int = 7):
    end = datetime.now()
    start = end - timedelta(days=days)
    trend_data = await db_manager.get_sentiment_trends(start, end)
    return trend_data

@app.get("/historical-trends")
async def get_historical_trends(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    interval: str = "daily"
):
    end = datetime.now() if not end_date else datetime.fromisoformat(end_date)
    start = (end - timedelta(days=7)) if not start_date else datetime.fromisoformat(start_date)
    return await db_manager.get_historical_trends(start, end, interval)

@app.get("/category-data")
async def get_category_data():
    return await db_manager.get_category_counts()

@app.get("/platform-data")
async def get_platform_data():
    return await db_manager.get_platform_counts()

@app.get("/heatmap")
async def get_heatmap():
    """Generate and return the latest Tamil Nadu grievance heatmap"""
    # Fetch all geocoded posts
    records: List[SocialMediaPostRecord] = await db_manager.get_posts(limit=None, filters={})
    heat_data = [[r.latitude, r.longitude] for r in records if r.latitude and r.longitude]
    map_tn = folium.Map(location=[11.1271, 78.6569], zoom_start=7)
    HeatMap(heat_data, radius=15, blur=10, min_opacity=0.2).add_to(map_tn)
    file_path = "static/tamil_nadu_grievances_heatmap.html"
    map_tn.save(file_path)
    return {"heatmap_file": file_path}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
