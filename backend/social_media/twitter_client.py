
import os
import tweepy
import asyncio
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

class TwitterClient:
    def __init__(self):
        # Load Twitter API credentials
        self.api_key = os.getenv("TWITTER_API_KEY", "")
        self.api_secret = os.getenv("TWITTER_API_SECRET", "")
        self.access_token = os.getenv("TWITTER_ACCESS_TOKEN", "")
        self.access_token_secret = os.getenv("TWITTER_ACCESS_TOKEN_SECRET", "")
        self.bearer_token = os.getenv("TWITTER_BEARER_TOKEN", "")
        
        # Check if credentials are available
        self.is_configured = all([self.api_key, self.api_secret, self.bearer_token])
        
        if self.is_configured:
            # Initialize Twitter client
            self.client = tweepy.Client(
                bearer_token=self.bearer_token,
                consumer_key=self.api_key, 
                consumer_secret=self.api_secret,
                access_token=self.access_token, 
                access_token_secret=self.access_token_secret
            )
            
            # Define search query for Tamil Nadu
            self.tamilnadu_locations = [
                "Chennai", "Coimbatore", "Madurai", "Trichy", "Salem", 
                "Tirunelveli", "Thoothukudi", "Nagercoil", "Tamil Nadu"
            ]
            self.query_string = " OR ".join([f"\"{loc}\"" for loc in self.tamilnadu_locations])
            
            # For development/testing, use a smaller set of predefined data
            self.use_mock_data = not self.is_configured
            self.last_id = None
        else:
            self.use_mock_data = True
            print("Twitter API credentials not found. Using mock data.")

    async def fetch_recent_posts(self) -> List[Dict[str, Any]]:
        """Fetch recent tweets related to Tamil Nadu cities"""
        if self.use_mock_data:
            # Return mock data for development
            return self._get_mock_posts()
        
        try:
            # Convert to async operation
            loop = asyncio.get_event_loop()
            
            # Search for recent tweets
            response = await loop.run_in_executor(
                None, 
                lambda: self.client.search_recent_tweets(
                    query=self.query_string,
                    max_results=10,
                    since_id=self.last_id,
                    tweet_fields=['created_at', 'text', 'geo']
                )
            )
            
            if not response.data:
                return []
                
            # Update the last ID for next query
            self.last_id = response.data[0].id
            
            # Process and convert tweets to our format
            processed_posts = []
            for tweet in response.data:
                # Extract location from tweet if available
                location = "Tamil Nadu"  # Default
                if tweet.geo and tweet.geo.get('place_id'):
                    # In a real implementation, you'd resolve place_id to actual location
                    location = "Tamil Nadu"  # For simplicity
                
                post = {
                    'id': str(tweet.id),
                    'platform': 'Twitter',
                    'content': tweet.text,
                    'timestamp': tweet.created_at.isoformat(),
                    'location': location
                }
                processed_posts.append(post)
                
            return processed_posts
        except Exception as e:
            print(f"Error fetching tweets: {e}")
            return []
    
    def _get_mock_posts(self) -> List[Dict[str, Any]]:
        """Generate mock Twitter posts for development"""
        import random
        from datetime import datetime, timedelta
        
        locations = ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem"]
        topics = [
            "The roads in {loc} need immediate repair. Too many potholes!",
            "Loving the new park in {loc}. Great job by the municipality!",
            "Power outage in {loc} again. Third time this week!",
            "Water supply issue in {loc} has been fixed. Thanks to the corporation!",
            "Heavy traffic near {loc} central due to ongoing construction."
        ]
        
        # Create 1-3 random posts
        num_posts = random.randint(1, 3)
        posts = []
        
        for i in range(num_posts):
            loc = random.choice(locations)
            content = random.choice(topics).format(loc=loc)
            # Random timestamp within the last hour
            timestamp = (datetime.now() - timedelta(minutes=random.randint(5, 60))).isoformat()
            
            post = {
                'id': f"mock-tw-{int(datetime.now().timestamp())}-{i}",
                'platform': 'Twitter',
                'content': content,
                'timestamp': timestamp,
                'location': loc
            }
            posts.append(post)
            
        return posts
