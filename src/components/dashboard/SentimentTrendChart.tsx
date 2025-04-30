
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { sentimentTrendColors } from '@/data/socialMediaData';
import { fetchHistoricalTrends } from '@/data/api';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Available time intervals for trend data
type TimeInterval = 'daily' | 'weekly' | 'monthly';

const SentimentTrendChart: React.FC = () => {
  const [interval, setInterval] = useState<TimeInterval>('daily');
  
  // Calculate date range based on interval
  const getDateRange = () => {
    const endDate = new Date();
    let startDate: Date;
    
    switch(interval) {
      case 'weekly':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 28); // 4 weeks
        break;
      case 'monthly':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6); // 6 months
        break;
      case 'daily':
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // 7 days
        break;
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  };
  
  const { startDate, endDate } = getDateRange();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['sentimentTrend', interval, startDate, endDate],
    queryFn: () => fetchHistoricalTrends({ 
      startDate, 
      endDate, 
      interval 
    }),
    staleTime: 3600000, // 1 hour
  });

  // Handle interval change
  const handleIntervalChange = (value: string) => {
    setInterval(value as TimeInterval);
  };

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
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle>Tamil Nadu Social Sentiment Trends</CardTitle>
        <Select value={interval} onValueChange={handleIntervalChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select interval" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
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
