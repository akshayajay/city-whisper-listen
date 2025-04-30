
# Tamil Nadu CityPulse Backend

This directory contains the backend service for the Tamil Nadu CityPulse application.

## Features

- Real-time social media data collection from Twitter and Facebook
- Sentiment analysis of posts using machine learning
- Categorization of posts into predefined categories
- Storing processed data in a database
- Providing API endpoints for the frontend

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
- `GET /trend-data` - Get sentiment trend data
- `GET /category-data` - Get post counts by category
- `GET /platform-data` - Get post counts by platform
- `WebSocket /ws` - Real-time updates on new posts

## Development

For development without actual social media API keys, the system will use mock data. To use real data, obtain API credentials and update the `.env` file.
