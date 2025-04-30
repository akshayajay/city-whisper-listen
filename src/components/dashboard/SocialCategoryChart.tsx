
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { categoryColors } from '@/data/mockData';
import { fetchCategoryData } from '@/data/api';
import { useQuery } from '@tanstack/react-query';

const SocialCategoryChart: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['socialCategories'],
    queryFn: fetchCategoryData,
    refetchInterval: 60000, // Refetch every minute
  });

  // Create a color map for our categories
  const getColor = (category: string) => {
    const normalizedCategory = category.toLowerCase();
    return categoryColors[normalizedCategory as keyof typeof categoryColors] || '#6B7280';
  };

  if (isLoading) {
    return (
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle>Social Media Categories</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px] w-full flex items-center justify-center">
            <p className="text-gray-500">Loading category data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle>Social Media Categories</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px] w-full flex items-center justify-center">
            <p className="text-gray-500">No category data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle>Social Media Categories</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(entry.name)} 
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} posts`, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SocialCategoryChart;
