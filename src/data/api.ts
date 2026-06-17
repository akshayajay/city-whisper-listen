
import { toast } from "sonner";

// Configure API base URL based on environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface SocialMediaPost {
  id: string;
  platform: string;
  content: string;
  timestamp: string | number;
  location?: string;
  latitude?: number;
  longitude?: number;
  sentiment?: string;
  category?: string;
}

export interface IngestionStatus {
  running: boolean;
  mode: string;
  interval_seconds: number;
  last_run_at: string | null;
  last_post_count: number;
  total_processed: number;
  connected_clients: number;
  twitter_configured: boolean;
}

export interface GrievanceSubmission {
  content: string;
  category: string;
  area: string;
  district: string;
}

export interface DashboardSummary {
  total_signals: number;
  citizen_reports: number;
  social_posts: number;
  negative_signals: number;
  recent_ingested: number;
}

export interface DashboardNotification {
  title: string;
  detail: string;
  level: 'info' | 'success' | 'warning';
}

export interface MessageQueueItem {
  id: string;
  title: string;
  detail: string;
  category?: string;
  location?: string;
  priority: 'normal' | 'high';
  timestamp: string;
}

export interface GeoHotspot {
  location: string;
  latitude: number;
  longitude: number;
  total: number;
  negative: number;
  neutral: number;
  positive: number;
  urgency_score: number;
  dominant_category: string;
  top_source: string;
  recent_posts: SocialMediaPost[];
}

export interface GeoAnalytics {
  total_signals: number;
  mapped_signals: number;
  unmapped_signals: number;
  negative_signals: number;
  hotspots: GeoHotspot[];
  category_totals: Array<{ name: string; value: number }>;
  sentiment_totals: Array<{ name: string; value: number }>;
  source_totals: Array<{ platform: string; count: number }>;
  bounds: {
    min_latitude: number;
    max_latitude: number;
    min_longitude: number;
    max_longitude: number;
  };
}

/**
 * Fetch social media posts from the backend API
 * @param options Options for filtering posts
 * @returns Array of social media posts
 */
export async function fetchSocialMediaPosts(options: {
  limit?: number;
  platform?: string; 
  category?: string;
  sentiment?: string;
  search?: string;
} = {}) {
  try {
    // Build query string
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.platform) params.append('platform', options.platform);
    if (options.category) params.append('category', options.category);
    if (options.sentiment) params.append('sentiment', options.sentiment);
    if (options.search) params.append('search', options.search);
    
    const response = await fetch(`${API_BASE_URL}/posts?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching social media posts:', error);
    // If API fails, use mock data from existing file
    const { mockSocialMediaPosts } = await import('./socialMediaData');
    return mockSocialMediaPosts;
  }
}

/**
 * Fetch sentiment trend data from the backend API
 * @param days Number of days to fetch (default: 7)
 * @returns Array of sentiment trend data points
 */
export async function fetchSentimentTrendData(days: number = 7) {
  try {
    const response = await fetch(`${API_BASE_URL}/trend-data?days=${days}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching sentiment trend data:', error);
    // If API fails, use mock data function from existing file
    const { getSentimentTrendData } = await import('./socialMediaData');
    return getSentimentTrendData();
  }
}

/**
 * Fetch historical trend data with specified interval
 * @param options Configuration options for historical trends
 * @returns Array of trend data points
 */
export async function fetchHistoricalTrends(options: {
  startDate?: string;
  endDate?: string;
  interval?: 'hourly' | 'daily' | 'weekly' | 'monthly';
} = {}) {
  try {
    // Build query string
    const params = new URLSearchParams();
    if (options.startDate) params.append('start_date', options.startDate);
    if (options.endDate) params.append('end_date', options.endDate);
    if (options.interval) params.append('interval', options.interval);
    
    const response = await fetch(`${API_BASE_URL}/historical-trends?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching historical trends:', error);
    // If API fails, use mock data function
    const { getSentimentTrendData } = await import('./socialMediaData');
    return getSentimentTrendData();
  }
}

/**
 * Fetch category data from the backend API
 * @returns Array of category data points
 */
export async function fetchCategoryData() {
  try {
    const response = await fetch(`${API_BASE_URL}/category-data`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching category data:', error);
    // If API fails, use mock data function from existing file
    const { getSocialMediaCategories } = await import('./socialMediaData');
    return getSocialMediaCategories();
  }
}

/**
 * Fetch platform data from the backend API
 * @returns Object with counts by platform
 */
export async function fetchPlatformData() {
  try {
    const response = await fetch(`${API_BASE_URL}/platform-data`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching platform data:', error);
    // Return null and let component handle fallback
    return null;
  }
}

export async function fetchSentimentData() {
  try {
    const response = await fetch(`${API_BASE_URL}/sentiment-data`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching sentiment data:', error);
    return [
      { name: 'positive', value: 0 },
      { name: 'neutral', value: 0 },
      { name: 'negative', value: 0 },
    ];
  }
}

export async function fetchDashboardSummary(): Promise<DashboardSummary | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard-summary`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return null;
  }
}

export async function fetchIngestionStatus(): Promise<IngestionStatus | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/ingestion-status`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching ingestion status:', error);
    return null;
  }
}

export async function fetchNotifications(): Promise<DashboardNotification[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [
      {
        title: 'Backend unavailable',
        detail: 'Start the FastAPI service to load live notifications.',
        level: 'warning',
      },
    ];
  }
}

export async function fetchMessageQueue(limit: number = 5): Promise<MessageQueueItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/message-queue?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching message queue:', error);
    return [];
  }
}

export async function fetchGeoAnalytics(options: {
  category?: string;
  sentiment?: string;
  platform?: string;
  limit?: number;
} = {}): Promise<GeoAnalytics | null> {
  try {
    const params = new URLSearchParams();
    if (options.category && options.category !== 'all') params.append('category', options.category);
    if (options.sentiment && options.sentiment !== 'all') params.append('sentiment', options.sentiment);
    if (options.platform && options.platform !== 'all') params.append('platform', options.platform);
    if (options.limit) params.append('limit', options.limit.toString());

    const response = await fetch(`${API_BASE_URL}/geo-analytics?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching geo analytics:', error);
    return null;
  }
}

export async function submitGrievance(grievance: GrievanceSubmission): Promise<SocialMediaPost> {
  const response = await fetch(`${API_BASE_URL}/grievances`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(grievance),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Connect to the WebSocket for real-time updates
 * @param onMessage Callback for handling incoming messages
 * @returns WebSocket connection object with close method
 */
export function connectToWebSocket(
  onMessage: (data: SocialMediaPost[]) => void,
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void
) {
  try {
    const ws = new WebSocket(`${API_BASE_URL.replace('http', 'ws')}/ws`);
    onStatusChange?.('connecting');
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
      onStatusChange?.('connected');
      toast.success('Live updates connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(Array.isArray(data) ? data : [data]);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onStatusChange?.('error');
      toast.error('Live updates connection error');
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      onStatusChange?.('disconnected');
    };
    
    return {
      close: () => ws.close()
    };
  } catch (error) {
    console.error('Error connecting to WebSocket:', error);
    toast.error('Could not connect to live updates');
    return {
      close: () => {}
    };
  }
}
