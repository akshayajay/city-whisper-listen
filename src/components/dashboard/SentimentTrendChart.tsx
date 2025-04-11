
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getSentimentTrendData, sentimentTrendColors } from '@/data/socialMediaData';

const SentimentTrendChart: React.FC = () => {
  const data = getSentimentTrendData();

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
                  name.charAt(0).toUpperCase() + name.slice(1)
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
