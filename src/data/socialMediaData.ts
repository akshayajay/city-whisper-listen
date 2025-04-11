
import { categoryColors } from './mockData';

// Mock social media data with Tamil Nadu specific content
export const mockSocialMediaPosts = [
  {
    id: 1,
    platform: 'Twitter',
    content: 'The new metro extension in Chennai is making my commute so much easier! #ChennaiMetro',
    timestamp: new Date(2025, 3, 10).getTime(),
    location: 'Chennai',
    sentiment: 'positive',
    category: 'transportation'
  },
  {
    id: 2,
    platform: 'Facebook',
    content: 'Garbage not collected in Adyar for the third day in a row. @ChennaiCorp please look into this matter urgently.',
    timestamp: new Date(2025, 3, 9).getTime(),
    location: 'Chennai',
    sentiment: 'negative',
    category: 'waste'
  },
  {
    id: 3,
    platform: 'Twitter',
    content: 'Beautiful new park opened in T. Nagar today! A much-needed green space in the city. #ChennaiCity',
    timestamp: new Date(2025, 3, 8).getTime(),
    location: 'Chennai',
    sentiment: 'positive',
    category: 'parks'
  },
  {
    id: 4,
    platform: 'Facebook',
    content: 'Traffic at Kathipara junction is terrible today due to ongoing construction. Plan accordingly.',
    timestamp: new Date(2025, 3, 7).getTime(),
    location: 'Chennai',
    sentiment: 'negative',
    category: 'traffic'
  },
  {
    id: 5,
    platform: 'Twitter',
    content: 'Water supply interrupted in Velachery since morning. No information about when it will be restored.',
    timestamp: new Date(2025, 3, 6).getTime(),
    location: 'Chennai',
    sentiment: 'negative',
    category: 'water'
  },
  {
    id: 6,
    platform: 'Facebook',
    content: 'The Coimbatore Smart City initiatives are really improving the quality of life here. Great work!',
    timestamp: new Date(2025, 3, 5).getTime(),
    location: 'Coimbatore',
    sentiment: 'positive',
    category: 'infrastructure'
  },
  {
    id: 7,
    platform: 'Twitter',
    content: 'Schools in Madurai closed tomorrow due to heavy rain forecast. Stay safe everyone!',
    timestamp: new Date(2025, 3, 4).getTime(),
    location: 'Madurai',
    sentiment: 'neutral',
    category: 'education'
  },
  {
    id: 8,
    platform: 'Facebook',
    content: 'Trichy Corporation has fixed all the potholes on East Boulevard Road. Finally a smooth ride!',
    timestamp: new Date(2025, 3, 3).getTime(),
    location: 'Trichy',
    sentiment: 'positive',
    category: 'roads'
  },
  {
    id: 9,
    platform: 'Twitter',
    content: 'New bus routes announced for Salem city. Will help connect more rural areas to the city center.',
    timestamp: new Date(2025, 3, 2).getTime(),
    location: 'Salem',
    sentiment: 'positive',
    category: 'transportation'
  },
  {
    id: 10,
    platform: 'Facebook',
    content: 'The streetlights in my neighborhood haven't been working for weeks now. Feeling unsafe at night.',
    timestamp: new Date(2025, 3, 1).getTime(),
    location: 'Chennai',
    sentiment: 'negative',
    category: 'safety'
  },
  {
    id: 11,
    platform: 'Twitter',
    content: 'Hospital wait times are outrageous in Chennai GH. Waited 4 hours and still haven't seen a doctor.',
    timestamp: new Date(2025, 2, 30).getTime(),
    location: 'Chennai',
    sentiment: 'negative',
    category: 'healthcare'
  },
  {
    id: 12,
    platform: 'Facebook',
    content: 'The new public library in Coimbatore is amazing! So many resources and a beautiful space.',
    timestamp: new Date(2025, 2, 29).getTime(),
    location: 'Coimbatore',
    sentiment: 'positive',
    category: 'education'
  },
  {
    id: 13,
    platform: 'Twitter',
    content: 'Just voted at my local polling station in Madurai. The process was organized and quick!',
    timestamp: new Date(2025, 2, 28).getTime(),
    location: 'Madurai',
    sentiment: 'positive',
    category: 'government'
  },
  {
    id: 14,
    platform: 'Facebook',
    content: 'Trichy airport needs more flight connections to major cities. Current options are limited.',
    timestamp: new Date(2025, 2, 27).getTime(),
    location: 'Trichy',
    sentiment: 'negative',
    category: 'transportation'
  }
];

// Utility functions to get data for charts

// Get sentiment data by day for trend analysis
export const getSentimentTrendData = () => {
  const today = new Date();
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(today.getDate() - 7);
  
  // Create array of last 7 days
  const days = [];
  const currentDate = new Date(oneWeekAgo);
  while (currentDate <= today) {
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return days.map(day => {
    const dayStr = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Filter posts for this day
    const dayPosts = mockSocialMediaPosts.filter(
      post => post.timestamp >= dayStart.getTime() && post.timestamp <= dayEnd.getTime()
    );
    
    // Count sentiments
    const positive = dayPosts.filter(post => post.sentiment === 'positive').length;
    const neutral = dayPosts.filter(post => post.sentiment === 'neutral').length;
    const negative = dayPosts.filter(post => post.sentiment === 'negative').length;
    
    return {
      name: dayStr,
      positive,
      neutral,
      negative
    };
  });
};

// Get aggregated category counts from social media data
export const getSocialMediaCategories = () => {
  // Count posts by category
  const categoryCount = mockSocialMediaPosts.reduce((acc, post) => {
    acc[post.category] = (acc[post.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Convert to array format for charts
  return Object.entries(categoryCount).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter
    value
  }));
};

// Sentiment colors for consistency
export const sentimentTrendColors = {
  positive: '#4ade80', // green
  neutral: '#facc15', // yellow
  negative: '#f87171', // red
};

