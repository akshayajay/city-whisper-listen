
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
    content: 'The potholes on Anna Salai are getting ridiculous! My car almost got damaged this morning. @ChennaiCorp do something!',
    category: 'infrastructure',
    sentiment: 'negative',
    location: {
      latitude: 13.0622,
      longitude: 80.2356,
      area: 'Chennai Central'
    },
    timestamp: '2025-04-10T08:23:15.000Z',
    upvotes: 32
  },
  {
    id: '2',
    source: 'facebook',
    content: 'Trash collection has been inconsistent in Adyar. Bins have been overflowing for days!',
    category: 'waste',
    sentiment: 'negative',
    location: {
      latitude: 13.0053,
      longitude: 80.2510,
      area: 'Adyar'
    },
    timestamp: '2025-04-10T12:10:22.000Z',
    upvotes: 15
  },
  {
    id: '3',
    source: 'twitter',
    content: 'The new traffic signals installed in Coimbatore have really improved the flow of traffic. Good job @CoimbatoreCorp',
    category: 'transportation',
    sentiment: 'positive',
    location: {
      latitude: 11.0168,
      longitude: 76.9558,
      area: 'Coimbatore'
    },
    timestamp: '2025-04-09T15:45:30.000Z',
    upvotes: 8
  },
  {
    id: '4',
    source: 'twitter',
    content: 'Construction noise at night in T Nagar is unbearable. How are we supposed to sleep?',
    category: 'noise',
    sentiment: 'negative',
    location: {
      latitude: 13.0418,
      longitude: 80.2341,
      area: 'T Nagar'
    },
    timestamp: '2025-04-09T22:17:08.000Z',
    upvotes: 27
  },
  {
    id: '5',
    source: 'direct',
    content: 'Street lights out on Kamarajar Salai for over a week now. It feels unsafe to walk at night.',
    category: 'safety',
    sentiment: 'negative',
    location: {
      latitude: 13.0658,
      longitude: 80.2778,
      area: 'Marina Beach'
    },
    timestamp: '2025-04-08T19:30:45.000Z',
    upvotes: 42
  },
  {
    id: '6',
    source: 'facebook',
    content: 'Public park benches in Madurai are in desperate need of repair. Several are broken and unusable.',
    category: 'infrastructure',
    sentiment: 'negative',
    location: {
      latitude: 9.9252,
      longitude: 78.1198,
      area: 'Madurai'
    },
    timestamp: '2025-04-08T14:12:33.000Z',
    upvotes: 11
  },
  {
    id: '7',
    source: 'twitter',
    content: 'Bus #42 from Trichy to Thanjavur is consistently late. Commuting has become a nightmare.',
    category: 'transportation',
    sentiment: 'negative',
    location: {
      latitude: 10.7905,
      longitude: 78.7047,
      area: 'Trichy'
    },
    timestamp: '2025-04-07T08:05:17.000Z',
    upvotes: 19
  },
  {
    id: '8',
    source: 'direct',
    content: 'Thank you for fixing the water supply issues in Salem so quickly after reports!',
    category: 'infrastructure',
    sentiment: 'positive',
    location: {
      latitude: 11.6643,
      longitude: 78.1460,
      area: 'Salem'
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
