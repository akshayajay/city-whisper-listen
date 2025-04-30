
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { sentimentTrendColors } from '@/data/socialMediaData';
import { fetchSentimentTrendData } from '@/data/api';
import { useQuery } from '@tanstack/react-query';

const SentimentTrendChart: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sentimentTrend'],
    queryFn: () => fetchSentimentTrendData(7),
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader className="pb-2">
          <CardTitle>Tamil Nadu Social Sentiment Trends</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px] w-full flex items-center justify-center">
            <p className="text-gray-500">Loading sentiment data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="col-span-full">
        <CardHeader className="pb-2">
          <CardTitle>Tamil Nadu Social Sentiment Trends</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px] w-full flex items-center justify-center">
            <p className="text-red-500">Error loading sentiment data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <CardTitle>Tamil Nadu Social Sentiment Trends</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  `${value} posts`, 
                  typeof name === 'string' 
                    ? name.charAt(0).toUpperCase() + name.slice(1)
                    : name
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="positive"
                stroke={sentimentTrendColors.positive}
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="neutral"
                stroke={sentimentTrendColors.neutral}
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="negative"
                stroke={sentimentTrendColors.negative}
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SentimentTrendChart;
