
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { sentimentColors } from '@/data/mockData';
import { fetchSentimentData } from '@/data/api';
import { useQuery } from '@tanstack/react-query';

const SentimentChart: React.FC = () => {
  const { data = [], isLoading } = useQuery({
    queryKey: ['sentimentBreakdown'],
    queryFn: fetchSentimentData,
    refetchInterval: 30000,
  });

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle>Sentiment Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px] w-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-gray-500">Loading sentiment...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical">
                <XAxis type="number" />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 14 }}
                />
                <Tooltip formatter={(value) => [`${value} signals`, 'Count']} />
                <Bar 
                  dataKey="value" 
                  fill="#8884d8"
                  radius={[0, 4, 4, 0]}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={sentimentColors[entry.name as keyof typeof sentimentColors] || '#6B7280'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SentimentChart;
