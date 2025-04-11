
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getGrievancesBySentiment, sentimentColors } from '@/data/mockData';

const SentimentChart: React.FC = () => {
  const data = getGrievancesBySentiment();

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle>Sentiment Analysis</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 14 }}
              />
              <Tooltip formatter={(value) => [`${value} grievances`, 'Count']} />
              <Bar 
                dataKey="value" 
                fill="#8884d8"
                radius={[0, 4, 4, 0]}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={sentimentColors[entry.name as keyof typeof sentimentColors]} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SentimentChart;
