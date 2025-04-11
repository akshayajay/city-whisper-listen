
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, ArrowUp } from 'lucide-react';
import { mockGrievances } from '@/data/mockData';
import { Avatar } from '@/components/ui/avatar';

const RecentActivity: React.FC = () => {
  // Sort grievances by timestamp in descending order
  const recentGrievances = [...mockGrievances]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'twitter':
        return 'X';
      case 'facebook':
        return 'f';
      default:
        return 'web';
    }
  };

  const getSourceClass = (source: string) => {
    switch (source) {
      case 'twitter':
        return 'bg-black text-white';
      case 'facebook':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  return (
    <Card className="col-span-1">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
        <Clock className="h-4 w-4 text-gray-500" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {recentGrievances.map((grievance) => {
            // Format the timestamp
            const date = new Date(grievance.timestamp);
            const timeAgo = getTimeAgo(date);
            
            return (
              <div key={grievance.id} className="flex items-center gap-4">
                <Avatar className={`h-9 w-9 ${getSourceClass(grievance.source)}`}>
                  <div className="text-xs font-bold">{getSourceIcon(grievance.source)}</div>
                </Avatar>
                <div className="grid gap-1">
                  <p className="text-sm line-clamp-1">{grievance.content}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{grievance.location.area}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{timeAgo}</span>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" />
                  <span className="text-xs font-medium">{grievance.upvotes}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to format time ago
const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return `${interval} years ago`;
  if (interval === 1) return `1 year ago`;
  
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return `${interval} months ago`;
  if (interval === 1) return `1 month ago`;
  
  interval = Math.floor(seconds / 86400);
  if (interval > 1) return `${interval} days ago`;
  if (interval === 1) return `1 day ago`;
  
  interval = Math.floor(seconds / 3600);
  if (interval > 1) return `${interval} hours ago`;
  if (interval === 1) return `1 hour ago`;
  
  interval = Math.floor(seconds / 60);
  if (interval > 1) return `${interval} minutes ago`;
  if (interval === 1) return `1 minute ago`;
  
  return 'just now';
};

export default RecentActivity;
