
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
        
        # Create trend_data table for storing aggregated trends
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS trend_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            interval_type TEXT NOT NULL,  -- 'hourly', 'daily', 'weekly', 'monthly'
            positive_count INTEGER DEFAULT 0,
            neutral_count INTEGER DEFAULT 0,
            negative_count INTEGER DEFAULT 0,
            UNIQUE(timestamp, interval_type)
        )
        ''')
        
        # Create category_trends table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS category_trends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            interval_type TEXT NOT NULL,
            category TEXT NOT NULL,
            count INTEGER DEFAULT 0,
            UNIQUE(timestamp, interval_type, category)
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
    
    async def aggregate_hourly_trends(self, start_time: datetime, end_time: datetime):
        """Aggregate and store hourly trend data"""
        try:
            loop = asyncio.get_event_loop()
            
            def _aggregate():
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                # Format timestamps for SQLite query
                start_str = start_time.isoformat()
                end_str = end_time.isoformat()
                timestamp = end_time.replace(minute=0, second=0, microsecond=0).isoformat()
                
                # Aggregate sentiment counts
                cursor.execute(
                    """
                    SELECT sentiment, COUNT(*) as count 
                    FROM posts 
                    WHERE timestamp >= ? AND timestamp < ?
                    GROUP BY sentiment
                    """, 
                    (start_str, end_str)
                )
                
                sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}
                for sentiment, count in cursor.fetchall():
                    if sentiment in sentiment_counts:
                        sentiment_counts[sentiment] = count
                
                # Insert or update hourly trend data
                cursor.execute(
                    """
                    INSERT INTO trend_data (timestamp, interval_type, positive_count, neutral_count, negative_count)
                    VALUES (?, 'hourly', ?, ?, ?)
                    ON CONFLICT(timestamp, interval_type) 
                    DO UPDATE SET positive_count=?, neutral_count=?, negative_count=?
                    """,
                    (
                        timestamp,
                        sentiment_counts["positive"], sentiment_counts["neutral"], sentiment_counts["negative"],
                        sentiment_counts["positive"], sentiment_counts["neutral"], sentiment_counts["negative"]
                    )
                )
                
                # Aggregate category counts
                cursor.execute(
                    """
                    SELECT category, COUNT(*) as count 
                    FROM posts 
                    WHERE timestamp >= ? AND timestamp < ? AND category IS NOT NULL
                    GROUP BY category
                    """, 
                    (start_str, end_str)
                )
                
                # Delete existing category trends for this timestamp/interval
                cursor.execute(
                    "DELETE FROM category_trends WHERE timestamp = ? AND interval_type = 'hourly'",
                    (timestamp,)
                )
                
                # Insert new category trends
                for category, count in cursor.fetchall():
                    if category:  # Skip None/NULL categories
                        cursor.execute(
                            """
                            INSERT INTO category_trends (timestamp, interval_type, category, count)
                            VALUES (?, 'hourly', ?, ?)
                            """,
                            (timestamp, category, count)
                        )
                
                conn.commit()
                conn.close()
                return True
            
            return await loop.run_in_executor(None, _aggregate)
        except Exception as e:
            print(f"Error aggregating trends: {e}")
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
                
                # First check if we have stored trend data
                cursor.execute(
                    """
                    SELECT COUNT(*) 
                    FROM trend_data 
                    WHERE timestamp >= ? AND timestamp <= ?
                    """, 
                    (start_date.isoformat(), end_date.isoformat())
                )
                
                has_trend_data = cursor.fetchone()[0] > 0
                
                # If we have stored trend data, use it
                if has_trend_data:
                    # Use daily interval for better visualization
                    cursor.execute(
                        """
                        SELECT date(timestamp) as day, 
                               SUM(positive_count) as positive, 
                               SUM(neutral_count) as neutral, 
                               SUM(negative_count) as negative
                        FROM trend_data
                        WHERE timestamp >= ? AND timestamp <= ?
                        GROUP BY day
                        ORDER BY day
                        """, 
                        (start_date.isoformat(), end_date.isoformat())
                    )
                    
                    rows = cursor.fetchall()
                    result = [
                        {
                            'name': day,
                            'positive': positive,
                            'neutral': neutral,
                            'negative': negative
                        }
                        for day, positive, neutral, negative in rows
                    ]
                    
                    conn.close()
                    return result
                
                # Fallback to old method if no trend data
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
    
    async def get_historical_trends(self, start_date: datetime, end_date: datetime, interval: str = "daily") -> List[Dict[str, Any]]:
        """Get historical sentiment trend data with specified interval
        
        Args:
            start_date: Start date
            end_date: End date
            interval: 'hourly', 'daily', 'weekly', 'monthly'
            
        Returns:
            List of trend data points
        """
        try:
            loop = asyncio.get_event_loop()
            
            def _query():
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                time_format = "%Y-%m-%d"
                group_by = "date(timestamp)"
                
                if interval == "hourly":
                    time_format = "%Y-%m-%d %H:00:00"
                    group_by = "strftime('%Y-%m-%d %H:00:00', timestamp)"
                elif interval == "weekly":
                    time_format = "%Y-%W"  # ISO week number
                    group_by = "strftime('%Y-%W', timestamp)"
                elif interval == "monthly":
                    time_format = "%Y-%m"
                    group_by = "strftime('%Y-%m', timestamp)"
                
                query = f"""
                SELECT {group_by} as period, 
                       SUM(positive_count) as positive, 
                       SUM(neutral_count) as neutral, 
                       SUM(negative_count) as negative
                FROM trend_data
                WHERE timestamp >= ? AND timestamp <= ?
                GROUP BY period
                ORDER BY period
                """
                
                cursor.execute(query, (start_date.isoformat(), end_date.isoformat()))
                
                rows = cursor.fetchall()
                result = [
                    {
                        'name': period,
                        'positive': positive,
                        'neutral': neutral,
                        'negative': negative
                    }
                    for period, positive, neutral, negative in rows
                ]
                
                # If we have no stored trend data, try to calculate from raw posts
                if not result:
                    print("No stored trend data found, calculating from raw posts...")
                    
                    # Fall back to calculating from posts table
                    query = f"""
                    SELECT strftime('{time_format}', timestamp) as period, 
                           sentiment, 
                           COUNT(*) as count
                    FROM posts
                    WHERE timestamp >= ? AND timestamp <= ?
                    GROUP BY period, sentiment
                    ORDER BY period
                    """
                    
                    cursor.execute(query, (start_date.isoformat(), end_date.isoformat()))
                    rows = cursor.fetchall()
                    
                    # Group by period
                    period_data = {}
                    for period, sentiment, count in rows:
                        if period not in period_data:
                            period_data[period] = {'positive': 0, 'neutral': 0, 'negative': 0}
                        
                        if sentiment in ('positive', 'neutral', 'negative'):
                            period_data[period][sentiment] = count
                    
                    # Convert to result format
                    result = [
                        {
                            'name': period,
                            'positive': data['positive'],
                            'neutral': data['neutral'],
                            'negative': data['negative']
                        }
                        for period, data in sorted(period_data.items())
                    ]
                
                conn.close()
                return result
            
            return await loop.run_in_executor(None, _query)
        except Exception as e:
            print(f"Error getting historical trends: {e}")
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
