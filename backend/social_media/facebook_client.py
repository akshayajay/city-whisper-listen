
import os
import asyncio
import facebook
from typing import List, Dict, Any
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

class FacebookClient:
    def __init__(self):
        # Load Facebook API credentials
        self.app_id = os.getenv("FACEBOOK_APP_ID", "")
        self.app_secret = os.getenv("FACEBOOK_APP_SECRET", "")
        self.access_token = os.getenv("FACEBOOK_ACCESS_TOKEN", "")
        
        # Check if credentials are available
        self.is_configured = all([self.app_id, self.app_secret, self.access_token])
        
        if self.is_configured:
            # Initialize Facebook Graph API client
            self.graph = facebook.GraphAPI(access_token=self.access_token, version="v16.0")
            
            # List of pages/groups to monitor (would need page IDs in production)
            self.page_ids = os.getenv("FACEBOOK_PAGE_IDS", "").split(",")
            
            # For development/testing, use predefined data
            self.use_mock_data = not self.is_configured
        else:
            self.use_mock_data = True
            print("Facebook API credentials not found. Using mock data.")

    async def fetch_recent_posts(self) -> List[Dict[str, Any]]:
        """Fetch recent Facebook posts from relevant pages"""
        if self.use_mock_data:
            # Return mock data for development
            return self._get_mock_posts()
        
        try:
            # Convert to async operation
            loop = asyncio.get_event_loop()
            
            all_posts = []
            for page_id in self.page_ids:
                # Get posts from this page
                response = await loop.run_in_executor(
                    None, 
                    lambda: self.graph.get_object(
                        id=page_id,
                        fields='posts.limit(5){message,created_time,place}'
                    )
                )
                
                if 'posts' in response and 'data' in response['posts']:
                    # Process and convert posts to our format
                    for post in response['posts']['data']:
                        if 'message' not in post:
                            continue
                            
                        # Extract location if available
                        location = "Tamil Nadu"  # Default
                        if 'place' in post and 'name' in post['place']:
                            location = post['place']['name']
                            
                        processed_post = {
                            'id': post['id'],
                            'platform': 'Facebook',
                            'content': post['message'],
                            'timestamp': post['created_time'],
                            'location': location
                        }
                        all_posts.append(processed_post)
            
            return all_posts
        except Exception as e:
            print(f"Error fetching Facebook posts: {e}")
            return []
    
    def _get_mock_posts(self) -> List[Dict[str, Any]]:
        """Generate mock Facebook posts for development"""
        import random
        from datetime import datetime, timedelta
        
        locations = ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem"]
        topics = [
            "Public announcement: Water supply will be interrupted in {loc} tomorrow for maintenance.",
            "New garbage collection schedule for {loc} residents. Please check the municipal website.",
            "Community cleanup event this weekend at {loc} beach. All volunteers welcome!",
            "Traffic diversion in place near {loc} due to road widening project.",
            "The new public park in {loc} is now open. Great facilities for children!"
        ]
        
        # Create 1-2 random posts
        num_posts = random.randint(1, 2)
        posts = []
        
        for i in range(num_posts):
            loc = random.choice(locations)
            content = random.choice(topics).format(loc=loc)
            # Random timestamp within the last hour
            timestamp = (datetime.now() - timedelta(minutes=random.randint(5, 60))).isoformat()
            
            post = {
                'id': f"mock-fb-{int(datetime.now().timestamp())}-{i}",
                'platform': 'Facebook',
                'content': content,
                'timestamp': timestamp,
                'location': loc
            }
            posts.append(post)
            
        return posts
