
# Tamil Nadu CityPulse Backend

This directory contains the backend service for the Tamil Nadu CityPulse application.

## Features

- Hourly social media data collection from Twitter and Facebook
- Sentiment analysis of posts using machine learning
- Categorization of posts into predefined categories
- Trend storage and aggregation for historical data analysis
- Storing processed data in a database
- Providing API endpoints for the frontend with historical trend analysis

## Setup

1. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Set up environment variables:
   Create a `.env` file with the following variables:

   ```
   # Twitter API Credentials
   TWITTER_API_KEY=your_api_key
   TWITTER_API_SECRET=your_api_secret
   TWITTER_ACCESS_TOKEN=your_access_token
   TWITTER_ACCESS_TOKEN_SECRET=your_token_secret
   TWITTER_BEARER_TOKEN=your_bearer_token

   # Facebook API Credentials
   FACEBOOK_APP_ID=your_app_id
   FACEBOOK_APP_SECRET=your_app_secret
   FACEBOOK_ACCESS_TOKEN=your_page_access_token
   FACEBOOK_PAGE_IDS=page1,page2,page3

   # ML Settings
   USE_MOCK_ML=true  # Set to false in production with GPU
   ```

3. Run the server:
   ```
   python -m uvicorn main:app --reload
   ```

## API Endpoints

- `GET /posts` - Get social media posts with optional filters
- `GET /trend-data` - Get sentiment trend data for specified number of days
- `GET /historical-trends` - Get historical trend data with customizable intervals
- `GET /category-data` - Get post counts by category
- `GET /platform-data` - Get post counts by platform
- `WebSocket /ws` - Real-time updates on new posts

### Trend Data API

The trend data API supports the following parameters:

- `GET /historical-trends?interval=daily&start_date=2023-04-01&end_date=2023-04-30`

Available intervals:
- hourly - Data aggregated by hour
- daily - Data aggregated by day
- weekly - Data aggregated by week
- monthly - Data aggregated by month

## Data Collection

The system collects social media data hourly and processes it through the following pipeline:

1. Data collection from Twitter and Facebook APIs
2. Text preprocessing and cleaning
3. Sentiment analysis using machine learning
4. Category classification
5. Storage in SQLite database
6. Trend aggregation and historical data storage

## Development

For development without actual social media API keys, the system will use mock data. To use real data, obtain API credentials and update the `.env` file.

## Trend Storage

The system stores trend data in dedicated database tables:
- `trend_data`: Aggregated sentiment counts by time interval
- `category_trends`: Aggregated category counts by time interval
