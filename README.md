
# CityPulse - Tamil Nadu Citizen Grievance Platform

CityPulse is a comprehensive platform designed to collect, analyze, and visualize citizen grievances and social media sentiment in Tamil Nadu.

## Features

### Grievance Management
- Submit and track citizen grievances
- Categorize issues by type (roads, water, waste management, etc.)
- Map-based visualization of grievance distribution

### Social Media Analysis
- Real-time data collection from Twitter (X) and Facebook
- Machine learning-based sentiment analysis of social media posts
- Trending topic identification
- Geographic distribution of sentiment
- Live updates of new social media posts

### Analytics Dashboard
- Real-time statistics on grievances and resolutions
- Sentiment trend analysis over time
- Category-based distribution
- Social media integration

## Technical Implementation

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- Shadcn UI components
- Recharts for data visualization
- React Query for data fetching and caching
- WebSocket for real-time updates

### Backend
- Python with FastAPI
- Machine learning with Hugging Face Transformers
- Twitter API and Facebook Graph API integration
- SQLite database (configurable for production)
- WebSocket server for real-time updates

## Getting Started

### Setting Up the Frontend
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Setting Up the Backend
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run the backend server
python -m uvicorn main:app --reload
```

### Environment Variables
Create a `.env` file in the frontend directory with:
```
VITE_API_URL=http://localhost:8000
```

## Status

This is a demonstration project showing how citizen feedback and social media data with machine learning can be leveraged to improve urban governance in Tamil Nadu.
