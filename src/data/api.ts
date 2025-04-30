
import { toast } from "sonner";

// Configure API base URL based on environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
} = {}) {
  try {
    // Build query string
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.platform) params.append('platform', options.platform);
    if (options.category) params.append('category', options.category);
    if (options.sentiment) params.append('sentiment', options.sentiment);
    
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

/**
 * Connect to the WebSocket for real-time updates
 * @param onMessage Callback for handling incoming messages
 * @returns WebSocket connection object with close method
 */
export function connectToWebSocket(onMessage: (data: any) => void) {
  try {
    const ws = new WebSocket(`${API_BASE_URL.replace('http', 'ws')}/ws`);
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
      toast.success('Live updates connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error('Live updates connection error');
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
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
