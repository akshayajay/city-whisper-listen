
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { fetchMessageQueue } from '@/data/api';

const TrendingIssues: React.FC = () => {
  const { data: priorityItems = [] } = useQuery({
    queryKey: ['messageQueue'],
    queryFn: () => fetchMessageQueue(5),
    refetchInterval: 10000,
  });

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Priority Queue</CardTitle>
        <TrendingUp className="h-4 w-4 text-gray-500" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {priorityItems.length ? priorityItems.map((item) => (
            <div key={item.id} className="flex items-start gap-4 rounded-lg border p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-city-lightBlue text-city-blue">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-snug">{item.title}</p>
                <p className="line-clamp-2 text-xs text-gray-500">{item.detail}</p>
                <div className="flex items-center pt-2">
                  <Badge variant="outline" className="mr-2">
                    {item.category || 'general'}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-city-teal" />
                    <span className="text-xs font-medium text-city-teal">{item.priority}</span>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-lg border p-4 text-sm text-gray-500">
              No high-priority grievances are waiting for review.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendingIssues;
