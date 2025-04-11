
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, MessageSquare } from 'lucide-react';
import { mockGrievances } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';

const TrendingIssues: React.FC = () => {
  // Sort grievances by upvotes in descending order
  const trendingGrievances = [...mockGrievances]
    .sort((a, b) => b.upvotes - a.upvotes)
    .slice(0, 5);

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Trending Issues</CardTitle>
        <TrendingUp className="h-4 w-4 text-gray-500" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {trendingGrievances.map((grievance) => (
            <div key={grievance.id} className="flex items-start gap-4 rounded-lg border p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-city-lightBlue text-city-blue">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">{grievance.content}</p>
                <div className="flex items-center pt-2">
                  <Badge variant="outline" className="mr-2">
                    {grievance.category}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(grievance.timestamp).toLocaleDateString()}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-city-teal" />
                    <span className="text-xs font-medium text-city-teal">{grievance.upvotes}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendingIssues;
