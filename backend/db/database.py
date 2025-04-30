
import os
from datetime import datetime, timedelta
import asyncio
from typing import Dict, List, Any, Optional
import json
import sqlite3
from pathlib import Path

class DatabaseManager:
    def __init__(self):
        # Use in-memory database for simplicity in prototype
        # In production, use PostgreSQL or similar with asyncpg
        self.db_path = Path("./data.db") 
        self._initialize_db()
    
    def _initialize_db(self):
        """Initialize the database with required tables"""
        # Create data directory if it doesn't exist
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create posts table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            platform TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            location TEXT,
            sentiment TEXT,
            category TEXT
        )
        ''')
        
        conn.commit()
        conn.close()
    
    async def store_post(self, post: Dict[str, Any]) -> bool:
        """Store a processed social media post in the database"""
        try:
            # Run database operation in thread pool
            loop = asyncio.get_event_loop()
            
            def _insert():
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                # Check if post already exists
                cursor.execute("SELECT id FROM posts WHERE id = ?", (post['id'],))
                if cursor.fetchone():
                    conn.close()
                    return False
                
                # Insert post
                cursor.execute(
                    "INSERT INTO posts (id, platform, content, timestamp, location, sentiment, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (
                        post['id'], 
                        post['platform'], 
                        post['content'],
                        post['timestamp'],
                        post.get('location'),
                        post.get('sentiment'),
                        post.get('category')
                    )
                )
                
                conn.commit()
                conn.close()
                return True
            
            return await loop.run_in_executor(None, _insert)
        except Exception as e:
            print(f"Error storing post: {e}")
            return False
    
    async def get_posts(self, limit: int = 50, filters: Dict[str, str] = None) -> List[Dict[str, Any]]:
        """Get posts from the database with optional filters"""
        try:
            loop = asyncio.get_event_loop()
            
            def _query():
                conn = sqlite3.connect(self.db_path)
                conn.row_factory = sqlite3.Row  # Return rows as dictionaries
                cursor = conn.cursor()
                
                query = "SELECT * FROM posts"
                params = []
                
                # Add filters if provided
                if filters:
                    conditions = []
                    for key, value in filters.items():
                        conditions.append(f"{key} = ?")
                        params.append(value)
                    
                    if conditions:
                        query += " WHERE " + " AND ".join(conditions)
                
                # Add limit and order by most recent
                query += " ORDER BY timestamp DESC LIMIT ?"
                params.append(limit)
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
                
                # Convert to list of dictionaries
                posts = [dict(row) for row in rows]
                
                conn.close()
                return posts
            
            return await loop.run_in_executor(None, _query)
        except Exception as e:
            print(f"Error getting posts: {e}")
            return []
    
    async def get_sentiment_trends(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get sentiment trends for the date range"""
        try:
            loop = asyncio.get_event_loop()
            
            def _query():
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                # Generate list of days in range
                days = []
                current_date = start_date
                while current_date <= end_date:
                    days.append(current_date.strftime('%Y-%m-%d'))
                    current_date += timedelta(days=1)
                
                # Build result
                result = []
                for day_str in days:
                    # Format for date comparison
                    day_start = f"{day_str}T00:00:00"
                    day_end = f"{day_str}T23:59:59"
                    
                    # Query posts for this day
                    cursor.execute(
                        """
                        SELECT sentiment, COUNT(*) as count 
                        FROM posts 
                        WHERE timestamp >= ? AND timestamp <= ? 
                        GROUP BY sentiment
                        """, 
                        (day_start, day_end)
                    )
                    rows = cursor.fetchall()
                    
                    # Initialize counts
                    positive = 0
                    neutral = 0
                    negative = 0
                    
                    # Add counts
                    for sentiment, count in rows:
                        if sentiment == 'positive':
                            positive = count
                        elif sentiment == 'neutral':
                            neutral = count
                        elif sentiment == 'negative':
                            negative = count
                    
                    # Add to result
                    result.append({
                        'name': day_str,
                        'positive': positive,
                        'neutral': neutral,
                        'negative': negative
                    })
                
                conn.close()
                return result
            
            return await loop.run_in_executor(None, _query)
        except Exception as e:
            print(f"Error getting sentiment trends: {e}")
            return []
    
    async def get_category_counts(self) -> List[Dict[str, Any]]:
        """Get post counts by category"""
        try:
            loop = asyncio.get_event_loop()
            
            def _query():
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute(
                    """
                    SELECT category, COUNT(*) as count 
                    FROM posts 
                    GROUP BY category
                    """
                )
                rows = cursor.fetchall()
                
                # Convert to format needed for charts
                result = [{'name': category, 'value': count} for category, count in rows]
                
                conn.close()
                return result
            
            return await loop.run_in_executor(None, _query)
        except Exception as e:
            print(f"Error getting category counts: {e}")
            return []
    
    async def get_platform_counts(self) -> List[Dict[str, Any]]:
        """Get post counts by platform"""
        try:
            loop = asyncio.get_event_loop()
            
            def _query():
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                cursor.execute(
                    """
                    SELECT platform, COUNT(*) as count 
                    FROM posts 
                    GROUP BY platform
                    """
                )
                rows = cursor.fetchall()
                
                # Convert to format needed for display
                result = [{'platform': platform, 'count': count} for platform, count in rows]
                
                conn.close()
                return result
            
            return await loop.run_in_executor(None, _query)
        except Exception as e:
            print(f"Error getting platform counts: {e}")
            return []
