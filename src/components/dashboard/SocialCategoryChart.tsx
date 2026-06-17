
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchPlatformData } from '@/data/api';
import { useQuery } from '@tanstack/react-query';

const SocialCategoryChart: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['platformData'],
    queryFn: fetchPlatformData,
    refetchInterval: 30000,
  });

  const chartData = data?.map((item) => ({
    name: item.platform,
    value: item.count,
  })) || [];

  const getColor = (source: string) => {
    if (source === 'Twitter') return '#1D9BF0';
    if (source === 'Facebook') return '#4267B2';
    if (source === 'Citizen Portal') return '#10B981';
    return '#6B7280';
  };

  if (isLoading) {
    return (
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle>Source Distribution</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px] w-full flex items-center justify-center">
            <p className="text-gray-500">Loading source data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle>Source Distribution</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px] w-full flex items-center justify-center">
            <p className="text-gray-500">No source data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle>Source Distribution</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(entry.name)} 
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} signals`, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SocialCategoryChart;
