
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
import json
from datetime import datetime, timedelta

# Import our custom modules
from social_media.twitter_client import TwitterClient
from social_media.facebook_client import FacebookClient
from ml.sentiment_analyzer import SentimentAnalyzer
from ml.category_classifier import CategoryClassifier
from db.database import DatabaseManager

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
connected_clients = []

class SocialMediaPost(BaseModel):
    id: str
    platform: str
    content: str
    timestamp: str
    location: Optional[str] = None
    sentiment: Optional[str] = None
    category: Optional[str] = None

@app.on_event("startup")
async def startup_event():
    # Start the social media stream processing in the background
    asyncio.create_task(process_social_media_stream())

async def process_social_media_stream():
    """Process social media streams and send updates to clients"""
    while True:
        # Fetch new posts from Twitter and Facebook
        twitter_posts = await twitter_client.fetch_recent_posts()
        facebook_posts = await facebook_client.fetch_recent_posts()
        
        # Process all posts
        all_posts = twitter_posts + facebook_posts
        processed_posts = []
        
        for post in all_posts:
            # Analyze sentiment
            sentiment = sentiment_analyzer.analyze(post['content'])
            
            # Classify category
            category = category_classifier.classify(post['content'])
            
            # Add results to post
            post['sentiment'] = sentiment
            post['category'] = category
            
            # Store in database
            await db_manager.store_post(post)
            
            processed_posts.append(post)
        
        # Send updates to all connected clients
        if processed_posts and connected_clients:
            for client in connected_clients:
                await client.send_json(processed_posts)
        
        # Wait before next fetch
        await asyncio.sleep(60)  # Check every minute

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            # Keep connection alive
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
    """Get social media posts with optional filters"""
    filters = {}
    if platform:
        filters["platform"] = platform
    if category:
        filters["category"] = category
    if sentiment:
        filters["sentiment"] = sentiment
        
    posts = await db_manager.get_posts(limit=limit, filters=filters)
    return posts

@app.get("/trend-data")
async def get_trend_data(days: int = 7):
    """Get sentiment trend data for the specified number of days"""
    today = datetime.now()
    start_date = today - timedelta(days=days)
    
    trend_data = await db_manager.get_sentiment_trends(start_date, today)
    return trend_data

@app.get("/category-data")
async def get_category_data():
    """Get post counts by category"""
    category_data = await db_manager.get_category_counts()
    return category_data

@app.get("/platform-data")
async def get_platform_data():
    """Get post counts by platform"""
    platform_data = await db_manager.get_platform_counts()
    return platform_data

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
