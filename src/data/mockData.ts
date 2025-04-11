
export type GrievanceCategory = 
  | 'infrastructure' 
  | 'waste' 
  | 'noise' 
  | 'safety' 
  | 'transportation' 
  | 'other';

export interface Grievance {
  id: string;
  source: 'twitter' | 'facebook' | 'direct';
  content: string;
  category: GrievanceCategory;
  sentiment: 'negative' | 'neutral' | 'positive';
  location: {
    latitude: number;
    longitude: number;
    area: string;
  };
  timestamp: string;
  upvotes: number;
}

export const mockGrievances: Grievance[] = [
  {
    id: '1',
    source: 'twitter',
    content: 'The potholes on Main Street are getting ridiculous! My car almost got damaged this morning. @CityOfficial do something!',
    category: 'infrastructure',
    sentiment: 'negative',
    location: {
      latitude: 40.7128,
      longitude: -74.006,
      area: 'Downtown'
    },
    timestamp: '2025-04-10T08:23:15.000Z',
    upvotes: 32
  },
  {
    id: '2',
    source: 'facebook',
    content: 'Trash collection has been inconsistent in the Highland neighborhood. Bins have been overflowing for days!',
    category: 'waste',
    sentiment: 'negative',
    location: {
      latitude: 40.7145,
      longitude: -74.0085,
      area: 'Highland'
    },
    timestamp: '2025-04-10T12:10:22.000Z',
    upvotes: 15
  },
  {
    id: '3',
    source: 'twitter',
    content: 'The new traffic lights installed on Park Avenue have really improved the flow of traffic. Good job @CityPlanning',
    category: 'transportation',
    sentiment: 'positive',
    location: {
      latitude: 40.7112,
      longitude: -74.0115,
      area: 'Midtown'
    },
    timestamp: '2025-04-09T15:45:30.000Z',
    upvotes: 8
  },
  {
    id: '4',
    source: 'twitter',
    content: 'Construction noise at night on 5th Street is unbearable. How are we supposed to sleep?',
    category: 'noise',
    sentiment: 'negative',
    location: {
      latitude: 40.7155,
      longitude: -74.0045,
      area: 'Eastside'
    },
    timestamp: '2025-04-09T22:17:08.000Z',
    upvotes: 27
  },
  {
    id: '5',
    source: 'direct',
    content: 'Street lights out on Cedar Lane for over a week now. It feels unsafe to walk at night.',
    category: 'safety',
    sentiment: 'negative',
    location: {
      latitude: 40.7139,
      longitude: -74.0021,
      area: 'Westside'
    },
    timestamp: '2025-04-08T19:30:45.000Z',
    upvotes: 42
  },
  {
    id: '6',
    source: 'facebook',
    content: 'Public park benches downtown are in desperate need of repair. Several are broken and unusable.',
    category: 'infrastructure',
    sentiment: 'negative',
    location: {
      latitude: 40.7128,
      longitude: -74.006,
      area: 'Downtown'
    },
    timestamp: '2025-04-08T14:12:33.000Z',
    upvotes: 11
  },
  {
    id: '7',
    source: 'twitter',
    content: 'Bus #42 is consistently late during rush hour. Commuting has become a nightmare.',
    category: 'transportation',
    sentiment: 'negative',
    location: {
      latitude: 40.7165,
      longitude: -74.0065,
      area: 'Northside'
    },
    timestamp: '2025-04-07T08:05:17.000Z',
    upvotes: 19
  },
  {
    id: '8',
    source: 'direct',
    content: 'Thank you for fixing the water fountains at Central Park so quickly after reports!',
    category: 'infrastructure',
    sentiment: 'positive',
    location: {
      latitude: 40.7135,
      longitude: -74.0057,
      area: 'Central Park'
    },
    timestamp: '2025-04-07T16:40:22.000Z',
    upvotes: 5
  }
];

export const categoryColors = {
  infrastructure: '#3B82F6', // blue
  waste: '#10B981', // green
  noise: '#F59E0B', // amber
  safety: '#EF4444', // red
  transportation: '#8B5CF6', // purple
  other: '#6B7280' // gray
};

export const sentimentColors = {
  negative: '#EF4444', // red
  neutral: '#6B7280', // gray
  positive: '#10B981' // green
};

export const sourceIcons = {
  twitter: 'X',
  facebook: 'f',
  direct: 'web'
};

export const getGrievancesByCategory = () => {
  const categoryCounts: Record<string, number> = {};
  
  mockGrievances.forEach(grievance => {
    if (!categoryCounts[grievance.category]) {
      categoryCounts[grievance.category] = 0;
    }
    categoryCounts[grievance.category]++;
  });
  
  return Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));
};

export const getGrievancesByArea = () => {
  const areaCounts: Record<string, number> = {};
  
  mockGrievances.forEach(grievance => {
    if (!areaCounts[grievance.location.area]) {
      areaCounts[grievance.location.area] = 0;
    }
    areaCounts[grievance.location.area]++;
  });
  
  return Object.entries(areaCounts).map(([name, value]) => ({ name, value }));
};

export const getGrievancesBySource = () => {
  const sourceCounts: Record<string, number> = {};
  
  mockGrievances.forEach(grievance => {
    if (!sourceCounts[grievance.source]) {
      sourceCounts[grievance.source] = 0;
    }
    sourceCounts[grievance.source]++;
  });
  
  return Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));
};

export const getGrievancesBySentiment = () => {
  const sentimentCounts: Record<string, number> = {};
  
  mockGrievances.forEach(grievance => {
    if (!sentimentCounts[grievance.sentiment]) {
      sentimentCounts[grievance.sentiment] = 0;
    }
    sentimentCounts[grievance.sentiment]++;
  });
  
  return Object.entries(sentimentCounts).map(([name, value]) => ({ name, value }));
};
