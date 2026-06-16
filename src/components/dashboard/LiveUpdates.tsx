import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { connectToWebSocket, SocialMediaPost } from '@/data/api';
import { toast } from 'sonner';

interface LiveUpdatesProps {
  onPostsReceived?: (posts: SocialMediaPost[]) => void;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

const LiveUpdates: React.FC<LiveUpdatesProps> = ({ onPostsReceived }) => {
  const [livePosts, setLivePosts] = useState<SocialMediaPost[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    const connection = connectToWebSocket((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setLivePosts((prevPosts) => {
          const updatedPosts = [...data, ...prevPosts];
          return updatedPosts.slice(0, 8);
        });
        onPostsReceived?.(data);
        
        toast.info(`${data.length} new post(s) received`);
      }
    }, setConnectionStatus);

    return () => {
      connection.close();
    };
  }, [onPostsReceived]);

  const getSentimentColor = (sentiment?: string) => {
    if (sentiment === 'positive') return 'bg-green-100 text-green-800';
    if (sentiment === 'negative') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const statusLabel = {
    connecting: 'Connecting',
    connected: 'Live',
    disconnected: 'Offline',
    error: 'Error',
  }[connectionStatus];

  const statusClass = {
    connecting: 'bg-amber-400',
    connected: 'bg-green-500',
    disconnected: 'bg-gray-300',
    error: 'bg-red-500',
  }[connectionStatus];

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Live Updates</CardTitle>
          <div className="flex items-center gap-2">
            <div 
              className={`w-2 h-2 rounded-full ${statusClass}`}
            />
            <span className="text-xs text-gray-500">
              {statusLabel}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {livePosts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Waiting for live civic signals...</p>
            <p className="text-xs mt-2">New grievances and posts will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {livePosts.map((post) => (
              <div key={post.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{post.platform}</Badge>
                  <Badge variant="secondary">{post.category || 'uncategorized'}</Badge>
                </div>
                <p className="text-sm mb-2">{post.content}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <Badge className={getSentimentColor(post.sentiment)}>
                    {post.sentiment || 'neutral'}
                  </Badge>
                  <span>
                    {new Date(post.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveUpdates;
