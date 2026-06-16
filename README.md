
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

The backend also supports a `.env` file:
```
USE_MOCK_ML=true
ENABLE_BACKGROUND_JOBS=true
REALTIME_INGEST_INTERVAL_SECONDS=8
```

`USE_MOCK_ML=true` is the recommended default for deployment. It keeps the API fast and lightweight while still serving functional demo data. To use the transformer model in production, install `transformers` and `torch`, set `USE_MOCK_ML=false`, and provision a host with enough memory for the model.

With background jobs enabled, the backend collects new civic signals every `REALTIME_INGEST_INTERVAL_SECONDS`, classifies them, stores them in SQLite, updates trend aggregates, and broadcasts them to connected dashboard clients over WebSocket. Without Twitter/X credentials, it runs a realistic Tamil Nadu demo stream across Twitter, Facebook, and the citizen portal.

## Deployment

### Render full-stack deployment
This repository includes `render.yaml` for a two-service Render deploy:

- `citypulse-api`: FastAPI backend from `backend/`
- `citypulse-dashboard`: static Vite dashboard from `dist/`

Steps:

1. Push the repository to GitHub.
2. In Render, create a new Blueprint from the repository.
3. After the API service is created, confirm the frontend `VITE_API_URL` environment variable matches the API service URL.
4. Trigger a redeploy of the dashboard if you changed `VITE_API_URL`.

### Static-only dashboard
The dashboard can also be deployed to Vercel or Netlify. It remains usable without a backend because the frontend falls back to bundled demo data when API requests fail.

For a connected deployment, set:
```
VITE_API_URL=https://your-api-host.example.com
```

Vercel uses `vercel.json` for client-side routing. Netlify uses `netlify.toml` for the build command and SPA redirect.

## Status

This is a demonstration project showing how citizen feedback and social media data with machine learning can be leveraged to improve urban governance in Tamil Nadu.
