import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { connectToWebSocket } from '@/data/api';
import { toast } from 'sonner';

interface Post {
  id: string;
  platform: string;
  content: string;
  timestamp: string;
  sentiment: string;
  category: string;
}

const LiveUpdates: React.FC = () => {
  const [livePosts, setLivePosts] = useState<Post[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket for live updates
    const connection = connectToWebSocket((data) => {
      // Process incoming data (which is an array of new posts)
      if (Array.isArray(data) && data.length > 0) {
        // Add new posts to the list
        setLivePosts((prevPosts) => {
          // Add new posts to the beginning of the array
          const updatedPosts = [...data, ...prevPosts];
          // Keep only the most recent 5 posts
          return updatedPosts.slice(0, 5);
        });
        
        // Show a toast notification for new posts
        toast.info(`${data.length} new post(s) received`);
      }
      
      setIsConnected(true);
    });

    // Clean up WebSocket connection when component unmounts
    return () => {
      connection.close();
    };
  }, []);

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === 'positive') return 'bg-green-100 text-green-800';
    if (sentiment === 'negative') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Live Updates</CardTitle>
          <div className="flex items-center gap-2">
            <div 
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`}
            />
            <span className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {livePosts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Waiting for live updates...</p>
            <p className="text-xs mt-2">New social media posts will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {livePosts.map((post) => (
              <div key={post.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{post.platform}</Badge>
                  <Badge variant="secondary">{post.category}</Badge>
                </div>
                <p className="text-sm mb-2">{post.content}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <Badge className={getSentimentColor(post.sentiment)}>
                    {post.sentiment}
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
